# Temura 1.5.1 — release verification

Verified on Windows 11 x64 (10.0.26200), September 9, 2026. Runtime source: tag `v1.5.1`, commit `674b48f`. The later documentation/test-harness changes do not alter published binaries.

## Delivered

- [Release 1.5.1](https://github.com/huxhkuh/tmora/releases/tag/v1.5.1): small installer and compatibility alias, full NSIS setup, portable build, blockmap, latest.yml, windows-release.json and SHA256SUMS.txt.
- English/Hebrew interface and four color palettes under settings; language and palette synchronize to the floating timer.
- Canonical updater/bootstrapper provider: `huxhkuh/tmora`. App ID, executable name, installer naming, storage origin, IndexedDB, AppData directory and NSIS identity remain unchanged.
- The historical `bou-time` payload URL in the wire manifest remains intentional. Both old manifest and payload URLs were followed successfully and their downloaded content verified.
- [Download page](https://huxhkuh.github.io/tmora/) built from the new main commit; 1.5.1 links, RTL and mobile layout checked in Chrome.

## Tests that passed

- 37 unit/integration tests: timer timestamps/concurrency, midnight/DST, pricing history, tasks, backup validation/idempotence, CSV safety, updater state/security, range-response validation and translation coverage/placeholders.
- 14 browser scenarios across the unchanged 1.5.x renderer: Hebrew/English workflows, reload, pause/resume, entries, reports/CSV, backup, multiple tabs, offline/PWA, mobile, focus and Picture-in-Picture. The English test was rerun after adding a wait for the completed timer-start transaction.
- Packaged Windows smoke, checklist, compact and security tests. Tiny window 240×154; expanded 340×217; English and live language/palette synchronization.
- Unmodified production EXE startup through Windows UI Automation, portable extraction/startup and unavailable self-update, production security fuses and rejection of a modified ASAR.
- 21 bootstrapper validation checks. All eight public downloads match local bytes and checksums, including YAML SHA-512/size and the identical small-installer aliases.
- Isolated NSIS updater: cancel/retry, cache reuse, corrupt download, missing cache, full fallback, server ignoring Range, installer replaced before execution, explicit installation and automatic relaunch. Saved client/project/task/timer state remained equal.
- Actual installed **1.4.0 → 1.5.1** update through the public GitHub feed and real NSIS installation. To exercise the old app's full-download fallback, the old installer cache was preserved elsewhere locally before this successful run. A client, project, completed task, historical time entry/pricing and running timer created by 1.4.0 remained unchanged in an isolated profile.
- The freshly downloaded public small installer completed cancellation, retry, SHA-256 verification, per-user installation and startup with that same test profile. Actual personal profile file hashes were unchanged, and the installed ASAR matched the production ASAR by SHA-256.
- New production code queried the actual public feed and returned `currentVersion: 1.5.1`, `phase: current`; invalid IPC rejected and 760 px layout had no horizontal overflow.
- npm audit: zero known vulnerabilities. Git pre-push verification passed.

## Public test finding and migration note

The first public 1.4.0 differential-download attempt stalled at 100% when an HTTP Range request received a full HTTP 200 response. The pinned electron-updater single-range writer accepted the response. This was fixed in **1.5.1** by rejecting inconsistent partial responses before their body reaches the writer, allowing the library's verified full-download fallback. A local server deliberately ignoring Range confirmed immediate rejection and successful full fallback; public-feed downloads were also verified. The 1.5.0 assets were not overwritten.

Previously distributed executables cannot gain this fix until upgraded. If an old version's update stalls, cancel, close Temura and run the new small installer once. Do not delete application data or disable Windows security.

## Limits

Publisher signing is still unavailable; SHA-256/SHA-512 are integrity checks, not Authenticode signatures. Windows 10 and ARM were not tested on physical machines. The bootstrapper remains Hebrew, and OS file controls follow system/browser language. Israel time, Sunday weeks and ILS are independent of interface language. Preferences stay local and separate from work backups.

The real production-upgrade harness supplied confirmation and suppressed automatic relaunch to avoid opening the personal profile; automatic relaunch was independently verified using the isolated QA installation identity. Test profiles and screenshots remain local and are not release assets.
