// Message handlers for the engine worker. Kept separate from the worker
// entry so the exact same code can be exercised by tests in Node.

/**
 * @param {(indexURL: string) => Promise<object>} loadPyodide  creates the interpreter
 */
export function createEngineHandlers(loadPyodide) {
  let pyodide = null;

  return {
    async init({ indexURL }) {
      if (!pyodide) pyodide = await loadPyodide(indexURL);
      return true;
    },

    async loadPackages({ packages }) {
      await pyodide.loadPackage(packages, {
        messageCallback: () => {},
        errorCallback: (msg) => console.warn('[engine]', msg),
      });
      return true;
    },

    async run({ code, globals }) {
      for (const [name, value] of Object.entries(globals ?? {})) {
        const proxy = pyodide.toPy(value);
        pyodide.globals.set(name, proxy);
        proxy?.destroy?.();
      }
      const result = await pyodide.runPythonAsync(code);
      if (result && typeof result.toJs === 'function') {
        const value = result.toJs({ dict_converter: Object.fromEntries, create_pyproxies: false });
        result.destroy();
        return value;
      }
      return result;
    },

    get ready() { return pyodide !== null; },
  };
}
