export type StorefrontLocale = "en" | "ar";
export type ProductAvailability = "in_stock" | "low_stock" | "out_of_stock";

export interface StorefrontSettings {
  storeName: string;
  storeNameAr: string;
  currency: string;
  defaultLocale: StorefrontLocale;
  supportPhone?: string | null;
  supportEmail?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  socialImageUrl?: string | null;
  configuration: Record<string, unknown>;
}
export interface StorefrontCategory {
  id: string;
  parentId?: string | null;
  slug: string;
  name: string;
  nameAr: string;
  imageUrl?: string | null;
  productCount: number;
}
export interface StorefrontBrand {
  name: string;
  productCount: number;
}
export interface ProductMedia {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  altText: string;
  mediaType: "image" | "video";
  width?: number | null;
  height?: number | null;
}
export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  price: number;
  originalPrice?: number | null;
  stockQuantity: number;
  imageUrl?: string | null;
  availability: ProductAvailability;
}
export interface StorefrontProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  brand?: string | null;
  price: number;
  originalPrice?: number | null;
  discountPercent?: number | null;
  currency: string;
  taxRate: number;
  stockQuantity: number;
  availability: ProductAvailability;
  rating: number | null;
  reviewCount: number;
  primaryImage?: ProductMedia | null;
  media?: ProductMedia[];
  variants?: ProductVariant[];
  hasVariants: boolean;
  publishedAt: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
}
export interface StorefrontProductQuery {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: "in_stock" | "out_of_stock";
  sort?: "relevance" | "newest" | "price-asc" | "price-desc" | "discount";
}
export interface StorefrontProductPage {
  products: StorefrontProduct[];
  page: number;
  pageSize: number;
  total: number;
}
export interface NavigationItem {
  id: string;
  parentId?: string | null;
  label: string;
  labelAr: string;
  targetType: "category" | "brand" | "collection" | "url";
  targetValue: string;
  children: NavigationItem[];
}
export type HomepageSectionType =
  | "hero"
  | "category_grid"
  | "product_grid"
  | "brand_grid"
  | "promo_banner"
  | "service_benefits"
  | "newsletter"
  | "seo_content";
export interface HomepageSection {
  id: string;
  sectionType: HomepageSectionType;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  configuration: Record<string, unknown>;
  displayOrder: number;
  products?: StorefrontProduct[];
}
export interface StorefrontHomepage {
  settings: StorefrontSettings;
  sections: HomepageSection[];
}
export interface SearchSuggestions {
  products: Pick<
    StorefrontProduct,
    | "id"
    | "slug"
    | "name"
    | "nameAr"
    | "price"
    | "originalPrice"
    | "discountPercent"
    | "currency"
    | "primaryImage"
  >[];
  categories: StorefrontCategory[];
  brands: StorefrontBrand[];
}
export interface CartLine {
  id: string;
  productId: string;
  variantId?: string | null;
  slug: string;
  name: string;
  nameAr: string;
  sku: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  taxAmount: number;
  availability: ProductAvailability;
  maxQuantity: number;
}
export interface StorefrontCart {
  token: string;
  currency: string;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
}
export interface CommerceMethod {
  id: string;
  code?: string;
  name: string;
  nameAr: string;
  description?: string;
  instructions?: string;
  fee?: number;
  configuration: Record<string, unknown>;
}
export interface CheckoutValidation {
  ready: boolean;
  errors: string[];
  cart: StorefrontCart;
  shippingMethod?: CommerceMethod;
  paymentMethod?: CommerceMethod;
}
