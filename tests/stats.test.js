import { describe, expect, it } from 'vitest';
import { createCPythonFacade, hasScipy } from './helpers/cpython.js';
import { computeDescriptives } from '../src/lib/stats/descriptives.js';
import { computeOneWayAnova } from '../src/lib/stats/anova.js';
import { computeLinearRegression } from '../src/lib/stats/regression.js';
import { computeCorrelation } from '../src/lib/stats/correlation.js';
import { computeCrosstabs } from '../src/lib/stats/crosstabs.js';
import { independentTTest } from '../src/lib/stats/ttest.js';
import { computeFrequencies } from '../src/lib/stats/frequencies.js';

const py = createCPythonFacade();

describe.skipIf(!hasScipy())('stats modules (CPython + SciPy)', () => {
  it('descriptives: mean, SD (n−1), missing', async () => {
    const r = await computeDescriptives(py, [2, 4, 4, 4, 5, 5, 7, 9, null]);
    expect(r.n).toBe(8);
    expect(r.missing).toBe(1);
    expect(r.mean).toBeCloseTo(5, 10);
    expect(r.sd).toBeCloseTo(2.13808994, 6);
    expect(r.median).toBeCloseTo(4.5, 10);
  });

  it('one-way ANOVA: textbook F and Tukey post-hoc without statsmodels', async () => {
    const r = await computeOneWayAnova(py, [
      { label: 'A', values: [1, 2, 3] },
      { label: 'B', values: [2, 3, 4] },
      { label: 'C', values: [5, 6, 7] },
    ]);
    expect(r.ssBetween).toBeCloseTo(26, 10);
    expect(r.ssWithin).toBeCloseTo(6, 10);
    expect(r.fStatistic).toBeCloseTo(13, 10);
    expect(r.pValue).toBeCloseTo(0.006591796875, 10);
    expect(r.postHoc.method).toBe('tukey');
    const ac = r.postHoc.pairs.find((p) => p.groupA === 'A' && p.groupB === 'C');
    expect(ac.meanDiff).toBeCloseTo(4, 10); // mean(C) − mean(A)
    expect(ac.significant).toBe(true);
    const ab = r.postHoc.pairs.find((p) => p.groupA === 'A' && p.groupB === 'B');
    expect(ab.significant).toBe(false);
  });

  it('linear regression recovers an exact line and reports VIF = 1 for one predictor', async () => {
    const x = [1, 2, 3, 4, 5, 6, 7, 8];
    const noise = [0.1, -0.1, 0.05, -0.05, 0.02, -0.02, 0.03, -0.03];
    const y = x.map((v, i) => 2 * v + 1 + noise[i]);
    const r = await computeLinearRegression(py, y, [{ name: 'x', values: x }]);
    const [b0, b1] = r.coefficients;
    expect(b0.name).toBe('Intercept');
    expect(b1.coefficient).toBeCloseTo(2, 1);
    expect(b0.coefficient).toBeCloseTo(1, 0);
    expect(r.rSquared).toBeGreaterThan(0.999);
    expect(b1.vif).toBe(1);
    expect(r.dfResidual).toBe(6);
  });

  it('correlation: perfect positive and negative relationships', async () => {
    const r = await computeCorrelation(py, [
      { name: 'a', values: [1, 2, 3, 4, 5] },
      { name: 'b', values: [2, 4, 6, 8, 10] },
      { name: 'c', values: [5, 4, 3, 2, 1] },
    ]);
    expect(r.variables).toEqual(['a', 'b', 'c']);
    expect(r.pearson.r[0][1]).toBeCloseTo(1, 10);
    expect(r.pearson.r[0][2]).toBeCloseTo(-1, 10);
    expect(r.spearman.r[1][2]).toBeCloseTo(-1, 10);
  });

  it('crosstabs: χ² with Yates correction matches SciPy reference', async () => {
    const rows = [...Array(10).fill('x'), ...Array(20).fill('x'), ...Array(30).fill('y'), ...Array(40).fill('y')];
    const cols = [...Array(10).fill('p'), ...Array(20).fill('q'), ...Array(30).fill('p'), ...Array(40).fill('q')];
    const r = await computeCrosstabs(py, rows, cols);
    expect(r.dof).toBe(1);
    expect(r.chiSquare).toBeCloseTo(0.4464285714, 8);
    expect(r.pValue).toBeCloseTo(0.5040358665, 8);
  });

  it('independent t-test runs and returns a two-sided p-value', async () => {
    const r = await independentTTest(py, [5.1, 4.9, 5.6, 5.8, 6.0], [6.5, 6.9, 7.1, 6.8, 7.4]);
    expect(r.pValue).toBeGreaterThan(0);
    expect(r.pValue).toBeLessThan(0.01);
  });

  it('frequencies: counts and cumulative percents with value labels', async () => {
    const rows = await computeFrequencies(py, [1, 2, 2, null, 3, 3, 3], { 1: 'low' });
    expect(rows.map((r) => [r.value, r.frequency, r.label])).toEqual([['1', 1, 'low'], ['2', 2, '2'], ['3', 3, '3']]);
    expect(rows.at(-1).cumulativePercent).toBe(100);
  });
});
