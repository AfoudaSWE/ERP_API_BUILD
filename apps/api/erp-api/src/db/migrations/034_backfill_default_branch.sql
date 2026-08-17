-- Signup never created a default branch for companies created after migration 010's one-time
-- backfill ran, leaving every self-service-signed-up company without any branch. Since
-- hr.employees requires at least one branch, HR onboarding was silently blocked for them.
INSERT INTO branches(company_id,code,name,name_ar)
SELECT c.id,'MAIN','Main Branch','الفرع الرئيسي' FROM companies c
WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.company_id=c.id)
ON CONFLICT(company_id,code) DO NOTHING;
