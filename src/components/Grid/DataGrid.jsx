import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * Lightweight virtualised, editable grid (replaces AG Grid, ~1 MB).
 *
 * columns: [{
 *   id, header, width?: number (px), flex?: number,
 *   type?: 'text' | 'number' | 'select', options?: [{ value, label }],
 *   editable?: boolean, getValue?: (row) => any, format?: (value, row) => string,
 *   render?: (row) => ReactNode,  // custom, non-editable cell
 * }]
 * onEdit(rowId, columnId, value) is called with the raw input value
 * (string, or the option value for selects).
 *
 * Keyboard: arrows move (mirrored in RTL), Enter/F2/typing edits, Enter
 * commits and moves down, Tab commits and moves across, Escape cancels.
 */
const ROW_H = 34;
const HEAD_H = 38;
const NUM_W = 56;
const OVERSCAN = 8;

const focusOnMount = (el) => {
  if (el && document.activeElement !== el) {
    el.focus({ preventScroll: true });
    if (el.select && el.tagName === 'INPUT') el.setSelectionRange(el.value.length, el.value.length);
  }
};

function cellText(col, row) {
  const value = col.getValue ? col.getValue(row) : row[col.id];
  if (col.format) return col.format(value, row);
  if (col.type === 'select') return col.options?.find((o) => o.value === value)?.label ?? value ?? '';
  return value ?? '';
}

