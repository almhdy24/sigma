// Export helpers. The CSV / XLSX libraries are imported on demand so they are
// only downloaded when the user actually exports something.

function dateStr() {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick — some mobile browsers start the download async.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function toCell(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number' || typeof val === 'boolean' || val instanceof Date) return val;
  return String(val);
}

export async function exportDatasetAsCsv(variables, cases) {
  const { default: Papa } = await import('papaparse');
  const fields = variables.map(v => v.name);
  const data = cases.map(c => {
    const row = {};
    for (const v of variables) {
      const val = c.values[v.id];
      row[v.name] = val === null || val === undefined ? '' : val;
    }
    return row;
  });
  const csv = Papa.unparse({ fields, data });
  // The UTF-8 BOM makes Excel detect the encoding, so Arabic text is not garbled.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `sigma-dataset-${dateStr()}.csv`);
}

export async function exportDatasetAsXlsx(variables, cases, { rightToLeft = false } = {}) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');

  const dataSheet = [
    variables.map(v => v.name),
    ...cases.map(c => variables.map(v => toCell(c.values[v.id]))),
  ];

  const varHeader = ['name', 'label', 'type', 'measure', 'missingValues', 'valueLabels'];
  const varSheet = [
    varHeader,
    ...variables.map(v => [
      v.name,
      v.label || null,
      v.type,
      v.measure,
      (v.missingValues ?? []).join(',') || null,
      JSON.stringify(v.valueLabels ?? {}),
    ]),
  ];

  const blob = await writeExcelFile([
    { data: dataSheet, sheet: 'Data', stickyRowsCount: 1, rightToLeft },
    { data: varSheet, sheet: 'Variables', stickyRowsCount: 1, rightToLeft },
  ]).toBlob();

  triggerDownload(blob, `sigma-dataset-${dateStr()}.xlsx`);
}
