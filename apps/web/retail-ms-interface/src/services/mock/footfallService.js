import { delay, generateHourlyData, generateDailyData, STORE_MULTIPLIERS, seededRandom, randomInRange } from './helpers';

export async function getFootfallAnalytics(storeId = 'cfc') {
  await delay(350);
  const m = STORE_MULTIPLIERS[storeId] || STORE_MULTIPLIERS.cfc;
  const rng = seededRandom(storeId.charCodeAt(0) * 50 + new Date().getDate());

  const visitorsToday = Math.round(847 * m.traffic + rng() * 50);
  const entries = visitorsToday;
  const exits = Math.round(visitorsToday * 0.88);
  const currentOccupancy = entries - exits;
  const peakHour = '18:00';
  const avgVisitDuration = randomInRange(720, 1440, rng);
  const returningVisitors = Math.round(visitorsToday * 0.22);
  const staffCount = randomInRange(12, 20, rng);
  const customerStaffRatio = parseFloat((currentOccupancy / staffCount).toFixed(1));
  const yesterdayVisitors = Math.round(visitorsToday * (0.9 + rng() * 0.2));
  const footfallChange = parseFloat(((visitorsToday - yesterdayVisitors) / yesterdayVisitors * 100).toFixed(1));

  return {
    kpis: {
      visitorsToday, entries, exits, currentOccupancy,
      peakHour, avgVisitDuration, returningVisitors,
      customerStaffRatio, footfallChange, capacity: 120, staffCount,
    },
    entriesExitsByHour: generateHourlyData(60, 25, 24, storeId.charCodeAt(0) * 10).map((d, i) => {
      const entryVal = Math.round(d.value * m.traffic);
      return {
        hour: `${String(i).padStart(2,'0')}:00`,
        entries: entryVal,
        exits: Math.round(entryVal * (0.7 + rng() * 0.3)),
      };
    }),
    dailyTraffic: generateDailyData(800, 200, 30, storeId.charCodeAt(0) * 20).map(d => ({
      ...d,
      visitors: Math.round(d.value * m.traffic),
    })),
    trafficByWeekday: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, i) => ({
      day,
      visitors: randomInRange(500, 1200, rng),
      avgDwell: randomInRange(600, 1500, rng),
    })),
    occupancyHeatmap: Array.from({length: 7}, (_, dayIdx) =>
      Array.from({length: 14}, (_, hourIdx) => ({
        day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayIdx],
        hour: hourIdx + 8,
        value: randomInRange(5, 100, rng),
      }))
    ).flat(),
    visitDurationDist: [
      { range: '< 5 min', count: randomInRange(50, 120, rng) },
      { range: '5-15 min', count: randomInRange(100, 250, rng) },
      { range: '15-30 min', count: randomInRange(150, 300, rng) },
      { range: '30-60 min', count: randomInRange(100, 200, rng) },
      { range: '> 60 min', count: randomInRange(30, 80, rng) },
    ],
  };
}
