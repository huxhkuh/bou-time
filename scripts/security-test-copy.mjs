// Never modify the release EXE. This copy enables only the Node inspector needed
// by Playwright; source, ASAR integrity and the other production fuses stay intact.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { getCurrentFuseWire, flipFuses, FuseVersion, FuseV1Options } from "@electron/fuses";
const source = path.resolve("../windows/win-unpacked");
const original = path.join(source, "Bou Time.exe");
const wire = await getCurrentFuseWire(original);
for (const option of [FuseV1Options.RunAsNode, FuseV1Options.EnableNodeOptionsEnvironmentVariable, FuseV1Options.EnableNodeCliInspectArguments, FuseV1Options.GrantFileProtocolExtraPrivileges]) assert.equal(wire[option], 48);
for (const option of [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FuseV1Options.OnlyLoadAppFromAsar]) assert.equal(wire[option], 49);
const target = await fs.mkdtemp(path.resolve("../../work/security-instrumented-"));
await fs.cp(source, target, { recursive: true });
const exe = path.join(target, "Bou Time.exe");
await flipFuses(exe, { version: FuseVersion.V1, [FuseV1Options.EnableNodeCliInspectArguments]: true });
await fs.writeFile("../../work/security-test-exe.txt", exe);
console.log(JSON.stringify({ productionFusesVerified: true, testExe: exe, onlyTestDifference: "Node CLI inspector enabled" }));
