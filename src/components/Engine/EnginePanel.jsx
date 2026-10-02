import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useEngineStore from '../../store/engineStore.js';
import { downloadEngineForOffline, refreshEngineCacheStatus } from '../../lib/pyodideLoader.js';
import { COMPONENTS, componentBytes } from '../../lib/engine/plan.js';
import { cacheAppForOffline } from '../../lib/offlineAssets.js';
import { formatMB } from './format.js';

/**
 * Explains the on-demand engine and offers a one-tap "download everything
 * for offline use". Shown at the top of the Analyze tab.
 */
export default function EnginePanel({ isOnline }) {
  const { t, i18n } = useTranslation();
  const cached = useEngineStore((s) => s.cached);
  const phase  = useEngineStore((s) => s.phase);
  const [open, setOpen] = useState(false);

  useEffect(() => { refreshEngineCacheStatus(); }, []);

  const allCached = COMPONENTS.every((c) => cached[c.id]);
  const remaining = COMPONENTS.filter((c) => !cached[c.id]).reduce((s, c) => s + componentBytes(c), 0);
  const busy = phase === 'downloading' || phase === 'installing';

  const downloadAll = () => {
    Promise.all([downloadEngineForOffline(), cacheAppForOffline()]).catch(() => {});
  };

  return (
    <section className="sigma-card" aria-labelledby="engine-panel-title" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ fontSize: 18, color: allCached ? 'var(--ok)' : 'var(--accent)' }}>
          {allCached ? '✓' : '⇣'}
        </span>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <h3 id="engine-panel-title" style={{ fontSize: 13 }}>
            {allCached ? t('engine.panel.readyTitle') : t('engine.panel.title')}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
            {allCached ? t('engine.panel.readyBody') : t('engine.panel.body')}
          </p>
        </div>
        {!allCached && (
          <button
            type="button"
            className="sigma-btn-primary"
            disabled={busy || !isOnline}
            onClick={downloadAll}
          >
            {t('engine.panel.downloadAll', { size: formatMB(remaining, i18n.language) })}
          </button>
        )}
        <button
          type="button"
          className="sigma-btn-link"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? t('engine.panel.hideDetails') : t('engine.panel.details')}
        </button>
      </div>

      {open && (
        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 6 }}>
          {COMPONENTS.map((c) => (
            <li key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span aria-hidden="true" style={{ inlineSize: 16, color: cached[c.id] ? 'var(--ok)' : 'var(--muted)' }}>
                {cached[c.id] ? '✓' : '○'}
              </span>
              <span style={{ flex: 1 }}>
                {t(`engine.component.${c.id}`)}
                <span style={{ color: 'var(--muted)' }}> — {t(`engine.componentUse.${c.id}`)}</span>
              </span>
              <span className="tnum" dir="ltr" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                ≈ {formatMB(componentBytes(c), i18n.language)} MB
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
