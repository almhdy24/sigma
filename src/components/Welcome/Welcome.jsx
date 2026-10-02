import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';

/**
 * First-run screen: explains Sigma in one line and offers the three ways to
 * start — try the sample dataset, import a file, or start from scratch.
 */
export default function Welcome({ onImport, onStartEmpty }) {
  const { t, i18n } = useTranslation();
  const loadDataset = useDatasetStore((s) => s.loadDataset);
  const [busy, setBusy] = useState(false);

  const trySample = async () => {
    setBusy(true);
    try {
      const { buildSampleDataset } = await import('../../lib/sampleDataset.js');
      loadDataset(buildSampleDataset(i18n.language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sigma-welcome">
      <svg width="56" height="56" viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="18" fill="#1f5fa6" />
        <path d="M 87,7 L 7,7 L 7,93 L 87,93 L 87,77 L 19,77 L 62,50 L 19,23 L 87,23 Z" fill="white" />
      </svg>
      <h1 className="sigma-welcome__title">{t('welcome.title')}</h1>
      <p className="sigma-welcome__lead">{t('welcome.lead')}</p>

      <div className="sigma-welcome__actions">
        <button type="button" className="sigma-welcome__action sigma-welcome__action--primary" onClick={trySample} disabled={busy}>
          <span aria-hidden="true" className="sigma-welcome__icon">▶</span>
          <span>
            <strong>{t('welcome.sample')}</strong>
            <small>{t('welcome.sampleHint')}</small>
          </span>
        </button>
        <button type="button" className="sigma-welcome__action" onClick={onImport}>
          <span aria-hidden="true" className="sigma-welcome__icon">↓</span>
          <span>
            <strong>{t('welcome.import')}</strong>
            <small>{t('welcome.importHint')}</small>
          </span>
        </button>
        <button type="button" className="sigma-welcome__action" onClick={onStartEmpty}>
          <span aria-hidden="true" className="sigma-welcome__icon">+</span>
          <span>
            <strong>{t('welcome.empty')}</strong>
            <small>{t('welcome.emptyHint')}</small>
          </span>
        </button>
      </div>

      <ul className="sigma-welcome__facts">
        <li><span aria-hidden="true">🔒</span>{t('welcome.factPrivate')}</li>
        <li><span aria-hidden="true">📶</span>{t('welcome.factOffline')}</li>
        <li><span aria-hidden="true">⚡</span>{t('welcome.factLight')}</li>
      </ul>
      <p className="sigma-welcome__links">
        <a href={`${import.meta.env.BASE_URL}privacy.html`}>{t('welcome.privacy')}</a>
        <span aria-hidden="true"> · </span>
        <a href="https://github.com/almhdy24/sigma" target="_blank" rel="noopener noreferrer">{t('welcome.source')}</a>
      </p>
    </div>
  );
}
