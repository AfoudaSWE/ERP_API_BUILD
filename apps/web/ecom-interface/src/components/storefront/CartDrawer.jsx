import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../app/StoreProvider';
import { formatMoney, localized } from './ProductCard';

export function CartDrawer({ open, onClose }) {
  const { t, i18n } = useTranslation(); const { cart, cartLoading, updateQuantity, removeFromCart } = useStore();
  return <><button className={`drawer-backdrop${open ? ' is-open' : ''}`} onClick={onClose} aria-label="Close cart"/><aside className={`cart-drawer${open ? ' is-open' : ''}`} aria-hidden={!open} aria-label={t('cart')}>
    <div className="cart-head"><h2>{t('cart')}</h2><button className="icon-btn" onClick={onClose} aria-label="Close cart">×</button></div>
    <div className="cart-body" aria-busy={cartLoading}>{cart?.lines.length ? cart.lines.map((line) => <div className="cart-item" key={line.id}>{line.imageUrl ? <img className="cart-item__thumb" src={line.imageUrl} alt=""/> : <div className="cart-item__thumb"/>}<div><Link to={`/product/${line.slug}`} onClick={onClose}><strong>{localized(line.name, line.nameAr, i18n.language)}</strong></Link><div>{formatMoney(line.unitPrice, cart.currency, i18n.language)}</div><label className="quantity-control"><span className="visually-hidden">Quantity</span><button onClick={() => line.quantity > 1 && updateQuantity(line.id, line.quantity - 1)} disabled={cartLoading || line.quantity <= 1}>−</button><input value={line.quantity} readOnly aria-label="Quantity"/><button onClick={() => updateQuantity(line.id, line.quantity + 1)} disabled={cartLoading || line.quantity >= line.maxQuantity}>+</button></label></div><button className="icon-btn" onClick={() => removeFromCart(line.id)} disabled={cartLoading} aria-label="Remove item">×</button></div>) : <p>{t('emptyCart')}</p>}</div>
    <div className="cart-foot"><div className="summary-row"><strong>{t('total')}</strong><strong>{formatMoney(cart?.total || 0, cart?.currency, i18n.language)}</strong></div><Link className="btn btn--primary btn--block" to="/checkout" onClick={onClose} aria-disabled={!cart?.lines.length}>{t('checkout')}</Link><Link className="text-link cart-page-link" to="/cart" onClick={onClose}>View cart</Link></div>
  </aside></>;
}
