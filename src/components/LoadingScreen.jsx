import { useTranslation } from 'react-i18next';

const STAGE_KEYS = {
  data:     'loading.data',
  engine:   'loading.engine',
  packages: 'loading.packages',
};

export default function LoadingScreen({ stage = 'data' }) {
  const { t } = useTranslation();

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--page)',
      gap: 16,
      zIndex: 9999,
    }}>
      <svg
        className="sigma-splash-icon"
        width="80" height="80"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <rect width="100" height="100" rx="18" fill="#1f5fa6" />
        <path
          d="M 87,7 L 7,7 L 7,93 L 87,93 L 87,77 L 19,77 L 62,50 L 19,23 L 87,23 Z"
          fill="white"
        />
      </svg>

      <span style={{
        fontWeight: 700, fontSize: 20, color: 'var(--ink)',
        letterSpacing: '-0.01em', lineHeight: 1,
      }}>
        Sigma
      </span>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
        {t(STAGE_KEYS[stage] ?? 'loading.data')}
      </p>
    </div>
  );
}
