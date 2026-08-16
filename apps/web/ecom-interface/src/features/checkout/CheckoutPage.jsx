import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPaymentMethods, getShippingMethods, validateCheckout } from '@storefront/data-access';
import { useStore } from '../../app/StoreProvider';
import { useCustomer } from '../../app/CustomerProvider';
import { createCustomerOrder } from '../../data-access/customerApi';
import { useApi } from '../../hooks/useApi';
import { formatMoney, localized } from '../../components/storefront/ProductCard';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/States';

export default function CheckoutPage() {
  const { t, i18n } = useTranslation(); const navigate = useNavigate(); const { customer } = useCustomer(); const { cart, notify, refreshCart } = useStore();
  const methods = useApi(async () => { const [shipping, payment] = await Promise.all([getShippingMethods(), getPaymentMethods()]); return { shipping, payment }; });
  const [shippingId, setShippingId] = useState(''); const [paymentId, setPaymentId] = useState(''); const [validation, setValidation] = useState(null); const [validating, setValidating] = useState(false); const [placing, setPlacing] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (methods.data) { setShippingId(methods.data.shipping[0]?.id || ''); setPaymentId(methods.data.payment[0]?.id || ''); } }, [methods.data]);
  useEffect(() => { if (!cart?.token || !shippingId || !paymentId) return; const timer = window.setTimeout(() => { setValidating(true); validateCheckout(cart.token, shippingId, paymentId).then(setValidation).catch((error) => notify(error.message, 'error')).finally(() => setValidating(false)); }, 250); return () => window.clearTimeout(timer); }, [cart?.token, notify, paymentId, shippingId]);
  if (!cart?.lines.length) return <main className="section container"><EmptyState title={t('emptyCart')} action={<Link className="btn btn--primary" to="/products">{t('shopNow')}</Link>}/></main>;
  if (methods.loading) return <PageLoader/>; if (methods.error) return <main className="section container"><ErrorState message={t('apiError')} onRetry={methods.retry}/></main>;
  const checkedCart = validation?.cart || cart;
  const placeOrder = async (event) => {
    event.preventDefault(); if (!customer) { navigate('/account'); return; } const form = new window.FormData(event.currentTarget); setPlacing(true);
    try { const order = await createCustomerOrder({ cartToken: cart.token, shippingMethodId: shippingId, paymentMethodId: paymentId, address: { recipientName: form.get('name'), phone: form.get('tel'), addressLine1: form.get('street'), addressLine2: '', city: form.get('city'), area: form.get('area') || '', postalCode: '', deliveryNotes: '' }, notes: '' }, window.crypto.randomUUID()); localStorage.removeItem('malek_cart_token'); await refreshCart(); navigate(`/order-success/${order.id}`); }
    catch (error) { notify(error.message, 'error'); } finally { setPlacing(false); }
  };
  return <main className="checkout-page"><div className="container"><nav className="breadcrumb"><Link to="/cart">{t('cart')}</Link><span>/</span><strong>{t('checkout')}</strong></nav><h1>{t('checkoutTitle')}</h1><div className="checkout-layout"><form className="checkout-form" onSubmit={placeOrder}>
    <fieldset><legend>Customer information</legend><div className="form-grid"><label>Full name<input name="name" autoComplete="name" defaultValue={customer?.name || ''} required/></label><label>{t('email')}<input name="email" type="email" autoComplete="email" defaultValue={customer?.email || ''} spellCheck="false" required/></label><label>Phone<input name="tel" type="tel" autoComplete="tel" defaultValue={customer?.phone || ''} required/></label></div></fieldset>
    <fieldset><legend>Shipping address</legend><div className="form-grid"><label className="form-span">Street address<input name="street" autoComplete="street-address" required/></label><label>City<input name="city" autoComplete="address-level2" required/></label><label>Area<input name="area" autoComplete="address-level3" required/></label></div></fieldset>
    <fieldset><legend>{t('deliveryMethod')}</legend><div className="method-list">{methods.data.shipping.map((method) => <label className={shippingId === method.id ? 'is-selected' : ''} key={method.id}><input type="radio" name="shipping" value={method.id} checked={shippingId === method.id} onChange={() => setShippingId(method.id)}/><span><strong>{localized(method.name, method.nameAr, i18n.language)}</strong><small>{method.description}</small></span><b>{formatMoney(method.fee, cart.currency, i18n.language)}</b></label>)}</div></fieldset>
    <fieldset><legend>{t('paymentMethod')}</legend><div className="method-list">{methods.data.payment.map((method) => <label className={paymentId === method.id ? 'is-selected' : ''} key={method.id}><input type="radio" name="payment" value={method.id} checked={paymentId === method.id} onChange={() => setPaymentId(method.id)}/><span><strong>{localized(method.name, method.nameAr, i18n.language)}</strong><small>{method.instructions}</small></span></label>)}</div></fieldset>
    {validation?.errors.length ? <div className="checkout-errors" role="alert">{validation.errors.map((error) => <p key={error}>{error}</p>)}</div> : null}{!customer ? <p className="inline-error">Log in or create an account to place this order.</p> : null}<button className="btn btn--primary btn--block" disabled={validating || placing || !validation?.ready}>{placing ? 'Placing order…' : validating ? 'Validating…' : customer ? 'Place order' : 'Log in to checkout'}</button><p className="form-note">Prices, tax, stock, and shipping are recalculated by the API before the ERP sale is posted.</p>
  </form><aside className="order-summary"><h2>{t('reviewOrder')}</h2>{checkedCart.lines.map((line) => <div className="checkout-line" key={line.id}><span>{localized(line.name, line.nameAr, i18n.language)} × {line.quantity}</span><strong>{formatMoney(line.lineSubtotal, checkedCart.currency, i18n.language)}</strong></div>)}<div className="summary-row"><span>{t('subtotal')}</span><strong>{formatMoney(checkedCart.subtotal, checkedCart.currency, i18n.language)}</strong></div><div className="summary-row"><span>{t('shipping')}</span><strong>{formatMoney(checkedCart.shippingTotal, checkedCart.currency, i18n.language)}</strong></div><div className="summary-row summary-row--total"><span>{t('total')}</span><strong>{formatMoney(checkedCart.total, checkedCart.currency, i18n.language)}</strong></div></aside></div></div></main>;
}
