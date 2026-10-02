import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { ANALYSIS_PACKAGES, getPyodide } from '../../lib/pyodideLoader.js';
import { computeCrosstabs } from '../../lib/stats/crosstabs.js';
import { apaCrosstabs } from '../../lib/apaMethods.js';
import useFilterStore from '../../store/filterStore.js';
import { getAnalysisCaseGroups, applyFilter, extractValues } from '../../lib/getFilteredCaseValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg,
} from './_dialogStyles.js';

function cramersMag(v) {
  if (v == null) return '';
  if (v >= 0.5) return 'large';
  if (v >= 0.3) return 'medium';
  if (v >= 0.1) return 'small';
  return 'negligible';
}

export default function CrosstabsDialog({ onClose, onResultAdded, onHelp }) {
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

  const [rowVarId, setRowVarId] = useState('');
  const [colVarId, setColVarId] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    if (!rowVarId || !colVarId) return;
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide(ANALYSIS_PACKAGES.crosstabs);
      const _groups = getAnalysisCaseGroups(cases, activeFilter, variables, splitVar);
      for (const _group of _groups) {
        const cases = _group.cases;
        const _splitSuffix = _group.label != null
          ? ` [${splitVar?.label || splitVar?.name} = ${_group.label}]`
          : '';

        const rowVar = variables.find((v) => v.id === rowVarId);
        const colVar = variables.find((v) => v.id === colVarId);
        const rowVals = extractValues(cases, rowVar);
        const colVals = extractValues(cases, colVar);
        const res = await computeCrosstabs(py, rowVals, colVals);

        const rowName = rowVar.label || rowVar.name;
        const colName = colVar.label || colVar.name;

        const colHeaders = [rowName, ...res.colLabels, 'Total'];
        const rowSums = res.table.map((r) => r.reduce((a, b) => a + b, 0));
        const tableRows = res.rowLabels.map((rl, i) => [rl, ...res.table[i], rowSums[i]]);
        const colTotals = res.colLabels.map((_, j) => res.table.reduce((s, r) => s + r[j], 0));
        tableRows.push(['Total', ...colTotals, colTotals.reduce((a, b) => a + b, 0)]);

        const hasChiError = res.chiError === 'zero_expected_frequency';

        const tables = [
          { title: `${rowName} × ${colName}`, columns: colHeaders, rows: tableRows },
        ];

        if (!hasChiError && res.chiSquare != null) {
          const vStr = res.cramersV == null ? '—' : `${res.cramersV.toFixed(3)} (${cramersMag(res.cramersV)})`;
          tables.push({
            title: 'Chi-Square Tests',
            columns: [t('table.test'), t('table.value'), 'df', 'p', "Cramér's V"],
            rows: [['Pearson Chi-Square', res.chiSquare.toFixed(3), res.dof, res.pValue.toFixed(3), vStr]],
          });
        }

        let interpretation;
        if (hasChiError) {
          interpretation = t('dialog.crosstabs.zeroExpected');
        } else if (res.chiSquare != null) {
          const sigText = res.pValue < 0.05 ? 'statistically significant' : 'not statistically significant';
          const vPart = res.cramersV != null ? `, V = ${res.cramersV.toFixed(3)} (${cramersMag(res.cramersV)})` : '';
          interpretation = `χ²(${res.dof}) = ${res.chiSquare.toFixed(3)}, p = ${res.pValue.toFixed(3)}${vPart} — ${sigText}`;
        } else {
          interpretation = 'Table too small for chi-square test (need at least 2×2)';
        }
        interpretation += _splitSuffix;

        addResult({
          analysisType: 'crosstabs',
          variablesUsed: [rowName, colName],
          tables,
          interpretation,
          methodsParagraph: apaCrosstabs(rowName, colName, res),
          chartData: null,
        });
      }
      onResultAdded();
    } catch (e) {
      console.error('[CrosstabsDialog] analysis error:', e);
      setError(e?.name === 'EngineError' ? e.message : t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  const varOptions = variables.map((v) => (
    <option key={v.id} value={v.id}>{v.label || v.name} ({t(`type.${v.type}`)})</option>
  ));

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('analyze.crosstabs')}</span>
          {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
        </div>

        <label style={fieldLabel}>{t('dialog.rowVariable')}</label>
        <select value={rowVarId} onChange={(e) => setRowVarId(e.target.value)} style={inputSel}>
          <option value="">—</option>
          {varOptions}
        </select>

        <label style={fieldLabel}>{t('dialog.colVariable')}</label>
        <select value={colVarId} onChange={(e) => setColVarId(e.target.value)} style={inputSel}>
          <option value="">—</option>
          {varOptions}
        </select>

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
          <button type="button" onClick={handleRun} disabled={running || !rowVarId || !colVarId} style={btnPrimary}>
            {running ? '...' : t('dialog.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>{t('dialog.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
