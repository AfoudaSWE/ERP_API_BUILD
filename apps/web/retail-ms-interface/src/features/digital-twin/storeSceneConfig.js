export const STORE_ZONES = [
  { id: 'entrance', x: 0.5, y: 6.5, w: 3, h: 5, label: 'Entrance', accent: 0x38bdf8 },
  { id: 'mobiles_section', x: 4, y: 1, w: 5.5, h: 6.5, label: 'Mobile Studio', accent: 0x8b5cf6 },
  { id: 'laptops_section', x: 10, y: 1, w: 5.5, h: 6.5, label: 'Computing', accent: 0x06b6d4 },
  { id: 'accessories_section', x: 16, y: 1, w: 7, h: 6.5, label: 'Accessories', accent: 0xec4899 },
  { id: 'checkout_1', x: 4, y: 9, w: 19, h: 4, label: 'Checkout', accent: 0xf59e0b },
];

export const CAMERA_PRESETS = {
  overview: { label: 'Overview', position: [18, 22, 24], target: [0, 0, 0] },
  entrance: { label: 'Entrance', position: [-15, 8, 12], target: [-10, 0.8, 0] },
  checkout: { label: 'Checkout', position: [14, 8, 13], target: [4, 0.7, 2] },
  shelves: { label: 'Shelves', position: [2, 8, -14], target: [1, 0.5, -4] },
  fitting: { label: 'Fitting rooms', position: [16, 7, -7], target: [10.5, 0.8, -5.5] },
  stockroom: { label: 'Stockroom', position: [15, 7, -13], target: [9.5, 0.8, -7.8] },
  heatmap: { label: 'Heat map', position: [0, 29, 0.1], target: [0, 0, 0] },
};

export const DEFAULT_LAYERS = {
  customers: true,
  staff: true,
  shelves: true,
  stock: true,
  heatmap: false,
  paths: true,
  queues: true,
  cameras: true,
  sensors: true,
  alerts: true,
};

export const QUALITY_LEVELS = {
  low: { pixelRatio: 1, shadows: false, shadowSize: 512, antialias: false },
  medium: { pixelRatio: 1.35, shadows: true, shadowSize: 1024, antialias: true },
  high: { pixelRatio: 2, shadows: true, shadowSize: 2048, antialias: true },
};

export function resolveQuality(requested) {
  if (requested !== 'auto') return QUALITY_LEVELS[requested] ?? QUALITY_LEVELS.medium;
  if (typeof navigator === 'undefined') return QUALITY_LEVELS.medium;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = navigator.deviceMemory ?? 4;
  return cores >= 8 && memory >= 8 ? QUALITY_LEVELS.high : cores <= 4 || memory <= 4 ? QUALITY_LEVELS.low : QUALITY_LEVELS.medium;
}

export const STATUS_COLORS = {
  healthy: 0x22c55e,
  warning: 0xf59e0b,
  critical: 0xef4444,
  unknown: 0x94a3b8,
};
