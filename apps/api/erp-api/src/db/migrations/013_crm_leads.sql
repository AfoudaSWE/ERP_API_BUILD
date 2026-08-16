CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text NOT NULL DEFAULT '',
  company text,
  phone text,
  email text,
  source text NOT NULL DEFAULT 'other' CHECK (source IN ('website', 'referral', 'social_media', 'cold_call', 'exhibition', 'other')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  value numeric(14,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  probability integer NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date date,
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_company_created ON leads(company_id, created_at DESC);
CREATE INDEX idx_leads_company_status ON leads(company_id, status);
