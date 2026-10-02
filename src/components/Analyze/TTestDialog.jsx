import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDatasetStore from '../../store/datasetStore.js';
import useResultsStore from '../../store/resultsStore.js';
import { ANALYSIS_PACKAGES, getPyodide } from '../../lib/pyodideLoader.js';
import { oneSampleTTest, independentTTest, pairedTTest } from '../../lib/stats/ttest.js';
import { mannWhitneyU, wilcoxonSignedRank } from '../../lib/stats/nonparametric.js';
import { shapiroWilkTest, levenesTest } from '../../lib/stats/assumptions.js';
import { apaOneSampleTTest, apaIndependentTTest, apaPairedTTest } from '../../lib/apaMethods.js';
import useFilterStore from '../../store/filterStore.js';
import { getAnalysisCaseGroups, applyFilter, extractValues } from '../../lib/getFilteredCaseValues.js';
import {
  overlay, modal, overlayClass, modalClass, dialogTitle, footer,
  btnPrimary, btnSecondary, inputSel, fieldLabel, errorMsg,
} from './_dialogStyles.js';

const FMT = (v) => (v == null ? '—' : Number(v).toFixed(4));

function sigText(p) {
  if (p == null) return 'unknown';
  return p < 0.05 ? 'statistically significant at α = 0.05' : 'not statistically significant at α = 0.05';
}

function cohensMag(d) {
  if (d == null) return '';
  const a = Math.abs(d);
  if (a >= 0.8) return 'large';
  if (a >= 0.5) return 'medium';
  if (a >= 0.2) return 'small';
  return 'negligible';
}

function buildAssumpTable(swResults, t, levene) {
  const rows = swResults.map((sw) => {
    if (sw.skipped) return [sw.label, sw.n, '—', '—', t('assumptions.skipped')];
    const flag = sw.pValue >= 0.05 ? t('assumptions.normalityMet') : t('assumptions.normalityWarning');
    return [sw.label, sw.n, FMT(sw.W), FMT(sw.pValue), flag];
  });
  if (levene) {
    const levFlag = levene.levP == null ? '—'
      : levene.levP >= 0.05 ? t('assumptions.homogeneityMet') : t('assumptions.homogeneityWarning');
    rows.push([t('assumptions.levene'), '—', FMT(levene.levF), FMT(levene.levP), levFlag]);
  }
  return {
    title: t('assumptions.title'),
    columns: [t('assumptions.col.variable'), 'N', 'W / F', 'p', t('assumptions.col.result')],
    rows,
  };
}

const npNoteStyle = {
  fontSize: 12,
  color: 'var(--muted)',
  marginBottom: 12,
  lineHeight: 1.5,
};

