// Bound the complete input before cloning it or walking relational records.
// JSON files cannot contain executable objects, but may contain hostile keys,
// excessive nesting or enough records to block the UI without these limits.
export function checkBackupTree(input) {
  const stack = [[input, 0]], seen = new Set();
  let nodes = 0, characters = 0;
  while (stack.length) {
    const [value, depth] = stack.pop();
    if (++nodes > 1200000 || depth > 16) throw Error("הגיבוי גדול או מקונן מדי לעיבוד בטוח.");
    if (typeof value === "string") {
      characters += value.length;
      if (characters > 20 * 1024 * 1024) throw Error("הגיבוי גדול מדי לעיבוד בטוח.");
    } else if (value && typeof value === "object") {
      if (seen.has(value) || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype))
        throw Error("מבנה הגיבוי אינו תקין.");
      seen.add(value);
      const keys = Object.keys(value);
      if (keys.length >= 100000) throw Error("הגיבוי מכיל יותר מדי פריטים.");
      for (const key of keys) {
        if (["__proto__", "constructor", "prototype"].includes(key)) throw Error("הגיבוי מכיל שדה לא מורשה.");
        stack.push([value[key], depth + 1]);
      }
    } else if (value !== null && typeof value !== "boolean" && !(typeof value === "number" && Number.isFinite(value))) {
      throw Error("הגיבוי מכיל ערך לא נתמך.");
    }
  }
}
