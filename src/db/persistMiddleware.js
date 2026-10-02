import db from './db.js';
import useDatasetStore from '../store/datasetStore.js';
import i18n from '../i18n/i18n.js';

export function initPersistence() {
  let cancelled = false;
  let debounceTimer = null;
  let unsubscribe = null;

  (async () => {
    const row = await db.snapshots.get('current');
    if (cancelled) return;

    const lang = row?.language ?? 'ar';
    await i18n.changeLanguage(lang);
    if (cancelled) return;

    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    useDatasetStore.getState().hydrate({
      variables: row?.variables ?? [],
      cases: row?.cases ?? [],
      language: lang,
    });

    unsubscribe = useDatasetStore.subscribe((state, prevState) => {
      if (!state.isLoaded) return;
      if (
        state.variables !== prevState.variables ||
        state.cases !== prevState.cases ||
        state.language !== prevState.language
      ) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          db.snapshots
            .put({ key: 'current', variables: state.variables, cases: state.cases, language: state.language })
            .catch(err => console.error('[persistence] save failed:', err));
        }, 500);
      }
    });
  })();

  return () => {
    cancelled = true;
    clearTimeout(debounceTimer);
    unsubscribe?.();
  };
}
