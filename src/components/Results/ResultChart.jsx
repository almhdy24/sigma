import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import ROCChart from '../Charts/ROCChart.jsx';

export default function ResultChart({ chartData }) {
  if (!chartData) return null;

  if (chartData.type === 'roc') {
    return <ROCChart chartData={chartData} />;
  }

  if (chartData.type !== 'bar' || !chartData.data?.length) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData.data} margin={{ top: 4, right: 16, bottom: 24, left: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#1f5fa6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
