-- First roll back application code. Export entitlement rows before removing them:
-- dropping this table discards abandoned/running states and reopens unused rights.
BEGIN;
DROP FUNCTION IF EXISTS public.manage_document_free_revision(text,text,text,text,text,jsonb);
DROP TABLE IF EXISTS public.document_free_revisions;
COMMIT;
