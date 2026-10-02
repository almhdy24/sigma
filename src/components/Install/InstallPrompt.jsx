import { useTranslation } from 'react-i18next';
import useIsMobile from '../../hooks/useIsMobile.js';

function SigmaIcon() {
  return (
    <svg
      width="36" height="36"
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ borderRadius: 8, flexShrink: 0 }}
    >
      <rect width="100" height="100" rx="18" fill="#1f5fa6" />
      <path
        d="M 87,7 L 7,7 L 7,93 L 87,93 L 87,77 L 19,77 L 62,50 L 19,23 L 87,23 Z"
        fill="white"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="15" height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

export default function InstallPrompt({ showBanner, isIos, onInstall, onDismiss }) {
  const { t }    = useTranslation();
  const isMobile = useIsMobile();

  if (!showBanner) return null;

  const closeBtn = (
    <button
      type="button"
      onClick={onDismiss}
      aria-label={t('pwa.notNow')}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--muted)',
        fontSize: 22,
        lineHeight: 1,
        padding: '2px 4px',
        cursor: 'pointer',
        borderRadius: 3,
        flexShrink: 0,
        /* override global min-height: 44px for this decorative close glyph */
        minHeight: 'unset',
      }}
    >
      ×
    </button>
  );

  const body = (
    <>
      <SigmaIcon />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2 }}>
          Sigma
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginTop: 2 }}>
          {isIos ? t('pwa.iosInstructions') : t('pwa.installDescription')}
        </div>
        {isIos && (
          <div style={{
            fontSize: 12,
            color: 'var(--accent)',
            marginTop: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}>
            <ShareIcon />
            <span>{t('pwa.iosStep')}</span>
          </div>
        )}
      </div>

      {!isIos && (
        <button
          type="button"
          onClick={onInstall}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {t('pwa.install')}
        </button>
      )}

      {closeBtn}
    </>
  );

  /* ── Mobile: bottom banner, floats above the 56px tab bar ─────── */
  if (isMobile) {
    return (
      <div
        role="complementary"
        aria-label={t('pwa.installTitle')}
        style={{
          position: 'fixed',
          bottom: 56,
          insetInline: 0,
          zIndex: 300,
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 12px',
        }}
      >
        {body}
      </div>
    );
  }

  /* ── Desktop: corner card (inline-end = RTL-aware right) ─────── */
  return (
    <div
      role="complementary"
      aria-label={t('pwa.installTitle')}
      style={{
        position: 'fixed',
        bottom: 20,
        insetInlineEnd: 20,
        zIndex: 300,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        maxWidth: 340,
      }}
    >
      {body}
    </div>
  );
}
