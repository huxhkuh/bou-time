// Read-only check against the published GitHub release, with isolated app data.
import { _electron as electron, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
const profile = await fs.mkdtemp(path.resolve("../../work/update-feed-"));
const exe = process.env.BOU_TEST_EXE || path.resolve("../windows/win-unpacked/Bou Time.exe");
let app;
try {
  app = await electron.launch({ executablePath: exe, args: [], env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, BOU_DESKTOP_TEST: "1", BOU_TEST_PROFILE: profile } });
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByRole("button", { name: "גיבוי והגדרות", exact: true }).click();
  const updates = page.locator(".desktop-updates");
  await updates.getByRole("button", { name: "בדיקת עדכונים" }).click();
  await expect(updates).toContainText("אתה משתמש בגרסה העדכנית", { timeout: 90000 });
  const status = await page.evaluate(() => window.bouDesktop.getUpdateStatus());
  const blocked = await page.evaluate(() => window.bouDesktop.updateAction("https://example.invalid/payload.exe").then(() => false, () => true));
  expect(blocked).toBe(true);
  expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
  await page.screenshot({ path: "../windows-updates.png" });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(760, 700));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "../windows-updates-narrow.png" });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: true, status, checks: ["actual public GitHub feed", "invalid IPC action rejected", "RTL", "760px no overflow", "no renderer errors"] }));
} finally { if (app) await app.close(); }
