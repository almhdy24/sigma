import { useTranslation } from 'react-i18next';
import BarChart from './svg/BarChart.jsx';
import { COLORS } from '../../lib/charts/scale.js';

export default function CategoryBarChart({ data, varName }) {
  const { t } = useTranslation();
  return (
    <BarChart
      height={380}
      color={COLORS.teal}
      data={data.map((d) => ({ label: d.label, value: d.count }))}
      xLabel={varName}
      yLabel={t('charts.axis.frequency')}
      title={`${varName} — ${t('charts.axis.frequency')}`}
    />
  );
}
