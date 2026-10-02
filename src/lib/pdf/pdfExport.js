// PDF export (results, report, codebook) with full Arabic support.
//
// jsPDF's built-in fonts have no Arabic glyphs, so IBM Plex Sans Arabic (the
// app's UI font, which also covers Latin) is embedded. Every string drawn —
// including autotable cells — is shaped by jsPDF and then reordered with a
// complete Unicode Bidi Algorithm (bidi-js), because jsPDF's built-in bidi
// pass mis-orders mixed Arabic/Latin/number text. In RTL mode text is
// right-aligned and table columns are mirrored.
//
// Everything here — jsPDF, autotable and the two ~240 KB fonts — is loaded on
// demand the first time the user exports a PDF.
import regularFontUrl from '../../assets/fonts/IBMPlexSansArabic-Regular.ttf?url';
import boldFontUrl from '../../assets/fonts/IBMPlexSansArabic-Bold.ttf?url';
import { baseDirection, createVisualizer } from './bidiText.js';

const FONT = 'IBMPlexSansArabic';
const ACCENT = [31, 95, 166];
const INK = [28, 43, 58];
const MUTED = [99, 125, 148];
// Makes jsPDF's own bidi pass a no-op: text arrives already in visual order.
const NO_BIDI = { isInputVisual: true, isOutputVisual: true, isInputRtl: false, isOutputRtl: false };

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

let kitPromise = null;

