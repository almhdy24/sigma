import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function OfflineBanner({ isOnline }) {
  const { t } = useTranslation();

  const [showBackOnline, setShowBackOnline] = useState(false);
  const timerRef      = useRef(null);
  const wasOfflineRef = useRef(!isOnline); // true if we started offline

  useEffect(() => {
    if (!isOnline) {
      // went offline (or was already offline on mount)
      wasOfflineRef.current = true;
      clearTimeout(timerRef.current);
      setShowBackOnline(false);
    } else if (wasOfflineRef.current) {
      // reconnected after an offline period — show confirmation briefly
      setShowBackOnline(true);
      timerRef.current = setTimeout(() => setShowBackOnline(false), 3000);
    }
  }, [isOnline]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (isOnline && !showBackOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: showBackOnline ? 'var(--accent)' : 'var(--ink)',
        color: '#fff',
        fontSize: 13,
        textAlign: 'center',
        padding: '7px 16px',
        letterSpacing: '0.01em',
        transition: 'background 0.25s',
      }}
    >
      {showBackOnline ? t('pwa.backOnline') : t('pwa.offline')}
    </div>
  );
}
