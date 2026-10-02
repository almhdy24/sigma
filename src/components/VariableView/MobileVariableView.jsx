import { useState } from 'react';

const cardStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '12px 14px', marginBottom: 10,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
  WebkitTapHighlightColor: 'transparent', minHeight: 44,
};
const fabStyle = {
  position: 'fixed', insetBlockEnd: 72, insetInlineEnd: 20,
  width: 56, height: 56, borderRadius: '50%',
  background: 'var(--accent)', color: '#fff', border: 'none',
  fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(31,95,166,0.35)', cursor: 'pointer', zIndex: 100,
};
const fullScreenStyle = {
  position: 'fixed', inset: 0, background: 'var(--page)',
  zIndex: 300, display: 'flex', flexDirection: 'column', overflowY: 'auto',
};
const editHeaderStyle = {
  position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)',
  borderBottom: '1px solid var(--border)', padding: '0 12px',
  height: 52, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
};
const inputStyle = {
  width: '100%', padding: '10px 12px', fontSize: 15,
  border: '1px solid var(--border)', borderRadius: 4,
  background: 'var(--surface)', color: 'var(--ink)', boxSizing: 'border-box',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 4 };
const badgeStyle = {
  display: 'inline-block', padding: '1px 7px', borderRadius: 10, fontSize: 11,
  background: 'var(--accent-tint)', color: 'var(--accent)', fontWeight: 500,
};

export default function MobileVariableView({ variables, cases, addVariable, updateVariable, deleteVariable, t, onOpenValueLabels }) {
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({});

  const openEdit = (variable) => {
    setEditId(variable.id);
    setDraft({
      name: variable.name,
      label: variable.label || '',
      type: variable.type,
      measure: variable.measure,
      missingValues: (variable.missingValues || []).join(', '),
    });
  };

  const openNew = () => {
    const names = new Set(variables.map(v => v.name));
    let n = 1;
    while (names.has(`var${n}`)) n++;
    setEditId('new');
    setDraft({ name: `var${n}`, label: '', type: 'numeric', measure: 'scale', missingValues: '' });
  };

  const handleSave = () => {
    const missingArr = draft.missingValues.split(',').map(s => s.trim()).filter(Boolean);
    if (editId === 'new') {
      addVariable({ name: draft.name, label: draft.label, type: draft.type, measure: draft.measure, missingValues: missingArr });
    } else {
      updateVariable(editId, { name: draft.name, label: draft.label, type: draft.type, measure: draft.measure, missingValues: missingArr });
    }
    setEditId(null);
  };

  const handleDelete = () => {
    if (window.confirm(t('confirmDeleteVariable'))) {
      deleteVariable(editId);
      setEditId(null);
    }
  };

  if (editId !== null) {
    return (
      <div style={fullScreenStyle}>
        <div style={editHeaderStyle}>
          <button type="button" onClick={() => setEditId(null)}
            style={{ background: 'none', border: 'none', fontSize: 22, color: 'var(--accent)', cursor: 'pointer', padding: '4px 6px', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center' }}>
            ‹
          </button>
          <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>
            {editId === 'new' ? t('mobile.newVariable') : t('mobile.editVariable')}
          </span>
          {editId !== 'new' && (
            <button type="button" onClick={handleDelete}
              style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: 13, cursor: 'pointer', minWidth: 44, minHeight: 44 }}>
              {t('deleteVariableTitle')}
            </button>
          )}
        </div>

        <div style={{ padding: '16px 16px 100px' }}>
          {/* Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('col.name')}</label>
            <input type="text" style={inputStyle} value={draft.name || ''} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          </div>
          {/* Label */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('col.label')}</label>
            <input type="text" style={inputStyle} value={draft.label || ''} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} />
          </div>
          {/* Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('col.type')}</label>
            <select style={inputStyle} value={draft.type || 'numeric'} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
              {['numeric', 'string', 'categorical', 'date'].map(ty => (
                <option key={ty} value={ty}>{t(`type.${ty}`)}</option>
              ))}
            </select>
          </div>
          {/* Measure */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('col.measure')}</label>
            <select style={inputStyle} value={draft.measure || 'scale'} onChange={e => setDraft(d => ({ ...d, measure: e.target.value }))}>
              {['nominal', 'ordinal', 'scale'].map(m => (
                <option key={m} value={m}>{t(`measure.${m}`)}</option>
              ))}
            </select>
          </div>
          {/* Missing Values */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>{t('col.missingValues')}</label>
            <input type="text" style={inputStyle}
              placeholder={t('mobile.missingValuesHint')}
              value={draft.missingValues || ''}
              onChange={e => setDraft(d => ({ ...d, missingValues: e.target.value }))} />
          </div>
          {/* Value Labels — only when editId is not 'new' */}
          {editId !== 'new' && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{t('col.valueLabels')}</label>
              <button type="button" onClick={() => onOpenValueLabels(editId)}
                style={{ width: '100%', padding: '10px 12px', fontSize: 14, textAlign: 'start', borderRadius: 4 }}>
                {t('editValueLabels')}
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', bottom: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleSave}
            style={{ flex: 1, padding: 12, fontSize: 15, fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
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

  return (
    <div style={{ padding: '12px 12px 100px' }}>
      {variables.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
          {t('mobile.noVariables')}
        </p>
      ) : (
        variables.map(v => (
          <div key={v.id} style={cardStyle} onClick={() => openEdit(v)} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && openEdit(v)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.name}
              </div>
              {v.label && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.label}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={badgeStyle}>{t(`type.${v.type}`)}</span>
                <span style={{ ...badgeStyle, background: 'var(--page)', color: 'var(--muted)' }}>{t(`measure.${v.measure}`)}</span>
              </div>
            </div>
            <span style={{ color: 'var(--muted)', fontSize: 18, flexShrink: 0 }}>›</span>
          </div>
        ))
      )}
      <button type="button" style={fabStyle} onClick={openNew} aria-label={t('addVariable')}>+</button>
    </div>
  );
}
