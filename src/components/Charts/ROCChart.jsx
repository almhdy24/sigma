import { Chart, NumericAxis } from './svg/Chart.jsx';
import { COLORS, numericX } from '../../lib/charts/scale.js';

export default function ROCChart({ chartData }) {
  // Ensure the curve starts at (0,0) and ends at (1,1)
  const pts = [{ fpr: 0, tpr: 0 }, ...chartData.points, { fpr: 1, tpr: 1 }];
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px' }}>
        ROC Curve — AUC = {chartData.auc.toFixed(4)}
      </p>
      <Chart height={300} yDomain={[0, 1]} yLabel="TPR (Sensitivity)" xLabel="FPR (1 − Specificity)" title="ROC curve"
        xAxis={({ x0, x1, top, plotH }) => {
          const { x, ticks } = numericX([0, 1], x0, x1);
          return <NumericAxis x={x} ticks={ticks} top={top} plotH={plotH} />;
        }}>
        {({ x0, x1, y }) => {
          const { x } = numericX([0, 1], x0, x1);
          const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.fpr).toFixed(1)},${y(p.tpr).toFixed(1)}`).join('');
          return (
            <g>
              <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke={COLORS.muted} strokeDasharray="4 4" />
              <path d={d} fill="none" stroke={COLORS.accent} strokeWidth="2" />
            </g>
          );
        }}
      </Chart>
    </div>
  );
}
