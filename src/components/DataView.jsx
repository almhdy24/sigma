import { lazy, useMemo, useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../store/datasetStore.js';
import useFilterStore from '../store/filterStore.js';
import useIsMobile from '../hooks/useIsMobile.js';
import MobileDataView from './DataView/MobileDataView.jsx';
import ExportDatasetButton from './Export/ExportDatasetButton.jsx';
import { detectOutliersIQR } from '../lib/stats/outliers.js';
import LazyBoundary from './LazyBoundary.jsx';
import { exportDatasetAsCsv, exportDatasetAsXlsx } from '../lib/exportDataset.js';

import DataGrid from './Grid/DataGrid.jsx';

// Dialogs are separate chunks (Compute pulls in mathjs, Import the file parsers).
const ImportDialog          = lazy(() => import('./Import/ImportDialog.jsx'));
const ComputeVariableDialog = lazy(() => import('./Transform/ComputeVariableDialog.jsx'));
const RecodeDialog          = lazy(() => import('./Transform/RecodeDialog.jsx'));
const SelectCasesDialog     = lazy(() => import('./Transform/SelectCasesDialog.jsx'));
const SplitFileDialog       = lazy(() => import('./Transform/SplitFileDialog.jsx'));


function DeleteCaseCellRenderer({ data, onDelete }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => onDelete(data.id)}
      title={t('deleteCaseTitle')}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 16, padding: 0 }}
    >
      ✕
    </button>
  );
}

const sheetItem = {
  display: 'flex', alignItems: 'center', gap: 14,
  width: '100%', padding: '0 20px', minHeight: 48,
  background: 'none', border: 'none',
  borderBottom: '1px solid var(--border)',
  cursor: 'pointer', fontSize: 14,
  color: 'var(--ink)', textAlign: 'start',
};

