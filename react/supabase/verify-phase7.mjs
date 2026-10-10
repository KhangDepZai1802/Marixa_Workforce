#!/usr/bin/env node
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync, unlinkSync } from 'node:fs';
import { Client } from 'pg';
import * as fontkit from 'fontkit';
import { readEnv, serviceFor, connection, createBackup, decryptBackup } from './backup.mjs';
import { restoreDrill } from './restore-drill.mjs';

const env = readEnv(), credentials = JSON.parse(readFileSync('.env.phase2.local', 'utf8'));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co' || credentials.ref !== 'pkpwcpatuslfjyoivbuf') throw new Error('TEST only.');
const service = serviceFor(env), db = new Client(connection(env));
const base = 'http://localhost:3001', suffix = randomUUID().slice(0, 8);
const need = (r, label) => { if (r.error) throw new Error(`${label}: ${r.error.code ?? r.error.message}`); return r.data; };
const cookies = {};
async function request(route, role = 'admin', body) {
  return fetch(base + route, { method: body === undefined ? 'GET' : 'POST', headers: { Origin: base, Cookie: cookies[role] ?? '', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}
let employeeId, leaveId, periodId, ledgerId, backupFile;
const eventIds = [], photoIds = [], photoPaths = [], runIds = [];
try {
  await db.connect();
  for (const [role, phone, code] of [['a','0990000101','TEST-P2-A'],['b','0990000102','TEST-P2-B'],['hr','0990000103','TEST-P2-HR'],['admin','0990000104','TEST-P2-ADMIN']]) {
    const r = await fetch(base + '/api/v1/auth/login', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password: credentials.passwords[code] }) });
    assert.equal(r.status, 200, `login ${role}`); cookies[role] = r.headers.getSetCookie().map(v => v.split(';')[0]).join('; ');
  }
  for (const role of ['a','b','hr']) assert.equal((await request('/api/v1/admin/operations', role)).status, 403);
  assert.equal((await request('/api/v1/admin/operations', 'anon')).status, 401);
  const operations = await request('/api/v1/admin/operations'); assert.equal(operations.status, 200);
  assert((await operations.json()).data.database_bytes > 0);
  assert.equal((await request('/api/cron/cleanup-photos', 'anon')).status, 401);
  assert.equal((await request('/api/cron/cleanup-photos', 'hr', {})).status, 403);
  assert.equal((await request('/api/v1/reports/summary?month=2094-02&scope=all','a')).status, 403);
  assert.equal((await request('/api/v1/reports/summary?month=broken','a')).status, 422);
  console.log('PASS operations/report/cron authorization and input validation');
  const accounts = need(await service.from('app_users').select('id,role,employee_id'), 'accounts');
  const admin = accounts.find(a => a.role === 'admin'), hr = accounts.find(a => a.role === 'hr');
  const owner = need(await service.from('employees').select('id').eq('employee_code','TEST-P2-A').single(),'owner');
  const leaveType = need(await service.from('leave_types').select('id').eq('deducts_annual_balance',false).limit(1).single(),'leave type');
  leaveId = need(await service.from('leave_requests').insert({ employee_id: owner.id, leave_type_id: leaveType.id, start_date:'2094-02-01',end_date:'2094-02-01', day_parts:[{date:'2094-02-01',part:'full'}],total_days:1,reason:'Kiểm chứng PDF Phase 7',status:'approved',version:2,reviewer_id:hr.id,reviewed_at:new Date().toISOString() }).select('id').single(),'create leave').id;
  for (const role of ['a','hr','admin']) {
    const pdf = await request(`/api/v1/leave-requests/${leaveId}.pdf`,role); assert.equal(pdf.status,200,`PDF ${role}`);
    const bytes = Buffer.from(await pdf.arrayBuffer()); assert.equal(bytes.subarray(0,4).toString(),'%PDF'); assert(bytes.length > 5000);
    assert(pdf.headers.get('content-disposition').includes('-v2.pdf'));
  }
  assert.equal((await request(`/api/v1/leave-requests/${leaveId}.pdf`,'b')).status,404);
  assert.equal((await request(`/api/v1/leave-requests/${leaveId}.pdf`,'anon')).status,401);
  const font = fontkit.openSync('assets/fonts/BeVietnamPro-Regular.ttf');
  assert([...('MARIXA ĐƠN XIN NGHỈ Người xét duyệt Nguyễn Trần 0123456789')].every(c => font.hasGlyphForCodePoint(c.codePointAt(0))));
  console.log('PASS PDF owner/HR/admin, cross-employee denial, embedded complete Vietnamese font, version');
  employeeId = need(await service.from('employees').insert({employee_code:`P7-${suffix}`,full_name:'Phase 7 fixture',work_email:`p7-${suffix}@example.invalid`,department:`Phase7-${suffix}`}).select('id').single(),'fixture employee').id;
  periodId = need(await service.from('timesheet_periods').insert({year:2094,month:2,status:'open'}).select('id').single(),'period').id;
  ledgerId = need(await service.from('leave_ledger').insert({employee_id:employeeId,year:2094,amount_days:1,entry_type:'grant',reason:'Phase 7 restore fixture',created_by:admin.id}).select('id').single(),'ledger').id;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YhJ2ioAAAAASUVORK5CYII=','base64');
  for (const [index, kind] of ['check_in','check_out'].entries()) {
    const id = need(await service.from('attendance_events').insert({employee_id:employeeId,work_date:'2094-02-01',kind,occurred_at:`2094-02-01T${index?'17':'08'}:00:00+07:00`,source:'online',idempotency_key:randomUUID(),evidence_status:'pending',review_status:'reviewed'}).select('id').single(),'event').id; eventIds.push(id);
    const storagePath = `${employeeId}/2094/02/01/${id}.png`; photoPaths.push(storagePath);
    need(await service.storage.from('attendance-photos').upload(storagePath,png,{contentType:'image/png'}),'upload fixture');
    photoIds.push(need(await service.from('attendance_photos').insert({attendance_event_id:id,storage_path:storagePath,mime_type:'image/png',bytes:png.length,expires_at:index?'2099-01-01T00:00:00Z':'2001-01-01T00:00:00Z'}).select('id').single(),'photo').id);
  }
  const listing = await request(`/api/v1/hr/attendance?department=Phase7-${suffix}&page_size=1&page=2`,'hr');
  assert.equal(listing.status,200); const page = await listing.json(); assert.equal(page.page.total,2);assert.equal(page.data.length,1);
  need(await service.from('timesheet_days').insert({period_id:periodId,employee_id:employeeId,work_date:'2094-02-01',regular_minutes:480,overtime_minutes:0,overtime_kind:'none',source_revision:'phase7',snapshot_version:1}),'snapshot');
  need(await service.from('timesheet_adjustments').insert({employee_id:employeeId,source_event_id:eventIds[0],source_period_id:periodId,target_period_id:periodId,work_date:'2094-02-01',reason:'Isolated backup integrity fixture'}),'adjustment fixture');
  // Archive/restore before maintenance so event, ledger, photo and adjustment counts are nonzero.
  backupFile = `.backups/phase7-${suffix}.marixa-backup`; const passphrase = randomBytes(32).toString('base64url');
  const backup = await createBackup(env,passphrase,backupFile);
  assert(backup.tables.attendance_events.count && backup.tables.leave_ledger.count && backup.tables.timesheet_adjustments.count && backup.objects.length);
  assert.throws(() => decryptBackup(backupFile,'wrong-password'), 'wrong key must not decrypt');
  await restoreDrill(env,backupFile,passphrase);
  need(await service.from('timesheet_periods').update({status:'locked'}).eq('id',periodId),'lock fixture');
  const before = need(await service.from('timesheet_days').select('*').eq('period_id',periodId),'before snapshot');
  for (let i=0;i<2;i++) {
    const r = await request('/api/cron/cleanup-photos','admin',{}); const result=await r.json(); if(result.request_id)runIds.push(result.request_id);
    assert.equal(r.status,200,`cleanup: ${result.error?.code}`); if(i===1)assert.equal(result.data.deleted,0,'idempotent/no expired photos');
  }
  assert(need(await service.from('attendance_photos').select('deleted_at').eq('id',photoIds[0]).single(),'expired metadata').deleted_at);
  assert.equal(need(await service.from('attendance_events').select('id').eq('id',eventIds[0]).single(),'event survives').id,eventIds[0]);
  assert.deepEqual(need(await service.from('timesheet_days').select('*').eq('period_id',periodId),'after snapshot'),before);
  const removed = await service.storage.from('attendance-photos').download(photoPaths[0]); assert(removed.error,'expired object removed');
  assert(need(await service.from('maintenance_runs').select('status').in('id',runIds),'runs').every(r=>r.status==='succeeded'));
  console.log('PASS retention retry/empty batch, persisted logs, event and locked snapshot preserved');
} finally {
  // Only fixture identifiers are removed. Unlock fixture with test DB trigger handling in a transaction.
  if (periodId) {
    await db.query('begin');
    await db.query("set local session_replication_role='replica'");
    await db.query("update public.timesheet_periods set status='open' where id=$1",[periodId]);
    await db.query('delete from public.timesheet_adjustments where employee_id=$1',[employeeId]);
    await db.query('delete from public.timesheet_days where period_id=$1',[periodId]);
    await db.query('commit');
  }
  if(photoPaths.length)need(await service.storage.from('attendance-photos').remove(photoPaths),'cleanup objects');
  if(photoIds.length)need(await service.from('attendance_photos').delete().in('id',photoIds),'cleanup photos');
  if(eventIds.length)need(await service.from('attendance_events').delete().in('id',eventIds),'cleanup events');
  if(leaveId)need(await service.from('leave_requests').delete().eq('id',leaveId),'cleanup leave');
  if(ledgerId)need(await service.from('leave_ledger').delete().eq('id',ledgerId),'cleanup ledger');
  if(periodId)need(await service.from('timesheet_periods').delete().eq('id',periodId),'cleanup period');
  const ids=[employeeId,leaveId,periodId,ledgerId,...eventIds,...photoIds].filter(Boolean);
  if(ids.length)need(await service.from('audit_logs').delete().in('entity_id',ids),'cleanup audit');
  if(employeeId)need(await service.from('employees').delete().eq('id',employeeId),'cleanup employee');
  if(runIds.length)need(await service.from('maintenance_runs').delete().in('id',runIds),'cleanup runs');
  if(backupFile) { try { unlinkSync(backupFile); } catch {} }
  await db.end();
}
