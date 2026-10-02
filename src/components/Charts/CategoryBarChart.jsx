import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';

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

export default function CategoryBarChart({ data, varName }) {
  const { t } = useTranslation();
  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
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
          label={{ value: t('charts.axis.frequency'), angle: -90, position: 'insideLeft', fontSize: 13 }}
        />
        <Tooltip formatter={(v) => [v, t('charts.axis.frequency')]} />
        <Bar dataKey="count" fill="#2a7d7d" isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
