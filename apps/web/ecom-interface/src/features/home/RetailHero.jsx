import { Link } from 'react-router-dom';
import { ArrowRight, BatteryCharging, Cable, Headphones, Laptop, Smartphone, Sparkles, Watch, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import heroPhone from '../../../assets/images/iphone-17-pro-max-hero.webp';
import silverPhone from '../../../assets/images/iphone-category.webp';
import samsungXiaomiHero from '../../../assets/images/samsung-xiaomi-hero.png';

const shortcuts = [
  ['Mobiles', 'هواتف', Smartphone, '/category/mobiles'],
  ['Apple', 'آبل', Sparkles, '/search?search=iphone'],
  ['Samsung', 'سامسونج', Zap, '/search?search=samsung'],
  ['Smart audio', 'صوتيات', Headphones, '/search?search=audio'],
  ['Smart watches', 'ساعات ذكية', Watch, '/search?search=watch'],
  ['Chargers', 'شواحن', BatteryCharging, '/search?search=charger'],
  ['Accessories', 'إكسسوارات', Cable, '/search?search=accessories'],
  ['Laptops', 'لابتوب', Laptop, '/search?search=laptop'],
];

export function RetailHero() {
  const { i18n } = useTranslation(); const ar = i18n.language === 'ar';
  return <section className="retail-hero" aria-labelledby="retail-hero-title"><div className="container retail-hero__inner">
    <nav className="shortcut-rail" aria-label={ar ? 'تسوق حسب القسم' : 'Shop by category'}>{shortcuts.map(([en, arabic, Icon, url]) => <Link className="shortcut-card" to={url} key={en}><span><Icon/></span><strong>{ar ? arabic : en}</strong></Link>)}</nav>
    <div className="retail-campaign-hero" id="retail-hero-title">
      <img src={samsungXiaomiHero} width="1824" height="864" fetchPriority="high" alt={ar ? 'أحدث هواتف سامسونج جالاكسي وسكوتر شاومي الكهربائي 6 لايت' : 'Latest Samsung Galaxy phones and Xiaomi Electric Scooter 6 Lite'}/>
      <Link className="retail-campaign-hero__hotspot retail-campaign-hero__hotspot--samsung" to="/products?brand=Samsung"><span>{ar ? 'تسوق سامسونج' : 'Shop Samsung'}</span></Link>
      <Link className="retail-campaign-hero__hotspot retail-campaign-hero__hotspot--xiaomi" to="/products?brand=Xiaomi"><span>{ar ? 'تسوق شاومي' : 'Shop Xiaomi'}</span></Link>
    </div>
  </div></section>;
}

export function CampaignRibbon({ compact = false }) {
  const { i18n } = useTranslation(); const ar = i18n.language === 'ar';
  if (compact) return <section className="campaign-ribbon campaign-ribbon--compact" aria-label={ar ? 'عروض مميزة' : 'Featured promotions'}>
    <Link className="campaign-card campaign-card--delivery" to="/products"><span>{ar ? 'توصيل أسرع' : 'Ready. Set. Delivered.'}</span><strong>{ar ? 'من المتجر لبابك' : 'Tech at your door.'}</strong><ArrowRight/></Link>
    <Link className="campaign-card campaign-card--dark" to="/products?sort=discount"><span>{ar ? 'خصم الأسبوع' : 'Drop of the week'}</span><strong>{ar ? 'أسعار تتحرك بسرعة' : 'Prices move fast.'}</strong><img src={heroPhone} alt=""/></Link>
  </section>;
  return <section className="campaign-ribbon" aria-label={ar ? 'حملات مميزة' : 'Featured campaigns'}>
    <Link className="campaign-card campaign-card--mint" to="/products?sort=discount"><Sparkles/><span>{ar ? 'وفر الآن' : 'Smart now'}</span><strong>{ar ? 'عروض صغيرة، فرق كبير.' : 'Small prices. Big upgrade.'}</strong></Link>
    <Link className="campaign-card campaign-card--photo" to="/category/mobiles"><div><span>Malek Selects</span><strong>{ar ? 'اختيارات تتحرك معك' : 'Made to move.'}</strong></div><img src={silverPhone} alt="Premium smartphone"/></Link>
    <Link className="campaign-card campaign-card--lavender" to="/products?sort=newest"><span>{ar ? 'وصل حديثاً' : 'New stock'}</span><strong>{ar ? 'جديد يستحق النظرة' : 'Worth a closer look.'}</strong><img src={heroPhone} alt="Latest smartphone"/></Link>
    <Link className="campaign-card campaign-card--coral" to="/search?search=gaming"><Zap/><span>{ar ? 'أداء أعلى' : 'Power play'}</span><strong>{ar ? 'جاهز للسرعة' : 'Built for speed.'}</strong></Link>
  </section>;
}
