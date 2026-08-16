ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES warehouses(id) ON DELETE RESTRICT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'EGP';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS operation_key text;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS posting_state text NOT NULL DEFAULT 'posted' CHECK (posting_state IN ('posted','partially_returned','returned','reversed'));
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS returned_amount numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS cost_price numeric(18,2) NOT NULL DEFAULT 0;
ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS returned_quantity numeric(18,3) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_invoice_operation ON sales_invoices(company_id,operation_key) WHERE operation_key IS NOT NULL;

CREATE TABLE customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  payment_number text NOT NULL, customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT, amount numeric(18,2) NOT NULL CHECK(amount>0),
  unallocated_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK(unallocated_amount>=0), currency char(3) NOT NULL DEFAULT 'EGP',
  method text NOT NULL CHECK(method IN('cash','card','bank_transfer','wallet')), reference text, business_date date NOT NULL,
  status text NOT NULL DEFAULT 'posted' CHECK(status IN('posted','reversed')), operation_key text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,payment_number), UNIQUE(company_id,operation_key)
);
CREATE TABLE payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL REFERENCES customer_payments(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT, amount numeric(18,2) NOT NULL CHECK(amount>0), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payment_id,invoice_id)
);
CREATE TABLE sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  return_number text NOT NULL, invoice_id uuid NOT NULL REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT, warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  business_date date NOT NULL, reason text NOT NULL, subtotal numeric(18,2) NOT NULL, tax_amount numeric(18,2) NOT NULL,
  total numeric(18,2) NOT NULL, status text NOT NULL DEFAULT 'posted' CHECK(status IN('posted','reversed')), operation_key text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,return_number), UNIQUE(company_id,operation_key)
);
CREATE TABLE sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sales_return_id uuid NOT NULL REFERENCES sales_returns(id) ON DELETE RESTRICT,
  invoice_item_id uuid NOT NULL REFERENCES sales_invoice_items(id) ON DELETE RESTRICT, product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(18,3) NOT NULL CHECK(quantity>0), unit_price numeric(18,2) NOT NULL, tax_rate numeric(7,4) NOT NULL,
  tax_amount numeric(18,2) NOT NULL, total numeric(18,2) NOT NULL, UNIQUE(sales_return_id,invoice_item_id)
);
CREATE INDEX idx_payment_company_date ON customer_payments(company_id,business_date DESC);
CREATE INDEX idx_return_company_date ON sales_returns(company_id,business_date DESC);
CREATE TRIGGER customer_payments_immutable BEFORE UPDATE OR DELETE ON customer_payments FOR EACH ROW EXECUTE FUNCTION prevent_immutable_event_change();
CREATE TRIGGER payment_allocations_immutable BEFORE UPDATE OR DELETE ON payment_allocations FOR EACH ROW EXECUTE FUNCTION prevent_immutable_event_change();
CREATE TRIGGER sales_returns_immutable BEFORE UPDATE OR DELETE ON sales_returns FOR EACH ROW EXECUTE FUNCTION prevent_immutable_event_change();
CREATE TRIGGER sales_return_items_immutable BEFORE UPDATE OR DELETE ON sales_return_items FOR EACH ROW EXECUTE FUNCTION prevent_immutable_event_change();
