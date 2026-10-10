#!/usr/bin/env node
// Restore a test backup into a fresh unexposed schema and private bucket on TEST only.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { connection, decryptBackup, fingerprints, hash, pgCommand, readEnv, serviceFor } from './backup.mjs';

export async function restoreDrill(env, file, passphrase) {
  if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co') throw new Error('Restore drill is TEST only.');
  const backup = decryptBackup(file, passphrase);
  // A cross-project recovery needs the explicit Auth remapping procedure in the runbook.
  if (backup.project !== 'pkpwcpatuslfjyoivbuf') throw new Error('This automated drill accepts synthetic TEST backups only.');
  const suffix = randomBytes(6).toString('hex'), schema = `restore_${suffix}`, bucket = `restore-${suffix}`;
  const config = connection(env), service = serviceFor(env), db = new Client(config);
  const need = (r, label) => { if (r.error) throw new Error(`${label}: ${r.error.code ?? 'service error'}`); return r.data; };
  let bucketCreated = false, authId;
  await db.connect();
  try {
    const sql = pgCommand('pg_restore', ['--no-owner', '--file=-'], config, Buffer.from(backup.dump, 'base64')).toString('utf8');
    if (!sql.includes('CREATE SCHEMA public;')) throw new Error('Unexpected dump schema format.');
    // Supabase's managed roles own default ACLs that the project postgres role
    // cannot alter. Existing table/function grants are restored unchanged.
    const isolated = sql.replace(/ALTER DEFAULT PRIVILEGES FOR ROLE (?!postgres\b)[^;]+;/g, '')
      .replace(/\bpublic\b/g, schema);
    assert(!/\bpublic\./.test(isolated), 'No application schema reference may escape the isolated restore');
    pgCommand('psql', ['-X', '--no-password', '-v', 'ON_ERROR_STOP=1', '--single-transaction'], config, isolated);
    assert.deepEqual(await fingerprints(db, schema), backup.tables, 'Every restored table count and content digest must match');
    console.log('PASS pg_dump/pg_restore: all table counts and content digests match');
    need(await service.storage.createBucket(bucket, { public: false }), 'create isolated restore bucket'); bucketCreated = true;
    for (const object of backup.objects) {
      const bytes = Buffer.from(object.data, 'base64'); assert.equal(hash(bytes), object.sha256);
      need(await service.storage.from(bucket).upload(object.storage_path, bytes, { contentType: object.mime_type }), 'restore object');
      const downloaded = need(await service.storage.from(bucket).download(object.storage_path), 'read restored object');
      assert.equal(hash(Buffer.from(await downloaded.arrayBuffer())), object.sha256, 'restored photo checksum');
    }
    console.log(`PASS Storage restore: ${backup.objects.length} checksums in a private isolated bucket`);
    const tables = Object.keys(backup.tables).filter(name => name !== 'app_schema_migrations');
    const rls = (await db.query('select tablename,rowsecurity from pg_tables where schemaname=$1', [schema])).rows;
    assert(tables.every(name => rls.find(row => row.tablename === name)?.rowsecurity), 'RLS survives restore');
    for (const account of backup.accounts) {
      await db.query('begin');
      await db.query('set local role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [account.auth_user_id]);
      const visible = (await db.query(`select count(*)::int as count from ${schema}.attendance_events`)).rows[0].count;
      await db.query('rollback');
      const expected = account.status !== 'active' ? 0 : account.role === 'employee'
        ? (await db.query(`select count(*)::int as count from ${schema}.attendance_events where employee_id=$1`, [account.employee_id])).rows[0].count
        : backup.tables.attendance_events.count;
      assert.equal(visible, expected, `Restored role ${account.role} must retain visibility`);
    }
    // Re-provision one lost Auth identity and relink only its restored app account.
    const employee = backup.accounts.find(account => account.role === 'employee' && account.status === 'active');
    assert(employee, 'Need a synthetic employee to verify Auth recovery');
    const password = randomBytes(24).toString('base64url') + 'aA1!';
    const email = `restore-${suffix}@example.invalid`;
    authId = need(await service.auth.admin.createUser({ email, password, email_confirm: true }), 'recreate Auth identity').user.id;
    await db.query(`update ${schema}.app_users set auth_user_id=$1,must_change_password=true where id=$2`, [authId, employee.id]);
    const recovered = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
    need(await recovered.auth.signInWithPassword({ email, password }), 'sign in recovered account');
    await db.query('begin'); await db.query('set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [authId]);
    assert.equal((await db.query(`select count(*)::int as count from ${schema}.attendance_events`)).rows[0].count, 0, 'Recovered account is gated until password change');
    await db.query('rollback');
    await db.query(`update ${schema}.app_users set must_change_password=false where id=$1`, [employee.id]);
    const expectedOwn = (await db.query(`select count(*)::int as count from ${schema}.attendance_events where employee_id=$1`, [employee.employee_id])).rows[0].count;
    await db.query('begin'); await db.query('set local role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [authId]);
    assert.equal((await db.query(`select count(*)::int as count from ${schema}.attendance_events where employee_id=$1`, [employee.employee_id])).rows[0].count, expectedOwn, 'Recovered employee can read their preserved attendance');
    const others = (await db.query(`select count(*)::int as count from ${schema}.attendance_events where employee_id<>$1`, [employee.employee_id])).rows[0].count;
    assert.equal(others, 0, 'Recovered employee cannot read others');
    await db.query('rollback');
    console.log('PASS restored RLS and Auth re-provision/link/password gate');
    return { tables: backup.tables, objects: backup.objects.length };
  } finally {
    await db.query('rollback');
    if (!/^restore_[a-f0-9]{12}$/.test(schema)) throw new Error('Unsafe cleanup schema.');
    await db.query(`drop schema if exists ${schema} cascade`);
    try {
      if (bucketCreated) {
        // emptyBucket can enqueue asynchronous deletion; remove the known paths explicitly.
        if (backup.objects.length) need(await service.storage.from(bucket).remove(backup.objects.map(object => object.storage_path)), 'remove restored objects');
        need(await service.storage.deleteBucket(bucket), 'delete isolated bucket');
      }
    } finally {
      try { if (authId) need(await service.auth.admin.deleteUser(authId), 'delete recovery fixture'); }
      finally { await db.end(); }
    }
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const env = readEnv(process.argv[2] || '.env.local');
  await restoreDrill(env, process.argv[3], process.env.BACKUP_PASSPHRASE || env.BACKUP_PASSPHRASE);
}
