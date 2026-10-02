import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg,
} from '../Analyze/_dialogStyles.js';

function makeRule() {
  return {
    id: crypto.randomUUID(),
    inputType: 'value',
    inputValue: '',
    rangeFrom: '',
    rangeTo: '',
    outputValue: '',
    outputLabel: '',
  };
}

export default function RecodeDialog({ onClose }) {
  const { t } = useTranslation();
  const variables = useDatasetStore((s) => s.variables);
  const cases = useDatasetStore((s) => s.cases);
  const addVariable = useDatasetStore((s) => s.addVariable);
  const updateCell = useDatasetStore((s) => s.updateCell);

  const [sourceVarId, setSourceVarId] = useState(variables[0]?.id ?? '');
  const [targetName, setTargetName] = useState('');
  const [targetLabel, setTargetLabel] = useState('');
  const [rules, setRules] = useState([makeRule()]);
  const [error, setError] = useState(null);

  const addRule = () => setRules((r) => [...r, makeRule()]);

  const removeRule = (id) => setRules((r) => r.filter((rule) => rule.id !== id));

  const updateRule = (id, patch) =>
    setRules((r) => r.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));

  const handleRun = () => {
    setError(null);

    if (!targetName || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(targetName)) {
      setError(t('dialog.compute.invalidName'));
      return;
    }

    if (rules.length === 0) return;

    const nonEmptyOutputs = rules.map((r) => r.outputValue).filter(Boolean);
    const allNumeric = nonEmptyOutputs.length > 0 && nonEmptyOutputs.every((v) => !isNaN(parseFloat(v)) && isFinite(v));
    const inferredType = allNumeric ? 'numeric' : 'categorical';

    const labelsMap = {};
    for (const rule of rules) {
      if (rule.outputValue !== '' && rule.outputLabel !== '') {
        labelsMap[rule.outputValue] = rule.outputLabel;
      }
    }

    const newVarId = crypto.randomUUID();
    addVariable({
      id: newVarId,
      name: targetName,
      label: targetLabel || targetName,
      type: inferredType,
      valueLabels: labelsMap,
      measure: 'nominal',
    });

    for (const c of cases) {
      const srcVal = c.values[sourceVarId];
      let matched = null;

      for (const rule of rules) {
        if (rule.inputType === 'value') {
          if (String(srcVal) === String(rule.inputValue)) {
            matched = rule.outputValue;
            break;
          }
        } else if (rule.inputType === 'range') {
          const num = parseFloat(srcVal);
          const from = parseFloat(rule.rangeFrom);
          const to = parseFloat(rule.rangeTo);
          if (!isNaN(num) && !isNaN(from) && !isNaN(to) && num >= from && num <= to) {
            matched = rule.outputValue;
            break;
          }
        } else if (rule.inputType === 'else') {
          matched = rule.outputValue;
          break;
        }
      }

      const finalVal = matched === null
        ? null
        : allNumeric
          ? parseFloat(matched)
          : matched;

      updateCell(c.id, newVarId, finalVal);
    }

    onClose();
  };

  const canRun = !!targetName && rules.length > 0;

  const ruleBoxStyle = {
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: 10,
    marginBottom: 8,
    background: 'var(--surface)',
  };

  const smallInput = {
    flex: 1,
    fontSize: 13,
    padding: '4px 8px',
    border: '1px solid var(--border)',
    borderRadius: 3,
    background: 'var(--surface)',
    color: 'var(--ink)',
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <h3 style={dialogTitle}>{t('dialog.recode.title')}</h3>

        <label style={fieldLabel}>{t('dialog.recode.sourceVar')}</label>
        <select value={sourceVarId} onChange={(e) => setSourceVarId(e.target.value)} style={inputSel}>
          {variables.map((v) => (
            <option key={v.id} value={v.id}>{v.label || v.name}</option>
          ))}
        </select>

        <label style={fieldLabel}>{t('dialog.recode.targetVar')}</label>
        <input
          type="text"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          style={inputSel}
        />

        <label style={fieldLabel}>{t('dialog.recode.targetLabel')}</label>
        <input
          type="text"
          value={targetLabel}
          onChange={(e) => setTargetLabel(e.target.value)}
          placeholder="optional"
          style={inputSel}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ ...fieldLabel, marginBottom: 0 }}>{t('dialog.recode.rules')}</label>
          <button
            type="button"
            onClick={addRule}
            style={{
              padding: '3px 10px',
              fontSize: 12,
              background: 'transparent',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            + Add
          </button>
        </div>

        {rules.map((rule) => (
          <div key={rule.id} style={ruleBoxStyle}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <select
                value={rule.inputType}
                onChange={(e) => updateRule(rule.id, { inputType: e.target.value })}
                style={{ fontSize: 12, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 3, background: 'var(--surface)', color: 'var(--ink)' }}
              >
                <option value="value">value</option>
                <option value="range">range</option>
                <option value="else">else</option>
              </select>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                style={{ padding: '2px 8px', fontSize: 12, background: 'transparent', border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            {rule.inputType === 'value' && (
              <input
                type="text"
                value={rule.inputValue}
                onChange={(e) => updateRule(rule.id, { inputValue: e.target.value })}
                placeholder={t('dialog.recode.inputValue')}
                style={{ ...smallInput, width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
              />
            )}

            {rule.inputType === 'range' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  type="text"
                  value={rule.rangeFrom}
                  onChange={(e) => updateRule(rule.id, { rangeFrom: e.target.value })}
                  placeholder="From"
                  style={smallInput}
                />
                <input
                  type="text"
                  value={rule.rangeTo}
                  onChange={(e) => updateRule(rule.id, { rangeTo: e.target.value })}
                  placeholder="To"
                  style={smallInput}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={rule.outputValue}
                onChange={(e) => updateRule(rule.id, { outputValue: e.target.value })}
                placeholder="Output value"
                style={smallInput}
              />
              <input
                type="text"
                value={rule.outputLabel}
                onChange={(e) => updateRule(rule.id, { outputLabel: e.target.value })}
                placeholder="Label (opt)"
                style={smallInput}
              />
            </div>
          </div>
        ))}

        {error && <p style={errorMsg}>{error}</p>}

        <div style={footer}>
          <button type="button" disabled={!canRun} onClick={handleRun} style={btnPrimary}>
            {t('dialog.recode.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>
            {t('dialog.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
