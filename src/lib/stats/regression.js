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

_y = np.array([float(v) for v in _reg_y])
_X_list = [np.array([float(v) for v in col]) for col in _reg_X]
_names_list = [str(n) for n in _reg_names]
_n = int(len(_y))
_p = int(len(_X_list))
_X = np.column_stack(_X_list) if _p > 1 else _X_list[0].reshape(-1, 1)
_k = _p + 1
_all_names = ['Intercept'] + _names_list

_coefficients = None
_r_sq_v = _adj_r_sq_v = _f_stat_v = _f_p_v = _rse_v = None
_df_res_v = None

# Compute VIF map (predictor name -> VIF value)
_vif_map = {}
try:
    from statsmodels.stats.outliers_influence import variance_inflation_factor as _vif_fn
    _Xvif = np.column_stack([np.ones(_n), _X])
    for _vi in range(1, _k):
        _vif_map[_all_names[_vi]] = float(_vif_fn(_Xvif, _vi))
except Exception:
    # Manual fallback: VIF_i = 1 / (1 - R²_i)
    if _p > 1:
        for _vi in range(_p):
            _xi = _X[:, _vi]
            _others = np.delete(_X, _vi, axis=1)
            if _others.shape[1] == 0:
                _vif_map[_all_names[_vi + 1]] = 1.0
                continue
            _Xo = np.column_stack([np.ones(_n), _others])
            _beta_o, _, _, _ = np.linalg.lstsq(_Xo, _xi, rcond=None)
            _xi_hat = _Xo @ _beta_o
            _ss_res_o = float(np.sum((_xi - _xi_hat) ** 2))
            _ss_tot_o = float(np.sum((_xi - np.mean(_xi)) ** 2))
            _r2_o = 1 - _ss_res_o / _ss_tot_o if _ss_tot_o > 0 else 0.0
            _vif_map[_all_names[_vi + 1]] = float(1 / (1 - _r2_o)) if _r2_o < 1 else 999.0

try:
    import statsmodels.api as _sm
    _X_sm = _sm.add_constant(_X, prepend=True)
    _mdl = _sm.OLS(_y, _X_sm).fit()
    _r_sq_v = float(_mdl.rsquared)
    _adj_r_sq_v = float(_mdl.rsquared_adj)
    _f_stat_v = float(_mdl.fvalue)
    _f_p_v = float(_mdl.f_pvalue)
    _df_res_v = int(_mdl.df_resid)
    _rse_v = float(np.sqrt(float(_mdl.mse_resid)))
    _params = [float(x) for x in _mdl.params]
    _bse_l = [float(x) for x in _mdl.bse]
    _tvals_l = [float(x) for x in _mdl.tvalues]
    _pvals_l = [float(x) for x in _mdl.pvalues]
    _ci_arr = np.array(_mdl.conf_int())
    _coefficients = [
        {
            'name': _all_names[_i],
            'coefficient': _params[_i],
            'stdError': _bse_l[_i],
            'tStatistic': _tvals_l[_i],
            'pValue': _pvals_l[_i],
            'ciLow': float(_ci_arr[_i, 0]),
            'ciHigh': float(_ci_arr[_i, 1]),
            'vif': _vif_map.get(_all_names[_i], None) if _i > 0 else None,
        }
        for _i in range(_k)
    ]
except Exception:
    pass

if _coefficients is None:
    _Xf = np.column_stack([np.ones(_n), _X])
    _beta, _, _, _ = np.linalg.lstsq(_Xf, _y, rcond=None)
    _yhat = _Xf @ _beta
    _resid = _y - _yhat
    _ss_res = float(np.sum(_resid ** 2))
    _ss_tot = float(np.sum((_y - np.mean(_y)) ** 2))
    _r_sq_v = float(1.0 - _ss_res / _ss_tot)
    _df_res_v = int(_n - _k)
    _df_mod = int(_k - 1)
    _adj_r_sq_v = float(1.0 - (1.0 - _r_sq_v) * (_n - 1) / (_n - _k))
    _ms_res = _ss_res / _df_res_v
    _ms_mod = (_ss_tot - _ss_res) / _df_mod
    _f_stat_v = float(_ms_mod / _ms_res)
    _f_p_v = float(1.0 - _f_dist.cdf(_f_stat_v, _df_mod, _df_res_v))
    _rse_v = float(np.sqrt(_ms_res))
    _cov = _ms_res * np.linalg.inv(_Xf.T @ _Xf)
    _se_v = np.sqrt(np.diag(_cov))
    _ts = _beta / _se_v
    _tcrit = float(_t_dist.ppf(0.975, _df_res_v))
    _coefficients = [
        {
            'name': _all_names[_i],
            'coefficient': float(_beta[_i]),
            'stdError': float(_se_v[_i]),
            'tStatistic': float(_ts[_i]),
            'pValue': float(2.0 * (1.0 - _t_dist.cdf(abs(float(_ts[_i])), _df_res_v))),
            'ciLow': float(_beta[_i] - _tcrit * _se_v[_i]),
            'ciHigh': float(_beta[_i] + _tcrit * _se_v[_i]),
            'vif': _vif_map.get(_all_names[_i], None) if _i > 0 else None,
        }
        for _i in range(_k)
    ]

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
