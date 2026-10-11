-- Apply manually before releasing the application. No historical backfill.
BEGIN;
CREATE TABLE IF NOT EXISTS public.document_free_revisions (
  document_uuid text PRIMARY KEY,
  user_uuid text NOT NULL,
  state text NOT NULL CHECK (state IN ('running', 'ready', 'used', 'abandoned')),
  token text,
  revision_uuid text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_free_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_free_revisions FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.manage_document_free_revision(
  p_uuid text, p_user text, p_action text, p_token text DEFAULT NULL,
  p_content text DEFAULT NULL, p_settings jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  original public.documents%ROWTYPE;
  source public.documents%ROWTYPE;
  saved public.documents%ROWTYPE;
  entitlement public.document_free_revisions%ROWTYPE;
  used_count integer;
  current_state text;
BEGIN
  SELECT * INTO source FROM public.documents WHERE uuid::text = p_uuid AND user_uuid::text = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOCUMENT_NOT_FOUND'; END IF;
  SELECT * INTO original FROM public.documents
    WHERE uuid::text = COALESCE(NULLIF(source.parent_document_uuid::text,''), source.uuid::text)
      AND user_uuid::text = p_user FOR UPDATE;
  IF NOT FOUND OR original.document_type NOT IN ('personal_statement','sop','cover_letter','recommendation_letter')
    OR original.status <> 'active' THEN RAISE EXCEPTION 'DOCUMENT_NOT_AVAILABLE'; END IF;
  SELECT count(*) INTO used_count FROM public.documents
    WHERE parent_document_uuid = original.uuid AND version_type = 'revised';
  SELECT * INTO entitlement FROM public.document_free_revisions WHERE document_uuid = original.uuid::text;
  current_state := COALESCE(entitlement.state, 'unused');
  IF used_count > 0 THEN current_state := 'used'; END IF;
  IF p_action = 'status' THEN
    RETURN jsonb_build_object('state',current_state,'revision_count',used_count,
      'has_used_free_revision',current_state = 'used',
      'free_revision_unavailable',current_state <> 'unused',
      'can_abandon',current_state = 'unused' AND length(trim(COALESCE(original.content,''))) > 0);
  END IF;
  IF p_action = 'abandon' AND current_state = 'abandoned' THEN RETURN jsonb_build_object('state','abandoned'); END IF;
  IF p_action IN ('claim','abandon') THEN
    IF current_state <> 'unused' THEN RAISE EXCEPTION 'FREE_REVISION_UNAVAILABLE'; END IF;
    IF length(trim(COALESCE(original.content,''))) = 0 THEN RAISE EXCEPTION 'DOCUMENT_NOT_SAVED'; END IF;
    IF p_action = 'claim' AND (p_token IS NULL OR length(p_token) < 16 OR length(p_token) > 100) THEN
      RAISE EXCEPTION 'INVALID_REVISION_TOKEN'; END IF;
    INSERT INTO public.document_free_revisions(document_uuid,user_uuid,state,token)
      VALUES(original.uuid::text,p_user,CASE WHEN p_action='claim' THEN 'running' ELSE 'abandoned' END,p_token);
    RETURN jsonb_build_object('state',CASE WHEN p_action='claim' THEN 'running' ELSE 'abandoned' END);
  END IF;
  IF p_action = 'restore' THEN
    -- Keep the existing once-only restoration behavior; never start an AI run.
    IF used_count >= 1 OR current_state IN ('running','ready') THEN RAISE EXCEPTION 'FREE_REVISION_UNAVAILABLE'; END IF;
    SELECT * INTO saved FROM public.documents WHERE uuid::text=p_token AND user_uuid::text=p_user
      AND (uuid=original.uuid OR parent_document_uuid=original.uuid);
    IF NOT FOUND THEN RAISE EXCEPTION 'RESTORE_VERSION_NOT_FOUND'; END IF;
    p_content := saved.content;
  END IF;
  IF p_action <> 'restore' AND (p_token IS NULL OR entitlement.token IS DISTINCT FROM p_token) THEN RAISE EXCEPTION 'INVALID_REVISION_TOKEN'; END IF;
  IF p_action = 'release' AND current_state = 'running' THEN
    DELETE FROM public.document_free_revisions WHERE document_uuid = original.uuid::text;
    RETURN jsonb_build_object('state','unused');
  END IF;
  IF p_action = 'ready' AND current_state = 'running' THEN
    UPDATE public.document_free_revisions SET state='ready',updated_at=now() WHERE document_uuid=original.uuid::text;
    RETURN jsonb_build_object('state','ready');
  END IF;
  IF p_action = 'save' AND current_state = 'used' AND entitlement.revision_uuid IS NOT NULL THEN
    SELECT * INTO saved FROM public.documents WHERE uuid::text=entitlement.revision_uuid;
    RETURN to_jsonb(saved); -- Retry a lost save response without a second version.
  END IF;
  IF (p_action = 'save' AND current_state = 'ready') OR p_action = 'restore' THEN
    IF length(trim(COALESCE(p_content,''))) = 0 THEN RAISE EXCEPTION 'EMPTY_REVISION'; END IF;
    INSERT INTO public.documents(uuid,user_uuid,document_type,title,description,form_data,content,
      version,version_type,parent_document_uuid,revision_count,revision_settings,word_count,
      language,status,ai_model,generation_params)
    VALUES(gen_random_uuid(),original.user_uuid,original.document_type,
      CASE WHEN original.title IS NULL THEN NULL ELSE original.title || ' (修订版)' END,
      original.description,original.form_data,p_content,
      (SELECT COALESCE(max(version),1)+1 FROM public.documents WHERE uuid=original.uuid OR parent_document_uuid=original.uuid),
      'revised',original.uuid,used_count+1,p_settings,length(p_content),
      original.language,'active',original.ai_model,original.generation_params)
    RETURNING * INTO saved;
    IF p_action = 'save' THEN
      UPDATE public.document_free_revisions SET state='used',revision_uuid=saved.uuid::text,updated_at=now()
        WHERE document_uuid=original.uuid::text;
    END IF;
    RETURN to_jsonb(saved);
  END IF;
  RAISE EXCEPTION 'FREE_REVISION_UNAVAILABLE';
END;
$$;
REVOKE ALL ON FUNCTION public.manage_document_free_revision(text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_document_free_revision(text,text,text,text,text,jsonb) TO service_role;
COMMIT;
