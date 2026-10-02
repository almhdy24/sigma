import { useLayoutEffect, useRef, useState } from 'react';
import { COLORS, bandLayout, formatTick, linear, niceTicks } from '../../../lib/charts/scale.js';

const FONT = "'IBM Plex Sans Arabic', system-ui, sans-serif";

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/**
 * Responsive SVG frame with a y axis (numeric, nice ticks + grid) and an
 * x axis drawn by the caller. Charts read left-to-right in both languages.
 * children({ x0, x1, y, plotH, width }) renders the marks.
 */
export function Chart({ height = 320, yDomain, yLabel, xLabel, bottom = 40, title, children, xAxis }) {
  const [ref, width] = useWidth();
  const ticks = niceTicks(yDomain[0], yDomain[1], 5);
  const yMin = Math.min(yDomain[0], ticks[0]);
  const yMax = Math.max(yDomain[1], ticks[ticks.length - 1]);
  const left = 52;
  const right = 12;
  const top = 12;
  const plotH = height - top - bottom;
  const y = linear([yMin, yMax], [top + plotH, top]);
  const x0 = left;
  const x1 = Math.max(left + 10, width - right);

  return (
    <div ref={ref} dir="ltr" style={{ width: '100%' }}>
      {width > 0 && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}
          style={{ display: 'block', fontFamily: FONT }}>
          {title && <title>{title}</title>}
          <rect width={width} height={height} fill="#ffffff" />
          {ticks.filter((v) => v >= yMin && v <= yMax).map((v) => (
            <g key={v}>
              <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} stroke={COLORS.grid} />
              <text x={x0 - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize="11" fill={COLORS.muted}>{formatTick(v)}</text>
            </g>
          ))}
          <line x1={x0} x2={x0} y1={top} y2={top + plotH} stroke={COLORS.axis} />
          <line x1={x0} x2={x1} y1={top + plotH} y2={top + plotH} stroke={COLORS.axis} />
          {yLabel && (
            <text transform={`translate(13 ${top + plotH / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill={COLORS.ink}>{yLabel}</text>
          )}
          {xLabel && (
            <text x={(x0 + x1) / 2} y={height - 6} textAnchor="middle" fontSize="12" fill={COLORS.ink}>{xLabel}</text>
          )}
          {xAxis?.({ x0, x1, y, plotH, top, width })}
          {children({ x0, x1, y, plotH, top, width })}
        </svg>
      )}
    </div>
  );
}

/** Category axis labels under evenly spaced bands; rotated when crowded. */
export function CategoryAxis({ labels, x0, x1, top, plotH }) {
  const { band, center } = bandLayout(labels.length, x0, x1);
  const rotate = band < 56;
  const maxChars = rotate ? 14 : Math.max(4, Math.floor(band / 7));
  return labels.map((label, i) => {
    const s = String(label);
    const text = s.length > maxChars ? `${s.slice(0, maxChars - 1)}…` : s;
    const yy = top + plotH + 14;
    return (
      <text key={i} x={center(i)} y={yy} fontSize="11" fill={COLORS.ink}
        textAnchor={rotate ? 'end' : 'middle'}
        transform={rotate ? `rotate(-40 ${center(i)} ${yy})` : undefined}>
        <title>{s}</title>{text}
      </text>
    );
  });
}

export function NumericAxis({ x, ticks, top, plotH }) {
  return ticks.map((v) => (
    <g key={v}>
      <line x1={x(v)} x2={x(v)} y1={top} y2={top + plotH} stroke={COLORS.grid} />
      <text x={x(v)} y={top + plotH + 15} textAnchor="middle" fontSize="11" fill={COLORS.muted}>{formatTick(v)}</text>
    </g>
  ));
}
