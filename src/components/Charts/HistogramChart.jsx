import { useTranslation } from 'react-i18next';
import BarChart from './svg/BarChart.jsx';

export default function HistogramChart({ bins, varName }) {
  const { t } = useTranslation();
  return (
    <BarChart
      height={380}
      data={bins.map((b) => ({ label: b.label, value: b.count }))}
      xLabel={varName}
      yLabel={t('charts.axis.count')}
      title={`${varName} — ${t('charts.axis.count')}`}
    />
  );
}
