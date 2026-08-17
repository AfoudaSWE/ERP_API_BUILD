DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'companies' AND nsp.nspname = current_schema()
    AND con.contype = 'c' AND pg_get_constraintdef(con.oid) ILIKE '%subscription_status%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE companies DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE companies ADD CONSTRAINT companies_subscription_status_check
  CHECK (subscription_status IN ('pending_approval','trial','active','suspended','canceled'));

ALTER TABLE companies ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id) ON DELETE SET NULL;
