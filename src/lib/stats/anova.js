async function runAnova(pyodide, code) {
  const result = await pyodide.runPythonAsync(code);
  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}

export async function computeOneWayAnova(pyodide, groups) {
  const pValues = pyodide.toPy(groups.map((g) => g.values));
  const pLabels = pyodide.toPy(groups.map((g) => g.label));
  pyodide.globals.set('_anova_groups', pValues);
  pyodide.globals.set('_anova_labels', pLabels);
  pValues.destroy();
  pLabels.destroy();

  return runAnova(pyodide, `
import numpy as np
from scipy.stats import f_oneway

_gdata = [np.array([float(x) for x in g]) for g in _anova_groups]
_lbls = [str(l) for l in _anova_labels]
_k = len(_gdata)
_n_total = int(sum(len(g) for g in _gdata))
_grand_mean = float(np.mean(np.concatenate(_gdata)))

_f_stat, _p_val = f_oneway(*_gdata)
_f_stat = float(_f_stat)
_p_val = float(_p_val)

_df_between = int(_k - 1)
_df_within = int(_n_total - _k)
_ss_between = float(sum(len(g) * (float(np.mean(g)) - _grand_mean) ** 2 for g in _gdata))
_ss_within = float(sum(float(np.sum((g - np.mean(g)) ** 2)) for g in _gdata))
_ss_total = _ss_between + _ss_within
_ms_between = _ss_between / _df_between
_ms_within = _ss_within / _df_within

_group_stats = [
    {
        'label': _lbls[_i],
        'n': int(len(_gdata[_i])),
        'mean': float(np.mean(_gdata[_i])),
        'sd': float(np.std(_gdata[_i], ddof=1)) if len(_gdata[_i]) > 1 else 0.0,
    }
    for _i in range(_k)
]

_post_hoc = None
if _p_val < 0.05:
    try:
        from statsmodels.stats.multicomp import pairwise_tukeyhsd
        from itertools import combinations as _comb
        _all_vals = np.concatenate(_gdata)
        _all_lbls = np.concatenate([[_lbls[_i]] * len(_g) for _i, _g in enumerate(_gdata)])
        _tukey = pairwise_tukeyhsd(_all_vals, _all_lbls, alpha=0.05)
        _guniq = list(_tukey.groupsunique)
        _pairs = [
            {
                'groupA': str(_guniq[_gi]),
                'groupB': str(_guniq[_gj]),
                'meanDiff': float(_tukey.meandiffs[_idx]),
                'pValue': float(_tukey.pvalues[_idx]),
                'significant': bool(_tukey.reject[_idx]),
            }
            for _idx, (_gi, _gj) in enumerate(_comb(range(len(_guniq)), 2))
        ]
        _post_hoc = {'method': 'tukey', 'pairs': _pairs}
    except Exception:
        _post_hoc = None

{
    'groups': _group_stats,
    'fStatistic': _f_stat,
    'pValue': _p_val,
    'dfBetween': _df_between,
    'dfWithin': _df_within,
    'ssBetween': _ss_between,
    'ssWithin': _ss_within,
    'ssTotal': _ss_total,
    'msBetween': _ms_between,
    'msWithin': _ms_within,
    'etaSquared': float(_ss_between / _ss_total) if _ss_total > 0 else None,
    'postHoc': _post_hoc,
}
`);
}
