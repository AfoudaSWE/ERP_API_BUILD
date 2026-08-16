ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active'
  CHECK (subscription_status IN ('trial','active','suspended','canceled'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON companies(subscription_status);
