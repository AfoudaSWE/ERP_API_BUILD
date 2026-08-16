import { delay, STORE_MULTIPLIERS, seededRandom, randomInRange, generateHourlyData } from './helpers';
import { CASHIERS } from '../../constants';

export async function getQueueMetrics(storeId = 'cfc') {
  await delay(300);
  const m = STORE_MULTIPLIERS[storeId] || STORE_MULTIPLIERS.cfc;
  const rng = seededRandom(storeId.charCodeAt(0) * 70 + new Date().getDate());

  const terminals = CASHIERS.map((cashier, i) => {
    const statuses = ['open', 'open', 'open', 'idle'];
    const status = statuses[i] || 'open';
    const queueLength = status === 'open' ? randomInRange(0, 6, rng) : 0;
    const txPerHour = status === 'open' ? randomInRange(8, 22, rng) : 0;
    const avgServiceTime = randomInRange(90, 240, rng);
    const salesValue = Math.round(txPerHour * 2800 * m.sales);

    return {
      id: `pos-0${i + 1}`,
      name: `POS-0${i + 1}`,
      status,
      cashier: cashier.name,
      queueLength,
      currentServiceDuration: status === 'open' ? randomInRange(10, avgServiceTime, rng) : 0,
      avgServiceTime,
      transactionsPerHour: txPerHour,
      salesValue,
      lastPaymentTime: new Date(Date.now() - randomInRange(60, 600, rng) * 1000).toISOString(),
      timeSinceLastTx: randomInRange(30, 300, rng),
    };
  });

  const totalWaiting = terminals.reduce((s, t) => s + t.queueLength, 0);
  const avgWait = Math.round(180 + rng() * 120);
  const p95Wait = Math.round(avgWait * 1.8);
  const avgService = Math.round(terminals.reduce((s, t) => s + t.avgServiceTime, 0) / terminals.length);
  const servedPerHour = terminals.reduce((s, t) => s + t.transactionsPerHour, 0);
  const openCounters = terminals.filter(t => t.status === 'open').length;

  return {
    kpis: {
      currentlyWaiting: totalWaiting,
      avgWaitTime: avgWait,
      p95WaitTime: p95Wait,
      avgServiceTime: avgService,
      paymentGap: randomInRange(120, 360, rng),
      abandonmentRate: parseFloat((rng() * 5 + 1).toFixed(1)),
      servedPerHour,
      openCounters,
      totalCounters: 4,
    },
    terminals,
    queueOverTime: generateHourlyData(8, 5, 24, storeId.charCodeAt(0) * 80).map((d, i) => ({
      hour: `${String(i).padStart(2,'0')}:00`,
      queueLength: Math.max(0, d.value),
      waitTime: Math.max(30, d.value * 25),
    })),
    waitByHour: generateHourlyData(180, 90, 24, storeId.charCodeAt(0) * 81).map((d, i) => ({
      hour: `${String(i).padStart(2,'0')}:00`,
      avgWait: Math.max(30, d.value),
      p95Wait: Math.max(60, Math.round(d.value * 1.8)),
    })),
    cashierThroughput: CASHIERS.map((c, i) => ({
      cashier: c.name,
      transactions: randomInRange(30, 85, rng),
      avgTime: randomInRange(90, 210, rng),
      satisfaction: parseFloat((3.5 + rng() * 1.5).toFixed(1)),
    })),
    recommendations: [
      { id: 1, priority: 'high', message: 'POS-04 idle — consider opening to reduce queue wait below 3 min target.', action: 'Open Counter' },
      { id: 2, priority: 'medium', message: 'POS-02 service time 15% above average. Review scanning efficiency.', action: 'Investigate' },
      { id: 3, priority: 'low', message: 'Off-peak hours (14:00-16:00): safe to close one counter for break rotation.', action: 'Schedule' },
    ],
  };
}
