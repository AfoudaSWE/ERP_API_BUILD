export const COMPARISON_KEY = 'malek_compare_v1';
export const MAX_COMPARISON_ITEMS = 4;

export function readComparison(storage = window.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(COMPARISON_KEY) || '[]');
    return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === 'string' && item))].slice(0, MAX_COMPARISON_ITEMS) : [];
  } catch { return []; }
}

export function writeComparison(slugs, storage = window.localStorage) {
  const next = [...new Set(slugs)].slice(0, MAX_COMPARISON_ITEMS);
  storage.setItem(COMPARISON_KEY, JSON.stringify(next));
  return next;
}

export function toggleComparison(slugs, slug) {
  return slugs.includes(slug) ? slugs.filter((item) => item !== slug) : [...slugs, slug].slice(-MAX_COMPARISON_ITEMS);
}
