export const LANGUAGES = ["he", "en"];
export const THEMES = ["clay", "forest", "ocean", "plum"];
const keys = { language: "bou-ui-language", theme: "bou-ui-theme" };
const allowed = { language: LANGUAGES, theme: THEMES };
const defaults = { language: "he", theme: "clay" };
export function readPreferences(storage) {
  const result = { ...defaults };
  for (const field of Object.keys(keys)) {
    try {
      const value = storage?.getItem(keys[field]);
      if (allowed[field].includes(value)) result[field] = value;
    } catch {
      /* Unavailable preferences must not block access to work data. */
    }
  }
  return Object.freeze(result);
}
function storage() {
  if (typeof window === "undefined") return undefined;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
let current = readPreferences(storage());
const listeners = new Set();
export const getPreferences = () => current;
export const subscribePreferences = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function refresh() {
  const next = readPreferences(storage());
  if (next.language === current.language && next.theme === current.theme)
    return;
  current = next;
  for (const listener of listeners) listener();
}
export function setPreference(field, value) {
  if (!allowed[field]?.includes(value)) throw Error("Invalid preference");
  const target = storage();
  if (!target) throw Error("Preferences storage unavailable");
  target.setItem(keys[field], value);
  refresh();
}
globalThis.addEventListener?.("storage", (event) => {
  if (event.key === null || Object.values(keys).includes(event.key)) refresh();
});
export function applyPreferences(doc = globalThis.document) {
  if (!doc) return;
  doc.documentElement.lang = current.language;
  doc.documentElement.dir = current.language === "he" ? "rtl" : "ltr";
  doc.documentElement.dataset.theme = current.theme;
}
