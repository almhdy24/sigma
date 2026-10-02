const FMT4 = (v) => (v == null ? 'N/A' : Number(v).toFixed(4));
const FMT2 = (v) => (v == null ? 'N/A' : Number(v).toFixed(2));
const fmtP = (p) => p == null ? 'p = N/A' : p < 0.001 ? 'p < .001' : `p = ${Number(p).toFixed(3)}`;

export function apaOneSampleTTest(varName, testValue, res) {
  const d = res.cohensD;
  const dStr = d == null ? '' : `, d = ${FMT4(d)}`;
  return `A one-sample t-test was conducted to determine whether the mean of ${varName} differed significantly from a test value of ${testValue}. The mean was ${FMT4(res.mean)} (SD = ${FMT4(res.sd)}, N = ${res.n}). The test was not statistically significant, t(${res.df}) = ${FMT4(res.tStatistic)}, ${fmtP(res.pValue)}${dStr}.`.replace('not statistically significant', res.pValue < 0.05 ? 'statistically significant' : 'not statistically significant');
}

export function apaIndependentTTest(varName, groupVarName, groupA, groupB, res) {
  const variant = res.variant === 'welch' ? "Welch's t-test" : 'an independent-samples t-test';
  const d = res.cohensD;
  const dStr = d == null ? '' : `, d = ${FMT4(d)}`;
  const sig = res.pValue < 0.05;
  return `${sig ? 'A' : 'A'} ${variant} was conducted to compare ${varName} across groups (${groupA}: M = ${FMT4(res.meanA)}, SD = ${FMT4(res.sdA)}, n = ${res.nA}; ${groupB}: M = ${FMT4(res.meanB)}, SD = ${FMT4(res.sdB)}, n = ${res.nB}). Levene's test for equality of variances indicated ${res.leveneP != null && res.leveneP < 0.05 ? 'unequal variances' : 'equal variances'}. The difference was ${sig ? '' : 'not '}statistically significant, t(${FMT2(res.df)}) = ${FMT4(res.tStatistic)}, ${fmtP(res.pValue)}${dStr}.`;
}

export function apaPairedTTest(varAName, varBName, res) {
  const d = res.cohensD;
  const dStr = d == null ? '' : `, d = ${FMT4(d)}`;
  const sig = res.pValue < 0.05;
  return `A paired-samples t-test was conducted to examine differences between ${varAName} and ${varBName} (N = ${res.n} pairs). The mean difference was ${FMT4(res.meanDiff)} (SD = ${FMT4(res.sd)}, 95% CI [${FMT4(res.ciLow)}, ${FMT4(res.ciHigh)}]). The difference was ${sig ? '' : 'not '}statistically significant, t(${res.df}) = ${FMT4(res.tStatistic)}, ${fmtP(res.pValue)}${dStr}.`;
}

export function apaAnova(depName, factorName, res) {
  const sig = res.pValue < 0.05;
  const eta = res.etaSquared;
  const etaStr = eta == null ? '' : `, η² = ${FMT4(eta)}`;
  return `A one-way analysis of variance (ANOVA) was conducted to examine the effect of ${factorName} on ${depName} (${res.dfBetween + res.dfWithin + 1} total observations). ${sig ? 'A statistically significant' : 'No statistically significant'} effect was found, F(${res.dfBetween}, ${res.dfWithin}) = ${FMT4(res.fStatistic)}, ${fmtP(res.pValue)}${etaStr}.${sig ? ' Post-hoc comparisons were conducted using Tukey\'s HSD.' : ''}`;
}

export function apaCorrelation(varNames, pearsonR, pearsonP) {
  const pairs = [];
  for (let i = 0; i < varNames.length; i++) {
    for (let j = i + 1; j < varNames.length; j++) {
      const r = pearsonR[i]?.[j];
      const p = pearsonP[i]?.[j];
      if (r != null) pairs.push(`${varNames[i]} and ${varNames[j]}: r(N) = ${FMT4(r)}, ${fmtP(p)}`);
    }
  }
  return `Pearson product-moment correlations were computed to assess the relationships among ${varNames.join(', ')}. ${pairs.join('; ')}.`;
}

export function apaRegression(depName, predictorNames, res) {
  const rPct = (res.rSquared * 100).toFixed(1);
  const sig = res.fPValue < 0.05;
  return `A multiple linear regression analysis was conducted with ${depName} as the criterion variable and ${predictorNames.join(', ')} as predictor${predictorNames.length > 1 ? 's' : ''}. The overall model was ${sig ? '' : 'not '}statistically significant, F(${predictorNames.length}, ${res.dfResidual}) = ${FMT4(res.fStatistic)}, ${fmtP(res.fPValue)}, R² = ${FMT4(res.rSquared)}, adjusted R² = ${FMT4(res.adjustedRSquared)}, explaining ${rPct}% of the variance in ${depName}.`;
}

export function apaCrosstabs(rowName, colName, res) {
  if (res.chiError) {
    return `A chi-square test of independence was attempted to examine the relationship between ${rowName} and ${colName}; however, the test could not be completed due to cells with zero expected frequencies.`;
  }
  if (res.chiSquare == null) {
    return `Frequency distributions were computed for ${rowName} by ${colName}. The table was too small for a chi-square test.`;
  }
  const sig = res.pValue < 0.05;
  const vStr = res.cramersV != null ? `, Cramér's V = ${FMT4(res.cramersV)}` : '';
  return `A chi-square test of independence was conducted to examine the relationship between ${rowName} and ${colName}. The association was ${sig ? '' : 'not '}statistically significant, χ²(${res.dof}) = ${FMT4(res.chiSquare)}, ${fmtP(res.pValue)}${vStr}.`;
}

export function apaDescriptives(varNames) {
  return `Descriptive statistics were computed for ${varNames.join(', ')}, including means, standard deviations, medians, and measures of distribution shape (skewness and kurtosis). Outliers were identified using the IQR (1.5 × IQR rule) and z-score (|z| > 3) criteria.`;
}

export function apaFrequencies(varNames) {
  return `Frequency distributions were computed for ${varNames.join(', ')}, including absolute frequencies, valid percentages, and cumulative percentages.`;
}
