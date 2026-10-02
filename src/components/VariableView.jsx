import { lazy, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../store/datasetStore.js';
import useIsMobile from '../hooks/useIsMobile.js';
import ValueLabelsModal from './ValueLabelsModal.jsx';
import MobileVariableView from './VariableView/MobileVariableView.jsx';

const AgGridReact = lazy(() => import('../lib/agGridSetup.js').then((m) => ({ default: m.AgGridReact })));


function ValueLabelsCellRenderer({ data, onOpen }) {
  const { t } = useTranslation();
  const count = Object.keys(data.valueLabels ?? {}).length;
  return (
    <button type="button" onClick={() => onOpen(data)} style={{ fontSize: 12 }}>
      {count > 0 ? t('valueLabelsCount', { count }) : t('editValueLabels')}
    </button>
  );
}

function DeleteCellRenderer({ data, onDelete }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => onDelete(data.id)}
      title={t('deleteVariableTitle')}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 16, padding: 0 }}
    >
      ✕
    </button>
  );
}

function exportCodebook(variables, cases, t, i18n) {
  import('../lib/pdf/pdfExport.js')
    .then((m) => m.exportCodebookPdf(variables, cases, { t, i18n }))
    .catch(() => window.alert(t('results.pdfFontFailed')));
}

const sheetItem = {
  display: 'flex', alignItems: 'center', gap: 14,
  width: '100%', padding: '0 20px', minHeight: 48,
  background: 'none', border: 'none',
  borderBottom: '1px solid var(--border)',
  cursor: 'pointer', fontSize: 14,
  color: 'var(--ink)', textAlign: 'start',
};

