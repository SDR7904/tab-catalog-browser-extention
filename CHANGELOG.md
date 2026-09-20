# Changelog

## 1.2.1 — 2026-09-19

- Move HTML/Markdown builders into `export-builders.js` (CSS + client script constants live there)
- Expand Node tests with export smoke coverage (escaping, unsafe schemes, pinned badge)
- Add `web-ext-config.cjs` so `npm run lint:ext` stays simple for CI

## 1.2.0 — 2026-09-19

- Fix broken favicons in the popup (hide on error) and skip Google fallback for non-http(s) pages
- Harden HTML export escaping for attributes; only link `http`/`https` URLs in exports
- Add per-tab selection, in-popup filter, all-windows scope, and remote-favicons toggle
- Show pinned tabs; lazy-load favicons with a short-lived domain cache
- Accessibility: `aria-pressed` on format buttons and `:focus-visible` styles
- Exported HTML: `/` focuses filter, `Esc` clears
- Add `helpers.js`, Node helper tests, GitHub Actions CI (`web-ext lint`), and this changelog

## 1.1.0

- Markdown export, Firefox MV3 packaging, offline-first popup (system fonts)