export default function DataView() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const variables  = useDatasetStore(s => s.variables);
  const cases      = useDatasetStore(s => s.cases);
  const addCase    = useDatasetStore(s => s.addCase);
  const updateCell = useDatasetStore(s => s.updateCell);
  const deleteCase = useDatasetStore(s => s.deleteCase);

  const canUndo = useDatasetStore(s => s.canUndo);
  const canRedo = useDatasetStore(s => s.canRedo);
  const undo    = useDatasetStore(s => s.undo);
  const redo    = useDatasetStore(s => s.redo);
  const activeFilter    = useFilterStore(s => s.activeFilter);
  const splitVariableId = useFilterStore(s => s.splitVariableId);
  const clearFilter     = useFilterStore(s => s.clearFilter);
  const clearSplit      = useFilterStore(s => s.clearSplit);

  const [importOpen, setImportOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [computeOpen, setComputeOpen]   = useState(false);
  const [recodeOpen, setRecodeOpen]     = useState(false);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [splitOpen, setSplitOpen]       = useState(false);
  const [moreOpen, setMoreOpen]         = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const rowData = useMemo(
    () => cases.map(c => ({ id: c.id, ...c.values })),
    [cases],
  );

  const handleDeleteCase = useCallback((id) => {
    if (window.confirm(t('confirmDeleteCase'))) deleteCase(id);
  }, [deleteCase, t]);

  const onEdit = useCallback((caseId, varId, raw) => {
    const variable = variables.find(v => v.id === varId);
    if (!variable) return;
    let value = raw === '' ? null : raw;
    if (variable.type === 'numeric' && value !== null) {
      const n = Number(String(value).trim().replace(',', '.'));
      value = Number.isFinite(n) ? n : null;
    }
    updateCell(caseId, varId, value);
  }, [variables, updateCell]);

  const columns = useMemo(() => [
    ...variables.map(v => {
      const labels = v.valueLabels ?? {};
      const hasLabels = Object.keys(labels).length > 0;
      return {
        id: v.id,
        header: v.label || v.name,
        type: v.type === 'numeric' ? 'number' : 'text',
        minWidth: 110,
        format: hasLabels
          ? (val) => (val == null || val === '' ? '' : labels[val] != null ? `${val} (${labels[val]})` : val)
          : undefined,
      };
    }),
    {
      id: '_deleteCase',
      header: '',
      width: 48,
      render: (row) => <DeleteCaseCellRenderer data={row} onDelete={handleDeleteCase} />,
    },
  ], [variables, handleDeleteCase]);

  if (variables.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: 'calc(100dvh - var(--header-h) - var(--safe-top))',
        color: 'var(--muted)', fontSize: 13, gap: 12,
      }}>
        <p style={{ margin: 0 }}>{t('noVariablesMessage')}</p>
        <button type="button" onClick={() => setImportOpen(true)}>
          ↓ {t('import.button')}
        </button>
        {importOpen && (
          <LazyBoundary overlay onClose={() => setImportOpen(false)}>
            <ImportDialog onClose={() => setImportOpen(false)} />
          </LazyBoundary>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: `calc(100dvh - var(--header-h) - var(--safe-top)${isMobile ? ' - var(--bottom-nav-h) - var(--safe-bottom)' : ''})`,
    }}>
      {/* Toolbar */}
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
                <button type="button" style={sheetItem}
                  onClick={() => { setComputeOpen(true); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>ƒ</span>{t('transform.computeVariable')}
                </button>
                <button type="button" style={sheetItem}
                  onClick={() => { setRecodeOpen(true); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>⇄</span>{t('transform.recode')}
                </button>
                <button type="button" style={sheetItem}
                  onClick={() => { setFilterOpen(true); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>⊘</span>{t('transform.selectCases')}
                </button>
                <button type="button" style={sheetItem}
                  onClick={() => { setSplitOpen(true); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>⊞</span>{t('transform.splitFile')}
                </button>
                <button type="button" style={sheetItem}
                  onClick={() => { setQualityOpen(true); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>◈</span>{t('quality.button')}
                </button>
                <button type="button" style={sheetItem}
                  onClick={() => { setImportOpen(true); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>↓</span>{t('import.button')}
                </button>
                <button type="button"
                  disabled={variables.length === 0 || cases.length === 0}
                  style={{ ...sheetItem, opacity: (variables.length === 0 || cases.length === 0) ? 0.4 : 1, cursor: (variables.length === 0 || cases.length === 0) ? 'default' : 'pointer' }}
                  onClick={() => { exportDatasetAsCsv(variables, cases).catch(() => window.alert(t('export.failed'))); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>↑</span>{t('export.csv')}
                </button>
                <button type="button"
                  disabled={variables.length === 0 || cases.length === 0}
                  style={{ ...sheetItem, opacity: (variables.length === 0 || cases.length === 0) ? 0.4 : 1, cursor: (variables.length === 0 || cases.length === 0) ? 'default' : 'pointer' }}
                  onClick={() => { exportDatasetAsXlsx(variables, cases, { rightToLeft: i18n.dir() === 'rtl' }).catch(() => window.alert(t('export.failed'))); setMoreOpen(false); }}>
                  <span style={{ width: 22, flexShrink: 0 }}>↑</span>{t('export.excel')}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* Left group */}
          <button type="button" onClick={() => addCase()}>
            {t('addCase')}
          </button>
          <button type="button" onClick={undo} disabled={!canUndo} title="Ctrl+Z" style={{ minWidth: 60, opacity: canUndo ? 1 : 0.4 }}>
            {t('undoButton')}
          </button>
          <button type="button" onClick={redo} disabled={!canRedo} title="Ctrl+Y" style={{ minWidth: 60, opacity: canRedo ? 1 : 0.4 }}>
            {t('redoButton')}
          </button>

          {/* Transform group */}
          <span style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', margin: '0 4px' }} />
          <button type="button" onClick={() => setComputeOpen(true)}>{t('transform.computeVariable')}</button>
          <button type="button" onClick={() => setRecodeOpen(true)}>{t('transform.recode')}</button>
          <button type="button" onClick={() => setFilterOpen(true)}>{t('transform.selectCases')}</button>
          <button type="button" onClick={() => setSplitOpen(true)}>{t('transform.splitFile')}</button>

          {/* Right group */}
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => setQualityOpen(true)}>
              {t('quality.button')}
            </button>
            <button type="button" onClick={() => setImportOpen(true)}>
              ↓ {t('import.button')}
            </button>
            <ExportDatasetButton />
          </div>
        </div>
      )}

      {/* Filter banner */}
      {activeFilter && (
        <div style={{ padding: '4px 12px', background: 'rgba(205,92,0,0.08)', borderBottom: '1px solid var(--sig)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--sig)' }}>
            {t('filter.analysisNotice', { n: cases.filter(c => {
              // compute live filtered count
              const { variableId, operator, value, value2 } = activeFilter;
              const varDef = variables.find(v => v.id === variableId);
              const raw = c.values[variableId];
              if (raw == null || raw === '') return false;
              const isNum = varDef?.type === 'numeric';
              const a = isNum ? Number(raw) : String(raw);
              const b = isNum ? Number(value) : String(value);
              switch (operator) {
                case 'equals':      return isNum ? a === b : String(raw) === String(value);
                case 'notEquals':   return isNum ? a !== b : String(raw) !== String(value);
                case 'greaterThan': return isNum && a > b;
                case 'lessThan':    return isNum && a < b;
                case 'between':     return isNum && a >= b && a <= Number(value2);
                default: return true;
              }
            }).length, total: cases.length })}
          </span>
          <button type="button" onClick={clearFilter} style={{ fontSize: 11, padding: '1px 8px', marginInlineStart: 4 }}>
            {t('dialog.filter.clearFilter')}
          </button>
        </div>
      )}

      {/* Split banner */}
      {splitVariableId && (
        <div style={{ padding: '4px 12px', background: 'rgba(31,95,166,0.07)', borderBottom: '1px solid var(--accent)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--accent)' }}>
            {t('split.activeNotice', { varName: variables.find(v => v.id === splitVariableId)?.label || variables.find(v => v.id === splitVariableId)?.name || '' })}
          </span>
          <button type="button" onClick={clearSplit} style={{ fontSize: 11, padding: '1px 8px', marginInlineStart: 4 }}>
            {t('dialog.split.clearSplit')}
          </button>
        </div>
      )}

      {isMobile ? (
        <MobileDataView
          variables={variables}
          cases={cases}
          addCase={addCase}
          updateCell={updateCell}
          deleteCase={deleteCase}
          t={t}
        />
      ) : (
        <DataGrid
          label={t('data')}
          rows={rowData}
          columns={columns}
          onEdit={onEdit}
          rowNumbers
          emptyText={t('dataGrid.empty', { defaultValue: '' })}
        />
      )}

      {importOpen && (
          <LazyBoundary overlay onClose={() => setImportOpen(false)}>
            <ImportDialog onClose={() => setImportOpen(false)} />
          </LazyBoundary>
        )}
      {qualityOpen && (
        <DataQualityModal variables={variables} cases={cases} t={t} onClose={() => setQualityOpen(false)} />
      )}
      {computeOpen && (
        <LazyBoundary overlay onClose={() => setComputeOpen(false)}>
          <ComputeVariableDialog onClose={() => setComputeOpen(false)} />
        </LazyBoundary>
      )}
      {recodeOpen && (
        <LazyBoundary overlay onClose={() => setRecodeOpen(false)}>
          <RecodeDialog onClose={() => setRecodeOpen(false)} />
        </LazyBoundary>
      )}
      {filterOpen && (
        <LazyBoundary overlay onClose={() => setFilterOpen(false)}>
          <SelectCasesDialog onClose={() => setFilterOpen(false)} cases={cases} variables={variables} />
        </LazyBoundary>
      )}
      {splitOpen && (
        <LazyBoundary overlay onClose={() => setSplitOpen(false)}>
          <SplitFileDialog onClose={() => setSplitOpen(false)} variables={variables} />
        </LazyBoundary>
      )}
    </div>
  );
}

function DataQualityModal({ variables, cases, t, onClose }) {
  const n = cases.length;

  const rows = useMemo(() => variables.map((v) => {
    const vals = cases.map((c) => c.values[v.id] ?? null);
    const missing = vals.filter((x) => x == null || x === '').length;
    const valid = n - missing;
    const pct = n > 0 ? ((missing / n) * 100).toFixed(1) : '0.0';
    const outliers = v.type === 'numeric' ? detectOutliersIQR(vals).count : '—';
    return { name: v.label || v.name, valid, missing, pct: Number(pct), outliers };
  }).sort((a, b) => b.pct - a.pct), [variables, cases, n]);

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
  };
  const panelStyle = {
    background: 'var(--surface)', borderRadius: 6, padding: 20,
    width: 'min(600px, 92vw)', maxHeight: '80vh',
    display: 'flex', flexDirection: 'column', gap: 12,
  };
  const thStyle = { textAlign: 'start', fontWeight: 600, fontSize: 12, color: 'var(--muted)', paddingBottom: 6, borderBottom: '1px solid var(--border)' };
  const tdStyle = { fontSize: 13, padding: '5px 0' };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>{t('quality.title')}</strong>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)' }}>✕</button>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          {t('quality.subtitle', { n, vars: variables.length })}
        </p>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>{t('quality.col.variable')}</th>
                <th style={{ ...thStyle, textAlign: 'end' }}>{t('quality.col.valid')}</th>
                <th style={{ ...thStyle, textAlign: 'end' }}>{t('quality.col.missing')}</th>
                <th style={{ ...thStyle, textAlign: 'end' }}>{t('quality.col.missingPct')}</th>
                <th style={{ ...thStyle, textAlign: 'end' }}>{t('quality.col.outliers')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={tdStyle}>{row.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'end' }}>{row.valid}</td>
                  <td style={{ ...tdStyle, textAlign: 'end', color: row.missing > 0 ? 'var(--error)' : 'inherit' }}>{row.missing}</td>
                  <td style={{ ...tdStyle, textAlign: 'end', color: row.pct > 10 ? 'var(--error)' : row.pct > 0 ? 'var(--sig)' : 'inherit' }}>{row.pct}%</td>
                  <td style={{ ...tdStyle, textAlign: 'end' }}>{row.outliers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
