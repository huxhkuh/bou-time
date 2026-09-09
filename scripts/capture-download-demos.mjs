import { _electron as electron, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
const dest=path.resolve('docs/assets/demos');await fs.mkdir(dest,{recursive:true});
const temp=path.resolve('work/site-frames');await fs.mkdir(temp,{recursive:true});
const exe=(await fs.readFile('../../work/security-test-exe.txt','utf8')).trim();
const b=(p,n)=>p.getByRole('button',{name:n,exact:true});
for(const lang of ['he','en']){
 const profile=await fs.mkdtemp(path.resolve('../../work/site-demo-'));let app;
 try{
 app=await electron.launch({executablePath:exe,args:[],env:{...process.env,ELECTRON_RUN_AS_NODE:undefined,BOU_DESKTOP_TEST:'1',BOU_TEST_PROFILE:profile}});
 const p=await app.firstWindow();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1280,900));
 const names=lang==='he'?['אתר חדש','מיתוג הסטודיו']:['New website','Studio branding'];
 const now=Date.now(),H=3600000;
 const data={version:1,revision:0,clients:[{id:'c',name:lang==='he'?'סטודיו נווה':'Neve Studio'}],projects:names.map((name,i)=>({id:'p'+i,clientId:'c',name,color:i?'#6a8463':'#b94f2a',description:lang==='he'?'מהרעיון הראשון ועד ההשקה':'From the first idea to launch',archived:false,priceType:'hourly',price:250,goal:20})),tasks:[{id:'t1',projectId:'p0',title:lang==='he'?'אפיון עמוד הבית':'Plan the homepage',completed:true},{id:'t2',projectId:'p0',title:lang==='he'?'עיצוב המסכים':'Design the screens',completed:false}],entries:[{id:'e1',projectId:'p0',description:lang==='he'?'אפיון ומבנה האתר':'Website structure',createdAt:now-3*H,pricing:{type:'hourly',amount:250},segments:[{start:now-3*H,end:now-1.5*H}]},{id:'e2',projectId:'p1',description:lang==='he'?'כיוונים לשפה הגרפית':'Visual direction',createdAt:now-1.3*H,pricing:{type:'hourly',amount:250},segments:[{start:now-1.3*H,end:now-.3*H}]}],timer:null};
 await b(p,'גיבוי והגדרות').click();await p.locator('input[type=file]').setInputFiles({name:'example.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await b(p,'ייבוא ומיזוג').click();await expect(p.locator('.import-preview')).toHaveCount(0);
 if(lang==='en')await p.getByLabel('שפת הממשק',{exact:true}).selectOption('en');
 const t=(he,en)=>lang==='he'?he:en;
 await b(p,t('היום','Today')).click();await p.evaluate(()=>document.fonts.ready);await b(p,t('פרויקטים','Projects')).click();await p.locator('.project-card').first().locator('summary').click();await p.screenshot({path:path.join(dest,`overview-${lang}.png`)});await b(p,t('היום','Today')).click();
 await b(p,t('מצב מיקוד','Focus mode')).click();const focus=p.locator('.focus-clock');await expect(focus).toBeVisible();
 const make=async(type,locator)=>{const folder=path.join(temp,`${type}-${lang}`);await fs.mkdir(folder,{recursive:true});let i=0;return async(n=1)=>{for(let j=0;j<n;j++){await locator.screenshot({path:path.join(folder,`${String(i++).padStart(3,'0')}.png`)});await new Promise(r=>setTimeout(r,350));}}};
 const timer=await make('timer',focus);await timer(2);await b(focus,t('התחל מדידה','Start timer')).click();await timer(4);await b(focus,t('השהיה','Pause')).click();await timer(3);await b(focus,t('המשך','Resume')).click();await timer(3);await b(focus,t('עצירה ושמירה','Stop & save')).click();await timer(2);await p.keyboard.press('Escape');
 await b(p,t('צג צף','Floating timer')).click();await expect.poll(()=>app.windows().length).toBe(2);const child=app.windows().find(x=>x!==p);await child.evaluate(()=>document.fonts.ready);await b(child,t('מעבר לצג כהה','Switch to dark display')).click();
 const floating=await make('floating',child.locator('.compact-clock'));await floating(2);await b(child,t('עבודה על {0}','Work on {0}').replace('{0}',names[0])).click();await floating(4);await b(child,t('עבודה על {0}','Work on {0}').replace('{0}',names[1])).click();await floating(4);await b(child,t('השהיה','Pause')).click();await floating(2);await b(child,t('עצירה ושמירה','Stop & save')).click();await floating(2);await child.screenshot({path:path.join(dest,`floating-${lang}-hero.png`)});await b(child,t('סגירת הצג הצף','Close floating timer')).click();
 await b(p,t('גיבוי והגדרות','Backup & settings')).click();await p.getByRole('radio',{name:t('בהיר','Light'),exact:true}).check();await b(p,t('פרויקטים','Projects')).click();const card=p.locator('.project-card').filter({has:p.getByRole('heading',{name:names[0],exact:true})});await card.locator('summary').click();const tasks=await make('tasks',card.locator('.project-checklist'));await tasks(2);await card.getByRole('checkbox',{name:data.tasks[1].title,exact:true}).check();await tasks(3);await card.getByPlaceholder(t('משימה חדשה…','New task…')).fill(t('בדיקה לפני השקה','Pre-launch review'));await tasks(2);await b(card,t('הוספת משימה לפרויקט {0}','Add task to project {0}').replace('{0}',names[0])).click();await tasks(3);await card.getByRole('checkbox',{name:t('בדיקה לפני השקה','Pre-launch review'),exact:true}).check();await tasks(3);
 console.log('Captured',lang,profile);
 }finally{if(app)await app.close();}
}
