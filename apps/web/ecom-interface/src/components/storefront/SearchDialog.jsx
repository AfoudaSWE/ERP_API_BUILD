import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSearchSuggestions } from '@storefront/data-access';
import { formatMoney, localized } from './ProductCard';

const recentKey = 'malek_recent_searches';
export function SearchDialog({ open, onClose, onSelect }) {
  const { t, i18n } = useTranslation(); const [query, setQuery] = useState(''); const [data, setData] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(false); const input = useRef(null);
  const [recent, setRecent] = useState(() => { try { return JSON.parse(localStorage.getItem(recentKey) || '[]'); } catch { return []; } });
  useEffect(() => { if (!open) return; input.current?.focus(); const onKey = (event) => event.key === 'Escape' && onClose(); document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey); }, [open, onClose]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query.trim().length < 2) { setData(null); setError(false); return; }
    const controller = new window.AbortController(); const timer = window.setTimeout(() => { setLoading(true); getSearchSuggestions(query.trim(), controller.signal).then(setData).catch((err) => { if (err.name !== 'AbortError') setError(true); }).finally(() => setLoading(false)); }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  const submit = (value = query) => { const clean = value.trim(); if (!clean) return; const next = [clean, ...recent.filter((item) => item !== clean)].slice(0, 5); setRecent(next); localStorage.setItem(recentKey, JSON.stringify(next)); onSelect(`/search?search=${encodeURIComponent(clean)}`); };
  if (!open) return null;
  return <div className="search-overlay is-open" role="dialog" aria-modal="true" aria-labelledby="search-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="search-panel">
    <form className="search-top" onSubmit={(event) => { event.preventDefault(); submit(); }}><div className="search-input-wrap">⌕ <input ref={input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} aria-controls="search-results"/>{query ? <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">×</button> : null}</div><button className="icon-btn" type="button" onClick={onClose}>×</button></form>
    <div className="search-content"><aside><h3>Recent searches</h3><div className="search-tags">{recent.map((item) => <button className="search-tag" onClick={() => submit(item)} key={item}>{item}</button>)}</div></aside><section><h3 id="search-title">Suggestions</h3><div id="search-results" className="search-results" aria-live="polite">{loading ? <p>{t('loading')}…</p> : error ? <p>{t('apiError')}</p> : data?.products.length ? data.products.map((product) => <button className="search-result" onClick={() => onSelect(`/product/${product.slug}`)} key={product.id}>{product.primaryImage ? <img className="search-result__thumb" src={product.primaryImage.thumbnailUrl || product.primaryImage.url} alt=""/> : <span className="search-result__thumb"/>}<span><strong>{localized(product.name, product.nameAr, i18n.language)}</strong><br/><small>{formatMoney(product.price, product.currency, i18n.language)}</small></span></button>) : query.length >= 2 ? <p>No matching products found.</p> : <p>Type at least two characters.</p>}</div></section></div>
  </div></div>;
}
