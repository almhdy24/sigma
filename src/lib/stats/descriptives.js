export async function computeDescriptives(pyodide, rawValues) {
  const proxy = pyodide.toPy(rawValues);
  pyodide.globals.set('_desc_data', proxy);
  proxy.destroy();

  const result = await pyodide.runPythonAsync(`
import numpy as np
from scipy import stats as _sp

_raw = list(_desc_data)
_missing = sum(1 for x in _raw if x is None)
_valid = [float(x) for x in _raw if x is not None]
_n = len(_valid)

if _n == 0:
    _r = {'n': 0, 'missing': _missing, 'mean': None, 'median': None,
          'mode': None, 'sd': None, 'variance': None, 'min': None,
          'max': None, 'range': None, 'q1': None, 'q3': None,
          'iqr': None, 'skewness': None, 'kurtosis': None}
else:
    _arr = np.array(_valid)
    _mode_res = _sp.mode(_arr, keepdims=True)
    _mode_val = float(_mode_res.mode[0])
    _sd = float(np.std(_arr, ddof=1)) if _n > 1 else 0.0
    _q1 = float(np.percentile(_arr, 25))
    _q3 = float(np.percentile(_arr, 75))
    _r = {
        'n': _n,
        'missing': _missing,
        'mean': float(np.mean(_arr)),
        'median': float(np.median(_arr)),
        'mode': _mode_val,
        'sd': _sd,
        'variance': _sd ** 2,
        'min': float(np.min(_arr)),
        'max': float(np.max(_arr)),
        'range': float(np.max(_arr) - np.min(_arr)),
        'q1': _q1,
        'q3': _q3,
        'iqr': _q3 - _q1,
        'skewness': float(_sp.skew(_arr)) if _n > 2 else 0.0,
        'kurtosis': float(_sp.kurtosis(_arr)) if _n > 3 else 0.0,
    }
_r
`);

  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}
