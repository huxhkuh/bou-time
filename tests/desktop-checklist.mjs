import { _electron as electron, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fresh } from "../src/domain.js";
await fs.mkdir("../../work", { recursive: true });
const profile = await fs.mkdtemp(path.resolve("../../work/checklist-profile-"));
const backupFile = path.join(profile, "checklist-export.json");
const options = {
  ...(process.env.BOU_TEST_EXE ? { executablePath: process.env.BOU_TEST_EXE, args: [] } : { args: [process.cwd()] }),
  env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, BOU_DESKTOP_TEST: "1", BOU_TEST_PROFILE: profile },
};
const legacy = { ...fresh(), clients: [{ id: "c", name: "לקוח בדיקה" }], projects: [{ id: "p", name: "פרויקט משימות", clientId: "c", color: "#b94f2a", description: "", archived: false, priceType: "none", price: null, goal: null }] };
delete legacy.tasks;
let app;
try {
  app = await electron.launch(options);
  let page = await app.firstWindow();
  await page.getByRole("button", { name: "גיבוי והגדרות", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({ name: "legacy.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(legacy)) });
  await page.getByRole("button", { name: "ייבוא ומיזוג", exact: true }).click();
  await expect(page.locator(".import-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "פרויקטים", exact: true }).click();
  await page.locator("summary").click();
  await page.getByRole("textbox", { name: "משימה חדשה בפרויקט פרויקט משימות" }).fill("בדיקת משימות ב־Windows");
  await page.getByRole("button", { name: "הוספת משימה לפרויקט פרויקט משימות" }).click();
  await page.getByRole("checkbox", { name: "בדיקת משימות ב־Windows" }).check();
  await expect(page.locator("summary")).toContainText("1 מתוך 1 הושלמו");
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await page.getByRole("button", { name: "פרויקטים", exact: true }).click();
  await page.locator("summary").click();
  await expect(page.getByRole("checkbox", { name: "בדיקת משימות ב־Windows" })).toBeChecked();
  await page.screenshot({ path: "../windows-checklist.png" });
  await page.getByRole("button", { name: "גיבוי והגדרות", exact: true }).click();
  await app.evaluate(({ session }, file) => session.defaultSession.once("will-download", (_event, item) => item.setSavePath(file)), backupFile);
  await page.getByRole("button", { name: "ייצוא גיבוי מלא", exact: true }).click();
  await expect.poll(async () => {
    try { return JSON.parse(await fs.readFile(backupFile, "utf8")).tasks?.length; } catch { return 0; }
  }).toBe(1);
  const exported = JSON.parse(await fs.readFile(backupFile, "utf8"));
  expect(exported.tasks[0].completed).toBe(true);
  await page.locator("input[type=file]").setInputFiles(backupFile);
  await page.getByRole("button", { name: "ייבוא ומיזוג", exact: true }).click();
  await expect(page.locator(".import-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "פרויקטים", exact: true }).click();
  await page.locator("summary").click();
  await expect(page.getByRole("checkbox")).toHaveCount(1);
  console.log(JSON.stringify({ passed: true, packaged: Boolean(process.env.BOU_TEST_EXE), checks: ["legacy backup", "add task", "completion", "restart persistence", "native backup download", "idempotent import"] }));
} finally { if (app) await app.close(); }
