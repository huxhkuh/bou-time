// Builds two local-only installers with a distinct identity. Never publish these.
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { build, Platform } from "electron-builder";
const root = await fs.mkdtemp(path.resolve("../../work/update-qa-"));
const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
const name = `temura-update-qa-${path.basename(root).toLowerCase()}`;
const guid = randomUUID();
const profile = path.join(root, "profile");
const entry = path.join(root, "qa-entry.cjs");
await fs.writeFile(entry, `process.env.BOU_DESKTOP_TEST = "1";\nprocess.env.BOU_TEST_PROFILE = ${JSON.stringify(profile)};\nrequire("./desktop/main.cjs");\n`);
for (const version of ["9.0.0", "9.0.1"]) {
  const config = structuredClone(pkg.build);
  Object.assign(config, {
    extends: null, appId: `il.temura.${name}`, productName: "Temura Update QA", executableName: "Temura Update QA",
    npmRebuild: false, electronDist: "node_modules/electron/dist", extraMetadata: { name, version, main: "qa-entry.cjs" },
    files: [...config.files, { from: root, to: ".", filter: ["qa-entry.cjs"] }],
    publish: [{ provider: "generic", url: "http://127.0.0.1:9/" }],
    directories: { output: path.join(root, version) },
    nsis: { ...config.nsis, guid, createDesktopShortcut: false, createStartMenuShortcut: false, shortcutName: "Temura Update QA", artifactName: "QA-${version}-x64-Setup.exe" },
  });
  const configPath = path.join(root, `builder-${version}.json`);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  await build({ targets: Platform.WINDOWS.createTarget(["nsis"]), config: configPath, publish: "never" });
}
await fs.writeFile(path.join(root, "qa.json"), JSON.stringify({ root, name, guid, profile, cache: path.join(process.env.LOCALAPPDATA, `${name}-updater`) }, null, 2));
await fs.writeFile("../../work/latest-update-qa.txt", root);
console.log(`QA_BUILD_READY ${root}`);
