import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { ANALYSIS_PACKAGES, getPyodide } from '../../lib/pyodideLoader.js';
import { computeFrequencies } from '../../lib/stats/frequencies.js';
import { apaFrequencies } from '../../lib/apaMethods.js';
import useFilterStore from '../../store/filterStore.js';
import { getAnalysisCaseGroups, applyFilter, extractValues } from '../../lib/getFilteredCaseValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, varList, varItem, varItemClass, footer,
  btnPrimary, btnSecondary, errorMsg, typeBadge,
} from './_dialogStyles.js';

export default function FrequenciesDialog({ onClose, onResultAdded, onHelp }) {
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

  const sorted = [
    ...variables.filter((v) => v.type === 'categorical' || v.type === 'string'),
    ...variables.filter((v) => v.type !== 'categorical' && v.type !== 'string'),
  ];

  const [selected, setSelected] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (id) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleRun = async () => {
    if (selected.size === 0) return;
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide(ANALYSIS_PACKAGES.frequencies);
      const _groups = getAnalysisCaseGroups(cases, activeFilter, variables, splitVar);
      for (const _group of _groups) {
        const cases = _group.cases;
        const _splitSuffix = _group.label != null
          ? ` [${splitVar?.label || splitVar?.name} = ${_group.label}]`
          : '';

        const selectedVars = variables.filter((v) => selected.has(v.id));
        const tables = [];

        for (const variable of selectedVars) {
          const raw = extractValues(cases, variable);
          const rows = await computeFrequencies(py, raw, variable.valueLabels ?? {});
          tables.push({
            title: `${t('analyze.frequencies')}: ${variable.label || variable.name}`,
            columns: [t('table.value'), t('table.label'), t('table.frequency'), t('table.percent'), t('table.valid_pct'), t('table.cumulative_pct')],
            rows: rows.map((r) => [r.value, r.label, r.frequency, r.percent, r.validPercent, r.cumulativePercent]),
          });
        }

        const firstRows = tables[0]?.rows ?? [];
        const topRow = firstRows[0];
        const interpretation = (topRow
          ? `Most frequent: "${topRow[1]}" (${topRow[2]} cases, ${topRow[3]}%)`
          : 'No data') + _splitSuffix;

        const chartData = firstRows.length > 0 ? {
          type: 'bar',
          data: firstRows.map((r) => ({ label: String(r[1]), value: r[2] })),
        } : null;

        addResult({
          analysisType: 'frequencies',
          variablesUsed: selectedVars.map((v) => v.label || v.name),
          tables,
          interpretation,
          methodsParagraph: apaFrequencies(selectedVars.map((v) => v.label || v.name)),
          chartData: selectedVars.length === 1 ? chartData : null,
        });
      }
      onResultAdded();
    } catch (e) {
      console.error('[FrequenciesDialog] analysis error:', e);
      setError(e?.name === 'EngineError' ? e.message : t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('analyze.frequencies')}</span>
          {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>{t('dialog.selectVariables')}</p>
        <div style={varList}>
          {sorted.map((v) => (
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
