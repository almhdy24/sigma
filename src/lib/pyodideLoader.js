// On-demand Python (Pyodide) engine.
//
// Nothing is downloaded at start-up. When an analysis runs, only the files it
// needs (the core interpreter and/or numpy / scipy wheels) are fetched, with
// byte-level progress published to useEngineStore. Python itself runs in a
// Web Worker; getPyodide() returns a small facade with the subset of the
// Pyodide API the stats modules use (toPy, globals.set, runPythonAsync).
import i18n from '../i18n/i18n.js';
import useEngineStore from '../store/engineStore.js';
import {
  ALL_PACKAGES, COMPONENTS, componentFiles, coreFiles, packageFiles, planLoad, resolvePackages,
} from './engine/plan.js';
import { areCached, downloadFiles, purgeOldEngineCaches } from './engine/download.js';
import { PYODIDE_CDN } from './engine/manifest.js';

export { ANALYSIS_PACKAGES } from './engine/plan.js';

export class EngineError extends Error {
  constructor(kind, cause) {
    super(i18n.t(`engine.error.${kind}`));
    this.name = 'EngineError';
    this.kind = kind;
    this.cause = cause;
  }
}

/* ── Worker RPC ─────────────────────────────────────────────────── */

let worker = null;
let seq = 0;
const pending = new Map();
let coreReady = false;
const loadedPackages = new Set();

function resetWorkerState(error) {
  for (const { reject } of pending.values()) reject(error);
  pending.clear();
  worker?.terminate();
  worker = null;
  coreReady = false;
  loadedPackages.clear();
  useEngineStore.getState().done({ coreReady: false, loadedPackages: [] });
}

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./engine/engine.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      if (data.ok) p.resolve(data.value);
      else p.reject(Object.assign(new Error(data.error.message), { name: data.error.name }));
    };
    worker.onerror = (e) => {
      e.preventDefault?.();
      resetWorkerState(new Error(e.message || 'Engine worker crashed'));
    };
  }
  return worker;
}

function call(type, payload) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, type, payload });
  });
}

// All engine work is serialised: a package install never overlaps a run.
let queue = Promise.resolve();
function serial(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

/* ── Download / install ─────────────────────────────────────────── */

let abortController = null;

function classify(err, aborted) {
  if (err instanceof EngineError) return err;
  if (aborted || err?.name === 'AbortError') return new EngineError('cancelled', err);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new EngineError('offline', err);
  // fetch() network failure, or the CDN answered with an error status
  if (err instanceof TypeError || err?.name === 'HttpError') return new EngineError('network', err);
  return new EngineError('failed', err);
}

const componentsFor = (needsCore, packages) =>
  COMPONENTS
    .filter((c) => (c.id === 'core' ? needsCore : c.packages.some((p) => packages.includes(p))))
    .map((c) => c.id);

async function fetchWithProgress({ purpose, files, components }) {
  const store = useEngineStore.getState();
  abortController = new AbortController();
  store.begin({ purpose, components, total: files.reduce((s, f) => s + f.bytes, 0) });
  try {
    await downloadFiles(files, {
      signal: abortController.signal,
      onProgress: (p) => useEngineStore.getState().progress(p),
    });
  } catch (err) {
    throw classify(err, abortController.signal.aborted);
  } finally {
    abortController = null;
  }
}

function reportFailure(e) {
  const store = useEngineStore.getState();
  // A user-initiated cancel is not an error worth a toast.
  if (e.kind === 'cancelled') store.done({});
  else store.fail({ kind: e.kind, message: e.message });
}

/** Make `packages` importable, downloading and installing only what is missing. */
export function ensureEngine(packages = []) {
  return serial(async () => {
    const plan = planLoad(packages, { coreLoaded: coreReady, loadedPackages });
    if (!plan.needsCore && plan.packages.length === 0) return;
    const store = useEngineStore.getState();
    try {
      await fetchWithProgress({
        purpose: 'run',
        files: plan.files,
        components: componentsFor(plan.needsCore, plan.packages),
      });
      store.installing();
      if (plan.needsCore) {
        await call('init', { indexURL: PYODIDE_CDN });
        coreReady = true;
      }
      if (plan.packages.length) {
        await call('loadPackages', { packages: plan.packages });
        plan.packages.forEach((p) => loadedPackages.add(p));
      }
      store.done({ coreReady, loadedPackages: [...loadedPackages] });
      refreshEngineCacheStatus();
    } catch (err) {
      const e = classify(err, false);
      reportFailure(e);
      throw e;
    }
  });
}

/** Download every engine file into the offline cache (without installing). */
export function downloadEngineForOffline() {
  return serial(async () => {
    const files = [...coreFiles(), ...packageFiles(resolvePackages(ALL_PACKAGES))];
    try {
      await fetchWithProgress({ purpose: 'offline', files, components: COMPONENTS.map((c) => c.id) });
      useEngineStore.getState().done({});
    } catch (err) {
      const e = classify(err, false);
      reportFailure(e);
      throw e;
    } finally {
      refreshEngineCacheStatus();
    }
  });
}

export function cancelEngineDownload() {
  abortController?.abort(new DOMException('Cancelled', 'AbortError'));
}

/** Update useEngineStore.cached with which components are available offline. */
export async function refreshEngineCacheStatus() {
  const entries = await Promise.all(
    COMPONENTS.map(async (c) => [c.id, await areCached(componentFiles(c).map((f) => f.url))]),
  );
  useEngineStore.getState().setCached(Object.fromEntries(entries));
}

export function initEngine() {
  purgeOldEngineCaches().then(refreshEngineCacheStatus);
}

/* ── Pyodide-compatible facade ──────────────────────────────────── */

class RemoteValue {
  constructor(value) { this.value = value; }
  toJs() { return this.value; }
  destroy() {}
}

let pendingGlobals = {};

const facade = {
  toPy: (value) => new RemoteValue(value),
  globals: {
    set(name, value) {
      pendingGlobals[name] = value instanceof RemoteValue ? value.value : value;
    },
  },
  runPythonAsync(code) {
    const globals = pendingGlobals;
    pendingGlobals = {};
    return serial(() => call('run', { code, globals })).then((v) => new RemoteValue(v));
  },
};

/**
 * Resolve once `packages` are loaded, returning the Pyodide facade.
 * @param {string[]} packages e.g. ANALYSIS_PACKAGES.ttest
 */
export async function getPyodide(packages = []) {
  await ensureEngine(packages ?? []);
  return facade;
}
