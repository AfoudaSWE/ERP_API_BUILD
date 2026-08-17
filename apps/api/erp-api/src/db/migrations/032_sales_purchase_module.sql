-- Sales quotes
CREATE TABLE sales_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  quote_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  quote_date date NOT NULL,
  valid_until date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  discount_amount numeric(18,2) NOT NULL DEFAULT 0,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  total numeric(18,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  converted_invoice_id uuid REFERENCES sales_invoices(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, quote_number)
);
CREATE TABLE sales_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES sales_quotes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(18,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,2) NOT NULL,
  tax_rate numeric(7,4) NOT NULL DEFAULT 0,
  total numeric(18,2) NOT NULL
);
CREATE INDEX idx_sales_quotes_company ON sales_quotes(company_id, quote_date DESC);

-- Recurring invoice templates
CREATE TABLE recurring_invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  name text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
  next_run_date date NOT NULL,
  last_generated_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','canceled')),
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE recurring_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES recurring_invoice_templates(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(18,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,2) NOT NULL,
  tax_rate numeric(7,4) NOT NULL DEFAULT 0
);
CREATE INDEX idx_recurring_invoices_company ON recurring_invoice_templates(company_id, status);

-- Invoice templates (reusable line-item sets)
CREATE TABLE invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  name text NOT NULL,
  notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE invoice_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES invoice_templates(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(18,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,2) NOT NULL,
  tax_rate numeric(7,4) NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_templates_company ON invoice_templates(company_id, is_active);

-- Delivery notes (dispatch tracking, no accounting/inventory impact)
CREATE TABLE delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  delivery_number text NOT NULL,
  invoice_id uuid REFERENCES sales_invoices(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  delivery_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','canceled')),
  recipient_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, delivery_number)
);
CREATE TABLE delivery_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric(18,3) NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_delivery_notes_company ON delivery_notes(company_id, delivery_date DESC);

-- Purchase returns (reverse of goods receipt: reduces stock, reverses GRNI/inventory value)
CREATE TABLE purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  return_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  business_date date NOT NULL,
  reason text NOT NULL,
  subtotal numeric(18,2) NOT NULL,
  tax_amount numeric(18,2) NOT NULL,
  total numeric(18,2) NOT NULL,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','reversed')),
  operation_key text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, return_number), UNIQUE (company_id, operation_key)
);
CREATE TABLE purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_return_id uuid NOT NULL REFERENCES purchase_returns(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(18,3) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(18,2) NOT NULL,
  tax_rate numeric(7,4) NOT NULL DEFAULT 0,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  total numeric(18,2) NOT NULL
);
CREATE INDEX idx_purchase_returns_company ON purchase_returns(company_id, business_date DESC);
CREATE TRIGGER purchase_returns_immutable BEFORE UPDATE OR DELETE ON purchase_returns FOR EACH ROW EXECUTE FUNCTION prevent_immutable_event_change();
CREATE TRIGGER purchase_return_items_immutable BEFORE UPDATE OR DELETE ON purchase_return_items FOR EACH ROW EXECUTE FUNCTION prevent_immutable_event_change();
