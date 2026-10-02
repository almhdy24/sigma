import { Component, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

/** Loading placeholder for lazily-loaded screens and dialogs. */
export function LazyFallback({ overlay = false }) {
  const { t } = useTranslation();
  return (
    <div className={overlay ? 'sigma-lazy-overlay' : 'sigma-lazy-inline'} role="status" aria-live="polite">
      <span className="sigma-spinner" aria-hidden="true" />
      <span>{t('lazy.loading')}</span>
    </div>
  );
}

class ChunkErrorBoundaryCore extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('[LazyBoundary] failed to load part of the app:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { t, onClose } = this.props;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return (
      <div className="sigma-lazy-error" role="alert">
        <p style={{ margin: 0, fontWeight: 600 }}>{t('lazy.failedTitle')}</p>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
          {offline ? t('lazy.failedOffline') : t('lazy.failedBody')}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button type="button" className="sigma-btn-primary" onClick={() => window.location.reload()}>
            {t('loading.retry')}
          </button>
          {onClose && (
            <button type="button" onClick={onClose}>{t('pwa.dismiss')}</button>
          )}
        </div>
      </div>
    );
  }
}

/**
 * Suspense + error boundary for code-split parts of the app. A chunk that
 * fails to load (offline before it was ever cached, or removed by a new
 * deployment) shows a recoverable message instead of crashing the app.
 */
export default function LazyBoundary({ children, overlay = false, onClose }) {
  const { t } = useTranslation();
  return (
    <ChunkErrorBoundaryCore t={t} onClose={onClose}>
      <Suspense fallback={<LazyFallback overlay={overlay} />}>{children}</Suspense>
    </ChunkErrorBoundaryCore>
  );
}
