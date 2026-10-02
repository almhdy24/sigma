import { lazy, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initPersistence } from './db/persistMiddleware.js';
import { initEngine } from './lib/pyodideLoader.js';
import { changeLanguage, loadHelpStrings } from './i18n/i18n.js';
import useDatasetStore from './store/datasetStore.js';
import useIsMobile from './hooks/useIsMobile.js';
import useOnlineStatus from './hooks/useOnlineStatus.js';
import usePwaInstall from './hooks/usePwaInstall.js';
import Logo from './components/Logo.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LazyBoundary from './components/LazyBoundary.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import InstallPrompt from './components/Install/InstallPrompt.jsx';
import PwaUpdatePrompt from './components/PwaUpdatePrompt.jsx';
import EngineProgress from './components/Engine/EngineProgress.jsx';

// Every tab is a separate chunk, fetched the first time it is opened.
const DataView     = lazy(() => import('./components/DataView.jsx'));
const VariableView = lazy(() => import('./components/VariableView.jsx'));
const AnalyzeMenu  = lazy(() => import('./components/Analyze/AnalyzeMenu.jsx'));
const ResultsView  = lazy(() => import('./components/Results/ResultsView.jsx'));
const ChartsView   = lazy(() => import('./components/Charts/ChartsView.jsx'));
const HelpPage     = lazy(() => Promise.all([import('./components/Help/HelpPage.jsx'), loadHelpStrings()]).then(([m]) => m));

const TABS = ['data', 'variable', 'analyze', 'results', 'charts', 'help'];

const TAB_ICONS = { data: '⊞', variable: '≡', analyze: 'Σ', results: '◈', charts: '↗', help: '?' };

export default function App() {
  const { t } = useTranslation();
  const isLoaded    = useDatasetStore((s) => s.isLoaded);
  const language    = useDatasetStore((s) => s.language);
  const setLanguage = useDatasetStore((s) => s.setLanguage);

  const isMobile  = useIsMobile();
  const isOnline  = useOnlineStatus();
  const { showBanner, isIos, install, dismiss } = usePwaInstall();

  // Deep links / PWA shortcuts: ?tab=analyze
  const [activeTab,    setActiveTab]    = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return TABS.includes(tab) ? tab : 'data';
  });
  const [helpAnchor,   setHelpAnchor]   = useState(null);
  const [minTimerDone, setMinTimerDone] = useState(false);

  const openHelp = useCallback((anchor) => {
    setHelpAnchor(anchor ?? null);
    setActiveTab('help');
  }, []);

  useEffect(() => {
    const stopPersistence = initPersistence();
    initEngine();
    const minTimer = setTimeout(() => setMinTimerDone(true), 400);
    return () => {
      stopPersistence();
      clearTimeout(minTimer);
    };
  }, []);

  // <html lang/dir> follow i18n (see i18n.js); the store persists the choice.
  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    changeLanguage(next).then(() => setLanguage(next));
  };

  const showLoading = !isLoaded || !minTimerDone;

  return (
    <ErrorBoundary>
      <>
        {/* Always-mounted: SW lifecycle toasts (useRegisterSW must stay mounted) */}
        <PwaUpdatePrompt />
        {/* Install prompt (fixed overlay, invisible during loading) */}
        <InstallPrompt
          showBanner={showBanner}
          isIos={isIos}
          onInstall={install}
          onDismiss={dismiss}
        />
        {/* Engine download progress (global, above dialogs) */}
        <EngineProgress />

        {showLoading ? (
          <LoadingScreen />
        ) : (
          <div className={`sigma-shell${isMobile ? ' sigma-shell--mobile' : ''}`}>

            {/* ── App header / tab bar ───────────────────────────────── */}
            <header className="sigma-header">
              <div style={{ display: 'flex', alignItems: 'center', paddingInline: '10px 6px', flexShrink: 0 }}>
                <Logo iconOnly={isMobile} />
              </div>

              {!isMobile && (
                <nav className="sigma-tabs" aria-label={t('nav.label')}>
                  {TABS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="sigma-tab"
                      aria-current={activeTab === key ? 'page' : undefined}
                      onClick={() => setActiveTab(key)}
                    >
                      {t(key)}
                    </button>
                  ))}
                </nav>
              )}
              {isMobile && <div style={{ flex: 1 }} />}

              <div style={{ display: 'flex', alignItems: 'center', paddingInline: 12, flexShrink: 0 }}>
                <button
                  type="button"
                  className="sigma-lang-btn"
                  lang={language === 'ar' ? 'en' : 'ar'}
                  aria-label={t('nav.switchLanguage')}
                  onClick={toggleLanguage}
                >
                  {language === 'ar' ? 'EN' : 'ع'}
                </button>
              </div>
            </header>

            {/* ── Offline status banner (below header, in normal flow) ── */}
            <OfflineBanner isOnline={isOnline} />

            {/* ── Tab content ─────────────────────────────────────────── */}
            <main className="sigma-main">
              <LazyBoundary key={activeTab}>
                {activeTab === 'data'      && <DataView onStartEmpty={() => setActiveTab('variable')} />}
                {activeTab === 'variable'  && <VariableView />}
                {activeTab === 'analyze'   && (
                  <AnalyzeMenu
                    onResultAdded={() => setActiveTab('results')}
                    onOpenHelp={openHelp}
                    isOnline={isOnline}
                  />
                )}
                {activeTab === 'results'   && <ResultsView onGoToAnalyze={() => setActiveTab('analyze')} />}
                {activeTab === 'charts'    && <ChartsView />}
                {activeTab === 'help'      && <HelpPage anchor={helpAnchor} />}
              </LazyBoundary>
            </main>

            {/* ── Mobile bottom tab bar ───────────────────────────────── */}
            {isMobile && (
              <nav className="sigma-bottom-nav" aria-label={t('nav.label')}>
                {TABS.map((key) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className="sigma-bottom-nav__item"
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={t(key)}
                      onClick={() => setActiveTab(key)}
                    >
                      <span aria-hidden="true" className="sigma-bottom-nav__icon">{TAB_ICONS[key]}</span>
                      <span className="sigma-bottom-nav__label">{t(key)}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        )}
      </>
    </ErrorBoundary>
  );
}
