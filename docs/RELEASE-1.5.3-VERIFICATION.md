# 1.5.3 — Client/project deletion

Project cards and client rows now offer explicit deletion. A confirmation names the target, lists project/task/entry counts and saved hours, explains irreversible cascading removal and requires the exact name. Client deletion includes archived projects. Archiving remains available to preserve history.

Deletion runs inside the existing strict IndexedDB transaction. The affected records are compared against the confirmation snapshot; changes in another window require a new confirmation. Related active or paused timers block deletion. Repeated actions are idempotent. Unrelated client/project data and timers remain intact. Existing form/task checks prevent stale editors from recreating deleted entities or orphan references.

No schema, identity, path, updater or installer changes. Older backups can deliberately restore deleted records when merged; the confirmation explains this.

## Verification

- 43 unit/integration tests, including cascade scope, archived projects, exact name, timer blocking, stale confirmations, duplicate actions, backup restoration and real IndexedDB delete/start/task races.
- Browser deletion scenarios: cancel/no change, wrong-name blocking, deletion reflected in reports and backup, reload persistence, English 390px dark dialog, Hebrew light dialog, cross-window invalidation, stale project edit rejection, paused/running timer blocking.
- 17 browser scenarios passed across the full run and one isolated retry. The existing appearance scenario exceeded the 45-second total timeout with six concurrent workers (16 others passed); it passed alone in 24.9 seconds without a source change.
- Packaged Windows deletion test: cascade including archived projects, immediate floating-window sync, unchanged unrelated client/project/task/entry data, and identical remaining state after native restart.
- Packaged compact test: both window sizes, timer switching/pause/restart, duplicate prevention and bilingual appearance sync.

## Delivery limits

Personal data is never used for destructive tests. Windows testing uses isolated profiles. No unattended installation over the user's running app is performed. Publisher signing remains pending; SHA checksums are not a publisher certificate.
