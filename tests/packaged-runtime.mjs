import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import asar from '@electron/asar';
const archive = '../windows/win-unpacked/resources/app.asar';
const files = asar.listPackage(archive).map(f => f.replaceAll('\\', '/').replace(/^\//, ''));
for (const dependency of ['react', 'react-dom', 'lucide-react', '@fontsource-variable/heebo', 'scheduler']) {
  assert(!files.some(f => f.startsWith(`node_modules/${dependency}/`)), `Build-only dependency duplicated: ${dependency}`);
}
for (const required of ['desktop/main.cjs', 'desktop/preload.cjs', 'dist/index.html', 'node_modules/electron-updater/package.json', 'THIRD_PARTY_NOTICES.txt']) assert(files.includes(required), `Missing runtime file: ${required}`);
const pkg = JSON.parse(asar.extractFile(archive, 'package.json'));
assert.equal(pkg.name, 'bou-time');
assert.equal(pkg.main, 'desktop/main.cjs');
assert(asar.extractFile(archive, 'desktop/main.cjs').toString().includes('"il.bou.time"'));
await fs.access('../windows/win-unpacked/Bou Time.exe');
assert.deepEqual((await fs.readdir('../windows/win-unpacked/locales')).sort(), ['en-GB.pak','en-US.pak','he.pak']);
assert(files.some(f => f.startsWith('dist/assets/heebo-hebrew')));
assert(files.some(f => f.startsWith('dist/assets/heebo-latin')));
console.log('PASS lean package: runtime updater, compiled UI, both font scripts, supported locales, licenses and stable app identity');
