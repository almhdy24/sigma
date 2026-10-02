async function runRel(pyodide, code) {
  const result = await pyodide.runPythonAsync(code);
  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}

export async function computeCronbachsAlpha(pyodide, itemsData) {
  // itemsData: [{name, values}, ...] — at least 3 items
  // Listwise deletion: only include rows where ALL items are non-null

  const pValues = pyodide.toPy(itemsData.map(d => d.values));
  const pNames  = pyodide.toPy(itemsData.map(d => d.name));
  pyodide.globals.set('_rel_vals', pValues);
  pyodide.globals.set('_rel_names', pNames);
  pValues.destroy(); pNames.destroy();

  return runRel(pyodide, `
import numpy as np

_raw = [[float(v) if v is not None else None for v in col] for col in _rel_vals]
_k = len(_raw)
_n_all = len(_raw[0])
_names = [str(n) for n in _rel_names]

_valid_rows = [
    i for i in range(_n_all)
    if all(_raw[j][i] is not None for j in range(_k))
]
_n = len(_valid_rows)

_mat = np.array([[_raw[j][i] for i in _valid_rows] for j in range(_k)])

_var_items = np.var(_mat, axis=1, ddof=1)
_total_scores = np.sum(_mat, axis=0)
_var_total = float(np.var(_total_scores, ddof=1))

_alpha = float((_k / (_k - 1)) * (1 - float(np.sum(_var_items)) / _var_total)) if _var_total > 0 else None

_item_total_corrs = []
for _i in range(_k):
    _rest = np.sum(_mat[np.arange(_k) != _i], axis=0)
    _r = float(np.corrcoef(_mat[_i], _rest)[0, 1]) if _n > 2 else None

    _var_without = np.delete(_mat, _i, axis=0)
    _vt_without = float(np.var(np.sum(_var_without, axis=0), ddof=1))
    _var_items_w = np.delete(_var_items, _i)
    _alpha_if_del = float((_k - 1) / (_k - 2) * (1 - float(np.sum(_var_items_w)) / _vt_without)) if _k > 2 and _vt_without > 0 else None

    _item_total_corrs.append({
        'item': _names[_i],
        'correlation': _r,
        'alphaIfDeleted': _alpha_if_del,
    })

{
    'alpha': _alpha,
    'itemCount': _k,
    'n': _n,
    'itemTotalCorrelations': _item_total_corrs,
}
`);
}
