import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DescriptivesDialog from './DescriptivesDialog.jsx';
import FrequenciesDialog from './FrequenciesDialog.jsx';
import CrosstabsDialog from './CrosstabsDialog.jsx';
import CorrelationDialog from './CorrelationDialog.jsx';
import TTestDialog from './TTestDialog.jsx';
import AnovaDialog from './AnovaDialog.jsx';
import RegressionDialog from './RegressionDialog.jsx';
import DiagnosticTestDialog from './DiagnosticTestDialog.jsx';
import RocCurveDialog from './RocCurveDialog.jsx';
import ReliabilityDialog from './ReliabilityDialog.jsx';

const ANALYSES = [
  { key: 'descriptives', Dialog: DescriptivesDialog },
  { key: 'frequencies',  Dialog: FrequenciesDialog },
  { key: 'crosstabs',    Dialog: CrosstabsDialog },
  { key: 'correlation',  Dialog: CorrelationDialog },
  { key: 'ttest',        Dialog: TTestDialog },
  { key: 'anova',        Dialog: AnovaDialog },
  { key: 'regression',   Dialog: RegressionDialog },
  { key: 'diagnostic', Dialog: DiagnosticTestDialog },
  { key: 'roc',        Dialog: RocCurveDialog },
  { key: 'reliability',Dialog: ReliabilityDialog },
];

const STAGE_KEYS = {
  data:     'loading.data',
  engine:   'loading.engine',
  packages: 'loading.packages',
};

export default function AnalyzeMenu({
  onResultAdded,
  onOpenHelp,
  pyodideReady,
  loadStage,
  pyodideError,
  onRetryPyodide,
  showSlowNote,
  isOnline,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);

  const ActiveDialog = ANALYSES.find((a) => a.key === open)?.Dialog ?? null;

  /* map analysis key → help anchor id */
  const HELP_ANCHORS = {
    descriptives: 'test-descriptives',
    frequencies:  'test-frequencies',
    crosstabs:    'test-crosstabs',
    correlation:  'test-correlation',
    ttest:        'test-ttest',
    anova:        'test-anova',
    regression:   'test-regression',
    diagnostic:   'test-diagnostic',
    roc:          'test-roc',
    reliability:  'test-reliability',
  };

  /* ── Engine loading ──────────────────────────────────────────── */
  if (!pyodideReady && !pyodideError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 24px', gap: 14, textAlign: 'center',
      }}>
        <svg
          className="sigma-splash-icon"
          width="52" height="52"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <rect width="100" height="100" rx="18" fill="#1f5fa6" />
          <path
            d="M 87,7 L 7,7 L 7,93 L 87,93 L 87,77 L 19,77 L 62,50 L 19,23 L 87,23 Z"
            fill="white"
          />
        </svg>

        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          {t(STAGE_KEYS[loadStage] ?? 'loading.engine')}
        </p>

        {showSlowNote && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', maxWidth: 280 }}>
            {t('loading.slowNote')}
          </p>
        )}
      </div>
    );
  }

  /* ── Engine error ────────────────────────────────────────────── */
  if (pyodideError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 24px', gap: 12, textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--error)' }}>
          {t('loading.engineFailed')}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', maxWidth: 340 }}>
          {!isOnline
            ? t('loading.engineFailedOffline')
            : t('loading.engineFailedDetail')}
        </p>
        <button
          type="button"
          onClick={onRetryPyodide}
          style={{
            marginTop: 6,
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          {t('loading.retry')}
        </button>
      </div>
    );
  }

  /* ── Normal state ────────────────────────────────────────────── */
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>{t('analyze.title')}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {ANALYSES.map(({ key }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            <button
              type="button"
              onClick={() => setOpen(key)}
              style={{ padding: '10px 20px', fontSize: 14, cursor: 'pointer', borderRadius: '3px 0 0 3px', borderInlineEnd: 'none' }}
            >
              {t(`analyze.${key}`)}
            </button>
            {onOpenHelp && (
              <button
                type="button"
                title={t('help')}
                onClick={() => onOpenHelp(HELP_ANCHORS[key] ?? 'tests')}
                style={{
                  padding: '10px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  borderRadius: '0 3px 3px 0',
                  color: 'var(--muted)',
                  fontWeight: 700,
                  minHeight: 0,
                }}
              >
                ?
              </button>
            )}
          </div>
        ))}
      </div>

      {ActiveDialog && (
        <ActiveDialog
          onClose={() => setOpen(null)}
          onResultAdded={() => { setOpen(null); onResultAdded?.(); }}
          onHelp={onOpenHelp ? () => onOpenHelp(HELP_ANCHORS[open] ?? 'tests') : undefined}
        />
      )}
    </div>
  );
}
