/**
 * Extracts an array of values for a variable from cases, replacing user-defined
 * missing values and empty/null entries with null. Numeric variables are coerced
 * to numbers; non-parseable entries become null.
 */
export function extractValues(cases, variable) {
  return cases.map((c) => {
    const raw = c.values[variable.id];
    if (raw === null || raw === undefined || raw === '') return null;
    const str = String(raw);
    if ((variable.missingValues ?? []).includes(str)) return null;
    if (variable.type === 'numeric') {
      const n = Number(raw);
      return isNaN(n) ? null : n;
    }
    return str;
  });
}
