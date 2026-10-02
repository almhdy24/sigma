import { Chart, CategoryAxis } from './Chart.jsx';
import { COLORS, bandLayout } from '../../../lib/charts/scale.js';

/** Vertical bars over categories. data: [{ label, value }] */
export default function BarChart({ data, height = 320, color = COLORS.accent, yLabel, xLabel, title, valueLabels = true }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const crowded = data.length > 8;
  return (
    <Chart height={height} yDomain={[0, max || 1]} yLabel={yLabel} xLabel={xLabel} title={title}
      bottom={crowded ? 76 : 46}
      xAxis={({ x0, x1, top, plotH }) => (
        <CategoryAxis labels={data.map((d) => d.label)} x0={x0} x1={x1} top={top} plotH={plotH} />
      )}>
      {({ x0, x1, y }) => {
        const { band, center } = bandLayout(data.length, x0, x1);
        const w = Math.max(2, Math.min(64, band * 0.72));
        return data.map((d, i) => (
          <g key={i}>
            <rect x={center(i) - w / 2} y={y(d.value)} width={w} height={Math.max(0, y(0) - y(d.value))} fill={color} rx="2">
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
            {valueLabels && band >= 22 && (
              <text x={center(i)} y={y(d.value) - 4} textAnchor="middle" fontSize="10" fill={COLORS.ink}>{d.value}</text>
            )}
          </g>
        ));
      }}
    </Chart>
  );
}
