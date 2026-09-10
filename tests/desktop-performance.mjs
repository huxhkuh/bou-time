import { _electron as electron, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const label=process.env.PERF_LABEL||'sample';
const profile=await fs.mkdtemp(path.resolve('../../work/performance-'));
const exe=process.env.BOU_TEST_EXE || (await fs.readFile('../../work/security-test-exe.txt','utf8')).trim();
const app=await electron.launch({executablePath:exe,args:[],env:{...process.env,ELECTRON_RUN_AS_NODE:undefined,BOU_DESKTOP_TEST:'1',BOU_TEST_PROFILE:profile}});
const result={label,exe,profile,stages:[]};
try{
 const p=await app.firstWindow();await expect(p.getByRole('button',{name:'גיבוי והגדרות',exact:true})).toBeVisible();
 const capture=async(name)=>{
  const cdps=await Promise.all(app.windows().map(async w=>{const c=await w.context().newCDPSession(w);await c.send('Performance.enable');return c;}));
  const before=await Promise.all(cdps.map(c=>c.send('Performance.getMetrics')));
  const samples=[];
  for(let i=0;i<5;i++){
   await new Promise(r=>setTimeout(r,1000));
   samples.push(await app.evaluate(({app})=>app.getAppMetrics().map(({pid,type,memory,cpu})=>({pid,type,memory,cpu}))));
  }
  const after=await Promise.all(cdps.map(c=>c.send('Performance.getMetrics')));
  const val=(x,k)=>x.metrics.find(m=>m.name===k)?.value||0;
  const stage={name,samples,renderer:after.map((a,i)=>({heapMiB:val(a,'JSHeapUsedSize')/1048576,taskSeconds:val(a,'TaskDuration')-val(before[i],'TaskDuration'),scriptSeconds:val(a,'ScriptDuration')-val(before[i],'ScriptDuration')}))};
  if (process.env.BOU_PERF_PYTHON) {
   stage.physicalMemory = JSON.parse(execFileSync(process.env.BOU_PERF_PYTHON,
    ['scripts/windows-memory.py', ...samples.at(-1).map(m=>String(m.pid))], { encoding:'utf8', windowsHide:true }));
   stage.uniquePhysicalMiB = stage.physicalMemory.reduce((n,p)=>n+p.uss,0)/1048576;
   console.log('Unique physical RAM (MiB)', stage.uniquePhysicalMiB);
  }
  result.stages.push(stage);
  console.log(name,JSON.stringify({privateMiB:samples.map(s=>s.reduce((n,m)=>n+(m.memory.privateBytes||0),0)/1024),workingMiB:samples.map(s=>s.reduce((n,m)=>n+m.memory.workingSetSize,0)/1024),renderer:stage.renderer}));
  for(const c of cdps)await c.detach();
 };
 await capture('empty-idle');
 const now=Date.now(),H=3600000;
 const data={version:1,revision:0,clients:[{id:'c',name:'Performance fixture'}],projects:[0,1,2,3].map(i=>({id:'p'+i,clientId:'c',name:'Project '+i,description:'',color:'#b94f2a',archived:false,priceType:'hourly',price:250,goal:100})),entries:Array.from({length:1000},(_,i)=>({id:'e'+i,projectId:'p'+(i%4),description:'Measured fixture '+i,createdAt:now-(i+1)*8*H,pricing:{type:'hourly',amount:250},segments:[{start:now-(i+1)*8*H,end:now-(i+1)*8*H+H}]})),tasks:[],timer:null};
 await p.getByRole('button',{name:'גיבוי והגדרות',exact:true}).click();await p.locator('input[type=file]').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await p.getByRole('button',{name:'ייבוא ומיזוג',exact:true}).click();await expect(p.locator('.import-preview')).toHaveCount(0);await p.getByRole('button',{name:'היום',exact:true}).click();
 await capture('1000-entries-idle');
 await p.getByRole('button',{name:'התחל Project 0',exact:true}).click();
 await capture('1000-entries-running');
 await p.getByRole('button',{name:'צג צף',exact:true}).click();await expect.poll(()=>app.windows().length).toBe(2);
 await capture('1000-entries-floating');
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>!w.webContents.getURL().includes('floating=1')).minimize());
 await capture('main-minimized-floating');
}finally{await fs.mkdir('work/performance',{recursive:true});await fs.writeFile(`work/performance/${label}.json`,JSON.stringify(result,null,2));await app.close();}
