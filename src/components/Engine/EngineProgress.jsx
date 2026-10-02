import { useTranslation } from 'react-i18next';
import useEngineStore from '../../store/engineStore.js';
import { cancelEngineDownload } from '../../lib/pyodideLoader.js';
import { formatMB } from './format.js';

/**
 * Global, non-blocking progress card for engine downloads. Sits above
 * dialogs (and above the mobile tab bar) so it is visible wherever the
 * download was triggered from.
 */
export default function EngineProgress() {
  const { t, i18n } = useTranslation();
  const phase      = useEngineStore((s) => s.phase);
  const purpose    = useEngineStore((s) => s.purpose);
  const components = useEngineStore((s) => s.components);
  const loaded     = useEngineStore((s) => s.loaded);
  const total      = useEngineStore((s) => s.total);
  const error      = useEngineStore((s) => s.error);
  const dismiss    = useEngineStore((s) => s.dismissError);

  if (phase === 'idle') return null;

  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  const installing = phase === 'installing';
  const isError = phase === 'error';
  const names = components.map((c) => t(`engine.component.${c}`)).join(' + ');

  return (
    <div
      className="sigma-engine-progress"
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
        <strong style={{ fontSize: 13, color: isError ? 'var(--error)' : 'var(--ink)' }}>
          {isError
            ? t('engine.failedTitle')
            : installing
              ? t('engine.installing')
              : t(purpose === 'offline' ? 'engine.downloadingOffline' : 'engine.downloading')}
        </strong>
        {!isError && !installing && (
          <span className="tnum" style={{ fontSize: 12, color: 'var(--muted)' }}>{pct}%</span>
        )}
      </div>

      {!isError && (
        <>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{names}</p>
          <div
            className={`sigma-progress${installing ? ' sigma-progress--indeterminate' : ''}`}
            role="progressbar"
            aria-label={t('engine.downloading')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={installing ? undefined : pct}
          >
            <div className="sigma-progress__bar" style={installing ? undefined : { inlineSize: `${pct}%` }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span className="tnum" dir="ltr" style={{ fontSize: 12, color: 'var(--muted)' }}>
              {installing
                ? ' '
                : `${formatMB(loaded, i18n.language)} / ${formatMB(total, i18n.language)} MB`}
            </span>
            {!installing && (
              <button type="button" className="sigma-btn-small" onClick={cancelEngineDownload}>
                {t('engine.cancel')}
              </button>
            )}
          </div>
        </>
      )}

      {isError && (
        <>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
            {error?.kind ? t(`engine.error.${error.kind}`) : error?.message}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="sigma-btn-small" onClick={dismiss}>
              {t('pwa.dismiss')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
