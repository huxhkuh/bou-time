# Download website

The public website is served by GitHub Pages from `/docs` on `main`:

- Hebrew: https://huxhkuh.github.io/tmora/
- English: https://huxhkuh.github.io/tmora/en.html

Edit copy and shared markup in `scripts/build-download-site.mjs`, styles in
`docs/style.css`, and playback behavior in `docs/site.js`. Run `npm run build:site`
to regenerate both pages from the package version. There is no runtime framework,
tracking, account, external font request, or paid service. The two language pages
and all download links work without JavaScript.

## Recordings and fonts

The timer, floating project switcher and checklist GIFs are genuine captures of
Temura 1.5.3, in Hebrew and English, using isolated profiles and example data.
They are 6.5–7 seconds long. Playback is manual, stops at the end, and stops when
switching demonstrations or leaving the page/viewport. GIF errors restore the
static image and show a localized message. Nothing autoplays, including when
reduced motion is requested. The example hourly-return calculation is explicitly
labeled as an example. The installer screenshot remains Hebrew in both pages.

To recapture on Windows after a production build:

1. Run `node scripts/security-test-copy.mjs` to prepare the isolated inspector
   copy used by existing desktop tests. Do not publish that copy.
2. Run `node scripts/capture-download-demos.mjs`. It creates disposable profiles
   under workspace `work`, captures the app controls, and writes frames under
   repository `work/site-frames`. It never opens the real user profile.
3. Run `python scripts/encode-download-demos.py` with Pillow installed. This only
   scales, pads and encodes the captured frames; it does not invent UI. Generated
   GIFs and posters go to `docs/assets/demos`.
4. Review the recordings visually before committing. Only public demonstration
   assets belong in Git; test profiles and binaries stay ignored.

Headings use Frank Ruhl Libre, with Heebo for body text. Both are self-hosted,
unmodified Fontsource WOFF2 subsets licensed under SIL OFL 1.1. The full licenses
and credits are under `docs/assets`. Tel Aviv and its private license are not
included.

## Verification

Run `npm run test:site` (requires installed Google Chrome). The test serves `/docs`
on an ephemeral loopback port and verifies Hebrew/English direction and navigation,
320/390/768/1024/1440-pixel layouts, image loading, keyboard tabs, GIF playback and
automatic/manual stopping, error recovery, FAQ keyboard interaction, all local
references and navigation without JavaScript. Screenshots go to ignored
`work/download-site-qa`. Image bytes are compared to the local assets: an HTTP 200
placeholder from a network filter must not count as a verified recording. Inspect
the screenshots as well as the running page.

For a deployed check in PowerShell:

```powershell
$env:SITE_URL='https://huxhkuh.github.io/tmora/'
npm run test:site
Remove-Item Env:SITE_URL
```

Website-only changes do not need a new application version or replacement release
assets. After pushing, wait for the Pages deployment, run the public test and
verify GitHub download responses. The full setup and portable links are versioned;
the small installer uses the latest-release alias. Keep all compatibility file
names intact. Do not describe checksums as publisher signatures.

### Publication check, 2026-09-10

The redesign was deployed successfully. Public language navigation, layouts and
controls passed browser checks. The small installer was downloaded and matched
the release SHA-256; setup and portable links returned HTTP 200 with expected
sizes. Both Frank Ruhl Libre font files matched their local bytes.

The current network's NetFree image filter replaces the new screenshots and GIFs
with review-pending placeholders, even though it returns HTTP 200. Actual assets
were visually verified locally; their public visual verification on this network
remains blocked pending that external review. Do not treat the initial browser
load checks as proof that the public GIF frames were visible.
