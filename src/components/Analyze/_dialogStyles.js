/* ── Shared modal shell styles ──────────────────────────────────
   Imported by all Analyze dialogs and ValueLabelsModal.
   Uses CSS custom properties so every token change in index.css
   propagates here automatically.
   ─────────────────────────────────────────────────────────────── */

/* CSS class names — used by index.css mobile media query */
export const overlayClass  = 'sigma-dialog-overlay';
export const modalClass    = 'sigma-dialog-modal';
export const varItemClass  = 'sigma-var-item';

export const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(15, 30, 50, 0.48)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

export const modal = {
  background: 'var(--surface)',
  borderRadius: 4,
  padding: '20px 24px 24px',
  minWidth: 360,
  maxWidth: 520,
  width: '100%',
  maxHeight: '88vh',
  overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(15, 30, 50, 0.22)',
};

/* Title — use as style on the dialog's <h3> */
export const dialogTitle = {
  margin: '0 0 16px',
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--ink)',
  paddingBottom: 14,
  borderBottom: '1px solid var(--border)',
};

/* Scrollable variable checklist */
export const varList = {
  border: '1px solid var(--border)',
  borderRadius: 3,
  maxHeight: 210,
  overflowY: 'auto',
  marginBottom: 16,
  background: 'var(--surface)',
};

/* Individual checklist row */
export const varItem = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '5px 10px',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1.4,
  transition: 'background 0.1s',
};

/* Footer with action buttons */
export const footer = {
  display: 'flex',
  gap: 8,
  marginTop: 20,
  paddingTop: 16,
  borderTop: '1px solid var(--border)',
};

/* Primary action button (Run / Save) */
export const btnPrimary = {
  padding: '7px 20px',
  fontSize: 13,
  fontWeight: 600,
  background: 'var(--accent)',
  color: '#fff',
  border: '1px solid var(--accent)',
  borderRadius: 3,
  cursor: 'pointer',
  transition: 'opacity 0.12s',
};

/* Secondary / cancel button */
export const btnSecondary = {
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 400,
  background: 'transparent',
  color: 'var(--ink)',
  border: '1px solid var(--border)',
  borderRadius: 3,
  cursor: 'pointer',
  transition: 'border-color 0.12s, color 0.12s',
};

/* Select / input inside dialogs — width and spacing only;
   border, font, padding handled by global CSS in index.css */
export const inputSel = {
  width: '100%',
  marginBottom: 12,
  display: 'block',
};

/* Form label above a select or input */
export const fieldLabel = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--muted)',
  marginBottom: 4,
  letterSpacing: '0.01em',
};

/* Inline error message */
export const errorMsg = {
  margin: '8px 0 0',
  fontSize: 13,
  color: 'var(--error)',
  lineHeight: 1.4,
};

/* Muted badge — e.g. (numeric) type label next to variable name */
export const typeBadge = {
  fontSize: 11,
  color: 'var(--muted)',
  marginInlineStart: 2,
};
