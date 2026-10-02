import { create } from 'zustand';

const useResultsStore = create((set) => ({
  results: [],
  addResult: (item) =>
    set((state) => ({
      results: [
        { ...item, id: crypto.randomUUID(), timestamp: Date.now() },
        ...state.results,
      ],
    })),
  removeResult: (id) => set((state) => ({ results: state.results.filter((r) => r.id !== id) })),
  clearResults: () => set({ results: [] }),
  hydrate: (results) => set({ results: Array.isArray(results) ? results : [] }),
}));

export default useResultsStore;
