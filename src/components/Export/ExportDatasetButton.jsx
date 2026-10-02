import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import { exportDatasetAsCsv, exportDatasetAsXlsx } from '../../lib/exportDataset.js';

const menuItem = {
  display: 'block',
  width: '100%',
  textAlign: 'start',
  padding: '8px 14px',
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 13,
  color: 'var(--ink)',
  transition: 'background 0.1s',
};

export default function ExportDatasetButton() {
  const { t } = useTranslation();
  const variables = useDatasetStore(s => s.variables);
  const cases     = useDatasetStore(s => s.cases);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const disabled = variables.length === 0 || cases.length === 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ↑ {t('export.button')} ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          insetInlineEnd: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(15, 30, 50, 0.15)',
          minWidth: 190,
          zIndex: 300,
          overflow: 'hidden',
        }}>
          <button
            type="button"
            style={menuItem}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-tint)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            onClick={() => {
              exportDatasetAsCsv(variables, cases);
              setOpen(false);
            }}
          >
            {t('export.csv')}
          </button>
          <button
            type="button"
            style={{ ...menuItem, borderTop: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-tint)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            onClick={() => {
              exportDatasetAsXlsx(variables, cases);
              setOpen(false);
            }}
          >
            {t('export.excel')}
          </button>
        </div>
      )}
    </div>
  );
}
