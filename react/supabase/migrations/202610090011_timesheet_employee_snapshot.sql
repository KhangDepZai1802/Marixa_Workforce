alter table public.timesheet_days add column if not exists employee_code_snapshot text;
alter table public.timesheet_days add column if not exists full_name_snapshot text;
alter table public.timesheet_days add column if not exists department_snapshot text;

create or replace function public.replace_timesheet_snapshot(p_period_id uuid,p_version integer,p_actor_id uuid,p_days jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_period public.timesheet_periods%rowtype; v_count integer;
begin
  select * into v_period from public.timesheet_periods where id=p_period_id for update;
  if not found or v_period.status <> 'open' or v_period.version <> p_version then raise exception using errcode='40001',message='period version changed or is not open'; end if;
  if jsonb_typeof(p_days) <> 'array' then raise exception using errcode='22023',message='snapshot rows must be an array'; end if;
  delete from public.timesheet_exception_reviews where period_id=p_period_id and snapshot_version=p_version;
  delete from public.timesheet_days where period_id=p_period_id and snapshot_version=p_version;
  insert into public.timesheet_days(period_id,employee_id,work_date,regular_minutes,overtime_minutes,leave_days,late_minutes,early_minutes,exceptions,source_revision,snapshot_version,employee_code_snapshot,full_name_snapshot,department_snapshot)
  select p_period_id,d.employee_id,d.work_date,d.regular_minutes,d.overtime_minutes,d.leave_days,d.late_minutes,d.early_minutes,coalesce(d.exceptions,'[]'::jsonb),d.source_revision,p_version,d.employee_code_snapshot,d.full_name_snapshot,d.department_snapshot
  from jsonb_to_recordset(p_days) as d(employee_id uuid,work_date date,regular_minutes integer,overtime_minutes integer,leave_days numeric,late_minutes integer,early_minutes integer,exceptions jsonb,source_revision text,employee_code_snapshot text,full_name_snapshot text,department_snapshot text);
  get diagnostics v_count = row_count;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
  values(p_actor_id,'timesheet.snapshot_rebuilt','timesheet_period',p_period_id,jsonb_build_object('version',p_version,'days',v_count));
  return v_count;
end; $$;
revoke all on function public.replace_timesheet_snapshot(uuid,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.replace_timesheet_snapshot(uuid,integer,uuid,jsonb) to service_role;
