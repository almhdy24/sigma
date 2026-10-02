const CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.0/full/';

let _promise = null;
let _stageCallback = null;

export function setPyodideStageCallback(fn) {
  _stageCallback = fn;
}

export function resetPyodide() {
  _promise = null;
}

export function getPyodide() {
  if (_promise === null) {
    _stageCallback?.('engine');
    _promise = import(/* @vite-ignore */ `${CDN}pyodide.mjs`)
      .then(({ loadPyodide }) => loadPyodide({ indexURL: CDN }))
      .then(async (pyodide) => {
        _stageCallback?.('packages');
        await pyodide.loadPackage(['numpy', 'scipy']);
        try {
          await pyodide.loadPackage(['statsmodels']);
        } catch (e) {
          console.warn('statsmodels could not be loaded; Tukey post-hoc and statsmodels regression path will be unavailable.', e);
        }
        return pyodide;
      });
  }
  return _promise;
}
