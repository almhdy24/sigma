import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useFilterStore from '../../store/filterStore.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel,
} from '../Analyze/_dialogStyles.js';

export default function SplitFileDialog({ onClose, variables }) {
  const { t } = useTranslation();
  const splitVariableId = useFilterStore((s) => s.splitVariableId);
  const setSplit = useFilterStore((s) => s.setSplit);
  const clearSplit = useFilterStore((s) => s.clearSplit);

  const [selectedVarId, setSelectedVarId] = useState(splitVariableId ?? '');

  const activeVar = splitVariableId
    ? variables.find((v) => v.id === splitVariableId)
    : null;

  const handleApply = () => {
    if (selectedVarId) {
      setSplit(selectedVarId);
    } else {
      clearSplit();
    }
    onClose();
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <h3 style={dialogTitle}>{t('dialog.split.title')}</h3>

        <label style={fieldLabel}>{t('dialog.split.variable')}</label>
        <select
          value={selectedVarId}
          onChange={(e) => setSelectedVarId(e.target.value)}
          style={inputSel}
        >
          <option value="">{t('dialog.split.noSplit')}</option>
          {variables.map((v) => (
            <option key={v.id} value={v.id}>{v.label || v.name}</option>
          ))}
        </select>

        {activeVar && (
          <p style={{ fontSize: 12, color: 'var(--accent)', margin: '0 0 8px', lineHeight: 1.4 }}>
            {t('split.activeNotice', { varName: activeVar.label || activeVar.name })}
          </p>
        )}

        <div style={footer}>
          <button type="button" onClick={handleApply} style={btnPrimary}>
            {t('dialog.split.apply')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>
            {t('dialog.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
