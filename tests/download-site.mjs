import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

// SITE_URL can point at the deployed Pages site. Otherwise serve docs locally.
const root = path.resolve('docs');
const output = path.resolve('work/download-site-qa');
await fs.mkdir(output, { recursive: true });
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png', '.gif':'image/gif', '.woff2':'font/woff2', '.txt':'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) throw Error('Invalid path');
    const bytes = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
if (!process.env.SITE_URL) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = (process.env.SITE_URL || `http://127.0.0.1:${server.address().port}/`).replace(/\/?$/, '/');
const browser = await chromium.launch({ channel: 'chrome' });
const failures = [];
try {
  const context = await browser.newContext({ viewport: { width:1440, height:1000 }, reducedMotion:'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  for (const lang of ['he', 'en']) {
    const file = lang === 'he' ? 'index.html' : 'en.html';
    await page.goto(base + file);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('html')).toHaveAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const image of document.images) { image.loading = 'eager'; await image.decode(); }
    });
    assert(await page.evaluate(() => document.fonts.check('600 48px Frank')));
    await expect(page.locator('h1')).toHaveCount(1);
    assert.equal(await page.locator('a.button[href$="/Temura-Install.exe"]').count(), 2);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height:900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow: ${lang} at ${width}`);
      for (const button of await page.locator('.button').all()) {
        const rect = await button.boundingBox();
        assert(rect.x >= 0 && rect.x + rect.width <= width + 1, `Download clipped: ${lang}/${width}`);
      }
      if ([1440,390].includes(width)) {
        await page.screenshot({ path:path.join(output, `${lang}-${width}-full.png`), fullPage:true });
        await page.screenshot({ path:path.join(output, `${lang}-${width}-hero.png`) });
      }
    }
    await page.setViewportSize({ width:1440, height:1000 });
    await expect(page.locator('.demo-panel:not([hidden]) img')).toHaveAttribute('src', /-poster\.png$/);
    await page.locator('#tab-timer').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#tab-floating')).toBeFocused();
    await expect(page.locator('#panel-floating')).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.locator('#tab-tasks')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('#tab-timer')).toBeFocused();
    for (const type of ['timer','floating','tasks']) {
      await page.locator(`#tab-${type}`).click();
      const panel = page.locator(`#panel-${type}`);
      const play = panel.locator('.play-button');
      await play.click();
      await expect(play).toHaveAttribute('aria-pressed','true');
      await expect(panel.locator('img')).toHaveAttribute('src',new RegExp(`${type}-${lang}\\.gif$`));
      await expect.poll(() => panel.locator('img').evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
      await panel.screenshot({ path:path.join(output,`${lang}-${type}.png`) });
      if (type === 'timer') await expect(play).toHaveAttribute('aria-pressed','false',{timeout:12000});
      else await play.click();
      await expect(play).toHaveAttribute('aria-pressed','false');
      await expect(panel.locator('img')).toHaveAttribute('src',/-poster\.png$/);
    }
    await page.locator('#panel-tasks .play-button').click();
    await page.locator('#tab-floating').click();
    await expect(page.locator('#panel-tasks .play-button')).toHaveAttribute('aria-pressed','false');
    const summary = page.locator('.faq summary').first();
    await summary.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.faq details').first()).toHaveAttribute('open','');
    await page.locator('.language').click();
    await expect(page.locator('html')).toHaveAttribute('lang',lang === 'he' ? 'en' : 'he');
    console.log(`PASS ${lang}: responsive 320–1440, assets, language, keyboard, demo playback/stop, FAQ`);
  }
  // Network failure is recoverable and announced; stop the error from being counted twice.
  await page.goto(base + 'index.html');
  await page.route('**/timer-he.gif', route => route.abort());
  await page.locator('#panel-timer .play-button').click();
  await expect(page.locator('.demo-status')).not.toBeEmpty();
  await expect(page.locator('#panel-timer .play-button')).toHaveAttribute('aria-pressed','false');
  await page.unroute('**/timer-he.gif');
  const noJs = await browser.newContext({ javaScriptEnabled:false });
  const staticPage = await noJs.newPage();
  await staticPage.goto(base + 'index.html');
  await staticPage.locator('.language').click();
  await expect(staticPage.locator('html')).toHaveAttribute('lang','en');
  await expect(staticPage.locator('.hero .button')).toHaveAttribute('href', 'https://github.com/huxhkuh/tmora/releases/latest/download/Temura-Install.exe');
  await noJs.close();
  // Validate every local reference, including the lazy GIFs and font license links.
  const references = await page.evaluate(() => [...new Set([...document.querySelectorAll('[href],[src],[data-animation]')].flatMap(el => ['href','src','data-animation'].map(k => el.getAttribute(k))).filter(v => v && !v.startsWith('#') && !/^https?:/.test(v)))]);
  for (const reference of references) {
    const response = await context.request.get(new URL(reference, base).href);
    assert(response.ok(), `Broken reference: ${reference}`);
  }
  assert.deepEqual(failures, []);
  console.log(`PASS static navigation, reduced motion, GIF error recovery, all local links. Screenshots: ${output}`);
} finally { await browser.close(); if (server.listening) await new Promise(resolve => server.close(resolve)); }
