# 1.5.2 — Light/dark display

Adds a persistent display-mode preference under Backup & settings → Language & appearance. Default light; dark supports all four palettes. Main, focus and floating windows share the preference, including changes made with the floating sun/moon button. No work-data schema or app identity changes.

## Verified on Windows 11 x64

- 37 unit tests: preference validation, timer/concurrency, backups, billing and updater security.
- 14 existing browser scenarios plus a new light/dark scenario: Hebrew/English, all palettes, cross-tab sync, refresh persistence, unchanged IndexedDB state, forms/checklists and 390px mobile layout.
- Visual review caught low-contrast legacy help text; fixed and added a regression assertion.
- Packaged desktop compact test: 240×154/340×217 windows, timer switching, pause/resume, restart persistence and bidirectional display-mode synchronization.
- Packaged desktop smoke: backup/restore, persistence and sandbox.
- Unmodified hardened EXE: native startup/settings. Portable EXE tested separately.
- Installer validation: 21 checks. Local eight-asset SHA-256/SHA-512, sizes and compatibility manifest checks.
- npm audit: zero reported vulnerabilities.

## Scope and limits

The user's installed 1.5.1 app was open and its data files locked. A current-user upgrade test stopped before any modification; it was not retried by closing the user's app. This release does not claim a fresh real-install upgrade test. Updater/installer code and application identities are unchanged from the verified 1.5.1 release. The user can apply 1.5.2 through the existing explicit update flow.

Appearance is local to the profile (`bou-ui-mode`) and excluded from work-data backups. Publisher signing remains pending; checksums are not publisher signatures. Production hardening fuses stay enabled. Playwright uses an isolated copy with only its required Node inspector enabled and the identical application ASAR.
