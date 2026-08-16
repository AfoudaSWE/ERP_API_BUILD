import { apiPublicRequest } from '@shared/data-access';

const tokenKey = 'malek_customer_token';
export const getCustomerToken = () => localStorage.getItem(tokenKey);
export const setCustomerToken = (token) => token ? localStorage.setItem(tokenKey, token) : localStorage.removeItem(tokenKey);
const authorized = (path, init = {}) => {
  const token = getCustomerToken();
  if (!token) return Promise.reject(Object.assign(new Error('Customer authentication is required'), { status: 401 }));
  return apiPublicRequest(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
};
export const registerCustomer = (input) => apiPublicRequest('/storefront/customer-auth/register', { method: 'POST', body: JSON.stringify(input) });
export const loginCustomer = (input) => apiPublicRequest('/storefront/customer-auth/login', { method: 'POST', body: JSON.stringify(input) });
export const forgotCustomerPassword = (email) => apiPublicRequest('/storefront/customer-auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const resetCustomerPassword = (token, password) => apiPublicRequest('/storefront/customer-auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
export const getCustomerProfile = () => authorized('/storefront/customer/me');
export const updateCustomerProfile = (input) => authorized('/storefront/customer/me', { method: 'PATCH', body: JSON.stringify(input) });
export const getCustomerAddresses = () => authorized('/storefront/customer/addresses');
export const createCustomerAddress = (input) => authorized('/storefront/customer/addresses', { method: 'POST', body: JSON.stringify(input) });
export const deleteCustomerAddress = (id) => authorized(`/storefront/customer/addresses/${id}`, { method: 'DELETE' });
export const getCustomerWishlist = () => authorized('/storefront/customer/wishlist');
export const addCustomerWishlist = (productId) => authorized(`/storefront/customer/wishlist/${productId}`, { method: 'POST' });
export const removeCustomerWishlist = (productId) => authorized(`/storefront/customer/wishlist/${productId}`, { method: 'DELETE' });
export const getCustomerOrders = () => authorized('/storefront/customer/orders');
export const getCustomerOrder = (id) => authorized(`/storefront/customer/orders/${id}`);
export const createCustomerOrder = (input, idempotencyKey) => authorized('/storefront/customer/orders', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) });