export default function VariableView() {
  const { t, i18n } = useTranslation();
  const variables = useDatasetStore(s => s.variables);
  const cases = useDatasetStore(s => s.cases);
  const addVariable = useDatasetStore(s => s.addVariable);
  const updateVariable = useDatasetStore(s => s.updateVariable);
  const deleteVariable = useDatasetStore(s => s.deleteVariable);
  const canUndo = useDatasetStore(s => s.canUndo);
  const canRedo = useDatasetStore(s => s.canRedo);
  const undo    = useDatasetStore(s => s.undo);
  const redo    = useDatasetStore(s => s.redo);

  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen]         = useState(false);
  const [modalVariableId, setModalVariableId] = useState(null);
  const modalVariable = modalVariableId
    ? variables.find(v => v.id === modalVariableId) ?? null
    : null;

  const handleAddVariable = useCallback(() => {
    const names = new Set(variables.map(v => v.name));
    let n = 1;
    while (names.has(`var${n}`)) n++;
    addVariable({ name: `var${n}`, type: 'numeric', measure: 'scale' });
  }, [variables, addVariable]);

  const handleDelete = useCallback((id) => {
    if (window.confirm(t('confirmDeleteVariable'))) {
      deleteVariable(id);
    }
  }, [deleteVariable, t]);

  const openModal = useCallback((data) => setModalVariableId(data.id), []);
  const closeModal = useCallback(() => setModalVariableId(null), []);

  const onCellValueChanged = useCallback((params) => {
    const { data, newValue } = params;
    const colId = params.column.getColId();

    if (colId === 'missingValues') {
      const arr = String(newValue ?? '').split(',').map(s => s.trim()).filter(Boolean);
      updateVariable(data.id, { missingValues: arr });
    } else if (['name', 'label', 'type', 'measure'].includes(colId)) {
      updateVariable(data.id, { [colId]: newValue });
    }
  }, [updateVariable]);

  const columnDefs = useMemo(() => [
    { colId: 'name', field: 'name', headerName: t('col.name'), editable: true, width: 130 },
    { colId: 'label', field: 'label', headerName: t('col.label'), editable: true, flex: 1 },
    {
      colId: 'type', field: 'type', headerName: t('col.type'), editable: true, width: 130,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['numeric', 'string', 'categorical', 'date'] },
      valueFormatter: (p) => t(`type.${p.value}`) ?? p.value,
    },
    {
      colId: 'measure', field: 'measure', headerName: t('col.measure'), editable: true, width: 130,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['nominal', 'ordinal', 'scale'] },
      valueFormatter: (p) => t(`measure.${p.value}`) ?? p.value,
    },
    {
      colId: 'valueLabels', headerName: t('col.valueLabels'), editable: false, width: 130,
      cellRenderer: ValueLabelsCellRenderer,
      cellRendererParams: { onOpen: openModal },
    },
    {
      colId: 'missingValues', headerName: t('col.missingValues'), editable: true, flex: 1,
      valueGetter: (p) => (p.data.missingValues ?? []).join(', '),
    },
    {
      colId: '_delete', headerName: '', editable: false, sortable: false, filter: false, width: 52,
      cellRenderer: DeleteCellRenderer,
      cellRendererParams: { onDelete: handleDelete },
    },
  ], [t, openModal, handleDelete]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: `calc(100dvh - var(--header-h) - var(--safe-top)${isMobile ? ' - var(--bottom-nav-h) - var(--safe-bottom)' : ''})`,
    }}>
      {isMobile ? (
        <div style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            aria-label={t('moreActions', { defaultValue: 'More actions' })}
            onClick={() => setMoreOpen(true)}
            style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              cursor: 'pointer', width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, color: 'var(--ink)',
            }}
          >
            ⋮
          </button>
          {moreOpen && (
            <>
              <div
                role="presentation"
                onClick={() => setMoreOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.35)' }}
              />
              <div style={{
                position: 'fixed', bottom: 0, insetInline: 0, zIndex: 401,
                background: 'var(--surface)', borderRadius: '12px 12px 0 0',
                paddingBottom: 'calc(var(--bottom-nav-h) + var(--safe-bottom))',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
                maxHeight: '75dvh', overflowY: 'auto', overscrollBehavior: 'contain',
              }}>
                <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {t('moreActions', { defaultValue: 'More actions' })}
                  </span>
                </div>
                <button type="button" disabled={!canUndo}
                  style={{ ...sheetItem, opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'default' }}
                  onClick={() => { undo(); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>↩</span>{t('undoButton')}
                </button>
                <button type="button" disabled={!canRedo}
                  style={{ ...sheetItem, opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'default' }}
                  onClick={() => { redo(); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>↪</span>{t('redoButton')}
                </button>
                <button type="button"
                  disabled={variables.length === 0}
                  style={{ ...sheetItem, opacity: variables.length === 0 ? 0.4 : 1, cursor: variables.length === 0 ? 'default' : 'pointer' }}
                  onClick={() => { exportCodebook(variables, cases, t, i18n); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>↑</span>{t('codebook.exportButton')}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" onClick={handleAddVariable}>
              {t('addVariable')}
            </button>
            <button type="button" onClick={undo} disabled={!canUndo} title="Ctrl+Z" style={{ opacity: canUndo ? 1 : 0.4 }}>
              {t('undoButton')}
            </button>
            <button type="button" onClick={redo} disabled={!canRedo} title="Ctrl+Y" style={{ opacity: canRedo ? 1 : 0.4 }}>
              {t('redoButton')}
            </button>
            <button
              type="button"
              disabled={variables.length === 0}
              onClick={() => exportCodebook(variables, cases, t, i18n)}
              style={{ marginInlineStart: 'auto' }}
            >
              {t('codebook.exportButton')}
            </button>
          </div>
        </div>
      )}

      {isMobile ? (
        <MobileVariableView
          variables={variables}
          addVariable={addVariable}
          updateVariable={updateVariable}
          deleteVariable={deleteVariable}
          t={t}
          onOpenValueLabels={(id) => setModalVariableId(id)}
        />
      ) : (
        <div className="ag-theme-alpine" style={{ flex: 1, minHeight: 0 }}>
          <AgGridReact
            key={i18n.language}
            rowData={variables}
            columnDefs={columnDefs}
            onCellValueChanged={onCellValueChanged}
            getRowId={(p) => p.data.id}
            enableRtl={i18n.language === 'ar'}
          />
        </div>
      )}

      {modalVariable && (
        <ValueLabelsModal variable={modalVariable} onClose={closeModal} />
      )}
    </div>
  );
}
