import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import { extractValues } from '../../lib/stats/extractValues.js';
import { downloadChartPng } from './chartExport.js';
import HistogramChart from './HistogramChart.jsx';
import CategoryBarChart from './CategoryBarChart.jsx';
import ScatterPlotChart from './ScatterPlotChart.jsx';
import BoxPlotChart from './BoxPlotChart.jsx';
import {
  buildBoxPlotData, computeCategoryFrequencies, computeHistogramBins, computeScatterData,
} from '../../lib/charts/chartData.js';

const CHART_TYPES = ['histogram', 'bar', 'scatter', 'box'];

export default function ChartsView() {
  const { t } = useTranslation();
  const variables = useDatasetStore((s) => s.variables);
  const cases = useDatasetStore((s) => s.cases);

  const numericVars = variables.filter((v) => v.type === 'numeric');
  const catVars = variables.filter((v) => v.type === 'categorical' || v.type === 'string');

  const [chartType, setChartType] = useState('histogram');
  const [varId, setVarId] = useState('');
  const [xVarId, setXVarId] = useState('');
  const [yVarId, setYVarId] = useState('');
  const [groupVarId, setGroupVarId] = useState('');
  const [binCount, setBinCount] = useState(10);
  const [chart, setChart] = useState(null);
  const [error, setError] = useState(null);
  const chartRef = useRef(null);

  const disabled = {
    histogram: numericVars.length === 0,
    bar:       catVars.length === 0,
    scatter:   numericVars.length < 2,
    box:       numericVars.length === 0,
  };
  const disabledReason = {
    histogram: t('charts.noNumeric'),
    bar:       t('charts.noCategorical'),
    scatter:   t('charts.needTwoNumeric'),
    box:       t('charts.noNumeric'),
  };

  const handleTypeChange = (type) => {
    if (disabled[type]) return;
    setChartType(type);
    setVarId('');
    setXVarId('');
    setYVarId('');
    setGroupVarId('');
    setChart(null);
    setError(null);
  };

  const canGenerate = (() => {
    if (chartType === 'histogram') return !!varId;
    if (chartType === 'bar')       return !!varId;
    if (chartType === 'scatter')   return !!xVarId && !!yVarId && xVarId !== yVarId;
    if (chartType === 'box')       return !!varId;
    return false;
  })();

  const handleGenerate = () => {
    setError(null);
    try {
      if (chartType === 'histogram') {
        const v = variables.find((x) => x.id === varId);
        const vals = extractValues(cases, v).filter((x) => x !== null);
        if (vals.length === 0) throw new Error(t('charts.noData'));
        const bins = computeHistogramBins(vals, binCount);
        setChart({ type: 'histogram', bins, varName: v.label || v.name });
      } else if (chartType === 'bar') {
        const v = variables.find((x) => x.id === varId);
        const vals = extractValues(cases, v);
        const data = computeCategoryFrequencies(vals, v.valueLabels ?? {});
        if (data.length === 0) throw new Error(t('charts.noData'));
        setChart({ type: 'bar', data, varName: v.label || v.name });
      } else if (chartType === 'scatter') {
        const xv = variables.find((x) => x.id === xVarId);
        const yv = variables.find((x) => x.id === yVarId);
        const xVals = extractValues(cases, xv);
        const yVals = extractValues(cases, yv);
        const points = computeScatterData(xVals, yVals);
        if (points.length === 0) throw new Error(t('charts.noData'));
        setChart({ type: 'scatter', points, xName: xv.label || xv.name, yName: yv.label || yv.name });
      } else if (chartType === 'box') {
        const v = variables.find((x) => x.id === varId);
        const numVals = extractValues(cases, v);

        let groups;
        if (groupVarId) {
          const gv = variables.find((x) => x.id === groupVarId);
          const gVals = extractValues(cases, gv);
          const distinct = [...new Set(gVals.filter((x) => x !== null))].sort();
          groups = distinct.map((gval) => ({
            name: String(gv.valueLabels?.[String(gval)] ?? gval),
            values: numVals.filter((_, i) => gVals[i] === gval && numVals[i] !== null),
          })).filter((g) => g.values.length > 0);
        } else {
          groups = [{ name: v.label || v.name, values: numVals.filter((x) => x !== null) }];
        }

        if (groups.length === 0) throw new Error(t('charts.noData'));
        const { plotData, yDomain } = buildBoxPlotData(groups);
        const gv = groupVarId ? variables.find((x) => x.id === groupVarId) : null;
        setChart({
          type: 'box', plotData, yDomain,
          varName: v.label || v.name,
          groupVarName: gv ? (gv.label || gv.name) : null,
        });
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const typeBtn = (type) => ({
    padding: '6px 16px',
    fontSize: 13,
    cursor: disabled[type] ? 'not-allowed' : 'pointer',
    fontWeight: chartType === type ? 600 : 400,
    background: chartType === type ? 'var(--accent)' : 'var(--surface)',
    color: chartType === type ? '#fff' : disabled[type] ? 'var(--muted)' : 'var(--ink)',
    border: '1px solid',
    borderColor: chartType === type ? 'var(--accent)' : 'var(--border)',
    borderRadius: 3,
    opacity: disabled[type] ? 0.55 : 1,
    transition: 'background 0.1s, color 0.1s, border-color 0.1s',
  });

  const fieldLabel = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 4 };
  const inputSel = { width: '100%', marginBottom: 12, display: 'block' };
  const boxGroupVars = variables.filter((v) => v.id !== varId && v.type !== 'numeric');

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{t('charts.title')}</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {CHART_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            style={typeBtn(type)}
            onClick={() => handleTypeChange(type)}
            title={disabled[type] ? disabledReason[type] : undefined}
            disabled={disabled[type]}
          >
            {t(`charts.type.${type}`)}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 420 }}>
        {(chartType === 'histogram' || chartType === 'box') && (
          <>
            <label style={fieldLabel}>{t('charts.select.variable')}</label>
            <select value={varId} onChange={(e) => setVarId(e.target.value)} style={inputSel}>
              <option value="">—</option>
              {numericVars.map((v) => (
                <option key={v.id} value={v.id}>{v.label || v.name}</option>
              ))}
            </select>
          </>
        )}

        {chartType === 'histogram' && (
          <>
            <label style={fieldLabel}>{t('charts.binCount')}</label>
            <input
              type="number"
              min={2}
              max={100}
              value={binCount}
              onChange={(e) => setBinCount(Math.max(2, Math.min(100, parseInt(e.target.value) || 10)))}
              style={{ ...inputSel, width: 90 }}
            />
          </>
        )}

        {chartType === 'bar' && (
          <>
            <label style={fieldLabel}>{t('charts.select.variable')}</label>
            <select value={varId} onChange={(e) => setVarId(e.target.value)} style={inputSel}>
              <option value="">—</option>
              {catVars.map((v) => (
                <option key={v.id} value={v.id}>{v.label || v.name}</option>
              ))}
            </select>
          </>
        )}

        {chartType === 'scatter' && (
          <>
            <label style={fieldLabel}>{t('charts.select.xVariable')}</label>
            <select value={xVarId} onChange={(e) => setXVarId(e.target.value)} style={inputSel}>
              <option value="">—</option>
              {numericVars.map((v) => (
                <option key={v.id} value={v.id}>{v.label || v.name}</option>
              ))}
            </select>
            <label style={fieldLabel}>{t('charts.select.yVariable')}</label>
            <select value={yVarId} onChange={(e) => setYVarId(e.target.value)} style={inputSel}>
              <option value="">—</option>
              {numericVars.map((v) => (
                <option key={v.id} value={v.id}>{v.label || v.name}</option>
              ))}
            </select>
          </>
        )}

        {chartType === 'box' && (
          <>
            <label style={fieldLabel}>{t('charts.select.groupVariable')}</label>
            <select value={groupVarId} onChange={(e) => setGroupVarId(e.target.value)} style={inputSel}>
              <option value="">{t('charts.noGrouping')}</option>
              {boxGroupVars.map((v) => (
                <option key={v.id} value={v.id}>{v.label || v.name}</option>
              ))}
            </select>
          </>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            padding: '7px 20px',
            fontSize: 13,
            fontWeight: 600,
            background: 'var(--accent)',
            color: '#fff',
            border: '1px solid var(--accent)',
            borderRadius: 3,
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            opacity: canGenerate ? 1 : 0.5,
          }}
        >
          {t('charts.generate')}
        </button>
      </div>

      {error && <p style={{ color: 'var(--error)', fontSize: 13, marginTop: 8 }}>{error}</p>}

      {chart && (
        <div style={{ marginTop: 20 }}>
          <button
            type="button"
            onClick={() => downloadChartPng(chartRef, `${chart.type}-chart.png`)}
            style={{ marginBottom: 10, fontSize: 13 }}
          >
            {t('charts.downloadPng')}
          </button>
          <div ref={chartRef} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 4px 4px' }}>
            {chart.type === 'histogram' && (
              <HistogramChart bins={chart.bins} varName={chart.varName} />
            )}
            {chart.type === 'bar' && (
              <CategoryBarChart data={chart.data} varName={chart.varName} />
            )}
            {chart.type === 'scatter' && (
              <ScatterPlotChart points={chart.points} xName={chart.xName} yName={chart.yName} />
            )}
            {chart.type === 'box' && (
              <BoxPlotChart
                plotData={chart.plotData}
                yDomain={chart.yDomain}
                varName={chart.varName}
                groupVarName={chart.groupVarName}
              />
            )}
          </div>
        </div>
      )}

      {!chart && !error && (
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 16 }}>{t('charts.empty')}</p>
      )}
    </div>
  );
}
