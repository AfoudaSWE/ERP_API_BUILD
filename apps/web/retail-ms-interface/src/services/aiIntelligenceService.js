import { getDashboardMetrics, getDashboardCharts, getAIInsights } from './mock/dashboardService';
import { getQueueMetrics } from './mock/queueService';
import { getInventory } from './mock/inventoryService';

const STORE_NAMES = {
  cfc: 'Cairo Festival City',
  cs: 'City Stars',
  moe: 'Mall of Egypt',
  acc: 'Alexandria City Centre',
  man: 'Mansoura Branch',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export async function getAIWorkspace(storeId = 'cfc') {
  const [metrics, charts, queue, inventory, existingInsights, ...benchmarks] = await Promise.all([
    getDashboardMetrics(storeId),
    getDashboardCharts(storeId),
    getQueueMetrics(storeId),
    getInventory(storeId),
    getAIInsights(storeId),
    ...Object.keys(STORE_NAMES).map(async id => ({ id, metrics: await getDashboardMetrics(id) })),
  ]);

  const peakHours = [...charts.footfallVsSales].sort((a, b) => b.visitors - a.visitors).slice(0, 3);
  const lastHours = charts.footfallVsSales.slice(-6);
  const forecast = Array.from({ length: 8 }, (_, index) => {
    const source = lastHours[index % lastHours.length];
    const hour = (new Date().getHours() + index + 1) % 24;
    const demandCurve = 0.9 + Math.sin(((hour - 10) / 12) * Math.PI) * 0.28;
    const visitors = Math.round(clamp(source.visitors * demandCurve, 8, 140));
    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      visitors,
      lower: Math.round(visitors * 0.84),
      upper: Math.round(visitors * 1.18),
      queueRisk: visitors > 68 ? 'High' : visitors > 48 ? 'Medium' : 'Low',
    };
  });

  const rankedStores = benchmarks
    .map(({ id, metrics: item }) => ({
      id,
      name: STORE_NAMES[id],
      score: Math.round(item.conversionRate.value * 2 + item.netSales.change + 45),
      conversion: item.conversionRate.value,
      sales: item.netSales.value,
    }))
    .sort((a, b) => b.score - a.score);
  const currentRank = rankedStores.findIndex(store => store.id === storeId) + 1;
  const criticalStock = inventory.inventory.filter(item => ['critical', 'out_of_stock'].includes(item.status));
  const highVelocityLowCover = inventory.inventory
    .filter(item => item.salesVelocity === 'High' && (item.daysOfCover ?? 99) < 7)
    .sort((a, b) => (a.daysOfCover ?? 99) - (b.daysOfCover ?? 99));
  const topZone = [...charts.zonePerformance].sort((a, b) => b.conversion - a.conversion)[0];
  const weakZone = [...charts.zonePerformance].sort((a, b) => a.conversion - b.conversion)[0];
  const nextPeak = forecast.reduce((best, item) => item.visitors > best.visitors ? item : best, forecast[0]);
  const queueRisk = queue.kpis.avgWaitTime > 240 || nextPeak.visitors > 70 ? 'High' : queue.kpis.avgWaitTime > 160 ? 'Medium' : 'Low';
  const anomalyCount = existingInsights.filter(item => item.priority === 'high').length + criticalStock.length;
  const estimatedEnergySaving = clamp(Math.round((100 - metrics.customersInside.value / 1.2) * 0.12), 6, 18);

  const features = [
    {
      id: 'footfall', title: 'Footfall forecasting', category: 'Forecast', confidence: 92,
      metric: `${nextPeak.visitors} visitors`, trend: `Peak ${nextPeak.hour}`,
      summary: `Traffic is expected to peak at ${nextPeak.hour}, within a range of ${nextPeak.lower}-${nextPeak.upper} visitors.`,
      action: 'Pre-position two associates 30 minutes before the peak.', severity: queueRisk === 'High' ? 'high' : 'medium',
    },
    {
      id: 'queue', title: 'Queue prediction', category: 'Operations', confidence: 89,
      metric: queueRisk, trend: `${Math.round(queue.kpis.avgWaitTime / 60)} min wait`,
      summary: `${queue.kpis.currentlyWaiting} shoppers are waiting across ${queue.kpis.openCounters} open counters.`,
      action: queueRisk === 'High' ? 'Open POS-04 and move one associate to checkout.' : 'Keep one flex cashier available.', severity: queueRisk.toLowerCase(),
    },
    {
      id: 'movement', title: 'Movement intelligence', category: 'Spatial AI', confidence: 87,
      metric: `${topZone.avgDwell}s dwell`, trend: topZone.zone,
      summary: `${topZone.zone} has the strongest conversion while ${weakZone.zone} is underperforming.`,
      action: `Study the path from ${topZone.zone} and replicate its merchandising cues in ${weakZone.zone}.`, severity: 'low',
    },
    {
      id: 'placement', title: 'Product placement optimizer', category: 'Spatial AI', confidence: 84,
      metric: `+${Math.round((topZone.conversion - weakZone.conversion) * 0.35)}% potential`, trend: 'Layout uplift',
      summary: `High dwell but weak conversion in ${weakZone.zone} indicates placement friction.`,
      action: 'Move the highest-engagement hero product to the first sightline and A/B test for seven days.', severity: 'medium',
    },
    {
      id: 'inventory', title: 'Demand and replenishment', category: 'Inventory AI', confidence: 91,
      metric: `${criticalStock.length} critical`, trend: `${highVelocityLowCover.length} high velocity`,
      summary: `${criticalStock.length} products need urgent attention; ${highVelocityLowCover.length} fast sellers have under seven days of cover.`,
      action: highVelocityLowCover[0] ? `Replenish ${highVelocityLowCover[0].name} first.` : 'Review critical items and rebalance from nearby branches.', severity: criticalStock.length ? 'high' : 'low',
    },
    {
      id: 'anomaly', title: 'Anomaly detection', category: 'Risk AI', confidence: 88,
      metric: `${anomalyCount} signals`, trend: 'Live monitoring',
      summary: 'Sales, traffic, queue, device, and stock signals are continuously checked against expected ranges.',
      action: existingInsights[0]?.message || 'No immediate intervention required.', severity: anomalyCount > 3 ? 'high' : 'medium',
    },
    {
      id: 'staffing', title: 'Staffing optimizer', category: 'Workforce AI', confidence: 90,
      metric: `+2 at ${nextPeak.hour}`, trend: `${queue.kpis.servedPerHour}/hr throughput`,
      summary: `Projected traffic and current throughput indicate a coverage gap near ${nextPeak.hour}.`,
      action: 'Move one associate to checkout and one to Mobile; stagger breaks outside the peak.', severity: 'medium',
    },
    {
      id: 'layout', title: 'Layout simulation', category: 'Digital Twin AI', confidence: 82,
      metric: `+${Math.max(4, Math.round(topZone.conversion - weakZone.conversion))}% conversion`, trend: 'Simulated scenario',
      summary: `A virtual swap of a promo fixture toward ${weakZone.zone} improves predicted engagement.`,
      action: 'Run a seven-day digital-twin scenario before changing the physical floor.', severity: 'low',
    },
    {
      id: 'promotion', title: 'Promotion effectiveness', category: 'Commercial AI', confidence: 85,
      metric: '1.24x forecast', trend: 'Expected ROAS',
      summary: 'Bundled accessories are predicted to outperform flat discounts during the next traffic peak.',
      action: 'Test a phone + accessory bundle with a 10% attachment incentive.', severity: 'low',
    },
    {
      id: 'energy', title: 'Energy optimizer', category: 'Sustainability AI', confidence: 80,
      metric: `${estimatedEnergySaving}% saving`, trend: 'Daily estimate',
      summary: 'Occupancy-aware HVAC and lighting schedules can reduce off-peak consumption.',
      action: 'Dim low-traffic zones by 20% and shift HVAC setpoints during the final operating hour.', severity: 'low',
    },
    {
      id: 'loss', title: 'Privacy-safe loss prevention', category: 'Risk AI', confidence: 78,
      metric: '2 patterns', trend: 'No face recognition',
      summary: 'Anonymous shelf interaction, inventory variance, and exit-flow patterns show two review signals.',
      action: 'Audit high-value shelf counts and validate sensor health; do not identify individuals.', severity: 'medium',
    },
    {
      id: 'alerts', title: 'Intelligent alert triage', category: 'Automation', confidence: 94,
      metric: `${existingInsights.length} prioritized`, trend: `${existingInsights.filter(item => item.priority === 'high').length} urgent`,
      summary: 'Alerts are ranked by customer impact, revenue risk, urgency, and confidence.',
      action: existingInsights.find(item => item.priority === 'high')?.message || 'Continue monitoring.', severity: 'high',
    },
    {
      id: 'benchmark', title: 'Multi-store benchmark', category: 'Portfolio AI', confidence: 93,
      metric: `#${currentRank} of ${rankedStores.length}`, trend: `Score ${rankedStores.find(store => store.id === storeId)?.score}`,
      summary: `${STORE_NAMES[storeId]} ranks ${currentRank} across conversion, sales momentum, and operational health.`,
      action: currentRank > 1 ? `Compare staffing and merchandising with ${rankedStores[0].name}.` : 'Package current operating practices for other branches.', severity: 'low',
    },
  ];

  const context = {
    store: STORE_NAMES[storeId],
    timestamp: new Date().toISOString(),
    kpis: {
      visitorsToday: metrics.visitorsToday.value,
      customersInside: metrics.customersInside.value,
      netSalesEGP: metrics.netSales.value,
      conversionRate: Number(metrics.conversionRate.value.toFixed(1)),
      averageBasketEGP: Math.round(metrics.avgBasket.value),
      averageQueueWaitSeconds: queue.kpis.avgWaitTime,
      peopleWaiting: queue.kpis.currentlyWaiting,
      openCounters: queue.kpis.openCounters,
      inventoryCritical: criticalStock.length,
    },
    forecast,
    peakHistoricalHours: peakHours,
    strongestZone: topZone,
    weakestZone: weakZone,
    benchmarkRank: currentRank,
    prioritizedAlerts: existingInsights,
    recommendedActions: features.map(item => ({ feature: item.title, action: item.action, confidence: item.confidence })),
    privacy: 'Aggregated anonymous analytics only; no identity or facial recognition data.',
  };

  return { metrics, forecast, features, context, rankedStores, existingInsights };
}
