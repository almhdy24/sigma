import { describe, expect, it } from 'vitest';
import { computeBoxStats } from '../src/lib/charts/chartData.js';

describe('computeBoxStats', () => {
  it('uses linear-interpolation quartiles and flags outliers beyond 1.5 × IQR', () => {
    const s = computeBoxStats([1, 2, 3, 4, 5, 6, 7, 8, 100]);
    expect(s.q1).toBe(3);
    expect(s.median).toBe(5);
    expect(s.q3).toBe(7);
    expect(s.outliers).toEqual([100]);
    expect(s.whiskerHigh).toBe(8);
  });

  it('returns null for empty input', () => {
    expect(computeBoxStats([null])).toBeNull();
  });
});
