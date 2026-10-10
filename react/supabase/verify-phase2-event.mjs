#!/usr/bin/env node
// Creates one historical synthetic event on the test project and reuses its key on reruns.
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^(["'])(.*)\1$/, '$2')]] : [];
}));
const credentialsPath = path.join(root, '.env.phase2.local');
const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co' ||
    credentials.ref !== 'pkpwcpatuslfjyoivbuf') throw new Error('Sai project test.');
if (!credentials.eventKey) {
  credentials.eventKey = randomUUID();
  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n');
}
const makeClient = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
async function login(email, code) {
  const client = makeClient();
  const { error } = await client.auth.signInWithPassword({ email, password: credentials.passwords[code] });
  if (error) throw new Error(`Đăng nhập ${code} lỗi: ${error.message}`);
  return client;
}
let failures = 0;
function check(label, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures++;
}
const [a, b, hr] = await Promise.all([
  login('test-p2-a@example.com', 'TEST-P2-A'),
  login('test-p2-b@example.com', 'TEST-P2-B'),
  login('test-p2-hr@example.com', 'TEST-P2-HR'),
]);
const payload = { p_kind: 'check_in', p_source: 'offline',
  p_device_occurred_at: '2025-01-15T02:00:00Z', p_idempotency_key: credentials.eventKey,
  p_latitude: null, p_longitude: null, p_accuracy_m: null, p_photo_expected: false };
const first = await a.rpc('create_attendance_event', payload);
check('Event không GPS/ảnh được tạo hoặc đối chiếu', !first.error && !!first.data?.id,
  first.error?.code ?? '');
if (!first.data?.id) process.exit(1);
const event = first.data;
check('GPS nullable và ảnh không bắt buộc', event.latitude === null && event.longitude === null &&
  event.accuracy_m === null && event.evidence_status === 'not_provided');
const photos = await a.from('attendance_photos').select('id').eq('attendance_event_id', event.id);
check('Không có bản ghi ảnh giả', !photos.error && photos.data?.length === 0);
const retry = await a.rpc('create_attendance_event', payload);
check('Gửi lại cùng khóa trả cùng event', !retry.error && retry.data?.id === event.id);
const duplicate = await a.rpc('create_attendance_event', { ...payload, p_idempotency_key: randomUUID() });
check('Một check-in/ngày/người', duplicate.error?.code === '23505', duplicate.error?.code ?? '');
const crossKey = await b.rpc('create_attendance_event', payload);
check('Nhân viên B không dùng khóa của A', crossKey.error?.code === '23505', crossKey.error?.code ?? '');
const [bRead, hrRead] = await Promise.all([
  b.from('attendance_events').select('id').eq('id', event.id),
  hr.from('attendance_events').select('id').eq('id', event.id),
]);
check('B không đọc event A; HR đọc được', !bRead.error && bRead.data?.length === 0 &&
  !hrRead.error && hrRead.data?.length === 1);
const directInsert = await a.from('attendance_events').insert({ employee_id: event.employee_id,
  work_date: '2025-01-16', kind: 'check_in', occurred_at: '2025-01-16T02:00:00Z',
  source: 'offline', idempotency_key: randomUUID() });
check('Client không insert event trực tiếp', !!directInsert.error,
  directInsert.error?.code ?? '');

// A separate synthetic check-out carries a nonempty one-pixel PNG so read policies are observable.
if (!credentials.photoEventKey) {
  credentials.photoEventKey = randomUUID();
  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n');
}
const photoEventResult = await a.rpc('create_attendance_event', {
  ...payload, p_kind: 'check_out', p_source: 'online', p_device_occurred_at: null,
  p_idempotency_key: credentials.photoEventKey,
  p_photo_expected: true,
});
check('Event ảnh kiểm thử được tạo hoặc đối chiếu', !photoEventResult.error && !!photoEventResult.data?.id,
  photoEventResult.error?.code ?? '');
if (!photoEventResult.data?.id) process.exit(1);
const photoEvent = photoEventResult.data;
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YhJ2ioAAAAASUVORK5CYII=', 'base64'));
const storagePath = `${photoEvent.employee_id}/${photoEvent.work_date.replaceAll('-', '/')}/${photoEvent.id}.png`;
const existingPhoto = await a.from('attendance_photos').select('id').eq('attendance_event_id', photoEvent.id);
if (existingPhoto.error) throw new Error(`Không đọc được metadata ảnh (${existingPhoto.error.code}).`);
if (!existingPhoto.data.length) {
  const uploaded = await a.storage.from('attendance-photos').upload(storagePath, png, { contentType: 'image/png' });
  check('Upload PNG mẫu đúng đường dẫn', !uploaded.error, uploaded.error?.message ?? '');
  if (uploaded.error) process.exit(1);
  const registered = await a.rpc('register_attendance_photo', {
    p_event_id: photoEvent.id, p_storage_path: storagePath, p_mime_type: 'image/png', p_bytes: png.byteLength,
  });
  check('Gắn ảnh mẫu vào event', !registered.error && registered.data?.attendance_event_id === photoEvent.id,
    registered.error?.code ?? '');
  if (registered.error) process.exit(1);
}
const [aPhoto, bPhoto, hrPhoto, anonPhoto, ready] = await Promise.all([
  a.storage.from('attendance-photos').download(storagePath),
  b.storage.from('attendance-photos').download(storagePath),
  hr.storage.from('attendance-photos').download(storagePath),
  makeClient().storage.from('attendance-photos').download(storagePath),
  a.from('attendance_events').select('evidence_status').eq('id', photoEvent.id).single(),
]);
check('Ảnh private: chủ sở hữu và HR đọc được', !aPhoto.error && !hrPhoto.error);
check('Ảnh private: B và anon bị chặn', !!bPhoto.error && !!anonPhoto.error);
check('Event có ảnh chuyển ready', !ready.error && ready.data?.evidence_status === 'ready');
process.exitCode = failures ? 1 : 0;
