export function parseCatalogQuery(searchParams, routeParams = {}) {
  return {
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    pageSize: 12,
    search: searchParams.get('search') || undefined,
    category: routeParams.category || searchParams.get('category') || undefined,
    brand: routeParams.brand || searchParams.get('brand') || undefined,
    minPrice: numberOrUndefined(searchParams.get('minPrice')),
    maxPrice: numberOrUndefined(searchParams.get('maxPrice')),
    availability: searchParams.get('availability') || undefined,
    sort: searchParams.get('sort') || 'relevance',
  };
}

function numberOrUndefined(value) { if (value === null || value === '') return undefined; const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : undefined; }

export function updateCatalogSearch(searchParams, key, value) {
  const next = new globalThis.URLSearchParams(searchParams);
  if (value !== undefined && value !== null && value !== '') next.set(key, String(value)); else next.delete(key);
  if (key !== 'page') next.delete('page');
  return next;
}
