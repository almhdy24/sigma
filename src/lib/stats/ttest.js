async function runTTest(pyodide, code) {
  const result = await pyodide.runPythonAsync(code);
  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}

export async function oneSampleTTest(pyodide, values, testValue) {
  const proxy = pyodide.toPy(values);
  pyodide.globals.set('_tt_vals', proxy);
  pyodide.globals.set('_tt_test_val', testValue);
  proxy.destroy();

  return runTTest(pyodide, `
import numpy as np
from scipy.stats import ttest_1samp

_v = [float(x) for x in _tt_vals if x is not None]
_n = len(_v)
_arr = np.array(_v)
_mean = float(np.mean(_arr))
_sd = float(np.std(_arr, ddof=1)) if _n > 1 else 0.0
_tres = ttest_1samp(_arr, _tt_test_val)
_ci = _tres.confidence_interval(0.95)
{
    'n': _n,
    'mean': _mean,
    'sd': _sd,
    'meanDiff': _mean - float(_tt_test_val),
    'ciLow': float(_ci.low),
    'ciHigh': float(_ci.high),
    'tStatistic': float(_tres.statistic),
    'df': int(_tres.df),
    'pValue': float(_tres.pvalue),
    'cohensD': float((_mean - float(_tt_test_val)) / _sd) if _sd > 0 else None,
    'variant': 'one-sample',
}
`);
}

export async function independentTTest(pyodide, groupAValues, groupBValues) {
  const pA = pyodide.toPy(groupAValues);
  const pB = pyodide.toPy(groupBValues);
  pyodide.globals.set('_tt_a', pA);
  pyodide.globals.set('_tt_b', pB);
  pA.destroy();
  pB.destroy();

  return runTTest(pyodide, `
import numpy as np
from scipy.stats import ttest_ind, levene

_a = np.array([float(x) for x in _tt_a if x is not None])
_b = np.array([float(x) for x in _tt_b if x is not None])

_lev_stat, _lev_p = levene(_a, _b) if len(_a) > 1 and len(_b) > 1 else (None, None)
_equal_var = (_lev_p is None or float(_lev_p) > 0.05)

_tres = ttest_ind(_a, _b, equal_var=_equal_var)
_ci = _tres.confidence_interval(0.95)
_sdA = float(np.std(_a, ddof=1)) if len(_a) > 1 else 0.0
_sdB = float(np.std(_b, ddof=1)) if len(_b) > 1 else 0.0
_nA, _nB = len(_a), len(_b)
_pooled_sd = float(np.sqrt(((_nA-1)*_sdA**2 + (_nB-1)*_sdB**2) / (_nA+_nB-2))) if _nA+_nB > 2 else 0.0
_d = float((np.mean(_a) - np.mean(_b)) / _pooled_sd) if _pooled_sd > 0 else None
{
    'nA': _nA, 'nB': _nB,
    'meanA': float(np.mean(_a)), 'meanB': float(np.mean(_b)),
    'sdA': _sdA, 'sdB': _sdB,
    'meanDiff': float(np.mean(_a) - np.mean(_b)),
    'ciLow': float(_ci.low),
    'ciHigh': float(_ci.high),
    'tStatistic': float(_tres.statistic),
    'df': float(_tres.df),
    'pValue': float(_tres.pvalue),
    'leveneF': float(_lev_stat) if _lev_stat is not None else None,
    'leveneP': float(_lev_p) if _lev_p is not None else None,
    'cohensD': _d,
    'variant': 'equal-var' if _equal_var else 'welch',
}
`);
}

export async function pairedTTest(pyodide, valuesA, valuesB) {
  const pA = pyodide.toPy(valuesA);
  const pB = pyodide.toPy(valuesB);
  pyodide.globals.set('_tt_pa', pA);
  pyodide.globals.set('_tt_pb', pB);
  pA.destroy();
  pB.destroy();

  return runTTest(pyodide, `
import numpy as np
from scipy.stats import ttest_rel

_pairs = [
    (float(_tt_pa[_k]), float(_tt_pb[_k]))
    for _k in range(len(list(_tt_pa)))
    if _tt_pa[_k] is not None and _tt_pb[_k] is not None
]
_a = np.array([p[0] for p in _pairs])
_b = np.array([p[1] for p in _pairs])
_diffs = _a - _b
_n = len(_pairs)

_tres = ttest_rel(_a, _b)
_ci = _tres.confidence_interval(0.95)
{
    'n': _n,
    'mean': float(np.mean(_diffs)),
    'sd': float(np.std(_diffs, ddof=1)) if _n > 1 else 0.0,
    'meanDiff': float(np.mean(_diffs)),
    'ciLow': float(_ci.low),
    'ciHigh': float(_ci.high),
    'tStatistic': float(_tres.statistic),
    'df': int(_tres.df),
    'pValue': float(_tres.pvalue),
    'cohensD': float(np.mean(_diffs) / np.std(_diffs, ddof=1)) if _n > 1 and float(np.std(_diffs, ddof=1)) > 0 else None,
    'variant': 'paired',
}
`);
}
