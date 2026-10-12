// Local UI regression. Auth and API fixtures are synthetic; this does not verify Supabase/RLS.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,createWriteStream,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {writeGallery} from './ui-gallery.mjs';
import {account,user,session,people,fixture,today,period} from './ui-fixtures.mjs';
const base='http://localhost:3011', mockPort=3012, debugPort=9349;
const artifacts=path.resolve('.artifacts/ui-redesign');
mkdirSync(artifacts,{recursive:true});
const profile=mkdtempSync(path.join(tmpdir(),'marixa-ui-redesign-'));
let role='employee', socket, next, chrome, sequence=0, failPath='', emptyPath='', apiDelay=0, allowAttendance=false, savedEvent=null, savedKey='', postCount=0;
const pending=new Map(), failures=[], report=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const mock=createServer((req,res)=>{
 try {
  const url=new URL(req.url,'http://127.0.0.1');
  let current='employee';
  try { const token=req.headers.authorization?.split(' ')[1], payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url')); current=people.find(p=>p.auth_user_id===payload.sub)?.role??current; } catch {}
  let data;
  if(url.pathname==='/auth/v1/user') data=user(current);
  else if(url.pathname==='/rest/v1/app_users') { const id=url.searchParams.get('auth_user_id')?.replace('eq.',''); data=people.filter(p=>!id||p.auth_user_id===id).map(p=>account(p.role)); if(req.headers.accept?.includes('object')) data=data[0]??null; }
  else throw new Error('Unexpected local auth request: '+url.pathname);
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
 }catch(error){failures.push(error.message);res.writeHead(500);res.end('{}');}
});
function send(method,params={}){const id=++sequence;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;}
async function until(check,label,timeout=60000){const end=Date.now()+timeout;while(Date.now()<end){try{if(await check())return;}catch{}await pause(150);}throw new Error('Timed out: '+label);}
async function navigate(route){await send('Page.navigate',{url:base+route});await until(()=>evaluate(`location.pathname===${JSON.stringify(route.split('?')[0])} && document.readyState==='complete' && !!document.querySelector('h1')`),route);await until(()=>evaluate("!document.querySelector('.loading-state')"),'data '+route);await pause(200);}
async function viewport(width){await send('Emulation.setDeviceMetricsOverride',{width,height:width<600?844:1000,deviceScaleFactor:1,mobile:width<600});await pause(90);}
async function clickText(text,scope='button'){const clicked=await evaluate(`(()=>{const b=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.getClientRects().length&&!b.disabled&&b.textContent.includes(${JSON.stringify(text)}));if(b){b.focus();b.click();return true;}return false;})()`);assert(clicked,'Control not found: '+text);}
async function escape(){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(()=>evaluate('!document.querySelector("[role=dialog]")'),'Escape');}
async function screenshot(name){await evaluate('document.querySelector("nextjs-portal")?.setAttribute("style","display:none")');const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(shot.data,'base64'));}
async function checkLayout(label){assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),'Horizontal overflow '+label);const errors=await evaluate('[...document.querySelectorAll(".notice-error")].map(e=>e.textContent)');assert.equal(errors.length,0,'UI errors '+label+': '+errors.join(' '));const ax=await send('Accessibility.getFullAXTree');const unnamed=ax.nodes.filter(n=>!n.ignored&&['button','textbox','combobox'].includes(n.role?.value)&&!n.name?.value?.trim());assert.equal(unnamed.length,0,'Unnamed controls '+label);}
async function setRole(value){role=value;await send('Network.clearBrowserCookies');await send('Network.setCookie',{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session(role))).toString('base64url'),url:base});}
try {
 await new Promise((resolve,reject)=>{mock.once('error',reject);mock.listen(mockPort,'127.0.0.1',resolve);});
 const log=createWriteStream(path.join(artifacts,'server.log'));
 next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3011'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_PUBLIC_APP_URL:base,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:'+mockPort,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-ui-fixture',SUPABASE_SECRET_KEY:'local-ui-fixture'}});
 next.stdout.pipe(log);next.stderr.pipe(log);
 await until(async()=>{try{return (await fetch(base+'/login')).status===200;}catch{return false;}},'local Next server',90000);
 chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 await until(async()=>{try{return (await fetch('http://127.0.0.1:'+debugPort+'/json/version')).ok;}catch{return false;}},'Chrome');
 const tab=await (await fetch('http://127.0.0.1:'+debugPort+'/json/new?about:blank',{method:'PUT'})).json();
 socket=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',async event=>{
  const r=JSON.parse(event.data);
  if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(new Error(r.error.message)):p.resolve(r.result);return;}
  if(r.method==='Runtime.exceptionThrown') failures.push(r.params.exceptionDetails.exception?.description??r.params.exceptionDetails.text);
  if(r.method!=='Fetch.requestPaused')return;
  const {requestId,request}=r.params, url=new URL(request.url);
  try {
   if(apiDelay)await pause(apiDelay);
   if(url.pathname===failPath) {await send('Fetch.fulfillRequest',{requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({error:{message:'Kết nối thử nghiệm bị gián đoạn. Vui lòng thử lại.'}})).toString('base64')});return;}
   if(allowAttendance && url.pathname==='/api/v1/attendance/events' && request.method==='POST') {
    const body=JSON.parse(request.postData);assert.equal(body.queue_owner_id,people[0].id);
    if(!savedEvent){savedKey=body.idempotency_key;savedEvent={id:'00000000-0000-4000-8000-000000000999',employee_id:people[0].id,kind:body.kind,work_date:today,occurred_at:body.device_occurred_at,device_occurred_at:body.device_occurred_at,received_at:new Date().toISOString(),source:body.source,evidence_status:body.photo_expected?'pending':'not_provided',location_flag:'unknown'};}
    assert.equal(body.idempotency_key,savedKey);postCount++;
    await send('Fetch.fulfillRequest',{requestId,responseCode:postCount===1?201:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({data:savedEvent})).toString('base64')});return;
   }
   if(allowAttendance && request.method==='POST' && url.pathname.endsWith('/photo')){savedEvent.evidence_status='ready';await send('Fetch.fulfillRequest',{requestId,responseCode:201,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({data:savedEvent})).toString('base64')});return;}
   if(request.method!=='GET') throw new Error('Unplanned mutation blocked: '+url.pathname);
   const data=url.pathname===emptyPath?{data:[],page:{number:1,size:25,total:0}}:fixture(request.url,role);
   if(savedEvent && ['/api/v1/attendance/events','/api/v1/me/attendance'].includes(url.pathname))data.data.push(savedEvent);
   await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(JSON.stringify(data)).toString('base64')});
  }catch(error){if(/Invalid InterceptionId|Invalid state|session.*closed/i.test(error.message))return;failures.push(error.message);await send('Fetch.fulfillRequest',{requestId,responseCode:500,body:Buffer.from('{}').toString('base64')}).catch(()=>{});}
 });
 await send('Page.enable');await send('Network.enable');await send('Runtime.enable');await send('Accessibility.enable');
 await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/*',requestStage:'Request'}]});
 for(const route of ['/login','/change-password']) {await navigate(route);for(const width of [360,375,390,430,768,1366,1440,1920,2560]){await viewport(width);await checkLayout(route);report.push({role:'auth',route,width,result:'pass'});if(width===375||width===1440)await screenshot(route.slice(1)+'-'+width);}}
 const personal=['/home','/today','/my-attendance','/my-requests','/my-profile'];
 const hr=['/hr/dashboard','/hr/employees','/hr/attendance','/hr/requests','/hr/timesheets','/hr/leave-balances','/hr/reports'];
 const admin=['/admin','/admin/accounts','/admin/settings','/admin/audit'];
 for(const selectedRole of (process.env.UI_ROLES?.split(',')??['employee','hr','admin'])) {
  await setRole(selectedRole);
  const routes=process.env.UI_ROUTES?.split(',')??[...personal,...(selectedRole==='employee'?[]:hr),...(selectedRole==='admin'?admin:[])];
  for(const route of routes) {
   await navigate(route);
   for(const width of [360,375,390,430,768,1366,1440,1920,2560]) {await viewport(width);await checkLayout(selectedRole+' '+route+' '+width);report.push({role:selectedRole,route,width,result:'pass'});if(width===375||width===1440)await screenshot(selectedRole+route.replaceAll('/','-')+'-'+width);}
   console.log('PASS '+selectedRole+' '+route+': 9 widths, overflow, named controls');
  }
 }
 // Mobile More, focus trap and focus restoration.
 await setRole('admin');await viewport(375);await navigate('/home');await clickText('Thêm');
 await until(()=>evaluate('!!document.querySelector("[role=dialog]")'),'More menu');
 assert(await evaluate('!!document.activeElement.closest("[role=dialog]")'),'Dialog autofocus');
 assert(await evaluate('[...document.querySelectorAll("[role=dialog] a")].some(a=>a.getAttribute("href")==="/admin/audit")'),'Audit reachable on phone');
 await screenshot('admin-mobile-menu');await escape();
 assert(await evaluate('document.activeElement.tagName==="BUTTON"'),'Dialog restores focus');
 // Settings: read-only impact preview and preserve a failed form.
 await viewport(1440);await navigate('/admin/settings');await clickText('Xem trước thay đổi');assert(await evaluate('document.body.innerText.includes("480 phút/ngày")'),'Policy impact preview');
 await navigate('/admin/settings?tab=holidays');
 await evaluate(`(()=>{for(const [type,value] of [['date',${JSON.stringify(today)}],['text','Ngày nghỉ đã nhập']]){const el=document.querySelector('main form input[type="'+type+'"]')||[...document.querySelectorAll('main form input')].find(e=>e.type===type);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));}})()`);
 failPath='/api/v1/admin/settings/holidays';await clickText('Thêm lịch');await until(()=>evaluate('!!document.querySelector(".notice-error")'),'Save error');
 assert(await evaluate('!![...document.querySelectorAll("input")].find(e=>e.value==="Ngày nghỉ đã nhập")'),'Failed form preserves values');failPath='';
 // URL filter survives reload and browser back/forward.
 await navigate('/my-attendance?month='+today.slice(0,7)+'&view=list&source=offline');await send('Page.reload');
 await until(()=>evaluate('document.readyState==="complete"&&!document.querySelector(".loading-state")'),'History reload');
 assert(await evaluate('location.search.includes("source=offline") && !![...document.querySelectorAll("select")].find(e=>e.value==="offline")'),'Source restored from URL');
 await clickText('Lịch','main button');await until(()=>evaluate('location.search.includes("view=calendar")'),'Calendar URL');
 await evaluate('history.back()');await until(()=>evaluate('location.search.includes("view=list")'),'History Back');
 assert(await evaluate('location.search.includes("source=offline")'),'Back preserves source');
 await evaluate('history.forward()');await until(()=>evaluate('location.search.includes("view=calendar")'),'History Forward');
 // Calendar days remain usable touch targets at the narrowest supported width.
 await viewport(360);
 for(const route of ['/my-attendance?view=calendar','/my-requests?leave_view=calendar']) {
  await navigate(route);await checkLayout('mobile calendar '+route);
  assert(await evaluate('[...document.querySelectorAll(".calendar-day")].every(e=>{const r=e.getBoundingClientRect();return r.width>=43.9&&r.height>=44})'),'Calendar touch targets');
  await screenshot(route.startsWith('/my-attendance')?'attendance-calendar-360':'leave-calendar-360');
 }
 await viewport(1440);
 // Review details available even when reviewer cannot decide.
 await setRole('hr');await navigate('/hr/requests');await clickText('Xem chi tiết');await until(()=>evaluate('!!document.querySelector("[role=dialog]")'),'Review detail');await screenshot('hr-review-detail');await escape();
 await evaluate('[...document.querySelectorAll("main tbody tr")].find(row=>row.textContent.includes("Trần Hoàng Phương")).querySelector("button").click()');await until(()=>evaluate('!!document.querySelector("[role=dialog]")'),'Own request detail');assert(await evaluate('![...document.querySelectorAll("[role=dialog] button")].some(b=>b.textContent==="Duyệt")'),'Cannot approve own HR request');await escape();
 // Explicit confirmation before locking a period or account.
 await setRole('admin');await navigate('/hr/timesheets');await clickText('Sau','main button');await until(()=>evaluate('location.search.includes("page=2")'),'Timesheet page URL');assert.equal(await evaluate('document.querySelectorAll("main tbody tr").length'),25,'Timesheet page limited to 25');await clickText('Admin khóa kỳ');assert(await evaluate('document.querySelector("[role=dialog]")?.textContent.includes("Bản công sẽ được chốt")'),'Lock context');await escape();
 await navigate('/admin/accounts');await clickText('Khóa');assert(await evaluate('document.querySelector("[role=dialog]")?.textContent.includes("không thể truy cập")'),'Account lock confirmation');await escape();
 // Empty and recoverable error states.
 emptyPath='/api/v1/hr/employees';await navigate('/hr/employees');assert(await evaluate('document.body.innerText.includes("Chưa có hồ sơ phù hợp")'),'Empty state');emptyPath='';
 failPath='/api/v1/hr/employees';await navigate('/hr/employees');assert(await evaluate('!!document.querySelector("[role=alert]")'),'Error state');failPath='';await clickText('Làm mới');await until(()=>evaluate('!document.querySelector(".notice-error")&&!document.querySelector(".loading-state")'),'Retry recovery');
 // Delayed API still settles without blank content.
 apiDelay=500;await navigate('/home');apiDelay=0;await checkLayout('slow API');
 // IndexedDB survives reload, and an image retry attaches to the same event.
 await setRole('employee');await viewport(390);await navigate('/today');
 await evaluate('document.querySelector(".attendance-options").open=true');
 await evaluate(`(()=>{const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;const c=canvas.getContext('2d');c.fillStyle='#1647c8';c.fillRect(0,0,24,24);return new Promise(resolve=>canvas.toBlob(blob=>{const transfer=new DataTransfer();transfer.items.add(new File([blob],'optional-photo.png',{type:'image/png'}));const el=document.querySelector('input[type=file]');el.files=transfer.files;el.dispatchEvent(new Event('change',{bubbles:true}));resolve();},'image/png'));})()`);
 await until(()=>evaluate('!!document.querySelector(".photo-preview img")'),'Photo preview');
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await until(()=>evaluate('!navigator.onLine'),'Offline');
 await clickText('Chấm vào','main button');
 await until(()=>evaluate('document.body.innerText.includes("Đã lưu trên thiết bị")'),'Local queue save');
 const readQueue=`(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('marixa-attendance-queue',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const rows=await new Promise((resolve,reject)=>{const r=db.transaction('events','readonly').objectStore('events').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return rows.map(r=>({key:r.idempotency_key,owner:r.employee_id,photoSize:r.photo?.size,status:r.status}));})()`;
 const queued=await evaluate(readQueue);assert.equal(queued.length,1);assert.equal(queued[0].owner,people[0].id);assert(queued[0].photoSize>0&&queued[0].photoSize<=200000);
 failPath='/api/v1/attendance/events';allowAttendance=true;
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await navigate('/today');assert.equal((await evaluate(readQueue))[0].key,queued[0].key,'Reload retains idempotency key');
 failPath='/api/v1/attendance/events/00000000-0000-4000-8000-000000000999/photo';
 await clickText('Đồng bộ ngay','main button');await until(()=>evaluate('document.body.innerText.includes("ảnh đang chờ đồng bộ")'),'Event accepted, photo pending');
 assert.equal(savedKey,queued[0].key);assert.equal((await evaluate(readQueue))[0].status,'event_synced_photo_pending');
 failPath='';await until(()=>evaluate('[...document.querySelectorAll("main button")].some(b=>b.textContent.includes("Đồng bộ ngay")&&!b.disabled)'),'Retry enabled');await clickText('Đồng bộ ngay','main button');
 await until(async()=>!(await evaluate(readQueue)).length,'Photo retry clears queue');assert.equal(savedEvent.evidence_status,'ready');assert.equal(savedKey,queued[0].key);
 await screenshot('employee-offline-recovered');allowAttendance=false;
 assert.equal(failures.length,0,failures.join('\n'));
 console.log('PASS interactions: mobile menu, focus, settings preview/draft, filters, review detail, confirmations, empty/error/retry, slow API, offline owner/key/photo/reload/retry');
 writeFileSync(path.join(artifacts,process.env.UI_ROLES||process.env.UI_ROUTES?'report-subset.json':'report.json'),JSON.stringify({environment:'Local synthetic UI fixtures. Not a Supabase/RLS/device test.',matrix:report,interactions:'pass',offlineQueue:'Owner/key/photo retained across reload; photo failure and retry reuse same event in local fixture.'},null,2));
 writeGallery(artifacts);
} catch(error) {
 if(socket?.readyState===1){console.error(await evaluate('({path:location.pathname,text:document.body.innerText.slice(0,1800)})').catch(()=>null));await screenshot('failure').catch(()=>{});}
 console.error(error);if(failures.length)console.error(failures);process.exitCode=1;
} finally {
 socket?.close();chrome?.kill();next?.kill();mock.close();mock.closeAllConnections();await pause(800);
 const resolved=path.resolve(profile);if(!resolved.startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(resolved).startsWith('marixa-ui-redesign-'))throw new Error('Unsafe browser cleanup target');
 rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