/** jsPDF + autotable + base64 fonts, loaded once. */
function loadPdfKit() {
  if (!kitPromise) {
    const fetchFont = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Font download failed (${res.status})`);
      return toBase64(await res.arrayBuffer());
    };
    kitPromise = Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
      import('bidi-js'),
      fetchFont(regularFontUrl),
      fetchFont(boldFontUrl),
    ]).then(([{ jsPDF }, { default: autoTable }, { default: bidiFactory }, regular, bold]) => ({
      jsPDF, autoTable, bidi: bidiFactory(), regular, bold,
    }))
      .catch((err) => { kitPromise = null; throw err; });
  }
  return kitPromise;
}

/** Thin layout helper around a jsPDF document that is direction-aware. */
async function createDocument({ rtl }) {
  const { jsPDF, autoTable, bidi, regular, bold } = await loadPdfKit();
  const doc = new jsPDF();

  // Route all text (ours and autotable's) through shaping + UBA reordering.
  const toVisual = createVisualizer(bidi, (str) => doc.processArabic(str));
  const rawText = doc.text.bind(doc);
  doc.text = (text, x, y, options = {}, transform) => {
    const { direction = 'auto', ...rest } = options;
    const visual = Array.isArray(text)
      ? text.map((line) => (typeof line === 'string' ? toVisual(line, direction) : line))
      : toVisual(text, direction);
    return rawText(visual, x, y, { ...rest, ...NO_BIDI }, transform);
  };
  doc.addFileToVFS(`${FONT}-Regular.ttf`, regular);
  doc.addFont(`${FONT}-Regular.ttf`, FONT, 'normal');
  doc.addFileToVFS(`${FONT}-Bold.ttf`, bold);
  doc.addFont(`${FONT}-Bold.ttf`, FONT, 'bold');
  doc.setFont(FONT, 'normal');

  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  let y = margin;

  const api = {
    doc,
    get y() { return y; },
    set y(v) { y = v; },
    ensureSpace(h) {
      if (y > pageH - h) { doc.addPage(); y = margin; }
    },
    /**
     * Paragraph wrapped to the content width, aligned by its own base
     * direction (an English APA paragraph stays left-aligned in an Arabic report).
     */
    text(str, { size = 10, weight = 'normal', color = INK, gap = 2 } = {}) {
      doc.setFont(FONT, weight);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const paragraph = String(str ?? '');
      const direction = /[^\s\d.,:;·/()%=+\-–—]/.test(paragraph) ? baseDirection(paragraph) : (rtl ? 'rtl' : 'ltr');
      const right = direction === 'rtl';
      const lines = doc.splitTextToSize(paragraph, contentW);
      const lineH = size * 0.42;
      for (const line of lines) {
        api.ensureSpace(lineH + 4);
        y += lineH;
        doc.text(line, right ? pageW - margin : margin, y, { align: right ? 'right' : 'left', direction });
      }
      y += gap;
    },
    rule() {
      doc.setDrawColor(200, 214, 226);
      doc.line(margin, y, pageW - margin, y);
      y += 6;
    },
    /** Table; columns are mirrored in RTL so the first column sits on the right. */
    table(columns, rows, { fontSize = 8.5, columnStyles } = {}) {
      const order = (cells) => (rtl ? [...cells].reverse() : cells);
      const n = columns.length;
      const styles = {};
      if (columnStyles) {
        for (const [idx, style] of Object.entries(columnStyles)) {
          styles[rtl ? n - 1 - Number(idx) : idx] = style;
        }
      }
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [order(columns.map((c) => String(c ?? '')))],
        body: rows.map((r) => order(r.map((c) => (c == null ? '—' : String(c))))),
        styles: { font: FONT, fontSize, halign: rtl ? 'right' : 'left', textColor: INK },
        headStyles: { font: FONT, fontStyle: 'bold', fillColor: ACCENT, textColor: [255, 255, 255] },
        columnStyles: styles,
      });
      y = doc.lastAutoTable.finalY + 6;
    },
    save(filename) { doc.save(filename); },
  };
  return api;
}

const dateStamp = () => new Date().toISOString().slice(0, 10);
const formatDate = (ts, locale) => new Date(ts).toLocaleString(locale);
const isRtl = (i18n) => i18n.dir(i18n.language) === 'rtl';
const analysisTitle = (t, type) => t(`analysis.${type}`, { defaultValue: String(type).toUpperCase() });

function writeResult(pdf, result, t, locale) {
  pdf.ensureSpace(50);
  pdf.text(analysisTitle(t, result.analysisType), { size: 12, weight: 'bold', color: ACCENT, gap: 1 });
  pdf.text(`${result.variablesUsed.join('، ')} · ${formatDate(result.timestamp, locale)}`, { size: 9, color: MUTED, gap: 4 });
  for (const table of result.tables) {
    pdf.ensureSpace(40);
    if (table.title) pdf.text(table.title, { size: 9.5, weight: 'bold', gap: 2 });
    pdf.table(table.columns, table.rows);
  }
  if (result.interpretation) pdf.text(result.interpretation, { size: 9.5, color: [176, 92, 8], gap: 4 });
  if (result.methodsParagraph) {
    pdf.text(t('results.methodsHeading', { defaultValue: 'Methods (APA)' }), { size: 8.5, weight: 'bold', color: MUTED, gap: 1 });
    pdf.text(result.methodsParagraph, { size: 8.5, color: MUTED, gap: 8 });
  }
}

/** One result → PDF. */
export async function exportResultPdf(result, { t, i18n }) {
  const pdf = await createDocument({ rtl: isRtl(i18n) });
  writeResult(pdf, result, t, i18n.language);
  pdf.save(`result-${result.id.slice(0, 8)}.pdf`);
}

/** Several results → one report. */
export async function exportResultsReportPdf(results, { t, i18n }) {
  const pdf = await createDocument({ rtl: isRtl(i18n) });
  pdf.text(t('results.reportTitle'), { size: 18, weight: 'bold', color: ACCENT, gap: 1 });
  pdf.text(t('results.reportGenerated', { date: new Date().toLocaleString(i18n.language) }), { size: 10, color: MUTED, gap: 3 });
  pdf.rule();
  for (const result of results) writeResult(pdf, result, t, i18n.language);
  pdf.save(`sigma-report-${dateStamp()}.pdf`);
}

/** Variable codebook → PDF. */
export async function exportCodebookPdf(variables, cases, { t, i18n }) {
  const pdf = await createDocument({ rtl: isRtl(i18n) });
  pdf.text(t('codebook.title'), { size: 16, weight: 'bold', color: ACCENT, gap: 1 });
  pdf.text(
    `${t('codebook.generated')}: ${new Date().toLocaleString(i18n.language)} · ${variables.length} ${t('codebook.variables')}`,
    { size: 9, color: MUTED, gap: 3 },
  );
  pdf.rule();

  for (const v of variables) {
    pdf.ensureSpace(50);
    const nullCount = cases.filter((c) => c.values[v.id] == null || c.values[v.id] === '').length;
    const labelPairs = Object.entries(v.valueLabels ?? {})
      .map(([val, lbl]) => `${val} = ${lbl}`).join('; ') || '—';
    const missingStr = (v.missingValues ?? []).join(', ') || '—';

    pdf.text(v.name + (v.label ? `  —  ${v.label}` : ''), { size: 11, weight: 'bold', gap: 2 });
    pdf.table(
      [t('codebook.col.property'), t('codebook.col.value')],
      [
        [t('col.type'), t(`type.${v.type}`)],
        [t('col.measure'), t(`measure.${v.measure}`)],
        [t('col.valueLabels'), labelPairs],
        [t('col.missingValues'), missingStr],
        [t('codebook.nullCount'), `${nullCount} / ${cases.length}`],
      ],
      { columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } } },
    );
    pdf.y += 4;
  }

  pdf.save(`sigma-codebook-${dateStamp()}.pdf`);
}
