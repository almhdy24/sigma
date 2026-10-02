import { describe, expect, it } from 'vitest';
import { ExpressionError, evaluate, parseExpression, referencedVariables } from '../src/lib/expression.js';

describe('expression evaluator', () => {
  it('follows arithmetic precedence (power binds tighter than unary minus)', () => {
    expect(evaluate('1 + 2 * 3')).toBe(7);
    expect(evaluate('(1 + 2) * 3')).toBe(9);
    expect(evaluate('-2 ^ 2')).toBe(-4);
    expect(evaluate('2 ^ 3 ^ 2')).toBe(512);
    expect(evaluate('10 % 4')).toBe(2);
    expect(evaluate('1.5e2 + .5')).toBe(150.5);
  });

  it('uses variables and functions', () => {
    expect(evaluate('age * 2 + sqrt(income)', { age: 30, income: 16 })).toBe(64);
    expect(evaluate('round(weight / (height / 100) ^ 2, 1)', { weight: 70, height: 175 })).toBe(22.9);
    expect(evaluate('mean(a, b, c)', { a: 1, b: 2, c: 6 })).toBe(3);
    expect(evaluate('log(100, 10)')).toBeCloseTo(2, 12);
    expect(evaluate('ln(e)')).toBe(1);
  });

  it('propagates missing values instead of treating them as 0', () => {
    expect(evaluate('a + b', { a: 1, b: null })).toBeNull();
    expect(evaluate('a > 5 ? 1 : 0', { a: null })).toBeNull();
    expect(evaluate('1 / 0')).toBeNull();
  });

  it('supports comparisons, logic and conditionals for recoding', () => {
    expect(evaluate('age >= 18 and sex == 1', { age: 20, sex: 1 })).toBe(1);
    expect(evaluate('age < 18 or not (sex == 2)', { age: 20, sex: 2 })).toBe(0);
    expect(evaluate('bmi < 18.5 ? 1 : bmi < 25 ? 2 : 3', { bmi: 22 })).toBe(2);
  });

  it('lists referenced variables', () => {
    expect([...referencedVariables(parseExpression('a + sqrt(b) * pi'))]).toEqual(['a', 'b']);
  });

  it('rejects unsafe or invalid input', () => {
    expect(() => parseExpression('a.constructor')).toThrow(ExpressionError);
    expect(() => parseExpression('alert(1)')).toThrow(/Unknown function/);
    expect(() => evaluate('x + 1', {})).toThrow(/Unknown variable/);
    expect(() => parseExpression('1 +')).toThrow(ExpressionError);
    expect(() => parseExpression('(1')).toThrow(ExpressionError);
    expect(() => parseExpression('')).toThrow(ExpressionError);
  });
});
