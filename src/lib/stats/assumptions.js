async function runAssump(pyodide, code) {
  const result = await pyodide.runPythonAsync(code);
  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}

export async function shapiroWilkTest(pyodide, values, label) {
  const clean = values.filter((x) => x !== null && x !== undefined);
  if (clean.length < 3) {
    return { label, n: clean.length, W: null, pValue: null, skipped: true };
  }
  if (clean.length > 5000) {
    return { label, n: clean.length, W: null, pValue: null, skipped: true, reason: 'n>5000' };
  }

  const proxy = pyodide.toPy(clean);
  pyodide.globals.set('_sw_vals', proxy);
  proxy.destroy();

  return runAssump(pyodide, `
from scipy.stats import shapiro
import numpy as np
_arr = np.array([float(x) for x in _sw_vals])
_W, _p = shapiro(_arr)
{'label': None, 'n': len(_arr), 'W': float(_W), 'pValue': float(_p), 'skipped': False}
`).then((r) => ({ ...r, label }));
}

export async function levenesTest(pyodide, groups) {
  const pValues = pyodide.toPy(groups.map((g) => g.values));
  pyodide.globals.set('_lev_groups', pValues);
  pValues.destroy();

  return runAssump(pyodide, `
from scipy.stats import levene
import numpy as np
_gdata = [np.array([float(x) for x in g]) for g in _lev_groups]
_F, _p = levene(*_gdata) if all(len(g) > 1 for g in _gdata) else (None, None)
{'F': float(_F) if _F is not None else None, 'pValue': float(_p) if _p is not None else None}
`);
}
