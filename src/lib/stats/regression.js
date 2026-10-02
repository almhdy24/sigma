async function runRegression(pyodide, code) {
  const result = await pyodide.runPythonAsync(code);
  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}

export async function computeLinearRegression(pyodide, dependentValues, independentVarsData) {
  const depProxy = pyodide.toPy(dependentValues);
  const indepProxy = pyodide.toPy(independentVarsData.map((v) => v.values));
  const namesProxy = pyodide.toPy(independentVarsData.map((v) => v.name));

  pyodide.globals.set('_reg_y', depProxy);
  pyodide.globals.set('_reg_X', indepProxy);
  pyodide.globals.set('_reg_names', namesProxy);

  depProxy.destroy();
  indepProxy.destroy();
  namesProxy.destroy();

  return runRegression(pyodide, `
import numpy as np
from scipy.stats import t as _t_dist, f as _f_dist

# Ordinary least squares with numpy/scipy only — same estimates, standard
# errors, p-values and VIFs as statsmodels.OLS, without downloading
# statsmodels + pandas (~20 MB) in the browser.
_y = np.array([float(v) for v in _reg_y])
_X_list = [np.array([float(v) for v in col]) for col in _reg_X]
_names_list = [str(n) for n in _reg_names]
_n = int(len(_y))
_p = int(len(_X_list))
_X = np.column_stack(_X_list)
_k = _p + 1
_all_names = ['Intercept'] + _names_list
_Xf = np.column_stack([np.ones(_n), _X])

def _r_squared(_target, _design):
    _b = np.linalg.pinv(_design) @ _target
    _res = float(np.sum((_target - _design @ _b) ** 2))
    _tot = float(np.sum((_target - np.mean(_target)) ** 2))
    return 1.0 - _res / _tot if _tot > 0 else 0.0

# VIF_i = 1 / (1 − R²_i), regressing predictor i on the other predictors
_vif_map = {}
for _vi in range(_p):
    if _p == 1:
        _vif_map[_all_names[_vi + 1]] = 1.0
        continue
    _others = np.column_stack([np.ones(_n), np.delete(_X, _vi, axis=1)])
    _r2_o = _r_squared(_X[:, _vi], _others)
    _vif_map[_all_names[_vi + 1]] = float(1.0 / (1.0 - _r2_o)) if _r2_o < 1 else float('inf')

_xtx_inv = np.linalg.pinv(_Xf.T @ _Xf)
_beta = _xtx_inv @ _Xf.T @ _y
_resid = _y - _Xf @ _beta
_ss_res = float(np.sum(_resid ** 2))
_ss_tot = float(np.sum((_y - np.mean(_y)) ** 2))
_df_res_v = int(_n - _k)
_df_mod = int(_k - 1)
_r_sq_v = float(1.0 - _ss_res / _ss_tot) if _ss_tot > 0 else None
_adj_r_sq_v = float(1.0 - (1.0 - _r_sq_v) * (_n - 1) / _df_res_v) if (_r_sq_v is not None and _df_res_v > 0) else None
_ms_res = _ss_res / _df_res_v if _df_res_v > 0 else float('nan')
_ms_mod = (_ss_tot - _ss_res) / _df_mod
_f_stat_v = float(_ms_mod / _ms_res) if _ms_res > 0 else None
_f_p_v = float(_f_dist.sf(_f_stat_v, _df_mod, _df_res_v)) if _f_stat_v is not None else None
_rse_v = float(np.sqrt(_ms_res))
_se_v = np.sqrt(np.diag(_xtx_inv) * _ms_res)
_tcrit = float(_t_dist.ppf(0.975, _df_res_v))
_coefficients = []
for _i in range(_k):
    _ts = float(_beta[_i] / _se_v[_i]) if _se_v[_i] > 0 else None
    _coefficients.append({
        'name': _all_names[_i],
        'coefficient': float(_beta[_i]),
        'stdError': float(_se_v[_i]),
        'tStatistic': _ts,
        'pValue': float(2.0 * _t_dist.sf(abs(_ts), _df_res_v)) if _ts is not None else None,
        'ciLow': float(_beta[_i] - _tcrit * _se_v[_i]),
        'ciHigh': float(_beta[_i] + _tcrit * _se_v[_i]),
        'vif': _vif_map.get(_all_names[_i], None) if _i > 0 else None,
    })

{
    'n': _n,
    'rSquared': _r_sq_v,
    'adjustedRSquared': _adj_r_sq_v,
    'fStatistic': _f_stat_v,
    'fPValue': _f_p_v,
    'coefficients': _coefficients,
    'residualStdError': _rse_v,
    'dfResidual': _df_res_v,
    'vif': _vif_map,
}
`);
}
