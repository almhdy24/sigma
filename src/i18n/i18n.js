import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

// Keep <html lang> and <html dir> in sync with the active language so the
// whole document (native controls, scrollbars, text shaping) is RTL in Arabic.
function applyDocumentLanguage(lng) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = lng;
  root.dir = i18n.dir(lng);
}

i18n.on('languageChanged', applyDocumentLanguage);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
  });

applyDocumentLanguage(i18n.language);

export default i18n;
