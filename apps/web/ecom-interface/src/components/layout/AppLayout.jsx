import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, CreditCard, GitCompareArrows, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { getNavigation } from '@storefront/data-access';
import { useStore } from '../../app/StoreProvider';
import { CartDrawer } from '../storefront/CartDrawer';
import { SearchDialog } from '../storefront/SearchDialog';
import megaMenuImage from '../../../assets/images/iphone-category.webp';

const targetUrl = (item) => item.targetType === 'category' ? `/category/${item.targetValue}` : item.targetType === 'brand' ? `/brand/${encodeURIComponent(item.targetValue)}` : item.targetValue;

export function AppLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const closeTimer = useRef(null);
  const { cart, cartOpen, setCartOpen, wishlist, comparison } = useStore();
  const [navigation, setNavigation] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const controller = new window.AbortController();
    getNavigation(controller.signal).then((items) => {
      setNavigation(items);
      setActiveMenuId(items[0]?.id ?? null);
    }).catch(() => setNavigation([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const close = (event) => { if (!headerRef.current?.contains(event.target)) setMenuOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);

  const label = (item) => i18n.language === 'ar' ? item.labelAr || item.label : item.label;
  const activeMenu = navigation.find((item) => item.id === activeMenuId) || navigation[0];
  const activeChildren = activeMenu?.children || [];
  const splitAt = Math.max(1, Math.ceil(activeChildren.length / 2));
  const menuGroups = [activeChildren.slice(0, splitAt), activeChildren.slice(splitAt)].filter((group) => group.length);
  const openMenu = (id) => { window.clearTimeout(closeTimer.current); setActiveMenuId(id); setMenuOpen(true); };
  const scheduleClose = () => { closeTimer.current = window.setTimeout(() => setMenuOpen(false), 180); };

  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <FinancingBanner language={i18n.language}/>
    <header className="site-header" ref={headerRef} onMouseLeave={scheduleClose} onMouseEnter={() => window.clearTimeout(closeTimer.current)}>
      <div className="retail-header"><div className="container header-row">
        <Link className="logo" to="/" aria-label="Malek Stores home" translate="no"><span className="logo__mark"/><span className="logo__text">Malek Stores</span></Link>
        <button className="header-action menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close category menu' : 'Open category menu'} aria-expanded={menuOpen} aria-controls="mega-menu">{menuOpen ? <X/> : <Menu/>}</button>
        <button className="header-search" onClick={() => setSearchOpen(true)}><span>{t('searchPlaceholder')}</span><b>{t('search')}</b><i/></button>
        <div className="header-utilities">
          <button className="utility-link lang-switch" onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}>{i18n.language === 'ar' ? 'EN' : 'العربية'}</button>
          <NavLink className="utility-link utility-link--account" to="/account"><UserRound/><b>{t('account')}</b></NavLink>
          <NavLink className="utility-link utility-link--compare" to="/compare"><GitCompareArrows/><b>Compare</b>{comparison.length ? <span className="count-badge">{comparison.length}</span> : null}</NavLink>
          <NavLink className="utility-link" to="/account/wishlist"><span>♡</span><b>{t('wishlist')}</b><span className="count-badge">{wishlist.length}</span></NavLink>
          <button className="utility-link utility-link--cart" onClick={() => setCartOpen(true)}><ShoppingBag/><b>{t('cart')}</b><span className="count-badge">{cart?.itemCount || 0}</span></button>
        </div>
      </div></div>
      <div className="category-bar">
        <nav className="container category-nav" aria-label="Product categories">
          {navigation.slice(0, 8).map((item, index) => <NavLink className={({ isActive }) => `category-link${isActive || (menuOpen && item.id === activeMenu?.id) ? ' is-active' : ''}${index === navigation.length - 1 ? ' category-link--sale' : ''}`} to={targetUrl(item)} key={item.id} onMouseEnter={() => openMenu(item.id)} onFocus={() => openMenu(item.id)} onClick={() => setMenuOpen(false)} aria-haspopup="true" aria-expanded={menuOpen && item.id === activeMenu?.id}>{label(item)}{item.children?.length ? <ChevronDown aria-hidden="true"/> : null}</NavLink>)}
          <NavLink className="category-link category-link--sale" to="/products?sort=discount">Week Deals</NavLink>
        </nav>
      </div>
      <div id="mega-menu" className={`mega-menu${menuOpen ? ' is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="container mega-menu__inner">
          <div className="mega-menu__links">
            <section className="mega-col mega-col--primary">
              <Link to={activeMenu ? targetUrl(activeMenu) : '/products'} onClick={() => setMenuOpen(false)}><h3>{activeMenu ? label(activeMenu) : t('products')}</h3></Link>
              {(menuGroups[0]?.length ? menuGroups[0] : navigation.slice(0, 7)).map((item) => <Link to={targetUrl(item)} onClick={() => setMenuOpen(false)} key={item.id}>{label(item)}</Link>)}
            </section>
            <section className="mega-col">
              <h3>{i18n.language === 'ar' ? 'اكتشف المزيد' : 'More to explore'}</h3>
              {(menuGroups[1]?.length ? menuGroups[1] : navigation.filter((item) => item.id !== activeMenu?.id).slice(0, 6)).map((item) => <Link to={targetUrl(item)} onClick={() => setMenuOpen(false)} key={item.id}>{label(item)}</Link>)}
            </section>
          </div>
          <Link className="mega-feature" to={activeMenu ? targetUrl(activeMenu) : '/products'} onClick={() => setMenuOpen(false)}>
            <div className="mega-feature__copy"><span>Featured collection</span><strong>{activeMenu ? label(activeMenu) : 'New technology'}</strong><small>Explore the latest arrivals</small></div>
            <img src={megaMenuImage} alt="Latest smartphone collection"/>
          </Link>
        </div>
      </div>
    </header>
    <div id="main-content"><Outlet/></div>
    <footer className="site-footer"><div className="container"><div className="footer-grid"><div><Link className="logo" to="/"><span className="logo__mark"/><span>Malek Stores</span></Link><p>Premium electronics with clear pricing and dependable support.</p></div>{[['Shop', '/products'], ['Customer service', '/contact'], ['Privacy', '/privacy'], ['Terms', '/terms']].map(([title, url]) => <div className="footer-col" key={title}><h3>{title}</h3><Link to={url}>{title}</Link></div>)}</div><div className="footer-bottom"><span>© 2026 Malek Stores</span><span>EGP · Egypt</span></div></div></footer>
    <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={(url) => { setSearchOpen(false); navigate(url); }}/><CartDrawer open={cartOpen} onClose={() => setCartOpen(false)}/>
    <nav className="mobile-nav"><NavLink to="/"><strong>⌂</strong><span>{t('home')}</span></NavLink><NavLink to="/products"><strong>◇</strong><span>{t('products')}</span></NavLink><button onClick={() => setSearchOpen(true)}><Search/><span>{t('search')}</span></button><NavLink to="/account/wishlist"><strong>♡</strong><span>{t('wishlist')}</span></NavLink><NavLink to="/account"><UserRound/><span>{t('account')}</span></NavLink></nav>
  </>;
}

function FinancingBanner({ language }) {
  const ar = language === 'ar';
  return <Link className="finance-banner" to="/products" aria-label={ar ? 'خصم 3% عند الدفع من خلال الفرع' : '3% discount when paying in store'}>
    <div className="container finance-banner__inner">
      <div className="finance-banner__provider"><span><CreditCard aria-hidden="true"/></span><p><strong>{ar ? 'دفع مرن' : 'Flexible payment'}</strong><small>{ar ? 'على منتجات مختارة' : 'On selected products'}</small></p></div>
      <div className="finance-banner__message"><strong><b>3%</b> {ar ? 'خصم عند الدفع من خلال الفرع' : 'discount when paying in store'}</strong></div>
      <div className="finance-banner__zeros" aria-label={ar ? 'بدون فوائد أو مصاريف إدارية أو مقدم' : 'Zero interest, fees, or down payment'}>
        <span><b>0</b><small>{ar ? 'فوائد' : 'interest'}</small></span><span><b>0</b><small>{ar ? 'مصاريف' : 'fees'}</small></span><span><b>0</b><small>{ar ? 'مقدم' : 'down payment'}</small></span>
      </div>
      <small className="finance-banner__terms">{ar ? '* تطبق الشروط والأحكام' : '* Terms and conditions apply'}</small>
    </div>
  </Link>;
}
