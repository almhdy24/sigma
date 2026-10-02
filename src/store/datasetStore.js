import { create } from 'zustand';

// Module-level history state — kept outside Zustand to avoid re-renders on every undo/redo stack change
let _hist = []; // [{ before, after }]
let _hIdx = -1; // pointer to current (applied) position

function _snapshot(state) {
  return { variables: state.variables, cases: state.cases };
}

function _pushHist(before, after, set) {
  // Truncate any redo stack above current position
  _hist = _hist.slice(0, _hIdx + 1);
  _hist.push({ before, after });
  if (_hist.length > 20) _hist.shift();
  _hIdx = _hist.length - 1;
  set({ canUndo: _hIdx >= 0, canRedo: _hIdx < _hist.length - 1 });
}

const useDatasetStore = create((set, get) => ({
  variables: [],
  cases: [],
  isLoaded: false,
  language: 'ar',
  canUndo: false,
  canRedo: false,

  addVariable: (partialVariable = {}) => {
    const before = _snapshot(get());
    const { variables, cases } = get();
    const id = partialVariable.id ?? crypto.randomUUID();
    const newVar = {
      id,
      name: partialVariable.name ?? `var${variables.length + 1}`,
      label: partialVariable.label ?? '',
      type: partialVariable.type ?? 'numeric',
      valueLabels: partialVariable.valueLabels ?? {},
      missingValues: partialVariable.missingValues ?? [],
      measure: partialVariable.measure ?? 'scale',
    };
    const updatedCases = cases.map(c => ({
      ...c,
      values: { ...c.values, [id]: null },
    }));
    set({ variables: [...variables, newVar], cases: updatedCases });
    const after = _snapshot(get());
    _pushHist(before, after, set);
  },

  updateVariable: (id, patch) => {
    const before = _snapshot(get());
    set(state => ({
      variables: state.variables.map(v => v.id === id ? { ...v, ...patch } : v),
    }));
    const after = _snapshot(get());
    _pushHist(before, after, set);
  },

  deleteVariable: (id) => {
    const before = _snapshot(get());
    set(state => {
      const updatedCases = state.cases.map(c => {
        const { [id]: _drop, ...rest } = c.values; void _drop;
        return { ...c, values: rest };
      });
      return {
        variables: state.variables.filter(v => v.id !== id),
        cases: updatedCases,
      };
    });
    const after = _snapshot(get());
    _pushHist(before, after, set);
  },

  addCase: (initialValues = {}) => {
    const before = _snapshot(get());
    const { variables, cases } = get();
    const id = crypto.randomUUID();
    const values = {};
    for (const v of variables) {
      values[v.id] = initialValues[v.id] ?? null;
    }
    set({ cases: [...cases, { id, values }] });
    const after = _snapshot(get());
    _pushHist(before, after, set);
  },

  batchAddCases: (initialValuesArray = []) => {
    const before = _snapshot(get());
    const { variables, cases } = get();
    const newCases = initialValuesArray.map(initialValues => {
      const id = crypto.randomUUID();
      const values = {};
      for (const v of variables) {
        values[v.id] = initialValues[v.id] ?? null;
      }
      return { id, values };
    });
    set({ cases: [...cases, ...newCases] });
    const after = _snapshot(get());
    _pushHist(before, after, set);
  },

  updateCell: (caseId, variableId, value) => {
    const before = _snapshot(get());
    set(state => ({
      cases: state.cases.map(c =>
        c.id === caseId
          ? { ...c, values: { ...c.values, [variableId]: value } }
          : c
      ),
    }));
    const after = _snapshot(get());
    _pushHist(before, after, set);
  },

  /** Set one variable's value for many cases in a single step (one undo entry). */
  setColumn: (variableId, valuesByCaseId) => {
    const before = _snapshot(get());
    set(state => ({
      cases: state.cases.map(c =>
        valuesByCaseId.has(c.id)
          ? { ...c, values: { ...c.values, [variableId]: valuesByCaseId.get(c.id) } }
          : c
      ),
    }));
    const after = _snapshot(get());
    _pushHist(before, after, set);
  },

  deleteCase: (id) => {
    const before = _snapshot(get());
    set(state => ({ cases: state.cases.filter(c => c.id !== id) }));
    const after = _snapshot(get());
    _pushHist(before, after, set);
  },

  setLanguage: (language) => set({ language }),

  hydrate: ({ variables, cases, language = 'ar' }) => {
    _hist = [];
    _hIdx = -1;
    set({ variables, cases, language, isLoaded: true, canUndo: false, canRedo: false });
  },

  reset: () => {
    _hist = [];
    _hIdx = -1;
    set({ variables: [], cases: [], canUndo: false, canRedo: false });
  },

  undo: () => {
    if (_hIdx < 0) return;
    const { before } = _hist[_hIdx];
    _hIdx--;
    set({ ...before, canUndo: _hIdx >= 0, canRedo: _hIdx < _hist.length - 1 });
  },

  redo: () => {
    if (_hIdx >= _hist.length - 1) return;
    _hIdx++;
    const { after } = _hist[_hIdx];
    set({ ...after, canUndo: _hIdx >= 0, canRedo: _hIdx < _hist.length - 1 });
  },
}));

export default useDatasetStore;
