/**
 * variablePairs: [{ name: string, values: (number|null)[] }, ...]
 */
export async function computeCorrelation(pyodide, variablePairs) {
  const names = variablePairs.map((v) => v.name);
  const allValues = variablePairs.map((v) => v.values);

  const namesProxy = pyodide.toPy(names);
  const valuesProxy = pyodide.toPy(allValues);
  pyodide.globals.set('_corr_names', namesProxy);
  pyodide.globals.set('_corr_values', valuesProxy);
  namesProxy.destroy();
  valuesProxy.destroy();

  const result = await pyodide.runPythonAsync(`
from scipy.stats import pearsonr, spearmanr

_names = list(_corr_names)
_all_vals = [list(v) for v in _corr_values]
_nv = len(_names)
_n_cases = len(_all_vals[0]) if _nv > 0 else 0

def _make_matrix(n):
    return [[None]*n for _ in range(n)]

_pr = _make_matrix(_nv)
_pp = _make_matrix(_nv)
_sr = _make_matrix(_nv)
_sp2 = _make_matrix(_nv)

for _i in range(_nv):
    _pr[_i][_i] = 1.0; _pp[_i][_i] = 0.0
    _sr[_i][_i] = 1.0; _sp2[_i][_i] = 0.0
    for _j in range(_i + 1, _nv):
        _pairs = [
            (_all_vals[_i][_k], _all_vals[_j][_k])
            for _k in range(_n_cases)
            if _all_vals[_i][_k] is not None and _all_vals[_j][_k] is not None
        ]
        if len(_pairs) < 3:
            continue
        _xi = [p[0] for p in _pairs]
        _xj = [p[1] for p in _pairs]
        _r_p, _p_p = pearsonr(_xi, _xj)
        _r_s, _p_s = spearmanr(_xi, _xj)
        _pr[_i][_j] = _pr[_j][_i] = float(_r_p)
        _pp[_i][_j] = _pp[_j][_i] = float(_p_p)
        _sr[_i][_j] = _sr[_j][_i] = float(_r_s)
        _sp2[_i][_j] = _sp2[_j][_i] = float(_p_s)

{
    'variables': _names,
    'pearson': {'r': _pr, 'p': _pp},
    'spearman': {'r': _sr, 'p': _sp2},
}
`);

  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}
