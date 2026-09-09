# Interface languages and color themes

Version 1.5.0 adds English alongside Hebrew and four palettes: cream/clay (default), forest, ocean and plum. Choose them under **Backup & settings → Language & appearance**. Hebrew uses RTL and English uses LTR. The floating timer shares the preferences.

`src/i18n.js` translates application messages through `tr(source, values)`. Hebrew source messages are stable keys; `src/locales/en.json` contains English translations. Keep numbered `{0}` placeholders identical across translations. Names, task titles and notes are values, never translation keys or HTML.

To add a language:

1. Add its JSON catalog under `src/locales` and register it in `catalogs` in `i18n.js`.
2. Add its code to `LANGUAGES` in `preferences.js`, map its locale in `i18n.js`, and set its direction in `applyPreferences`.
3. Add its native name to the language selector in `AppearanceSettings.jsx`.
4. Extend the allowlist and native dialog copy in `desktop/main.cjs`.
5. Extend catalog coverage/placeholder tests and run browser and floating-window tests in both directions.

Palettes are CSS custom properties in `appearance.css`; their allowlist is `THEMES` in `preferences.js`. Include a swatch and translated name in `AppearanceSettings.jsx` when adding one.

Preferences use separate localStorage keys `bou-ui-language` and `bou-ui-theme`, validate values, and synchronize across windows through storage events. They are specific to the device/browser profile and are intentionally separate from work-data backups. Work data and database schema are unchanged. Israel time, Sunday week boundaries and ILS currency are independent of interface language. Browser/Windows file-picker text, installation UI and the installed application's identity follow the existing OS/installer language; the bootstrapper remains Hebrew.

Run `npm test`, `npm run build`, and `npm run test:e2e`. Browser tests use their own production server on port 5184 and fail if it is occupied, instead of accidentally testing another project.
