export default function ResultTable({ title, columns, rows }) {
  const tdBase = {
    padding: '4px 10px',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
    color: 'var(--ink)',
  };
  const thBase = {
    ...tdBase,
    fontWeight: 600,
    background: 'var(--accent-tint)',
    color: 'var(--ink)',
    textAlign: 'start',
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {title && <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{title}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid var(--border)' }}>
          <thead>
            <tr>{columns.map((c, i) => <th key={i} style={thBase}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : '#f6f9fc' }}>
                {row.map((cell, j) => <td key={j} style={tdBase}>{cell ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
