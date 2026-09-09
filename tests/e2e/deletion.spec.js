import {test,expect} from '@playwright/test';
const seed=()=>({version:1,revision:0,timer:null,
 clients:[{id:'c',name:'לקוח למחיקה'},{id:'keep',name:'לקוח נשאר'}],
 projects:['אתר','ארכיון','נשאר'].map((name,i)=>({id:'p'+i,name,clientId:i===2?'keep':'c',color:'#b94f2a',description:'',archived:i===1,priceType:'hourly',price:200,goal:null})),
 tasks:[0,1,2].map(i=>({id:'t'+i,projectId:'p'+i,title:'משימה '+i,completed:false})),
 entries:[0,1,2].map(i=>({id:'e'+i,projectId:'p'+i,description:'עבודה '+i,createdAt:Date.now()-7200000,pricing:{type:'hourly',amount:200},segments:[{start:Date.now()-7200000,end:Date.now()-3600000}]}))});
const read=page=>page.evaluate(()=>new Promise(resolve=>{const q=indexedDB.open('bou-personal-time-v1');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('main');r.onsuccess=()=>{db.close();resolve(r.result)};};}));
async function setup(page){await page.goto('/');await page.getByRole('button',{name:'גיבוי והגדרות',exact:true}).click();await page.locator('input[type=file]').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(seed()))});await page.getByRole('button',{name:'ייבוא ומיזוג',exact:true}).click();await expect(page.locator('.import-preview')).toHaveCount(0);}
const button=(page,name)=>page.getByRole('button',{name,exact:true});
test('delete project then client: explicit consent, cascade, backup, reports, reload, dark mobile English',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 await button(page,'פרויקטים').click();await button(page,'מחיקת פרויקט אתר').click();
 let dialog=page.getByRole('dialog');await expect(dialog).toContainText('רישומי זמן: 1');await expect(dialog).toContainText('משימות: 1');
 await expect(button(dialog,'מחיקה לצמיתות')).toBeDisabled();await page.getByLabel('הקלד את השם לאישור המחיקה').fill('wrong');await expect(button(dialog,'מחיקה לצמיתות')).toBeDisabled();
 await button(dialog,'ביטול').click();expect((await read(page)).projects).toHaveLength(3);
 await button(page,'מחיקת פרויקט אתר').click();await page.getByLabel('הקלד את השם לאישור המחיקה').fill('אתר');await page.screenshot({path:'../../work/delete-project-light.png'});await button(dialog,'מחיקה לצמיתות').click();await expect(dialog).toHaveCount(0);
 let s=await read(page);expect(s.projects.map(p=>p.id)).toEqual(['p1','p2']);expect(s.tasks.map(t=>t.id)).toEqual(['t1','t2']);expect(s.entries.map(e=>e.id)).toEqual(['e1','e2']);expect(s.clients).toHaveLength(2);
 await button(page,'גיבוי והגדרות').click();await page.getByRole('radio',{name:'כהה',exact:true}).check();await page.getByLabel('שפת הממשק',{exact:true}).selectOption('en');await page.setViewportSize({width:390,height:844});
 await button(page,'Clients').click();await button(page,'Delete client לקוח למחיקה').click();
 await expect(dialog).toContainText('Projects: 1');await expect(dialog).toContainText('Time entries: 1');await expect(dialog).toContainText('Tasks: 1');await expect(page.locator('html')).toHaveAttribute('dir','ltr');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Type the name to confirm deletion').fill('לקוח למחיקה');await page.screenshot({path:'../../work/delete-client-dark-mobile.png'});await button(dialog,'Delete permanently').click();await expect(dialog).toHaveCount(0);
 await page.reload();s=await read(page);expect(s.clients.map(c=>c.id)).toEqual(['keep']);expect(s.projects.map(p=>p.id)).toEqual(['p2']);expect(s.tasks.map(t=>t.id)).toEqual(['t2']);expect(s.entries.map(e=>e.id)).toEqual(['e2']);
 await button(page,'Reports').click();await expect(page.locator('main')).not.toContainText('עבודה 0');await expect(page.locator('main')).not.toContainText('עבודה 1');await expect(page.locator('main')).toContainText('עבודה 2');
 await button(page,'Backup & settings').click();const pending=page.waitForEvent('download');await button(page,'Export full backup').click();const dl=await pending;expect(dl.suggestedFilename()).toMatch(/backup.*json/);expect(errors).toEqual([]);
});
test('cross-window stale delete and stale edits cannot remove or resurrect work; running/paused timer blocks',async({page,context})=>{
 await setup(page);const other=await context.newPage();await other.goto('/');
 await button(page,'פרויקטים').click();await button(other,'פרויקטים').click();
 await button(page,'מחיקת פרויקט אתר').click();await page.getByLabel('הקלד את השם לאישור המחיקה').fill('אתר');
 const card=other.locator('.project-card').filter({has:other.getByRole('heading',{name:'אתר',exact:true})});await card.locator('summary').click();await card.getByPlaceholder('משימה חדשה…').fill('נוספה בחלון אחר');await button(card,'הוספת משימה לפרויקט אתר').click();
 await expect(page.getByRole('dialog')).toContainText('הנתונים השתנו');await expect(button(page.getByRole('dialog'),'מחיקה לצמיתות')).toBeDisabled();await page.keyboard.press('Escape');
 await button(other,'עריכת פרויקט אתר').click();await other.getByLabel('שם הפרויקט',{exact:true}).fill('לא להחזיר');
 await button(page,'מחיקת פרויקט אתר').click();await page.getByLabel('הקלד את השם לאישור המחיקה').fill('אתר');await button(page.getByRole('dialog'),'מחיקה לצמיתות').click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await button(other.getByRole('dialog'),'שמירה').click();await expect(other.getByRole('alert')).toContainText('הרשומה עודכנה');expect((await read(page)).projects.some(p=>p.id==='p0')).toBe(false);await other.keyboard.press('Escape');
 await button(page,'היום').click();await button(page,'התחל מדידה').click();await button(page,'השהיה').click();
 await button(page,'לקוחות').click();await button(page,'מחיקת לקוח לקוח נשאר').click();await expect(page.getByRole('dialog')).toContainText('יש לעצור ולשמור');await expect(button(page.getByRole('dialog'),'מחיקה לצמיתות')).toBeDisabled();await page.keyboard.press('Escape');
 await button(page,'היום').click();await button(page,'המשך').click();await button(page,'פרויקטים').click();await button(page,'מחיקת פרויקט נשאר').click();await expect(page.getByRole('dialog')).toContainText('יש לעצור ולשמור');expect((await read(page)).timer.projectId).toBe('p2');
});
