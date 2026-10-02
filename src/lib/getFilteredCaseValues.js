import { extractValues } from './stats/extractValues.js';

export function applyFilter(cases, activeFilter, variables) {
  if (!activeFilter) return cases;
  const { variableId, operator, value, value2 } = activeFilter;
  const varDef = variables.find(v => v.id === variableId);
  return cases.filter(c => {
    const raw = c.values[variableId];
    if (raw == null || raw === '') return false;
    const isNum = varDef?.type === 'numeric';
    const a = isNum ? Number(raw) : String(raw);
    const b = isNum ? Number(value) : String(value);
    switch (operator) {
      case 'equals':      return isNum ? a === b : String(raw) === String(value);
      case 'notEquals':   return isNum ? a !== b : String(raw) !== String(value);
      case 'greaterThan': return isNum && a > b;
      case 'lessThan':    return isNum && a < b;
      case 'between':     return isNum && a >= b && a <= Number(value2);
      default:            return true;
    }
  });
}

export function getSplitGroups(cases, splitVar) {
  if (!splitVar) return [{ label: null, cases }];
  const seen = new Set();
  const vals = [];
  for (const c of cases) {
    const v = c.values[splitVar.id];
    if (v != null && v !== '' && !seen.has(String(v))) {
      seen.add(String(v));
      vals.push(String(v));
    }
  }
  vals.sort();
  return vals.map(val => ({
    label: splitVar.valueLabels?.[val] ? `${val} (${splitVar.valueLabels[val]})` : val,
    rawValue: val,
    cases: cases.filter(c => String(c.values[splitVar.id]) === val),
  }));
}

// Main helper used by all dialogs
// Returns array of { label, cases } — length 1 when no split
export function getAnalysisCaseGroups(allCases, activeFilter, variables, splitVar) {
  const filtered = applyFilter(allCases, activeFilter, variables);
  return getSplitGroups(filtered, splitVar);
}

export { extractValues };
