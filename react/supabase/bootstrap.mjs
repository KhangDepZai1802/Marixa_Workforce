#!/usr/bin/env node
// Creates only the first administrator and documented initial configuration. No demo seed.
import { Client } from 'pg';
import { connection, readEnv, serviceFor } from './backup.mjs';
const env = readEnv(process.argv[2] || '.env.bootstrap.local');
const ref = process.argv[3];
if (!['pkpwcpatuslfjyoivbuf','vmpsfwwfgoeritayfnvv'].includes(ref) || env.NEXT_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co`) throw new Error('Explicit project reference must match the environment file.');
if (!env.BOOTSTRAP_EMAIL?.includes('@') || !/^0\d{9}$/.test(env.BOOTSTRAP_PHONE ?? '') || !env.BOOTSTRAP_NAME?.trim() || (env.BOOTSTRAP_PASSWORD?.length ?? 0) < 12) throw new Error('Set BOOTSTRAP_EMAIL, BOOTSTRAP_PHONE (10 digits), BOOTSTRAP_NAME and BOOTSTRAP_PASSWORD (12+ characters) locally.');
const db = new Client(connection(env)), service = serviceFor(env);
let authId, committed = false;
await db.connect();
try {
  await db.query('begin');
  await db.query("select pg_advisory_xact_lock(hashtext('marixa-first-admin'))");
  if ((await db.query("select count(*)::int as n from public.app_users where role='admin' and status='active'")).rows[0].n) throw new Error('An active admin already exists; bootstrap refuses to replace it.');
  const { data, error } = await service.auth.admin.createUser({ email: env.BOOTSTRAP_EMAIL, password: env.BOOTSTRAP_PASSWORD, email_confirm: true });
  if (error || !data.user) throw new Error('Could not create Auth account. Existing email is never overwritten.');
  authId = data.user.id;
  const employee = (await db.query('insert into public.employees(employee_code,full_name,work_email,phone) values($1,$2,$3,$4) returning id', [env.BOOTSTRAP_EMPLOYEE_CODE || 'ADMIN',env.BOOTSTRAP_NAME,env.BOOTSTRAP_EMAIL,env.BOOTSTRAP_PHONE])).rows[0];
  const account = (await db.query("insert into public.app_users(auth_user_id,employee_id,role,status,must_change_password) values($1,$2,'admin','active',true) returning id",[authId,employee.id])).rows[0];
  await db.query("select set_config('request.jwt.claim.sub',$1,true)",[authId]);
  await db.query("insert into public.work_policies(effective_from,photo_retention_days) select '2000-01-01',90 where not exists(select 1 from public.work_policies)");
  await db.query("insert into public.leave_types(code,name,deducts_annual_balance) values('ANNUAL','Phép năm',true),('SICK','Nghỉ ốm',false),('UNPAID','Nghỉ không lương',false) on conflict(code) do nothing");
  await db.query("insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,reason) values($1,'admin.bootstrap','app_user',$1,'Initial administrator provisioned with mandatory password change')",[account.id]);
  await db.query('commit'); committed = true;
  console.log('PASS first admin and default policy/types created. Sign in with the configured phone and change the temporary password.');
} finally {
  if (!committed) {
    await db.query('rollback');
    if (authId) { const cleanup = await service.auth.admin.deleteUser(authId); if (cleanup.error) console.error('Auth rollback needs administrator attention; bootstrap identity could not be removed.'); }
  }
  await db.end();
}
