// Tiny scale/tick helpers for the SVG charts (replaces Recharts' d3 scales).

/** "Nice" round tick values covering [min, max] (about `count` ticks). */
export function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

/** Linear map from [d0, d1] to [r0, r1]. */
export function linear([d0, d1], [r0, r1]) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

/** Compact number label for axes. */
export function formatTick(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toPrecision(3)}M`;
  if (a >= 1e4) return `${(v / 1e3).toPrecision(3)}k`;
  return String(Number(v.toPrecision(6)));
}

// Literal colours (not CSS variables) so a chart exported as PNG keeps them.
export const COLORS = {
  accent: '#1f5fa6', teal: '#2a7d7d', ink: '#1c2b3a', muted: '#637d94',
  grid: '#e3eaf1', axis: '#9fb2c4', red: '#c0392b',
};

/** Evenly spaced category bands between x0 and x1. */
export function bandLayout(n, x0, x1) {
  const band = (x1 - x0) / Math.max(1, n);
  return { band, center: (i) => x0 + band * (i + 0.5) };
}

/** Numeric x axis with nice ticks. Returns the scale for the marks. */
export function numericX(domain, x0, x1) {
  const ticks = niceTicks(domain[0], domain[1], Math.max(2, Math.floor((x1 - x0) / 70)));
  const d = [Math.min(domain[0], ticks[0]), Math.max(domain[1], ticks[ticks.length - 1])];
  return { x: linear(d, [x0, x1]), ticks };
}
