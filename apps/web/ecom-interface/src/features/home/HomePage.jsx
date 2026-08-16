import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getBrands, getCategories, getProducts } from '@storefront/data-access';
import { useApi } from '../../hooks/useApi';
import { ProductGrid } from '../../components/storefront/ProductCard';
import { ErrorState, ProductGridSkeleton } from '../../components/ui/States';
import { CampaignRibbon, RetailHero } from './RetailHero';
import { FlashSaleBanner } from './FlashSaleBanner';
import { ShopByBrand } from './ShopByBrand';
import { RouteMetadata } from '../../components/seo/RouteMetadata';

const localName = (item, language) => language === 'ar' ? item.nameAr || item.name : item.name;
const requestedShelves = [
  { key: 'smart', title: 'Smart products', titleAr: 'منتجات سمارت', search: 'smart', terms: ['smart', 'gadget', 'watch', 'سمارت', 'ذكي'] },
  { key: 'accessories', title: 'Accessories', titleAr: 'إكسسوارات', search: 'accessories', terms: ['accessor', 'charger', 'power bank', 'إكسسوار', 'اكسسوار', 'شاحن'] },
  { key: 'tablets', title: 'Tablets & iPad', titleAr: 'تابلت وآيباد', search: 'tablet', terms: ['tablet', 'ipad', 'تابلت', 'آيباد', 'ايباد'] },
];
const matchesShelf = (category, shelf) => {
  const value = `${category.name} ${category.nameAr || ''} ${category.slug}`.toLocaleLowerCase();
  return shelf.terms.some((term) => value.includes(term.toLocaleLowerCase()));
};

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const catalog = useApi(async (signal) => {
    const [categoryData, brandData] = await Promise.all([getCategories(signal), getBrands(signal)]);
    const availableCategories = categoryData.filter((item) => item.productCount > 0);
    const dedicated = requestedShelves.map((definition) => ({ definition, category: availableCategories.find((category) => matchesShelf(category, definition)) }));
    const matchedIds = new Set(dedicated.map((item) => item.category?.id).filter(Boolean));
    const extras = availableCategories.filter((category) => !matchedIds.has(category.id)).slice(0, 2).map((category) => ({ category }));
    const shelfRequests = [...dedicated, ...extras];
    const [arrivals, ...shelves] = await Promise.all([
      getProducts({ page: 1, pageSize: 8, sort: 'newest' }, signal),
      ...shelfRequests.map(({ category, definition }) => getProducts({ page: 1, pageSize: 6, ...(category ? { category: category.slug } : { search: definition.search }) }, signal)),
    ]);
    return { brands: brandData.filter((item) => item.productCount > 0), arrivals: arrivals.products, shelves: shelfRequests.map((shelf, index) => ({ ...shelf, products: shelves[index].products })) };
  });

  if (catalog.error) return <main className="section container"><ErrorState message={t('apiError')} onRetry={catalog.retry}/></main>;
  const ar = i18n.language === 'ar';
  return <main className="merch-home">
    <RouteMetadata title="Malek Stores | Mobiles and electronics" description="Shop original mobiles, smart gadgets and electronics with live stock and secure checkout." canonicalPath="/"/>
    <RetailHero/>
    <div className="container merch-home__body">
      <FlashSaleBanner/>
      <CatalogShelf title={ar ? 'وصل حديثاً' : 'New arrivals'} eyebrow={ar ? 'اكتشف الجديد' : 'Fresh from the box'} url="/products?sort=newest" products={catalog.data?.arrivals} loading={catalog.loading} language={i18n.language} featured/>
      <CampaignRibbon/>
      {catalog.data?.shelves.map((shelf, index) => <div key={shelf.definition?.key || shelf.category.id}>
        <CatalogShelf title={shelf.definition ? (ar ? shelf.definition.titleAr : shelf.definition.title) : localName(shelf.category, i18n.language)} eyebrow={index === 0 ? (ar ? 'الأكثر طلباً' : 'Customer favourites') : undefined} url={shelf.category ? `/category/${shelf.category.slug}` : `/products?search=${encodeURIComponent(shelf.definition.search)}`} products={shelf.products} language={i18n.language}/>
        {index === 1 ? <CampaignRibbon compact/> : null}
      </div>)}
      <ShopByBrand brands={catalog.data?.brands}/>
    </div>
  </main>;
}

function CatalogShelf({ title, eyebrow, url, products, loading, featured }) {
  return <section className={`catalog-shelf${featured ? ' catalog-shelf--featured' : ''}`} aria-labelledby={`shelf-${title}`}>
    <header className="catalog-shelf__head"><div>{eyebrow ? <span>{eyebrow}</span> : null}<h2 id={`shelf-${title}`}>{title}</h2></div><Link to={url}>Shop all <ArrowUpRight aria-hidden="true"/></Link></header>
    {loading ? <ProductGridSkeleton count={6}/> : <ProductGrid products={products || []}/>} 
  </section>;
}
