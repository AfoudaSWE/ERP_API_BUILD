import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCategories, getProducts } from '@storefront/data-access';
import { useApi } from '../../hooks/useApi';
import { ProductCard } from '../../components/storefront/ProductCard';
import { ProductGridSkeleton } from '../../components/ui/States';

export function DealsShowcase() {
  const { i18n } = useTranslation(); const [category, setCategory] = useState(''); const rail = useRef(null); const ar = i18n.language === 'ar';
  const categories = useApi((signal) => getCategories(signal));
  const products = useApi((signal) => getProducts({ page: 1, pageSize: 12, category, sort: 'discount' }, signal), [category]);
  const scroll = (direction) => rail.current?.scrollBy({ left: direction * Math.max(280, rail.current.clientWidth * .72), behavior: 'smooth' });
  if (products.error) return null;
  return <section className="section deals-showcase" aria-labelledby="deals-title"><div className="container"><div className="deals-heading"><Link className="deals-more" to="/products?sort=discount">{ar ? 'المزيد' : 'View all'} <span aria-hidden="true">↗</span></Link><div><span className="section-kicker">{ar ? 'مختارة لك' : 'Hand-picked offers'}</span><h2 id="deals-title"><strong>{ar ? 'أقوى' : 'Power'}</strong> {ar ? 'العروض!' : 'deals!'}</h2></div></div><div className="deals-toolbar"><div className="deals-controls"><button onClick={() => scroll(-1)} aria-label="Previous products"><ArrowLeft/></button><button onClick={() => scroll(1)} aria-label="Next products"><ArrowRight/></button></div><div className="deals-tabs" role="tablist" aria-label={ar ? 'فئات العروض' : 'Deal categories'}><button role="tab" aria-selected={!category} className={!category ? 'is-active' : ''} onClick={() => setCategory('')}>{ar ? 'الأفضل' : 'Best'}</button>{categories.data?.filter((item) => item.productCount > 0).slice(0, 5).map((item) => <button role="tab" aria-selected={category === item.slug} className={category === item.slug ? 'is-active' : ''} onClick={() => setCategory(item.slug)} key={item.id}>{ar ? item.nameAr || item.name : item.name}</button>)}</div></div>{products.loading ? <ProductGridSkeleton count={6}/> : <div className="deals-rail" ref={rail} tabIndex="0" aria-label={ar ? 'منتجات العروض' : 'Deal products'}>{products.data?.products.map((product) => <ProductCard product={product} key={product.id}/>)}</div>}</div></section>;
}
