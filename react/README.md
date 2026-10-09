# Marixa Workforce React application

This Next.js App Router application lives in `react/` so the repository root can keep the .NET API and project documentation separate.

## Local development

Requirements: Node.js 20.9 or newer and npm.

1. Copy `.env.example` to `.env.local` and set the Supabase URL, publishable key, server-only secret key, and `NEXT_PUBLIC_APP_URL`.
2. Install packages with `npm install`.
3. Start the app with `npm run dev` and open `http://localhost:3000`.
4. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before deployment.

The app requires the migrations under `supabase/migrations/` to be applied to a Supabase project and an admin account to be provisioned before authenticated workflows can be used. Never put the server secret in a `NEXT_PUBLIC_` variable or commit `.env.local`.

## Vercel

Set the Vercel project **Root Directory** to `react`. Configure the environment variables listed in `.env.example` in the Vercel project settings. Vercel will use the `build` script in this folder; `vercel.json` schedules private-photo cleanup.

The source tree outside this folder still contains the existing .NET application. Deploying `react/` does not deploy or replace that API.
