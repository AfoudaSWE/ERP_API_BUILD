import { delay, seededRandom, randomInRange } from './helpers';
import { PRODUCTS } from '../../data/products';
import { CATEGORIES, STOCK_STATUSES } from '../../constants';

function getStockStatus(available, reorderPoint) {
  if (available <= 0) return 'out_of_stock';
  if (available <= reorderPoint * 0.3) return 'critical';
  if (available <= reorderPoint) return 'low_stock';
  if (available > reorderPoint * 5) return 'overstock';
  return 'healthy';
}

export async function getInventory(storeId = 'cfc') {
  await delay(400);
  const rng = seededRandom(storeId.charCodeAt(0) * 110 + new Date().getDate());

  const inventory = PRODUCTS.map(p => {
    const onHand = randomInRange(0, 80, rng);
    const reserved = randomInRange(0, Math.min(5, onHand), rng);
    const damaged = rng() > 0.9 ? randomInRange(1, 3, rng) : 0;
    const available = Math.max(0, onHand - reserved - damaged);
    const reorderPoint = randomInRange(5, 20, rng);
    const avgDailySales = parseFloat((rng() * 4 + 0.5).toFixed(1));
    const daysOfCover = avgDailySales > 0 ? Math.round(available / avgDailySales) : null;
    const status = getStockStatus(available, reorderPoint);

    let suggestedAction = 'Monitor';
    if (status === 'out_of_stock') suggestedAction = 'Urgent Reorder';
    else if (status === 'critical') suggestedAction = 'Reorder Now';
    else if (status === 'low_stock') suggestedAction = 'Plan Reorder';
    else if (status === 'overstock') suggestedAction = 'Reduce Orders';

    return {
      ...p,
      onHand, reserved, damaged, available,
      reorderPoint, avgDailySales, daysOfCover,
      status, suggestedAction,
      stockValue: onHand * p.cost,
      salesVelocity: avgDailySales > 2 ? 'High' : avgDailySales > 0.8 ? 'Medium' : 'Low',
    };
  });

  const totalStockValue = inventory.reduce((s, p) => s + p.stockValue, 0);
  const totalProducts = inventory.length;
  const lowStock = inventory.filter(p => p.status === 'low_stock').length;
  const outOfStock = inventory.filter(p => p.status === 'out_of_stock').length;
  const critical = inventory.filter(p => p.status === 'critical').length;
  const overstock = inventory.filter(p => p.status === 'overstock').length;
  const healthy = inventory.filter(p => p.status === 'healthy').length;
  const stockAccuracy = parseFloat((95 + rng() * 4.5).toFixed(1));
  const turnover = parseFloat((4.2 + rng() * 3).toFixed(1));
  const pendingTransfers = randomInRange(2, 8, rng);

  const healthDistribution = [
    { status: 'Healthy', count: healthy, color: '#10b981' },
    { status: 'Low Stock', count: lowStock, color: '#f59e0b' },
    { status: 'Critical', count: critical, color: '#ef4444' },
    { status: 'Out of Stock', count: outOfStock, color: '#991b1b' },
    { status: 'Overstock', count: overstock, color: '#6366f1' },
  ];

  const stockByCategory = CATEGORIES.map(cat => {
    const catItems = inventory.filter(p => p.category === cat);
    return {
      category: cat,
      totalItems: catItems.length,
      totalValue: catItems.reduce((s, p) => s + p.stockValue, 0),
      lowStock: catItems.filter(p => ['low_stock','critical','out_of_stock'].includes(p.status)).length,
    };
  });

  const recentMovements = Array.from({ length: 20 }, (_, i) => {
    const product = PRODUCTS[randomInRange(0, PRODUCTS.length - 1, rng)];
    const types = ['received', 'sold', 'transferred', 'adjusted', 'returned'];
    const type = types[randomInRange(0, types.length - 1, rng)];
    return {
      id: `MOV-${1000 + i}`,
      product: product.name,
      sku: product.sku,
      type,
      quantity: randomInRange(1, 20, rng) * (type === 'sold' ? -1 : 1),
      date: new Date(Date.now() - randomInRange(0, 72, rng) * 3600000).toISOString(),
      reference: `REF-${randomInRange(5000, 9999, rng)}`,
    };
  });

  return {
    kpis: {
      totalStockValue, totalProducts, lowStock, outOfStock,
      critical, overstock, stockAccuracy, turnover, pendingTransfers,
    },
    inventory,
    healthDistribution,
    stockByCategory,
    recentMovements,
  };
}
