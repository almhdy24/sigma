import { Chart, NumericAxis } from './svg/Chart.jsx';
import { COLORS, numericX } from '../../lib/charts/scale.js';

export default function ScatterPlotChart({ points, xName, yName }) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const yDomain = ys.length ? [Math.min(...ys), Math.max(...ys)] : [0, 1];
  const xDomain = xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
  return (
    <Chart height={400} yDomain={yDomain} xLabel={xName} yLabel={yName} title={`${yName} × ${xName}`}
      xAxis={({ x0, x1, top, plotH }) => {
        const { x, ticks } = numericX(xDomain, x0, x1);
        return <NumericAxis x={x} ticks={ticks} top={top} plotH={plotH} />;
      }}>
      {({ x0, x1, y }) => {
        const { x } = numericX(xDomain, x0, x1);
        return points.map((p, i) => (
          <circle key={i} cx={x(p.x)} cy={y(p.y)} r={3.5} fill={COLORS.accent} fillOpacity={0.65}>
            <title>{`${xName}: ${p.x}, ${yName}: ${p.y}`}</title>
          </circle>
        ));
      }}
    </Chart>
  );
}
