import { Component } from 'react';
import { useTranslation } from 'react-i18next';

class ErrorBoundaryCore extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { t } = this.props;
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', gap: 16,
        background: 'var(--page)',
        padding: 24, textAlign: 'center',
      }}>
        <svg width="48" height="48" viewBox="0 0 100 100" aria-hidden="true">
          <rect width="100" height="100" rx="18" fill="#1f5fa6" />
          <path
            d="M 87,7 L 7,7 L 7,93 L 87,93 L 87,77 L 19,77 L 62,50 L 19,23 L 87,23 Z"
            fill="white"
          />
        </svg>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', maxWidth: 340, lineHeight: 1.6 }}>
          {t('error.boundary.message')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 24px', fontSize: 13, fontWeight: 600,
            background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: 3, cursor: 'pointer',
          }}
        >
          {t('error.boundary.reload')}
        </button>
      </div>
    );
  }
}

export default function ErrorBoundary({ children }) {
  const { t } = useTranslation();
  return <ErrorBoundaryCore t={t}>{children}</ErrorBoundaryCore>;
}
