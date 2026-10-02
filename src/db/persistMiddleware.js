import db from './db.js';
import useDatasetStore from '../store/datasetStore.js';
import useResultsStore from '../store/resultsStore.js';
import { changeLanguage } from '../i18n/i18n.js';

const SAVE_DELAY = 500;
const MAX_SAVED_RESULTS = 200;

/** Debounced writer for one snapshot key. */
function debouncedSaver(key, getValue) {
  let timer = null;
  const save = () => {
    timer = null;
    db.snapshots.put({ key, ...getValue() })
      .catch((err) => console.error(`[persistence] saving ${key} failed:`, err));
  };
  return {
    schedule() { clearTimeout(timer); timer = setTimeout(save, SAVE_DELAY); },
    flush() { if (timer) { clearTimeout(timer); save(); } },
    cancel() { clearTimeout(timer); },
  };
}

export function initPersistence() {
  let cancelled = false;
  const unsubscribers = [];

  const dataSaver = debouncedSaver('current', () => {
    const { variables, cases, language } = useDatasetStore.getState();
    return { variables, cases, language };
  });
  const resultsSaver = debouncedSaver('results', () => ({
    results: useResultsStore.getState().results.slice(0, MAX_SAVED_RESULTS),
  }));

  // Save immediately when the page is hidden (tab switch, app backgrounded).
  const onHide = () => {
    if (document.visibilityState === 'hidden') { dataSaver.flush(); resultsSaver.flush(); }
  };
  document.addEventListener('visibilitychange', onHide);

  (async () => {
    const [row, saved] = await Promise.all([
      db.snapshots.get('current').catch(() => null),
      db.snapshots.get('results').catch(() => null),
    ]);
    if (cancelled) return;

    const lang = row?.language ?? 'ar';
    // i18n keeps <html lang/dir> in sync (see i18n.js)
    await changeLanguage(lang);
    if (cancelled) return;

    useResultsStore.getState().hydrate(saved?.results ?? []);
    useDatasetStore.getState().hydrate({
      variables: row?.variables ?? [],
      cases: row?.cases ?? [],
      language: lang,
    });

    unsubscribers.push(
      useDatasetStore.subscribe((state, prev) => {
        if (!state.isLoaded) return;
        if (state.variables !== prev.variables || state.cases !== prev.cases || state.language !== prev.language) {
          dataSaver.schedule();
        }
      }),
      useResultsStore.subscribe((state, prev) => {
        if (state.results !== prev.results) resultsSaver.schedule();
      }),
    );
  })();

  return () => {
    cancelled = true;
    dataSaver.cancel();
    resultsSaver.cancel();
    document.removeEventListener('visibilitychange', onHide);
    unsubscribers.forEach((u) => u());
  };
}
