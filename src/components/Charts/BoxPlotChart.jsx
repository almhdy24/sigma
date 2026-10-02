import { Chart, CategoryAxis } from './svg/Chart.jsx';
import { COLORS, bandLayout } from '../../lib/charts/scale.js';

const fmt = (v) => (v == null ? '—' : Number(v).toFixed(3));

/** Box-and-whisker plot. plotData items come from buildBoxPlotData(). */
export default function BoxPlotChart({ plotData, yDomain, varName, groupVarName }) {
  return (
    <Chart height={420} yDomain={yDomain} yLabel={varName} xLabel={groupVarName} title={varName}
      bottom={groupVarName ? 46 : 32}
      xAxis={({ x0, x1, top, plotH }) => (
        <CategoryAxis labels={plotData.map((d) => d.name)} x0={x0} x1={x1} top={top} plotH={plotH} />
      )}>
      {({ x0, x1, y }) => {
        const { band, center } = bandLayout(plotData.length, x0, x1);
        const w = Math.min(90, band * 0.5);
        return plotData.map((d, i) => {
          const cx = center(i);
          const cap = w * 0.35;
          return (
            <g key={i}>
              <title>{`${d.name}\nMax (fence): ${fmt(d.whiskerHigh)}\nQ3: ${fmt(d.q3)}\nMedian: ${fmt(d.median)}\nQ1: ${fmt(d.q1)}\nMin (fence): ${fmt(d.whiskerLow)}${d.outliers?.length ? `\nOutliers: ${d.outliers.length}` : ''}`}</title>
              <line x1={cx} x2={cx} y1={y(d.q3)} y2={y(d.whiskerHigh)} stroke="#555" strokeWidth="1.5" />
              <line x1={cx} x2={cx} y1={y(d.q1)} y2={y(d.whiskerLow)} stroke="#555" strokeWidth="1.5" />
              <line x1={cx - cap} x2={cx + cap} y1={y(d.whiskerHigh)} y2={y(d.whiskerHigh)} stroke="#555" strokeWidth="1.5" />
              <line x1={cx - cap} x2={cx + cap} y1={y(d.whiskerLow)} y2={y(d.whiskerLow)} stroke="#555" strokeWidth="1.5" />
              <rect x={cx - w / 2} y={y(d.q3)} width={w} height={Math.max(1, y(d.q1) - y(d.q3))}
                fill={COLORS.accent} fillOpacity="0.65" stroke="#164f8a" strokeWidth="1.5" />
              <line x1={cx - w / 2} x2={cx + w / 2} y1={y(d.median)} y2={y(d.median)} stroke={COLORS.red} strokeWidth="2.5" />
              {(d.outliers ?? []).map((v, k) => (
                <circle key={k} cx={cx} cy={y(v)} r="3.5" fill="none" stroke="#e74c3c" strokeWidth="1.5" />
              ))}
            </g>
          );
        });
      }}
    </Chart>
  );
}
