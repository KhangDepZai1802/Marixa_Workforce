create table public.timesheet_exception_reviews (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references public.timesheet_periods(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict, work_date date not null,
  issue_code text not null, snapshot_version integer not null, note text not null,
  reviewed_by uuid not null references public.app_users(id) on delete restrict, reviewed_at timestamptz not null default now(),
  unique(period_id,employee_id,work_date,issue_code,snapshot_version)
);
alter table public.timesheet_exception_reviews enable row level security;
revoke all on public.timesheet_exception_reviews from anon, authenticated;
grant select on public.timesheet_exception_reviews to authenticated;
create policy timesheet_exception_review_staff_read on public.timesheet_exception_reviews for select to authenticated using((select public.is_staff_or_admin()));

create or replace function public.acknowledge_timesheet_exception(p_day_id uuid,p_issue_code text,p_note text)
returns public.timesheet_exception_reviews language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_period public.timesheet_periods%rowtype; v_day public.timesheet_days%rowtype; v_review public.timesheet_exception_reviews%rowtype;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  if length(trim(coalesce(p_note,''))) < 3 then raise exception using errcode='22023',message='a review note is required'; end if;
  select * into v_day from public.timesheet_days where id=p_day_id for update;
  if not found then raise exception using errcode='P0002',message='timesheet day not found'; end if;
  select * into v_period from public.timesheet_periods where id=v_day.period_id for update;
  if v_period.status <> 'open' or v_day.snapshot_version <> v_period.version then raise exception using errcode='40001',message='period is not open for review'; end if;
  if not exists(select 1 from jsonb_array_elements_text(v_day.exceptions) as issue(code) where issue.code=p_issue_code) then raise exception using errcode='22023',message='issue is not in this snapshot'; end if;
  insert into public.timesheet_exception_reviews(period_id,employee_id,work_date,issue_code,snapshot_version,note,reviewed_by)
  values(v_period.id,v_day.employee_id,v_day.work_date,p_issue_code,v_day.snapshot_version,trim(p_note),v_actor.id)
  on conflict(period_id,employee_id,work_date,issue_code,snapshot_version) do update set note=excluded.note,reviewed_by=excluded.reviewed_by,reviewed_at=now()
  returning * into v_review;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
  values(v_actor.id,'timesheet.exception_reviewed','timesheet_day',v_day.id,to_jsonb(v_review),trim(p_note));
  return v_review;
end; $$;

create or replace function public.review_timesheet_period(p_period_id uuid)
returns public.timesheet_periods language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_period public.timesheet_periods%rowtype; v_missing boolean;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  select * into v_period from public.timesheet_periods where id=p_period_id for update;
  if not found or v_period.status <> 'open' then raise exception using errcode='40001',message='period is not open'; end if;
  if not exists(select 1 from public.timesheet_days where period_id=p_period_id and snapshot_version=v_period.version) then raise exception using errcode='23514',message='timesheet snapshot is missing'; end if;
  select exists(
    select 1 from public.timesheet_days d cross join lateral jsonb_array_elements_text(d.exceptions) as issue(code)
    where d.period_id=p_period_id and d.snapshot_version=v_period.version and not exists(
      select 1 from public.timesheet_exception_reviews r where r.period_id=d.period_id and r.employee_id=d.employee_id and r.work_date=d.work_date and r.issue_code=issue.code and r.snapshot_version=d.snapshot_version
    )
  ) into v_missing;
  if v_missing then raise exception using errcode='23514',message='unreviewed timesheet exceptions remain'; end if;
  update public.timesheet_periods set status='hr_reviewed',reviewed_by=v_actor.id,reviewed_at=now(),updated_at=now() where id=p_period_id returning * into v_period;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json) values(v_actor.id,'timesheet.hr_reviewed','timesheet_period',p_period_id,to_jsonb(v_period));
  return v_period;
end; $$;

