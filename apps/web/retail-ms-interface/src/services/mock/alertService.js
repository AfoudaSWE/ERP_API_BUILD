import { delay, seededRandom, randomInRange } from './helpers';

const ALERT_TEMPLATES = [
  { type: 'queue_congestion', severity: 'high', title: 'Queue Wait Time Exceeded', zone: 'Checkout Zone', suggestedAction: 'Open additional checkout counter' },
  { type: 'high_occupancy', severity: 'medium', title: 'Zone Occupancy Above 85%', zone: 'Mobile Zone', suggestedAction: 'Monitor and consider crowd management' },
  { type: 'low_stock', severity: 'high', title: 'Low Stock: AirPods Pro 2nd Gen', zone: 'Accessories Zone', suggestedAction: 'Trigger replenishment order' },
  { type: 'out_of_stock', severity: 'critical', title: 'Out of Stock: Screen Protector Pack', zone: 'Accessories Zone', suggestedAction: 'Urgent restock required' },
  { type: 'pos_offline', severity: 'critical', title: 'POS-03 Connection Lost', zone: 'Checkout Zone', suggestedAction: 'Restart terminal or contact IT support' },
  { type: 'camera_offline', severity: 'high', title: 'Camera CAM-07 Offline', zone: 'Electronics Zone', suggestedAction: 'Check network connection and power' },
  { type: 'conversion_drop', severity: 'medium', title: 'Conversion Rate Dropped 18%', zone: 'Promotion Zone', suggestedAction: 'Review promotion effectiveness and staffing' },
  { type: 'shelf_replenishment', severity: 'medium', title: 'Shelf Empty: Samsung Chargers', zone: 'Accessories Zone', suggestedAction: 'Move stock from storage to shelf' },
  { type: 'abnormal_inventory', severity: 'high', title: 'Inventory Count Discrepancy', zone: 'Electronics Zone', suggestedAction: 'Conduct spot count audit' },
  { type: 'device_disconnected', severity: 'low', title: 'Sensor SN-12 Signal Weak', zone: 'Entrance', suggestedAction: 'Replace battery or check positioning' },
  { type: 'queue_congestion', severity: 'medium', title: 'POS-02 Service Time Above Average', zone: 'Checkout Zone', suggestedAction: 'Assist cashier or investigate' },
  { type: 'low_stock', severity: 'medium', title: 'Low Stock: JBL Flip 6', zone: 'Accessories Zone', suggestedAction: 'Plan reorder within 48 hours' },
  { type: 'high_occupancy', severity: 'low', title: 'Entrance Area Crowded', zone: 'Entrance', suggestedAction: 'Temporary flow management' },
  { type: 'conversion_drop', severity: 'high', title: 'iPhone 15 Pro High Browse, Low Buy', zone: 'Mobile Zone', suggestedAction: 'Review pricing and competitor offers' },
  { type: 'shelf_replenishment', severity: 'low', title: 'Display Unit Needs Reset', zone: 'Promotion Zone', suggestedAction: 'Restock promotional display' },
];

const STORES_NAMES = {
  cfc: 'Cairo Festival City',
  cs: 'City Stars',
  moe: 'Mall of Egypt',
  acc: 'Alexandria City Centre',
  man: 'Mansoura Branch',
};

const EMPLOYEES = ['Ahmed H.', 'Fatma A.', 'Omar K.', 'Nour I.', 'Sara M.', 'Hassan R.'];

export async function getAlerts(storeId = null) {
  await delay(300);
  const rng = seededRandom(new Date().getDate() * 300);
  const storeIds = storeId ? [storeId] : Object.keys(STORES_NAMES);

  const alerts = ALERT_TEMPLATES.map((template, i) => {
    const sid = storeIds[randomInRange(0, storeIds.length - 1, rng)];
    const statuses = ['active', 'active', 'active', 'acknowledged', 'resolved'];
    const status = statuses[randomInRange(0, statuses.length - 1, rng)];
    const minutesAgo = randomInRange(5, 480, rng);

    return {
      id: `ALT-${1000 + i}`,
      ...template,
      store: sid,
      storeName: STORES_NAMES[sid],
      status,
      assignedTo: status !== 'active' ? EMPLOYEES[randomInRange(0, EMPLOYEES.length - 1, rng)] : null,
      createdAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      acknowledgedAt: status !== 'active' ? new Date(Date.now() - (minutesAgo - 10) * 60000).toISOString() : null,
      resolvedAt: status === 'resolved' ? new Date(Date.now() - (minutesAgo - 30) * 60000).toISOString() : null,
    };
  });

  return alerts.sort((a, b) => {
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return (sevOrder[a.severity] || 5) - (sevOrder[b.severity] || 5);
  });
}
