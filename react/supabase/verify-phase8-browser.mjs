#!/usr/bin/env node
// Real Chromium engine; viewport emulation is not a real phone or screen-reader test.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readEnv } from './backup.mjs';
const env = readEnv(), credentials = JSON.parse(readFileSync('.env.phase2.local','utf8'));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co' || credentials.ref !== 'pkpwcpatuslfjyoivbuf') throw new Error('TEST only.');
const base='http://localhost:3001',port=9348;
const profile=mkdtempSync(path.join(tmpdir(),'marixa-phase8-'));
const chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new','--disable-gpu','--no-sandbox','--no-first-run',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'], {stdio:'ignore',windowsHide:true});
let socket,sequence=0;const pending=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn,label,timeout=25000){const end=Date.now()+timeout;while(Date.now()<end){try{if(await fn())return;}catch{}await pause(150);}throw new Error(`Timeout: ${label}`);}
function send(method,params={}){const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result?.value;}
async function navigate(route){await send('Page.navigate',{url:base+route});await until(()=>evaluate(`location.pathname===${JSON.stringify(route.split('?')[0])} && document.readyState==='complete' && !!document.querySelector('h1')`),route);await until(()=>evaluate("!document.querySelector('.loading-state')"),'data '+route);}
async function login(role){
  const r=await fetch(base+'/api/v1/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({phone:role==='admin'?'0990000104':'0990000101',password:credentials.passwords[role==='admin'?'TEST-P2-ADMIN':'TEST-P2-A']})});assert.equal(r.status,200);
  await send('Network.clearBrowserCookies');
  for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');await send('Network.setCookie',{name:pair.slice(0,i),value:pair.slice(i+1),url:base});}
}
try{
  await until(async()=>{try{return(await fetch(`http://127.0.0.1:${port}/json/version`)).ok;}catch{return false;}},'Chrome');
  const tab=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
  socket=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{const r=JSON.parse(event.data);if(!r.id||!pending.has(r.id))return;const p=pending.get(r.id);pending.delete(r.id);if(r.error)p.reject(new Error(r.error.message));else p.resolve(r.result);});
  await send('Page.enable');await send('Network.enable');await send('Accessibility.enable');
  mkdirSync('.artifacts',{recursive:true});
  for(const role of ['admin','employee']){
    await login(role);
    const routes=role==='admin'?['/admin','/admin/settings','/hr/dashboard','/hr/attendance','/hr/timesheets']:['/home','/today','/my-attendance','/my-requests','/my-profile'];
    for(const width of [375,768,1024,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
      for(const route of routes){
        await navigate(route);
        assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),`horizontal overflow ${route} ${width}`);
        const alerts=await evaluate('[...document.querySelectorAll(".notice-error")].map(x=>x.textContent)');assert.equal(alerts.length,0,`UI error ${route}: ${alerts.join(' ')}`);
        const ax=await send('Accessibility.getFullAXTree');
        const unnamed=ax.nodes.filter(node=>!node.ignored&&['button','textbox','combobox'].includes(node.role?.value)&&!node.name?.value?.trim());
        assert.equal(unnamed.length,0,`accessible control names ${route}`);
      }
      if(width===375||width===1440){const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`.artifacts/phase8-${role}-${width}.png`,Buffer.from(shot.data,'base64'));}
      console.log(`PASS ${role} ${width}px: routes, no overflow/errors, accessible control names`);
    }
  }
  await login('admin');await navigate('/admin/settings');
  await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Xem trước thay đổi")).click()');
  await until(()=>evaluate('document.body.innerText.includes("Xác nhận lưu phiên bản")'),'policy preview');
  assert(await evaluate('document.body.innerText.includes("480 phút/ngày")'),'shift impact preview');
  await navigate('/hr/attendance?from=2026-01-01&to=2026-12-31&page=1');
  await send('Page.reload');await until(()=>evaluate('document.readyState==="complete"&&!document.querySelector(".loading-state")'),'filter reload');
  assert.equal(await evaluate('document.querySelector("input[name=from]").value'),'2026-01-01');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  assert(await evaluate('document.activeElement!==document.body'),'keyboard tab focus');
  const photo=await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Xem ảnh riêng tư"))?.textContent');
  if(photo){await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Xem ảnh riêng tư")).click()');await until(()=>evaluate('!!document.querySelector("dialog[open], [role=dialog]")'),'photo modal');
    assert(await evaluate('!!document.activeElement?.closest("dialog, [role=dialog]")'),'dialog initial focus');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await until(()=>evaluate('!document.querySelector("dialog[open], [role=dialog]")'),'Escape closes modal');
  }
  await send('Network.emulateNetworkConditions',{offline:false,latency:300,downloadThroughput:100000,uploadThroughput:50000});
  await navigate('/today');
  console.log('PASS shift preview, persisted filters, keyboard focus, photo Escape (when available), slow network');
}finally{
  socket?.close();chrome.kill();await pause(700);
  const resolved=path.resolve(profile);if(!resolved.startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(resolved).startsWith('marixa-phase8-'))throw new Error('Unsafe temporary profile cleanup.');
  rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
