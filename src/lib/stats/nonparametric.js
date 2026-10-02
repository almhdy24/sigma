async function runNP(pyodide, code) {
  const result = await pyodide.runPythonAsync(code);
  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}

export async function mannWhitneyU(pyodide, aValues, bValues) {
  const pA = pyodide.toPy(aValues);
  const pB = pyodide.toPy(bValues);
  pyodide.globals.set('_mw_a', pA);
  pyodide.globals.set('_mw_b', pB);
  pA.destroy();
  pB.destroy();

  return runNP(pyodide, `
import numpy as np
from scipy.stats import mannwhitneyu, rankdata

_a = np.array([float(x) for x in _mw_a if x is not None])
_b = np.array([float(x) for x in _mw_b if x is not None])
_nA, _nB = len(_a), len(_b)
_res = mannwhitneyu(_a, _b, alternative='two-sided')
_N = _nA + _nB
_z = (_res.statistic - _nA*_nB/2) / np.sqrt(_nA*_nB*(_N+1)/12) if _N > 2 else 0.0
_r = float(abs(_z) / np.sqrt(_N)) if _N > 0 else None
{
  'U': float(_res.statistic),
  'pValue': float(_res.pvalue),
  'nA': _nA, 'nB': _nB,
  'medianA': float(np.median(_a)), 'medianB': float(np.median(_b)),
  'z': float(_z),
  'r': _r,
}
`);
}

export async function wilcoxonSignedRank(pyodide, valuesA, valuesB) {
  const pA = pyodide.toPy(valuesA);
  const pB = pyodide.toPy(valuesB);
  pyodide.globals.set('_wx_a', pA);
  pyodide.globals.set('_wx_b', pB);
  pA.destroy();
  pB.destroy();

  return runNP(pyodide, `
import numpy as np
from scipy.stats import wilcoxon

_pairs = [
  (float(_wx_a[_k]), float(_wx_b[_k]))
  for _k in range(len(list(_wx_a)))
  if _wx_a[_k] is not None and _wx_b[_k] is not None
]
_a = np.array([p[0] for p in _pairs])
_b = np.array([p[1] for p in _pairs])
_diffs = _a - _b
_nonzero = _diffs[_diffs != 0]
_n = len(_nonzero)
_res = wilcoxon(_diffs)
_r = float(abs(_res.statistic) / (_n * (_n+1) / 2)) if _n > 0 else None
{
  'W': float(_res.statistic),
  'pValue': float(_res.pvalue),
  'n': _n,
  'medianDiff': float(np.median(_diffs)),
  'r': _r,
}
`);
}

export async function kruskalWallis(pyodide, groups) {
  const pValues = pyodide.toPy(groups.map((g) => g.values));
  const pLabels = pyodide.toPy(groups.map((g) => g.label));
  pyodide.globals.set('_kw_groups', pValues);
  pyodide.globals.set('_kw_labels', pLabels);
  pValues.destroy();
  pLabels.destroy();

  return runNP(pyodide, `
import numpy as np
from scipy.stats import kruskal

_gdata = [np.array([float(x) for x in g]) for g in _kw_groups]
_lbls = [str(l) for l in _kw_labels]
_H, _p = kruskal(*_gdata)
_N = sum(len(g) for g in _gdata)
_k = len(_gdata)
_eta2_H = float((_H - _k + 1) / (_N - _k)) if _N > _k else None
_medians = [float(np.median(g)) for g in _gdata]
{
  'H': float(_H),
  'pValue': float(_p),
  'df': int(_k - 1),
  'N': _N,
  'eta2H': _eta2_H,
  'groupMedians': [{'label': _lbls[_i], 'n': len(_gdata[_i]), 'median': _medians[_i]} for _i in range(_k)],
}
`);
}
