const path = require("node:path");
const { open, lstat } = require("node:fs/promises");
const { createHash, timingSafeEqual } = require("node:crypto");

function appURL(value) {
  try {
    const u = new URL(value);
    return u.protocol === "bou:" && u.host === "app" && !u.username && !u.password &&
      (u.pathname === "/" || u.pathname === "/index.html");
  } catch { return false; }
}

function updateIdentity(info) {
  if (!info || !/^\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(info.version) || !Array.isArray(info.files) || info.files.length !== 1)
    throw Error("Invalid update metadata");
  const file = info.files[0];
  const name = `Bou-Time-${info.version}-x64-Setup.exe`;
  if (!file || file.url !== name || info.path !== name ||
      (info.tag !== undefined && info.tag !== `v${info.version}`) ||
      !Number.isSafeInteger(file.size) || file.size < 1048576 || file.size > 1073741824 ||
      typeof file.sha512 !== "string" || !/^[A-Za-z0-9+/]{86}==$/.test(file.sha512) ||
      Buffer.from(file.sha512, "base64").length !== 64 || info.sha512 !== file.sha512)
    throw Error("Invalid update payload");
  return Object.freeze({ version: info.version, size: file.size, sha512: file.sha512 });
}

// The download may have sat in a writable cache while the user kept working.
// Recheck against the metadata captured during the check, not a mutable cache JSON.
async function verifyInstaller(file, expected) {
  if (!expected || typeof file !== "string" || !path.isAbsolute(file) || path.extname(file).toLowerCase() !== ".exe")
    throw Error("Invalid installer path");
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== expected.size) throw Error("Installer changed");
  const handle = await open(file, "r");
  try {
    const before = await handle.stat();
    const hash = createHash("sha512");
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    const after = await handle.stat();
    const current = await lstat(file);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || current.isSymbolicLink() ||
        current.ino !== before.ino || current.size !== expected.size ||
        !timingSafeEqual(hash.digest(), Buffer.from(expected.sha512, "base64"))) throw Error("Installer changed");
  } finally { await handle.close(); }
}
module.exports = { appURL, updateIdentity, verifyInstaller };
