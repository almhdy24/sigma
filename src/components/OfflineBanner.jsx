import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function OfflineBanner({ isOnline }) {
  const { t } = useTranslation();

  // Track connectivity transitions during render (no effect needed): going
  // offline hides the "back online" note, reconnecting shows it briefly.
  const [prevOnline, setPrevOnline] = useState(isOnline);
  const [showBackOnline, setShowBackOnline] = useState(false);
  if (isOnline !== prevOnline) {
    setPrevOnline(isOnline);
    setShowBackOnline(isOnline);
  }

  useEffect(() => {
    if (!showBackOnline) return undefined;
    const timer = setTimeout(() => setShowBackOnline(false), 3000);
    return () => clearTimeout(timer);
  }, [showBackOnline]);

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
