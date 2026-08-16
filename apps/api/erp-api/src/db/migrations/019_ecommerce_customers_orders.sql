ALTER TABLE customers
  ADD COLUMN password_hash text,
  ADD COLUMN email_verified_at timestamptz,
  ADD COLUMN last_login_at timestamptz,
  ADD COLUMN password_reset_token_hash text,
  ADD COLUMN password_reset_expires_at timestamptz;

CREATE UNIQUE INDEX customers_company_email_unique
  ON customers(company_id, lower(email)) WHERE email IS NOT NULL;

ALTER TABLE storefront_carts
  ADD COLUMN customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX storefront_carts_customer_active
  ON storefront_carts(company_id,customer_id,updated_at DESC) WHERE status='active';

ALTER TABLE sales_invoices
  ADD COLUMN source text NOT NULL DEFAULT 'erp'
    CHECK(source IN('erp','pos','ecommerce','mobile_app'));
CREATE INDEX sales_invoices_source_idx ON sales_invoices(company_id,source,created_at DESC);

CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  recipient_name text NOT NULL,
  phone text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text NOT NULL DEFAULT '',
  city text NOT NULL,
  area text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  delivery_notes text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_addresses_owner_idx ON customer_addresses(company_id,customer_id,created_at);
CREATE UNIQUE INDEX customer_addresses_one_default ON customer_addresses(company_id,customer_id) WHERE is_default=true;

CREATE TABLE storefront_wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,customer_id,product_id)
);
CREATE INDEX storefront_wishlist_owner_idx ON storefront_wishlist_items(company_id,customer_id,created_at DESC);

CREATE TABLE ecommerce_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  cart_id uuid REFERENCES storefront_carts(id) ON DELETE SET NULL,
  sales_invoice_id uuid REFERENCES sales_invoices(id) ON DELETE RESTRICT,
  shipping_method_id uuid REFERENCES shipping_methods(id) ON DELETE RESTRICT,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK(status IN('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK(payment_status IN('pending','authorized','paid','failed','refunded')),
  currency char(3) NOT NULL DEFAULT 'EGP',
  customer_snapshot jsonb NOT NULL,
  shipping_address jsonb NOT NULL,
  subtotal numeric(18,2) NOT NULL CHECK(subtotal>=0),
  discount_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0),
  tax_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK(tax_amount>=0),
  shipping_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK(shipping_amount>=0),
  total numeric(18,2) NOT NULL CHECK(total>=0),
  idempotency_key text NOT NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id,order_number),
  UNIQUE(company_id,idempotency_key)
);
CREATE INDEX ecommerce_orders_customer_idx ON ecommerce_orders(company_id,customer_id,created_at DESC);

CREATE TABLE ecommerce_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES ecommerce_orders(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  sku text NOT NULL,
  product_name text NOT NULL,
  product_name_ar text NOT NULL DEFAULT '',
  variant_snapshot jsonb NOT NULL DEFAULT '{}',
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99),
  unit_price numeric(18,2) NOT NULL CHECK(unit_price>=0),
  discount_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK(discount_amount>=0),
  tax_rate numeric(7,4) NOT NULL DEFAULT 0 CHECK(tax_rate BETWEEN 0 AND 100),
  tax_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK(tax_amount>=0),
  total numeric(18,2) NOT NULL CHECK(total>=0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ecommerce_order_items_order_idx ON ecommerce_order_items(order_id);

CREATE TABLE ecommerce_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL REFERENCES ecommerce_orders(id) ON DELETE RESTRICT,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL CHECK(amount>=0),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','authorized','paid','failed','refunded')),
  provider_reference text,
  provider_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ecommerce_payments_order_idx ON ecommerce_payments(company_id,order_id,created_at DESC);
