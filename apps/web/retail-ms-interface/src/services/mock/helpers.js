// Seeded random number generator for deterministic data
export function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function randomInRange(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randomFloat(min, max, rng = Math.random) {
  return rng() * (max - min) + min;
}

export function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

export function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 200));
}

export function generateHourlyData(baseValue, variance, hours = 24, seed = 42) {
  const rng = seededRandom(seed);
  const data = [];
  // Retail traffic pattern: low early, peak lunch & evening
  const pattern = [
    0.1, 0.05, 0.03, 0.02, 0.05, 0.1, 0.2, 0.35, 0.55, 0.7,
    0.85, 0.95, 1.0, 0.9, 0.8, 0.75, 0.85, 0.95, 1.0, 0.9,
    0.7, 0.5, 0.3, 0.15
  ];
  for (let h = 0; h < hours; h++) {
    const factor = pattern[h] || 0.5;
    const value = Math.round(baseValue * factor + (rng() - 0.5) * variance * factor);
    data.push({ hour: h, value: Math.max(0, value) });
  }
  return data;
}

export function generateDailyData(baseValue, variance, days = 30, seed = 42) {
  const rng = seededRandom(seed);
  const data = [];
  const today = new Date();
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(today);
    date.setDate(date.getDate() - d);
    // Weekend boost
    const dayOfWeek = date.getDay();
    const weekendFactor = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.3 : 1.0;
    const value = Math.round(baseValue * weekendFactor + (rng() - 0.5) * variance);
    data.push({
      date: date.toISOString().split('T')[0],
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      value: Math.max(0, value),
    });
  }
  return data;
}

// Store multipliers for realistic cross-store variation
export const STORE_MULTIPLIERS = {
  cfc: { traffic: 1.2, sales: 1.3, conversion: 1.1 },
  cs: { traffic: 1.0, sales: 1.0, conversion: 1.0 },
  moe: { traffic: 1.15, sales: 1.2, conversion: 1.05 },
  acc: { traffic: 0.8, sales: 0.75, conversion: 0.95 },
  man: { traffic: 0.6, sales: 0.55, conversion: 0.9 },
};
