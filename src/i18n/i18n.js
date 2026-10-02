import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Only the active language is downloaded. Long help-page texts live in a
// separate bundle that is fetched with the Help tab.
const APP_BUNDLES = {
  ar: () => import('./locales/ar.json'),
  en: () => import('./locales/en.json'),
};
const HELP_BUNDLES = {
  ar: () => import('./help/ar.json'),
  en: () => import('./help/en.json'),
};
export const LANGUAGES = Object.keys(APP_BUNDLES);
const STORAGE_KEY = 'sigma-lang';

const loaded = { app: new Set(), help: new Set() };
let helpWanted = false;

async function addBundle(kind, lng) {
  if (loaded[kind].has(lng)) return;
  const loaders = kind === 'app' ? APP_BUNDLES : HELP_BUNDLES;
  const { default: resources } = await loaders[lng]();
  i18n.addResourceBundle(lng, 'translation', resources, true, false);
  loaded[kind].add(lng);
}

// Keep <html lang> and <html dir> in sync with the active language so the
// whole document (native controls, scrollbars, text shaping) is RTL in Arabic.
function applyDocumentLanguage(lng) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = lng;
  root.dir = i18n.dir(lng);
}

i18n.on('languageChanged', applyDocumentLanguage);

/** Best guess before IndexedDB is read: last used language, else Arabic. */
function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return 'ar';
}

i18n.use(initReactI18next).init({
  resources: {},
  partialBundledLanguages: true,
  lng: initialLanguage(),
  fallbackLng: false,
  interpolation: { escapeValue: false },
  react: { bindI18nStore: 'added' },
});
applyDocumentLanguage(i18n.language);

/** Download the active language's strings (call before first render). */
export function loadInitialLanguage() {
  return addBundle('app', i18n.language);
}

/** Switch language, fetching its strings first. */
export async function changeLanguage(lng) {
  if (!LANGUAGES.includes(lng)) lng = 'ar';
  await addBundle('app', lng);
  if (helpWanted) await addBundle('help', lng);
  await i18n.changeLanguage(lng);
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* ignore */ }
}

/** Fetch the Help page texts for the current language (and future switches). */
export function loadHelpStrings() {
  helpWanted = true;
  return addBundle('help', i18n.language);
}

export default i18n;
