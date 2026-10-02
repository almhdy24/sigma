// Pure data preparation for the chart components (kept separate from the
// React components so Fast Refresh works and the logic is unit-testable).

// Linear-interpolation percentile (same as numpy's default)
function quantile(sorted, p) {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function computeBoxStats(values) {
  const sorted = [...values].filter((v) => v !== null).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const q1 = quantile(sorted, 25);
  const median = quantile(sorted, 50);
  const q3 = quantile(sorted, 75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const nonOutliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  const whiskerLow = nonOutliers.length > 0 ? nonOutliers[0] : sorted[0];
  const whiskerHigh = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : sorted[sorted.length - 1];
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
  return { q1, median, q3, whiskerLow, whiskerHigh, outliers };
}

export function buildBoxPlotData(groups) {
  // groups = [{ name, values[] }]
  const built = groups
    .map(({ name, values }) => {
      const stats = computeBoxStats(values);
      if (!stats) return null;
      const allVals = [stats.whiskerLow, stats.whiskerHigh, ...stats.outliers];
      const absMin = Math.min(...allVals);
      const absMax = Math.max(...allVals);
      return {
        name,
        spacer: stats.whiskerLow,                   // invisible bar: 0 → whiskerLow
        barRange: stats.whiskerHigh - stats.whiskerLow, // custom shape: whiskerLow → whiskerHigh
        ...stats,
        absMin,
        absMax,
      };
    })
    .filter(Boolean);

  if (built.length === 0) return { plotData: [], yDomain: [0, 1] };

  const globalMin = Math.min(...built.map((d) => d.absMin));
  const globalMax = Math.max(...built.map((d) => d.absMax));
  const pad = Math.max((globalMax - globalMin) * 0.08, 0.5);

  return {
    plotData: built,
    yDomain: [globalMin - pad, globalMax + pad],
  };
}

export function computeCategoryFrequencies(values, valueLabels = {}) {
  const counts = {};
  for (const v of values) {
    if (v === null) continue;
    const key = String(v);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
    .map(([raw, count]) => ({
      label: valueLabels[raw] ?? raw,
      count,
    }));
}

export function computeHistogramBins(values, binCount) {
  const n = Math.max(1, Math.round(binCount));
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return [{ label: String(min), count: values.length }];
  }
  const w = (max - min) / n;
  const bins = Array.from({ length: n }, (_, i) => ({
    label: `${(min + i * w).toFixed(2)}–${(min + (i + 1) * w).toFixed(2)}`,
    count: 0,
  }));
  for (const v of values) {
    let i = Math.floor((v - min) / w);
    if (i >= n) i = n - 1;
    bins[i].count++;
  }
  return bins;
}

export function computeScatterData(xValues, yValues) {
  const points = [];
  for (let i = 0; i < xValues.length; i++) {
    if (xValues[i] !== null && yValues[i] !== null) {
      points.push({ x: xValues[i], y: yValues[i] });
    }
  }
  return points;
}
