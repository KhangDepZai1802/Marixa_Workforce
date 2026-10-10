-- A temporary password may establish a session so the user can change it.
-- It must not grant business data or mutation privileges through direct Supabase access.
create or replace function public.current_employee_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select employee_id from public.app_users
  where auth_user_id = (select auth.uid())
    and status = 'active' and must_change_password = false
  limit 1
$$;

create or replace function public.current_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.app_users
  where auth_user_id = (select auth.uid())
    and status = 'active' and must_change_password = false
  limit 1
$$;

drop policy if exists leave_types_read_active on public.leave_types;
create policy leave_types_read_active on public.leave_types for select to authenticated
using ((select public.current_role()) is not null and (active or (select public.current_role()) = 'admin'));

drop policy if exists policies_read on public.work_policies;
create policy policies_read on public.work_policies for select to authenticated
using ((select public.current_role()) is not null);

drop policy if exists holidays_read on public.holidays;
create policy holidays_read on public.holidays for select to authenticated
using ((select public.current_role()) is not null);

drop policy if exists locations_read on public.office_locations;
create policy locations_read on public.office_locations for select to authenticated
using ((select public.current_role()) is not null and (active or (select public.current_role()) = 'admin'));
