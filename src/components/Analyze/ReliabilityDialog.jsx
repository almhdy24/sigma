import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { computeCronbachsAlpha } from '../../lib/stats/reliability.js';
import { ANALYSIS_PACKAGES, getPyodide } from '../../lib/pyodideLoader.js';
import { extractValues } from '../../lib/stats/extractValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, varList, varItem, varItemClass, footer,
  btnPrimary, btnSecondary, errorMsg,
} from './_dialogStyles.js';

export default function ReliabilityDialog({ onClose, onResultAdded, onHelp }) {
  const { t } = useTranslation();
  const variables = useDatasetStore((s) => s.variables);
  const cases = useDatasetStore((s) => s.cases);
  const addResult = useResultsStore((s) => s.addResult);

  const [selected, setSelected] = useState(new Set());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const numericVars = variables.filter((v) => v.type === 'numeric');

  const toggle = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  function alphaMag(a) {
    if (a >= 0.9) return t('dialog.reliability.mag.excellent');
    if (a >= 0.8) return t('dialog.reliability.mag.good');
    if (a >= 0.7) return t('dialog.reliability.mag.acceptable');
    if (a >= 0.6) return t('dialog.reliability.mag.questionable');
    if (a >= 0.5) return t('dialog.reliability.mag.poor');
    return t('dialog.reliability.mag.unacceptable');
  }

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide(ANALYSIS_PACKAGES.reliability);
      const selVars = variables.filter((v) => selected.has(v.id));
      const itemsData = selVars.map((v) => ({
        name: v.label || v.name,
        values: extractValues(cases, v),
      }));

      const res = await computeCronbachsAlpha(py, itemsData);

      const alphaTable = {
        title: t('dialog.reliability.alphaTitle'),
        columns: [t('table.statistic'), t('table.value')],
        rows: [
          [t('dialog.reliability.alpha'), res.alpha.toFixed(4)],
          [t('dialog.reliability.nItems'), res.itemCount],
          [t('dialog.reliability.n'), res.n],
          ['Interpretation', alphaMag(res.alpha)],
        ],
      };

      const itemTable = {
        title: t('dialog.reliability.itemTotalTitle'),
        columns: [
          t('dialog.reliability.col.item'),
          t('dialog.reliability.col.correlation'),
          t('dialog.reliability.col.alphaIfDeleted'),
        ],
        rows: res.itemTotalCorrelations.map((it) => [
          it.item,
          it.correlation.toFixed(4),
          it.alphaIfDeleted.toFixed(4),
        ]),
      };

      addResult({
        analysisType: 'reliability',
        variablesUsed: selVars.map((v) => v.label || v.name),
        tables: [alphaTable, itemTable],
        interpretation: `α = ${res.alpha.toFixed(4)} — ${alphaMag(res.alpha)} (${res.itemCount} items, N = ${res.n})`,
        methodsParagraph: null,
        chartData: null,
      });

      onResultAdded();
    } catch (e) {
      console.error('[ReliabilityDialog] error:', e);
      setError(e?.name === 'EngineError' ? e.message : t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  if (numericVars.length < 3) {
    return (
      <div style={overlay} className={overlayClass} onClick={onClose}>
        <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{t('dialog.reliability.title')}</span>
            {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
            {t('dialog.noNumericVars')}
          </p>
          <button type="button" onClick={onClose} style={btnSecondary}>
            {t('dialog.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <h3 style={dialogTitle}>{t('dialog.reliability.title')}</h3>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>
          {t('dialog.reliability.selectItems')} (min. 3)
        </p>

        <div style={varList}>
          {numericVars.map((v) => (
            <label key={v.id} style={varItem} className={varItemClass}>
              <input
                type="checkbox"
                checked={selected.has(v.id)}
                onChange={() => toggle(v.id)}
              />
              <span>{v.label || v.name}</span>
            </label>
          ))}
        </div>

        {error && <p style={errorMsg}>{error}</p>}

        <div style={footer}>
          <button
            type="button"
            onClick={handleRun}
            disabled={selected.size < 3 || running}
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
