import { describe, expect, it } from 'vitest';
import { MAX_COMPARISON_ITEMS, readComparison, toggleComparison, writeComparison } from './comparisonStore';

const storage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

describe('comparison persistence', () => {
  it('deduplicates and bounds saved products', () => { const target = storage(); writeComparison(['a','b','a','c','d','e'], target); expect(readComparison(target)).toEqual(['a','b','c','d']); expect(readComparison(target)).toHaveLength(MAX_COMPARISON_ITEMS); });
  it('toggles products without mutating input', () => { const current = ['a','b']; expect(toggleComparison(current,'a')).toEqual(['b']); expect(toggleComparison(current,'c')).toEqual(['a','b','c']); expect(current).toEqual(['a','b']); });
  it('recovers from invalid storage', () => { expect(readComparison({ getItem: () => '{bad' })).toEqual([]); });
});
