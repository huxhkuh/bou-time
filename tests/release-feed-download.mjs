// Download-only public-feed check using the production ASAR and an isolated
// profile. Simulate an older updater version; never install or alter the feed.
import { _electron as electron, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const profile = await fs.mkdtemp(path.resolve('../../work/range-feed-'));
const exe = (await fs.readFile('../../work/security-test-exe.txt','utf8')).trim();
const target = process.env.BOU_FEED_EXPECTED_VERSION;
if (!/^\d+\.\d+\.\d+$/.test(target || '')) throw Error('Set BOU_FEED_EXPECTED_VERSION to the actual public release');
let app;
try {
  app = await electron.launch({executablePath:exe,args:[],env:{...process.env,ELECTRON_RUN_AS_NODE:undefined,BOU_DESKTOP_TEST:'1',BOU_TEST_PROFILE:profile}});
  const page = await app.firstWindow();
  await app.evaluate(({app})=>{
    const load=process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json');
    const u=load('electron-updater').autoUpdater;
    u.currentVersion=new (load('semver').SemVer)('1.4.0');
    globalThis.rangeRejected=false;
    u.logger={info(){},warn(){},debug(){},error(message){if(String(message).includes('Invalid partial download response'))globalThis.rangeRejected=true;}};
  });
  await page.getByRole('button',{name:'גיבוי והגדרות',exact:true}).click();
  const section=page.locator('.desktop-updates');
  await section.getByRole('button',{name:'בדיקת עדכונים',exact:true}).click();
  await expect(section).toContainText('גרסה חדשה מחכה לך',{timeout:90000});
  expect((await page.evaluate(()=>window.bouDesktop.getUpdateStatus())).version).toBe(target);
  await section.getByRole('button',{name:'הורדת העדכון',exact:true}).click();
  await expect(section).toContainText('העדכון מוכן להתקנה',{timeout:300000});
  const payload=await app.evaluate(({app})=>process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json')('electron-updater').autoUpdater.installerPath);
  const hash=async file=>createHash('sha512').update(await fs.readFile(file)).digest('hex');
  expect(await hash(payload)).toBe(await hash(`../windows/Bou-Time-${target}-x64-Setup.exe`));
  expect(await app.evaluate(()=>globalThis.rangeRejected)).toBe(true);
  const result={passed:true,target,rangeRejected:true,fullDownloadVerified:true,profile};
  await fs.writeFile(path.join(profile,'result.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{if(app)await app.close();}
