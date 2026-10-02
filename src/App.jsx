import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { initPersistence } from './db/persistMiddleware.js';
import { getPyodide, resetPyodide, setPyodideStageCallback } from './lib/pyodideLoader.js';
import useDatasetStore from './store/datasetStore.js';
import useIsMobile from './hooks/useIsMobile.js';
import useOnlineStatus from './hooks/useOnlineStatus.js';
import usePwaInstall from './hooks/usePwaInstall.js';
import VariableView from './components/VariableView.jsx';
import DataView from './components/DataView.jsx';
import AnalyzeMenu from './components/Analyze/AnalyzeMenu.jsx';
import ResultsView from './components/Results/ResultsView.jsx';
import ChartsView from './components/Charts/ChartsView.jsx';
import HelpPage from './components/Help/HelpPage.jsx';
import Logo from './components/Logo.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import InstallPrompt from './components/Install/InstallPrompt.jsx';
import PwaUpdatePrompt from './components/PwaUpdatePrompt.jsx';

const TABS = ['data', 'variable', 'analyze', 'results', 'charts', 'help'];

const TAB_ICONS = { data: '⊞', variable: '≡', analyze: 'Σ', results: '◈', charts: '↗', help: '?' };

export default function App() {
  const { t, i18n } = useTranslation();
  const isLoaded    = useDatasetStore((s) => s.isLoaded);
  const language    = useDatasetStore((s) => s.language);
  const setLanguage = useDatasetStore((s) => s.setLanguage);

  const isMobile  = useIsMobile();
  const isOnline  = useOnlineStatus();
  const { showBanner, isIos, install, dismiss } = usePwaInstall();

  const [activeTab,    setActiveTab]    = useState('data');
  const [helpAnchor,   setHelpAnchor]   = useState(null);

  const openHelp = useCallback((anchor) => {
    setHelpAnchor(anchor ?? null);
    setActiveTab('help');
  }, []);
  const [minTimerDone, setMinTimerDone] = useState(false);
  const [loadStage,    setLoadStage]    = useState('data');
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideError, setPyodideError] = useState(null);
  const [showSlowNote, setShowSlowNote] = useState(false);

  const slowTimerRef = useRef(null);

  const startPyodide = useCallback(() => {
    setPyodideError(null);
    setPyodideReady(false);
    setShowSlowNote(false);

    clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => setShowSlowNote(true), 8000);

    setPyodideStageCallback((stage) => setLoadStage(stage));
    getPyodide()
      .then(() => {
        clearTimeout(slowTimerRef.current);
        setPyodideReady(true);
      })
      .catch((err) => {
        clearTimeout(slowTimerRef.current);
        setPyodideError(err);
      });
  }, []);

  useEffect(() => {
    const stopPersistence = initPersistence();
    const minTimer = setTimeout(() => setMinTimerDone(true), 400);
    startPyodide();
    return () => {
      stopPersistence();
      clearTimeout(minTimer);
      clearTimeout(slowTimerRef.current);
    };
  }, [startPyodide]);

  const retryPyodide = useCallback(() => {
    resetPyodide();
    startPyodide();
  }, [startPyodide]);

  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    setLanguage(next);
  };

  /* ── Tab button styles ───────────────────────────────────────── */
  const tabBtn = (key) => ({
    padding: '0 16px',
    height: 'var(--header-h)',
    fontSize: 13,
    fontWeight: activeTab === key ? 600 : 400,
    background: 'none',
    border: 'none',
    borderBottom: activeTab === key
      ? '2px solid var(--accent)'
      : '2px solid transparent',
    color: activeTab === key ? 'var(--accent)' : 'var(--muted)',
    cursor: 'pointer',
    borderRadius: 0,
    transition: 'color 0.12s, border-color 0.12s',
    whiteSpace: 'nowrap',
  });

  /* ── Language toggle ─────────────────────────────────────────── */
  const langBtn = {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    border: '1px solid var(--border)',
    borderRadius: 3,
    background: 'transparent',
    color: 'var(--muted)',
    cursor: 'pointer',
    letterSpacing: '0.04em',
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

        {showLoading ? (
          <LoadingScreen stage={loadStage} />
        ) : (
          <div style={{ minHeight: '100vh', background: 'var(--page)' }}>

            {/* ── App header / tab bar ───────────────────────────────── */}
            <header style={{
              position: 'sticky', top: 0, zIndex: 200,
              display: 'flex', alignItems: 'stretch',
              height: 'var(--header-h)',
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              paddingInline: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', paddingInline: '10px 6px', flexShrink: 0 }}>
                <Logo iconOnly={isMobile} />
              </div>

              {!isMobile && (
                <nav style={{ display: 'flex', alignItems: 'stretch', gap: 0, flex: 1, overflow: 'auto' }}>
                  {TABS.map((key) => (
                    <button key={key} type="button" style={tabBtn(key)} onClick={() => setActiveTab(key)}>
                      {t(key)}
                    </button>
                  ))}
                </nav>
              )}
              {isMobile && <div style={{ flex: 1 }} />}

              <div style={{ display: 'flex', alignItems: 'center', paddingInline: 12, flexShrink: 0 }}>
                <button type="button" style={langBtn} onClick={toggleLanguage}>
                  {language === 'ar' ? 'EN' : 'ع'}
                </button>
              </div>
            </header>

            {/* ── Offline status banner (below header, in normal flow) ── */}
            <OfflineBanner isOnline={isOnline} />

            {/* ── Tab content ─────────────────────────────────────────── */}
            <main style={isMobile ? { paddingBottom: 56 } : undefined}>
              {activeTab === 'data'      && <DataView />}
              {activeTab === 'variable'  && <VariableView />}
              {activeTab === 'analyze'   && (
                <AnalyzeMenu
                  onResultAdded={() => setActiveTab('results')}
                  onOpenHelp={openHelp}
                  pyodideReady={pyodideReady}
                  loadStage={loadStage}
                  pyodideError={pyodideError}
                  onRetryPyodide={retryPyodide}
                  showSlowNote={showSlowNote}
                  isOnline={isOnline}
                />
              )}
              {activeTab === 'results'   && <ResultsView />}
              {activeTab === 'charts'    && <ChartsView />}
              {activeTab === 'help'      && <HelpPage anchor={helpAnchor} />}
            </main>

            {/* ── Mobile bottom tab bar ───────────────────────────────── */}
            {isMobile && (
              <nav style={{
                position: 'fixed', bottom: 0, insetInline: 0,
                height: 56, background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'stretch', zIndex: 200,
              }}>
                {TABS.map((key) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: isActive ? 2 : 0,
                        background: 'none', border: 'none', borderRadius: 0,
                        borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        padding: 0, cursor: 'pointer',
                        color: isActive ? 'var(--accent)' : 'var(--muted)',
                        transition: 'color 0.12s, border-color 0.12s',
                        overflow: 'hidden',
                      }}
                    >
                      <span style={{ fontSize: isActive ? 20 : 22, lineHeight: 1 }}>
                        {TAB_ICONS[key]}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, lineHeight: 1.2,
                          whiteSpace: 'nowrap', overflow: 'hidden',
                          textOverflow: 'ellipsis', maxWidth: '100%',
                          paddingInline: 2,
                        }}>
                          {t(key)}
                        </span>
                      )}
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
