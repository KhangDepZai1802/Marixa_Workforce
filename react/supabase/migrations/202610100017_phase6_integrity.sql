-- A request may span two leave years. Each year needs its own debit/reversal.
drop index public.leave_ledger_request_once;
create unique index leave_ledger_request_once
  on public.leave_ledger(leave_request_id,request_version,year,entry_type)
  where leave_request_id is not null;

-- Approval, cancellation and manual balance changes serialize on the same
-- employee/year. The request row lock alone cannot protect two requests.
create or replace function public.decide_leave_request(p_request_id uuid,p_decision text,p_note text default null)
returns public.leave_requests language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.app_users%rowtype; v_target public.app_users%rowtype;
  v_request public.leave_requests%rowtype; v_type public.leave_types%rowtype;
  v_balance numeric; v_year integer; v_year_days numeric;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception using errcode='22023',message='invalid decision'; end if;
  select * into v_request from public.leave_requests where id=p_request_id for update;
  if not found or v_request.status<>'pending' then raise exception using errcode='40001',message='request is not pending'; end if;
  select * into v_target from public.app_users where employee_id=v_request.employee_id and status='active';
  if not found or v_target.employee_id=v_actor.employee_id then raise exception using errcode='42501',message='self approval is forbidden'; end if;
  if v_target.role='hr' and v_actor.role<>'admin' then raise exception using errcode='42501',message='admin approval required'; end if;
  select * into v_type from public.leave_types where id=v_request.leave_type_id;
  if p_decision='approved' and v_type.deducts_annual_balance then
    for v_year,v_year_days in
      select extract(year from (item->>'date')::date)::int,
        sum(case when item->>'part'='full' then 1 else 0.5 end)
      from jsonb_array_elements(v_request.day_parts) item group by 1 order by 1
    loop
      perform pg_advisory_xact_lock(hashtext(v_request.employee_id::text||':'||v_year::text));
      select coalesce(sum(amount_days),0) into v_balance from public.leave_ledger
        where employee_id=v_request.employee_id and year=v_year;
      if v_balance<v_year_days then raise exception using errcode='23514',message='insufficient leave balance'; end if;
      insert into public.leave_ledger(employee_id,year,amount_days,entry_type,leave_request_id,request_version,reason,created_by)
      values(v_request.employee_id,v_year,-v_year_days,'deduction',v_request.id,v_request.version,'Nghỉ phép đã duyệt',v_actor.id);
    end loop;
  end if;
  update public.leave_requests set status=p_decision,reviewer_id=v_actor.id,reviewed_at=now(),review_note=p_note,updated_at=now()
    where id=p_request_id returning * into v_request;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
    values(v_actor.id,'leave.'||p_decision,'leave_request',v_request.id,to_jsonb(v_request),p_note);
  return v_request;
end; $$;

-- Evidence status is informational for payroll review. Business exceptions
-- and pending requests still need an explicit HR decision or review note.
create or replace function public.review_timesheet_period(p_period_id uuid)
returns public.timesheet_periods language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_period public.timesheet_periods%rowtype;
  v_first date; v_last date; v_missing boolean;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  select * into v_period from public.timesheet_periods where id=p_period_id for update;
  if not found or v_period.status<>'open' then raise exception using errcode='40001',message='period is not open'; end if;
  v_first := make_date(v_period.year,v_period.month,1);
  v_last := (v_first+interval '1 month'-interval '1 day')::date;
  if not exists(select 1 from public.timesheet_days where period_id=p_period_id and snapshot_version=v_period.version) then
    raise exception using errcode='23514',message='timesheet snapshot is missing';
  end if;
  if exists(select 1 from public.timesheet_adjustments where target_period_id=p_period_id and status='pending_review') then
    raise exception using errcode='23514',message='pending prior-period adjustments remain';
  end if;
  if exists(select 1 from public.leave_requests where status='pending' and start_date<=v_last and end_date>=v_first)
    or exists(select 1 from public.overtime_requests where status='pending' and work_date between v_first and v_last)
    or exists(select 1 from public.attendance_corrections where status='pending' and work_date between v_first and v_last)
  then raise exception using errcode='23514',message='pending requests remain in this period'; end if;
  select exists(
    select 1 from public.timesheet_days d cross join lateral jsonb_array_elements_text(d.exceptions) as issue(code)
    where d.period_id=p_period_id and d.snapshot_version=v_period.version
      and issue.code not in ('photo_pending','photo_failed')
      and not exists(select 1 from public.timesheet_exception_reviews r
        where r.period_id=d.period_id and r.employee_id=d.employee_id and r.work_date=d.work_date
          and r.issue_code=issue.code and r.snapshot_version=d.snapshot_version)
  ) into v_missing;
  if v_missing then raise exception using errcode='23514',message='unreviewed timesheet exceptions remain'; end if;
  update public.timesheet_periods set status='hr_reviewed',reviewed_by=v_actor.id,reviewed_at=now(),updated_at=now()
    where id=p_period_id returning * into v_period;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json)
    values(v_actor.id,'timesheet.hr_reviewed','timesheet_period',p_period_id,to_jsonb(v_period));
  return v_period;
end; $$;

