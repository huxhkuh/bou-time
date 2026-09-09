// Opt-in actual current-user upgrade. Work data always uses a workspace profile.
// seed: run before publishing, against the existing installed app.
// update --install: use that app's real GitHub provider/download/NSIS installer.
// verify: inspect the saved profile using the new instrumented production copy.
import { _electron as electron, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fresh } from '../src/domain.js';
const require = createRequire(import.meta.url);
const asar = require('@electron/asar');
const mode = process.argv[2];
if (!['seed', 'update', 'verify'].includes(mode)) throw Error('Expected seed, update or verify');
if (mode === 'update' && !process.argv.includes('--install')) throw Error('Explicit --install required');
const descriptorPath = path.resolve('../../work/release-upgrade.json');
const installed = path.join(process.env.LOCALAPPDATA, 'Programs', 'Bou Time', 'Bou Time.exe');
const version = JSON.parse(await fs.readFile('package.json', 'utf8')).version;
const d = mode === 'seed'
  ? { profile: await fs.mkdtemp(path.resolve('../../work/release-upgrade-')), installed, target: version }
  : JSON.parse(await fs.readFile(descriptorPath, 'utf8'));
if (!d.profile.startsWith(path.resolve('../../work/release-upgrade-')) || d.installed !== installed || d.target !== version) throw Error('Unexpected QA descriptor');
const actualData = path.join(process.env.APPDATA, 'BouTime');
async function fingerprints(dir, prefix = '') {
  const result = {};
  for (const item of await fs.readdir(dir, { withFileTypes: true }).catch(e => { if(e.code === 'ENOENT') return []; throw e; })) {
    const name = path.join(prefix, item.name), full = path.join(dir, item.name);
    if (item.isDirectory()) Object.assign(result, await fingerprints(full, name));
    else if (item.isFile()) result[name] = createHash('sha256').update(await fs.readFile(full)).digest('hex');
  }
  return result;
}
const personalBefore = await fingerprints(actualData);
const exe = mode === 'verify' ? (await fs.readFile('../../work/security-test-exe.txt', 'utf8')).trim() : installed;
let app;
try {
  app = await electron.launch({ executablePath: exe, args: [], timeout: 30000, env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, BOU_DESKTOP_TEST: '1', BOU_TEST_PROFILE: d.profile } });
  const page = await app.firstWindow();
  const actualVersion = await app.evaluate(({ app }) => app.getVersion());
  const readState = () => page.evaluate(() => new Promise((resolve, reject) => {
    const r = indexedDB.open('bou-personal-time-v1', 1);
    r.onerror = reject;
    r.onsuccess = () => { const db = r.result, get = db.transaction('state').objectStore('state').get('main'); get.onsuccess = () => { db.close(); resolve(get.result); }; get.onerror = reject; };
  }));
  await page.getByRole('button', { name: 'גיבוי והגדרות', exact: true }).click();
  if (mode === 'seed') {
    expect(actualVersion).not.toBe(version);
    d.from = actualVersion;
    const seed = fresh();
    seed.clients = [{ id: 'release-client', name: 'לקוח לשימור / Client' }];
    seed.projects = [{ id: 'release-project', clientId: 'release-client', name: 'פרויקט שדרוג', color: '#b94f2a', description: 'Migration QA', archived: false, priceType: 'hourly', price: 250, goal: 10 }];
    seed.tasks = [{ id: 'release-task', projectId: 'release-project', title: 'משימה שמורה', completed: true }];
    seed.entries = [{ id: 'release-entry', projectId: 'release-project', description: 'שעה שנשמרה לפני השדרוג', createdAt: 1757401200000, pricing: { type: 'hourly', amount: 200 }, segments: [{ start: 1757401200000, end: 1757404800000 }] }];
    await page.locator('input[type=file]').setInputFiles({ name: 'seed.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(seed)) });
    await page.getByRole('button', { name: 'ייבוא ומיזוג', exact: true }).click();
    await expect(page.locator('.import-preview')).toHaveCount(0);
    await page.getByRole('button', { name: 'היום', exact: true }).click();
    await page.getByRole('button', { name: 'התחל מדידה', exact: true }).click();
    await expect(page.getByRole('button', { name: 'השהיה', exact: true })).toBeVisible();
    d.before = await readState();
    expect(d.before.entries).toHaveLength(1);
    expect(d.before.tasks).toHaveLength(1);
    await fs.writeFile(descriptorPath, JSON.stringify(d, null, 2));
  } else if (mode === 'update') {
    expect(actualVersion).toBe(d.from);
    expect(await readState()).toEqual(d.before);
    const section = page.locator('.desktop-updates');
    await section.getByRole('button', { name: 'בדיקת עדכונים', exact: true }).click();
    await expect(section).toContainText('גרסה חדשה מחכה לך', { timeout: 90000 });
    expect((await page.evaluate(() => window.bouDesktop.getUpdateStatus())).version).toBe(version);
    await section.getByRole('button', { name: 'הורדת העדכון', exact: true }).click();
    await expect(section).toContainText('העדכון מוכן להתקנה', { timeout: 240000 });
    const payload = await app.evaluate(({ app }) => process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json')('electron-updater').autoUpdater.installerPath);
    const hash = async file => createHash('sha512').update(await fs.readFile(file)).digest('hex');
    expect(await hash(payload)).toBe(await hash(`../windows/Bou-Time-${version}-x64-Setup.exe`));
    await page.screenshot({ path: path.join(d.profile, 'public-update-ready.png') });
    // Approve the native dialog in this test only. Suppress production auto-relaunch
    // to avoid opening the real personal profile; QA identity tests cover relaunch.
    await app.evaluate(({ app, dialog }) => {
      dialog.showMessageBox = async () => ({ response: 1 });
      const updater = process.getBuiltinModule('module').createRequire(app.getAppPath() + '/package.json')('electron-updater').autoUpdater;
      const original = updater.quitAndInstall.bind(updater);
      updater.quitAndInstall = () => original(true, false);
    });
    await section.getByRole('button', { name: 'התקנה והפעלה מחדש', exact: true }).click();
    await expect.poll(async () => {
      try { asar.uncacheAll(); return JSON.parse(asar.extractFile(path.join(path.dirname(installed), 'resources', 'app.asar'), 'package.json').toString()).version; } catch { return ''; }
    }, { timeout: 120000, intervals: [1000] }).toBe(version);
    d.publicUpdate = { from: actualVersion, to: version, sha512: await hash(payload), installed: true };
    await fs.writeFile(descriptorPath, JSON.stringify(d, null, 2));
  } else {
    expect(actualVersion).toBe(version);
    expect(await readState()).toEqual(d.before);
    if (d.publicUpdate) {
      expect(await fs.readFile(path.join(path.dirname(installed), 'resources', 'app-update.yml'), 'utf8')).toContain('repo: tmora');
      expect(await fs.readFile(path.join(path.dirname(installed), 'resources', 'app.asar'))).toEqual(await fs.readFile('../windows/win-unpacked/resources/app.asar'));
    }
    d.verified = true;
    await fs.writeFile(descriptorPath, JSON.stringify(d, null, 2));
  }
  console.log(JSON.stringify({ mode, from: d.from, to: version, profile: d.profile, passed: true }));
} finally {
  if (app) await app.close().catch(() => {});
  expect(await fingerprints(actualData)).toEqual(personalBefore);
}
