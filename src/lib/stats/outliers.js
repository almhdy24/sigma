export function detectOutliersIQR(values) {
  const clean = values.filter((x) => x !== null && x !== undefined && !isNaN(x)).map(Number);
  if (clean.length < 4) return { method: 'IQR', outliers: [], count: 0, bounds: null };
  const sorted = [...clean].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const outliers = clean.filter((x) => x < lower || x > upper);
  return { method: 'IQR', outliers, count: outliers.length, bounds: { lower, upper, q1, q3, iqr } };
}

export function detectOutliersZScore(values, threshold = 3) {
  const clean = values.filter((x) => x !== null && x !== undefined && !isNaN(x)).map(Number);
  if (clean.length < 3) return { method: 'z-score', outliers: [], count: 0 };
  const mean = clean.reduce((s, x) => s + x, 0) / clean.length;
  const variance = clean.reduce((s, x) => s + (x - mean) ** 2, 0) / (clean.length - 1);
  const sd = Math.sqrt(variance);
  if (sd === 0) return { method: 'z-score', outliers: [], count: 0 };
  const outliers = clean.filter((x) => Math.abs((x - mean) / sd) > threshold);
  return { method: 'z-score', outliers, count: outliers.length, threshold };
}
