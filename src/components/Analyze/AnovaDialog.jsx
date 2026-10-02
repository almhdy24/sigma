import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { getPyodide } from '../../lib/pyodideLoader.js';
import { extractValues } from '../../lib/stats/extractValues.js';
import { computeOneWayAnova } from '../../lib/stats/anova.js';
import { kruskalWallis } from '../../lib/stats/nonparametric.js';
import { shapiroWilkTest, levenesTest } from '../../lib/stats/assumptions.js';
import { apaAnova } from '../../lib/apaMethods.js';
import useFilterStore from '../../store/filterStore.js';
import { getAnalysisCaseGroups, applyFilter, extractValues as extractFilteredValues } from '../../lib/getFilteredCaseValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg, typeBadge,
} from './_dialogStyles.js';

const FMT4 = (v) => (v == null ? '—' : Number(v).toFixed(4));
const FMT2 = (v) => (v == null ? '—' : Number(v).toFixed(2));
const fmtP = (p) => (p == null ? '—' : p < 0.001 ? '< 0.001' : FMT4(p));

const AFMT = (v) => (v == null ? '—' : Number(v).toFixed(4));

function buildAssumpTable(swResults, t, levene) {
  const rows = swResults.map((sw) => {
    if (sw.skipped) return [sw.label, sw.n, '—', '—', t('assumptions.skipped')];
    const flag = sw.pValue >= 0.05 ? t('assumptions.normalityMet') : t('assumptions.normalityWarning');
    return [sw.label, sw.n, AFMT(sw.W), AFMT(sw.pValue), flag];
  });
  if (levene) {
    const levFlag = levene.levP == null ? '—'
      : levene.levP >= 0.05 ? t('assumptions.homogeneityMet') : t('assumptions.homogeneityWarning');
    rows.push([t('assumptions.levene'), '—', AFMT(levene.levF), AFMT(levene.levP), levFlag]);
  }
  return {
    title: t('assumptions.title'),
    columns: [t('assumptions.col.variable'), 'N', 'W / F', 'p', t('assumptions.col.result')],
    rows,
  };
}

function etaMag(eta2) {
  if (eta2 == null) return '';
  if (eta2 >= 0.14) return 'large';
  if (eta2 >= 0.06) return 'medium';
  if (eta2 >= 0.01) return 'small';
  return 'negligible';
}

