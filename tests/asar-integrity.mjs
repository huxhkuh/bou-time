// Corrupt a disposable COPY of app.asar and require Electron to reject it.
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const target = await fs.mkdtemp(path.resolve("../../work/asar-rejection-"));
await fs.cp(path.resolve("../windows/win-unpacked"), target, { recursive: true });
const archive = path.join(target, "resources/app.asar");
const data = await fs.readFile(archive);
// Alter an integrity hash in the JSON header without changing header length.
const marker = data.indexOf(Buffer.from('"hash":"'));
assert.ok(marker > 0);
data[marker + 8] = data[marker + 8] === 97 ? 98 : 97;
await fs.writeFile(archive, data);
const child = spawn(path.join(target, "Bou Time.exe"), [], { windowsHide: true, env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined, BOU_DESKTOP_TEST: "1", BOU_TEST_PROFILE: path.join(target, "profile") } });
let output = "";
child.stderr.on("data", (chunk) => output += chunk);
let timedOut = false;
const timeout = setTimeout(() => { timedOut = true; child.kill(); }, 15000);
try {
  const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", resolve); });
  assert.notEqual(code, 0);
  assert.equal(timedOut, false);
  assert.match(output, /integrity|hash|asar/i);
  console.log(JSON.stringify({ passed: true, rejectedTamperedArchive: true, code }));
} finally { clearTimeout(timeout); }
