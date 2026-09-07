import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const { createUpdates } = createRequire(import.meta.url)("../desktop/updates.cjs");
const defer = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function setup(extra = {}) {
  const updater = new EventEmitter();
  let checks = 0, downloads = 0, installs = 0;
  const token = { cancelled: false, cancel() { this.cancelled = true; } };
  Object.assign(updater, {
    checkForUpdates: async () => { checks++; return { isUpdateAvailable: true, updateInfo: { version: "1.5.0" }, cancellationToken: token }; },
    downloadUpdate: async () => { downloads++; },
    quitAndInstall: (silent, restart) => { assert.equal(silent, true); assert.equal(restart, true); installs++; },
  }, extra);
  const history = [];
  const controller = createUpdates({ updater, version: "1.4.0", publish: (s) => history.push(s), confirmInstall: async () => true });
  return { controller, updater, token, history, calls: () => ({ checks, downloads, installs }) };
}
test("updates require an explicit check, download and confirmed install; ordinary exit never installs", async () => {
  const { controller: c, updater: u, calls } = setup();
  assert.equal(u.autoDownload, false);
  assert.equal(u.autoInstallOnAppQuit, false);
  assert.equal(u.allowDowngrade, false);
  assert.equal(u.allowPrerelease, false);
  assert.equal(u.disableDifferentialDownload, false);
  await c.action("install"); await c.action("download");
  assert.deepEqual(calls(), { checks: 0, downloads: 0, installs: 0 });
  assert.equal((await c.action("check")).phase, "available");
  assert.equal((await c.action("download")).phase, "ready");
  await c.action("install"); await c.action("install");
  assert.deepEqual(calls(), { checks: 1, downloads: 1, installs: 1 });
});
test("parallel checks/downloads cannot launch duplicate work, progress is sanitized", async () => {
  const gate = defer();
  let downloads = 0;
  const { controller: c, updater: u } = setup({ downloadUpdate: () => { downloads++; return gate.promise; } });
  await Promise.all([c.action("check"), c.action("check")]);
  const first = c.action("download");
  await c.action("download"); await c.action("check");
  u.emit("download-progress", { percent: Infinity, transferred: -10, total: 50 });
  assert.equal(c.snapshot().percent, 0);
  assert.equal(c.snapshot().transferred, 0);
  gate.resolve(); await first;
  assert.equal(downloads, 1); assert.equal(c.snapshot().phase, "ready");
});
test("cancellation waits for download to settle and allows a new check", async () => {
  const gate = defer();
  const { controller: c, token } = setup({ downloadUpdate: () => gate.promise });
  await c.action("check"); const first = c.action("download");
  await c.action("cancel"); assert.equal(token.cancelled, true);
  assert.equal((await c.action("check")).phase, "cancelling");
  gate.reject(Error("cancelled")); await first;
  assert.equal(c.snapshot().phase, "cancelled");
  assert.equal((await c.action("check")).phase, "available");
});
test("failed download is never installable, errors do not disclose paths or remote contents", async () => {
  const { controller: c, calls } = setup({ downloadUpdate: async () => { throw Error("secret /private/path"); } });
  await c.action("check"); await c.action("download"); await c.action("install");
  assert.equal(c.snapshot().phase, "error");
  assert.doesNotMatch(JSON.stringify(c.snapshot()), /secret|private/);
  assert.equal(calls().installs, 0);
});
test("declining restart keeps the downloaded update ready; invalid actions and portable builds do nothing", async () => {
  const u = new EventEmitter(); let installs = 0;
  u.checkForUpdates = async () => ({ isUpdateAvailable: true, updateInfo: { version: "2.0.0" } });
  u.downloadUpdate = async () => [];
  u.quitAndInstall = () => installs++;
  const c = createUpdates({ updater: u, version: "1.4.0", publish() {}, confirmInstall: async () => false });
  await c.action("check"); await c.action("download"); await c.action("install");
  await c.action("https://evil.invalid");
  assert.equal(c.snapshot().phase, "ready"); assert.equal(installs, 0);
  const disabled = createUpdates({ updater: null, version: "1.4.0", unavailable: "portable", publish() {} });
  assert.equal((await disabled.action("check")).phase, "unavailable");
});
test("no update available and network errors are recoverable", async () => {
  const { controller: c, updater: u } = setup({ checkForUpdates: async () => { throw Error("offline"); } });
  assert.equal((await c.action("check")).phase, "error");
  u.checkForUpdates = async () => ({ isUpdateAvailable: false });
  assert.equal((await c.action("check")).phase, "current");
});
