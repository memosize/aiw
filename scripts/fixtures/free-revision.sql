DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE TABLE documents (
  id bigserial primary key, uuid varchar(255) unique not null, user_uuid varchar(255) not null,
  document_type text, title text, description text, form_data jsonb, content text,
  version integer, version_type text, parent_document_uuid varchar(255), revision_count integer,
  revision_settings jsonb, word_count integer, language text, status text, ai_model text,
  ai_workflow_id text, generation_params jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);
CREATE TABLE service_quotas(id serial primary key,user_uuid text,remaining integer);
INSERT INTO service_quotas(user_uuid,remaining) VALUES('test-a',9),('test-b',8);
