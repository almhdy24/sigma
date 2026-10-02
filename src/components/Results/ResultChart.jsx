import ROCChart from '../Charts/ROCChart.jsx';
import BarChart from '../Charts/svg/BarChart.jsx';

export default function ResultChart({ chartData }) {
  if (!chartData) return null;

  if (chartData.type === 'roc') {
    return <ROCChart chartData={chartData} />;
  }

  if (chartData.type !== 'bar' || !chartData.data?.length) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <BarChart height={240} data={chartData.data} />
    </div>
  );
}
