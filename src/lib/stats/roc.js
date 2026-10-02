export async function computeROC(pyodide, scoreValues, referenceValues, refPositive) {
  // scoreValues: continuous numeric array (may have nulls)
  // referenceValues: binary categorical array same length (may have nulls)
  // refPositive: string — which value of referenceValues means "positive"
  // Returns { points: [{fpr, tpr, threshold}], auc, n }

  // Filter to paired non-null rows
  const pairs = scoreValues.map((s, i) => [s, referenceValues[i]])
    .filter(([s, r]) => s != null && r != null && !isNaN(Number(s)));

  if (pairs.length < 10) throw new Error('roc.tooFewPairs');

  const scores = pyodide.toPy(pairs.map(([s]) => Number(s)));
  const labels = pyodide.toPy(pairs.map(([, r]) => String(r) === String(refPositive) ? 1 : 0));
  pyodide.globals.set('_roc_scores', scores);
  pyodide.globals.set('_roc_labels', labels);
  scores.destroy(); labels.destroy();

  const result = await pyodide.runPythonAsync(`
import numpy as np

_sc = np.array([float(x) for x in _roc_scores])
_lb = np.array([int(x) for x in _roc_labels])

_thresholds = np.unique(_sc)[::-1]
_pts = []
for _thr in _thresholds:
    _pred = (_sc >= _thr).astype(int)
    _tp = int(np.sum((_pred == 1) & (_lb == 1)))
    _fp = int(np.sum((_pred == 1) & (_lb == 0)))
    _fn = int(np.sum((_pred == 0) & (_lb == 1)))
    _tn = int(np.sum((_pred == 0) & (_lb == 0)))
    _tpr = _tp / (_tp + _fn) if (_tp + _fn) > 0 else 0.0
    _fpr = _fp / (_fp + _tn) if (_fp + _tn) > 0 else 0.0
    _pts.append({'fpr': float(_fpr), 'tpr': float(_tpr), 'threshold': float(_thr)})

_pts.append({'fpr': 0.0, 'tpr': 0.0, 'threshold': float(np.max(_sc)) + 1})

_fprs = np.array([p['fpr'] for p in _pts])
_tprs = np.array([p['tpr'] for p in _pts])
_auc = float(np.trapz(_tprs[::-1], _fprs[::-1]))

{'points': _pts, 'auc': _auc, 'n': len(_sc)}
`);

  const js = result.toJs({ dict_converter: Object.fromEntries });
  result.destroy();
  return js;
}
