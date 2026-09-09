import { _electron as electron, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const profile=await fs.mkdtemp(path.resolve('../../work/deletion-desktop-'));
const exe=(await fs.readFile('../../work/security-test-exe.txt','utf8')).trim();
const read=page=>page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('bou-personal-time-v1');r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('main');q.onsuccess=()=>{db.close();resolve(q.result)};};}));
const button=(scope,name)=>scope.getByRole('button',{name,exact:true});
let app;
try {
 app=await electron.launch({executablePath:exe,args:[],env:{...process.env,ELECTRON_RUN_AS_NODE:undefined,BOU_DESKTOP_TEST:'1',BOU_TEST_PROFILE:profile}});
 const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const seed={version:1,revision:0,timer:null,clients:[{id:'c',name:'Delete client'},{id:'keep',name:'Keep client'}],projects:['p','q','keep'].map(id=>({id,name:id,clientId:id==='keep'?'keep':'c',color:'#b94f2a',description:'',archived:id==='q',priceType:'hourly',price:100,goal:null})),tasks:['p','q','keep'].map(id=>({id:'t'+id,projectId:id,title:'Task',completed:false})),entries:['p','q','keep'].map(id=>({id:'e'+id,projectId:id,description:'Entry',createdAt:1000,pricing:{type:'hourly',amount:100},segments:[{start:1000,end:3601000}]}))};
 await button(page,'גיבוי והגדרות').click();await page.locator('input[type=file]').setInputFiles({name:'seed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed))});await button(page,'ייבוא ומיזוג').click();await expect(page.locator('.import-preview')).toHaveCount(0);
 await button(page,'צג צף').click();await expect.poll(()=>app.windows().length).toBe(2);const child=app.windows().find(p=>p!==page);
 await expect(button(child,'עבודה על p')).toBeVisible();
 await button(page,'פרויקטים').click();await button(page,'מחיקת פרויקט p').click();await page.getByLabel('הקלד את השם לאישור המחיקה').fill('p');await button(page.getByRole('dialog'),'מחיקה לצמיתות').click();await expect(button(child,'עבודה על p')).toHaveCount(0);await expect(button(child,'עבודה על keep')).toBeVisible();
 await button(page,'לקוחות').click();await button(page,'מחיקת לקוח Delete client').click();await expect(page.getByRole('dialog')).toContainText('פרויקטים: 1');await page.getByLabel('הקלד את השם לאישור המחיקה').fill('Delete client');await button(page.getByRole('dialog'),'מחיקה לצמיתות').click();await expect(page.getByRole('dialog')).toHaveCount(0);
 const after=await read(page);expect(after.clients.map(c=>c.id)).toEqual(['keep']);expect(after.projects.map(p=>p.id)).toEqual(['keep']);expect(after.tasks.map(t=>t.id)).toEqual(['tkeep']);expect(after.entries.map(e=>e.id)).toEqual(['ekeep']);
 await page.screenshot({path:path.join(profile,'deleted.png')});await app.close();app=null;
 app=await electron.launch({executablePath:exe,args:[],env:{...process.env,ELECTRON_RUN_AS_NODE:undefined,BOU_DESKTOP_TEST:'1',BOU_TEST_PROFILE:profile}});const reopened=await app.firstWindow();await expect(button(reopened,'היום')).toBeVisible();expect(await read(reopened)).toEqual(after);expect(errors).toEqual([]);
 console.log(JSON.stringify({passed:true,version:await app.evaluate(({app})=>app.getVersion()),checks:['project/client cascade','archived project cascade','floating window sync','unrelated data preserved','native restart persistence'],profile}));
}finally{if(app)await app.close();}
