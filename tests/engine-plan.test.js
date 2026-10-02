import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import {
  ALL_PACKAGES, ANALYSIS_PACKAGES, COMPONENTS, componentBytes, planLoad, resolvePackages,
} from '../src/lib/engine/plan.js';
import { CORE_FILES, PACKAGES, PYODIDE_VERSION } from '../src/lib/engine/manifest.js';

const require = createRequire(import.meta.url);
const lock = JSON.parse(readFileSync(require.resolve('pyodide/pyodide-lock.json'), 'utf8'));

describe('engine manifest', () => {
  it('matches the pinned pyodide package (run `yarn engine:manifest` after upgrading)', () => {
    expect(lock.info.version).toBe(PYODIDE_VERSION);
    for (const [name, pkg] of Object.entries(PACKAGES)) {
      expect(lock.packages[name].file_name).toBe(pkg.file);
      expect(lock.packages[name].sha256).toBe(pkg.sha256);
      expect(lock.packages[name].depends).toEqual(pkg.depends);
    }
    expect(CORE_FILES.map((f) => f.file)).toContain('pyodide.asm.wasm');
  });

  it('does not ship statsmodels/pandas (Tukey and OLS use SciPy/NumPy)', () => {
    const all = resolvePackages(ALL_PACKAGES);
    expect(all).not.toContain('statsmodels');
    expect(all).not.toContain('pandas');
  });
});

describe('planLoad', () => {
  it('frequencies needs only the core interpreter', () => {
    const plan = planLoad(ANALYSIS_PACKAGES.frequencies);
    expect(plan.needsCore).toBe(true);
    expect(plan.packages).toEqual([]);
    expect(plan.files.every((f) => f.id === 'core')).toBe(true);
  });

  it('scipy pulls numpy and openblas first, and nothing already loaded', () => {
    expect(resolvePackages(['scipy'])).toEqual(['numpy', 'openblas', 'scipy']);
    const plan = planLoad(['scipy'], { coreLoaded: true, loadedPackages: new Set(['numpy']) });
    expect(plan.needsCore).toBe(false);
    expect(plan.packages).toEqual(['openblas', 'scipy']);
    expect(plan.files.map((f) => f.url)).toEqual([
      expect.stringContaining(PACKAGES.openblas.file),
      expect.stringContaining(PACKAGES.scipy.file),
    ]);
  });

  it('is a no-op when everything is loaded', () => {
    const plan = planLoad(['numpy'], { coreLoaded: true, loadedPackages: new Set(['numpy']) });
    expect(plan.files).toEqual([]);
  });

  it('every analysis maps to known packages or to no engine at all', () => {
    for (const pkgs of Object.values(ANALYSIS_PACKAGES)) {
      if (pkgs === null) continue;
      expect(() => resolvePackages(pkgs)).not.toThrow();
    }
    expect(ANALYSIS_PACKAGES.diagnostic).toBeNull();
  });

  it('components cover every downloadable file and have sizes', () => {
    const covered = COMPONENTS.flatMap((c) => c.packages);
    expect(new Set(covered)).toEqual(new Set(resolvePackages(ALL_PACKAGES)));
    for (const c of COMPONENTS) expect(componentBytes(c)).toBeGreaterThan(0);
  });
});
