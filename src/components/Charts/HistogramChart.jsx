import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';


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
