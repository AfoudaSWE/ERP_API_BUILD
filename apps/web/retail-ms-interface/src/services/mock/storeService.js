import { delay, STORE_MULTIPLIERS, seededRandom, randomInRange } from './helpers';

const STORE_DETAILS = {
  cfc: { name: 'Cairo Festival City', city: 'Cairo', area: 'New Cairo', size: 450, floors: 1, openSince: '2019-03-15' },
  cs: { name: 'City Stars', city: 'Cairo', area: 'Heliopolis', size: 380, floors: 1, openSince: '2018-06-01' },
  moe: { name: 'Mall of Egypt', city: 'Giza', area: '6th of October', size: 520, floors: 2, openSince: '2020-01-20' },
  acc: { name: 'Alexandria City Centre', city: 'Alexandria', area: 'Smouha', size: 320, floors: 1, openSince: '2021-09-10' },
  man: { name: 'Mansoura Branch', city: 'Mansoura', area: 'Downtown', size: 250, floors: 1, openSince: '2022-04-01' },
};

export async function getStores() {
  await delay(300);
  const rng = seededRandom(new Date().getDate() * 200);

  return Object.entries(STORE_DETAILS).map(([id, detail]) => {
    const m = STORE_MULTIPLIERS[id];
    const visitors = Math.round(847 * m.traffic + rng() * 50);
    const transactions = Math.round(visitors * 0.32 * m.conversion);
    const netSales = Math.round(transactions * 2850 * m.sales);
    const customersInside = Math.round(visitors * 0.12 + rng() * 10);
    const avgQueueTime = randomInRange(120, 360, rng);
    const lowStockAlerts = randomInRange(2, 10, rng);
    const deviceHealth = parseFloat((92 + rng() * 7).toFixed(0));
    const conversionRate = parseFloat((transactions / Math.max(visitors, 1) * 100).toFixed(1));
    const performanceScore = Math.min(100, Math.round(
      conversionRate * 1.5 + (100 - avgQueueTime / 4) * 0.3 + deviceHealth * 0.2
    ));

    return {
      id,
      ...detail,
      status: id === 'man' && rng() > 0.8 ? 'maintenance' : 'live',
      customersInside,
      visitorsToday: visitors,
      netSales,
      conversionRate,
      avgQueueTime,
      lowStockAlerts,
      deviceHealth,
      performanceScore,
      transactions,
      staffOnDuty: randomInRange(10, 22, rng),
      cameras: randomInRange(8, 16, rng),
      sensors: randomInRange(12, 24, rng),
    };
  }).sort((a, b) => b.performanceScore - a.performanceScore);
}