export default function DataGrid({ columns, rows, onEdit, rowNumbers = false, label, emptyText }) {
  const scrollRef = useRef(null);
  const [viewport, setViewport] = useState({ top: 0, height: 600 });
  const [active, setActive] = useState({ r: 0, c: 0 });
  const [editingState, setEditing] = useState(null); // { r, c, draft }
  // Ignore the editor if its row disappeared (e.g. after undo).
  const editing = editingState && editingState.r < rows.length ? editingState : null;
  const [isRtl, setIsRtl] = useState(false);
  const closingRef = useRef(false); // editor already committed/cancelled → ignore its blur

  // Track scroll position and size for virtualisation.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const update = () => setViewport({ top: el.scrollTop, height: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener('scroll', update, { passive: true });
    setIsRtl(getComputedStyle(el).direction === 'rtl');
    update();
    return () => { ro.disconnect(); el.removeEventListener('scroll', update); };
  }, []);

  const template = useMemo(() => {
    const parts = columns.map((c) => (c.width ? `${c.width}px` : `minmax(${c.minWidth ?? 120}px, ${c.flex ?? 1}fr)`));
    return (rowNumbers ? [`${NUM_W}px`] : []).concat(parts).join(' ');
  }, [columns, rowNumbers]);
  const minWidth = useMemo(
    () => columns.reduce((s, c) => s + (c.width ?? c.minWidth ?? 120), rowNumbers ? NUM_W : 0),
    [columns, rowNumbers],
  );

  const first = Math.max(0, Math.floor((viewport.top - HEAD_H) / ROW_H) - OVERSCAN);
  const last = Math.min(rows.length, Math.ceil((viewport.top + viewport.height) / ROW_H) + OVERSCAN);

  // Keep the active cell valid when data changes.
  const r = Math.min(active.r, Math.max(0, rows.length - 1));
  const c = Math.min(active.c, Math.max(0, columns.length - 1));

  const focusCell = useCallback((row, col) => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll the row into view, then focus once it is rendered.
    const top = HEAD_H + row * ROW_H;
    if (top < el.scrollTop + HEAD_H) el.scrollTop = top - HEAD_H;
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight;
    requestAnimationFrame(() => {
      el.querySelector(`[data-cell="${row}:${col}"]`)?.focus({ preventScroll: true });
    });
  }, []);

  const move = useCallback((dr, dc) => {
    const nr = Math.max(0, Math.min(rows.length - 1, r + dr));
    const nc = Math.max(0, Math.min(columns.length - 1, c + dc));
    setActive({ r: nr, c: nc });
    focusCell(nr, nc);
  }, [r, c, rows.length, columns.length, focusCell]);

  const isEditable = (col) => col.editable !== false && !col.render;

  const startEdit = (row, col, initial) => {
    const column = columns[col];
    if (!column || !isEditable(column)) return;
    const raw = column.getValue ? column.getValue(rows[row]) : rows[row][column.id];
    closingRef.current = false;
    setEditing({ r: row, c: col, draft: initial ?? (raw == null ? '' : String(raw)) });
  };

  const commit = (moveBy) => {
    if (!editing || closingRef.current) return;
    closingRef.current = true;
    const column = columns[editing.c];
    const row = rows[editing.r];
    const before = column.getValue ? column.getValue(row) : row[column.id];
    if (String(before ?? '') !== editing.draft) onEdit?.(row.id, column.id, editing.draft);
    setEditing(null);
    if (moveBy) move(...moveBy);
    else focusCell(editing.r, editing.c);
  };

  const cancel = () => {
    closingRef.current = true;
    const at = editing;
    setEditing(null);
    if (at) focusCell(at.r, at.c);
  };

  const onCellKeyDown = (e) => {
    if (editing) return;
    const fwd = isRtl ? -1 : 1;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1, 0); break;
      case 'ArrowUp': e.preventDefault(); move(-1, 0); break;
      case 'ArrowRight': e.preventDefault(); move(0, fwd); break;
      case 'ArrowLeft': e.preventDefault(); move(0, -fwd); break;
      case 'Home': e.preventDefault(); move(0, -columns.length); break;
      case 'End': e.preventDefault(); move(0, columns.length); break;
      case 'PageDown': e.preventDefault(); move(Math.floor(viewport.height / ROW_H), 0); break;
      case 'PageUp': e.preventDefault(); move(-Math.floor(viewport.height / ROW_H), 0); break;
      case 'Enter':
      case 'F2': e.preventDefault(); startEdit(r, c); break;
      case 'Delete':
      case 'Backspace':
        if (isEditable(columns[c]) && columns[c].type !== 'select') {
          e.preventDefault();
          onEdit?.(rows[r].id, columns[c].id, '');
        }
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && columns[c].type !== 'select') {
          e.preventDefault();
          startEdit(r, c, e.key);
        }
    }
  };

  const onEditorKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit([1, 0]); }
    else if (e.key === 'Tab') { e.preventDefault(); commit([0, e.shiftKey ? -1 : 1]); }
    else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };


  const renderEditor = (column) => {
    const common = {
      // Focus on mount (Preact, unlike React, does not emulate autoFocus
      // for elements inserted after page load).
      ref: focusOnMount,
      className: 'sigma-grid__editor',
      'aria-label': typeof column.header === 'string' ? column.header : undefined,
      onKeyDown: onEditorKeyDown,
      onBlur: () => commit(),
    };
    if (column.type === 'select') {
      return (
        <select {...common} value={editing.draft}
          onChange={(e) => setEditing((s) => ({ ...s, draft: e.target.value }))}>
          {column.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input {...common}
        type="text"
        inputMode={column.type === 'number' ? 'decimal' : undefined}
        dir={column.type === 'number' ? 'ltr' : 'auto'}
        value={editing.draft}
        onChange={(e) => setEditing((s) => ({ ...s, draft: e.target.value }))}
      />
    );
  };

  const visible = [];
  for (let i = first; i < last; i++) {
    const row = rows[i];
    visible.push(
      <div
        key={row.id}
        role="row"
        aria-rowindex={i + 2}
        className={`sigma-grid__row${i % 2 ? ' sigma-grid__row--odd' : ''}`}
        style={{ top: HEAD_H + i * ROW_H, gridTemplateColumns: template }}
      >
        {rowNumbers && <div role="rowheader" className="sigma-grid__num tnum">{i + 1}</div>}
        {columns.map((col, j) => {
          const isActive = i === r && j === c;
          const isEditing = editing && editing.r === i && editing.c === j;
          return (
            <div
              key={col.id}
              role="gridcell"
              aria-colindex={j + 1 + (rowNumbers ? 1 : 0)}
              data-cell={`${i}:${j}`}
              tabIndex={isActive && !isEditing ? 0 : -1}
              className={`sigma-grid__cell${col.type === 'number' ? ' sigma-grid__cell--num tnum' : ''}${isActive ? ' is-active' : ''}`}
              onFocus={() => { if (!isActive) setActive({ r: i, c: j }); }}
              onClick={() => setActive({ r: i, c: j })}
              onDoubleClick={() => startEdit(i, j)}
              onKeyDown={onCellKeyDown}
            >
              {isEditing ? renderEditor(col) : col.render ? col.render(row) : cellText(col, row)}
            </div>
          );
        })}
      </div>,
    );
  }

  return (
    <div
      ref={scrollRef}
      className="sigma-grid"
      role="grid"
      aria-label={label}
      aria-rowcount={rows.length + 1}
      aria-colcount={columns.length + (rowNumbers ? 1 : 0)}
    >
      <div className="sigma-grid__canvas" style={{ height: HEAD_H + rows.length * ROW_H, minWidth }}>
        <div role="row" aria-rowindex={1} className="sigma-grid__head" style={{ gridTemplateColumns: template }}>
          {rowNumbers && <div role="columnheader" className="sigma-grid__num">#</div>}
          {columns.map((col) => (
            <div key={col.id} role="columnheader" className="sigma-grid__th" title={typeof col.header === 'string' ? col.header : undefined}>
              {col.header}
            </div>
          ))}
        </div>
        {visible}
      </div>
      {rows.length === 0 && emptyText && <p className="sigma-grid__empty">{emptyText}</p>}
    </div>
  );
}
