ALTER TABLE storefront_settings
  ADD COLUMN configuration jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN storefront_settings.configuration IS
  'CMS-managed utility links, social links, logo, location and other optional presentation settings.';
