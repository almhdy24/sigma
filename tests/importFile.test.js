import { describe, expect, it } from 'vitest';
import { sanitizeNames, suggestType } from '../src/lib/importFile.js';

describe('sanitizeNames', () => {
  it('keeps ASCII identifiers and fixes invalid characters', () => {
    expect(sanitizeNames(['age', 'blood pressure', '2nd visit'])).toEqual(['age', 'blood_pressure', 'v2nd_visit']);
  });

  it('gives Arabic-only headers unique fallback names instead of "___"', () => {
    expect(sanitizeNames(['العمر', 'الجنس', 'الوزن'])).toEqual(['var1', 'var2', 'var3']);
  });

  it('keeps the Latin part of mixed headers and de-duplicates', () => {
    expect(sanitizeNames(['BMI (كغم/م²)', 'bmi', 'BMI'])).toEqual(['BMI', 'bmi_2', 'BMI_3']);
  });

  it('avoids clashing with existing variable names', () => {
    expect(sanitizeNames(['age'], ['age'])).toEqual(['age_2']);
  });
});

describe('suggestType', () => {
  it('detects numeric, categorical and string columns', () => {
    expect(suggestType(['1', '2.5', ' 3 ', ''])).toBe('numeric');
    expect(suggestType(['ذكر', 'أنثى', 'ذكر'])).toBe('categorical');
    expect(suggestType(Array.from({ length: 20 }, (_, i) => `id-${i}`))).toBe('string');
  });
});
