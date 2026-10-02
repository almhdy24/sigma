import { create } from 'zustand';

/**
 * Live state of the Python engine download / install, rendered by
 * EngineProgress and EnginePanel.
 */
const useEngineStore = create((set) => ({
  phase: 'idle',        // 'idle' | 'downloading' | 'installing' | 'error'
  purpose: 'run',       // 'run' (needed for an analysis) | 'offline' (user-requested)
  components: [],       // component ids being fetched, e.g. ['core', 'scipy']
  loaded: 0,
  total: 0,
  error: null,          // { kind: 'cancelled' | 'offline' | 'failed', message }
  loadedPackages: [],   // packages importable in the running interpreter
  coreReady: false,
  cached: {},           // { core: bool, numpy: bool, scipy: bool }

  begin: ({ purpose, components, total }) =>
    set({ phase: 'downloading', purpose, components, loaded: 0, total, error: null }),
  progress: ({ loaded, total }) => set({ loaded, total }),
  installing: () => set({ phase: 'installing' }),
  done: ({ coreReady, loadedPackages }) =>
    set((s) => ({
      phase: 'idle', components: [], error: null,
      coreReady: coreReady ?? s.coreReady,
      loadedPackages: loadedPackages ?? s.loadedPackages,
    })),
  fail: (error) => set({ phase: 'error', error }),
  dismissError: () => set({ phase: 'idle', error: null }),
  setCached: (cached) => set({ cached }),
}));

export default useEngineStore;
