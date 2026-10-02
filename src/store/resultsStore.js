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
  clearResults: () => set({ results: [] }),
}));

export default useResultsStore;