export default function TTestDialog({ onClose, onResultAdded, onHelp }) {
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

  const [testType, setTestType] = useState('one-sample');
  const [varId, setVarId] = useState('');
  const [testValue, setTestValue] = useState('0');
  const [groupVarId, setGroupVarId] = useState('');
  const [varAId, setVarAId] = useState('');
  const [varBId, setVarBId] = useState('');
  const [runNonParam, setRunNonParam] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const canRun = (() => {
    if (running) return false;
    if (testType === 'one-sample') return !!varId && !isNaN(Number(testValue));
    if (testType === 'independent') return !!varId && !!groupVarId;
    if (testType === 'paired') return !!varAId && !!varBId && varAId !== varBId;
    return false;
  })();

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const py = await getPyodide(ANALYSIS_PACKAGES.ttest);
      const _groups = getAnalysisCaseGroups(cases, activeFilter, variables, splitVar);
      for (const _group of _groups) {
        const cases = _group.cases;
        const _splitSuffix = _group.label != null
          ? ` [${splitVar?.label || splitVar?.name} = ${_group.label}]`
          : '';

        let res, tableRows, varNames, interpretation, methodsParagraph;
        const tables = [];

        if (testType === 'one-sample') {
          const v = variables.find((x) => x.id === varId);
          const vals = extractValues(cases, v);
          const sw = await shapiroWilkTest(py, vals, v.label || v.name);
          tables.push(buildAssumpTable([sw], t));
          res = await oneSampleTTest(py, vals, Number(testValue));
          varNames = [v.label || v.name];
          tableRows = [
            ['N', res.n], ['Mean', FMT(res.mean)], ['Std Dev', FMT(res.sd)],
            ['Test Value', testValue], ['Mean Diff', FMT(res.meanDiff)],
            ['95% CI Lower', FMT(res.ciLow)], ['95% CI Upper', FMT(res.ciHigh)],
            ['t', FMT(res.tStatistic)], ['df', res.df], ['p', FMT(res.pValue)],
            ["Cohen's d", res.cohensD == null ? '—' : `${FMT(res.cohensD)} (${cohensMag(res.cohensD)})`],
          ];
          interpretation = `t(${res.df}) = ${FMT(res.tStatistic)}, p = ${FMT(res.pValue)}, d = ${FMT(res.cohensD)} — ${sigText(res.pValue)}` + _splitSuffix;
          methodsParagraph = apaOneSampleTTest(v.label || v.name, testValue, res);
          tables.push({
            title: t('dialog.ttestOneSample'),
            columns: [t('table.statistic'), t('table.value')],
            rows: tableRows,
          });
        } else if (testType === 'independent') {
          const v = variables.find((x) => x.id === varId);
          const gv = variables.find((x) => x.id === groupVarId);
          const allVals = extractValues(cases, v);
          const groupVals = extractValues(cases, gv);
          const groups = [...new Set(groupVals.filter((x) => x != null))].sort();
          if (groups.length !== 2) throw new Error('Grouping variable must have exactly 2 distinct non-missing values');
          const aVals = allVals.filter((_, i) => groupVals[i] === groups[0]);
          const bVals = allVals.filter((_, i) => groupVals[i] === groups[1]);
          const [swA, swB, lev] = await Promise.all([
            shapiroWilkTest(py, aVals, String(groups[0])),
            shapiroWilkTest(py, bVals, String(groups[1])),
            levenesTest(py, [{ values: aVals }, { values: bVals }]),
          ]);
          tables.push(buildAssumpTable([swA, swB], t, { levF: lev.F, levP: lev.pValue }));
          res = await independentTTest(py, aVals, bVals);
          varNames = [v.label || v.name, gv.label || gv.name];
          tableRows = [
            ['Group', `${groups[0]} (n=${res.nA})`, `${groups[1]} (n=${res.nB})`],
            ['Mean', FMT(res.meanA), FMT(res.meanB)],
            ['Std Dev', FMT(res.sdA), FMT(res.sdB)],
            ['Mean Diff', FMT(res.meanDiff), ''],
            ['95% CI Lower', FMT(res.ciLow), ''],
            ['95% CI Upper', FMT(res.ciHigh), ''],
            ['Levene F', FMT(res.leveneF), ''],
            ['Levene p', FMT(res.leveneP), ''],
            [res.variant === 'welch' ? 'Welch t' : 't', FMT(res.tStatistic), ''],
            ['df', FMT(res.df), ''], ['p', FMT(res.pValue), ''],
            ["Cohen's d", res.cohensD == null ? '—' : `${FMT(res.cohensD)} (${cohensMag(res.cohensD)})`, ''],
          ];
          const variantLabel = res.variant === 'welch' ? "Welch's (unequal variances)" : 'equal variances assumed';
          interpretation = `t(${FMT(res.df)}) = ${FMT(res.tStatistic)}, p = ${FMT(res.pValue)}, d = ${FMT(res.cohensD)} [${variantLabel}] — ${sigText(res.pValue)}` + _splitSuffix;
          methodsParagraph = apaIndependentTTest(v.label || v.name, gv.label || gv.name, String(groups[0]), String(groups[1]), res);
          tables.push({
            title: t('dialog.ttestIndependent'),
            columns: [t('table.statistic'), t('table.value'), ''],
            rows: tableRows,
          });

          if (runNonParam) {
            const mw = await mannWhitneyU(py, aVals, bVals);
            const rStr = mw.r == null ? '—' : `${FMT(mw.r)} (${cohensMag(mw.r)})`;
            tables.push({
              title: 'Mann-Whitney U (non-parametric)',
              columns: [t('table.statistic'), t('table.value'), ''],
              rows: [
                ['Group', `${groups[0]} (n=${mw.nA})`, `${groups[1]} (n=${mw.nB})`],
                ['Median', FMT(mw.medianA), FMT(mw.medianB)],
                ['U', FMT(mw.U), ''],
                ['z', FMT(mw.z), ''],
                ['p (two-tailed)', FMT(mw.pValue), ''],
                ['r (effect size)', rStr, ''],
              ],
            });
            interpretation += ` | Mann-Whitney U = ${FMT(mw.U)}, p = ${FMT(mw.pValue)}, r = ${FMT(mw.r)}`;
          }
        } else {
          const vA = variables.find((x) => x.id === varAId);
          const vB = variables.find((x) => x.id === varBId);
          const valsA = extractValues(cases, vA);
          const valsB = extractValues(cases, vB);
          const [swA2, swB2] = await Promise.all([
            shapiroWilkTest(py, valsA, vA.label || vA.name),
            shapiroWilkTest(py, valsB, vB.label || vB.name),
          ]);
          tables.push(buildAssumpTable([swA2, swB2], t));
          res = await pairedTTest(py, valsA, valsB);
          varNames = [vA.label || vA.name, vB.label || vB.name];
          tableRows = [
            ['N pairs', res.n], ['Mean diff', FMT(res.mean)], ['Std Dev', FMT(res.sd)],
            ['95% CI Lower', FMT(res.ciLow)], ['95% CI Upper', FMT(res.ciHigh)],
            ['t', FMT(res.tStatistic)], ['df', res.df], ['p', FMT(res.pValue)],
            ["Cohen's d", res.cohensD == null ? '—' : `${FMT(res.cohensD)} (${cohensMag(res.cohensD)})`],
          ];
          interpretation = `t(${res.df}) = ${FMT(res.tStatistic)}, p = ${FMT(res.pValue)}, d = ${FMT(res.cohensD)} — ${sigText(res.pValue)}` + _splitSuffix;
          methodsParagraph = apaPairedTTest(vA.label || vA.name, vB.label || vB.name, res);
          tables.push({
            title: t('dialog.ttestPaired'),
            columns: [t('table.statistic'), t('table.value')],
            rows: tableRows,
          });

          if (runNonParam) {
            const wx = await wilcoxonSignedRank(py, valsA, valsB);
            const rStr = wx.r == null ? '—' : FMT(wx.r);
            tables.push({
              title: 'Wilcoxon Signed-Rank (non-parametric)',
              columns: [t('table.statistic'), t('table.value')],
              rows: [
                ['N (non-zero diffs)', wx.n],
                ['Median diff', FMT(wx.medianDiff)],
                ['W', FMT(wx.W)],
                ['p (two-tailed)', FMT(wx.pValue)],
                ['r (effect size)', rStr],
              ],
            });
            interpretation += ` | Wilcoxon W = ${FMT(wx.W)}, p = ${FMT(wx.pValue)}`;
          }
        }

        addResult({
          analysisType: 'ttest',
          variablesUsed: varNames,
          tables,
          interpretation,
          methodsParagraph,
          chartData: null,
        });
      }
      onResultAdded();
    } catch (e) {
      console.error('[TTestDialog] analysis error:', e);
      setError(e?.name === 'EngineError' ? e.message : t('dialog.analysisError'));
    } finally {
      setRunning(false);
    }
  };

  const numericOptions = numericVars.map((v) => (
    <option key={v.id} value={v.id}>{v.label || v.name}</option>
  ));

  const showNpCheck = testType === 'independent' || testType === 'paired';
  const npLabel = testType === 'independent'
    ? t('dialog.ttest.alsoMannWhitney')
    : t('dialog.ttest.alsoWilcoxon');
  const npNote = testType === 'independent'
    ? t('dialog.ttest.mannWhitneyNote')
    : t('dialog.ttest.wilcoxonNote');

  return (
    <div style={overlay} className={overlayClass} onClick={onClose}>
      <div style={modal} className={modalClass} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...dialogTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('analyze.ttest')}</span>
          {onHelp && <button type="button" onClick={onHelp} style={{ padding: '2px 8px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 3, background: 'transparent', cursor: 'pointer', minHeight: 0, flexShrink: 0 }}>?</button>}
        </div>

        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>{t('dialog.ttestType')}</p>
        {['one-sample', 'independent', 'paired'].map((tt) => (
          <label key={tt} style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
            <input type="radio" name="ttestType" value={tt} checked={testType === tt}
              onChange={() => { setTestType(tt); setRunNonParam(false); }} style={{ marginInlineEnd: 6 }} />
            {t(`dialog.ttest${tt.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}`)}
          </label>
        ))}

        <div style={{ marginTop: 14 }}>
          {testType === 'one-sample' && (<>
            <label style={fieldLabel}>{t('dialog.selectVariables')}</label>
            <select value={varId} onChange={(e) => setVarId(e.target.value)} style={inputSel}>
              <option value="">—</option>{numericOptions}
            </select>
            <label style={fieldLabel}>{t('dialog.testValue')}</label>
            <input type="number" value={testValue} onChange={(e) => setTestValue(e.target.value)}
              style={{ ...inputSel, width: '50%' }} />
          </>)}

          {testType === 'independent' && (<>
            <label style={fieldLabel}>{t('dialog.selectVariables')} (numeric)</label>
            <select value={varId} onChange={(e) => setVarId(e.target.value)} style={inputSel}>
              <option value="">—</option>{numericOptions}
            </select>
            <label style={fieldLabel}>{t('dialog.groupingVariable')}</label>
            <select value={groupVarId} onChange={(e) => setGroupVarId(e.target.value)} style={inputSel}>
              <option value="">—</option>
              {variables.map((v) => <option key={v.id} value={v.id}>{v.label || v.name} ({t(`type.${v.type}`)})</option>)}
            </select>
          </>)}

          {testType === 'paired' && (<>
            <label style={fieldLabel}>Variable A</label>
            <select value={varAId} onChange={(e) => setVarAId(e.target.value)} style={inputSel}>
              <option value="">—</option>{numericOptions}
            </select>
            <label style={fieldLabel}>Variable B</label>
            <select value={varBId} onChange={(e) => setVarBId(e.target.value)} style={inputSel}>
              <option value="">—</option>{numericOptions}
            </select>
          </>)}
        </div>

        {showNpCheck && (
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={runNonParam} onChange={(e) => setRunNonParam(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{npLabel}</span>
            </label>
            {runNonParam && <p style={npNoteStyle}>{npNote}</p>}
          </div>
        )}

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
