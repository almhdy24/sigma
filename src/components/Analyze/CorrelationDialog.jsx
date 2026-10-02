import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { ANALYSIS_PACKAGES, getPyodide } from '../../lib/pyodideLoader.js';
import { computeCorrelation } from '../../lib/stats/correlation.js';
import { apaCorrelation } from '../../lib/apaMethods.js';
import useFilterStore from '../../store/filterStore.js';
import { getAnalysisCaseGroups, applyFilter, extractValues } from '../../lib/getFilteredCaseValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, varList, varItem, varItemClass, footer,
  btnPrimary, btnSecondary, errorMsg,
} from './_dialogStyles.js';

const FMT = (v) => (v == null ? '—' : Number(v).toFixed(3));

function corrMag(r) {
  if (r == null) return '';
  const a = Math.abs(r);
  if (a >= 0.5) return 'large';
  if (a >= 0.3) return 'medium';
  if (a >= 0.1) return 'small';
  return 'negligible';
}

export default function CorrelationDialog({ onClose, onResultAdded, onHelp }) {
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

  const numericVars = variables.filter((v) => v.type === 'numeric');
  const [selected, setSelected] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (id) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleRun = async () => {
    if (selected.size < 2) return;
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide(ANALYSIS_PACKAGES.correlation);
      const _groups = getAnalysisCaseGroups(cases, activeFilter, variables, splitVar);
      for (const _group of _groups) {
        const cases = _group.cases;
        const _splitSuffix = _group.label != null
          ? ` [${splitVar?.label || splitVar?.name} = ${_group.label}]`
          : '';

        const selVars = variables.filter((v) => selected.has(v.id));
        const pairs = selVars.map((v) => ({
          name: v.label || v.name,
          values: extractValues(cases, v),
        }));
        const res = await computeCorrelation(py, pairs);
        const varNames = res.variables;

        const makeMatrix = (mat, label) => ({
          title: label,
          columns: [t('table.variable'), ...varNames],
          rows: varNames.map((vn, i) => [vn, ...varNames.map((_, j) => FMT(mat[i][j]))]),
        });

        const pairSummaries = [];
        for (let i = 0; i < varNames.length; i++) {
          for (let j = i + 1; j < varNames.length; j++) {
            const r = res.pearson.r[i][j];
            if (r != null) {
              pairSummaries.push(`${varNames[i]}–${varNames[j]}: r = ${FMT(r)} (${corrMag(r)})`);
            }
          }
        }
        addResult({
          analysisType: 'correlation',
          variablesUsed: varNames,
          tables: [
            makeMatrix(res.pearson.r, 'Pearson Correlation (r)'),
            makeMatrix(res.pearson.p, 'Pearson Significance (p)'),
            makeMatrix(res.spearman.r, 'Spearman Correlation (r)'),
            makeMatrix(res.spearman.p, 'Spearman Significance (p)'),
          ],
          interpretation: (pairSummaries.length > 0
            ? pairSummaries.join('; ')
            : `Pearson correlation matrix for ${varNames.length} variables`) + _splitSuffix,
          methodsParagraph: apaCorrelation(varNames, res.pearson.r, res.pearson.p),
          chartData: null,
        });
      }
      onResultAdded();
    } catch (e) {
      console.error('[CorrelationDialog] analysis error:', e);
      setError(e?.name === 'EngineError' ? e.message : t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  if (numericVars.length < 2) {
    return (
      <div style={overlay} className={overlayClass} onClick={onClose}>
        <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t('analyze.correlation')}</span>
            {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>{t('dialog.noNumericVars')}</p>
          <button type="button" onClick={onClose} style={btnSecondary}>{t('dialog.cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <h3 style={dialogTitle}>{t('analyze.correlation')}</h3>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>{t('dialog.selectVariables')} (min. 2)</p>
        <div style={varList}>
          {numericVars.map((v) => (
            <label key={v.id} style={varItem} className={varItemClass}>
              <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
              <span>{v.label || v.name}</span>
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
          <button type="button" onClick={handleRun} disabled={running || selected.size < 2} style={btnPrimary}>
            {running ? '...' : t('dialog.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>{t('dialog.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
