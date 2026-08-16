CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text NOT NULL DEFAULT '',
  warehouse_type text NOT NULL DEFAULT 'main' CHECK (warehouse_type IN ('main','transit','returns','damaged')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','partially_received','received','closed','cancelled','rejected')),
  order_date date NOT NULL,
  expected_date date,
  currency char(3) NOT NULL DEFAULT 'EGP',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  discount_amount numeric(18,2) NOT NULL DEFAULT 0,
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  total numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  description text NOT NULL,
  ordered_quantity numeric(18,3) NOT NULL CHECK (ordered_quantity > 0),
  received_quantity numeric(18,3) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  unit text NOT NULL DEFAULT 'piece',
  unit_price numeric(18,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK (tax_rate BETWEEN 0 AND 100),
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  total numeric(18,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (received_quantity <= ordered_quantity)
);

CREATE TABLE goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  receipt_number text NOT NULL,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  receipt_date date NOT NULL,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','reversed')),
  supplier_reference text,
  operation_key text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, receipt_number),
  UNIQUE (company_id, operation_key)
);

CREATE TABLE goods_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE RESTRICT,
  purchase_order_item_id uuid NOT NULL REFERENCES purchase_order_items(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  accepted_quantity numeric(18,3) NOT NULL CHECK (accepted_quantity > 0),
  unit_cost numeric(18,2) NOT NULL CHECK (unit_cost >= 0),
  tax_amount numeric(18,2) NOT NULL DEFAULT 0,
  total numeric(18,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goods_receipt_id, purchase_order_item_id)
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN ('receipt','issue','return','transfer_in','transfer_out','adjustment','reversal')),
  quantity numeric(18,3) NOT NULL CHECK (quantity <> 0),
  unit_cost numeric(18,2) NOT NULL DEFAULT 0,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  source_line_id uuid,
  reason text,
  operation_key text NOT NULL,
  business_date date NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_type, source_id, source_line_id, movement_type)
);

CREATE TABLE inventory_balances (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  on_hand numeric(18,3) NOT NULL DEFAULT 0,
  reserved numeric(18,3) NOT NULL DEFAULT 0,
  available numeric(18,3) GENERATED ALWAYS AS (on_hand - reserved) STORED,
  average_cost numeric(18,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, warehouse_id, product_id),
  CHECK (on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand)
);

CREATE TABLE supplier_accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  goods_receipt_id uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE RESTRICT,
  business_date date NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','cleared','reversed')),
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE RESTRICT,
  operation_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, goods_receipt_id)
);

CREATE INDEX idx_po_company_date ON purchase_orders(company_id, order_date DESC);
CREATE INDEX idx_receipt_company_date ON goods_receipts(company_id, receipt_date DESC);
CREATE INDEX idx_stock_product_date ON stock_movements(company_id, product_id, created_at DESC);

CREATE TRIGGER stock_movements_immutable BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_event_change();
CREATE TRIGGER receipt_items_immutable BEFORE UPDATE OR DELETE ON goods_receipt_items
FOR EACH ROW EXECUTE FUNCTION prevent_immutable_event_change();
