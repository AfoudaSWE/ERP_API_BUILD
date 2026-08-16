ALTER TABLE products
  ADD COLUMN slug text,
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN description_ar text NOT NULL DEFAULT '',
  ADD COLUMN compare_at_price numeric(14,2) CHECK(compare_at_price IS NULL OR compare_at_price >= 0),
  ADD COLUMN storefront_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN seo_title text,
  ADD COLUMN seo_description text;

UPDATE products
SET slug = lower(regexp_replace(sku, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 8),
    published_at = COALESCE(published_at, created_at)
WHERE slug IS NULL;
ALTER TABLE products ALTER COLUMN slug SET NOT NULL;
ALTER TABLE products ADD CONSTRAINT products_company_slug_unique UNIQUE(company_id, slug);
CREATE INDEX idx_products_storefront_catalog ON products(company_id, storefront_visible, commerce_status, published_at DESC)
  WHERE is_active=true;
CREATE INDEX idx_products_storefront_brand ON products(company_id, lower(brand)) WHERE brand IS NOT NULL;

ALTER TABLE categories
  ADD COLUMN parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  ADD COLUMN slug text,
  ADD COLUMN image_url text;
UPDATE categories SET slug=lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 8) WHERE slug IS NULL;
ALTER TABLE categories ALTER COLUMN slug SET NOT NULL;
ALTER TABLE categories ADD CONSTRAINT categories_company_slug_unique UNIQUE(company_id, slug);

CREATE TABLE product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE, url text NOT NULL, alt_text text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image' CHECK(media_type IN('image','video')), position integer NOT NULL DEFAULT 0,
  width integer, height integer, thumbnail_url text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_media_product ON product_media(company_id, product_id, position);

CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE, sku text NOT NULL, name text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}', selling_price numeric(14,2) NOT NULL CHECK(selling_price>=0),
  compare_at_price numeric(14,2) CHECK(compare_at_price IS NULL OR compare_at_price>=0), stock_quantity numeric(14,3) NOT NULL DEFAULT 0,
  image_url text, is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku), UNIQUE(company_id, id)
);
CREATE INDEX idx_product_variants_product ON product_variants(company_id, product_id) WHERE is_active=true;

CREATE TABLE product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE, customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), title text, body text, status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_reviews_public ON product_reviews(company_id, product_id, created_at DESC) WHERE status='approved';

CREATE TABLE storefront_settings (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE, is_default boolean NOT NULL DEFAULT false,
  store_name text NOT NULL, store_name_ar text NOT NULL DEFAULT '', currency text NOT NULL DEFAULT 'EGP',
  default_locale text NOT NULL DEFAULT 'en' CHECK(default_locale IN('en','ar')), support_phone text, support_email text,
  seo_title text, seo_description text, social_image_url text, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_default_storefront ON storefront_settings(is_default) WHERE is_default=true;
INSERT INTO storefront_settings(company_id,is_default,store_name,store_name_ar)
SELECT id, row_number() OVER(ORDER BY created_at,id)=1, name, name_ar FROM companies
ON CONFLICT(company_id) DO NOTHING;

CREATE TABLE cms_homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK(section_type IN('hero','category_grid','product_grid','brand_grid','promo_banner','service_benefits','newsletter','seo_content')),
  title text NOT NULL DEFAULT '', title_ar text NOT NULL DEFAULT '', subtitle text NOT NULL DEFAULT '', subtitle_ar text NOT NULL DEFAULT '',
  configuration jsonb NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published','archived')),
  display_order integer NOT NULL DEFAULT 0, starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cms_homepage_public ON cms_homepage_sections(company_id,display_order) WHERE status='published';

CREATE TABLE storefront_navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES storefront_navigation_items(id) ON DELETE CASCADE, label text NOT NULL, label_ar text NOT NULL DEFAULT '',
  target_type text NOT NULL CHECK(target_type IN('category','brand','collection','url')), target_value text NOT NULL,
  display_order integer NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published','archived')),
  starts_at timestamptz, ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_storefront_navigation_public ON storefront_navigation_items(company_id,display_order) WHERE status='published';

CREATE TABLE shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL, name_ar text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', fee numeric(14,2) NOT NULL DEFAULT 0 CHECK(fee>=0),
  is_enabled boolean NOT NULL DEFAULT true, configuration jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL, name text NOT NULL, name_ar text NOT NULL DEFAULT '', instructions text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT true, configuration jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,code)
);

CREATE TABLE storefront_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE, status text NOT NULL DEFAULT 'active' CHECK(status IN('active','converted','abandoned')),
  currency text NOT NULL DEFAULT 'EGP', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
CREATE TABLE storefront_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cart_id uuid NOT NULL REFERENCES storefront_carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT, variant_id uuid REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 99), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX storefront_cart_item_unique ON storefront_cart_items(cart_id,product_id,COALESCE(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));

INSERT INTO permissions(code,description) VALUES
  ('cms.storefront.manage','Manage Storefront homepage and navigation')
ON CONFLICT(code) DO NOTHING;
INSERT INTO role_permissions(role,permission_code)
SELECT role,'cms.storefront.manage' FROM (VALUES('super_admin'),('company_owner'),('business_owner'),('system_admin'),('company_admin')) roles(role)
ON CONFLICT DO NOTHING;
