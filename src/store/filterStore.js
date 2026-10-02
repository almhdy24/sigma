import { create } from 'zustand';

const useFilterStore = create((set) => ({
  activeFilter: null,
  splitVariableId: null,

  setFilter: (filter) => set({ activeFilter: filter }),
  clearFilter: () => set({ activeFilter: null }),
  setSplit: (varId) => set({ splitVariableId: varId }),
  clearSplit: () => set({ splitVariableId: null }),
}));

export default useFilterStore;
