ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_domain text;

UPDATE companies c
SET email_domain = lower(split_part(u.email, '@', 2))
FROM users u
WHERE u.company_id = c.id
  AND u.role IN ('company_owner', 'business_owner')
  AND c.email_domain IS NULL
  AND u.email LIKE '%@%'
  AND u.created_at = (
    SELECT min(u2.created_at) FROM users u2
    WHERE u2.company_id = c.id AND u2.role IN ('company_owner', 'business_owner')
  );
