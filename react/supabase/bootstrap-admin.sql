-- Bootstrap only after creating a Supabase Auth user and an employee record.
-- Example: psql "$DATABASE_URL" -v auth_user_id="<AUTH UUID>" -v employee_id="<EMPLOYEE UUID>" -f supabase/bootstrap-admin.sql
-- The user starts with a temporary password and must change it at first sign-in.
BEGIN;
INSERT INTO public.app_users(auth_user_id, employee_id, role, status, must_change_password)
SELECT :'auth_user_id'::uuid, :'employee_id'::uuid, 'admin', 'active', true
WHERE NOT EXISTS (SELECT 1 FROM public.app_users WHERE role='admin' AND status='active');
COMMIT;