create or replace function public.cancel_leave_request(p_request_id uuid,p_reason text)
returns public.leave_requests language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.app_users%rowtype; v_request public.leave_requests%rowtype;
  v_type public.leave_types%rowtype; v_debit record;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.employee_id is null then raise exception using errcode='42501',message='employee profile required'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception using errcode='22023',message='cancellation reason required'; end if;
  select * into v_request from public.leave_requests where id=p_request_id for update;
  if not found or v_request.employee_id<>v_actor.employee_id then raise exception using errcode='42501',message='request is not owned by current user'; end if;
  if v_request.status not in ('pending','approved') then raise exception using errcode='40001',message='request cannot be cancelled'; end if;
  select * into v_type from public.leave_types where id=v_request.leave_type_id;
  if v_request.status='approved' and v_type.deducts_annual_balance then
    for v_debit in select year,amount_days from public.leave_ledger
      where leave_request_id=v_request.id and request_version=v_request.version and entry_type='deduction' order by year
    loop
      perform pg_advisory_xact_lock(hashtext(v_request.employee_id::text||':'||v_debit.year::text));
      insert into public.leave_ledger(employee_id,year,amount_days,entry_type,leave_request_id,request_version,reason,created_by)
      values(v_request.employee_id,v_debit.year,-v_debit.amount_days,'reversal',v_request.id,v_request.version,
        'Hoàn phép do hủy: '||trim(p_reason),v_actor.id);
    end loop;
  end if;
  update public.leave_requests set status='cancelled',updated_at=now() where id=p_request_id returning * into v_request;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
    values(v_actor.id,'leave.cancelled','leave_request',v_request.id,to_jsonb(v_request),trim(p_reason));
  return v_request;
end; $$;

-- Preserve the late offline event exception while guarding every date in a
-- multi-month leave request, including an already reviewed source month.
create or replace function public.prevent_locked_period_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_date date; v_period public.timesheet_periods%rowtype; v_actor_id uuid;
begin
  if tg_table_name='attendance_events' then
    if tg_op='DELETE' then v_date:=old.work_date; else v_date:=new.work_date; end if;
    select * into v_period from public.timesheet_periods p
      where p.year=extract(year from v_date)::int and p.month=extract(month from v_date)::int for update;
    if v_period.status='locked' then
      if tg_op='INSERT' and new.source='offline' then return new; end if;
      if tg_op='UPDATE' and new.employee_id is not distinct from old.employee_id
         and new.work_date is not distinct from old.work_date and new.kind is not distinct from old.kind
         and new.occurred_at is not distinct from old.occurred_at
         and new.device_occurred_at is not distinct from old.device_occurred_at
         and new.source is not distinct from old.source and new.idempotency_key is not distinct from old.idempotency_key
      then return new; end if;
      raise exception using errcode='55000',message='attendance period is locked';
    end if;
    if v_period.status='hr_reviewed' then
      select id into v_actor_id from public.app_users where auth_user_id=(select auth.uid()) and status='active';
      update public.timesheet_periods set status='open',reviewed_by=null,reviewed_at=null,updated_at=now() where id=v_period.id;
      if v_actor_id is not null then
        insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
        values(v_actor_id,'timesheet.review_invalidated','timesheet_period',v_period.id,to_jsonb(v_period),
          jsonb_build_object('status','open'),'Source attendance changed after HR review');
      end if;
    end if;
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  if tg_op='UPDATE' and old.status is distinct from new.status
     and old.status<>'approved' and new.status<>'approved' then return new; end if;
  if tg_table_name='leave_requests' then
    for v_date in
      select distinct (part->>'date')::date from jsonb_array_elements(
        case when tg_op='DELETE' then old.day_parts else new.day_parts end) part order by 1
    loop
      select * into v_period from public.timesheet_periods p
        where p.year=extract(year from v_date)::int and p.month=extract(month from v_date)::int for update;
      if v_period.status='locked' then raise exception using errcode='55000',message='attendance period is locked'; end if;
      if v_period.status='hr_reviewed' then
        select id into v_actor_id from public.app_users where auth_user_id=(select auth.uid()) and status='active';
        update public.timesheet_periods set status='open',reviewed_by=null,reviewed_at=null,updated_at=now() where id=v_period.id;
        if v_actor_id is not null then
          insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
          values(v_actor_id,'timesheet.review_invalidated','timesheet_period',v_period.id,to_jsonb(v_period),
            jsonb_build_object('status','open'),'Approved request changed after HR review');
        end if;
      end if;
    end loop;
  else
    if tg_op='DELETE' then v_date:=old.work_date; else v_date:=new.work_date; end if;
    select * into v_period from public.timesheet_periods p
      where p.year=extract(year from v_date)::int and p.month=extract(month from v_date)::int for update;
    if v_period.status='locked' then raise exception using errcode='55000',message='attendance period is locked'; end if;
    if v_period.status='hr_reviewed' then
      select id into v_actor_id from public.app_users where auth_user_id=(select auth.uid()) and status='active';
      update public.timesheet_periods set status='open',reviewed_by=null,reviewed_at=null,updated_at=now() where id=v_period.id;
      if v_actor_id is not null then
        insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
        values(v_actor_id,'timesheet.review_invalidated','timesheet_period',v_period.id,to_jsonb(v_period),
          jsonb_build_object('status','open'),'Approved request changed after HR review');
      end if;
    end if;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;
