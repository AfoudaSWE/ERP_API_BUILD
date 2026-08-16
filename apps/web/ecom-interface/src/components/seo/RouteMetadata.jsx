import { useEffect } from 'react';

function upsertMeta(selector, attributes) {
  let node = document.head.querySelector(selector);
  if (!node) { node = document.createElement('meta'); document.head.append(node); }
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
}

export function RouteMetadata({ title, description, canonicalPath, structuredData }) {
  useEffect(() => {
    if (title) document.title = title;
    if (description) { upsertMeta('meta[name="description"]', { name: 'description', content: description }); upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description }); }
    if (title) upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = new window.URL(canonicalPath || window.location.pathname, window.location.origin).href;
    let script = document.head.querySelector('script[data-storefront-schema]');
    if (structuredData) { if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.storefrontSchema = ''; document.head.append(script); } script.textContent = JSON.stringify(structuredData); }
    else script?.remove();
    return () => script?.remove();
  }, [canonicalPath, description, structuredData, title]);
  return null;
}