export default function AnovaDialog({ onClose, onResultAdded, onHelp }) {
  const { t } = useTranslation();
  const variables = useDatasetStore((s) => s.variables);
  const cases = useDatasetStore((s) => s.cases);
  const addResult = useResultsStore((s) => s.addResult);

  const activeFilter = useFilterStore(s => s.activeFilter);
  const splitVariableId = useFilterStore(s => s.splitVariableId);
  const splitVar = splitVariableId ? variables.find(v => v.id === splitVariableId) : null;
  const filteredCount = useMemo(
    () => applyFilter(cases, activeFilter, variables).length,
    [cases, activeFilter, variables]
  );

  const numericVars = variables.filter((v) => v.type === 'numeric');

  // factorVars uses unfiltered cases intentionally — it's a selection helper
  const factorVars = useMemo(() =>
    variables.filter((v) => {
      const vals = extractValues(cases, v);
      return new Set(vals.filter((x) => x !== null)).size >= 3;
    }),
    [variables, cases],
  );

  const [depVarId, setDepVarId] = useState('');
  const [factorVarId, setFactorVarId] = useState('');
  const [runKruskal, setRunKruskal] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const canRun = !running && !!depVarId && !!factorVarId && depVarId !== factorVarId && factorVars.length > 0;

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide();
      const _groups = getAnalysisCaseGroups(cases, activeFilter, variables, splitVar);
      for (const _group of _groups) {
        const cases = _group.cases;
        const _splitSuffix = _group.label != null
          ? ` [${splitVar?.label || splitVar?.name} = ${_group.label}]`
          : '';

        const depVar = variables.find((v) => v.id === depVarId);
        const factorVar = variables.find((v) => v.id === factorVarId);

        const depVals = extractFilteredValues(cases, depVar);
        const factorVals = extractFilteredValues(cases, factorVar);

        const distinctFactorVals = [...new Set(factorVals.filter((x) => x !== null))].sort();
        const groups = distinctFactorVals
          .map((fv) => ({
            label: String(fv),
            values: depVals.filter((_, i) => factorVals[i] === fv && depVals[i] !== null),
          }))
          .filter((g) => g.values.length > 0);

        if (groups.length < 3) throw new Error(t('dialog.anova.needThreeGroups'));

        const [swResults, lev] = await Promise.all([
          Promise.all(groups.map((g) => shapiroWilkTest(py, g.values, g.label))),
          levenesTest(py, groups),
        ]);
        const assumpTable = buildAssumpTable(swResults, t, { levF: lev.F, levP: lev.pValue });

        const res = await computeOneWayAnova(py, groups);

        const depName = depVar.label || depVar.name;
        const factorName = factorVar.label || factorVar.name;
        const sig = res.pValue < 0.05;

        const summaryTable = {
          title: t('dialog.anova.summaryTitle'),
          columns: [t('dialog.anova.col.source'), t('dialog.anova.col.ss'), t('dialog.anova.col.df'), t('dialog.anova.col.ms'), 'F', 'p', 'η²'],
          rows: [
            [t('dialog.anova.between'), FMT2(res.ssBetween), res.dfBetween, FMT2(res.msBetween), FMT4(res.fStatistic), fmtP(res.pValue), res.etaSquared == null ? '—' : `${FMT4(res.etaSquared)} (${etaMag(res.etaSquared)})`],
            [t('dialog.anova.within'), FMT2(res.ssWithin), res.dfWithin, FMT2(res.msWithin), '', '', ''],
            [t('dialog.anova.total'), FMT2(res.ssTotal), res.dfBetween + res.dfWithin, '', '', '', ''],
          ],
        };

        const descTable = {
          title: t('dialog.anova.descTitle'),
          columns: [t('dialog.anova.col.group'), 'N', t('dialog.anova.col.mean'), t('dialog.anova.col.sd')],
          rows: (res.groups ?? []).map((g) => [g.label, g.n, FMT2(g.mean), FMT2(g.sd)]),
        };

        const tables = [assumpTable, summaryTable, descTable];

        const postHoc = res.postHoc;
        if (postHoc && postHoc.pairs && postHoc.pairs.length > 0) {
          tables.push({
            title: t('dialog.anova.postHocTitle'),
            columns: [t('dialog.anova.col.groupA'), t('dialog.anova.col.groupB'), t('dialog.anova.col.meanDiff'), 'p', t('dialog.anova.col.significant')],
            rows: postHoc.pairs.map((pr) => [pr.groupA, pr.groupB, FMT4(pr.meanDiff), fmtP(pr.pValue), pr.significant ? '✓' : '']),
          });
        } else if (sig) {
          tables.push({
            title: t('dialog.anova.postHocTitle'),
            columns: ['Note'],
            rows: [[t('dialog.anova.postHocUnavailable')]],
          });
        }

        const etaStr = res.etaSquared == null ? '' : `, η² = ${FMT4(res.etaSquared)} (${etaMag(res.etaSquared)})`;
        const interpretation =
          `F(${res.dfBetween}, ${res.dfWithin}) = ${FMT4(res.fStatistic)}, p = ${fmtP(res.pValue)}${etaStr} — ` +
          (sig ? t('dialog.anova.sig') : t('dialog.anova.nsig')) + _splitSuffix;

        if (runKruskal) {
          const kw = await kruskalWallis(py, groups);
          const eta2Str = kw.eta2H == null ? '—' : `${FMT4(kw.eta2H)} (${etaMag(kw.eta2H)})`;
          tables.push({
            title: t('dialog.anova.kruskalTitle'),
            columns: ['Statistic', 'Value'],
            rows: [
              ['H', FMT4(kw.H)],
              ['df', kw.df],
              ['N', kw.N],
              ['p', fmtP(kw.pValue)],
              ['η²H (effect size)', eta2Str],
            ],
          });
          tables.push({
            title: t('dialog.anova.kruskalMedians'),
            columns: [t('dialog.anova.col.group'), 'N', 'Median'],
            rows: (kw.groupMedians ?? []).map((g) => [g.label, g.n, FMT2(g.median)]),
          });
        }

        addResult({
          analysisType: 'anova',
          variablesUsed: [depName, factorName],
          tables,
          interpretation,
          methodsParagraph: apaAnova(depName, factorName, res),
          chartData: null,
        });
      }
      onResultAdded();
    } catch (e) {
      console.error('[AnovaDialog] analysis error:', e);
      setError(t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('analyze.anova')}</span>
          {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
        </div>

        <label style={fieldLabel}>{t('dialog.anova.dependentVar')}</label>
        <select value={depVarId} onChange={(e) => setDepVarId(e.target.value)} style={inputSel}>
          <option value="">—</option>
          {numericVars.map((v) => (
            <option key={v.id} value={v.id}>{v.label || v.name}</option>
          ))}
        </select>

        <label style={fieldLabel}>{t('dialog.anova.factorVar')}</label>
        {factorVars.length === 0 ? (
          <p style={{ ...errorMsg, color: 'var(--muted)', marginBottom: 12 }}>
            {t('dialog.anova.noFactorVars')}
          </p>
        ) : (
          <select value={factorVarId} onChange={(e) => setFactorVarId(e.target.value)} style={inputSel}>
            <option value="">—</option>
            {factorVars.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label || v.name}<span style={typeBadge}> ({t(`type.${v.type}`)})</span>
              </option>
            ))}
          </select>
        )}

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={runKruskal} onChange={(e) => setRunKruskal(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }} />
            <span>{t('dialog.anova.alsoKruskal')}</span>
          </label>
          {runKruskal && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
              {t('dialog.anova.kruskalNote')}
            </p>
          )}
        </div>

        {activeFilter && (
          <p style={{ fontSize: 12, color: 'var(--sig)', margin: '8px 0 4px', lineHeight: 1.4 }}>
            {t('filter.analysisNotice', { n: filteredCount, total: cases.length })}
          </p>
        )}
        {splitVar && (
          <p style={{ fontSize: 12, color: 'var(--accent)', margin: '0 0 8px', lineHeight: 1.4 }}>
            {t('split.activeNotice', { varName: splitVar.label || splitVar.name })}
          </p>
        )}
        {error && <p style={errorMsg}>{error}</p>}
        <div style={footer}>
          <button type="button" onClick={handleRun} disabled={!canRun} style={btnPrimary}>
            {running ? '...' : t('dialog.run')}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>{t('dialog.cancel')}</button>
        </div>
      </div>
    </div>
  );
}
