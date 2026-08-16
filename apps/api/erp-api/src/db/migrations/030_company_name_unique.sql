CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_name_unique ON companies (lower(btrim(name)));
