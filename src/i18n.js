import en from "./locales/en.json" with { type: "json" };
import { getPreferences } from "./preferences.js";
export const catalogs = { en };
export const locale = () =>
  getPreferences().language === "en" ? "en-GB" : "he-IL";
// Hebrew source messages are stable keys; only application copy goes through tr.
// User-provided names, notes and task titles are passed as values, never translated.
export function translate(language, key, values = []) {
  const message = catalogs[language]?.[key] ?? key;
  return typeof message === "string"
    ? message.replace(/\{(\d+)\}/g, (token, i) =>
        values[i] === undefined ? token : String(values[i]),
      )
    : message;
}
export const tr = (key, values) =>
  translate(getPreferences().language, key, values);
