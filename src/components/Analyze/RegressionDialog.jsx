import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { ANALYSIS_PACKAGES, getPyodide } from '../../lib/pyodideLoader.js';
import { computeLinearRegression } from '../../lib/stats/regression.js';
import { apaRegression } from '../../lib/apaMethods.js';
import useFilterStore from '../../store/filterStore.js';
import { getAnalysisCaseGroups, applyFilter, extractValues } from '../../lib/getFilteredCaseValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, varList, varItem, varItemClass, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg,
} from './_dialogStyles.js';

const FMT4 = (v) => (v == null ? '—' : Number(v).toFixed(4));
const fmtP = (p) => (p == null ? '—' : p < 0.001 ? '< 0.001' : FMT4(p));

export default function RegressionDialog({ onClose, onResultAdded, onHelp }) {
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
  const [depVarId, setDepVarId] = useState('');
  const [selectedIndep, setSelectedIndep] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const toggleIndep = (id) =>
    setSelectedIndep((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const availableIndep = numericVars.filter((v) => v.id !== depVarId);
  const canRun = !running && !!depVarId && selectedIndep.size > 0;

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide(ANALYSIS_PACKAGES.regression);
      const _groups = getAnalysisCaseGroups(cases, activeFilter, variables, splitVar);
      for (const _group of _groups) {
        const cases = _group.cases;
        const _splitSuffix = _group.label != null
          ? ` [${splitVar?.label || splitVar?.name} = ${_group.label}]`
          : '';

        const depVar = variables.find((v) => v.id === depVarId);
        const indepVars = numericVars.filter((v) => selectedIndep.has(v.id));

        const allVars = [depVar, ...indepVars];
        const allArrays = allVars.map((v) => extractValues(cases, v));

        const validIndices = [];
        for (let i = 0; i < cases.length; i++) {
          if (allArrays.every((arr) => arr[i] !== null)) validIndices.push(i);
        }

        if (validIndices.length < allVars.length + 1) {
          throw new Error(t('dialog.regression.notEnoughCases'));
        }

        const depValues = validIndices.map((i) => allArrays[0][i]);
        const independentVarsData = indepVars.map((v, vi) => ({
          name: v.label || v.name,
          values: validIndices.map((i) => allArrays[vi + 1][i]),
        }));

        const res = await computeLinearRegression(py, depValues, independentVarsData);

        const depName = depVar.label || depVar.name;
        const rPct = (res.rSquared * 100).toFixed(1);
        const fSig = res.fPValue < 0.05;

        const modelTable = {
          title: t('dialog.regression.modelTitle'),
          columns: [t('dialog.regression.col.statistic'), t('dialog.regression.col.value')],
          rows: [
            ['N', res.n],
            [t('dialog.regression.rSquared'), FMT4(res.rSquared)],
            [t('dialog.regression.adjRSquared'), FMT4(res.adjustedRSquared)],
            [t('dialog.regression.fStatistic'), `${FMT4(res.fStatistic)} (p = ${fmtP(res.fPValue)})`],
            [t('dialog.regression.residualStdError'), `${FMT4(res.residualStdError)} (df = ${res.dfResidual})`],
          ],
        };

        const coefTable = {
          title: t('dialog.regression.coeffTitle'),
          columns: [
            t('dialog.regression.col.predictor'), 'B',
            t('dialog.regression.col.se'), 't', 'p',
            t('dialog.regression.col.ciLow'), t('dialog.regression.col.ciHigh'),
            'VIF',
          ],
          rows: (res.coefficients ?? []).map((c) => [
            c.name, FMT4(c.coefficient), FMT4(c.stdError),
            FMT4(c.tStatistic), fmtP(c.pValue), FMT4(c.ciLow), FMT4(c.ciHigh),
            c.vif == null ? '—' : `${FMT4(c.vif)}${c.vif > 10 ? ' ⚠' : ''}`,
          ]),
        };

        const interpretation =
          t('dialog.regression.explains', { rPct, depName }) +
          ` (R² = ${FMT4(res.rSquared)}, p ${res.fPValue < 0.001 ? '< 0.001' : '= ' + FMT4(res.fPValue)}) — ` +
          (fSig ? t('dialog.regression.sig') : t('dialog.regression.nsig'));

        const highVifPredictors = (res.coefficients ?? []).filter(c => c.vif != null && c.vif > 10).map(c => c.name);
        const vifWarning = highVifPredictors.length > 0
          ? ` ${t('dialog.regression.vifWarning', { vars: highVifPredictors.join(', ') })}`
          : '';

        addResult({
          analysisType: 'regression',
          variablesUsed: [depName, ...indepVars.map((v) => v.label || v.name)],
          tables: [modelTable, coefTable],
          interpretation: interpretation + vifWarning + _splitSuffix,
          methodsParagraph: apaRegression(depName, indepVars.map((v) => v.label || v.name), res),
          chartData: null,
        });
      }
      onResultAdded();
    } catch (e) {
      console.error('[RegressionDialog] analysis error:', e);
      setError(e?.name === 'EngineError' ? e.message : t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('analyze.regression')}</span>
          {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
        </div>

        <label style={fieldLabel}>{t('dialog.regression.dependentVar')}</label>
        <select
          value={depVarId}
          onChange={(e) => { setDepVarId(e.target.value); setSelectedIndep(new Set()); }}
          style={inputSel}
        >
          <option value="">—</option>
          {numericVars.map((v) => (
            <option key={v.id} value={v.id}>{v.label || v.name}</option>
          ))}
        </select>

        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>{t('dialog.regression.independentVars')}</p>
        <div style={varList}>
          {availableIndep.length === 0 ? (
            <p style={{ padding: '4px 10px', fontSize: 13, color: 'var(--muted)' }}>
              {t('dialog.regression.noIndepVars')}
            </p>
          ) : (
            availableIndep.map((v) => (
              <label key={v.id} style={varItem} className={varItemClass}>
                <input
                  type="checkbox"
                  checked={selectedIndep.has(v.id)}
                  onChange={() => toggleIndep(v.id)}
                />
                <span>{v.label || v.name}</span>
              </label>
            ))
          )}
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
          <button type="button" onClick={handleRun} disabled={!canRun} style={btnPrimary}>
            {running ? '...' : t('dialog.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>{t('dialog.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
