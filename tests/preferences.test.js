import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { translate, catalogs } from "../src/i18n.js";
import { readPreferences, LANGUAGES, THEMES } from "../src/preferences.js";
test("preferences reject invalid values and unavailable storage without touching work data", () => {
  assert.deepEqual(readPreferences({ getItem: () => "invalid" }), {
    language: "he",
    theme: "clay", mode: "light",
  });
  assert.deepEqual(
    readPreferences({
      getItem: () => {
        throw Error();
      },
    }),
    { language: "he", theme: "clay", mode: "light" },
  );
  assert.deepEqual(
    readPreferences({
      getItem: (k) => ({ "bou-ui-language": "en", "bou-ui-theme": "ocean", "bou-ui-mode": "dark" })[k],
    }),
    { language: "en", theme: "ocean", mode: "dark" },
  );
  assert.equal(LANGUAGES.length, 2);
  assert.equal(THEMES.length, 4);
});
test("English catalog covers source messages and preserves interpolation and user text", () => {
  const en = catalogs.en;
  for (const file of fs
    .readdirSync("src")
    .filter((f) => /\.(jsx|js)$/.test(f))) {
    const source = fs.readFileSync("src/" + file, "utf8");
    for (const match of source.matchAll(
      /tr\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g,
    )) {
      const key =
        match[1][0] === '"' ? JSON.parse(match[1]) : match[1].slice(1, -1);
      if (/[\u0590-\u05ff]/.test(key))
        assert.ok(en[key], `Missing English: ${file}: ${key}`);
    }
  }
  for (const [key, value] of Object.entries(en)) {
    assert.ok(value.trim());
    assert.deepEqual(
      key.match(/\{\d+\}/g) || [],
      value.match(/\{\d+\}/g) || [],
      key,
    );
  }
  assert.equal(
    translate("en", "עבודה על {0}", ["פרויקט <b> & {1}"]),
    "Work on פרויקט <b> & {1}",
  );
  assert.equal(translate("he", "היום"), "היום");
  assert.equal(translate("unknown", "היום"), "היום");
});
