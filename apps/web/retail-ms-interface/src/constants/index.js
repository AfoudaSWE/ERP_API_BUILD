export const CURRENCY = 'EGP';
export const TIMEZONE = 'Africa/Cairo';

export const CATEGORIES = [
  'Smartphones', 'Laptops', 'Tablets', 'Audio', 'Accessories',
  'Wearables', 'Gaming', 'Cameras', 'Home Electronics', 'Networking'
];

export const ZONES = [
  { id: 'entrance', name: 'Entrance', color: '#06b6d4', capacity: 20 },
  { id: 'electronics', name: 'Electronics Zone', color: '#8b5cf6', capacity: 30 },
  { id: 'mobile', name: 'Mobile Zone', color: '#3b82f6', capacity: 25 },
  { id: 'accessories', name: 'Accessories Zone', color: '#f59e0b', capacity: 20 },
  { id: 'promo', name: 'Promotion Zone', color: '#ef4444', capacity: 15 },
  { id: 'checkout', name: 'Checkout Zone', color: '#10b981', capacity: 20 },
  { id: 'storage', name: 'Storage Room', color: '#6b7280', capacity: 5 },
  { id: 'service', name: 'Customer Service', color: '#ec4899', capacity: 10 },
  { id: 'exit', name: 'Exit', color: '#64748b', capacity: 20 },
];

export const POS_TERMINALS = [
  { id: 'pos-01', name: 'POS-01' },
  { id: 'pos-02', name: 'POS-02' },
  { id: 'pos-03', name: 'POS-03' },
  { id: 'pos-04', name: 'POS-04' },
];

export const CASHIERS = [
  { id: 'c1', name: 'Ahmed Hassan', posId: 'pos-01' },
  { id: 'c2', name: 'Fatma Ali', posId: 'pos-02' },
  { id: 'c3', name: 'Omar Khaled', posId: 'pos-03' },
  { id: 'c4', name: 'Nour Ibrahim', posId: 'pos-04' },
];

export const PAYMENT_METHODS = ['Cash', 'Visa', 'Mastercard', 'Mobile Wallet', 'Installments'];

export const ALERT_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

export const ALERT_TYPES = [
  'queue_congestion', 'high_occupancy', 'low_stock', 'out_of_stock',
  'pos_offline', 'camera_offline', 'conversion_drop', 'shelf_replenishment',
  'abnormal_inventory', 'device_disconnected'
];

export const STOCK_STATUSES = ['healthy', 'low_stock', 'critical', 'out_of_stock', 'overstock', 'dead_stock'];

export const formatEGP = (value) => {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value) => {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-EG').format(value);
};

export const formatPercent = (value) => {
  if (value == null || isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
};

export const formatDuration = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

export const safeDivide = (a, b, multiplier = 1) => {
  if (!b || b === 0) return null;
  return (a / b) * multiplier;
};
