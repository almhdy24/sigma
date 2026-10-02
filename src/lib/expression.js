// Small, safe arithmetic expression evaluator for Compute Variable
// (replaces mathjs, ~180 KB gzipped). No property access, no eval.
//
// Grammar (lowest → highest precedence):
//   cond ? a : b  |  or  |  and  |  == != < <= > >=  |  + -  |  * / %  |  unary - + not  |  ^ (right-assoc)
// Values: numbers, variable names, pi, e, true, false, function calls.
// Comparisons and logic return 1 / 0. Missing values (null) propagate as NaN.

const FUNCTIONS = {
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp,
  log: (x, base) => (base === undefined ? Math.log(x) : Math.log(x) / Math.log(base)),
  ln: Math.log, log10: Math.log10, log2: Math.log2,
  floor: Math.floor, ceil: Math.ceil, trunc: Math.trunc, sign: Math.sign,
  round: (x, n = 0) => { const f = 10 ** n; return Math.round(x * f) / f; },
  pow: Math.pow, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  min: (...a) => Math.min(...a), max: (...a) => Math.max(...a),
  sum: (...a) => a.reduce((s, v) => s + v, 0),
  mean: (...a) => a.reduce((s, v) => s + v, 0) / a.length,
};
const CONSTANTS = { pi: Math.PI, e: Math.E, true: 1, false: 0 };

export class ExpressionError extends Error {}

function tokenize(src) {
  const tokens = [];
  const re = /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(==|!=|<=|>=|&&|\|\||[-+*/%^()<>,?:!]))/y;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) throw new ExpressionError(`Unexpected character "${src.slice(pos).trim()[0]}"`);
    pos = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ type: 'num', value: Number(m[1]) });
    else if (m[2] !== undefined) tokens.push({ type: 'id', value: m[2] });
    else tokens.push({ type: 'op', value: m[3] });
  }
  return tokens;
}

/** Parse an expression into an AST. Throws ExpressionError. */
export function parseExpression(src) {
  const tokens = tokenize(String(src ?? ''));
  let i = 0;
  const peek = () => tokens[i];
  const isOp = (v) => tokens[i]?.type === 'op' && tokens[i].value === v;
  const isWord = (v) => tokens[i]?.type === 'id' && tokens[i].value === v;
  const expect = (v) => {
    if (!isOp(v)) throw new ExpressionError(`Expected "${v}"`);
    i++;
  };

  const binary = (next, ops) => () => {
    let left = next();
    for (;;) {
      const t = peek();
      const op = t && ((t.type === 'op' && ops.includes(t.value)) || (t.type === 'id' && ops.includes(t.value))) ? t.value : null;
      if (!op) return left;
      i++;
      left = { type: 'bin', op, left, right: next() };
    }
  };

  const primary = () => {
    const t = peek();
    if (!t) throw new ExpressionError('Unexpected end of formula');
    if (t.type === 'num') { i++; return { type: 'num', value: t.value }; }
    if (t.type === 'id') {
      i++;
      if (isOp('(')) {
        i++;
        const args = [];
        if (!isOp(')')) {
          do { args.push(ternary()); } while (isOp(',') && ++i);
        }
        expect(')');
        if (!Object.hasOwn(FUNCTIONS, t.value)) throw new ExpressionError(`Unknown function "${t.value}"`);
        return { type: 'call', name: t.value, args };
      }
      return { type: 'var', name: t.value };
    }
    if (isOp('(')) { i++; const e = ternary(); expect(')'); return e; }
    throw new ExpressionError(`Unexpected "${t.value}"`);
  };

  const power = () => {
    const base = primary();
    if (isOp('^')) { i++; return { type: 'bin', op: '^', left: base, right: unary() }; }
    return base;
  };
  const unary = () => {
    if (isOp('-') || isOp('+') || isOp('!') || isWord('not')) {
      const op = peek().value;
      i++;
      return { type: 'unary', op, arg: unary() };
    }
    return power();
  };
  const mult = binary(unary, ['*', '/', '%']);
  const add = binary(mult, ['+', '-']);
  const cmp = binary(add, ['==', '!=', '<', '<=', '>', '>=']);
  const and = binary(cmp, ['and', '&&']);
  const or = binary(and, ['or', '||']);
  function ternary() {
    const cond = or();
    if (!isOp('?')) return cond;
    i++;
    const a = ternary();
    expect(':');
    return { type: 'cond', cond, a, b: ternary() };
  }

  if (tokens.length === 0) throw new ExpressionError('Empty formula');
  const ast = ternary();
  if (i < tokens.length) throw new ExpressionError(`Unexpected "${tokens[i].value}"`);
  return ast;
}

/** Names of the variables an AST refers to (excluding constants). */
export function referencedVariables(ast, out = new Set()) {
  if (ast.type === 'var' && !Object.hasOwn(CONSTANTS, ast.name)) out.add(ast.name);
  for (const k of ['left', 'right', 'arg', 'cond', 'a', 'b']) if (ast[k]) referencedVariables(ast[k], out);
  ast.args?.forEach((a) => referencedVariables(a, out));
  return out;
}

const num = (b) => (b ? 1 : 0);

/** Evaluate an AST with `scope` (missing/null → NaN). */
export function evaluateAst(ast, scope) {
  const ev = (n) => {
    switch (n.type) {
      case 'num': return n.value;
      case 'var':
        if (Object.hasOwn(scope, n.name)) {
          const v = scope[n.name];
          return v === null || v === undefined || v === '' ? NaN : Number(v);
        }
        if (Object.hasOwn(CONSTANTS, n.name)) return CONSTANTS[n.name];
        throw new ExpressionError(`Unknown variable "${n.name}"`);
      case 'unary': {
        const v = ev(n.arg);
        return n.op === '-' ? -v : n.op === '+' ? v : num(!v);
      }
      case 'call': return FUNCTIONS[n.name](...n.args.map(ev));
      case 'cond': { const c = ev(n.cond); return Number.isNaN(c) ? NaN : c ? ev(n.a) : ev(n.b); }
      case 'bin': {
        const a = ev(n.left);
        const b = ev(n.right);
        switch (n.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '%': return a % b;
          case '^': return a ** b;
          case '==': return Number.isNaN(a) || Number.isNaN(b) ? NaN : num(a === b);
          case '!=': return Number.isNaN(a) || Number.isNaN(b) ? NaN : num(a !== b);
          case '<': return Number.isNaN(a) || Number.isNaN(b) ? NaN : num(a < b);
          case '<=': return Number.isNaN(a) || Number.isNaN(b) ? NaN : num(a <= b);
          case '>': return Number.isNaN(a) || Number.isNaN(b) ? NaN : num(a > b);
          case '>=': return Number.isNaN(a) || Number.isNaN(b) ? NaN : num(a >= b);
          case 'and': case '&&': return Number.isNaN(a) || Number.isNaN(b) ? NaN : num(a && b);
          case 'or': case '||': return Number.isNaN(a) || Number.isNaN(b) ? NaN : num(a || b);
          default: throw new ExpressionError(`Unknown operator ${n.op}`);
        }
      }
      default: throw new ExpressionError('Invalid expression');
    }
  };
  return ev(ast);
}

/** Convenience: parse + evaluate; returns null for missing / non-finite results. */
export function evaluate(src, scope = {}) {
  const v = evaluateAst(parseExpression(src), scope);
  return Number.isFinite(v) ? v : null;
}
