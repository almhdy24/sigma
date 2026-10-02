import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
  URL.revokeObjectURL(url);
}

export function exportDatasetAsCsv(variables, cases) {
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
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `sigma-dataset-${dateStr()}.csv`);
}

export function exportDatasetAsXlsx(variables, cases) {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Data
  const dataRows = cases.map(c => {
    const row = {};
    for (const v of variables) {
      const val = c.values[v.id];
      row[v.name] = val === null || val === undefined ? '' : val;
    }
    return row;
  });
  const dataWs = XLSX.utils.json_to_sheet(
    dataRows.length ? dataRows : [{}],
    { header: variables.map(v => v.name) },
  );
  XLSX.utils.book_append_sheet(wb, dataWs, 'Data');

  // Sheet 2 — Variables
  const varRows = variables.map(v => ({
    name: v.name,
    label: v.label,
    type: v.type,
    measure: v.measure,
    missingValues: (v.missingValues ?? []).join(','),
    valueLabels: JSON.stringify(v.valueLabels ?? {}),
  }));
  const varWs = XLSX.utils.json_to_sheet(
    varRows.length ? varRows : [{}],
    { header: ['name', 'label', 'type', 'measure', 'missingValues', 'valueLabels'] },
  );
  XLSX.utils.book_append_sheet(wb, varWs, 'Variables');

  XLSX.writeFile(wb, `sigma-dataset-${dateStr()}.xlsx`);
}
