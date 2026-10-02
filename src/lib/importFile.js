// File parsing helpers for the Import dialog. Parsers are loaded on demand.

// Variable names must be ASCII identifiers (they are used in Compute/Recode
// formulas). Headers that contain no ASCII letters/digits — e.g. Arabic
// column titles — fall back to var1, var2, … ; the original header is kept
// as the variable label. Names are de-duplicated against existing variables.
export function sanitizeNames(headers, existingNames = []) {
  const used = new Set(existingNames.map(n => n.toLowerCase()));
  return headers.map((header, i) => {
    let s = String(header ?? '').trim()
      .replace(/[^a-zA-Z0-9_]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    if (!/[a-zA-Z0-9]/.test(s)) s = `var${i + 1}`;
    if (/^[0-9_]/.test(s)) s = 'v' + s;
    s = s.slice(0, 32);
    let candidate = s;
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${s.slice(0, 28)}_${n}`;
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

export function suggestType(values) {
  const nonEmpty = values.filter(
    v => v !== null && v !== undefined && String(v).trim() !== '',
  );
  if (nonEmpty.length === 0) return 'string';
  const allNumeric = nonEmpty.every(v => !isNaN(Number(String(v).trim())));
  if (allNumeric) return 'numeric';
  const distinct = new Set(nonEmpty.map(v => String(v))).size;
  return distinct <= 10 ? 'categorical' : 'string';
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv' || ext === 'txt') {
    const { default: Papa } = await import('papaparse');
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
  if (ext === 'xlsx') {
    const { readSheet } = await import('read-excel-file/browser');
    const raw = await readSheet(file);
    if (!raw.length) throw new Error('Empty sheet');
    const headers = raw[0].map(h => String(h ?? ''));
    const rows = raw.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const v = row[i];
        obj[h] = v instanceof Date ? v.toISOString().slice(0, 10) : (v ?? '');
      });
      return obj;
    });
    return { headers, rows };
  }
  if (ext === 'xls') throw new Error('legacy-xls');
  throw new Error('unsupported');
}
