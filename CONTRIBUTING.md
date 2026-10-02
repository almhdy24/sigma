# Contributing to Sigma · المساهمة في سيغما

Thank you for helping! Contributions of any size are welcome: bug reports, translations, docs, tests and code.
شكراً لاهتمامك! نرحّب بكل المساهمات: الإبلاغ عن الأخطاء، الترجمة، التوثيق، الاختبارات، والكود.

## Quick start

```bash
git clone https://github.com/almhdy24/sigma.git
cd sigma
yarn install
yarn dev            # http://localhost:5173
```

Before opening a pull request:

```bash
yarn lint
yarn test           # stats tests also need: pip install numpy==2.0.2 scipy==1.14.1
yarn build
```

## Guidelines

- **Keep it light.** The app shell is about 200 KB. Load new features lazily (`lazy(() => import(...))` or `await import(...)`), and avoid adding dependencies when a few lines will do. Check `yarn build` output for size changes.
- **RTL first.** Use logical CSS (`margin-inline-start`, `inset-inline-end`, `text-align: start`). Test in Arabic and English, on a phone-sized screen.
- **Translations.** Add every user-facing string to both `src/i18n/locales/ar.json` and `en.json` (Help-page texts go in `src/i18n/help/`).
- **Statistics.** Python runs via Pyodide (`src/lib/stats/`). Add or adjust a test in `tests/stats.test.js` with reference values (from SciPy, R or a textbook) for any change to a statistical procedure.
- **Privacy.** Never send user data over the network.
- **Commits.** Small, focused commits with clear messages. One topic per pull request.

See [docs/architecture.md](docs/architecture.md) for how the code is organised.

## Reporting bugs

Open an [issue](https://github.com/almhdy24/sigma/issues/new/choose) with steps to reproduce, what you expected, your device/browser, and a small sample file if possible. Remove any real patient data first.

By contributing you agree that your work is released under the [MIT License](LICENSE) and that you will follow the [Code of Conduct](CODE_OF_CONDUCT.md).
