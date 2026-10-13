// Explicitly selected current project; creates only disposable employee fixtures.
// Never migrates, resets, changes policies, touches existing accounts or locks a period.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {mkdirSync,createWriteStream,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {readEnv} from '../supabase/backup.mjs';

const env=readEnv(), host=new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;
assert(process.env.VERIFY_SUPABASE_REF && host===process.env.VERIFY_SUPABASE_REF+'.supabase.co','Explicit project reference must match .env.local');
const base='http://localhost:3013', origin=new URL(env.NEXT_PUBLIC_APP_URL).origin;
assert(['localhost','127.0.0.1'].includes(new URL(origin).hostname),'Local app origin required');
const service=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const artifacts=path.resolve('.artifacts/current-supabase');mkdirSync(artifacts,{recursive:true});
const fixtures=[], checks=[], cleanupErrors=[], run=randomUUID().slice(0,8);
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let server;
const need=(r,label)=>{if(r.error)throw new Error(label+': '+(r.error.code??r.error.statusCode??'failed'));return r.data;};
function check(label,passed,detail=''){checks.push({label,passed,detail});console.log((passed?'PASS ':'FAIL ')+label+(detail?' · '+detail:''));}
async function request(session,route,method='GET',body){
 const headers={Origin:origin};if(session.cookie)headers.Cookie=session.cookie;
 const form=body instanceof FormData;if(body&&!form)headers['Content-Type']='application/json';
 const response=await fetch(base+route,{method,headers,body:body?(form?body:JSON.stringify(body)):undefined,redirect:'manual',signal:AbortSignal.timeout(30000)});
 const cookies=response.headers.getSetCookie().map(x=>x.split(';',1)[0]);
 if(cookies.length)session.cookie=[...new Map([...(session.cookie??'').split('; ').filter(Boolean),...cookies].map(x=>[x.split('=')[0],x])).values()].join('; ');
 const data=await response.json().catch(()=>null);return {status:response.status,data};
}
async function fixture(role,index){
 const f={role,cookie:'',phone:'0977'+String(Math.floor(Math.random()*1000000)).padStart(6,'0'),email:`ui-${run}-${index}@example.invalid`,password:'Test-'+randomUUID()+'-9a'};fixtures.push(f);
 f.authId=need(await service.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true}),'create fixture Auth').user.id;
 f.employeeId=need(await service.from('employees').insert({employee_code:`TEST-UI-${run}-${index}`,full_name:'Kiểm thử giao diện tạm '+index,work_email:f.email,phone:f.phone,status:'active'}).select('id').single(),'create fixture employee').id;
 f.accountId=need(await service.from('app_users').insert({auth_user_id:f.authId,employee_id:f.employeeId,role,status:'active',must_change_password:false}).select('id').single(),'create fixture account').id;
 const login=await request(f,'/api/v1/auth/login','POST',{phone:f.phone,password:f.password});
 assert.equal(login.status,200,'Fixture login '+role);check('Đăng nhập '+role,true);return f;
}
try {
 const migrations=need(await service.from('app_schema_migrations').select('version'),'read migration versions').map(x=>x.version);
 const missing=readdirSync('supabase/migrations').filter(x=>x.endsWith('.sql')&&!migrations.includes(x));
 check('Migration khớp source',missing.length===0,missing.length?missing.join(', '):String(migrations.length));
 const current=need(await service.from('timesheet_periods').select('status').eq('year',Number(today.slice(0,4))).eq('month',Number(today.slice(5,7))),'read current period');
 assert(!current.some(x=>x.status!=='open'),'Attendance probe needs an open/uncreated current period');
 const log=createWriteStream(path.join(artifacts,'server.log'));
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3013'],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,...env}});
 server.stdout.pipe(log);server.stderr.pipe(log);
 let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Local server could not start');try{ready=(await fetch(base+'/login')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,300));}assert(ready,'Local server ready');
 check('API chưa đăng nhập bị chặn',(await request({},'/api/v1/me')).status===401);
 const a=await fixture('employee',1), b=await fixture('employee',2), hr=await fixture('hr',3);
 check('Sai mật khẩu bị từ chối',(await request({},'/api/v1/auth/login','POST',{phone:a.phone,password:'incorrect-test-password'})).status===401);
 for(const route of ['/api/v1/me','/api/v1/me/work-policy','/api/v1/me/attendance?from='+today+'&to='+today,'/api/v1/me/requests']){
  const r=await request(a,route);check(route,r.status===200,'HTTP '+r.status+(r.data?.error?.code?' '+r.data.error.code:''));
 }
 check('Employee không truy cập hàng đợi HR',(await request(a,'/api/v1/hr/requests')).status===403);
 check('Employee không truy cập quản trị',(await request(a,'/api/v1/admin/accounts')).status===403);
 const payload={kind:'check_in',source:'online',device_occurred_at:new Date().toISOString(),idempotency_key:randomUUID(),queue_owner_id:a.employeeId,photo_expected:true,latitude:10.77,longitude:106.69,accuracy_m:10};
 check('Thiếu ảnh bị chặn',(await request(a,'/api/v1/attendance/events','POST',{...payload,photo_expected:false})).status===422);
 check('Thiếu GPS bị chặn',(await request(a,'/api/v1/attendance/events','POST',{...payload,latitude:null,longitude:null,accuracy_m:null})).status===422);
 const first=await request(a,'/api/v1/attendance/events','POST',payload);
 assert.equal(first.status,201,'Create disposable attendance');a.eventId=first.data.data.id;
 check('Chấm vào bằng API thật',true);
 const replay=await request(a,'/api/v1/attendance/events','POST',payload);check('Retry cùng khóa trả cùng event',replay.status===200&&replay.data?.data?.id===a.eventId);
 const conflict=await request(a,'/api/v1/attendance/events','POST',{...payload,idempotency_key:randomUUID()});check('Lượt trùng loại bị chặn',conflict.status===409);
 const wrongOwner=await request(b,'/api/v1/attendance/events','POST',payload);check('Queue khác chủ bị chặn',wrongOwner.status===403&&wrongOwner.data?.error?.code==='QUEUE_OWNER_MISMATCH');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YhJ2ioAAAAASUVORK5CYII=','base64');
 const form=new FormData();form.set('photo',new Blob([png],{type:'image/png'}),'fixture.png');
 const photoRoute='/api/v1/attendance/events/'+a.eventId+'/photo';
 a.photoPath=`${a.employeeId}/${first.data.data.work_date.replaceAll('-','/')}/${a.eventId}.png`;
 const upload=await request(a,photoRoute,'POST',form);check('Tải ảnh private',upload.status===201,'HTTP '+upload.status);
 if(upload.status===201){
  check('Chủ ảnh đọc được',(await request(a,photoRoute)).status===200);
  check('Nhân viên khác không đọc được ảnh',(await request(b,photoRoute)).status===404);
  check('Không đăng nhập không đọc được ảnh',(await request({},photoRoute)).status===401);
  check('HR đọc được ảnh theo quyền',(await request(hr,photoRoute)).status===200);
 }
 const direct=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 need(await direct.auth.signInWithPassword({email:b.email,password:b.password}),'direct fixture login');
 const other=await direct.from('attendance_events').select('id').eq('id',a.eventId);check('RLS ẩn event của nhân viên khác',!other.error&&other.data.length===0);
 const out=await request(a,'/api/v1/attendance/events','POST',{...payload,kind:'check_out',idempotency_key:randomUUID()});check('Chấm ra có GPS, chờ tải ảnh',out.status===201,'HTTP '+out.status);
 for(const [actor,route] of [[a,'/api/v1/reports/summary?scope=mine&month='+today.slice(0,7)],[hr,'/api/v1/hr/requests'],[hr,'/api/v1/hr/dashboard'],[hr,'/api/v1/hr/timesheet-periods']]){
  const r=await request(actor,route);check(route,r.status===200,'HTTP '+r.status+(r.data?.error?.code?' '+r.data.error.code:''));
 }
 // Only touch the temporary employee's password gate and photo metadata.
 need(await service.from('app_users').update({must_change_password:true}).eq('id',b.accountId),'set fixture password gate');
 check('API yêu cầu đổi mật khẩu',(await request(b,'/api/v1/me')).status===403);
 const passwordGate=await direct.from('employees').select('id').eq('id',b.employeeId);
 check('RLS chặn tài khoản chưa đổi mật khẩu',!!passwordGate.error||passwordGate.data.length===0);
 if(upload.status===201){
  need(await service.from('attendance_photos').update({expires_at:new Date(Date.now()-60000).toISOString()}).eq('attendance_event_id',a.eventId),'expire fixture photo');
  check('API chặn ảnh hết hạn',(await request(a,photoRoute)).status===410);
  const owner=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  need(await owner.auth.signInWithPassword({email:a.email,password:a.password}),'owner fixture login');
  const expired=await owner.storage.from('attendance-photos').download(a.photoPath);check('Storage chặn ảnh hết hạn',!!expired.error);
 }
 check('Đăng xuất',(await request(a,'/api/v1/auth/logout','POST')).status===200);
}catch(error){check('Hoàn tất kiểm thử',false,error.message);}
finally {
 for(const f of fixtures.slice().reverse())try{
  if(f.employeeId){
   const events=need(await service.from('attendance_events').select('id').eq('employee_id',f.employeeId),'read fixture events');
   const ids=events.map(x=>x.id), photos=ids.length?need(await service.from('attendance_photos').select('id,storage_path').in('attendance_event_id',ids),'read fixture photos'):[];
   const paths=[...new Set([f.photoPath,...photos.map(x=>x.storage_path)].filter(Boolean))];
   if(paths.length)need(await service.storage.from('attendance-photos').remove(paths),'remove fixture objects');
   if(photos.length)need(await service.from('attendance_photos').delete().in('id',photos.map(x=>x.id)),'remove fixture photos');
   if(ids.length)need(await service.from('attendance_events').delete().in('id',ids),'remove fixture events');
  }
  if(f.accountId){need(await service.from('audit_logs').delete().eq('actor_user_id',f.accountId),'remove fixture audit');need(await service.from('app_users').delete().eq('id',f.accountId),'remove fixture account');}
  if(f.employeeId)need(await service.from('employees').delete().eq('id',f.employeeId),'remove fixture employee');
  if(f.authId)need(await service.auth.admin.deleteUser(f.authId),'remove fixture Auth');
 }catch(error){cleanupErrors.push({employeeId:f.employeeId,authId:f.authId,accountId:f.accountId,error:error.message});}
 server?.kill();
 check('Dọn dữ liệu thử',cleanupErrors.length===0);
 writeFileSync(path.join(artifacts,'report.json'),JSON.stringify({host,createdAt:new Date().toISOString(),checks,cleanupErrors},null,2));
 if(checks.some(x=>!x.passed))process.exitCode=1;
}
