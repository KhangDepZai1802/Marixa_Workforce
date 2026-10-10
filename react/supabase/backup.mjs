#!/usr/bin/env node
// No Docker. Dump only application-owned public schema; copy Storage separately.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

export function readEnv(file = '.env.local') {
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).flatMap(line => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    return match ? [[match[1], match[2].trim().replace(/^(["'])(.*)\1$/, '$2')]] : [];
  }));
}
export function connection(env) {
  const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
  if (!['pkpwcpatuslfjyoivbuf', 'vmpsfwwfgoeritayfnvv'].includes(ref)) throw new Error('Unknown project reference.');
  const password = env.SUPABASE_DB_PASSWORD || (ref === 'pkpwcpatuslfjyoivbuf' ? env.SUPABASE_TEST_DB_PASSWORD : undefined);
  if (!password) throw new Error('Missing database password in local environment file.');
  return { host: env.SUPABASE_DB_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com', port: 5432,
    user: `postgres.${ref}`, database: 'postgres', password, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 };
}
export const serviceFor = env => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
export function pgCommand(program, args, config, input) {
  const result = spawnSync(program, args, { input, maxBuffer: 256 * 1024 * 1024, windowsHide: true,
    env: { ...process.env, PGHOST: config.host, PGPORT: String(config.port), PGUSER: config.user,
      PGDATABASE: config.database, PGPASSWORD: config.password, PGSSLMODE: 'require', PGCONNECT_TIMEOUT: '15' } });
  if (result.error || result.status !== 0) {
    // Keep raw SQL/credentials out of logs.
    const diagnostic = String(result.stderr ?? '').match(/(?:ERROR|FATAL):[^\r\n]+/g)?.map(line => line.replace(/"[^"]*"/g, '"[identifier]"')).join(' ') ?? '';
    throw new Error(`${program} failed (${result.status ?? result.error?.code}). ${diagnostic}`);
  }
  return result.stdout;
}
export const hash = data => createHash('sha256').update(data).digest('hex');
export async function fingerprints(db, schema = 'public') {
  if (!/^(public|restore_[a-f0-9]+)$/.test(schema)) throw new Error('Unsafe schema name.');
  const tables = (await db.query('select tablename from pg_tables where schemaname=$1 order by tablename', [schema])).rows;
  const output = {};
  for (const { tablename } of tables) {
    if (!/^[a-z_]+$/.test(tablename)) throw new Error('Unexpected table name.');
    output[tablename] = (await db.query(`select count(*)::int as count,
      md5(coalesce(string_agg(row_to_json(t)::text, E'\n' order by row_to_json(t)::text),'')) as digest from ${schema}.${tablename} t`)).rows[0];
  }
  return output;
}
export async function createBackup(env, passphrase, output) {
  if (!passphrase || passphrase.length < 20) throw new Error('BACKUP_PASSPHRASE must have at least 20 characters.');
  const config = connection(env), db = new Client(config), service = serviceFor(env);
  await db.connect();
  try {
    await db.query('begin isolation level repeatable read read only');
    const snapshot = (await db.query('select pg_export_snapshot() as id')).rows[0].id;
    const dump = pgCommand('pg_dump', ['--no-password', '--format=custom', '--schema=public', '--no-owner', `--snapshot=${snapshot}`], config);
    const tables = await fingerprints(db);
    const photos = (await db.query('select storage_path,mime_type,expires_at from public.attendance_photos where deleted_at is null and (expires_at is null or expires_at>now()) order by storage_path')).rows;
    const objects = [];
    for (const photo of photos) {
      const { data, error } = await service.storage.from('attendance-photos').download(photo.storage_path);
      if (error) throw new Error('A live photo could not be backed up; retry in a quiet maintenance window.');
      const bytes = Buffer.from(await data.arrayBuffer());
      objects.push({ ...photo, sha256: hash(bytes), data: bytes.toString('base64') });
    }
    const accounts = (await db.query('select a.id,a.auth_user_id,a.employee_id,a.role,a.status,u.email from public.app_users a join auth.users u on u.id=a.auth_user_id order by a.id')).rows;
    const payload = { version: 1, project: new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0], created_at: new Date().toISOString(),
      dump: dump.toString('base64'), dump_sha256: hash(dump), tables, objects, accounts };
    const salt = randomBytes(16), iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', scryptSync(passphrase, salt, 32), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
    writeFileSync(output, Buffer.concat([Buffer.from('MARIXA01'), salt, iv, cipher.getAuthTag(), ciphertext]), { flag: 'wx', mode: 0o600 });
    await db.query('commit');
    console.log(`PASS encrypted backup: ${Object.keys(tables).length} tables, ${objects.length} live photos, ${accounts.length} account mappings`);
    return payload;
  } finally { await db.end(); }
}
export function decryptBackup(file, passphrase) {
  const bytes = readFileSync(file);
  if (bytes.subarray(0, 8).toString() !== 'MARIXA01') throw new Error('Unknown backup format.');
  const decipher = createDecipheriv('aes-256-gcm', scryptSync(passphrase, bytes.subarray(8, 24), 32), bytes.subarray(24, 36));
  decipher.setAuthTag(bytes.subarray(36, 52));
  const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(52)), decipher.final()]).toString());
  if (payload.version !== 1 || hash(Buffer.from(payload.dump, 'base64')) !== payload.dump_sha256) throw new Error('Backup integrity check failed.');
  return payload;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const env = readEnv(process.argv[2] || '.env.local');
  const output = process.argv[3];
  if (!output) throw new Error('Usage: node supabase/backup.mjs <ignored-env-file> <output.marixa-backup>');
  await createBackup(env, process.env.BACKUP_PASSPHRASE || env.BACKUP_PASSPHRASE, output);
}
