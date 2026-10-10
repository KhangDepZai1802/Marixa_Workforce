#!/usr/bin/env node
// HR Route Handler smoke test with fully synthetic, cleaned-up test data.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^(\"|')(.*)\1$/, '$2')]] : [];
}));
const credentials = JSON.parse(readFileSync(path.join(root, '.env.phase2.local'), 'utf8'));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co' || credentials.ref !== 'pkpwcpatuslfjyoivbuf')
  throw new Error('Only the verified synthetic test project is allowed.');
const base = process.env.PHASE5_BASE_URL || env.NEXT_PUBLIC_APP_URL;
if (!/^http:\/\/(localhost|192\.168\.)/.test(base)) throw new Error('Use only a local Next server.');
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
const need = (result, label) => { if (result.error) throw new Error(`${label}: ${result.error.code ?? result.error.message}`); return result.data; };
const check = (label, valid) => { if (!valid) throw new Error(`FAIL ${label}`); console.log(`PASS ${label}`); };
let employeeId, sourceId, targetId, openId;
const eventIds = []; const adjustmentIds = [];
const correctionIds = [];
try {
  const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0990000103', password: credentials.passwords['TEST-P2-HR'] }) });
  if (login.status !== 200) throw new Error(`HR login HTTP ${login.status}`);
  const cookie = login.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ');
  const request = async (route, body) => {
    const response = await fetch(base + route, { method: body ? 'POST' : 'GET', headers: { Origin: base, Cookie: cookie,
      ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  const suffix = randomUUID().slice(0, 8);
  employeeId = need(await service.from('employees').insert({ employee_code: `TEST-P5-API-${suffix}`,
    full_name: 'Phase 5 API fixture', work_email: `phase5-api-${suffix}@example.invalid`, status: 'active' }).select('id').single(), 'create employee').id;
  sourceId = need(await service.from('timesheet_periods').insert({ year: 2097, month: 4, status: 'locked', version: 1 }).select('id').single(), 'create locked source').id;
  targetId = need(await service.from('timesheet_periods').insert({ year: 2097, month: 5, status: 'open', version: 1 }).select('id').single(), 'create open target').id;
  need(await service.from('timesheet_days').insert({ period_id: sourceId, employee_id: employeeId, work_date: '2097-04-15',
    regular_minutes: 0, overtime_minutes: 0, source_revision: 'phase5-api', snapshot_version: 1 }), 'create locked snapshot');
  for (const [kind, time] of [['check_in', '08:00:00'], ['check_out', '17:00:00']]) {
    const timestamp = `2097-04-15T${time}+07:00`;
    const event = need(await service.from('attendance_events').insert({ employee_id: employeeId, work_date: '2097-04-15',
      kind, occurred_at: timestamp, device_occurred_at: timestamp, source: 'offline', idempotency_key: randomUUID(),
      review_status: 'needs_review', evidence_status: 'not_provided' }).select('id').single(), 'create late event');
    eventIds.push(event.id);
  }
  const proposals = need(await service.from('timesheet_adjustments').select('id').in('source_event_id', eventIds), 'read proposals');
  adjustmentIds.push(...proposals.map(row => row.id));
  check('one proposal per late event', proposals.length === 2);
  need(await service.from('timesheet_adjustments').update({ target_period_id: targetId }).in('id', adjustmentIds), 'move proposals to isolated open period');
  const listed = await request(`/api/v1/hr/timesheet-adjustments?period_id=${targetId}`);
  check('HR API shows source snapshot and recomputed day', listed.status === 200 && listed.body?.data?.length === 2 &&
    listed.body.data.every(row => row.preview?.source_snapshot?.regular_minutes === 0 && row.preview?.complete));
  const total = listed.body.data[0].preview.calculated_regular_minutes + listed.body.data[0].preview.calculated_overtime_minutes;
  check('day calculation yields 480 minutes', total === 480);
  const first = await request('/api/v1/hr/timesheet-adjustments', { adjustment_id: adjustmentIds[0], decision: 'approved', review_note: 'Đối soát Phase 5 từ snapshot gốc' });
  check('HR approves only actual difference', first.status === 200 && first.body?.data?.regular_minutes_delta + first.body?.data?.overtime_minutes_delta === 480);
  const relisted = await request(`/api/v1/hr/timesheet-adjustments?period_id=${targetId}`);
  const pending = relisted.body?.data?.find(row => row.status === 'pending_review');
  check('second event now proposes zero after compensation', relisted.status === 200 && pending &&
    pending.preview.suggested_regular_minutes_delta === 0 && pending.preview.suggested_overtime_minutes_delta === 0);
  const second = await request('/api/v1/hr/timesheet-adjustments', { adjustment_id: pending.id, decision: 'approved', review_note: 'Không cộng trùng công Phase 5' });
  check('second approval records zero difference', second.status === 200 && second.body?.data?.regular_minutes_delta === 0 && second.body?.data?.overtime_minutes_delta === 0);
  const recalculated = await request(`/api/v1/hr/timesheet-periods/${targetId}/recalculate`, {});
  check('target period recalculates with approved adjustment', recalculated.status === 200);
  const targetDetail = await request(`/api/v1/hr/timesheet-periods/${targetId}`);
  check('target snapshot separates prior-period minutes', targetDetail.status === 200 && targetDetail.body?.data?.days?.some(day =>
    day.previous_period_source_period_id === sourceId && day.previous_period_regular_adjustment + day.previous_period_overtime_adjustment === 480));
  const excelResponse = await fetch(`${base}/api/v1/reports/timesheet.xlsx?period_id=${targetId}`, { headers: { Origin: base, Cookie: cookie } });
  check('target Excel is exportable', excelResponse.status === 200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await excelResponse.arrayBuffer()));
  const sheet = workbook.getWorksheet('Bảng công');
  let foundAdjustment = false;
  sheet.eachRow((row, number) => {
    if (number <= 4) return;
    if (String(row.getCell(4).value) === '2097-04-15' && Number(row.getCell(7).value) + Number(row.getCell(8).value) === 480 && row.getCell(9).value === '04/2097') foundAdjustment = true;
  });
  check('Excel shows prior-period adjustment and source month separately', foundAdjustment);
  const snapshot = need(await service.from('timesheet_days').select('regular_minutes,overtime_minutes').eq('period_id', sourceId).eq('employee_id', employeeId).single(), 'read frozen snapshot');
  check('HR API leaves source snapshot unchanged', snapshot.regular_minutes === 0 && snapshot.overtime_minutes === 0);
  need(await service.from('timesheet_days').insert({ period_id: sourceId, employee_id: employeeId, work_date: '2097-04-16',
    regular_minutes: 480, overtime_minutes: 0, source_revision: 'phase5-correction', snapshot_version: 1 }), 'create corrected source snapshot');
  const hrAccount = need(await service.from('app_users').select('id').eq('role', 'hr').eq('status', 'active').limit(1).single(), 'read test HR account');
  const correctedIn = '2097-04-16T08:00:00+07:00';
  const correctedOut = '2097-04-16T17:00:00+07:00';
  const correction = need(await service.from('attendance_corrections').insert({ employee_id: employeeId, work_date: '2097-04-16',
    proposed_check_in: correctedIn, proposed_check_out: correctedOut, reason: 'Đơn sửa công giả Phase 5',
    status: 'approved', reviewer_id: hrAccount.id, reviewed_at: new Date().toISOString(), review_note: 'Đã bù trong kỳ gốc' }).select('id').single(), 'create approved correction');
  correctionIds.push(correction.id);
  const correctedEvent = need(await service.from('attendance_events').insert({ employee_id: employeeId, work_date: '2097-04-16',
    kind: 'check_in', occurred_at: correctedIn, device_occurred_at: correctedIn, source: 'offline',
    idempotency_key: randomUUID(), review_status: 'needs_review', evidence_status: 'not_provided' }).select('id').single(), 'create late event after correction');
  eventIds.push(correctedEvent.id);
  const correctedProposal = need(await service.from('timesheet_adjustments').select('id').eq('source_event_id', correctedEvent.id).single(), 'read corrected proposal');
  adjustmentIds.push(correctedProposal.id);
  need(await service.from('timesheet_adjustments').update({ target_period_id: targetId }).eq('id', correctedProposal.id), 'move corrected proposal');
  const correctedList = await request(`/api/v1/hr/timesheet-adjustments?period_id=${targetId}`);
  const correctedPreview = correctedList.body?.data?.find(row => row.id === correctedProposal.id)?.preview;
  check('approved correction yields zero outstanding minutes', correctedList.status === 200 &&
    correctedPreview?.approved_correction_id === correction.id && correctedPreview.suggested_regular_minutes_delta === 0 &&
    correctedPreview.suggested_overtime_minutes_delta === 0);
  const correctedDecision = await request('/api/v1/hr/timesheet-adjustments', { adjustment_id: correctedProposal.id,
    decision: 'approved', review_note: 'Đơn sửa công đã bù đủ trong kỳ gốc' });
  check('HR records corrected day with zero additional pay', correctedDecision.status === 200 &&
    correctedDecision.body?.data?.regular_minutes_delta === 0 && correctedDecision.body?.data?.overtime_minutes_delta === 0);
  openId = need(await service.from('timesheet_periods').insert({ year: 2097, month: 6, status: 'open' }).select('id').single(), 'create open source').id;
  for (const [kind, time] of [['check_in', '08:00:00'], ['check_out', '17:00:00']]) {
    const timestamp = `2097-06-15T${time}+07:00`;
    const event = need(await service.from('attendance_events').insert({ employee_id: employeeId, work_date: '2097-06-15',
      kind, occurred_at: timestamp, device_occurred_at: timestamp, source: 'offline', idempotency_key: randomUUID(),
      review_status: 'needs_review', evidence_status: 'not_provided' }).select('id').single(), 'create open-period offline event');
    eventIds.push(event.id);
  }
  const openProposals = need(await service.from('timesheet_adjustments').select('id').in('source_event_id', eventIds.slice(-2)), 'check open-period proposals');
  check('open source period creates no prior-period proposal', openProposals.length === 0);
  const openRecalculated = await request(`/api/v1/hr/timesheet-periods/${openId}/recalculate`, {});
  check('open source period recalculates normally', openRecalculated.status === 200);
  const openDetail = await request(`/api/v1/hr/timesheet-periods/${openId}`);
  check('open snapshot includes synced day', openDetail.status === 200 && openDetail.body?.data?.days?.some(day =>
    day.employee_id === employeeId && day.work_date === '2097-06-15' && day.regular_minutes + day.overtime_minutes === 480));
  console.log('Phase 5 HR API verification complete.');
} catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
finally {
  if (sourceId) need(await service.from('timesheet_periods').update({ status: 'open' }).eq('id', sourceId), 'unlock synthetic source for cleanup');
  if (adjustmentIds.length) {
    need(await service.from('audit_logs').delete().in('entity_id', adjustmentIds), 'remove adjustment audit');
    need(await service.from('timesheet_adjustments').delete().in('id', adjustmentIds), 'remove adjustments');
  }
  if (eventIds.length) need(await service.from('attendance_events').delete().in('id', eventIds), 'remove events');
  if (correctionIds.length) need(await service.from('attendance_corrections').delete().in('id', correctionIds), 'remove corrections');
  if (sourceId) need(await service.from('timesheet_days').delete().eq('period_id', sourceId), 'remove snapshot');
  if (targetId) {
    need(await service.from('timesheet_exception_reviews').delete().eq('period_id', targetId), 'remove target reviews');
    need(await service.from('timesheet_days').delete().eq('period_id', targetId), 'remove target snapshot');
    need(await service.from('audit_logs').delete().eq('entity_id', targetId), 'remove target snapshot audit');
  }
  if (openId) {
    need(await service.from('timesheet_exception_reviews').delete().eq('period_id', openId), 'remove open reviews');
    need(await service.from('timesheet_days').delete().eq('period_id', openId), 'remove open snapshot');
    need(await service.from('audit_logs').delete().eq('entity_id', openId), 'remove open snapshot audit');
    need(await service.from('timesheet_periods').delete().eq('id', openId), 'remove open period');
  }
  if (targetId) need(await service.from('timesheet_periods').delete().eq('id', targetId), 'remove target');
  if (sourceId) need(await service.from('timesheet_periods').delete().eq('id', sourceId), 'remove source');
  if (employeeId) need(await service.from('employees').delete().eq('id', employeeId), 'remove employee');
}
