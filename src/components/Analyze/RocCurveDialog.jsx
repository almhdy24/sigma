import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { computeROC } from '../../lib/stats/roc.js';
import { ANALYSIS_PACKAGES, getPyodide } from '../../lib/pyodideLoader.js';
import { extractValues } from '../../lib/stats/extractValues.js';
import {
  overlay, modal, overlayClass, modalClass, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg,
} from './_dialogStyles.js';

export default function RocCurveDialog({ onClose, onResultAdded, onHelp }) {
  const { t } = useTranslation();
  const variables = useDatasetStore((s) => s.variables);
  const cases = useDatasetStore((s) => s.cases);
  const addResult = useResultsStore((s) => s.addResult);

  const [scoreVarId, setScoreVarId] = useState('');
  const [refVarId, setRefVarId] = useState('');
  const [refPositive, setRefPositive] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const numericVars = variables.filter((v) => v.type === 'numeric');

  const refVar = variables.find((v) => v.id === refVarId);

  const refVarValues = useMemo(() => {
    if (!refVar) return [];
    return [...new Set(extractValues(cases, refVar).filter((x) => x != null).map(String))].sort();
  }, [cases, refVar]);

  const canRun =
    scoreVarId &&
    refVarId &&
    scoreVarId !== refVarId &&
    refPositive &&
    refVarValues.length === 2;

  const handleRefVarChange = (e) => {
    setRefVarId(e.target.value);
    setRefPositive('');
  };

  function aucMag(auc) {
    if (auc >= 0.9) return t('dialog.roc.aucMag.excellent');
    if (auc >= 0.8) return t('dialog.roc.aucMag.good');
    if (auc >= 0.7) return t('dialog.roc.aucMag.fair');
    if (auc >= 0.6) return t('dialog.roc.aucMag.poor');
    return t('dialog.roc.aucMag.fail');
  }

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide(ANALYSIS_PACKAGES.roc);
      const scoreVar = variables.find((v) => v.id === scoreVarId);
      const refVarDef = variables.find((v) => v.id === refVarId);
      const scoreVals = extractValues(cases, scoreVar);
      const refVals = extractValues(cases, refVarDef).map((v) =>
        v == null ? null : String(v)
      );

      let res;
      try {
        res = await computeROC(py, scoreVals, refVals, refPositive);
      } catch (e) {
        if (e === 'roc.tooFewPairs') {
          setError(t('dialog.roc.tooFewPairs'));
          return;
        }
        throw e;
      }

      const aucTable = {
        title: t('dialog.roc.aucTitle'),
        columns: [t('table.statistic'), t('table.value')],
        rows: [
          ['N', res.n],
          ['AUC', res.auc.toFixed(4)],
          ['Interpretation', aucMag(res.auc)],
        ],
      };

      const rocPointsTable = {
        title: 'ROC Curve Points',
        columns: ['FPR', 'TPR', t('table.threshold')],
        rows: res.points.map((p) => [
          p.fpr.toFixed(4),
          p.tpr.toFixed(4),
          p.threshold == null ? '—' : p.threshold.toFixed(4),
        ]),
      };

      addResult({
        analysisType: 'roc',
        variablesUsed: [scoreVar.label || scoreVar.name, refVarDef.label || refVarDef.name],
        tables: [aucTable, rocPointsTable],
        interpretation: `AUC = ${res.auc.toFixed(4)} — ${aucMag(res.auc)} (N = ${res.n})`,
        methodsParagraph: null,
        chartData: { type: 'roc', points: res.points, auc: res.auc },
      });

      onResultAdded();
    } catch (e) {
      console.error('[RocCurveDialog] error:', e);
      setError(e?.name === 'EngineError' ? e.message : t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--ink)', paddingBottom: 14, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('dialog.roc.title')}</span>
          {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
        </div>

        <label style={fieldLabel}>{t('dialog.roc.scoreVar')}</label>
        <select
          value={scoreVarId}
          onChange={(e) => setScoreVarId(e.target.value)}
          style={inputSel}
        >
          <option value="">—</option>
          {numericVars.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label || v.name}
            </option>
          ))}
        </select>

        <label style={fieldLabel}>{t('dialog.roc.refVar')}</label>
        <select
          value={refVarId}
          onChange={handleRefVarChange}
          style={inputSel}
        >
          <option value="">—</option>
          {variables.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label || v.name}
            </option>
          ))}
        </select>

        {refVarId && refVarValues.length === 2 && (
          <>
            <label style={fieldLabel}>{t('dialog.roc.refPositive')}</label>
            <select
              value={refPositive}
              onChange={(e) => setRefPositive(e.target.value)}
              style={inputSel}
            >
              <option value="">—</option>
              {refVarValues.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </>
        )}

        {refVarId && refVarValues.length !== 2 && (
          <p style={errorMsg}>{t('dialog.diagnostic.needTwoValues')}</p>
        )}

        {error && <p style={errorMsg}>{error}</p>}

        <div style={footer}>
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun || running}
            style={btnPrimary}
          >
            {running ? '...' : t('dialog.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>
            {t('dialog.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
