const numericKeys = new Set([
  'costPrice', 'sellingPrice', 'taxRate', 'minStockLevel', 'reorderLevel', 'totalStock',
  'creditLimit', 'totalSales', 'totalPaid', 'balance', 'totalPurchases', 'rating',
  'subtotal', 'discountAmount', 'taxAmount', 'total', 'paidAmount', 'remainingAmount',
  'quantity', 'unitPrice', 'amount', 'value', 'probability',
]);

function camelKey(key: string) {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export function serializeDecimalRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [camelKey(key), value])) as T;
}

export function serializeDecimalRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => serializeDecimalRow<T>(row));
}

export function serializeRow<T = Record<string, unknown>>(row: Record<string, unknown>): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => {
    const camel = camelKey(key);
    return [camel, numericKeys.has(camel) && value !== null ? Number(value) : value];
  })) as T;
}

export function serializeRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => serializeRow<T>(row));
}
