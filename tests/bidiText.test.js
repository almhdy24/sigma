import { describe, expect, it } from 'vitest';
import bidiFactory from 'bidi-js';
import { baseDirection, createVisualizer } from '../src/lib/pdf/bidiText.js';

// Identity "shaper" keeps the test independent of jsPDF; shaping does not
// change bidi classes (presentation forms are still Arabic letters).
const toVisual = createVisualizer(bidiFactory(), (s) => s);
const rev = (s) => s.split('').reverse().join('');

describe('createVisualizer', () => {
  it('leaves pure LTR text alone', () => {
    expect(toVisual('Mean = 4.5 (n = 10)')).toBe('Mean = 4.5 (n = 10)');
  });

  it('reverses an RTL paragraph but keeps numbers and Latin runs left-to-right', () => {
    // logical: "العمر (age) = 42.5 سنة" in an RTL paragraph
    const out = toVisual('العمر (age) = 42.5 سنة', 'rtl');
    expect(out).toBe(`${rev('سنة')} 42.5 = (age) ${rev('العمر')}`);
  });

  it('keeps an Arabic word inside an English sentence in place', () => {
    const out = toVisual('Most frequent: "ذكر" (20 cases)', 'ltr');
    expect(out).toBe(`Most frequent: "${rev('ذكر')}" (20 cases)`);
  });

  it('strips invisible direction marks', () => {
    expect(toVisual('2\u200F/10\u200F/2026')).toBe('2/10/2026');
  });
});

describe('baseDirection', () => {
  it('uses the first strong character', () => {
    expect(baseDirection('42 العمر age')).toBe('rtl');
    expect(baseDirection('Frequency of الجنس')).toBe('ltr');
    expect(baseDirection('123')).toBe('ltr');
  });
});
