import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useIsMobile from '../hooks/useIsMobile.js';

export default function PwaUpdatePrompt() {
  const { t }      = useTranslation();
  const isMobile   = useIsMobile();
  const timerRef   = useRef(null);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh:  [needRefresh,  setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Auto-dismiss the "offline ready" confirmation after 5 s
  useEffect(() => {
    if (offlineReady) {
      timerRef.current = setTimeout(() => setOfflineReady(false), 5000);
    }
    return () => clearTimeout(timerRef.current);
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  const close = () => { setOfflineReady(false); setNeedRefresh(false); };

  // On mobile, sit above the 56px tab bar; on desktop use the bottom-start corner
  const bottomOffset = isMobile
    ? 'calc(var(--bottom-nav-h) + 20px + var(--safe-bottom))'
    : 'calc(20px + var(--safe-bottom))';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: bottomOffset,
        insetInlineStart: 20,
        zIndex: 350,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        padding: '12px 16px',
        maxWidth: 320,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>
        {offlineReady ? t('pwa.offlineReady') : t('pwa.updateAvailable')}
      </p>

      <div style={{ display: 'flex', gap: 8 }}>
        {needRefresh && (
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('pwa.reload')}
          </button>
        )}
        <button
          type="button"
          onClick={close}
          style={{
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '6px 14px',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {t('pwa.dismiss')}
        </button>
      </div>
    </div>
  );
}
