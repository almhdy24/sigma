import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ROCChart({ chartData }) {
  const data = chartData.points.map((p) => ({ fpr: p.fpr, tpr: p.tpr }));

  // Ensure the curve starts at (0,0) and ends at (1,1)
  const chartPoints = [{ fpr: 0, tpr: 0 }, ...data, { fpr: 1, tpr: 1 }];

  // Diagonal reference line (chance line)
  const diagData = [
    { fpr: 0, tpr: 0 },
    { fpr: 1, tpr: 1 },
  ];

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 6px' }}>
        ROC Curve — AUC = {chartData.auc.toFixed(4)}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={chartPoints}
          margin={{ top: 8, right: 24, bottom: 24, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="fpr"
            type="number"
            domain={[0, 1]}
            label={{
              value: 'FPR (1 − Specificity)',
              position: 'insideBottom',
              offset: -16,
              fontSize: 11,
            }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            domain={[0, 1]}
            label={{
              value: 'TPR (Sensitivity)',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              fontSize: 11,
            }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(v) => v.toFixed(3)}
            labelFormatter={(v) => `FPR: ${Number(v).toFixed(3)}`}
          />
          {/* ROC curve */}
          <Line
            type="monotone"
            dataKey="tpr"
            dot={false}
            stroke="var(--accent)"
            strokeWidth={2}
          />
          {/* Diagonal reference line */}
          <Line
            data={diagData}
            type="linear"
            dataKey="tpr"
            dot={false}
            stroke="var(--muted)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
