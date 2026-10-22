CREATE TABLE IF NOT EXISTS link_users (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL
);
CREATE TABLE IF NOT EXISTS link_workspaces (
  id uuid PRIMARY KEY, name text NOT NULL, join_code text UNIQUE NOT NULL,
  system_prompt text NOT NULL, temperature double precision NOT NULL DEFAULT 0.2,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS link_memberships (
  workspace_id uuid REFERENCES link_workspaces(id) ON DELETE CASCADE,
  user_id text REFERENCES link_users(id), role text NOT NULL CHECK(role IN ('owner','member')),
  status text NOT NULL CHECK(status IN ('pending','approved','rejected')),
  PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE IF NOT EXISTS link_datasets (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES link_workspaces(id) ON DELETE CASCADE,
  title text NOT NULL, domain text NOT NULL, text text NOT NULL, sample boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1, indexed_revision integer NOT NULL DEFAULT 0,
  chunks integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS link_jobs (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES link_workspaces(id) ON DELETE CASCADE,
  worker_job_id text, action text NOT NULL, status text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}', versions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS link_progress (
  workspace_id uuid REFERENCES link_workspaces(id) ON DELETE CASCADE,
  user_id text REFERENCES link_users(id), module_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,user_id,module_id)
);
CREATE TABLE IF NOT EXISTS link_quiz_attempts (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES link_workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES link_users(id), domain text NOT NULL,
  score integer NOT NULL, results jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS link_messages (
  id bigserial PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES link_workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES link_users(id), domain text NOT NULL,
  role text NOT NULL, content text NOT NULL, citations jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS link_dataset_workspace_idx ON link_datasets(workspace_id);
CREATE INDEX IF NOT EXISTS link_messages_workspace_user_idx ON link_messages(workspace_id,user_id);
CREATE INDEX IF NOT EXISTS link_jobs_workspace_idx ON link_jobs(workspace_id);
