import type { CheckoutValidation, CommerceMethod, SearchSuggestions, StorefrontBrand, StorefrontCart, StorefrontCategory, StorefrontHomepage, StorefrontProduct, StorefrontProductPage, StorefrontProductQuery } from '@erp/commerce-storefront-contracts';
import { apiPublicEnvelopeRequest, apiPublicRequest } from '@erp/shared-frontend-data-access';

export const storefrontQueryKeys = {
  homepage: ['storefront','homepage'] as const, categories: ['storefront','categories'] as const, brands: ['storefront','brands'] as const,
  products: (query: StorefrontProductQuery) => ['storefront','products',query] as const, product: (slug: string) => ['storefront','product',slug] as const,
};

function productParams(query: StorefrontProductQuery) {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  Object.entries(query).forEach(([key,value]) => { if (!['page','pageSize'].includes(key) && value !== undefined && value !== '') params.set(key,String(value)); });
  return params;
}
export async function getHomepage(signal?: AbortSignal) { return apiPublicRequest<StorefrontHomepage>('/storefront/homepage',{ signal }); }
export async function getNavigation(signal?: AbortSignal) { return apiPublicRequest<import('@erp/commerce-storefront-contracts').NavigationItem[]>('/storefront/navigation',{ signal }); }
export async function getCategories(signal?: AbortSignal) { return apiPublicRequest<StorefrontCategory[]>('/storefront/categories',{ signal }); }
export async function getBrands(signal?: AbortSignal) { return apiPublicRequest<StorefrontBrand[]>('/storefront/brands',{ signal }); }
export async function getProducts(query: StorefrontProductQuery, signal?: AbortSignal): Promise<StorefrontProductPage> {
  const response = await apiPublicEnvelopeRequest<StorefrontProduct[]>(`/storefront/products?${productParams(query)}`,{ signal });
  return { products: response.data, page: response.meta?.page ?? query.page, pageSize: response.meta?.pageSize ?? query.pageSize, total: response.meta?.total ?? response.data.length };
}
export async function getProduct(slug: string, signal?: AbortSignal) { return apiPublicRequest<StorefrontProduct>(`/storefront/products/${encodeURIComponent(slug)}`,{ signal }); }
export async function getRelatedProducts(slug: string, signal?: AbortSignal) { return apiPublicRequest<StorefrontProduct[]>(`/storefront/products/${encodeURIComponent(slug)}/related`,{ signal }); }
export async function getSearchSuggestions(query: string, signal?: AbortSignal) { return apiPublicRequest<SearchSuggestions>(`/storefront/search/suggestions?q=${encodeURIComponent(query)}`,{ signal }); }
export async function createCart() { return apiPublicRequest<StorefrontCart>('/storefront/cart',{ method:'POST' }); }
export async function getCart(token: string, signal?: AbortSignal) { return apiPublicRequest<StorefrontCart>('/storefront/cart',{ headers:{ 'X-Cart-Token':token },signal }); }
export async function addCartItem(token: string, productId: string, quantity=1, variantId?: string) { return apiPublicRequest<StorefrontCart>('/storefront/cart/items',{ method:'POST',headers:{'X-Cart-Token':token},body:JSON.stringify({productId,variantId,quantity}) }); }
export async function updateCartItem(token: string, lineId: string, quantity: number) { return apiPublicRequest<StorefrontCart>(`/storefront/cart/items/${lineId}`,{ method:'PATCH',headers:{'X-Cart-Token':token},body:JSON.stringify({quantity}) }); }
export async function removeCartItem(token: string, lineId: string) { return apiPublicRequest<StorefrontCart>(`/storefront/cart/items/${lineId}`,{ method:'DELETE',headers:{'X-Cart-Token':token} }); }
export async function getShippingMethods() { return apiPublicRequest<CommerceMethod[]>('/storefront/shipping-methods'); }
export async function getPaymentMethods() { return apiPublicRequest<CommerceMethod[]>('/storefront/payment-methods'); }
export async function validateCheckout(token: string, shippingMethodId: string, paymentMethodId: string) { return apiPublicRequest<CheckoutValidation>('/storefront/checkout/validate',{ method:'POST',headers:{'X-Cart-Token':token},body:JSON.stringify({shippingMethodId,paymentMethodId}) }); }
