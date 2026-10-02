// Exercises the worker's message handlers against a real Pyodide in Node.
// Only the core interpreter is needed (it ships in the `pyodide` npm package),
// so this runs offline.
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { createEngineHandlers } from '../src/lib/engine/handlers.js';
import { computeFrequencies } from '../src/lib/stats/frequencies.js';

const require = createRequire(import.meta.url);
const indexURL = `${dirname(require.resolve('pyodide/package.json'))}/`;

// Same facade shape as src/lib/pyodideLoader.js, but calling handlers directly.
function facadeFor(handlers) {
  let pending = {};
  const wrap = (value) => ({ value, toJs: () => value, destroy() {} });
  return {
    toPy: wrap,
    globals: { set(name, v) { pending[name] = v?.toJs ? v.value : v; } },
    async runPythonAsync(code) {
      const globals = pending;
      pending = {};
      return wrap(await handlers.run({ code, globals }));
    },
  };
}

describe('engine worker handlers (real Pyodide)', () => {
  const handlers = createEngineHandlers((url) => loadPyodide({ indexURL: url }));

  it('initialises once and runs the frequencies module end to end', async () => {
    await handlers.init({ indexURL });
    await handlers.init({ indexURL }); // idempotent
    expect(handlers.ready).toBe(true);

    const rows = await computeFrequencies(facadeFor(handlers), ['a', 'b', 'b', null, 'ج'], { a: 'Alpha' });
    expect(rows.map((r) => [r.value, r.frequency, r.label])).toEqual([
      ['a', 1, 'Alpha'], ['b', 2, 'b'], ['ج', 1, 'ج'],
    ]);
  }, 60_000);

  it('converts nested dicts to plain objects and surfaces Python errors', async () => {
    const value = await handlers.run({ code: "{'x': [1, 2], 'y': {'z': None}}", globals: {} });
    expect(value).toEqual({ x: [1, 2], y: { z: undefined } });
    await expect(handlers.run({ code: '1/0', globals: {} })).rejects.toThrow(/ZeroDivisionError/);
  }, 60_000);
});
