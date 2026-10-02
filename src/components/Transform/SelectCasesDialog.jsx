import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useFilterStore from '../../store/filterStore.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg,
} from '../Analyze/_dialogStyles.js';

const ALL_OPERATORS = ['equals', 'notEquals', 'greaterThan', 'lessThan', 'between'];
const BASIC_OPERATORS = ['equals', 'notEquals'];

function applyOperator(rawVal, operator, value, value2) {
  if (rawVal === null || rawVal === undefined) return false;
  const num = parseFloat(rawVal);
  const v1 = parseFloat(value);
  const v2 = parseFloat(value2);

  switch (operator) {
    case 'equals':
      return String(rawVal) === String(value);
    case 'notEquals':
      return String(rawVal) !== String(value);
    case 'greaterThan':
      return !isNaN(num) && !isNaN(v1) && num > v1;
    case 'lessThan':
      return !isNaN(num) && !isNaN(v1) && num < v1;
    case 'between':
      return !isNaN(num) && !isNaN(v1) && !isNaN(v2) && num >= v1 && num <= v2;
    default:
      return false;
  }
}

export default function SelectCasesDialog({ onClose, cases, variables }) {
  const { t } = useTranslation();
  const activeFilter = useFilterStore((s) => s.activeFilter);
  const setFilter = useFilterStore((s) => s.setFilter);
  const clearFilter = useFilterStore((s) => s.clearFilter);

  const [varId, setVarId] = useState(variables[0]?.id ?? '');
  const [operator, setOperator] = useState('equals');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [error, setError] = useState(null);

  const selectedVar = useMemo(() => variables.find((v) => v.id === varId), [variables, varId]);
  const isNumeric = selectedVar?.type === 'numeric';
  const availableOperators = isNumeric ? ALL_OPERATORS : BASIC_OPERATORS;

  const handleVarChange = (newVarId) => {
    setVarId(newVarId);
    const newVar = variables.find((v) => v.id === newVarId);
    const newIsNumeric = newVar?.type === 'numeric';
    if (!newIsNumeric && !BASIC_OPERATORS.includes(operator)) {
      setOperator('equals');
    }
  };

  const filteredCount = useMemo(() => {
    if (!varId || !value) return 0;
    return cases.filter((c) => applyOperator(c.values[varId], operator, value, value2)).length;
  }, [cases, varId, operator, value, value2]);

  const activeFilterSummary = useMemo(() => {
    if (!activeFilter) return null;
    const v = variables.find((vv) => vv.id === activeFilter.variableId);
    const varName = v ? (v.label || v.name) : activeFilter.variableId;
    const passing = cases.filter((c) =>
      applyOperator(c.values[activeFilter.variableId], activeFilter.operator, activeFilter.value, activeFilter.value2)
    ).length;
    return { varName, passing };
  }, [activeFilter, cases, variables]);

  const handleApply = () => {
    setError(null);
    if (!varId || !value) return;
    setFilter({
      variableId: varId,
      operator,
      value,
      value2: operator === 'between' ? value2 : undefined,
    });
    onClose();
  };

  const inputType = isNumeric ? 'number' : 'text';

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <h3 style={dialogTitle}>{t('dialog.filter.title')}</h3>

        <label style={fieldLabel}>{t('dialog.filter.variable')}</label>
        <select value={varId} onChange={(e) => handleVarChange(e.target.value)} style={inputSel}>
          {variables.map((v) => (
            <option key={v.id} value={v.id}>{v.label || v.name}</option>
          ))}
        </select>

        <label style={fieldLabel}>{t('dialog.filter.operator')}</label>
        <select value={operator} onChange={(e) => setOperator(e.target.value)} style={inputSel}>
          {availableOperators.map((op) => (
            <option key={op} value={op}>{t(`dialog.filter.op.${op}`)}</option>
          ))}
        </select>

        <label style={fieldLabel}>{t('dialog.filter.value')}</label>
        <input
          type={inputType}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={inputSel}
        />

        {operator === 'between' && (
          <>
            <label style={fieldLabel}>{t('dialog.filter.value2')}</label>
            <input
              type="number"
              value={value2}
              onChange={(e) => setValue2(e.target.value)}
              style={inputSel}
            />
          </>
        )}

        {varId && value && (
          <p style={{ fontSize: 12, color: 'var(--accent)', margin: '0 0 8px' }}>
            Will select: {filteredCount} of {cases.length} cases
          </p>
        )}

        {activeFilter && activeFilterSummary && (
          <div style={{ margin: '0 0 12px' }}>
            <p style={{ fontSize: 12, color: 'var(--sig)', margin: '0 0 6px', lineHeight: 1.4 }}>
              {t('dialog.filter.activeNotice')}: {activeFilterSummary.varName} — {activeFilterSummary.passing} of {cases.length} cases
            </p>
            <button
              type="button"
              onClick={() => { clearFilter(); }}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 3,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
            >
              {t('dialog.filter.clearFilter')}
            </button>
          </div>
        )}

        {error && <p style={errorMsg}>{error}</p>}

        <div style={footer}>
          <button
            type="button"
            disabled={!varId || !value}
            onClick={handleApply}
            style={btnPrimary}
          >
            {t('dialog.filter.apply')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>
            {t('dialog.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
