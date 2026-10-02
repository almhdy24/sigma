/**
 * Returns frequency table rows sorted by value.
 * valueLabels: { [rawValue]: label } — labels applied JS-side after Python returns counts.
 */
export async function computeFrequencies(pyodide, rawValues, valueLabels = {}) {
  const proxy = pyodide.toPy(rawValues);
  pyodide.globals.set('_freq_data', proxy);
  proxy.destroy();

  const result = await pyodide.runPythonAsync(`
from collections import Counter

_valid = [str(x) for x in _freq_data if x is not None]
_total = len(_valid)
_counts = Counter(_valid)
_sorted_vals = sorted(_counts.keys())

_rows = []
_cum = 0
for _v in _sorted_vals:
    _freq = _counts[_v]
    _cum += _freq
    _pct = round(_freq / _total * 100, 2) if _total > 0 else 0.0
    _cum_pct = round(_cum / _total * 100, 2) if _total > 0 else 0.0
    _rows.append({'value': _v, 'frequency': _freq, 'percent': _pct,
                  'validPercent': _pct, 'cumulativePercent': _cum_pct})
_rows
`);

  const rows = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();

  return rows.map((row) => ({
    ...row,
    label: valueLabels[row.value] ?? row.value,
  }));
}
