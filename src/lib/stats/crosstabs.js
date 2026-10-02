export async function computeCrosstabs(pyodide, rowValues, colValues) {
  const rProxy = pyodide.toPy(rowValues);
  const cProxy = pyodide.toPy(colValues);
  pyodide.globals.set('_ct_row', rProxy);
  pyodide.globals.set('_ct_col', cProxy);
  rProxy.destroy();
  cProxy.destroy();

  const result = await pyodide.runPythonAsync(`
import numpy as np
from scipy.stats import chi2_contingency
from collections import defaultdict

_rv = list(_ct_row)
_cv = list(_ct_col)

_row_labels = sorted(set(str(x) for x in _rv if x is not None))
_col_labels = sorted(set(str(x) for x in _cv if x is not None))

_counts = defaultdict(lambda: defaultdict(int))
_n_total = 0
for _r, _c in zip(_rv, _cv):
    if _r is not None and _c is not None:
        _counts[str(_r)][str(_c)] += 1
        _n_total += 1

_table = [[_counts[_r][_c] for _c in _col_labels] for _r in _row_labels]
_nr = len(_row_labels)
_nc = len(_col_labels)

if _nr >= 2 and _nc >= 2 and _n_total > 0:
    _arr = np.array(_table)
    try:
        _chi2, _p, _dof, _expected = chi2_contingency(_arr)
        _chi2 = float(_chi2)
        _p = float(_p)
        _dof = int(_dof)
        _expected = [[float(_expected[_i][_j]) for _j in range(_nc)] for _i in range(_nr)]
        _chi_error = None
        _min_dim = min(_nr, _nc)
        _cramers_v = float(np.sqrt(_chi2 / (_n_total * (_min_dim - 1)))) if _n_total > 0 and _min_dim > 1 else None
    except Exception:
        _chi2, _p, _dof = None, None, None
        _expected = [[0.0] * _nc for _ in range(_nr)]
        _chi_error = 'zero_expected_frequency'
        _cramers_v = None
else:
    _chi2, _p, _dof = None, None, None
    _expected = [[0.0] * _nc for _ in range(_nr)]
    _chi_error = None
    _cramers_v = None

_row_sums = [sum(_table[_i]) for _i in range(_nr)]
_col_sums = [sum(_table[_i][_j] for _i in range(_nr)) for _j in range(_nc)]

def _pct(v, total):
    return round(v / total * 100, 2) if total > 0 else 0.0

_row_pct = [[_pct(_table[_i][_j], _row_sums[_i]) for _j in range(_nc)] for _i in range(_nr)]
_col_pct = [[_pct(_table[_i][_j], _col_sums[_j]) for _j in range(_nc)] for _i in range(_nr)]
_tot_pct = [[_pct(_table[_i][_j], _n_total) for _j in range(_nc)] for _i in range(_nr)]

{
    'table': _table,
    'rowLabels': _row_labels,
    'colLabels': _col_labels,
    'rowPercent': _row_pct,
    'colPercent': _col_pct,
    'totalPercent': _tot_pct,
    'chiSquare': _chi2,
    'pValue': _p,
    'dof': _dof,
    'expectedCounts': _expected,
    'chiError': _chi_error,
    'cramersV': _cramers_v,
}
`);

  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}
