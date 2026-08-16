import { query } from "../../db/client.js";
import { HttpError } from "../../lib/http.js";

export interface StoreRow {
  company_id: string;
  store_name: string;
  store_name_ar: string;
  currency: string;
  default_locale: "en" | "ar";
  support_phone: string | null;
  support_email: string | null;
  seo_title: string | null;
  seo_description: string | null;
  social_image_url: string | null;
  configuration: Record<string, unknown>;
}
export async function getActiveStore(): Promise<StoreRow> {
  const store = (
    await query<StoreRow>(
      `SELECT s.* FROM storefront_settings s JOIN companies c ON c.id=s.company_id WHERE s.is_default=true ORDER BY s.updated_at DESC LIMIT 1`,
    )
  ).rows[0];
  if (!store)
    throw new HttpError(
      503,
      "STOREFRONT_NOT_CONFIGURED",
      "The Storefront is not configured",
    );
  return store;
}
export function mapSettings(store: StoreRow) {
  return {
    storeName: store.store_name,
    storeNameAr: store.store_name_ar,
    currency: store.currency,
    defaultLocale: store.default_locale,
    supportPhone: store.support_phone,
    supportEmail: store.support_email,
    seoTitle: store.seo_title,
    seoDescription: store.seo_description,
    socialImageUrl: store.social_image_url,
    configuration: store.configuration ?? {},
  };
}
