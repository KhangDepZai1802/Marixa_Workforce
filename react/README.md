# Marixa Workforce React application

This Next.js App Router application lives in `react/`. Its Route Handlers under `src/app/api/` are the API for the application; Supabase provides PostgreSQL, Auth, and private Storage.

## Local development

Requirements: Node.js 20.9 or newer and npm.

1. Copy `.env.example` to `.env.local` and set the Supabase URL, publishable key, server-only secret key, and `NEXT_PUBLIC_APP_URL`.
2. Install packages with `npm install`.
3. Start the app with `npm run dev` and open `http://localhost:3000`.
4. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before deployment.

The app requires the migrations under `supabase/migrations/` to be applied to a Supabase project and an admin account to be provisioned before authenticated workflows can be used. Never put the server secret in a `NEXT_PUBLIC_` variable or commit `.env.local`.

## Phase 2 test project

The following scripts are locked to Supabase test project `pkpwcpatuslfjyoivbuf`. From `react/`, set `NEXT_PUBLIC_SUPABASE_URL`, the publishable key, the secret key, and `SUPABASE_TEST_DB_PASSWORD` in the ignored `.env.local`. Install PostgreSQL `psql` locally, then run:

```sh
node supabase/apply-test-migrations.mjs
node supabase/seed-phase2-test.mjs
node supabase/verify-phase2.mjs
node supabase/verify-phase2-schema.mjs
node supabase/verify-phase2-roles.mjs
node supabase/verify-phase2-event.mjs
```

For the Next.js API photo smoke test, run `npm run dev` at `http://localhost:3000` in another terminal, then run `node supabase/verify-phase2-api-photo.mjs`.

For Phase 3 access and password lifecycle checks, keep the local server running and run `node supabase/verify-phase3-auth.mjs`. This script uses only the four synthetic test accounts. It temporarily changes their password flags and the B account password/status, then restores the original test credentials in `finally` blocks. It also checks API and direct Supabase access for accounts that must change their password.

To verify shared-shift versioning, run `node supabase/verify-work-policy-version.mjs` with the local server running. The script uses the synthetic admin and HR accounts, creates one future test version, checks the previous version's end date and overlap protection, then removes the test version and restores the previous end date.

The migration script applies only missing versions and refuses an unknown existing schema. The seed script creates four synthetic accounts for access checks and saves their random passwords in ignored `react/.env.phase2.local`. The verification scripts check migration history, RLS, Storage access, idempotency, and optional photo/GPS evidence. The event and API verification leave clearly synthetic attendance events and small linked PNGs in the test project. Do not run the legacy `run-migrations.mjs` reset script for normal setup.

The test bucket and API currently limit an uploaded photo to 200,000 bytes. Phase 2 photo acceptance still requires trying a real phone photo through the app before this limit is considered final.

## Vercel

Set the Vercel project **Root Directory** to `react`. Configure the environment variables listed in `.env.example` in the Vercel project settings. Vercel will use the `build` script in this folder; `vercel.json` schedules private-photo cleanup.

The older .NET source tree outside this folder is legacy code and is not part of this application's API or Vercel deployment.

## Release and operations (2026-10-10)

Detailed Vietnamese instructions: [Vercel deployment](../docs/DEPLOY_VERCEL.md), [backup and restore runbook](../docs/OPERATIONS_RUNBOOK.md).

Use `node supabase/apply-migrations.mjs <ignored-env-file> <project-ref>` for versioned migrations; it never resets a schema. `bootstrap.mjs` provisions only the first admin, with a required password change. These production commands are prepared, not executed by the current test-only work.

For the designated Supabase test project, build with `NEXT_PUBLIC_APP_URL=http://localhost:3001`, start `next start -p 3001` with the same environment, then run:

```sh
node supabase/verify-release.mjs
node supabase/verify-phase8-browser.mjs
node supabase/verify-secrets.mjs
```

The release suite creates and cleans synthetic test fixtures. Do not point it at a deployment or a production project. `backup.mjs` creates an encrypted PostgreSQL/Storage/account-mapping package; `restore-drill.mjs` restores TEST backups into an isolated temporary schema and private bucket on TEST, verifies content and RLS, and cleans up. Its Auth drill recreates one synthetic identity; full cross-project production recovery remains an operator procedure in the runbook.

PDF uses a complete Be Vietnam Pro TTF from Google Fonts under the bundled SIL OFL license in `assets/fonts/`. App Router folder `[id]` accepts the existing `/api/v1/leave-requests/<uuid>.pdf` URL.
