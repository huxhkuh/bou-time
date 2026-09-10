# Memory and packaging, version 1.5.4

No storage schema, app identity, feature, security fuse, updater validation or
timer accounting was removed. The app still uses Electron 44.2.0.

## Changes

- Reuse a single Israel `Intl.DateTimeFormat` instance for date/time parts.
  Recreating it for each conversion repeatedly allocated native ICU resources.
  The localized header formatter is also reused until the language changes.
- Cache the dashboard's saved day/week history until entries or the Israel day
  change. Only the active session is sliced on each display update. Recent
  project ordering uses a single history pass instead of rescanning all entries
  inside every sort comparison.
- Paint visible running clocks once per second. Idle/paused displays refresh on
  minute boundaries (including midnight), and immediately on focus/visibility.
  Hidden documents cancel their display timeout. Time is always calculated from
  persisted timestamps; this scheduling never accrues or saves work time.
- Restore Electron's background throttling. Separate visible floating windows
  keep their own display scheduler.
- Keep React, ReactDOM, Lucide, and Heebo as build dependencies. Vite already
  includes the needed code/fonts in `dist`; their source packages were duplicated
  in the installed ASAR. `electron-updater` remains a runtime dependency.
- Package Chromium UI locales `he`, `en-US` and `en-GB`, matching supported app
  languages. All ICU timezone/Unicode data, application translations, fonts,
  rendering libraries and license notices remain. When adding an app language,
  add its Chromium locale to `build.electronLanguages` too.

## Measured sizes

Decimal MB, actual x64 build artifacts on the same machine:

| Item | 1.5.3 | 1.5.4 | Reduction |
| --- | ---: | ---: | ---: |
| Installed application files | 417.81 MB | 339.56 MB | 78.24 MB / 18.7% |
| App ASAR | 32.29 MB | 2.70 MB | 29.58 MB / 91.6% |
| Full setup download | 114.27 MB | 103.36 MB | 10.91 MB / 9.5% |
| Portable download | 114.05 MB | 103.15 MB | 10.91 MB / 9.6% |

Installed size excludes personal data, updater cache, and temporary portable
extraction. Electron's executable/rendering engine accounts for most remaining
disk use; the ASAR reduction is not the percentage reduction of the entire app.

## RAM measurement

Unique physical memory (USS), summed across only the application's process IDs,
using Windows `psutil.memory_full_info().uss`. Values are MiB (2^20 bytes).

| Scenario | 1.5.3 | 1.5.4 | Reduction |
| --- | ---: | ---: | ---: |
| Empty workspace, idle | 156.6 | 141.2 | 9.8% |
| 1,000 entries, idle | 203.6 | 188.8 | 7.3% |
| 1,000 entries, running timer | 206.9 | 193.3 | 6.5% |
| 1,000 entries, running + floating window | 222.5 | 205.0 | 7.9% |
| Main minimized, floating window open | 221.7 | 204.0 | 8.0% |

These are controlled, short QA samples, not universal memory limits. Both builds
used separate fresh profiles and the same synthetic history/UI sequence. Only
the main-process inspector fuse was enabled in isolated copies for Playwright;
the production ASAR was unchanged. Debugging, Windows caching, screen resolution,
data volume and other activity affect results. These figures should not be
directly compared to a user's Task Manager screenshot from another session.
The metrics run retains Playwright's default focus emulation for repeatability;
`desktop-visibility.mjs` uses only the main-process inspector for a separate
native minimize/restore test, without renderer focus emulation. The compact
window suite separately checks continued tracking while the main is minimized.

Renderer task time over a five-second sample fell from 0.151 s to 0.070 s while
tracking with 1,000 entries, and from 0.145 s to 0.015 s while idle. These are
renderer task durations, not total-process CPU percentages. Keeping RAM below a
fixed threshold cannot be guaranteed by these optimizations.

## Reproduction

After building each version, run `node scripts/security-test-copy.mjs`, then set
`BOU_TEST_EXE` to the instrumented copy and `PERF_LABEL` to an output label.
Optionally set `BOU_PERF_PYTHON` to a Python executable with psutil installed for
physical RAM measurements. Run `node tests/desktop-performance.mjs`. It uses only
isolated QA profiles, reports five Electron metrics samples per stage, captures
renderer task time, then takes a Windows USS snapshot. Raw results remain under
ignored `work/performance`; never publish the profiles.

Run `node tests/packaged-runtime.mjs` to verify the pruned archive. The unit suite
tests display scheduling, hide/show/sleep catch-up, midnight and timer accuracy;
the existing browser/native suites cover UI behavior and data persistence.

For a real isolated NSIS upgrade from old production code, set
`BOU_QA_BASELINE_ASAR` to that build's `resources/app.asar` before running
`node scripts/build-update-qa.mjs`, then `node tests/desktop-updates.mjs --install`.
This retains the disposable QA identity; it does not replace the user's install.

Verified for 1.5.4: 46 unit tests, 17 browser scenarios, 21 bootstrapper validation
checks, packaged smoke/compact/checklist/security tests, native visibility,
unchanged-production and portable startup, ASAR-tamper rejection, and lean package
inspection. The isolated NSIS upgrade from 1.5.3 code to 1.5.4 code passed actual
download, install, relaunch and full state comparison. A separate
`node tests/desktop-upgrade-data.mjs` comparison preserved all 1,000 saved entries,
their timestamps/descriptions/prices, clients/projects and the active timer.

The larger archive replacement exposed stale ASAR-header caching in the QA
reader; the test now clears its metadata cache before inspecting each replaced
archive. This was a test-reader issue, not an installation or data migration.
