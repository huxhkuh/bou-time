import { _electron as electron, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
const appRoot = path.resolve(process.cwd());
await fs.mkdir(path.resolve("../../work"), { recursive: true });
const profile = await fs.mkdtemp(path.resolve("../../work/desktop-profile-"));
const backup = path.join(profile, "backup.json");
const executable = process.env.BOU_TEST_EXE;
const options = {
  ...(executable
    ? { executablePath: executable, args: [] }
    : { args: [appRoot] }),
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: undefined,
    BOU_DESKTOP_TEST: "1",
    BOU_TEST_PROFILE: profile,
  },
};
const snap = (page) =>
  page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("bou-personal-time-v1");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return new Promise((resolve) => {
      const r = db.transaction("state").objectStore("state").get("main");
      r.onsuccess = () => {
        db.close();
        resolve(r.result);
      };
    });
  });
let app;
try {
  app = await electron.launch(options);
  let page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.getByRole("button", { name: "צור פרויקט ראשון", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => typeof window.require)).toBe("undefined");
  expect(
    await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
          .contextIsolation,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "צור פרויקט ראשון", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "שם הלקוח", exact: true })
    .fill("בדיקת Windows");
  await page.getByRole("button", { name: "שמירה", exact: true }).click();
  await page
    .getByRole("textbox", { name: "שם הפרויקט", exact: true })
    .fill("פרויקט בדיקת דסקטופ");
  await page.getByRole("button", { name: "שמירה", exact: true }).click();
  await page.getByRole("button", { name: "התחל מדידה", exact: true }).click();
  const id = (await snap(page)).timer.id;
  await page.getByRole("button", { name: "צג צף", exact: true }).click();
  await expect.poll(() => app.windows().length).toBe(2);
  let child = app.windows().find((w) => w !== page);
  await expect(
    child.getByRole("button", { name: "עבודה על פרויקט בדיקת דסקטופ" }),
  ).toBeVisible();
  expect(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.webContents.getURL().includes("floating=1"))
        .isAlwaysOnTop(),
    ),
  ).toBe(true);
  await child.getByRole("button", { name: "השהיה", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "המשך", exact: true }),
  ).toBeVisible();
  await child.getByRole("button", { name: "המשך", exact: true }).click();
  await child.screenshot({ path: "../windows-floating.png" });
  await child
    .getByRole("button", { name: "סגירת הצג הצף", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "השהיה", exact: true }),
  ).toBeVisible();
  await app.close();
  app = await electron.launch(options);
  page = await app.firstWindow();
  await expect(
    page.getByRole("button", { name: "השהיה", exact: true }),
  ).toBeVisible();
  expect((await snap(page)).timer.id).toBe(id);
  await page.getByRole("button", { name: "עצירה ושמירה", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "גיבוי והגדרות", exact: true })
    .click();
  await app.evaluate(
    ({ session }, file) =>
      session.defaultSession.once("will-download", (_e, item) =>
        item.setSavePath(file),
      ),
    backup,
  );
  await page
    .getByRole("button", { name: "ייצוא גיבוי מלא", exact: true })
    .click();
  await expect
    .poll(async () => {
      try {
        return JSON.parse(await fs.readFile(backup, "utf8")).entries.length;
      } catch {
        return 0;
      }
    })
    .toBe(1);
  await page.locator("input[type=file]").setInputFiles(backup);
  await page.getByRole("button", { name: "ייבוא ומיזוג", exact: true }).click();
  await expect(
    page.getByText("הגיבוי מוזג בהצלחה. פריטים קיימים לא שוכפלו."),
  ).toBeVisible();
  expect((await snap(page)).entries.length).toBe(1);
  await page.getByRole("button", { name: "היום", exact: true }).click();
  await page.screenshot({ path: "../windows-app.png" });
  expect(errors).toEqual([]);
  console.log(
    JSON.stringify({
      passed: true,
      packaged: await app.evaluate(({ app }) => app.isPackaged),
      profile,
      backup,
      checks: [
        "creation",
        "native always-on-top",
        "pause sync",
        "close float",
        "restart persistence",
        "stop once",
        "backup export",
        "restore idempotence",
        "sandbox",
      ],
    }),
  );
} finally {
  if (app) await app.close();
}
