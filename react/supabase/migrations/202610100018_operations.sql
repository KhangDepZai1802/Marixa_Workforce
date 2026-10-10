-- Operational records have no employee payload or secrets.
create table public.maintenance_runs (
  id uuid primary key, job text not null, trigger_source text not null,
  started_at timestamptz not null default now(), finished_at timestamptz,
  status text not null check(status in ('running','succeeded','failed')),
  deleted_count integer not null default 0, accrued_count integer not null default 0,
  error_code text
);
alter table public.maintenance_runs enable row level security;
revoke all on public.maintenance_runs from anon, authenticated;
grant select on public.maintenance_runs to authenticated;
grant all on public.maintenance_runs to service_role;
create policy maintenance_admin_read on public.maintenance_runs for select to authenticated
  using ((select public.current_role()) = 'admin');

create or replace function public.finalize_photo_retention(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  -- Serialize with period locking; never change a locked event or snapshot.
  perform id from public.timesheet_periods order by id for share;
  update public.attendance_events e set evidence_status='expired', updated_at=now()
  where exists(select 1 from public.attendance_photos p where p.id=any(p_ids)
    and p.attendance_event_id=e.id and p.expires_at<=now())
  and not exists(select 1 from public.timesheet_periods t where t.status='locked'
    and t.year=extract(year from e.work_date) and t.month=extract(month from e.work_date));
  update public.attendance_photos set deleted_at=now()
    where id=any(p_ids) and deleted_at is null and expires_at<=now();
  get diagnostics v_count=row_count;
  return v_count;
end; $$;
revoke all on function public.finalize_photo_retention(uuid[]) from public,anon,authenticated;
grant execute on function public.finalize_photo_retention(uuid[]) to service_role;

create or replace function public.operations_metrics()
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object(
    'database_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects),
    'photo_pending', (select count(*) from public.attendance_events where evidence_status='pending'),
    'photo_failed', (select count(*) from public.attendance_events where evidence_status='failed'),
    'sync_review', (select count(*) from public.attendance_events where source='offline' and review_status='needs_review'),
    'expired_remaining', (select count(*) from public.attendance_photos where deleted_at is null and expires_at<=now())
  );
$$;
revoke all on function public.operations_metrics() from public,anon,authenticated;
grant execute on function public.operations_metrics() to service_role;

-- Historical snapshots keep a NULL classification; do not guess from today's calendar.
alter table public.timesheet_days add column overtime_kind text
  check(overtime_kind in ('automatic_rest_day','approved_workday','none'));

create or replace function public.replace_timesheet_snapshot(p_period_id uuid,p_version integer,p_actor_id uuid,p_days jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_period public.timesheet_periods%rowtype; v_count integer;
begin
  select * into v_period from public.timesheet_periods where id=p_period_id for update;
  if not found or v_period.status<>'open' or v_period.version<>p_version then
    raise exception using errcode='40001',message='period version changed or is not open';
  end if;
  if jsonb_typeof(p_days)<>'array' then raise exception using errcode='22023',message='snapshot rows must be an array'; end if;
  delete from public.timesheet_exception_reviews where period_id=p_period_id and snapshot_version=p_version;
  delete from public.timesheet_days where period_id=p_period_id and snapshot_version=p_version;
  insert into public.timesheet_days(
    period_id,employee_id,work_date,regular_minutes,overtime_minutes,overtime_kind,leave_days,late_minutes,early_minutes,
    exceptions,source_revision,snapshot_version,employee_code_snapshot,full_name_snapshot,department_snapshot,
    previous_period_regular_adjustment,previous_period_overtime_adjustment,previous_period_source_period_id
  )
  select p_period_id,d.employee_id,d.work_date,d.regular_minutes,d.overtime_minutes,d.overtime_kind,d.leave_days,d.late_minutes,d.early_minutes,
    coalesce(d.exceptions,'[]'::jsonb),d.source_revision,p_version,d.employee_code_snapshot,d.full_name_snapshot,d.department_snapshot,
    coalesce(d.previous_period_regular_adjustment,0),coalesce(d.previous_period_overtime_adjustment,0),d.previous_period_source_period_id
  from jsonb_to_recordset(p_days) as d(
    employee_id uuid,work_date date,regular_minutes integer,overtime_minutes integer,overtime_kind text,leave_days numeric,
    late_minutes integer,early_minutes integer,exceptions jsonb,source_revision text,
    employee_code_snapshot text,full_name_snapshot text,department_snapshot text,
    previous_period_regular_adjustment integer,previous_period_overtime_adjustment integer,previous_period_source_period_id uuid
  );
  get diagnostics v_count=row_count;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json)
    values(p_actor_id,'timesheet.snapshot_rebuilt','timesheet_period',p_period_id,jsonb_build_object('version',p_version,'days',v_count));
  return v_count;
end;
$$;
revoke all on function public.replace_timesheet_snapshot(uuid,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.replace_timesheet_snapshot(uuid,integer,uuid,jsonb) to service_role;
