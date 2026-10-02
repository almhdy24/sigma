import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';

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

export default function HistogramChart({ bins, varName }) {
  const { t } = useTranslation();
  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={bins} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          angle={-40}
          textAnchor="end"
          interval={0}
          tick={{ fontSize: 11 }}
          label={{ value: varName, position: 'insideBottom', offset: -50, fontSize: 13 }}
        />
        <YAxis
          allowDecimals={false}
          label={{ value: t('charts.axis.count'), angle: -90, position: 'insideLeft', fontSize: 13 }}
        />
        <Tooltip formatter={(v) => [v, t('charts.axis.count')]} />
        <Bar dataKey="count" fill="#1f5fa6" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
