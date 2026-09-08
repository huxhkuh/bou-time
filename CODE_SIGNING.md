# Code signing policy

## Current status

Temura (תמורה) is preparing an application for free code signing through SignPath Foundation. **No approval or signing certificate has been granted. Existing releases are unsigned.** This page is a proposed policy for onboarding, not a claim that SignPath has reviewed or endorsed the project.

If the application is approved and signed releases are available, the attribution will be: Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org). Foundation certificates identify SignPath Foundation as the publisher.

## Project roles

- Maintainer, committer and reviewer: [huxhkuh](https://github.com/huxhkuh).
- Proposed signing approver: [huxhkuh](https://github.com/huxhkuh).
- Changes from outside contributors must be reviewed by the maintainer before inclusion in a signed release. Signing requests must be approved manually by the maintainer after reviewing the source revision, build results and artifacts.

The project must have multi-factor authentication enabled for all GitHub and SignPath accounts with these roles before signing is enabled. This document does not assert that account setup has already been verified.

## Build and signing boundaries

A [Windows verification build template](docs/windows-build.workflow.yml) has been prepared for a manually triggered GitHub-hosted Windows build. It is **not active or verified on GitHub yet**: the current repository connection cannot publish workflows without additional authorization. Current releases were built locally using the scripts in [the release guide](docs/RELEASING.md).

The template uses the committed npm lockfile, checks tests and dependency advisories, and stores unsigned build artifacts with their source commit under the workflow run. It requests read-only repository permissions, receives no signing credentials and cannot publish releases. Activating it requires placing it in `.github/workflows/windows-build.yml` through an appropriately authorized connection and verifying a successful run. This is preparation for source-verifiable signing, not an operational signing pipeline.

After SignPath approval, the project will configure the service's GitHub trusted-build integration and a signing policy limited to approved release artifacts and source revisions. Signing must cover the application executable and installers in the appropriate packaging order. Vendor binaries and third-party components retain their original licenses and signatures; they must not be misrepresented as code authored by Temura. Electron/NSIS packaging coverage must be agreed with SignPath during onboarding.

Never expose signing tokens to pull-request builds. A failed or missing required signature must block publication of a release advertised as signed. Verify the publisher signature and timestamp before generating final release hashes and update metadata. Rebuild blockmaps/metadata from final signed packages; do not append signatures to already-published update payloads. Existing versioned release files must not be replaced.

## Privacy

See [Privacy policy](PRIVACY.md). Users' work records stay on their device; installation and explicitly requested update checks/downloads contact GitHub. No client, project or time-entry data is needed for signing.

## בעברית

אנחנו מכינים בקשה למסלול החינמי של SignPath. עדיין אין אישור והגרסאות הקיימות אינן חתומות. בעל המאגר יאשר ידנית כל בקשת חתימה, לאחר בדיקת הקוד ותוצאות הבנייה. הפעלת החתימה מחייבת אימות דו־שלבי והגדרת הרשאות אצל הספק. פרטי העבודה האישיים אינם נשלחים לשירות החתימה.
