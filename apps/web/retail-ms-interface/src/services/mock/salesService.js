import { delay, STORE_MULTIPLIERS, seededRandom, randomInRange, generateHourlyData } from './helpers';
import { PRODUCTS } from '../../data/products';
import { CATEGORIES, CASHIERS, PAYMENT_METHODS } from '../../constants';

export async function getSalesAnalytics(storeId = 'cfc') {
  await delay(350);
  const m = STORE_MULTIPLIERS[storeId] || STORE_MULTIPLIERS.cfc;
  const rng = seededRandom(storeId.charCodeAt(0) * 90 + new Date().getDate());

  const transactions = Math.round(271 * m.traffic * m.conversion);
  const grossSales = Math.round(transactions * 3100 * m.sales);
  const returns = Math.round(transactions * 0.03);
  const netSales = Math.round(grossSales * 0.97);
  const visitors = Math.round(847 * m.traffic);
  const itemsSold = Math.round(transactions * 1.8);
  const avgBasket = Math.round(netSales / Math.max(transactions, 1));
  const itemsPerBasket = parseFloat((itemsSold / Math.max(transactions, 1)).toFixed(1));
  const revenuePerVisitor = Math.round(netSales / Math.max(visitors, 1));
  const conversionRate = parseFloat((transactions / Math.max(visitors, 1) * 100).toFixed(1));
  const returnRate = parseFloat((returns / Math.max(transactions, 1) * 100).toFixed(1));
  const grossMargin = parseFloat(((grossSales - grossSales * 0.65) / grossSales * 100).toFixed(1));

  const salesByHour = generateHourlyData(30000, 15000, 24, storeId.charCodeAt(0) * 91).map((d, i) => ({
    hour: `${String(i).padStart(2,'0')}:00`,
    sales: Math.round(d.value * m.sales),
    visitors: Math.round(d.value / 500 * m.traffic),
    transactions: Math.round(d.value / 500 * m.traffic * m.conversion * 0.32),
  }));

  const revenueByCategory = CATEGORIES.map(cat => ({
    category: cat,
    revenue: randomInRange(15000, 280000, rng),
    transactions: randomInRange(5, 55, rng),
    margin: parseFloat((25 + rng() * 20).toFixed(1)),
  })).sort((a, b) => b.revenue - a.revenue);

  const paymentMethods = PAYMENT_METHODS.map(method => ({
    method,
    count: randomInRange(15, 100, rng),
    value: randomInRange(40000, 250000, rng),
  }));

  const topProducts = [...PRODUCTS]
    .sort(() => rng() - 0.5)
    .slice(0, 10)
    .map(p => ({
      ...p,
      unitsSold: randomInRange(3, 25, rng),
      revenue: randomInRange(5000, 200000, rng),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const cashierLeaderboard = CASHIERS.map(c => ({
    name: c.name,
    posId: c.posId,
    transactions: randomInRange(25, 75, rng),
    revenue: randomInRange(60000, 250000, rng),
    avgServiceTime: randomInRange(90, 210, rng),
    avgBasket: randomInRange(1800, 4500, rng),
  })).sort((a, b) => b.revenue - a.revenue);

  const recentTransactions = Array.from({ length: 50 }, (_, i) => {
    const product = PRODUCTS[randomInRange(0, PRODUCTS.length - 1, rng)];
    const items = randomInRange(1, 4, rng);
    const total = product.price * items;
    const cashier = CASHIERS[randomInRange(0, CASHIERS.length - 1, rng)];
    const minutesAgo = i * randomInRange(3, 12, rng);
    return {
      id: `TXN-${String(10000 + i).slice(1)}`,
      store: storeId,
      pos: cashier.posId.toUpperCase(),
      cashier: cashier.name,
      time: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      items,
      total,
      paymentMethod: PAYMENT_METHODS[randomInRange(0, PAYMENT_METHODS.length - 1, rng)],
      status: rng() > 0.05 ? 'completed' : 'refunded',
    };
  });

  const conversionFunnel = [
    { stage: 'Store Visitors', value: visitors, rate: 100 },
    { stage: 'Zone Engaged', value: Math.round(visitors * 0.8), rate: 80 },
    { stage: 'Product Interaction', value: Math.round(visitors * 0.5), rate: 50 },
    { stage: 'Added to Basket', value: Math.round(visitors * 0.37), rate: 37 },
    { stage: 'Purchased', value: transactions, rate: conversionRate },
  ];

  return {
    kpis: {
      grossSales, netSales, transactions, avgBasket,
      itemsPerBasket, revenuePerVisitor, conversionRate,
      returnRate, grossMargin, returns, itemsSold, visitors,
    },
    salesByHour, revenueByCategory, paymentMethods,
    topProducts, cashierLeaderboard, recentTransactions, conversionFunnel,
  };
}
