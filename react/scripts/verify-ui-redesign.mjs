// Local UI regression. Auth and API fixtures are synthetic; this does not verify Supabase/RLS.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,createWriteStream,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {writeGallery} from './ui-gallery.mjs';
import {account,user,session,people,fixture,today,period,policy} from './ui-fixtures.mjs';
const base='http://localhost:3011', mockPort=3012, debugPort=9349;
const production=process.env.UI_PRODUCTION==='1';
const artifacts=path.resolve('.artifacts/ui-redesign');
mkdirSync(artifacts,{recursive:true});
const profile=mkdtempSync(path.join(tmpdir(),'marixa-ui-redesign-'));
let role='employee', socket, next, chrome, sequence=0, failPath='', emptyPath='', apiDelay=0, allowAttendance=false, savedEvent=null, savedKey='', postCount=0;
let completedPunches=null, allowEmployeeImport=false;
const pending=new Map(), failures=[], report=[];
const networkRequests=[];
const performanceReport={};
const upstreamRequests=[];
let authRejected=false, accountStatus='active', employeeStatus='active', passwordRequired=false, upstreamDelay=0;
const apiEvents=new Map();
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const mock=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://127.0.0.1');
  upstreamRequests.push(url.pathname);
  if(upstreamDelay)await pause(upstreamDelay);
  let current='employee';
  try { const token=req.headers.authorization?.split(' ')[1], payload=JSON.parse(Buffer.from(token.split('.')[1],'base64url')); current=people.find(p=>p.auth_user_id===payload.sub)?.role??current; } catch {}
  let data;
  if(url.pathname==='/auth/v1/user') {
   if(authRejected){res.writeHead(401,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Invalid fixture token',code:'bad_jwt'}));return;}
   data=user(current);
  }
  else if(url.pathname==='/auth/v1/token') data=session('employee');
  else if(url.pathname==='/rest/v1/app_users') { const id=url.searchParams.get('auth_user_id')?.replace('eq.',''); data=people.filter(p=>!id||p.auth_user_id===id).map(p=>({...account(p.role),status:accountStatus,must_change_password:passwordRequired})); if(req.headers.accept?.includes('object')) data=data[0]??null; }
  else if(url.pathname==='/rest/v1/employees') {data=people.filter(p=>!url.searchParams.get('id')||p.id===url.searchParams.get('id').replace('eq.','')).map(p=>({...p,status:employeeStatus}));if(req.headers.accept?.includes('object'))data=data[0]??null;}
  else if(url.pathname==='/rest/v1/work_policies') data=req.headers.accept?.includes('object')?policy:[policy];
  else if(url.pathname==='/rest/v1/attendance_events') {const event=apiEvents.get(url.searchParams.get('idempotency_key')?.replace('eq.',''));data=event?[event]:[];if(req.headers.accept?.includes('object'))data=data[0]??null;}
  else if(url.pathname==='/rest/v1/rpc/create_attendance_event') {
   let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);
   data={id:'00000000-0000-4000-8000-000000000998',employee_id:people.find(p=>p.role===current).id,kind:input.p_kind,idempotency_key:input.p_idempotency_key,work_date:today,occurred_at:new Date().toISOString(),evidence_status:'not_provided'};
   apiEvents.set(input.p_idempotency_key,data);
  }
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
const mockGps = `window.gpsCalls=0;navigator.geolocation.getCurrentPosition=(success,error,options)=>{window.gpsCalls++;window.gpsOptions=options;success({coords:{latitude:10.77,longitude:106.69,accuracy:10}});};`;
async function chooseFixturePhoto(type='image/png',invalid=false) {
 await evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=24;canvas.height=24;canvas.getContext('2d').fillRect(0,0,24,24);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const transfer=new DataTransfer();transfer.items.add(new File([${invalid ? "'invalid image'" : 'blob'}],'evidence.png',{type:${JSON.stringify(type)}}));const el=document.querySelector('[role=dialog] input[type=file]');el.files=transfer.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
}
async function setRole(value){role=value;await send('Network.clearBrowserCookies');await send('Network.setCookie',{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session(role))).toString('base64url'),url:base});}
try {
 await new Promise((resolve,reject)=>{mock.once('error',reject);mock.listen(mockPort,'127.0.0.1',resolve);});
 const log=createWriteStream(path.join(artifacts,'server.log'));
 const fixtureEnv={...process.env,NEXT_PUBLIC_APP_URL:base,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:'+mockPort,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'local-ui-fixture',SUPABASE_SECRET_KEY:'local-ui-fixture'};
 if(production) {
  const build=spawn(process.execPath,['node_modules/next/dist/bin/next','build'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:fixtureEnv});
  build.stdout.pipe(log,{end:false});build.stderr.pipe(log,{end:false});
  await new Promise((resolve,reject)=>{build.once('error',reject);build.once('exit',code=>code===0?resolve():reject(new Error('Fixture production build failed: '+code)));});
 }
 next=spawn(process.execPath,['node_modules/next/dist/bin/next',production?'start':'dev','--hostname','127.0.0.1','--port','3011'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:fixtureEnv});
 next.stdout.pipe(log);next.stderr.pipe(log);
 await until(async()=>{try{return (await fetch(base+'/login')).status===200;}catch{return false;}},'local Next server',90000);
 // Exercise real Next handlers and proxy against synthetic Supabase. No cloud writes.
 const cookieFor=value=>'sb-127-auth-token=base64-'+Buffer.from(JSON.stringify(value)).toString('base64url');
 const cookie=cookieFor(session('employee'));
 async function apiProbe(route,expected,headers={Cookie:cookie},method='GET'){
  const r=await fetch(base+route,{headers,method,redirect:'manual'});await r.text();assert.equal(r.status,expected,route);return r;
 }
 await apiProbe('/api/v1/me',200);upstreamDelay=80;upstreamRequests.length=0;
 const profileStart=performance.now();const me=await apiProbe('/api/v1/me',200);
 const profileMs=Math.round(performance.now()-profileStart);
 performanceReport.profile={ms:profileMs,upstreamDelayMs:80,upstreamRequests:[...upstreamRequests]};
 assert.deepEqual(upstreamRequests,['/auth/v1/user','/rest/v1/app_users','/rest/v1/employees'],'One auth, one live account, one employee lookup');
 assert.match(me.headers.get('cache-control'),/no-store/);upstreamDelay=0;
 await apiProbe('/today',200);upstreamRequests.length=0;
 await apiProbe('/today',200);
 assert.equal(upstreamRequests.filter(p=>p==='/auth/v1/user').length,1,'One verified auth lookup per server render');
 await apiProbe('/api/v1/me',401,{});
 await apiProbe('/api/v1/hr/employees',403);
 await apiProbe('/api/v1/admin/audit',403);
 await apiProbe('/api/v1/attendance/events',403,{Cookie:cookie,Origin:'https://invalid.example'},'POST');
 authRejected=true;await apiProbe('/api/v1/me',401);const rejectedPage=await apiProbe('/today',307);assert.equal(rejectedPage.headers.get('location'),'/login');authRejected=false;
 accountStatus='inactive';await apiProbe('/api/v1/me',401);accountStatus='active';
 passwordRequired=true;await apiProbe('/api/v1/me',403);passwordRequired=false;
 for(const route of ['/api/v1/me','/today']) {
  upstreamRequests.length=0;
  const refreshed=await apiProbe(route,200,{Cookie:cookieFor({...session('employee'),expires_at:1})});
  assert.equal(upstreamRequests.filter(p=>p==='/auth/v1/token').length,1,'One refresh: '+route);
  const cookies=refreshed.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  assert(cookies.includes('sb-127-auth-token'),'Refreshed cookies reach browser: '+route);
  await apiProbe('/api/v1/me',200,{Cookie:cookies});
 }
 const punchKey='00000000-0000-4000-8000-000000000997';
 const submitProbe=(evidence={photo_expected:true,latitude:10.77,longitude:106.69,accuracy_m:10})=>fetch(base+'/api/v1/attendance/events',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({kind:'check_in',idempotency_key:punchKey,queue_owner_id:people[0].id,...evidence})});
 assert.equal((await submitProbe({})).status,422,'Photo required');
 assert.equal((await submitProbe({photo_expected:true})).status,422,'GPS required');
 assert.equal((await submitProbe({photo_expected:true,latitude:10})).status,422,'Partial GPS rejected');
 const created=await submitProbe();assert.equal(created.status,201);const firstEvent=(await created.json()).data;
 upstreamRequests.length=0;const replay=await submitProbe();assert.equal(replay.status,200);assert.equal((await replay.json()).data.id,firstEvent.id);
 assert.equal((await submitProbe({})).status,200,'Existing events still replay without new evidence');
 assert(!upstreamRequests.includes('/rest/v1/rpc/create_attendance_event'),'Replay does not write a second event');
 employeeStatus='inactive';assert.equal((await submitProbe()).status,403);employeeStatus='active';
 apiEvents.set(punchKey,{...firstEvent,employee_id:people[1].id});assert.equal((await submitProbe()).status,409);apiEvents.clear();
 console.log('PASS real handlers with local Auth fixture: profile '+profileMs+' ms at 80 ms/upstream, 3 lookups; role, revoked token, inactive account, password, CSRF, page/API refresh guards');
 console.log('PASS real attendance handler with fixture: create, idempotent replay, inactive employee, foreign key owner');
 chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-sandbox','--no-first-run','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
 await until(async()=>{try{return (await fetch('http://127.0.0.1:'+debugPort+'/json/version')).ok;}catch{return false;}},'Chrome');
 const tab=await (await fetch('http://127.0.0.1:'+debugPort+'/json/new?about:blank',{method:'PUT'})).json();
 socket=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',async event=>{
  const r=JSON.parse(event.data);
  if(r.id&&pending.has(r.id)){const p=pending.get(r.id);pending.delete(r.id);r.error?p.reject(new Error(r.error.message)):p.resolve(r.result);return;}
  if(r.method==='Runtime.exceptionThrown') failures.push(r.params.exceptionDetails.exception?.description??r.params.exceptionDetails.text);
  if(r.method==='Network.requestWillBeSent') networkRequests.push({url:r.params.request.url,method:r.params.request.method});
  if(r.method!=='Fetch.requestPaused')return;
  const {requestId,request}=r.params, url=new URL(request.url);
  try {
   if(apiDelay)await pause(apiDelay);
   if(url.pathname===failPath) {await send('Fetch.fulfillRequest',{requestId,responseCode:503,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({error:{message:'Kết nối thử nghiệm bị gián đoạn. Vui lòng thử lại.'}})).toString('base64')});return;}
   if(allowAttendance && url.pathname==='/api/v1/attendance/events' && request.method==='POST') {
    const body=JSON.parse(request.postData);assert.equal(body.queue_owner_id,people[0].id);
    if(!savedEvent){savedKey=body.idempotency_key;savedEvent={id:'00000000-0000-4000-8000-000000000999',employee_id:people[0].id,kind:body.kind,work_date:today,occurred_at:body.device_occurred_at,device_occurred_at:body.device_occurred_at,received_at:new Date().toISOString(),source:body.source,evidence_status:body.photo_expected?'pending':'not_provided',location_flag:'unknown'};}
    assert.equal(body.idempotency_key,savedKey);assert.equal(body.photo_expected,true);assert.equal(body.latitude,10.77);assert.equal(body.longitude,106.69);assert.equal(body.accuracy_m,10);postCount++;
    await send('Fetch.fulfillRequest',{requestId,responseCode:postCount===1?201:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({data:savedEvent})).toString('base64')});return;
   }
   if(allowAttendance && request.method==='POST' && url.pathname.endsWith('/photo')){savedEvent.evidence_status='ready';await send('Fetch.fulfillRequest',{requestId,responseCode:201,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({data:savedEvent})).toString('base64')});return;}
   if(allowEmployeeImport && request.method==='POST' && url.pathname==='/api/v1/hr/employees/import.xlsx') {
    const data={total:2,created:1,updated:0,skipped:0,errors:1,rows:[{rowNumber:2,employeeCode:'NVTEST',fullName:'Nhân viên thử',status:'created',issues:[]},{rowNumber:3,employeeCode:'INVALID',fullName:'Dòng lỗi',status:'error',issues:['Email sai định dạng']}]};
    await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'}],body:Buffer.from(JSON.stringify({data})).toString('base64')});return;
   }
   if(request.method!=='GET') throw new Error('Unplanned mutation blocked: '+url.pathname);
   const data=url.pathname===emptyPath?{data:[],page:{number:1,size:25,total:0}}:fixture(request.url,role);
   if(savedEvent && ['/api/v1/attendance/events','/api/v1/me/attendance'].includes(url.pathname))data.data.push(savedEvent);
   if(completedPunches && url.pathname==='/api/v1/attendance/events') data.data=completedPunches;
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
 // A presentation-only tab must not request server layouts or business data.
 await pause(300);networkRequests.length=0;
 const tabStart=performance.now();await clickText('Danh sách','main button');
 await until(()=>evaluate('location.search.includes("view=list")'),'Immediate list tab');
 const tabMs=Math.round(performance.now()-tabStart);await pause(350);
 assert.equal(networkRequests.filter(r=>r.url.includes('_rsc=')||r.url.includes('/api/')).length,0,'Client tab does not refetch server/auth/API');
 console.log('PASS performance: local attendance tab '+tabMs+' ms, zero server/API requests');
 performanceReport.tab={ms:tabMs,serverRequests:0};
 // Typing several characters sends one settled query, with no RSC navigation.
 await setRole('hr');await navigate('/hr/employees');networkRequests.length=0;
 for(const value of ['M','MX','MX0','MX00','MX001']) {
  await evaluate(`(()=>{const el=document.querySelector('input[type=search]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await pause(30);
 }
 await until(()=>evaluate('location.search.includes("q=MX001")&&!document.querySelector(".loading-state")'),'Debounced employee search');await pause(300);
 assert.equal(networkRequests.filter(r=>r.url.includes('/api/v1/hr/employees')).length,1,'One employee request per typing burst');
 assert.equal(networkRequests.filter(r=>r.url.includes('_rsc=')).length,0,'Search avoids server navigation');
 assert(await evaluate('document.querySelector("main tbody")?.textContent.includes("Nguyễn Minh Anh")'),'Search result matches final input');
 console.log('PASS performance: five search edits, one API request, zero RSC requests');
 performanceReport.search={edits:5,apiRequests:1,serverNavigations:0};
 // An empty local queue must not trigger an extra attendance/policy read.
 await setRole('employee');networkRequests.length=0;await navigate('/today');await pause(500);
 for(const route of ['/api/v1/attendance/events','/api/v1/me/work-policy']) {
  assert.equal(networkRequests.filter(r=>r.url.includes(route)).length,production?1:2,'One initial request per mount (StrictMode mounts twice in dev): '+route);
 }
 console.log('PASS performance: empty attendance queue performs one event and one policy read');
 performanceReport.emptyQueue={eventReadsPerMount:1,policyReadsPerMount:1};
 allowAttendance=true;networkRequests.length=0;
 await evaluate(mockGps);await clickText('Chấm vào','main button');
 assert.equal(postCount,0,'Opening camera does not submit');
 await chooseFixturePhoto();await until(()=>evaluate('!!document.querySelector(".photo-preview img")'),'Required photo ready');
 await clickText('Xác nhận chấm vào');
 await until(()=>evaluate('document.body.innerText.includes("Đã ghi nhận giờ vào")&&[...document.querySelectorAll("main button")].some(b=>b.textContent==="Chấm ra"&&!b.disabled)'),'Confirmed punch without extra reads');
 assert.equal(postCount,1,'One online event submission');
 assert.equal(networkRequests.filter(r=>r.method==='GET'&&r.url.includes('/api/')).length,0,'Successful punch does not refetch event/policy');
 console.log('PASS performance: online punch confirms immediately from POST response, zero follow-up GETs');
 performanceReport.onlinePunch={posts:1,followupReads:0};
 assert.deepEqual(await evaluate('window.gpsOptions'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 await clickText('Chấm ra','main button');assert(!(await evaluate('!!document.querySelector(".photo-preview img")')),'Checkout requires a new photo');await escape();
 allowAttendance=false;savedEvent=null;savedKey='';postCount=0;
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
 // The merged Excel UI presents partial success and per-row errors on phones.
 await setRole('hr');await viewport(360);await navigate('/hr/employees');allowEmployeeImport=true;
 await evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File(['synthetic request'],'employees.xlsx'));const el=document.querySelector('input[type=file]');el.files=transfer.files;el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await until(()=>evaluate('document.querySelector("[role=dialog]")?.textContent.includes("Email sai định dạng")'),'Excel row errors');
 assert(await evaluate('document.querySelector("[role=dialog]")?.textContent.includes("Đã tạo")'),'Excel partial success');
 await checkLayout('Excel import result');await screenshot('hr-import-result-360');await escape();allowEmployeeImport=false;
 // UTC punches crossing only part of lunch must display net minutes in Vietnam time.
 await setRole('employee');
 completedPunches=['05:30:30','06:15:59'].map((time,i)=>({id:'merge-punch-'+i,employee_id:people[0].id,kind:i?'check_out':'check_in',work_date:today,occurred_at:today+'T'+time+'Z',source:'online',evidence_status:'not_provided',location_flag:'unknown'}));
 await navigate('/today');
 assert.equal(await evaluate('document.querySelector(".attendance-worked strong")?.textContent'),'0 giờ 15 phút','Partial lunch excluded; UTC converted; seconds floored');
 completedPunches=null;
 // IndexedDB survives reload, and an image retry attaches to the same event.
 await setRole('employee');await viewport(390);await navigate('/today');
 assert(!(await evaluate('!!document.querySelector(".attendance-options,input[type=file]")')),'No optional evidence controls on page');
 // Exercise browser getUserMedia, capture/compression, release, cancellation and denied permission.
 await evaluate(`(()=>{window.originalGetUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);window.cameraTracks=[];navigator.mediaDevices.getUserMedia=async constraints=>{const stream=await window.originalGetUserMedia(constraints);window.cameraTracks.push(...stream.getTracks());return stream;};})()`);
 await clickText('Chấm vào','main button');await until(()=>evaluate('[...document.querySelectorAll("[role=dialog] button")].some(b=>b.textContent==="Chụp ảnh"&&!b.disabled)'),'Camera ready');
 await checkLayout('Camera on phone');await screenshot('employee-camera-390');await clickText('Chụp ảnh','[role=dialog] button');
 await until(()=>evaluate('!!document.querySelector("[role=dialog] .photo-preview img")'),'Camera capture preview');
 assert(await evaluate('window.cameraTracks.length>0&&window.cameraTracks.every(t=>t.readyState==="ended")'),'Camera released after capture');
 await clickText('Chụp lại');
 await until(()=>evaluate('window.cameraTracks.some(t=>t.readyState==="live")'),'Camera reopen');await escape();
 assert(await evaluate('window.cameraTracks.every(t=>t.readyState==="ended")'),'Camera released after Escape');
 await evaluate('navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException("Permission denied","NotAllowedError"))');await clickText('Chấm vào','main button');
 await until(()=>evaluate('document.querySelector("[role=dialog]")?.textContent.includes("Chưa được cấp quyền camera")'),'Camera denied message');
 await evaluate('navigator.mediaDevices.getUserMedia=window.originalGetUserMedia');
 await chooseFixturePhoto('text/plain');await until(()=>evaluate('document.querySelector("[role=dialog]")?.textContent.includes("Ảnh cần ở định dạng")'),'Reject non-image');
 await chooseFixturePhoto('image/png',true);await until(()=>evaluate('!!document.querySelector("[role=dialog] .notice-error")&&!document.querySelector(".photo-preview img")'),'Reject corrupt image');
 await chooseFixturePhoto();await until(()=>evaluate('!!document.querySelector(".photo-preview img")'),'Library works after camera denied');
 // A GPS failure keeps the photo, writes no event/queue and can be retried.
 const postsBeforeGps=postCount;
 for(const code of [1,2,3]) {
   await evaluate(`navigator.geolocation.getCurrentPosition=(success,error)=>error({code:${code}})`);
   await clickText('Xác nhận chấm vào');
   await until(()=>evaluate('!!document.querySelector("[role=dialog] .notice-error")'),'GPS error '+code);
   assert(await evaluate('!!document.querySelector(".photo-preview img")'),'Photo retained on GPS error');
   assert.equal(postCount,postsBeforeGps,'GPS failure sends no event');
 }
 await screenshot('employee-gps-denied-390');
 await evaluate(mockGps);
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await until(()=>evaluate('!navigator.onLine'),'Offline');
 await clickText('Xác nhận chấm vào');
 await until(()=>evaluate('document.body.innerText.includes("Đã lưu trên thiết bị")'),'Local queue save');
 assert(await evaluate('document.querySelector(".reference-week .today")?.classList.contains("checked")'),'Offline day counted in weekly summary');
 const readQueue=`(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('marixa-attendance-queue',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const rows=await new Promise((resolve,reject)=>{const r=db.transaction('events','readonly').objectStore('events').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();return rows.map(r=>({key:r.idempotency_key,owner:r.employee_id,photoSize:r.photo?.size,latitude:r.latitude,longitude:r.longitude,accuracy:r.accuracy_m,status:r.status}));})()`;
 const queued=await evaluate(readQueue);assert.equal(queued.length,1);assert.equal(queued[0].owner,people[0].id);assert(queued[0].photoSize>0&&queued[0].photoSize<=200000);assert.equal(queued[0].latitude,10.77);assert.equal(queued[0].accuracy,10);
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
 console.log('PASS merge features: Excel result/errors, UTC partial lunch, camera capture/release/cancel/permission denied, offline weekly count');
 writeFileSync(path.join(artifacts,process.env.UI_ROLES||process.env.UI_ROUTES?'report-subset.json':'report.json'),JSON.stringify({environment:'Local synthetic UI fixtures. Not a Supabase/RLS/device test.',mode:production?'production':'development',performance:performanceReport,matrix:report,interactions:'pass',offlineQueue:'Owner/key/photo retained across reload; photo failure and retry reuse same event in local fixture.'},null,2));
 writeGallery(artifacts);
} catch(error) {
 if(socket?.readyState===1){console.error(await evaluate('({path:location.pathname,text:document.body.innerText.slice(0,1800)})').catch(()=>null));await screenshot('failure').catch(()=>{});}
 console.error(error);if(failures.length)console.error(failures);process.exitCode=1;
} finally {
 socket?.close();chrome?.kill();next?.kill();mock.close();mock.closeAllConnections();await pause(800);
 const resolved=path.resolve(profile);if(!resolved.startsWith(path.resolve(tmpdir())+path.sep)||!path.basename(resolved).startsWith('marixa-ui-redesign-'))throw new Error('Unsafe browser cleanup target');
 rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
