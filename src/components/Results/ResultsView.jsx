import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import useResultsStore from '../../store/resultsStore.js';
import ResultTable from './ResultTable.jsx';
import ResultChart from './ResultChart.jsx';

const PAGE_SIZE = 15;

function formatTimestamp(ts) {
  return new Date(ts).toLocaleString();
}

function resultToPlainText(result) {
  const lines = [
    result.analysisType.toUpperCase(),
    `Variables: ${result.variablesUsed.join(', ')}`,
    `Date: ${formatTimestamp(result.timestamp)}`,
    '',
  ];
  for (const table of result.tables) {
    if (table.title) lines.push(table.title);
    lines.push(table.columns.join('\t'));
    for (const row of table.rows) lines.push(row.join('\t'));
    lines.push('');
  }
  lines.push(result.interpretation);
  if (result.methodsParagraph) {
    lines.push('');
    lines.push('Methods (APA):');
    lines.push(result.methodsParagraph);
  }
  return lines.join('\n');
}

function exportSinglePdf(result) {
  const doc = new jsPDF();
  let y = 14;

  doc.setFontSize(14);
  doc.text(result.analysisType.toUpperCase(), 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Variables: ${result.variablesUsed.join(', ')}`, 14, y);
  y += 6;
  doc.text(`Date: ${formatTimestamp(result.timestamp)}`, 14, y);
  y += 10;

  for (const table of result.tables) {
    if (table.title) {
      doc.setFontSize(11);
      doc.text(table.title, 14, y);
      y += 6;
    }
    autoTable(doc, {
      startY: y,
      head: [table.columns],
      body: table.rows.map((r) => r.map((c) => (c == null ? '—' : String(c)))),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [31, 95, 166] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  doc.setFontSize(10);
  doc.text(result.interpretation, 14, y, { maxWidth: 180 });
  y += doc.splitTextToSize(result.interpretation, 180).length * 5 + 6;
  if (result.methodsParagraph) {
    doc.setFontSize(8);
    doc.setTextColor(100, 120, 140);
    doc.text('Methods (APA format, English):', 14, y);
    y += 5;
    doc.text(doc.splitTextToSize(result.methodsParagraph, 180), 14, y);
  }
  doc.save(`result-${result.id.slice(0, 8)}.pdf`);
}

function exportAllPdf(results, t) {
  const doc    = new jsPDF();
  const pageH  = doc.internal.pageSize.height;
  const margin = 14;
  let y = margin;

  // Report header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(31, 95, 166);
  doc.text(t('results.reportTitle'), margin, y);
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(99, 125, 148);
  doc.text(t('results.reportGenerated', { date: new Date().toLocaleString() }), margin, y);
  y += 6;
  doc.setDrawColor(200, 214, 226);
  doc.line(margin, y, 196, y);
  y += 12;
  doc.setTextColor(28, 43, 58);

  for (const result of results) {
    if (y > pageH - 50) { doc.addPage(); y = margin; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(result.analysisType.toUpperCase(), margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(99, 125, 148);
    doc.text(
      `${result.variablesUsed.join(', ')} · ${formatTimestamp(result.timestamp)}`,
      margin, y,
    );
    y += 8;
    doc.setTextColor(28, 43, 58);

    for (const table of result.tables) {
      if (y > pageH - 40) { doc.addPage(); y = margin; }
      if (table.title) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(table.title, margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
      }
      autoTable(doc, {
        startY: y,
        head: [table.columns],
        body: table.rows.map(r => r.map(c => (c == null ? '—' : String(c)))),
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [31, 95, 166] },
        margin: { left: margin, right: margin },
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    if (y > pageH - 30) { doc.addPage(); y = margin; }
    doc.setFontSize(9);
    doc.setTextColor(176, 92, 8);
    const lines = doc.splitTextToSize(result.interpretation, 182);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 14;
    doc.setTextColor(28, 43, 58);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`sigma-report-${dateStr}.pdf`);
}

export default function ResultsView() {
  const { t } = useTranslation();
  const results      = useResultsStore(s => s.results);
  const clearResults = useResultsStore(s => s.clearResults);

  const [search,   setSearch]   = useState('');
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => { setPageSize(PAGE_SIZE); }, [search]);

  const filtered = results.filter(r => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.analysisType.toLowerCase().includes(q) ||
      r.variablesUsed.some(v => v.toLowerCase().includes(q))
    );
  });

  const visible   = filtered.slice(0, pageSize);
  const remaining = filtered.length - visible.length;

  if (results.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 'calc(100vh - var(--header-h))',
        color: 'var(--muted)', fontSize: 13,
      }}>
        <p style={{ margin: 0 }}>{t('results.empty')}</p>
      </div>
    );
  }

  const handleClear = () => {
    if (window.confirm(t('results.confirmClear'))) {
      clearResults();
      setSearch('');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('results.search')}
          style={{ flex: '1 1 200px', minWidth: 0 }}
        />
        <div style={{ display: 'flex', gap: 6, marginInlineStart: 'auto', flexShrink: 0 }}>
          <button
            type="button"
            style={{ fontSize: 13 }}
            onClick={() => exportAllPdf(filtered.length ? filtered : results, t)}
          >
            ↑ {t('results.exportAll')}
          </button>
          <button
            type="button"
            onClick={handleClear}
            style={{ color: 'var(--error)', borderColor: 'var(--error)', fontSize: 13 }}
          >
            {t('results.clearAll')}
          </button>
        </div>
      </div>

      {results.length >= 3 && (
        <div style={{
          padding: '8px 12px', marginBottom: 12,
          background: 'rgba(31,95,166,0.06)',
          border: '1px solid var(--accent)',
          borderRadius: 3, fontSize: 12, color: 'var(--ink)', lineHeight: 1.5,
        }}>
          <strong style={{ color: 'var(--accent)' }}>{t('results.bonferroniLabel')}</strong>{' '}
          {t('results.bonferroniNote', { n: results.length, alpha: (0.05 / results.length).toFixed(4) })}
        </div>
      )}

      {/* Empty search state */}
      {filtered.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '32px 0', textAlign: 'center' }}>
          {t('results.noMatch')}
        </p>
      )}

      {/* Result cards */}
      {visible.map((result) => (
        <div key={result.id} style={{
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '14px 16px 16px',
          marginBottom: 16,
          background: 'var(--surface)',
          boxShadow: '0 1px 4px rgba(15, 30, 50, 0.07)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 10,
            marginBottom: 12, flexWrap: 'wrap',
          }}>
            <strong style={{ fontSize: 14, color: 'var(--ink)' }}>
              {t(`analysis.${result.analysisType}`)}
            </strong>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              {formatTimestamp(result.timestamp)}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>
              {result.variablesUsed.join(', ')}
            </span>
            <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
              <button
                type="button"
                style={{ fontSize: 12, padding: '2px 8px' }}
                onClick={() => navigator.clipboard.writeText(resultToPlainText(result))}
              >
                {t('results.copy')}
              </button>
              <button
                type="button"
                style={{ fontSize: 12, padding: '2px 8px' }}
                onClick={() => exportSinglePdf(result)}
              >
                {t('results.exportPdf')}
              </button>
            </div>
          </div>

          {result.tables.map((table, i) => (
            <ResultTable key={i} title={table.title} columns={table.columns} rows={table.rows} />
          ))}

          {result.chartData && <ResultChart chartData={result.chartData} />}

          <p style={{
            margin: '10px 0 0', fontSize: 13,
            color: 'var(--sig)', fontStyle: 'italic', lineHeight: 1.5,
          }}>
            {result.interpretation}
          </p>

          {result.methodsParagraph && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'var(--page)', borderRadius: 3,
              border: '1px solid var(--border)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 6,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {t('results.methodsLabel')}
                </span>
                <button
                  type="button"
                  style={{ fontSize: 11, padding: '1px 7px' }}
                  onClick={() => navigator.clipboard.writeText(result.methodsParagraph)}
                >
                  {t('results.copy')}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink)', lineHeight: 1.65 }}>
                {result.methodsParagraph}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* Load more */}
      {remaining > 0 && (
        <div style={{ textAlign: 'center', paddingBottom: 16 }}>
          <button
            type="button"
            style={{ fontSize: 13 }}
            onClick={() => setPageSize(ps => ps + PAGE_SIZE)}
          >
            {t('results.loadMore', { n: Math.min(remaining, PAGE_SIZE) })}
          </button>
        </div>
      )}
    </div>
  );
}
