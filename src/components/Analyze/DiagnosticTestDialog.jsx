import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { computeDiagnosticStats } from '../../lib/stats/diagnostic.js';
import { extractValues } from '../../lib/stats/extractValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, varList, varItem, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg,
} from './_dialogStyles.js';

const fmt = (v) => (v == null ? '—' : Number(v).toFixed(3));

export default function DiagnosticTestDialog({ onClose, onResultAdded, onHelp }) {
  const { t } = useTranslation();
  const variables = useDatasetStore((s) => s.variables);
  const cases = useDatasetStore((s) => s.cases);
  const addResult = useResultsStore((s) => s.addResult);

  const [testVarId, setTestVarId] = useState('');
  const [testPositive, setTestPositive] = useState('');
  const [refVarId, setRefVarId] = useState('');
  const [refPositive, setRefPositive] = useState('');
  const [error, setError] = useState(null);

  const testVar = variables.find((v) => v.id === testVarId);
  const refVar = variables.find((v) => v.id === refVarId);

  const testVarValues = useMemo(() => {
    if (!testVar) return [];
    return [...new Set(extractValues(cases, testVar).filter((x) => x != null).map(String))].sort();
  }, [cases, testVar]);

  const refVarValues = useMemo(() => {
    if (!refVar) return [];
    return [...new Set(extractValues(cases, refVar).filter((x) => x != null).map(String))].sort();
  }, [cases, refVar]);

  const canRun =
    testVarId &&
    refVarId &&
    testVarId !== refVarId &&
    testPositive &&
    refPositive &&
    testVarValues.length === 2 &&
    refVarValues.length === 2;

  const handleTestVarChange = (e) => {
    setTestVarId(e.target.value);
    setTestPositive('');
  };

  const handleRefVarChange = (e) => {
    setRefVarId(e.target.value);
    setRefPositive('');
  };

  const handleRun = () => {
    setError(null);
    try {
      const testVals = extractValues(cases, testVar).map(String);
      const refVals = extractValues(cases, refVar).map(String);
      const res = computeDiagnosticStats(testVals, refVals, testPositive, refPositive);

      const { tp, fp, fn, tn } = res.confusionMatrix;

      const contingencyTable = {
        title: t('dialog.diagnostic.contingencyTitle'),
        columns: ['', 'Ref +', 'Ref −', 'Total'],
        rows: [
          ['Test +', tp, fp, tp + fp],
          ['Test −', fn, tn, fn + tn],
          ['Total', tp + fn, fp + tn, res.n],
        ],
      };

      const metricsTable = {
        title: t('dialog.diagnostic.statsTitle'),
        columns: [
          t('dialog.diagnostic.col.metric'),
          t('dialog.diagnostic.col.value95ci'),
        ],
        rows: [
          [
            t('dialog.diagnostic.sensitivity'),
            `${fmt(res.sensitivity.value)} (${fmt(res.sensitivity.ciLow)}–${fmt(res.sensitivity.ciHigh)})`,
          ],
          [
            t('dialog.diagnostic.specificity'),
            `${fmt(res.specificity.value)} (${fmt(res.specificity.ciLow)}–${fmt(res.specificity.ciHigh)})`,
          ],
          [
            t('dialog.diagnostic.ppv'),
            `${fmt(res.ppv.value)} (${fmt(res.ppv.ciLow)}–${fmt(res.ppv.ciHigh)})`,
          ],
          [
            t('dialog.diagnostic.npv'),
            `${fmt(res.npv.value)} (${fmt(res.npv.ciLow)}–${fmt(res.npv.ciHigh)})`,
          ],
          [
            t('dialog.diagnostic.accuracy'),
            `${fmt(res.accuracy.value)} (${fmt(res.accuracy.ciLow)}–${fmt(res.accuracy.ciHigh)})`,
          ],
          [
            t('dialog.diagnostic.plr'),
            res.plr.value == null ? '—' : Number(res.plr.value).toFixed(2),
          ],
          [
            t('dialog.diagnostic.nlr'),
            res.nlr.value == null ? '—' : Number(res.nlr.value).toFixed(2),
          ],
        ],
      };

      addResult({
        analysisType: 'diagnostic',
        variablesUsed: [testVar.label || testVar.name, refVar.label || refVar.name],
        tables: [contingencyTable, metricsTable],
        interpretation: `Sensitivity = ${fmt(res.sensitivity.value)}, Specificity = ${fmt(res.specificity.value)}, AUC-like accuracy = ${fmt(res.accuracy.value)} — N = ${res.n}`,
        methodsParagraph: null,
        chartData: null,
      });

      onResultAdded();
    } catch (e) {
      console.error('[DiagnosticTestDialog] error:', e);
      setError(t('dialog.analysisError'));
    }
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('dialog.diagnostic.title')}</span>
          {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
        </div>

        <label style={fieldLabel}>{t('dialog.diagnostic.testVar')}</label>
        <select
          value={testVarId}
          onChange={handleTestVarChange}
          style={inputSel}
        >
          <option value="">—</option>
          {variables.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label || v.name}
            </option>
          ))}
        </select>

        {testVarId && testVarValues.length === 2 && (
          <>
            <label style={fieldLabel}>{t('dialog.diagnostic.testPositive')}</label>
            <select
              value={testPositive}
              onChange={(e) => setTestPositive(e.target.value)}
              style={inputSel}
            >
              <option value="">—</option>
              {testVarValues.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </>
        )}

        {testVarId && testVarValues.length !== 2 && (
          <p style={errorMsg}>{t('dialog.diagnostic.needTwoValues')}</p>
        )}

        <label style={fieldLabel}>{t('dialog.diagnostic.refVar')}</label>
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
            <label style={fieldLabel}>{t('dialog.diagnostic.refPositive')}</label>
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
            disabled={!canRun}
            style={btnPrimary}
          >
            {t('dialog.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>
            {t('dialog.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
