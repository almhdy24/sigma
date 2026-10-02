// Runs Pyodide off the main thread so installing packages and running
// analyses never freezes the UI. Protocol: { id, type, payload } → { id, ok, value | error }.
import { createEngineHandlers } from './handlers.js';

const handlers = createEngineHandlers(async (indexURL) => {
  const { loadPyodide } = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`);
  return loadPyodide({ indexURL });
});

self.onmessage = async ({ data }) => {
  const { id, type, payload } = data;
  try {
    if (type !== 'init' && !handlers.ready) throw new Error('Engine not initialised');
    const value = await handlers[type](payload);
    self.postMessage({ id, ok: true, value });
  } catch (err) {
    self.postMessage({ id, ok: false, error: { message: String(err?.message ?? err), name: err?.name } });
  }
};
