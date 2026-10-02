import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useIsMobile from '../../hooks/useIsMobile.js';

/* ─── verified external URLs — do NOT change these ─────────── */
const NIST_URL         = 'https://www.itl.nist.gov/div898/handbook/';
const NUMPY_URL        = 'https://numpy.org/doc/stable/';
const SCIPY_URL        = 'https://docs.scipy.org/doc/scipy/reference/stats.html';
const STATSMODELS_URL  = 'https://www.statsmodels.org/stable/index.html';

const TESTS = [
  'descriptives', 'frequencies', 'crosstabs', 'correlation',
  'ttest', 'anova', 'regression', 'nonparametric',
  'reliability', 'diagnostic', 'roc',
];

const SECTIONS = [
  { id: 'about',           navKey: 'help.nav.about' },
  { id: 'engine',          navKey: 'help.nav.engine' },
  { id: 'getting-started', navKey: 'help.nav.gettingStarted' },
  { id: 'tests',           navKey: 'help.nav.tests' },
  { id: 'credits',         navKey: 'help.nav.credits' },
  { id: 'references',      navKey: 'help.nav.references' },
];

function assumptionKeys(ns, count) {
  return Array.from({ length: count }, (_, i) => `${ns}.assumption.${i + 1}`);
}

/* ─── helpers ───────────────────────────────────────────────── */
function ExternalLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--accent)', textDecoration: 'underline', wordBreak: 'break-all' }}
    >
      {children}
    </a>
  );
}

function SectionAnchor({ id }) {
  return <div id={id} style={{ scrollMarginTop: 60 }} />;
}

