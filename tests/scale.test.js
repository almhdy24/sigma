import { describe, expect, it } from 'vitest';
import { bandLayout, formatTick, linear, niceTicks, numericX } from '../src/lib/charts/scale.js';

describe('chart scales', () => {
  it('niceTicks covers the domain with round steps', () => {
    expect(niceTicks(0, 20, 5)).toEqual([0, 5, 10, 15, 20]);
    expect(niceTicks(0.13, 0.91, 4)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    const t = niceTicks(-3.2, 47, 5);
    expect(t[0]).toBeLessThanOrEqual(-3.2);
    expect(t.at(-1)).toBeGreaterThanOrEqual(47);
  });

  it('handles a constant domain', () => {
    expect(niceTicks(5, 5).length).toBeGreaterThan(1);
  });

  it('linear maps endpoints (and inverts for SVG y)', () => {
    const y = linear([0, 10], [300, 0]);
    expect(y(0)).toBe(300);
    expect(y(10)).toBe(0);
    expect(y(5)).toBe(150);
  });

  it('bands are evenly spaced', () => {
    const { band, center } = bandLayout(4, 0, 400);
    expect(band).toBe(100);
    expect(center(0)).toBe(50);
    expect(center(3)).toBe(350);
  });

  it('numericX extends to nice ticks', () => {
    const { x, ticks } = numericX([0, 1], 0, 300);
    expect(ticks[0]).toBe(0);
    expect(x(ticks.at(-1))).toBe(300);
  });

  it('formats large ticks compactly', () => {
    expect(formatTick(25000)).toBe('25.0k');
    expect(formatTick(0.1 + 0.2)).toBe('0.3');
  });
});
