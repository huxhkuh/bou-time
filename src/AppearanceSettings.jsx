import React, { useSyncExternalStore } from "react";
import { Palette } from "lucide-react";
import { Field } from "./ui.jsx";
import {
  getPreferences,
  subscribePreferences,
  setPreference,
  THEMES,
} from "./preferences.js";
import { tr } from "./i18n.js";
export default function AppearanceSettings({ notify }) {
  const prefs = useSyncExternalStore(subscribePreferences, getPreferences);
  function change(field, value) {
    try {
      setPreference(field, value);
    } catch {
      notify(
        tr("לא הצלחנו לשמור את ההעדפות. בדוק הרשאות שמירה ומקום פנוי."),
        true,
      );
    }
  }
  const names = {
    clay: tr("שמנת וחרס"),
    forest: tr("יער"),
    ocean: tr("אוקיינוס"),
    plum: tr("שזיף"),
  };
  return (
    <section className="surface appearance-settings">
      <Palette className="section-icon" />
      <h2>{tr("שפה ומראה")}</h2>
      <p>{tr("סביבת עבודה שמתאימה לך. השינויים חלים גם על הצג הצף.")}</p>
      <Field label={tr("שפת הממשק")}>
        <select
          value={prefs.language}
          onChange={(e) => change("language", e.target.value)}
        >
          <option value="he">עברית</option>
          <option value="en">English</option>
        </select>
      </Field>
      <fieldset className="theme-picker">
        <legend>{tr("ערכת צבעים")}</legend>
        {THEMES.map((theme) => (
          <label key={theme} data-palette={theme}>
            <input
              type="radio"
              name="theme"
              value={theme}
              checked={prefs.theme === theme}
              onChange={() => change("theme", theme)}
            />
            <span className="theme-swatch" aria-hidden="true" />
            <span>{names[theme]}</span>
          </label>
        ))}
      </fieldset>
      <p className="note">
        {tr(
          "ההעדפות נשמרות במכשיר הזה בנפרד מגיבוי העבודה. שעון ישראל, יום ראשון ומטבע ₪ נשארים ללא שינוי.",
        )}
      </p>
    </section>
  );
}
