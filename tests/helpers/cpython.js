// Runs the stats modules' Python code under CPython + SciPy (CI installs the
// same SciPy version Pyodide 0.27 ships), via an object with the subset of
// the Pyodide API the modules use. Python `None` becomes `null` here (Pyodide
// yields `undefined`), so tests compare with `== null`.
import { spawnSync } from 'node:child_process';

const RUNNER = `
import ast, json, math, sys
req = json.load(sys.stdin)
g = dict(req['globals'])
tree = ast.parse(req['code'])
last = None
if tree.body and isinstance(tree.body[-1], ast.Expr):
    last = ast.Expression(tree.body.pop().value)
exec(compile(tree, '<sigma>', 'exec'), g)
res = eval(compile(last, '<sigma>', 'eval'), g) if last else None

def conv(o):
    if isinstance(o, dict): return {str(k): conv(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)): return [conv(v) for v in o]
    if hasattr(o, 'tolist'): return conv(o.tolist())
    if isinstance(o, float) and not math.isfinite(o): return {'__float__': str(o)}
    return o
print(json.dumps(conv(res)))
`;

export function hasScipy() {
  const r = spawnSync('python3', ['-c', 'import numpy, scipy'], { encoding: 'utf8' });
  return r.status === 0;
}

const revive = (_k, v) => (v && typeof v === 'object' && '__float__' in v ? Number(v.__float__.replace('inf', 'Infinity')) : v);

export function createCPythonFacade() {
  let pending = {};
  const wrap = (value) => ({ value, toJs: () => value, destroy() {} });
  return {
    toPy: (value) => wrap(value),
    globals: { set(name, v) { pending[name] = v && typeof v.toJs === 'function' ? v.value : v; } },
    async runPythonAsync(code) {
      const input = JSON.stringify({ code, globals: pending });
      pending = {};
      const r = spawnSync('python3', ['-c', RUNNER], { input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      if (r.status !== 0) throw new Error(r.stderr);
      return wrap(JSON.parse(r.stdout, revive));
    },
  };
}
