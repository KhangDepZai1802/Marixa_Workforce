// Synthetic UI data only. Never imported by the application or sent to a cloud project.
export const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const month=today.slice(0,7), stamp=today+'T08:00:00+07:00';
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
export const people=['employee','hr','admin'].map((role,i)=>({id:uuid(i+1),auth_user_id:uuid(i+11),employee_code:'MX00'+(i+1),full_name:['Nguyễn Minh Anh','Trần Hoàng Phương','Lê Thanh Bình'][i],phone:'099000010'+[1,3,4][i],work_email:role+'@example.invalid',department:['Kế toán','Nhân sự','Điều hành'][i],job_title:['Chuyên viên kế toán','Trưởng phòng nhân sự','Quản trị hệ thống'][i],hire_date:'2026-01-05',status:'active',role}));
export function account(role) { const p=people.find(p=>p.role===role); return {id:uuid(21+people.indexOf(p)),employee_id:p.id,auth_user_id:p.auth_user_id,role,status:'active',must_change_password:false,employees:p,created_at:stamp}; }
export function user(role) { const p=people.find(p=>p.role===role); return {id:p.auth_user_id,email:p.work_email,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:stamp}; }
export function session(role) { const u=user(role), payload={sub:u.id,exp:Math.floor(Date.now()/1000)+86400,iat:Math.floor(Date.now()/1000),aud:'authenticated',role:'authenticated',email:u.email}; return {access_token:Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.dGVzdC1zaWduYXR1cmU',refresh_token:'local-ui-fixture',token_type:'bearer',expires_in:86400,expires_at:payload.exp,user:u}; }
export const policy={id:uuid(30),effective_from:'2026-01-01',effective_to:null,start_time:'08:00:00',lunch_start:'12:00:00',lunch_end:'13:00:00',end_time:'17:00:00',working_weekdays:[1,2,3,4,5,6],late_grace_minutes:0,photo_retention_days:90};
const types=[{id:uuid(31),code:'ANNUAL',name:'Nghỉ phép năm',deducts_annual_balance:true,active:true},{id:uuid(32),code:'UNPAID',name:'Nghỉ không lương',deducts_annual_balance:false,active:true}];
export const period={id:uuid(40),year:Number(today.slice(0,4)),month:Number(today.slice(5,7)),status:'hr_reviewed',version:2};
const requests=people.flatMap((p,j)=>Array.from({length:5},(_,i)=>({id:uuid(100+j*10+i),employee_id:p.id,employees:p,leave_types:types[0],leave_type_id:types[0].id,start_date:month+'-'+String(i+18).padStart(2,'0'),end_date:month+'-'+String(i+18).padStart(2,'0'),day_parts:[{date:month+'-'+String(i+18).padStart(2,'0'),part:'full'}],total_days:1,status:i===4?'approved':'pending',reason:i===0?'Xin nghỉ để giải quyết việc gia đình đã lên lịch. Đã bàn giao báo cáo và lịch họp cho đồng nghiệp phụ trách.':'Giải quyết việc cá nhân',created_at:stamp,review_note:null,version:1})));
const overtime=people.map((p,i)=>({id:uuid(151+i),employee_id:p.id,employees:p,work_date:today,start_at:today+'T17:30:00+07:00',end_at:today+'T19:00:00+07:00',status:'pending',reason:'Hoàn thiện báo cáo cuối tháng',review_note:null,created_at:stamp}));
const corrections=people.map((p,i)=>({id:uuid(161+i),employee_id:p.id,employees:p,work_date:today,proposed_check_in:stamp,proposed_check_out:today+'T17:00:00+07:00',status:'pending',reason:'Quên chấm ra sau cuộc họp với khách hàng',review_note:null,created_at:stamp}));
export const events=people.flatMap((p,j)=>Array.from({length:10},(_,i)=>({id:uuid(200+j*20+i),employee_id:p.id,employees:p,kind:i%2?'check_out':'check_in',work_date:month+'-'+String(Math.floor(i/2)+1).padStart(2,'0'),occurred_at:month+'-'+String(Math.floor(i/2)+1).padStart(2,'0')+(i%2?'T17:00:00+07:00':'T08:00:00+07:00'),device_occurred_at:stamp,received_at:stamp,source:i===0?'offline':'online',evidence_status:i===0?'pending':'not_provided',review_status:i===0?'needs_review':'reviewed',location_flag:i===0?'outside':'unknown',latitude:null,longitude:null,distance_m:null,attendance_photos:null})));
const days=people.flatMap((p,j)=>Array.from({length:28},(_,i)=>({id:uuid(300+j*30+i),employee_id:p.id,period_id:period.id,work_date:month+'-'+String(i+1).padStart(2,'0'),regular_minutes:480,overtime_minutes:i===4?90:0,overtime_kind:i===4?'approved_workday':'none',leave_days:0,late_minutes:i===2?15:0,early_minutes:0,exceptions:i===2?['incomplete_attendance']:[],full_name_snapshot:p.full_name,employee_code_snapshot:p.employee_code,department_snapshot:p.department,previous_period_regular_adjustment:0,previous_period_overtime_adjustment:0,previous_period_source_period_id:null})));
const ledger=people.map((p,i)=>({id:uuid(501+i),employee_id:p.id,employees:p,year:period.year,amount_days:10,entry_type:'monthly_accrual',reason:'Cộng phép hằng tháng',created_at:stamp}));
const audit=Array.from({length:34},(_,i)=>({id:uuid(601+i),actor_user_id:account('admin').id,action:i%2?'account.updated':'timesheet.hr_reviewed',entity_type:i%2?'app_user':'timesheet_period',entity_id:period.id,before_json:i%2?{role:'employee',status:'active'}:{status:'open',version:2},after_json:i%2?{role:'hr',status:'active'}:{status:'hr_reviewed',version:2},reason:'Đối soát theo hồ sơ và phân công công việc',created_at:stamp}));
export function fixture(path,role) {
 const url=new URL(path,'http://localhost'), p=people.find(p=>p.role===role), mine=rows=>rows.filter(r=>r.employee_id===p.id);
 const wrap=data=>({data}), paged=rows=>{const size=Number(url.searchParams.get('page_size')||25),page=Number(url.searchParams.get('page')||1); return {data:rows.slice((page-1)*size,page*size),page:{number:page,size,total:rows.length}}};
 switch(url.pathname) {
 case '/api/v1/me': return wrap({account:account(role),employee:p});
 case '/api/v1/me/work-policy': return wrap(policy);
 case '/api/v1/me/attendance':
 case '/api/v1/attendance/events': return wrap(mine(events).filter(row=>(!url.searchParams.get('from')||row.work_date>=url.searchParams.get('from'))&&(!url.searchParams.get('to')||row.work_date<=url.searchParams.get('to'))));
 case '/api/v1/me/requests': return wrap({leave:mine(requests),overtime:mine(overtime),corrections:mine(corrections),leave_ledger:mine(ledger)});
 case '/api/v1/leave-types': return wrap(types);
 case '/api/v1/hr/dashboard': return wrap({date:today,active_employees:12,checked_in:10,not_checked_in:2,late:1,outside_office:1,unresolved_evidence_or_sync:2,pending_requests:8,pending_prior_period_adjustments:0,timesheet_period:period});
 case '/api/v1/hr/employees': return paged(people.filter(p=>!url.searchParams.get('q')||JSON.stringify(p).toLowerCase().includes(url.searchParams.get('q').toLowerCase())));
 case '/api/v1/hr/attendance': return paged(events);
 case '/api/v1/hr/requests': { const review=rows=>rows.filter(r=>r.status==='pending').map(r=>({...r,can_decide:r.employee_id!==p.id&&(r.employees.role!=='hr'||role==='admin')})); return wrap({leave:review(requests),overtime:review(overtime),corrections:review(corrections)}); }
 case '/api/v1/hr/timesheet-periods': return wrap([period]);
 case '/api/v1/hr/timesheet-periods/'+period.id: return wrap({period,days,exception_reviews:[]});
 case '/api/v1/hr/timesheet-adjustments': return wrap([]);
 case '/api/v1/reports/summary': return wrap({period,days:url.searchParams.get('scope')==='all'?days:mine(days)});
 case '/api/v1/admin/accounts': return wrap(people.map(p=>account(p.role)));
 case '/api/v1/admin/settings': return wrap({office_locations:[{id:uuid(35),name:'Văn phòng Marixa',latitude:10.77,longitude:106.69,radius_m:100,active:true}],work_policies:[policy],holidays:[{id:uuid(36),holiday_date:month+'-20',name:'Lịch nghỉ nội bộ',is_working_override:false}],leave_types:types});
 case '/api/v1/admin/leave-ledger': return {data:ledger,year:period.year,balances:Object.fromEntries(people.map(p=>[p.id,10]))};
 case '/api/v1/admin/audit': return paged(audit.filter(r=>!url.searchParams.get('action')||r.action.includes(url.searchParams.get('action'))));
 case '/api/v1/admin/operations': return wrap({database_bytes:40*1024*1024,storage_bytes:120*1024*1024,photo_pending:1,photo_failed:0,sync_review:1,expired_remaining:0,limits:{database_bytes:500*1024*1024,storage_bytes:1024*1024*1024},runs:[{id:uuid(900),started_at:stamp,finished_at:stamp,status:'succeeded',deleted_count:2,accrued_count:0,error_code:null}]});
 default: throw new Error('Unmapped UI fixture: '+url.pathname);
 }
}
