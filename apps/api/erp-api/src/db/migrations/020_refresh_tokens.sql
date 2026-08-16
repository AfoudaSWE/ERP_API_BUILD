CREATE TABLE auth_refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  family_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_auth_refresh_tokens_user_active
  ON auth_refresh_tokens(user_id, expires_at) WHERE revoked_at IS NULL;
