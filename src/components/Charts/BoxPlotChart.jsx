import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Statistics helpers ─────────────────────────────────────────────────────

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

// ─── Custom Box+Whisker SVG shape ────────────────────────────────────────────
//
// Strategy: use recharts stacked BarChart where:
//   Stack 1 (transparent spacer): 0 → whiskerLow
//   Stack 2 (custom shape):       whiskerLow → whiskerHigh
//
// The custom shape receives the pixel bounds of stack 2 (y = pixel(whiskerHigh),
// y+height = pixel(whiskerLow)). From these and the data values we derive:
//   scale = height / (whiskerHigh - whiskerLow)   [pixels per data unit]
//   yOf(v) = y + height - (v - whiskerLow) * scale
//
// This places every stat (q1, median, q3, whiskers, outliers) correctly on the
// pixel canvas without needing direct axis-scale access.

const BoxShape = (props) => {
  const { x, y, width, height, whiskerLow, whiskerHigh, q1, q3, median, outliers } = props;

  if (!height || height <= 0 || whiskerHigh === whiskerLow) {
    // Degenerate: single-value distribution — just draw a line
    const cx = x + width / 2;
    return <line x1={x} y1={y} x2={x + width} y2={y} stroke="#1f5fa6" strokeWidth={2} />;
  }

  const range = whiskerHigh - whiskerLow;
  const scale = height / range;
  const cx = x + width / 2;
  const boxPad = width * 0.12;
  const capHalf = width * 0.28;

  // Value → pixel-y (higher values = smaller y, because SVG y-axis is inverted)
  const yOf = (v) => y + height - (v - whiskerLow) * scale;

  const yQ1 = yOf(q1);
  const yQ3 = yOf(q3);
  const yMed = yOf(median);
  // Whisker endpoints sit exactly at the bar top/bottom when outliers are absent
  const yWL = yOf(whiskerLow);  // = y + height
  const yWH = yOf(whiskerHigh); // = y

  return (
    <g>
      {/* IQR rectangle */}
      <rect
        x={x + boxPad} y={yQ3}
        width={width - 2 * boxPad} height={Math.max(1, yQ1 - yQ3)}
        fill="#1f5fa6" fillOpacity={0.65}
        stroke="#164f8a" strokeWidth={1.5}
      />
      {/* Median line */}
      <line
        x1={x + boxPad} y1={yMed} x2={x + width - boxPad} y2={yMed}
        stroke="#c0392b" strokeWidth={2.5}
      />
      {/* Upper whisker stem (q3 → whiskerHigh) */}
      <line x1={cx} y1={yQ3} x2={cx} y2={yWH} stroke="#555" strokeWidth={1.5} />
      {/* Lower whisker stem (q1 → whiskerLow) */}
      <line x1={cx} y1={yQ1} x2={cx} y2={yWL} stroke="#555" strokeWidth={1.5} />
      {/* Caps */}
      <line x1={cx - capHalf} y1={yWH} x2={cx + capHalf} y2={yWH} stroke="#555" strokeWidth={1.5} />
      <line x1={cx - capHalf} y1={yWL} x2={cx + capHalf} y2={yWL} stroke="#555" strokeWidth={1.5} />
      {/* Outliers */}
      {(outliers ?? []).map((v, i) => (
        <circle key={i} cx={cx} cy={yOf(v)} r={3.5} fill="none" stroke="#e74c3c" strokeWidth={1.5} />
      ))}
    </g>
  );
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const BoxTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const fmt = (v) => (v == null ? '—' : Number(v).toFixed(3));
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '8px 12px', fontSize: 12, lineHeight: 1.6, color: 'var(--ink)' }}>
      <strong>{d.name}</strong>
      <div>Max (fence): {fmt(d.whiskerHigh)}</div>
      <div>Q3: {fmt(d.q3)}</div>
      <div>Median: {fmt(d.median)}</div>
      <div>Q1: {fmt(d.q1)}</div>
      <div>Min (fence): {fmt(d.whiskerLow)}</div>
      {d.outliers?.length > 0 && <div>Outliers: {d.outliers.length}</div>}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

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

export default function BoxPlotChart({ plotData, yDomain, varName, groupVarName }) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={plotData} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          label={groupVarName ? { value: groupVarName, position: 'insideBottom', offset: -28, fontSize: 13 } : undefined}
        />
        <YAxis
          domain={yDomain}
          tick={{ fontSize: 11 }}
          label={{ value: varName, angle: -90, position: 'insideLeft', fontSize: 13 }}
        />
        <Tooltip content={<BoxTooltip />} />
        {/* Invisible spacer stacks the custom shape up to whiskerLow */}
        <Bar
          dataKey="spacer"
          stackId="bp"
          fill="transparent"
          stroke="none"
          isAnimationActive={false}
          legendType="none"
        />
        {/* Custom shape draws the entire box-and-whisker within its pixel bounds */}
        <Bar
          dataKey="barRange"
          stackId="bp"
          shape={<BoxShape />}
          isAnimationActive={false}
          legendType="none"
          fill="#1f5fa6"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
