import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../store/datasetStore.js';
import { overlay, modal, overlayClass, modalClass, dialogTitle, footer, btnPrimary, btnSecondary } from './Analyze/_dialogStyles.js';

export default function ValueLabelsModal({ variable, onClose }) {
  const { t } = useTranslation();
  const updateVariable = useDatasetStore(s => s.updateVariable);

  const [pairs, setPairs] = useState(() =>
    Object.entries(variable.valueLabels ?? {}).map(([value, label]) => ({ value, label }))
  );

  const updatePair = (i, field, val) =>
    setPairs(p => p.map((pair, j) => j === i ? { ...pair, [field]: val } : pair));

  const removePair = (i) =>
    setPairs(p => p.filter((_, j) => j !== i));

  const addPair = () =>
    setPairs(p => [...p, { value: '', label: '' }]);

  const handleSave = () => {
    const obj = {};
    for (const { value, label } of pairs) {
      if (value.trim() !== '') obj[value.trim()] = label;
    }
    updateVariable(variable.id, { valueLabels: obj });
    onClose();
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={e => e.stopPropagation()}>
        <h3 style={dialogTitle}>
          {t('valueLabelsModalTitle', { name: variable.name })}
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'start', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--muted)', width: '40%' }}>
                {t('col.rawValue')}
              </th>
              <th style={{ textAlign: 'start', padding: '4px 8px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 500, color: 'var(--muted)' }}>
                {t('col.label')}
              </th>
              <th style={{ width: 32, borderBottom: '1px solid var(--border)' }} />
            </tr>
          </thead>
          <tbody>
            {pairs.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: '12px 8px', color: 'var(--muted)', textAlign: 'center', fontSize: 13 }}>
                  {t('noLabelsYet')}
                </td>
              </tr>
            )}
            {pairs.map((pair, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 8px' }}>
                  <input
                    style={{ width: '100%' }}
                    value={pair.value}
                    onChange={e => updatePair(i, 'value', e.target.value)}
                  />
                </td>
                <td style={{ padding: '4px 8px' }}>
                  <input
                    style={{ width: '100%' }}
                    value={pair.label}
                    onChange={e => updatePair(i, 'label', e.target.value)}
                  />
                </td>
                <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => removePair(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button type="button" onClick={addPair} style={{ marginBottom: 4, fontSize: 13 }}>
          {t('addPair')}
        </button>

        <div style={footer}>
          <button type="button" onClick={handleSave} style={btnPrimary}>
            {t('save')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
