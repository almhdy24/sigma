import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { getPyodide } from '../../lib/pyodideLoader.js';
import { computeDescriptives } from '../../lib/stats/descriptives.js';
import { detectOutliersIQR, detectOutliersZScore } from '../../lib/stats/outliers.js';
import { apaDescriptives } from '../../lib/apaMethods.js';
import useFilterStore from '../../store/filterStore.js';
import { getAnalysisCaseGroups, applyFilter, extractValues } from '../../lib/getFilteredCaseValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, varList, varItem, varItemClass, footer,
  btnPrimary, btnSecondary, errorMsg, typeBadge,
} from './_dialogStyles.js';

const FMT = (v) => (v == null ? '—' : Number(v).toFixed(4));

export default function DescriptivesDialog({ onClose, onResultAdded, onHelp }) {
  const { t } = useTranslation();
  const variables = useDatasetStore((s) => s.variables);
  const cases = useDatasetStore((s) => s.cases);
  const addResult = useResultsStore((s) => s.addResult);

  const activeFilter = useFilterStore(s => s.activeFilter);
  const splitVariableId = useFilterStore(s => s.splitVariableId);
  const splitVar = splitVariableId ? variables.find(v => v.id === splitVariableId) : null;
  const filteredCount = useMemo(
    () => applyFilter(cases, activeFilter, variables).length,
    [cases, activeFilter, variables]
  );

  const numericFirst = [
    ...variables.filter((v) => v.type === 'numeric'),
    ...variables.filter((v) => v.type !== 'numeric'),
  ];

  const [selected, setSelected] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleRun = async () => {
    if (selected.size === 0) return;
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide();
      const _groups = getAnalysisCaseGroups(cases, activeFilter, variables, splitVar);
      for (const _group of _groups) {
        const cases = _group.cases;
        const _splitSuffix = _group.label != null
          ? ` [${splitVar?.label || splitVar?.name} = ${_group.label}]`
          : '';

        const selectedVars = variables.filter((v) => selected.has(v.id));
        const statCols = ['N', 'Missing', 'Mean', 'Median', 'Mode', 'Std Dev',
          'Variance', 'Min', 'Max', 'Range', 'Q1', 'Q3', 'IQR', 'Skewness', 'Kurtosis'];

        const rows = [];
        const outlierRows = [];
        for (const variable of selectedVars) {
          const raw = extractValues(cases, variable);
          const r = await computeDescriptives(py, raw);
          rows.push([
            variable.label || variable.name,
            r.n, r.missing, FMT(r.mean), FMT(r.median), FMT(r.mode),
            FMT(r.sd), FMT(r.variance), FMT(r.min), FMT(r.max), FMT(r.range),
            FMT(r.q1), FMT(r.q3), FMT(r.iqr), FMT(r.skewness), FMT(r.kurtosis),
          ]);
          if (variable.type === 'numeric') {
            const iqrOut = detectOutliersIQR(raw);
            const zOut = detectOutliersZScore(raw);
            outlierRows.push([variable.label || variable.name, r.n, iqrOut.count, zOut.count]);
          }
        }

        const tables = [{
          title: t('analyze.descriptives'),
          columns: ['Variable', ...statCols],
          rows,
        }];

        if (outlierRows.length > 0) {
          tables.push({
            title: t('outliers.tableTitle'),
            columns: [t('outliers.col.variable'), 'N', t('outliers.col.iqrCount'), t('outliers.col.zCount')],
            rows: outlierRows,
          });
        }

        const firstRow = rows[0];
        const interpretation = (selectedVars.length === 1
          ? `N = ${firstRow[1]}, Mean = ${firstRow[3]}, SD = ${firstRow[6]}`
          : `${selectedVars.length} variables. First: N = ${firstRow[1]}, Mean = ${firstRow[3]}`) + _splitSuffix;

        addResult({
          analysisType: 'descriptives',
          variablesUsed: selectedVars.map((v) => v.label || v.name),
          tables,
          interpretation,
          methodsParagraph: apaDescriptives(selectedVars.map((v) => v.label || v.name)),
          chartData: null,
        });
      }
      onResultAdded();
    } catch (e) {
      console.error('[DescriptivesDialog] analysis error:', e);
      setError(t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('analyze.descriptives')}</span>
          {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>{t('dialog.selectVariables')}</p>
        <div style={varList}>
          {numericFirst.map((v) => (
            <label key={v.id} style={varItem} className={varItemClass}>
              <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
              <span>{v.label || v.name}</span>
              <span style={typeBadge}>({t(`type.${v.type}`)})</span>
            </label>
          ))}
        </div>
        {activeFilter && (
          <p style={{ fontSize: 12, color: 'var(--sig)', margin: '8px 0 4px', lineHeight: 1.4 }}>
            {t('filter.analysisNotice', { n: filteredCount, total: cases.length })}
          </p>
        )}
        {splitVar && (
          <p style={{ fontSize: 12, color: 'var(--accent)', margin: '0 0 8px', lineHeight: 1.4 }}>
            {t('split.activeNotice', { varName: splitVar.label || splitVar.name })}
          </p>
        )}
        {error && <p style={errorMsg}>{error}</p>}
        <div style={footer}>
          <button type="button" onClick={handleRun} disabled={running || selected.size === 0} style={btnPrimary}>
            {running ? '...' : t('dialog.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>{t('dialog.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
