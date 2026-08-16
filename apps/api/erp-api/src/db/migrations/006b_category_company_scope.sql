ALTER TABLE categories
  ADD CONSTRAINT categories_id_company_unique UNIQUE (id, company_id);

ALTER TABLE products
  ADD CONSTRAINT products_category_company_fk
  FOREIGN KEY (category_id, company_id)
  REFERENCES categories(id, company_id)
  ON DELETE RESTRICT;
