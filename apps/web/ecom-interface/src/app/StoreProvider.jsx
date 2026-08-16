import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addCartItem, createCart, getCart, removeCartItem, updateCartItem } from '@storefront/data-access';
import { addCustomerWishlist, getCustomerWishlist, removeCustomerWishlist } from '../data-access/customerApi';
import { useCustomer } from './CustomerProvider';
import { readComparison, toggleComparison as toggleComparisonValue, writeComparison } from '../features/comparison/comparisonStore';

const StoreContext = createContext(null);
const readList = (key) => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };

export function StoreProvider({ children }) {
  const { customer } = useCustomer();
  const [cart, setCart] = useState(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState(() => readList('malek_wishlist'));
  const [comparison, setComparison] = useState(() => readComparison());
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, tone = 'success') => {
    const id = window.crypto.randomUUID();
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 3200);
  }, []);

  const refreshCart = useCallback(async () => {
    setCartLoading(true); setCartError(null);
    try {
      let token = localStorage.getItem('malek_cart_token');
      let next;
      if (token) {
        try { next = await getCart(token); } catch (error) { if (error?.status !== 404) throw error; }
      }
      if (!next) { next = await createCart(); token = next.token; localStorage.setItem('malek_cart_token', token); }
      setCart(next);
    } catch (error) { setCartError(error); }
    finally { setCartLoading(false); }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCart();
  }, [refreshCart]);
  useEffect(() => { localStorage.setItem('malek_wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { writeComparison(comparison); }, [comparison]);
  useEffect(() => {
    if (!customer) return;
    const local = wishlist;
    Promise.allSettled(local.map((item) => addCustomerWishlist(item.id))).then(() => getCustomerWishlist()).then((products) => setWishlist(products.map((product) => ({ id: product.id, slug: product.slug })))).catch(() => notify('Unable to synchronize wishlist', 'error'));
    // Synchronize once when customer identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const mutateCart = useCallback(async (operation, successMessage) => {
    if (!cart?.token) return;
    setCartLoading(true); setCartError(null);
    try { const next = await operation(cart.token); setCart(next); if (successMessage) notify(successMessage); return next; }
    catch (error) { setCartError(error); notify(error?.message || 'Unable to update cart', 'error'); throw error; }
    finally { setCartLoading(false); }
  }, [cart, notify]);

  const addToCart = useCallback((product, variantId, quantity = 1) => mutateCart(
    (token) => addCartItem(token, product.id, quantity, variantId), `${product.name} added to cart`,
  ), [mutateCart]);
  const updateQuantity = useCallback((lineId, quantity) => mutateCart((token) => updateCartItem(token, lineId, quantity)), [mutateCart]);
  const removeFromCart = useCallback((lineId) => mutateCart((token) => removeCartItem(token, lineId), 'Removed from cart'), [mutateCart]);
  const toggleWishlist = useCallback(async (product) => {
    const removing = wishlist.some((item) => item.slug === product.slug);
    setWishlist((items) => removing ? items.filter((item) => item.slug !== product.slug) : [...items, { id: product.id, slug: product.slug }]);
    try { if (customer) { if (removing) await removeCustomerWishlist(product.id); else await addCustomerWishlist(product.id); } notify(removing ? 'Removed from wishlist' : 'Added to wishlist'); }
    catch (error) { setWishlist((items) => removing ? [...items, { id: product.id, slug: product.slug }] : items.filter((item) => item.slug !== product.slug)); notify(error.message, 'error'); }
  }, [customer, notify, wishlist]);

  const toggleComparison = useCallback((product) => {
    setComparison((items) => {
      const next = toggleComparisonValue(items, product.slug);
      notify(next.includes(product.slug) ? 'Added to comparison' : 'Removed from comparison');
      return next;
    });
  }, [notify]);
  const clearComparison = useCallback(() => setComparison([]), []);

  const value = useMemo(() => ({ cart, cartLoading, cartError, cartOpen, setCartOpen, refreshCart, addToCart, updateQuantity, removeFromCart, wishlist, toggleWishlist, comparison, toggleComparison, clearComparison, notify }), [cart, cartLoading, cartError, cartOpen, refreshCart, addToCart, updateQuantity, removeFromCart, wishlist, toggleWishlist, comparison, toggleComparison, clearComparison, notify]);
  return <StoreContext.Provider value={value}>{children}<div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div className={`toast toast--${toast.tone}`} key={toast.id}>{toast.message}</div>)}</div></StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used within StoreProvider');
  return value;
}
