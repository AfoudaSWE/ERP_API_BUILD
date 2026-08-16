CREATE OR REPLACE FUNCTION assign_product_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
    NEW.slug := trim(both '-' from lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')))
      || '-' || left(replace(NEW.id::text, '-', ''), 8);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_assign_slug
BEFORE INSERT ON products
FOR EACH ROW EXECUTE FUNCTION assign_product_slug();
