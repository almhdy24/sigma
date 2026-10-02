import { useState } from 'react';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 15,
  border: '1px solid var(--border)',
  borderRadius: 4,
  background: 'var(--surface)',
  color: 'var(--ink)',
  boxSizing: 'border-box',
};

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '12px 14px',
  marginBottom: 10,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  WebkitTapHighlightColor: 'transparent',
  minHeight: 44,
};

const fabStyle = {
  position: 'fixed',
  insetBlockEnd: 72, // 56px bottom bar + 16px gap
  insetInlineEnd: 20,
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  fontSize: 28,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(31,95,166,0.35)',
  cursor: 'pointer',
  zIndex: 100,
};

const fullScreenStyle = {
  position: 'fixed',
  inset: 0,
  background: 'var(--page)',
  zIndex: 300,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
};

const editHeaderStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: 'var(--surface)',
  borderBottom: '1px solid var(--border)',
  padding: '0 12px',
  height: 52,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexShrink: 0,
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--muted)',
  marginBottom: 4,
};

function displayValue(variable, rawValue) {
  if (rawValue == null || rawValue === '') return '—';
  const label = variable.valueLabels?.[String(rawValue)];
  return label ? `${rawValue} (${label})` : String(rawValue);
}

function VarInput({ variable, value, onChange }) {
  if (variable.type === 'numeric') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
      />
    );
  }
  const labels = Object.entries(variable.valueLabels ?? {});
  if (variable.type === 'categorical' && labels.length > 0) {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
        <option value="">—</option>
        {labels.map(([val, lbl]) => (
          <option key={val} value={val}>{val} — {lbl}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

export default function MobileDataView({ variables, cases, addCase, updateCell, deleteCase, t }) {
  const [editId, setEditId] = useState(null); // null=list, 'new'=new case, else=caseId
  const [editValues, setEditValues] = useState({});

  function openEdit(caseObj) {
    setEditId(caseObj.id);
    setEditValues({ ...caseObj.values });
  }

  function openNew() {
    setEditId('new');
    setEditValues(Object.fromEntries(variables.map(v => [v.id, null])));
  }

  function handleSave() {
    if (editId === 'new') {
      addCase(editValues);
    } else {
      // update each changed cell
      for (const v of variables) {
        const raw = editValues[v.id] ?? null;
        const parsed = v.type === 'numeric' ? (raw === '' || raw == null ? null : Number(raw)) : (raw === '' ? null : raw);
        updateCell(editId, v.id, parsed);
      }
    }
    setEditId(null);
  }

  function handleDelete() {
    if (window.confirm(t('confirmDeleteCase'))) {
      deleteCase(editId);
      setEditId(null);
    }
  }

  if (editId === null) {
    return (
      <div style={{ padding: '12px 12px 100px' }}>
        {cases.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            {t('mobile.noCases')}
          </p>
        ) : (
          cases.map((c, idx) => {
            // Show first 3 variables as preview
            const previewVars = variables.slice(0, 3);
            const extra = variables.length - 3;
            return (
              <div key={c.id} style={cardStyle} onClick={() => openEdit(c)} role="button" tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && openEdit(c)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                    {t('mobile.caseNumber', { n: idx + 1 })}
                  </div>
                  {previewVars.map(v => (
                    <div key={v.id} style={{ display: 'flex', gap: 6, fontSize: 13, lineHeight: 1.6, minWidth: 0 }}>
                      <span style={{ color: 'var(--muted)', flexShrink: 0, maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.label || v.name}:
                      </span>
                      <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayValue(v, c.values[v.id])}
                      </span>
                    </div>
                  ))}
                  {extra > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      +{extra} {t('mobile.moreFields')}
                    </div>
                  )}
                </div>
                <span style={{ color: 'var(--muted)', fontSize: 18, flexShrink: 0 }}>›</span>
              </div>
            );
          })
        )}

        {/* FAB */}
        <button type="button" style={fabStyle} onClick={openNew} aria-label={t('addCase')}>
          +
        </button>
      </div>
    );
  }

  return (
    <div style={fullScreenStyle}>
      {/* Sticky header */}
      <div style={editHeaderStyle}>
        <button type="button" onClick={() => setEditId(null)}
          style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--accent)', cursor: 'pointer', padding: '4px 6px', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center' }}>
          ‹
        </button>
        <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>
          {editId === 'new' ? t('mobile.newCase') : t('mobile.editCase', { n: cases.findIndex(c => c.id === editId) + 1 })}
        </span>
        {editId !== 'new' && (
          <button type="button" onClick={handleDelete}
            style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: 13, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>
            {t('deleteCaseTitle')}
          </button>
        )}
      </div>

      {/* Form body */}
      <div style={{ padding: '16px 16px 100px' }}>
        {variables.map(v => (
          <div key={v.id} style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{v.label || v.name}</label>
            <VarInput
              variable={v}
              value={editValues[v.id]}
              onChange={val => setEditValues(prev => ({ ...prev, [v.id]: val }))}
            />
          </div>
        ))}
      </div>

      {/* Fixed save footer */}
      <div style={{
        position: 'sticky', bottom: 0, background: 'var(--surface)',
        borderTop: '1px solid var(--border)', padding: '12px 16px',
        display: 'flex', gap: 8,
      }}>
        <button type="button" onClick={handleSave}
          style={{ flex: 1, padding: '12px', fontSize: 15, fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
          {t('save')}
        </button>
        <button type="button" onClick={() => setEditId(null)}
          style={{ padding: '12px 20px', fontSize: 15, borderRadius: 4, cursor: 'pointer' }}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
