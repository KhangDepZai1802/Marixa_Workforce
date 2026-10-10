#!/usr/bin/env node
// Run against an already built production-local server, never a deployment or production DB.
import { spawnSync } from 'node:child_process';
import { readEnv } from './backup.mjs';
if (readEnv().NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co') throw new Error('TEST only.');
const scripts = ['verify-phase2.mjs','verify-phase2-schema.mjs','verify-phase2-roles.mjs',
  'verify-phase3-auth.mjs','verify-session-refresh.mjs','verify-work-policy-version.mjs','verify-phase4.mjs',
  'verify-phase5-db.mjs','verify-phase5-browser.mjs','verify-phase5-api.mjs',
  'verify-phase6-db.mjs','verify-phase6-api.mjs','verify-phase7.mjs','verify-phase3-bundle.mjs'];
const start = process.argv[2] ? scripts.indexOf(process.argv[2]) : 0;
if (start < 0) throw new Error('Unknown resume script.');
for (const script of scripts.slice(start)) {
  console.log(`RUN ${script}`);
  const result = spawnSync(process.execPath, [`supabase/${script}`], { stdio: 'inherit', windowsHide: true,
    env: { ...process.env, VERIFY_BASE_URL: 'http://localhost:3001', PHASE4_BASE_URL:'http://localhost:3001', PHASE5_BASE_URL:'http://localhost:3001' } });
  if (result.status !== 0) { process.exitCode = result.status || 1; break; }
}
