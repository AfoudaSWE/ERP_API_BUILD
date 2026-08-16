import { Link } from 'react-router-dom';
import { GitCompareArrows, Heart, ShoppingBag, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../app/StoreProvider';

// eslint-disable-next-line react-refresh/only-export-components
export const localized = (value, valueAr, language) => language === 'ar' ? valueAr || value : value;
// eslint-disable-next-line react-refresh/only-export-components
export const formatMoney = (value, currency, language) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-EG', { style: 'currency', currency: currency || 'EGP', maximumFractionDigits: 0 }).format(value);

export function ProductCard({ product }) {
  const { t, i18n } = useTranslation(); const { addToCart, wishlist, toggleWishlist, comparison, toggleComparison } = useStore();
  const wished = wishlist.some((item) => item.slug === product.slug); const compared = comparison.includes(product.slug); const canAdd = product.availability !== 'out_of_stock' && !product.hasVariants;
  return <article className="product-card">
    <div className="product-card__media">{product.discountPercent ? <span className="product-badge">-{product.discountPercent}%</span> : null}<div className="product-actions"><button className="icon-btn" onClick={() => toggleWishlist(product)} aria-label={t('wishlist')} aria-pressed={wished}><Heart fill={wished ? 'currentColor' : 'none'}/></button><button className="icon-btn" onClick={() => toggleComparison(product)} aria-label="Compare product" aria-pressed={compared}><GitCompareArrows/></button></div>
      <Link to={`/product/${product.slug}`} tabIndex={-1}>{product.primaryImage ? <img className="product-card__image" src={product.primaryImage.thumbnailUrl || product.primaryImage.url} alt={product.primaryImage.altText || product.name} width={product.primaryImage.width || 480} height={product.primaryImage.height || 480} loading="lazy"/> : <span className="product-card__placeholder" aria-hidden="true"><span className="product-card__device"/></span>}</Link>
    </div>
    <div className="product-card__body"><div className="product-brand">{product.brand || product.categoryName}</div><Link className="product-title" to={`/product/${product.slug}`}>{localized(product.name, product.nameAr, i18n.language)}</Link>
      <div className="rating" aria-label={`${product.rating || 0} out of 5`}><Star fill="currentColor"/> <span>{product.rating || '—'} ({product.reviewCount})</span></div>
      <div className="price-row"><span className="price">{formatMoney(product.price, product.currency, i18n.language)}</span>{product.originalPrice ? <span className="old-price">{formatMoney(product.originalPrice, product.currency, i18n.language)}</span> : null}</div>
      <div className={`stock stock--${product.availability}`}>● {t(product.availability === 'in_stock' ? 'inStock' : product.availability === 'low_stock' ? 'lowStock' : 'outOfStock')}</div>
      {canAdd ? <button className="add-cart" onClick={() => addToCart(product)}><ShoppingBag/>{t('addCart')}</button> : <Link className="add-cart" to={`/product/${product.slug}`}>{product.hasVariants ? 'Choose options' : t('outOfStock')}</Link>}
    </div>
  </article>;
}

export function ProductGrid({ products }) { return <div className="products-grid">{products.map((product) => <ProductCard product={product} key={product.id}/>)}</div>; }
