import { defineConfig } from "vite";
import { readdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
export default defineConfig({
  plugins: [
    {
      name: "bou-offline",
      apply: "build",
      closeBundle() {
        const files = (dir, prefix = "") =>
          readdirSync(dir, { withFileTypes: true }).flatMap((x) =>
            x.isDirectory()
              ? files(join(dir, x.name), prefix + x.name + "/")
              : [prefix + x.name],
          );
        const assets = files("dist").filter((x) => x !== "sw.js");
        const hash = createHash("sha256");
        for (const a of assets) hash.update(readFileSync(join("dist", a)));
        const cache = "bou-shell-" + hash.digest("hex").slice(0, 12);
        writeFileSync(
          "dist/sw.js",
          `const CACHE=${JSON.stringify(cache)};const ASSETS=${JSON.stringify(["/", ...assets.map((a) => "/" + a)])};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('bou-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('/'))));return;}e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request))||fetch(e.request)));});`,
        );
      },
    },
  ],
});