/* ─── collapsible test entry ────────────────────────────────── */
function TestEntry({ testId, highlighted, onMount }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const ns = `help.tests.${testId}`;

  useEffect(() => {
    if (highlighted) {
      setOpen(true);
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [highlighted]);

  useEffect(() => {
    if (onMount && ref.current) onMount(testId, ref.current);
  }, [testId, onMount]);

  const assumptions = TESTS.includes(testId)
    ? Array.from({ length: 6 }, (_, i) => {
        const k = `${ns}.assumption.${i + 1}`;
        const v = t(k, { defaultValue: '' });
        return v || null;
      }).filter(Boolean)
    : [];

  const sciPyLink = testId === 'regression' || testId === 'anova'
    ? STATSMODELS_URL
    : SCIPY_URL;

  return (
    <div
      id={`test-${testId}`}
      ref={ref}
      style={{
        border: `1px solid ${highlighted ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 4,
        marginBottom: 10,
        background: highlighted ? 'var(--accent-tint)' : 'var(--surface)',
        scrollMarginTop: 64,
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* header row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          borderRadius: open ? '4px 4px 0 0' : 4,
          cursor: 'pointer',
          textAlign: 'start',
          minHeight: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
          {t(`${ns}.title`)}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginInlineStart: 8, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* body */}
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          <Subsection label={t('help.tests.subsection.what')}>
            <p style={bodyText}>{t(`${ns}.what`)}</p>
          </Subsection>

          <Subsection label={t('help.tests.subsection.logic')}>
            <p style={bodyText}>{t(`${ns}.logic`)}</p>
          </Subsection>

          {assumptions.length > 0 && (
            <Subsection label={t('help.tests.subsection.assumptions')}>
              <ul style={{ margin: '4px 0 0', paddingInlineStart: 20 }}>
                {assumptions.map((a, i) => (
                  <li key={i} style={{ ...bodyText, marginBottom: 4 }}>{a}</li>
                ))}
              </ul>
            </Subsection>
          )}

          <Subsection label={t('help.tests.subsection.when')}>
            <p style={bodyText}>{t(`${ns}.when`)}</p>
          </Subsection>

          <Subsection label={t('help.tests.subsection.interpret')}>
            <p style={bodyText}>{t(`${ns}.interpret`)}</p>
          </Subsection>

          <Subsection label={t('help.tests.subsection.learnMore')}>
            <ul style={{ margin: '4px 0 0', paddingInlineStart: 20 }}>
              <li style={{ ...bodyText, marginBottom: 4 }}>
                <ExternalLink href={NIST_URL}>
                  NIST/SEMATECH e-Handbook of Statistical Methods
                </ExternalLink>
              </li>
              <li style={bodyText}>
                <ExternalLink href={sciPyLink}>
                  {testId === 'regression' || testId === 'anova'
                    ? 'statsmodels Documentation'
                    : 'SciPy Stats Documentation'}
                </ExternalLink>
              </li>
            </ul>
          </Subsection>
        </div>
      )}
    </div>
  );
}

function Subsection({ label, children }) {
  return (
    <div style={{ marginTop: 14 }}>
      <p style={{
        margin: '0 0 4px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'var(--muted)',
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

const bodyText = { margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink)' };

/* ─── search filtering ──────────────────────────────────────── */
function matchesSearch(query, strings) {
  if (!query) return true;
  const q = query.toLowerCase();
  return strings.some((s) => s && s.toLowerCase().includes(q));
}

/* ─── main component ────────────────────────────────────────── */
export default function HelpPage({ anchor }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const [query,       setQuery]       = useState('');
  const [navOpen,     setNavOpen]     = useState(false);
  const [highlighted, setHighlighted] = useState(null);

  /* resolve anchor → highlighted test */
  useEffect(() => {
    if (!anchor) return;
    const id = anchor.replace(/^test-/, '');
    if (TESTS.includes(id)) {
      setHighlighted(id);
      /* scroll is handled by TestEntry */
      const el = document.getElementById(`test-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [anchor]);

  /* clear highlight after a moment */
  useEffect(() => {
    if (!highlighted) return;
    const t = setTimeout(() => setHighlighted(null), 3000);
    return () => clearTimeout(t);
  }, [highlighted]);

  /* ── nav links ── */
  const scrollTo = useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (isMobile) setNavOpen(false);
  }, [isMobile]);

  /* ── search filtering for tests ── */
  const visibleTests = TESTS.filter((id) => {
    if (!query) return true;
    return matchesSearch(query, [
      t(`help.tests.${id}.title`),
      t(`help.tests.${id}.what`),
      t(`help.tests.${id}.when`),
    ]);
  });

  /* ─── layout styles ── */
  const SIDEBAR_W = 220;

  const navItemStyle = (active) => ({
    display: 'block',
    width: '100%',
    textAlign: 'start',
    padding: '6px 12px',
    fontSize: 13,
    background: 'none',
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    color: active ? 'var(--accent)' : 'var(--ink)',
    fontWeight: active ? 600 : 400,
    transition: 'color 0.12s',
    minHeight: 0,
  });

  /* ─── TOC sidebar (desktop) / dropdown (mobile) ── */
  const NavContent = () => (
    <nav aria-label={t('help.nav.title')}>
      <p style={{ margin: '0 0 8px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {t('help.nav.title')}
      </p>
      {SECTIONS.map(({ id, navKey }) => (
        <button key={id} type="button" style={navItemStyle(false)} onClick={() => scrollTo(id)}>
          {t(navKey)}
        </button>
      ))}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <p style={{ margin: '0 0 4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {t('help.nav.tests')}
        </p>
        {TESTS.map((id) => (
          <button key={id} type="button" style={{ ...navItemStyle(false), fontSize: 12 }} onClick={() => {
            setHighlighted(id);
            const el = document.getElementById(`test-${id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (isMobile) setNavOpen(false);
          }}>
            {t(`help.tests.${id}.title`)}
          </button>
        ))}
      </div>
    </nav>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page)' }}>
      {/* ── desktop layout ── */}
      {!isMobile ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
          {/* sticky sidebar */}
          <aside style={{
            width: SIDEBAR_W,
            flexShrink: 0,
            position: 'sticky',
            top: 60,
            maxHeight: 'calc(100vh - 80px)',
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '12px 4px',
            marginInlineEnd: 24,
          }}>
            <NavContent />
          </aside>

          {/* main content */}
          <main style={{ flex: 1, minWidth: 0 }}>
            <PageContent
              t={t}
              query={query}
              setQuery={setQuery}
              visibleTests={visibleTests}
              highlighted={highlighted}
            />
          </main>
        </div>
      ) : (
        /* ── mobile layout ── */
        <div style={{ padding: '16px 12px 24px' }}>
          {/* collapsible "On this page" */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            marginBottom: 20,
          }}>
            <button
              type="button"
              onClick={() => setNavOpen((o) => !o)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13,
                minHeight: 0,
              }}
            >
              <span>{t('help.nav.title')}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{navOpen ? '▲' : '▼'}</span>
            </button>
            {navOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '8px 0 4px' }}>
                <NavContent />
              </div>
            )}
          </div>

          <PageContent
            t={t}
            query={query}
            setQuery={setQuery}
            visibleTests={visibleTests}
            highlighted={highlighted}
          />
        </div>
      )}
    </div>
  );
}

/* ─── all page content ──────────────────────────────────────── */
function PageContent({ t, query, setQuery, visibleTests, highlighted }) {
  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: 28 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('help.search.placeholder')}
          style={{ width: '100%', fontSize: 14, padding: '8px 12px' }}
          aria-label={t('help.search.placeholder')}
        />
      </div>

      {/* ── 1. About ── */}
      <SectionAnchor id="about" />
      <Section title={t('help.about.title')}>
        <p style={bodyText}>{t('help.about.p1')}</p>
        <p style={{ ...bodyText, marginTop: 12 }}>{t('help.about.p2')}</p>
        <p style={{ ...bodyText, marginTop: 12 }}>{t('help.about.p3')}</p>
        <p style={{ ...bodyText, marginTop: 12 }}>{t('help.about.p4')}</p>
      </Section>

      {/* ── 2. Engine ── */}
      <SectionAnchor id="engine" />
      <Section title={t('help.engine.title')}>
        <p style={bodyText}>{t('help.engine.p1')}</p>
        <p style={{ ...bodyText, marginTop: 12 }}>{t('help.engine.p2')}</p>
        <p style={{ ...bodyText, marginTop: 12 }}>{t('help.engine.p3')}</p>
        <p style={{ ...bodyText, marginTop: 12 }}>{t('help.engine.p4')}</p>

        <p style={{ ...bodyText, marginTop: 16, fontWeight: 600 }}>{t('help.engine.libsTitle')}</p>
        <ul style={{ margin: '8px 0 0', paddingInlineStart: 20 }}>
          <li style={{ ...bodyText, marginBottom: 6 }}>
            <ExternalLink href={NUMPY_URL}>{t('help.engine.numpy')}</ExternalLink>
          </li>
          <li style={{ ...bodyText, marginBottom: 6 }}>
            <ExternalLink href={SCIPY_URL}>{t('help.engine.scipy')}</ExternalLink>
          </li>
          <li style={bodyText}>
            <ExternalLink href={STATSMODELS_URL}>{t('help.engine.statsmodels')}</ExternalLink>
          </li>
        </ul>
      </Section>

      {/* ── 3. Getting Started ── */}
      <SectionAnchor id="getting-started" />
      <Section title={t('help.gettingStarted.title')}>
        <p style={bodyText}>{t('help.gettingStarted.intro')}</p>
        {['step1', 'step2', 'step3', 'step4', 'step5'].map((step) => (
          <div key={step} style={{ marginTop: 16 }}>
            <p style={{ ...bodyText, fontWeight: 700 }}>{t(`help.gettingStarted.${step}.title`)}</p>
            <p style={{ ...bodyText, marginTop: 4 }}>{t(`help.gettingStarted.${step}.body`)}</p>
          </div>
        ))}
        <div style={{
          marginTop: 18,
          padding: '12px 16px',
          background: 'var(--accent-tint)',
          border: '1px solid var(--border)',
          borderRadius: 4,
        }}>
          <p style={{ ...bodyText, marginBottom: 8 }}>{t('help.gettingStarted.tip.filter')}</p>
          <p style={bodyText}>{t('help.gettingStarted.tip.split')}</p>
        </div>
      </Section>

      {/* ── 4. Tests Reference ── */}
      <SectionAnchor id="tests" />
      <Section title={t('help.tests.title')}>
        <p style={{ ...bodyText, marginBottom: 16 }}>{t('help.tests.intro')}</p>
        {visibleTests.length === 0 ? (
          <p style={{ ...bodyText, color: 'var(--muted)' }}>{t('help.search.noMatch')}</p>
        ) : (
          visibleTests.map((id) => (
            <TestEntry
              key={id}
              testId={id}
              highlighted={highlighted === id}
            />
          ))
        )}
      </Section>

      {/* ── 5. Credits ── */}
      <SectionAnchor id="credits" />
      <Section title={t('help.credits.title')}>
        <p style={{ ...bodyText, marginBottom: 16 }}>{t('help.credits.intro')}</p>
        <div style={{
          border: '2px solid var(--border)',
          borderRadius: 6,
          padding: '20px 24px',
          background: 'var(--surface)',
          display: 'grid',
          gridTemplateColumns: 'max-content 1fr',
          rowGap: 10,
          columnGap: 16,
        }}>
          <CredRow label={t('help.credits.createdBy')} value={t('help.credits.author')} />
          <CredRow label={t('help.credits.website')}>
            <ExternalLink href="https://almhdy24.com">almhdy24.com</ExternalLink>
          </CredRow>
          <CredRow label={t('help.credits.source')}>
            <ExternalLink href="https://github.com/almhdy24">{t('help.credits.github')}</ExternalLink>
          </CredRow>
          <CredRow label={t('help.credits.license')} value={t('help.credits.licenseValue')} />
        </div>
        <p style={{ ...bodyText, marginTop: 14, color: 'var(--muted)', fontStyle: 'italic' }}>
          {t('help.credits.contribute')}
        </p>
      </Section>

      {/* ── 6. Further Reading ── */}
      <SectionAnchor id="references" />
      <Section title={t('help.references.title')}>
        <p style={{ ...bodyText, marginBottom: 16 }}>{t('help.references.intro')}</p>
        {[
          { key: 'nist', url: NIST_URL },
          { key: 'numpy', url: NUMPY_URL },
          { key: 'scipy', url: SCIPY_URL },
          { key: 'statsmodels', url: STATSMODELS_URL },
        ].map(({ key, url }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13 }}>
              <ExternalLink href={url}>{t(`help.references.${key}.title`)}</ExternalLink>
            </p>
            <p style={{ ...bodyText, color: 'var(--muted)' }}>{t(`help.references.${key}.desc`)}</p>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '20px 20px 24px',
      marginBottom: 20,
    }}>
      <h2 style={{
        margin: '0 0 16px',
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--ink)',
        paddingBottom: 12,
        borderBottom: '2px solid var(--accent-tint)',
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function CredRow({ label, value, children }) {
  return (
    <>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'start', paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: 'var(--ink)' }}>
        {children ?? value}
      </span>
    </>
  );
}
