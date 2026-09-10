// Main-process inspector only: unlike Playwright, this does not attach a
// renderer debugger or emulate page focus/visibility. Profile stays isolated.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const profile = await fs.mkdtemp(path.resolve('../../work/visibility-native-'));
const exe = (await fs.readFile('../../work/security-test-exe.txt','utf8')).trim();
const child = spawn(exe, ['--inspect=0'], { windowsHide:true, env:{...process.env,
  ELECTRON_RUN_AS_NODE:undefined, BOU_DESKTOP_TEST:'1', BOU_TEST_PROFILE:profile} });
let socket;
try {
  const url = await new Promise((resolve,reject) => {
    let output='';
    const timeout=setTimeout(()=>reject(Error('Inspector unavailable')),20000);
    child.on('error',reject);
    child.stderr.on('data',chunk=>{
      output+=chunk;
      const found=output.match(/Debugger listening on (ws:\/\/[^\s]+)/);
      if(found){clearTimeout(timeout);resolve(found[1]);}
    });
  });
  socket=new WebSocket(url);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;
  const pending=new Map();
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}
  });
  const evaluate=async expression=>{
    const next=++id;
    const result=new Promise(resolve=>pending.set(next,resolve));
    socket.send(JSON.stringify({id:next,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}));
    const message=await result;
    if(message.error||message.result.exceptionDetails)throw Error(JSON.stringify(message));
    return message.result.result.value;
  };
  const result=await evaluate(`(async()=>{
    const {app,BrowserWindow}=process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron');
    await app.whenReady();
    const pause=ms=>new Promise(r=>setTimeout(r,ms));
    let win;
    for(let n=0;n<100;n++){win=BrowserWindow.getAllWindows()[0];if(win?.isVisible()&&!win.webContents.isLoading())break;await pause(100);}
    const hidden=()=>win.webContents.executeJavaScript('document.hidden');
    const before=await hidden();
    win.minimize();
    for(let n=0;n<30&&!await hidden();n++)await pause(100);
    const minimized={native:win.isMinimized(),hidden:await hidden(),throttling:win.webContents.backgroundThrottling};
    win.restore();win.show();win.focus();
    for(let n=0;n<100&&await hidden();n++)await pause(100);
    return {before,minimized,restored:!await hidden()};
  })()`);
  assert.equal(result.before,false);
  assert.equal(result.minimized.native,true);
  assert.equal(result.minimized.throttling,true);
  assert.equal(result.minimized.hidden,true);
  assert.equal(result.restored,true);
  console.log(JSON.stringify({passed:true,profile,...result}));
  await evaluate(`process.getBuiltinModule('module').createRequire(process.cwd()+'/package.json')('electron').app.quit()`);
} finally { socket?.close(); if(child.exitCode===null)child.kill(); }
