import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import useDatasetStore from '../../store/datasetStore.js';
import {
  overlay, dialogTitle, footer,
  btnPrimary, btnSecondary, errorMsg,
} from '../Analyze/_dialogStyles.js';

// ── Helpers ───────────────────────────────────────────────────────

function sanitizeName(header) {
  let s = String(header).replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^[0-9]/.test(s)) s = '_' + s;
  return s.slice(0, 32) || 'var1';
}

function suggestType(values) {
  const nonEmpty = values.filter(
    v => v !== null && v !== undefined && String(v).trim() !== '',
  );
  if (nonEmpty.length === 0) return 'string';
  const allNumeric = nonEmpty.every(v => !isNaN(Number(String(v).trim())));
  if (allNumeric) return 'numeric';
  const distinct = new Set(nonEmpty.map(v => String(v))).size;
  return distinct <= 10 ? 'categorical' : 'string';
}

async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ meta, data, errors }) => {
          if (data.length === 0 && errors.length > 0) {
            reject(new Error(errors[0].message));
          } else {
            resolve({ headers: meta.fields ?? [], rows: data });
          }
        },
        error: (err) => reject(new Error(String(err.message ?? err))),
      });
    });
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (!raw.length) throw new Error('Empty sheet');
          const headers = raw[0].map(h => String(h ?? ''));
          const rows = raw.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
            return obj;
          });
          resolve({ headers, rows });
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }
  throw new Error('unsupported');
}

function buildInitialMappings(headers, rows, existingVars) {
  return headers.map(header => {
    const colVals = rows.map(r => r[header]);
    const suggestedType = suggestType(colVals);
    const suggestedName = sanitizeName(header);
    const match = existingVars.find(v => v.name === suggestedName);
    return {
      action: match ? 'map' : 'create',
      existingVarId: match?.id ?? existingVars[0]?.id ?? null,
      newVarName: suggestedName,
      newVarLabel: header,
      newVarType: suggestedType,
    };
  });
}

// ── Table cell styles ─────────────────────────────────────────────

const thCell = {
  padding: '5px 10px',
  fontWeight: 600,
  textAlign: 'start',
  color: 'var(--ink)',
  background: 'var(--accent-tint)',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
  fontSize: 12,
};

const tdCell = {
  padding: '4px 8px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--ink)',
  verticalAlign: 'middle',
  fontSize: 12,
};

// ── Component ─────────────────────────────────────────────────────

