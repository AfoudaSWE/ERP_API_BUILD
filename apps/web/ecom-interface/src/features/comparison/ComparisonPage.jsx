import { Link } from 'react-router-dom';
import { Check, GitCompareArrows, Trash2, X } from 'lucide-react';
import { getProduct } from '@storefront/data-access';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../hooks/useApi';
import { useStore } from '../../app/StoreProvider';
import { formatMoney, localized } from '../../components/storefront/ProductCard';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/States';
import { RouteMetadata } from '../../components/seo/RouteMetadata';

const specificationKeys = (products) => [...new Set(products.flatMap((product) => product.variants?.flatMap((variant) => Object.keys(variant.attributes || {})) || []))];

export default function ComparisonPage() {
  const { i18n } = useTranslation(); const { comparison, toggleComparison, clearComparison } = useStore();
  const state = useApi((signal) => Promise.all(comparison.map((slug) => getProduct(slug, signal))), [comparison.join('|')]);
  if (!comparison.length) return <main className="section container"><RouteMetadata title="Compare phones | Malek Stores" canonicalPath="/compare"/><EmptyState title="Your comparison is empty" action={<Link className="btn btn--primary" to="/products">Explore phones</Link>}/></main>;
  if (state.loading) return <PageLoader/>; if (state.error) return <main className="section container"><ErrorState message="Unable to load comparison" onRetry={state.retry}/></main>;
  const products = state.data || []; const keys = specificationKeys(products);
  return <main className="comparison-page"><RouteMetadata title="Compare phones | Malek Stores" description="Compare phone prices, availability, and specifications side by side." canonicalPath="/compare"/><div className="container"><div className="comparison-head"><div><span className="section-kicker">Make the right call</span><h1>Compare phones</h1><p>Review up to four models side by side. Missing specifications are shown honestly.</p></div><button className="btn btn--light" onClick={clearComparison}><Trash2/> Clear</button></div><div className="comparison-scroll"><table className="comparison-table"><thead><tr><th>Product</th>{products.map((product) => <th key={product.id}><button className="comparison-remove" onClick={() => toggleComparison(product)} aria-label={`Remove ${product.name}`}><X/></button>{product.primaryImage ? <img src={product.primaryImage.thumbnailUrl || product.primaryImage.url} alt={product.primaryImage.altText || product.name}/> : <span className="comparison-device"><GitCompareArrows/></span>}<Link to={`/product/${product.slug}`}>{localized(product.name, product.nameAr, i18n.language)}</Link><strong>{formatMoney(product.price, product.currency, i18n.language)}</strong></th>)}</tr></thead><tbody><tr><th>Availability</th>{products.map((product) => <td key={product.id}>{product.availability === 'in_stock' ? <><Check/> In stock</> : product.availability.replace('_',' ')}</td>)}</tr><tr><th>Brand</th>{products.map((product) => <td key={product.id}>{product.brand || '—'}</td>)}</tr><tr><th>SKU</th>{products.map((product) => <td key={product.id}><bdi>{product.sku}</bdi></td>)}</tr>{keys.map((key) => <tr key={key}><th>{key}</th>{products.map((product) => <td key={product.id}>{product.variants?.find((variant) => variant.attributes?.[key])?.attributes[key] || '—'}</td>)}</tr>)}</tbody></table></div></div></main>;
}
