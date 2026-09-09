import { _electron as electron, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
const exe = process.env.BOU_TEST_EXE || (await fs.readFile("../../work/security-test-exe.txt", "utf8")).trim();
const profile = await fs.mkdtemp(path.resolve("../../work/security-profile-"));
let app;
try {
  app = await electron.launch({ executablePath: exe, args: [], env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, BOU_DESKTOP_TEST: "1", BOU_TEST_PROFILE: profile } });
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.getByRole("button", { name: "צור פרויקט ראשון", exact: true })).toBeVisible();
  expect(await page.evaluate(() => typeof window.require)).toBe("undefined");
  expect(await app.evaluate(({ BrowserWindow }) => {
    const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return p.sandbox && p.contextIsolation && !p.nodeIntegration && p.webSecurity;
  })).toBe(true);
  await app.evaluate(({ BrowserWindow }) => {
    globalThis.securityNavigations = [];
    BrowserWindow.getAllWindows()[0].webContents.on("will-frame-navigate", (e) => {
      globalThis.securityNavigations.push({ url: e.url, blocked: e.defaultPrevented });
    });
  });
  // Attempt actual navigation from renderer-controlled links, not loadURL.
  for (const target of ["https://example.invalid/", "file:///C:/Windows/win.ini", "bou://app/assets/index.html"]) {
    await page.evaluate((target) => { const a = document.createElement("a"); a.href = target; a.id = "navigation-probe"; a.textContent = "navigation probe"; document.body.append(a); }, target);
    await page.evaluate(() => document.getElementById("navigation-probe").click());
    expect(page.url()).toBe("bou://app/");
    await page.evaluate(() => document.getElementById("navigation-probe").remove());
  }
  const navigations = await app.evaluate(() => globalThis.securityNavigations);
  expect(navigations.some((n) => n.url === "https://example.invalid/" && n.blocked)).toBe(true);
  expect(navigations.every((n) => n.blocked)).toBe(true);
  // Reset Playwright's pending-navigation bookkeeping after prevented links.
  await page.reload();
  await page.evaluate(() => window.open("https://example.invalid/"));
  expect(app.windows()).toHaveLength(1);
  // Inline scripts and embedded documents are blocked by the real CSP.
  await page.evaluate(() => {
    window.probeExecuted = false; window.probeViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => window.probeViolations.push(e.violatedDirective));
    const script = document.createElement("script"); script.textContent = "window.probeExecuted = true"; document.body.append(script);
    const frame = document.createElement("iframe"); frame.src = "bou://app/"; document.body.append(frame);
  });
  await expect.poll(() => page.evaluate(() => window.probeViolations.length)).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => window.probeExecuted)).toBe(false);
  expect(await page.evaluate(() => window.bouDesktop.updateAction("https://evil.invalid/update.exe").then(() => false, () => true))).toBe(true);
  expect(await page.evaluate(() => window.bouDesktop.setLanguage("bad").then(() => false, () => true))).toBe(true);
  await page.evaluate(() => window.bouDesktop.openFloating());
  await expect.poll(() => app.windows().length).toBe(2);
  const floating = app.windows().find((w) => w !== page);
  await floating.waitForLoadState();
  expect(await floating.evaluate(() => window.bouDesktop.updateAction("install").then(() => false, () => true))).toBe(true);
  expect(await floating.evaluate(() => window.bouDesktop.setLanguage("en").then(() => false, () => true))).toBe(true);
  await floating.evaluate(() => window.bouDesktop.closeFloating());
  // Script-shaped text is still ordinary text when restored from JSON.
  await page.getByRole("button", { name: "גיבוי והגדרות", exact: true }).click();
  const backup = { version: 1, revision: 0, clients: [{ id: "c", name: '<img src=x onerror="window.probeExecuted=true">' }], projects: [], tasks: [], entries: [], timer: null };
  await page.locator("input[type=file]").setInputFiles({ name: "text.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole("button", { name: "ייבוא ומיזוג", exact: true }).click();
  await expect(page.locator(".import-preview")).toHaveCount(0);
  await page.getByRole("button", { name: "לקוחות", exact: true }).click();
  await expect(page.getByText(backup.clients[0].name, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.probeExecuted)).toBe(false);
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ passed: true, checks: ["sandbox and isolation", "external/file/asset navigation blocked", "new windows denied", "inline script and iframe CSP", "invalid IPC and floating update denied", "backup HTML rendered as text"] }));
} finally { if (app) await app.close(); }
