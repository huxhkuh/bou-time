import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, validateBackup, mergeBackup, timerAction } from '../src/domain.js';
import { deletionPreview, deleteEntity } from '../src/deletion.js';
const seed = () => ({ ...fresh(),
 clients: [{id:'c',name:'לקוח'}, {id:'other',name:'אחר'}],
 projects: ['p','archived','keep'].map(id => ({id,name:id,clientId:id==='keep'?'other':'c',archived:id==='archived',color:'#b94f2a',description:'',priceType:'hourly',price:100,goal:null})),
 tasks: ['p','archived','keep'].map(id=>({id:'t'+id,projectId:id,title:'משימה',completed:true})),
 entries: ['p','archived','keep'].map(id=>({id:'e'+id,projectId:id,description:'עבודה',createdAt:1000,pricing:{type:'hourly',amount:100},segments:[{start:1000,end:3601000}]})),
});
test('project deletion removes its history/tasks only, is idempotent and backup can restore',()=>{
 const s=seed(), backup=structuredClone(s), preview=deletionPreview(s,'project','p');
 assert.equal(preview.entries,1);assert.equal(preview.milliseconds,3600000);
 assert.equal(deleteEntity(s,preview,'p'),true);
 assert.deepEqual(s.projects.map(p=>p.id),['archived','keep']);
 assert.deepEqual(s.clients,backup.clients);
 assert.deepEqual(s.tasks.map(t=>t.projectId),['archived','keep']);
 assert.deepEqual(s.entries.map(e=>e.projectId),['archived','keep']);
 assert.equal(deleteEntity(s,preview,'p'),false);
 validateBackup(s);
 mergeBackup(s,validateBackup(backup));
 assert.equal(s.projects.length,3);assert.equal(s.tasks.length,3);assert.equal(s.entries.length,3);
});
test('client deletion includes archived projects and leaves unrelated work and timer intact',()=>{
 const s=seed();timerAction(s,{type:'start',projectId:'keep',expected:null,id:'timer'},5000000);
 const timer=structuredClone(s.timer), preview=deletionPreview(s,'client','c');
 assert.equal(preview.projects,2);assert.equal(preview.tasks,2);assert.equal(preview.entries,2);
 deleteEntity(s,preview,'לקוח');
 assert.deepEqual(s.clients.map(c=>c.id),['other']);assert.deepEqual(s.projects.map(p=>p.id),['keep']);
 assert.deepEqual(s.timer,timer);assert.equal(s.tasks.length,1);assert.equal(s.entries.length,1);
});
test('active and paused timers block deletion, including a timer started after preview',()=>{
 for (const kind of ['project','client']) for(const paused of [false,true]) {
  const s=seed(), preview=deletionPreview(s,kind,kind==='project'?'p':'c');
  timerAction(s,{type:'start',projectId:'p',expected:null,id:'timer'},5000000);
  if(paused) timerAction(s,{type:'pause',expected:'timer'},5001000);
  const before=structuredClone(s);
  assert.throws(()=>deleteEntity(s,preview,preview.name),/טיימר/);
  assert.deepEqual(s,before);
 }
});
test('stale confirmations reject unseen or edited related data without mutations',()=>{
 for(const modify of [
  s=>s.projects[0].name='renamed',
  s=>s.projects.push({...s.projects[0],id:'new'}),
  s=>s.entries[0].segments[0].end++,
  s=>s.tasks[0].completed=false,
  s=>s.projects[0].clientId='other',
 ]) {
  const s=seed(),preview=deletionPreview(s,'client','c');modify(s);const before=structuredClone(s);
  assert.throws(()=>deleteEntity(s,preview,preview.name),/הנתונים השתנו/);assert.deepEqual(s,before);
 }
 const s=seed(),preview=deletionPreview(s,'project','p');s.projects.find(p=>p.id==='keep').name='unrelated';
 assert.equal(deleteEntity(s,preview,'p'),true);
});
test('exact name required; empty clients and old data without tasks can be deleted',()=>{
 const s=seed(),preview=deletionPreview(s,'client','c'),before=structuredClone(s);
 assert.throws(()=>deleteEntity(s,preview,'wrong'),/בדיוק/);assert.deepEqual(s,before);
 const empty={...fresh(),clients:[{id:'c',name:'Empty'}]};delete empty.tasks;
 assert.equal(deleteEntity(empty,deletionPreview(empty,'client','c'),'Empty'),true);
 assert.deepEqual(empty.clients,[]);validateBackup(empty);
 assert.throws(()=>deletionPreview(s,'entries','p'),/סוג המחיקה/);
});
