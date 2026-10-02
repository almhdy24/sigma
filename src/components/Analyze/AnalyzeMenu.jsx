import { lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import EnginePanel from '../Engine/EnginePanel.jsx';
import LazyBoundary from '../LazyBoundary.jsx';

// Each dialog (and the stats code behind it) is its own chunk, downloaded
// the first time the user opens that analysis.
const ANALYSES = [
  { key: 'descriptives', help: 'test-descriptives', Dialog: lazy(() => import('./DescriptivesDialog.jsx')) },
  { key: 'frequencies',  help: 'test-frequencies',  Dialog: lazy(() => import('./FrequenciesDialog.jsx')) },
  { key: 'crosstabs',    help: 'test-crosstabs',    Dialog: lazy(() => import('./CrosstabsDialog.jsx')) },
  { key: 'correlation',  help: 'test-correlation',  Dialog: lazy(() => import('./CorrelationDialog.jsx')) },
  { key: 'ttest',        help: 'test-ttest',        Dialog: lazy(() => import('./TTestDialog.jsx')) },
  { key: 'anova',        help: 'test-anova',        Dialog: lazy(() => import('./AnovaDialog.jsx')) },
  { key: 'regression',   help: 'test-regression',   Dialog: lazy(() => import('./RegressionDialog.jsx')) },
  { key: 'diagnostic',   help: 'test-diagnostic',   Dialog: lazy(() => import('./DiagnosticTestDialog.jsx')) },
  { key: 'roc',          help: 'test-roc',          Dialog: lazy(() => import('./RocCurveDialog.jsx')) },
  { key: 'reliability',  help: 'test-reliability',  Dialog: lazy(() => import('./ReliabilityDialog.jsx')) },
];

export default function AnalyzeMenu({ onResultAdded, onOpenHelp, isOnline }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);

  const active = ANALYSES.find((a) => a.key === open) ?? null;
  const close = () => setOpen(null);

  return (
    <div className="sigma-page">
      <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>{t('analyze.title')}</h2>

      <EnginePanel isOnline={isOnline} />

      <div className="sigma-analysis-grid">
        {ANALYSES.map(({ key, help }) => (
          <div key={key} className="sigma-split-btn">
            <button type="button" onClick={() => setOpen(key)}>
              {t(`analyze.${key}`)}
            </button>
            {onOpenHelp && (
              <button
                type="button"
                className="sigma-split-btn__help"
                title={t('help')}
                aria-label={`${t('help')}: ${t(`analyze.${key}`)}`}
                onClick={() => onOpenHelp(help)}
              >
                ?
              </button>
            )}
          </div>
        ))}
      </div>

      {active && (
        <LazyBoundary overlay onClose={close}>
          <active.Dialog
            onClose={close}
            onResultAdded={() => { close(); onResultAdded?.(); }}
            onHelp={onOpenHelp ? () => onOpenHelp(active.help) : undefined}
          />
        </LazyBoundary>
      )}
    </div>
  );
}
