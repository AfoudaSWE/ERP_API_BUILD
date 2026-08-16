import { delay, generateHourlyData, STORE_MULTIPLIERS, seededRandom, randomInRange } from './helpers';
import { ZONES, CATEGORIES } from '../../constants';

export async function getDashboardMetrics(storeId = 'cfc') {
  await delay(400);
  const m = STORE_MULTIPLIERS[storeId] || STORE_MULTIPLIERS.cfc;
  const rng = seededRandom(storeId.charCodeAt(0) * 100 + new Date().getDate());

  const visitorsToday = Math.round(847 * m.traffic + rng() * 50);
  const entries = visitorsToday;
  const exits = Math.round(visitorsToday * 0.88 + rng() * 10);
  const customersInside = entries - exits;
  const transactions = Math.round(visitorsToday * 0.32 * m.conversion);
  const netSales = Math.round(transactions * 2850 * m.sales);
  const conversionRate = transactions / visitorsToday * 100;
  const avgBasket = netSales / Math.max(transactions, 1);
  const avgQueueWait = Math.round(180 + rng() * 120);
  const inventoryAlerts = randomInRange(3, 12, rng);

  return {
    customersInside: { value: customersInside, change: Math.round((rng() - 0.4) * 20), sparkline: generateHourlyData(30, 15, 12, storeId.charCodeAt(0)).map(d => d.value) },
    visitorsToday: { value: visitorsToday, change: Math.round((rng() - 0.3) * 15), sparkline: generateHourlyData(60, 20, 12, storeId.charCodeAt(0) + 1).map(d => d.value) },
    entriesExits: { entries, exits, change: Math.round((rng() - 0.4) * 10) },
    netSales: { value: netSales, change: Math.round((rng() - 0.3) * 12), sparkline: generateHourlyData(80000, 30000, 12, storeId.charCodeAt(0) + 2).map(d => d.value) },
    conversionRate: { value: conversionRate, change: parseFloat(((rng() - 0.4) * 5).toFixed(1)) },
    avgBasket: { value: avgBasket, change: Math.round((rng() - 0.4) * 8) },
    avgQueueWait: { value: avgQueueWait, change: Math.round((rng() - 0.5) * 30) },
    inventoryAlerts: { value: inventoryAlerts, change: Math.round((rng() - 0.5) * 4) },
  };
}

export async function getDashboardCharts(storeId = 'cfc') {
  await delay(300);
  const m = STORE_MULTIPLIERS[storeId] || STORE_MULTIPLIERS.cfc;
  const seed = storeId.charCodeAt(0) * 10;

  const footfallVsSales = generateHourlyData(60, 20, 24, seed).map((d, i) => ({
    hour: `${String(d.hour).padStart(2,'0')}:00`,
    visitors: Math.round(d.value * m.traffic),
    sales: Math.round(d.value * 2400 * m.sales),
  }));

  const occupancyTrend = generateHourlyData(35, 15, 24, seed + 1).map(d => ({
    hour: `${String(d.hour).padStart(2,'0')}:00`,
    occupancy: Math.round(d.value * m.traffic),
    capacity: 120,
  }));

  const conversionFunnel = [
    { stage: 'Store Visitors', value: Math.round(847 * m.traffic) },
    { stage: 'Zone Engaged', value: Math.round(680 * m.traffic) },
    { stage: 'Product Interaction', value: Math.round(420 * m.traffic) },
    { stage: 'Added to Basket', value: Math.round(310 * m.traffic) },
    { stage: 'Purchased', value: Math.round(271 * m.traffic * m.conversion) },
  ];

  const rng = seededRandom(seed + 5);
  const zonePerformance = ZONES.filter(z => !['entrance','exit','storage'].includes(z.id)).map(z => ({
    zone: z.name,
    visitors: randomInRange(40, 200, rng),
    avgDwell: randomInRange(120, 600, rng),
    conversion: parseFloat((rng() * 30 + 10).toFixed(1)),
    sales: randomInRange(15000, 180000, rng),
    color: z.color,
  }));

  const revenueByCategory = CATEGORIES.map((cat, i) => ({
    category: cat,
    revenue: randomInRange(20000, 250000, rng),
    transactions: randomInRange(5, 60, rng),
  }));

  const queueWaitTrend = generateHourlyData(180, 90, 24, seed + 3).map(d => ({
    hour: `${String(d.hour).padStart(2,'0')}:00`,
    avgWait: Math.max(30, d.value),
    p95Wait: Math.max(60, Math.round(d.value * 1.8)),
  }));

  return { footfallVsSales, occupancyTrend, conversionFunnel, zonePerformance, revenueByCategory, queueWaitTrend };
}

export async function getAIInsights(storeId = 'cfc') {
  await delay(500);
  return [
    { id: 1, type: 'action', priority: 'high', icon: 'alert-triangle', message: 'Queue wait time exceeding 5 min threshold. Consider opening POS-04.', category: 'Queue Management' },
    { id: 2, type: 'opportunity', priority: 'medium', icon: 'trending-up', message: 'iPhone 15 Pro Max showing high engagement (82 interactions) but low conversion (12%). Review pricing or shelf placement.', category: 'Sales Optimization' },
    { id: 3, type: 'action', priority: 'high', icon: 'package', message: 'AirPods Pro 2nd Gen stock critically low (3 units). High demand expected — trigger replenishment.', category: 'Inventory' },
    { id: 4, type: 'insight', priority: 'medium', icon: 'users', message: 'Mobile Zone traffic 28% above average. Consider adding staff coverage.', category: 'Operations' },
    { id: 5, type: 'action', priority: 'low', icon: 'arrow-right-left', message: 'Mansoura Branch has excess Samsung Galaxy S24 Ultra stock. Consider transfer to Cairo Festival City.', category: 'Inventory Transfer' },
    { id: 6, type: 'insight', priority: 'medium', icon: 'clock', message: 'Peak traffic expected between 17:00-20:00 based on historical patterns. Pre-position staff.', category: 'Staffing' },
  ];
}
