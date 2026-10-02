function wilsonCI(k, n, z = 1.96) {
  if (n === 0) return { lo: 0, hi: 0 };
  const center = (k + (z * z) / 2) / (n + z * z);
  const half = (z * Math.sqrt((k * (n - k)) / n + (z * z) / 4)) / (n + z * z);
  return {
    lo: Math.max(0, center - half),
    hi: Math.min(1, center + half),
  };
}

function round4(x) {
  return Math.round(x * 10000) / 10000;
}

function roundCI(ci) {
  return { lo: round4(ci.lo), hi: round4(ci.hi) };
}

export function computeDiagnosticStats(testValues, referenceValues, testPositive, refPositive) {
  let tp = 0, fp = 0, fn = 0, tn = 0;

  for (let i = 0; i < testValues.length; i++) {
    const t = testValues[i];
    const r = referenceValues[i];
    if (t == null || t === '' || r == null || r === '') continue;

    const isTestPos = String(t) === String(testPositive);
    const isRefPos  = String(r) === String(refPositive);

    if (isTestPos && isRefPos)  tp++;
    else if (isTestPos && !isRefPos) fp++;
    else if (!isTestPos && isRefPos) fn++;
    else tn++;
  }

  const n = tp + fp + fn + tn;

  const sensitivity    = (tp + fn) > 0 ? tp / (tp + fn) : null;
  const specificity    = (tn + fp) > 0 ? tn / (tn + fp) : null;
  const ppv            = (tp + fp) > 0 ? tp / (tp + fp) : null;
  const npv            = (tn + fn) > 0 ? tn / (tn + fn) : null;
  const accuracy       = n > 0 ? (tp + tn) / n : null;

  const sensitivityCI  = (tp + fn) > 0 ? roundCI(wilsonCI(tp, tp + fn)) : null;
  const specificityCI  = (tn + fp) > 0 ? roundCI(wilsonCI(tn, tn + fp)) : null;
  const ppvCI          = (tp + fp) > 0 ? roundCI(wilsonCI(tp, tp + fp)) : null;
  const npvCI          = (tn + fn) > 0 ? roundCI(wilsonCI(tn, tn + fn)) : null;
  const accuracyCI     = n > 0 ? roundCI(wilsonCI(tp + tn, n)) : null;

  const plr = specificity != null && (1 - specificity) !== 0
    ? sensitivity / (1 - specificity)
    : null;
  const nlr = sensitivity != null && specificity !== 0
    ? (1 - sensitivity) / specificity
    : null;

  return {
    confusionMatrix: { tp, fp, fn, tn },
    sensitivity,
    sensitivityCI,
    specificity,
    specificityCI,
    ppv,
    ppvCI,
    npv,
    npvCI,
    accuracy,
    accuracyCI,
    plr,
    nlr,
    n,
  };
}