create or replace function public.lock_timesheet_period(p_period_id uuid)
returns public.timesheet_periods language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_period public.timesheet_periods%rowtype;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role <> 'admin' then raise exception using errcode='42501',message='admin required'; end if;
  select * into v_period from public.timesheet_periods where id=p_period_id for update;
  if not found or v_period.status <> 'hr_reviewed' then raise exception using errcode='40001',message='period must be reviewed by HR first'; end if;
  if not exists(select 1 from public.timesheet_days where period_id=p_period_id and snapshot_version=v_period.version) then raise exception using errcode='23514',message='timesheet snapshot is missing'; end if;
  update public.timesheet_periods set status='locked',locked_by=v_actor.id,locked_at=now(),updated_at=now() where id=p_period_id returning * into v_period;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json) values(v_actor.id,'timesheet.locked','timesheet_period',p_period_id,to_jsonb(v_period));
  return v_period;
end; $$;

create or replace function public.unlock_timesheet_period(p_period_id uuid,p_reason text)
returns public.timesheet_periods language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_period public.timesheet_periods%rowtype; v_before jsonb;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role <> 'admin' then raise exception using errcode='42501',message='admin required'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception using errcode='22023',message='unlock reason is required'; end if;
  select * into v_period from public.timesheet_periods where id=p_period_id for update;
  if not found or v_period.status <> 'locked' then raise exception using errcode='40001',message='period is not locked'; end if;
  v_before := to_jsonb(v_period);
  update public.timesheet_periods set status='open',version=version+1,unlock_reason=trim(p_reason),reviewed_by=null,reviewed_at=null,locked_by=null,locked_at=null,updated_at=now()
  where id=p_period_id returning * into v_period;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
    values(v_actor.id,'timesheet.unlocked','timesheet_period',p_period_id,v_before,to_jsonb(v_period),trim(p_reason));
  return v_period;
end; $$;
revoke all on function public.acknowledge_timesheet_exception(uuid,text,text),public.review_timesheet_period(uuid),public.lock_timesheet_period(uuid),public.unlock_timesheet_period(uuid,text) from public;
grant execute on function public.acknowledge_timesheet_exception(uuid,text,text),public.review_timesheet_period(uuid),public.lock_timesheet_period(uuid),public.unlock_timesheet_period(uuid,text) to authenticated;
create or replace function public.replace_timesheet_snapshot(p_period_id uuid,p_version integer,p_actor_id uuid,p_days jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_period public.timesheet_periods%rowtype; v_count integer;
begin
  select * into v_period from public.timesheet_periods where id=p_period_id for update;
  if not found or v_period.status <> 'open' or v_period.version <> p_version then raise exception using errcode='40001',message='period version changed or is not open'; end if;
  if jsonb_typeof(p_days) <> 'array' then raise exception using errcode='22023',message='snapshot rows must be an array'; end if;
  delete from public.timesheet_exception_reviews where period_id=p_period_id and snapshot_version=p_version;
  delete from public.timesheet_days where period_id=p_period_id and snapshot_version=p_version;
  insert into public.timesheet_days(period_id,employee_id,work_date,regular_minutes,overtime_minutes,leave_days,late_minutes,early_minutes,exceptions,source_revision,snapshot_version)
  select p_period_id,d.employee_id,d.work_date,d.regular_minutes,d.overtime_minutes,d.leave_days,d.late_minutes,d.early_minutes,coalesce(d.exceptions,'[]'::jsonb),d.source_revision,p_version
  from jsonb_to_recordset(p_days) as d(employee_id uuid,work_date date,regular_minutes integer,overtime_minutes integer,leave_days numeric,late_minutes integer,early_minutes integer,exceptions jsonb,source_revision text);
  get diagnostics v_count = row_count;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
  values(p_actor_id,'timesheet.snapshot_rebuilt','timesheet_period',p_period_id,jsonb_build_object('version',p_version,'days',v_count));
  return v_count;
end; $$;
revoke all on function public.replace_timesheet_snapshot(uuid,integer,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.replace_timesheet_snapshot(uuid,integer,uuid,jsonb) to service_role;
