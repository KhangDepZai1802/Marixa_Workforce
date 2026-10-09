create or replace function public.prevent_last_active_admin_removal() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if old.role='admin' and old.status='active' and (new.role <> 'admin' or new.status <> 'active') then
    select count(*) into v_count from public.app_users where role='admin' and status='active' and id <> old.id;
    if v_count = 0 then raise exception using errcode='23514', message='cannot remove the last active admin'; end if;
  end if;
  return new;
end; $$;
create trigger preserve_one_active_admin before update of role,status on public.app_users
for each row execute function public.prevent_last_active_admin_removal();

-- Audit history is append-only for application roles.
revoke update, delete, truncate on public.audit_logs from anon, authenticated;
drop index if exists public.leave_ledger_request_once;
create unique index leave_ledger_request_once on public.leave_ledger(leave_request_id, request_version, year, entry_type) where leave_request_id is not null;
-- Employee profiles and operational settings are writable only through their
-- allowed fields; RLS remains the row-level authorization boundary.
revoke insert, update on public.employees from authenticated;
grant insert (employee_code,full_name,work_email,phone,department,job_title,hire_date) on public.employees to authenticated;
grant update (full_name,work_email,phone,department,job_title,hire_date) on public.employees to authenticated;

create or replace function public.audit_business_row() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor_id uuid; v_entity_id uuid; v_before jsonb; v_after jsonb; v_action text;
begin
  select id into v_actor_id from public.app_users where auth_user_id=(select auth.uid()) and status='active';
  if v_actor_id is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op='INSERT' then v_after := to_jsonb(new); v_entity_id := (v_after->>'id')::uuid; v_action := 'created';
  elsif tg_op='UPDATE' then v_before := to_jsonb(old); v_after := to_jsonb(new); v_entity_id := (v_after->>'id')::uuid; v_action := 'updated';
  else v_before := to_jsonb(old); v_entity_id := (v_before->>'id')::uuid; v_action := 'deleted'; end if;
  if tg_table_name='attendance_events' then
    v_before := v_before - 'latitude' - 'longitude';
    v_after := v_after - 'latitude' - 'longitude';
  end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json)
  values(v_actor_id,v_action,tg_table_name,v_entity_id,v_before,v_after);
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;
create trigger audit_employees after insert or update on public.employees for each row execute function public.audit_business_row();
create trigger audit_office_locations after insert or update on public.office_locations for each row execute function public.audit_business_row();
create trigger audit_work_policies after insert or update on public.work_policies for each row execute function public.audit_business_row();
create trigger audit_holidays after insert or update on public.holidays for each row execute function public.audit_business_row();
create trigger audit_leave_types after insert or update on public.leave_types for each row execute function public.audit_business_row();
create trigger audit_attendance_events after insert on public.attendance_events for each row execute function public.audit_business_row();
create trigger audit_leave_request_created after insert on public.leave_requests for each row execute function public.audit_business_row();
create trigger audit_overtime_request_created after insert on public.overtime_requests for each row execute function public.audit_business_row();
create trigger audit_correction_request_created after insert on public.attendance_corrections for each row execute function public.audit_business_row();
