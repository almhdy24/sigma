# Security Policy

## Supported versions

Only the latest version (the `main` branch, deployed at https://sigma.almhdy24.com) receives fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through
[GitHub Security Advisories](https://github.com/almhdy24/sigma/security/advisories/new).

Include steps to reproduce and the impact. You will get a response within a few days, and credit in the release notes if you wish.

## Scope notes

Sigma runs entirely in the browser and stores data only on the user's device (IndexedDB). It has no backend or accounts. Relevant issues include XSS, malicious import files (CSV/XLSX), formula evaluation (`src/lib/expression.js`), and supply-chain risks in dependencies.
