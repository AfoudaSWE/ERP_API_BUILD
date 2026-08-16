import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getProduct } from '@storefront/data-access';
import { useStore } from '../../app/StoreProvider';
import { useApi } from '../../hooks/useApi';
import { ProductGrid } from '../../components/storefront/ProductCard';
import { EmptyState, ErrorState, ProductGridSkeleton } from '../../components/ui/States';

export default function WishlistPage() {
  const { t } = useTranslation(); const { wishlist } = useStore();
  const state = useApi((signal) => Promise.all(wishlist.map((item) => getProduct(item.slug, signal))), [wishlist.map((item) => item.slug).join(',')]);
  if (!wishlist.length) return <main className="section container"><EmptyState title={t('emptyWishlist')} action={<Link className="btn btn--primary" to="/products">{t('shopNow')}</Link>}/></main>;
  return <main className="section container"><nav className="breadcrumb"><Link to="/">Home</Link><span>/</span><strong>{t('wishlist')}</strong></nav><div className="section-head"><div><span className="section-kicker">Saved for later</span><h1 className="section-title">{t('wishlist')}</h1></div></div>{state.loading ? <ProductGridSkeleton/> : state.error ? <ErrorState message={t('apiError')} onRetry={state.retry}/> : <ProductGrid products={state.data}/>}</main>;
}
