# Sigma — أداة التحليل الإحصائي

**Sigma** is an offline-first, Arabic-friendly statistical analysis workbench that runs entirely in the browser. It is designed for medical students, researchers, and educators who need SPSS-style capabilities without installing native software.

## Features

- **Data entry** — Spreadsheet-style data grid with variable/case management, value labels, and missing-value handling
- **Variable view** — Define variable types (numeric, string, categorical, date), measurement levels, and value labels
- **Statistical procedures** — Descriptive statistics, Frequencies, Crosstabs (χ²), Pearson & Spearman Correlation, One-Sample / Independent / Paired T-Tests, One-Way ANOVA (+ Tukey HSD post-hoc), Linear Regression
- **Chart builder** — Histogram, Bar chart, Scatter plot, Box-and-whisker plot with PNG export
- **Results panel** — Formatted output tables, plain-text copy, PDF export
- **Bilingual (Arabic / English)** — Full RTL layout when Arabic is active; the interface switches instantly at runtime
- **PWA / offline-capable** — Installable as a Progressive Web App; once loaded, works without a network connection

> **Note on Pyodide:** Statistical computations run via [Pyodide](https://pyodide.org) (Python in WebAssembly), which currently loads numpy, scipy, and statsmodels from the jsDelivr CDN on first use (~60 MB). An internet connection is required for that initial download; subsequent visits use the browser cache. Full offline self-hosting of Pyodide is planned for a future release.

## Screenshots

_TODO: add screenshots_

## Getting Started

```bash
# Install dependencies
yarn install

# Start the development server
yarn dev

# Build for production
yarn build

# Preview the production build locally
yarn preview
```

## Tech Stack

| Layer | Library / Tool |
|---|---|
| UI framework | React 19 |
| Build tool | Vite 8 + vite-plugin-pwa |
| Data grid | AG Grid Community 36 |
| Charts | Recharts 3 |
| Statistics engine | Pyodide 0.27 (numpy, scipy, statsmodels) |
| Persistence | Dexie (IndexedDB) + Zustand |
| i18n | i18next + react-i18next |
| Typography | IBM Plex Sans Arabic (self-hosted via @fontsource) |
| PDF export | jsPDF + jspdf-autotable |

## Project Structure

```
src/
  components/
    Analyze/        # Statistical procedure dialogs + shared modal styles
    Charts/         # Chart components (Histogram, Bar, Scatter, Box)
    Results/        # Results view and table rendering
    DataView.jsx    # Case data grid
    VariableView.jsx
    ValueLabelsModal.jsx
    Logo.jsx
  db/               # Dexie schema + Zustand persistence middleware
  i18n/             # Translation files (en.json, ar.json)
  lib/
    pyodideLoader.js
    stats/          # Statistical computation modules (one per procedure)
  store/            # Zustand stores (datasetStore, resultsStore)
```

## License

MIT © Elmahdi
# sigma
