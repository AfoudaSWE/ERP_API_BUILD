import { describe, expect, it } from 'vitest';
import { parseCatalogQuery, updateCatalogSearch } from './catalogQuery';

describe('catalog URL state', () => {
  it('parses persisted filters and route filters', () => {
    const query = parseCatalogQuery(new globalThis.URLSearchParams('brand=Apple&minPrice=1000&sort=price-asc&page=2'), { category: 'mobiles' });
    expect(query).toMatchObject({ brand: 'Apple', category: 'mobiles', minPrice: 1000, sort: 'price-asc', page: 2 });
  });
  it('resets pagination when a filter changes', () => {
    expect(updateCatalogSearch(new globalThis.URLSearchParams('page=4&brand=Apple'), 'brand', 'Samsung').toString()).toBe('brand=Samsung');
  });
  it('drops invalid negative price values', () => {
    expect(parseCatalogQuery(new globalThis.URLSearchParams('minPrice=-10')).minPrice).toBeUndefined();
  });
});
