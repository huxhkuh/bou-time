import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const version = JSON.parse(await fs.readFile('package.json', 'utf8')).version;
const base = 'https://github.com/huxhkuh/tmora/releases';
const directory = '../windows/';
const setup = `Bou-Time-${version}-x64-Setup.exe`;
const expected = ['Temura-Install.exe', 'Bou-Install.exe', setup, `Bou-Time-${version}-x64-Portable.exe`, `${setup}.blockmap`, 'latest.yml', 'windows-release.json'];
const sums = await fs.readFile(directory + 'SHA256SUMS.txt', 'utf8');
const entries = sums.trim().split(/\r?\n/).map(line => line.split('  '));
assert.deepEqual(entries.map(([, name]) => name), expected);
const digest = (bytes, algorithm='sha256', encoding='hex') => createHash(algorithm).update(bytes).digest(encoding);
for (const [hash, name] of entries) assert.equal(digest(await fs.readFile(directory + name)), hash, name);
const bytes = await fs.readFile(directory + setup);
const manifest = JSON.parse(await fs.readFile(directory + 'windows-release.json', 'utf8'));
assert.equal(manifest.version, version);
assert.equal(manifest.url, `https://github.com/huxhkuh/bou-time/releases/download/v${version}/${setup}`);
assert.equal(manifest.size, bytes.length);
assert.equal(manifest.sha256, digest(bytes));
const yaml = await fs.readFile(directory + 'latest.yml', 'utf8');
assert.equal(yaml.match(/^version: (.+)$/m)[1], version);
assert.equal(yaml.match(/^path: (.+)$/m)[1], setup);
assert.equal(Number(yaml.match(/size: (\d+)/)[1]), bytes.length);
for (const [, hash] of yaml.matchAll(/sha512: (.+)/g)) assert.equal(hash, digest(bytes, 'sha512', 'base64'));
assert.equal(digest(await fs.readFile(directory+'Temura-Install.exe')), digest(await fs.readFile(directory+'Bou-Install.exe')));
if (process.argv.includes('--public')) {
  for (const name of [...expected, 'SHA256SUMS.txt']) {
    const response = await fetch(`${base}/download/v${version}/${name}`, { signal: AbortSignal.timeout(180000) });
    assert.equal(response.status, 200, name);
    const hash = createHash('sha256'); let size=0;
    for await (const chunk of response.body) { hash.update(chunk); size += chunk.length; }
    const local = await fs.readFile(directory+name);
    assert.equal(size, local.length, name);
    assert.equal(hash.digest('hex'), digest(local), name);
    console.log(`Public download verified: ${name} (${size} bytes)`);
  }
  const oldManifest = await fetch('https://github.com/huxhkuh/bou-time/releases/latest/download/windows-release.json');
  assert.equal(oldManifest.status, 200);
  assert.deepEqual(await oldManifest.json(), manifest);
  const oldPayload = await fetch(manifest.url, { headers: { Range:'bytes=0-0' } });
  assert.equal(oldPayload.status, 206);
  assert.equal((await oldPayload.arrayBuffer()).byteLength, 1);
  console.log('Historical manifest and payload redirects verified');
}
console.log(JSON.stringify({ passed:true, version, checks:['all eight assets', 'SHA256', 'YAML SHA512 and size', 'stable identity filenames', 'intentional historical manifest URL', 'bootstrapper alias parity'] }));