export default function ImportDialog({ onClose }) {
  const { t } = useTranslation();
  const variables     = useDatasetStore(s => s.variables);
  const addVariable   = useDatasetStore(s => s.addVariable);
  const batchAddCases = useDatasetStore(s => s.batchAddCases);
  const reset         = useDatasetStore(s => s.reset);

  const [step,          setStep]          = useState(1);
  const [dragOver,      setDragOver]      = useState(false);
  const [parsing,       setParsing]       = useState(false);
  const [parseError,    setParseError]    = useState(null);
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows,    setParsedRows]    = useState([]);
  const [fileName,      setFileName]      = useState('');
  const [mappings,      setMappings]      = useState([]);
  const [importMode,    setImportMode]    = useState('replace');
  const [importing,     setImporting]     = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    setParseError(null);
    setParsing(true);
    try {
      const { headers, rows } = await parseFile(file);
      if (headers.length === 0) throw new Error('No columns found in file');
      setParsedHeaders(headers);
      setParsedRows(rows);
      setFileName(file.name);
      setMappings(buildInitialMappings(headers, rows, variables));
      setStep(2);
    } catch (err) {
      setParseError(
        err.message === 'unsupported'
          ? t('import.unsupportedType')
          : t('import.parseError', { error: err.message }),
      );
    } finally {
      setParsing(false);
    }
  }, [variables, t]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const updateMapping = useCallback((i, patch) => {
    setMappings(ms => ms.map((m, idx) => idx === i ? { ...m, ...patch } : m));
  }, []);

  const executeImport = useCallback(async () => {
    setImporting(true);
    await new Promise(r => setTimeout(r, 0)); // let "Importing…" render

    const newVarIds = {};
    for (let i = 0; i < parsedHeaders.length; i++) {
      if (mappings[i].action === 'create') newVarIds[i] = crypto.randomUUID();
    }

    if (importMode === 'replace') reset();

    for (let i = 0; i < parsedHeaders.length; i++) {
      const m = mappings[i];
      if (m.action === 'create') {
        addVariable({
          id: newVarIds[i],
          name: m.newVarName,
          label: m.newVarLabel,
          type: m.newVarType,
          measure: m.newVarType === 'numeric' ? 'scale' : 'nominal',
        });
      }
    }

    // Read fresh store state after mutations
    const currentVars = useDatasetStore.getState().variables;

    const caseValues = parsedRows.map(row => {
      const vals = {};
      for (let i = 0; i < parsedHeaders.length; i++) {
        const m = mappings[i];
        if (m.action === 'skip') continue;
        const varId   = m.action === 'create' ? newVarIds[i] : m.existingVarId;
        const varType = m.action === 'create'
          ? m.newVarType
          : currentVars.find(v => v.id === m.existingVarId)?.type ?? 'string';
        const raw = row[parsedHeaders[i]];
        if (varType === 'numeric') {
          const n = Number(raw);
          vals[varId] = (raw === '' || raw === null || raw === undefined || isNaN(n)) ? null : n;
        } else {
          vals[varId] = (raw === '' || raw === null || raw === undefined) ? null : String(raw);
        }
      }
      return vals;
    });

    batchAddCases(caseValues);
    onClose();
  }, [
    mappings, importMode, parsedHeaders, parsedRows,
    addVariable, batchAddCases, reset, onClose,
  ]);

  const hasNewVars = mappings.some(m => m.action === 'create');
  const activeCols = mappings.filter(m => m.action !== 'skip').length;

  const modalStyle = {
    background: 'var(--surface)',
    borderRadius: 4,
    padding: '20px 24px 24px',
    width: '100%',
    maxWidth: step === 2 ? 'min(860px, 96vw)' : 520,
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(15, 30, 50, 0.22)',
  };

  const stepKeys = ['import.step1.title', 'import.step2.title', 'import.step3.title'];

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <h3 style={dialogTitle}>{t('import.title')}</h3>

        {/* Step pills */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {stepKeys.map((key, idx) => {
            const n = idx + 1;
            return (
              <span key={n} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                fontWeight: step === n ? 600 : 400,
                background: step === n ? 'var(--accent)' : step > n ? 'var(--accent-tint)' : 'transparent',
                color: step === n ? '#fff' : step > n ? 'var(--accent)' : 'var(--muted)',
                border: step === n ? 'none' : '1px solid var(--border)',
              }}>
                {n}. {t(key)}
              </span>
            );
          })}
        </div>

        {/* ── Step 1: File select ───────────────────────────────── */}
        {step === 1 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDragEnter={() => setDragOver(true)}
              onClick={() => !parsing && fileInputRef.current?.click()}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !parsing && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6,
                background: dragOver ? 'var(--accent-tint)' : 'transparent',
                padding: '48px 24px',
                textAlign: 'center',
                cursor: parsing ? 'default' : 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                marginBottom: 16,
                userSelect: 'none',
              }}
            >
              {parsing ? (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                  {t('import.parsing')}
                </p>
              ) : (
                <>
                  <p style={{
                    margin: '0 0 6px',
                    color: dragOver ? 'var(--accent)' : 'var(--ink)',
                    fontSize: 13, fontWeight: 500,
                  }}>
                    {dragOver ? t('import.dropzoneActive') : t('import.dropzone')}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
                    {t('import.accepts')}
                  </p>
                </>
              )}
            </div>

            {parseError && <p style={errorMsg}>{parseError}</p>}

            <div style={footer}>
              <button type="button" style={btnSecondary} onClick={onClose}>
                {t('dialog.cancel')}
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Preview + mapping ─────────────────────────── */}
        {step === 2 && (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)' }}>
              {t('import.fileLoaded', {
                name: fileName,
                rows: parsedRows.length,
                cols: parsedHeaders.length,
              })}
            </p>

            {/* Preview */}
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
              {t('import.preview')}
            </p>
            <div style={{
              overflowX: 'auto', marginBottom: 20,
              border: '1px solid var(--border)', borderRadius: 3,
            }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr>
                    {parsedHeaders.map((h, i) => (
                      <th key={i} style={thCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 10).map((row, ri) => (
                    <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--surface)' : '#f6f9fc' }}>
                      {parsedHeaders.map((h, ci) => (
                        <td key={ci} style={{ ...tdCell, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Column mapping */}
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
              {t('import.col.action')}
            </p>
            <div style={{
              border: '1px solid var(--border)', borderRadius: 3,
              overflowX: 'auto', marginBottom: 4,
              maxHeight: 280, overflowY: 'auto',
            }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={thCell}>{t('import.col.header')}</th>
                    <th style={thCell}>{t('import.col.action')}</th>
                    <th style={thCell}>{t('import.col.variable')}</th>
                    <th style={thCell}>{t('import.col.type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedHeaders.map((header, i) => {
                    const m = mappings[i];
                    if (!m) return null;
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : '#f6f9fc' }}>
                        <td style={{ ...tdCell, fontFamily: 'monospace', fontSize: 11 }}>{header}</td>
                        <td style={tdCell}>
                          <select
                            value={m.action}
                            onChange={e => updateMapping(i, { action: e.target.value })}
                            style={{ fontSize: 12, padding: '2px 4px' }}
                          >
                            <option value="skip">{t('import.action.skip')}</option>
                            {variables.length > 0 && (
                              <option value="map">{t('import.action.map')}</option>
                            )}
                            <option value="create">{t('import.action.create')}</option>
                          </select>
                        </td>
                        <td style={tdCell}>
                          {m.action === 'map' && (
                            <select
                              value={m.existingVarId ?? ''}
                              onChange={e => updateMapping(i, { existingVarId: e.target.value })}
                              style={{ fontSize: 12, padding: '2px 4px' }}
                            >
                              {variables.map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.label || v.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {m.action === 'create' && (
                            <input
                              type="text"
                              value={m.newVarName}
                              onChange={e => updateMapping(i, { newVarName: e.target.value })}
                              style={{ fontSize: 12, padding: '2px 6px', width: 130 }}
                            />
                          )}
                        </td>
                        <td style={tdCell}>
                          {m.action === 'create' && (
                            <select
                              value={m.newVarType}
                              onChange={e => updateMapping(i, { newVarType: e.target.value })}
                              style={{ fontSize: 12, padding: '2px 4px' }}
                            >
                              <option value="numeric">{t('type.numeric')}</option>
                              <option value="string">{t('type.string')}</option>
                              <option value="categorical">{t('type.categorical')}</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={footer}>
              <button type="button" style={btnSecondary} onClick={() => setStep(1)}>
                {t('import.back')}
              </button>
              <button
                type="button"
                style={{ ...btnPrimary, marginInlineStart: 'auto' }}
                onClick={() => setStep(3)}
                disabled={activeCols === 0}
              >
                {t('import.next')}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Mode + confirm ────────────────────────────── */}
        {step === 3 && (
          <>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              {t('import.modeTitle')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {['replace', 'append'].map(mode => (
                <label key={mode} style={{
                  display: 'flex', alignItems: 'flex-start',
                  gap: 8, cursor: 'pointer', fontSize: 13,
                }}>
                  <input
                    type="radio"
                    name="importMode"
                    value={mode}
                    checked={importMode === mode}
                    onChange={() => setImportMode(mode)}
                    style={{ marginTop: 3 }}
                  />
                  <span>{t(`import.mode.${mode}`)}</span>
                </label>
              ))}
            </div>

            {importMode === 'append' && hasNewVars && (
              <p style={{
                margin: '0 0 14px', fontSize: 12, color: 'var(--sig)',
                lineHeight: 1.5, padding: '8px 10px',
                background: '#fdf8f2', border: '1px solid #e8d8c0', borderRadius: 3,
              }}>
                {t('import.appendWarn')}
              </p>
            )}

            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)' }}>
              {t('import.summary', { vars: activeCols, rows: parsedRows.length })}
            </p>

            <div style={footer}>
              <button type="button" style={btnSecondary} onClick={() => setStep(2)}>
                {t('import.back')}
              </button>
              <button
                type="button"
                style={{ ...btnPrimary, marginInlineStart: 'auto' }}
                onClick={executeImport}
                disabled={importing}
              >
                {importing ? t('import.importing') : t('import.confirm')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
