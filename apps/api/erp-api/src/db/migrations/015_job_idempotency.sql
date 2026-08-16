CREATE TABLE job_executions (
  job_id text PRIMARY KEY,
  queue_name text NOT NULL,
  job_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 1,
  locked_until timestamptz NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_job_executions_status_locked ON job_executions(status, locked_until);
