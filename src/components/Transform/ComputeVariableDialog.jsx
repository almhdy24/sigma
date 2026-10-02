import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { evaluate } from 'mathjs';
import useDatasetStore from '../../store/datasetStore.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg,
} from '../Analyze/_dialogStyles.js';

export default function ComputeVariableDialog({ onClose }) {
  const { t } = useTranslation();
  const variables = useDatasetStore((s) => s.variables);
  const cases = useDatasetStore((s) => s.cases);
  const addVariable = useDatasetStore((s) => s.addVariable);
  const updateCell = useDatasetStore((s) => s.updateCell);

  const numericVars = useMemo(() => variables.filter((v) => v.type === 'numeric'), [variables]);

  const [existingTarget, setExistingTarget] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [targetVarId, setTargetVarId] = useState(() => numericVars[0]?.id ?? '');
  const [formula, setFormula] = useState('');
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  const nameValid = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(targetName);
  const canRun = formula.trim() !== '' && (existingTarget ? !!targetVarId : nameValid);

  const insertVar = (varName) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = formula.slice(0, start);
    const after = formula.slice(end);
    const next = before + varName + after;
    setFormula(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + varName.length, start + varName.length);
    });
  };

  const handleRun = () => {
    setError(null);

    if (!existingTarget && !nameValid) {
      setError(t('dialog.compute.invalidName'));
      return;
    }

    let newVarId = null;
    if (!existingTarget) {
      newVarId = crypto.randomUUID();
      addVariable({ id: newVarId, name: targetName, label: targetName, type: 'numeric', measure: 'scale' });
    }

    const resolvedVarId = existingTarget ? targetVarId : newVarId;

    try {
      for (const c of cases) {
        const scope = {};
        for (const v of numericVars) {
          scope[v.name] = c.values[v.id] ?? 0;
        }
        const result = evaluate(formula, scope);
        updateCell(c.id, resolvedVarId, result);
      }
      onClose();
    } catch (e) {
      setError(`${t('dialog.compute.formulaError')}: ${e.message}`);
    }
  };

  const toggleStyle = (active) => ({
    padding: '5px 14px',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--ink)',
    border: '1px solid var(--accent)',
    borderRadius: 3,
    cursor: 'pointer',
  });

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <h3 style={dialogTitle}>{t('dialog.compute.title')}</h3>

        <span style={fieldLabel}>{t('dialog.compute.targetVarName')}</span>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button type="button" style={toggleStyle(!existingTarget)} onClick={() => setExistingTarget(false)}>
            {t('dialog.compute.newVar')}
          </button>
          <button type="button" style={toggleStyle(existingTarget)} onClick={() => setExistingTarget(true)}>
            {t('dialog.compute.existingVar')}
          </button>
        </div>

        {!existingTarget ? (
          <>
            <label style={fieldLabel}>{t('dialog.compute.targetVarName')}</label>
            <input
              type="text"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              style={inputSel}
            />
          </>
        ) : (
          <>
            <label style={fieldLabel}>{t('dialog.compute.targetVarSelect')}</label>
            <select
              value={targetVarId}
              onChange={(e) => setTargetVarId(e.target.value)}
              style={inputSel}
            >
              {numericVars.map((v) => (
                <option key={v.id} value={v.id}>{v.label || v.name}</option>
              ))}
            </select>
          </>
        )}

        <label style={fieldLabel}>{t('dialog.compute.formula')}</label>
        <textarea
          ref={textareaRef}
          rows={3}
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
        />

        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, marginTop: 0 }}>
          {t('dialog.compute.formulaHelp')}
        </p>

        <label style={fieldLabel}>{t('dialog.compute.insertVar')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          {numericVars.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => insertVar(v.name)}
              style={{
                padding: '3px 10px',
                fontSize: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              {v.name}
            </button>
          ))}
        </div>

        {error && <p style={errorMsg}>{error}</p>}

        <div style={footer}>
          <button type="button" disabled={!canRun} onClick={handleRun} style={btnPrimary}>
            {t('dialog.compute.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>
            {t('dialog.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
