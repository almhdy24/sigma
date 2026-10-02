// Pure planning helpers: which files must be downloaded for a set of packages.
import { CORE_FILES, PACKAGES, PYODIDE_CDN, PYODIDE_VERSION } from './manifest.js';

/** Cache Storage bucket for engine files (shared with the service worker). */
export const ENGINE_CACHE = `pyodide-${PYODIDE_VERSION}`;

/**
 * Python packages each analysis needs. Dependencies (numpy, openblas) are
 * resolved automatically. `null` means the analysis is pure JavaScript and
 * never downloads the engine.
 */
export const ANALYSIS_PACKAGES = {
  frequencies:  [],
  reliability:  ['numpy'],
  roc:          ['numpy'],
  descriptives: ['scipy'],
  crosstabs:    ['scipy'],
  correlation:  ['scipy'],
  ttest:        ['scipy'],
  anova:        ['scipy'],
  regression:   ['scipy'],
  diagnostic:   null,
};

/** User-facing download components (for status and "download for offline"). */
export const COMPONENTS = [
  { id: 'core',  packages: [] },
  { id: 'numpy', packages: ['numpy'] },
  { id: 'scipy', packages: ['openblas', 'scipy'] },
];

export const ALL_PACKAGES = ['scipy'];

const urlOf = (file) => PYODIDE_CDN + file;

/** Dependency closure of `names`, dependencies first. */
export function resolvePackages(names) {
  const out = [];
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    const pkg = PACKAGES[name];
    if (!pkg) throw new Error(`Unknown engine package: ${name}`);
    seen.add(name);
    pkg.depends.forEach(visit);
    out.push(name);
  };
  names.forEach(visit);
  return out;
}

export function coreFiles() {
  return CORE_FILES.map(({ file, bytes }) => ({ id: 'core', file, url: urlOf(file), bytes }));
}

export function packageFiles(names) {
  return names.map((name) => ({ id: name, file: PACKAGES[name].file, url: urlOf(PACKAGES[name].file), bytes: PACKAGES[name].bytes }));
}

/**
 * Work needed to make `packages` importable, given what is already loaded
 * into the running interpreter.
 */
export function planLoad(packages, { coreLoaded = false, loadedPackages = new Set() } = {}) {
  const missing = resolvePackages(packages).filter((name) => !loadedPackages.has(name));
  const files = [...(coreLoaded ? [] : coreFiles()), ...packageFiles(missing)];
  return { needsCore: !coreLoaded, packages: missing, files };
}

/** Estimated download size (bytes) of a component. */
export function componentBytes(component) {
  const files = component.id === 'core' ? coreFiles() : packageFiles(component.packages);
  return files.reduce((sum, f) => sum + f.bytes, 0);
}

export function componentFiles(component) {
  return component.id === 'core' ? coreFiles() : packageFiles(component.packages);
}
