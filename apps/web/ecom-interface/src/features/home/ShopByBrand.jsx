import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const initials = (name) => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export function ShopByBrand({ brands = [] }) {
  const { i18n } = useTranslation(); const ar = i18n.language === 'ar';
  if (!brands.length) return null;
  return <section className="brand-shop" aria-labelledby="brand-shop-title">
    <header><span>{ar ? 'اختر علامتك المفضلة' : 'Find your favourite'}</span><h2 id="brand-shop-title">{ar ? 'تسوق حسب العلامة التجارية' : 'Shop by brand'}</h2></header>
    <div className="brand-shop__grid">{brands.slice(0, 18).map((brand, index) => <Link className="brand-tile" style={{ '--brand-index': index }} to={`/products?brand=${encodeURIComponent(brand.name)}`} key={brand.name} aria-label={`${brand.name}, ${brand.productCount} products`}>
      <span className="brand-tile__mark" aria-hidden="true">{initials(brand.name)}</span><strong>{brand.name}</strong><small>{brand.productCount} {ar ? 'منتج' : 'products'}</small>
    </Link>)}</div>
  </section>;
}
