# Sigma — أداة التحليل الإحصائي

**Sigma** is an offline-first, Arabic-first statistical analysis workbench that runs entirely in the browser. It is designed for medical students, researchers, and educators who need SPSS-style capabilities without installing software. Data never leaves the device.

> **بالعربية:** سيغما أداة تحليل إحصائي بأسلوب SPSS تعمل داخل المتصفح بالكامل، بالعربية والإنجليزية، على الجوال والحاسوب، ودون إنترنت بعد التنزيل الأول. بياناتك لا تغادر جهازك.

## Features

- **Data entry**: spreadsheet grid on desktop and touch-friendly case cards on phones; value labels, missing values, undo/redo
- **Import / export**: CSV and Excel (`.xlsx`); CSV exports include a UTF-8 BOM so Excel shows Arabic correctly, and Excel exports use right-to-left sheets in Arabic
- **Transform**: Compute, Recode, Select Cases, Split File
- **Statistics**: Descriptives, Frequencies, Crosstabs (χ², Cramér's V), Pearson & Spearman correlation, one-sample / independent / paired t-tests, one-way ANOVA with Tukey HSD, linear regression with VIF, Cronbach's α, ROC curve, diagnostic-test accuracy, non-parametric alternatives, assumption checks
- **Charts**: histogram, bar, scatter, box plot, ROC, with PNG export
- **Results**: formatted tables, APA methods paragraphs, PDF export with full Arabic shaping and right-to-left layout
- **Bilingual**: Arabic (RTL) and English (LTR), switchable at runtime; `<html lang/dir>` always follows the language
- **Installable PWA**: works offline, prompts before applying updates, respects notches and home-indicator safe areas

## How downloads work (on demand)

Nothing heavy is downloaded up front:

| Part | When it is downloaded | Size (approx.) |
|---|---|---|
| App shell (UI, data entry) | first visit, then cached by the service worker | ~570 KB (~190 KB gzipped) |
| Each screen / dialog / export library | the first time it is opened | 5–320 KB gzipped each |
| Python core (Pyodide) | the first time any analysis runs | 13.8 MB |
| NumPy | first reliability / ROC analysis | ~3.6 MB |
| SciPy (+ OpenBLAS) | first t-test, ANOVA, correlation, regression, crosstabs, descriptives | ~15 MB |

- Engine downloads show a **progress bar** (MB and %) with a **Cancel** button.
- Everything downloaded is stored on the device and works offline afterwards.
- **Analyze → "Download everything for offline use"** saves the whole engine and every screen in one go.
- Python runs in a **Web Worker**, so the UI never freezes while SciPy installs or an analysis runs.
- statsmodels/pandas (~20 MB) are no longer needed: Tukey HSD uses `scipy.stats.tukey_hsd` and regression uses NumPy OLS. Both are verified to match statsmodels exactly.

The engine files are served from jsDelivr (Pyodide 0.27.0). The exact files each analysis needs are listed in [`src/lib/engine/manifest.js`](src/lib/engine/manifest.js), generated from the pinned `pyodide` package by `yarn engine:manifest`.

## Getting started

```bash
yarn install      # install dependencies
yarn dev          # start the dev server
yarn lint         # ESLint
yarn test         # unit + integration tests (Vitest)
yarn build        # production build in dist/
yarn preview      # serve the production build locally
```

The stats tests run each module's Python code with CPython + SciPy 1.14.1 (the version Pyodide ships). Install them with `pip install numpy==2.0.2 scipy==1.14.1`. Without them those tests are skipped. The engine-worker tests use the real Pyodide from `node_modules` and need no network.

## Deployment

Every push to `main` runs lint, tests and a build ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) and then deploys to **GitHub Pages**.

One-time setup: in the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The site is then published at `https://<user>.github.io/<repo>/`.

To host elsewhere (Netlify, Vercel, Cloudflare Pages, any static host), run `yarn build` and serve `dist/`. Set `BASE_PATH` when the app is not served from the domain root (e.g. `BASE_PATH=/sigma/ yarn build`).

## Tech stack

| Layer | Library / tool |
|---|---|
| UI | React 19 |
| Build | Vite 8 (Rolldown) + vite-plugin-pwa (Workbox) |
| Data grid | AG Grid Community (desktop only, lazy-loaded) |
| Charts | Recharts 3 |
| Statistics engine | Pyodide 0.27 (NumPy, SciPy) in a Web Worker |
| Persistence | Dexie (IndexedDB) + Zustand |
| i18n | i18next + react-i18next |
| Spreadsheets | read-excel-file / write-excel-file |
| PDF | jsPDF + jspdf-autotable + bidi-js, IBM Plex Sans Arabic embedded |
| Tests | Vitest |

## Project structure

```
src/
  components/
    Analyze/        # analysis dialogs (each one a lazy chunk)
    Engine/         # engine download progress + offline panel
    Charts/ Results/ Transform/ Import/ Export/ Help/ Install/
    LazyBoundary.jsx  # Suspense + recoverable error UI for lazy chunks
  lib/
    engine/         # manifest, download planner, cached downloader, worker
    pyodideLoader.js# on-demand engine API used by the dialogs
    stats/          # one module per procedure (Python run in the worker)
    pdf/            # PDF export + Unicode bidi handling
    charts/         # chart data preparation
  store/            # Zustand stores (dataset, results, filter, engine)
  i18n/             # ar.json, en.json
tests/              # Vitest suites
scripts/            # gen-engine-manifest.mjs
```

## License

MIT © Elmahdi. IBM Plex Sans Arabic is © IBM Corp., licensed under the [SIL Open Font License 1.1](src/assets/fonts/OFL-IBM-Plex.txt).
