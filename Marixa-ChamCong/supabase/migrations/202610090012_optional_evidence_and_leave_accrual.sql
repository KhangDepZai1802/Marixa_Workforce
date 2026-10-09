-- The owner has confirmed that GPS and photos are optional, independent
-- attendance evidence. A missing office location or retention setting must not
-- prevent the attendance event itself from being recorded.
alter table public.attendance_events alter column latitude drop not null;
alter table public.attendance_events alter column longitude drop not null;
alter table public.attendance_events alter column accuracy_m drop not null;
alter table public.attendance_events drop constraint if exists attendance_events_latitude_check;
alter table public.attendance_events drop constraint if exists attendance_events_longitude_check;
alter table public.attendance_events drop constraint if exists attendance_events_accuracy_m_check;
alter table public.attendance_events drop constraint if exists attendance_events_evidence_status_check;
alter table public.attendance_events
  add constraint attendance_events_latitude_range check (latitude is null or latitude between -90 and 90),
  add constraint attendance_events_longitude_range check (longitude is null or longitude between -180 and 180),
  add constraint attendance_events_accuracy_range check (accuracy_m is null or accuracy_m between 0 and 10000),
  add constraint attendance_events_location_all_or_none check (
    (latitude is null and longitude is null and accuracy_m is null)
    or (latitude is not null and longitude is not null and accuracy_m is not null and accuracy_m > 0)
  ),
  add constraint attendance_events_evidence_status_check
    check (evidence_status in ('not_provided','pending','ready','failed','expired'));
alter table public.attendance_events alter column evidence_status set default 'not_provided';
alter table public.attendance_photos drop constraint if exists attendance_photos_mime_type_check;
alter table public.attendance_photos add constraint attendance_photos_mime_type_check
  check (mime_type in ('image/webp','image/jpeg','image/png'));

-- Keep the private bucket aligned with the already-confirmed PNG upload type.
update storage.buckets
set allowed_mime_types = array['image/webp','image/jpeg','image/png']::text[]
where id = 'attendance-photos';

drop function if exists public.create_attendance_event(text,text,timestamptz,uuid,double precision,double precision,double precision);
create function public.create_attendance_event(
  p_kind text,
  p_source text,
  p_device_occurred_at timestamptz,
  p_idempotency_key uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision,
  p_photo_expected boolean default false
) returns public.attendance_events
language plpgsql security definer set search_path = '' as $$
declare
  v_account public.app_users%rowtype;
  v_employee public.employees%rowtype;
  v_office public.office_locations%rowtype;
  v_occurred timestamptz;
  v_work_date date;
  v_distance double precision;
  v_flag text := 'unknown';
  v_event public.attendance_events%rowtype;
  v_has_location boolean;
  v_has_office boolean := false;
begin
  select * into v_account from public.app_users
  where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false;
  if not found or v_account.employee_id is null then
    raise exception using errcode='42501', message='active employee profile required';
  end if;
  select * into v_employee from public.employees where id=v_account.employee_id and status='active';
  if not found then raise exception using errcode='42501', message='active employee required'; end if;
  if p_kind is null or p_source is null or p_kind not in ('check_in','check_out')
     or p_source not in ('online','offline') or p_idempotency_key is null then
    raise exception using errcode='22023', message='invalid attendance event';
  end if;
  v_has_location := p_latitude is not null or p_longitude is not null or p_accuracy_m is not null;
  if v_has_location and (p_latitude is null or p_longitude is null or p_accuracy_m is null
     or p_latitude not between -90 and 90 or p_longitude not between -180 and 180
     or p_accuracy_m <= 0 or p_accuracy_m > 10000) then
    raise exception using errcode='22023', message='location evidence must be complete and valid';
  end if;
  if p_source='offline' and p_device_occurred_at is null then
    raise exception using errcode='22023', message='device timestamp required';
  end if;

  v_occurred := case when p_source='offline' then p_device_occurred_at else now() end;
  v_work_date := (v_occurred at time zone 'Asia/Ho_Chi_Minh')::date;
  if v_has_location then
    select * into v_office from public.office_locations where active order by created_at limit 1;
    if found then
      v_has_office := true;
      v_distance := 6371000 * 2 * asin(sqrt(
        power(sin(radians(p_latitude-v_office.latitude)/2),2) +
        cos(radians(v_office.latitude))*cos(radians(p_latitude))*power(sin(radians(p_longitude-v_office.longitude)/2),2)
      ));
      v_flag := case when p_accuracy_m > v_office.radius_m then 'inaccurate'
        when v_distance <= v_office.radius_m then 'inside' else 'outside' end;
    end if;
  end if;

  insert into public.attendance_events(
    employee_id,work_date,kind,occurred_at,device_occurred_at,received_at,source,idempotency_key,
    latitude,longitude,accuracy_m,office_location_id,office_radius_m_at_capture,distance_m,
    location_flag,evidence_status,review_status
  ) values (
    v_account.employee_id,v_work_date,p_kind,v_occurred,p_device_occurred_at,now(),p_source,p_idempotency_key,
    p_latitude,p_longitude,p_accuracy_m,case when v_has_office then v_office.id else null end,
    case when v_has_office then v_office.radius_m else null end,v_distance,v_flag,
    case when coalesce(p_photo_expected,false) then 'pending' else 'not_provided' end,
    case when p_source='offline' then 'needs_review' else 'pending' end
  ) on conflict (idempotency_key) do nothing returning * into v_event;
  if found then return v_event; end if;
  select * into v_event from public.attendance_events where idempotency_key=p_idempotency_key;
  if found and v_event.employee_id=v_account.employee_id then return v_event; end if;
  raise exception using errcode='23505', message='attendance already exists for this day and kind';
end;
$$;
revoke all on function public.create_attendance_event(text,text,timestamptz,uuid,double precision,double precision,double precision,boolean) from public;
grant execute on function public.create_attendance_event(text,text,timestamptz,uuid,double precision,double precision,double precision,boolean) to authenticated;

create or replace function public.register_attendance_photo(p_event_id uuid,p_storage_path text,p_mime_type text,p_bytes integer)
returns public.attendance_photos language plpgsql security definer set search_path = '' as $$
declare v_employee uuid; v_date date; v_expected text; v_retention integer; v_photo public.attendance_photos%rowtype;
begin
  select e.employee_id,e.work_date into v_employee,v_date from public.attendance_events e
  where e.id=p_event_id and e.employee_id=(select public.current_employee_id()) for update;
  if not found then raise exception using errcode='42501',message='event not owned by current user'; end if;
  select photo_retention_days into v_retention from public.work_policies
  where effective_from<=v_date and (effective_to is null or effective_to>=v_date)
  order by effective_from desc limit 1;
  if v_retention is null then raise exception using errcode='55000',message='photo retention must be configured'; end if;
  if p_mime_type not in ('image/webp','image/jpeg','image/png') or p_bytes not between 1 and 200000 then
    raise exception using errcode='22023',message='invalid photo';
  end if;
  v_expected := v_employee::text||'/'||to_char(v_date,'YYYY/MM/DD')||'/'||p_event_id::text||
    case p_mime_type when 'image/webp' then '.webp' when 'image/png' then '.png' else '.jpg' end;
  if p_storage_path <> v_expected then raise exception using errcode='22023',message='invalid storage path'; end if;
  insert into public.attendance_photos(attendance_event_id,storage_path,mime_type,bytes,uploaded_at,expires_at)
  values(p_event_id,p_storage_path,p_mime_type,p_bytes,now(),now()+make_interval(days=>v_retention))
  on conflict(attendance_event_id) do update set storage_path=excluded.storage_path,mime_type=excluded.mime_type,
    bytes=excluded.bytes,uploaded_at=now(),expires_at=excluded.expires_at,deleted_at=null returning * into v_photo;
  update public.attendance_events set evidence_status='ready',updated_at=now() where id=p_event_id;
  return v_photo;
end;
$$;
revoke all on function public.register_attendance_photo(uuid,text,text,integer) from public;
grant execute on function public.register_attendance_photo(uuid,text,text,integer) to authenticated;

-- The configured allowance is one annual-leave day for each hire-month onward.
-- A daily retry catches up missed runs and the partial unique index prevents
-- duplicate grants for the same employee and month.
alter table public.leave_ledger add column if not exists accrual_month date;
alter table public.leave_ledger add constraint leave_ledger_accrual_month_first_day
  check (accrual_month is null or extract(day from accrual_month)=1);
create unique index if not exists leave_ledger_monthly_accrual_once
  on public.leave_ledger(employee_id,accrual_month) where accrual_month is not null;

create or replace function public.accrue_monthly_annual_leave(p_as_of date default current_date)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid;
  v_employee record;
  v_month date;
  v_last_month date;
  v_entry public.leave_ledger%rowtype;
  v_inserted integer := 0;
begin
  select id into v_actor_id from public.app_users
  where role='admin' and status='active' order by created_at limit 1;
  if v_actor_id is null then raise exception using errcode='55000',message='active admin is required for leave accrual audit'; end if;
  v_last_month := date_trunc('month',p_as_of)::date;
  for v_employee in select id,hire_date from public.employees where status='active' and hire_date is not null and hire_date<=p_as_of
  loop
    perform pg_advisory_xact_lock(hashtext(v_employee.id::text||':annual-leave'));
    v_month := date_trunc('month',v_employee.hire_date)::date;
    while v_month<=v_last_month loop
      insert into public.leave_ledger(employee_id,year,amount_days,entry_type,accrual_month,reason,created_by)
      values(v_employee.id,extract(year from v_month)::integer,1,'grant',v_month,
        'Cộng phép năm tháng '||to_char(v_month,'YYYY-MM'),v_actor_id)
      on conflict(employee_id,accrual_month) where accrual_month is not null do nothing
      returning * into v_entry;
      if found then
        v_inserted := v_inserted+1;
        insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
        values(v_actor_id,'leave_ledger.monthly_accrual','leave_ledger',v_entry.id,to_jsonb(v_entry),v_entry.reason);
      end if;
      v_month := (v_month+interval '1 month')::date;
    end loop;
  end loop;
  return v_inserted;
end;
$$;
revoke all on function public.accrue_monthly_annual_leave(date) from public,anon,authenticated;
grant execute on function public.accrue_monthly_annual_leave(date) to service_role;

-- Late offline punches for an already locked source month never mutate its
-- snapshot. They enter a separate, reviewable adjustment in an open month.
alter table public.timesheet_days
  add column if not exists previous_period_regular_adjustment integer not null default 0,
  add column if not exists previous_period_overtime_adjustment integer not null default 0,
  add column if not exists previous_period_source_period_id uuid references public.timesheet_periods(id) on delete restrict;

create table public.timesheet_adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  source_event_id uuid not null unique references public.attendance_events(id) on delete restrict,
  source_period_id uuid not null references public.timesheet_periods(id) on delete restrict,
  target_period_id uuid not null references public.timesheet_periods(id) on delete restrict,
  work_date date not null,
  regular_minutes_delta integer not null default 0,
  overtime_minutes_delta integer not null default 0,
  status text not null default 'pending_review' check(status in ('pending_review','approved','rejected')),
  reason text not null default 'Đồng bộ chấm công sau khi kỳ gốc đã khóa',
  review_note text,
  reviewed_by uuid references public.app_users(id) on delete restrict,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_event_id,target_period_id)
);
create index timesheet_adjustments_target_idx on public.timesheet_adjustments(target_period_id,status,work_date);
alter table public.timesheet_adjustments enable row level security;
revoke all on public.timesheet_adjustments from anon,authenticated;
grant select on public.timesheet_adjustments to authenticated;
create policy timesheet_adjustments_staff_read on public.timesheet_adjustments
  for select to authenticated using((select public.is_staff_or_admin()));
create trigger audit_timesheet_adjustment_created after insert on public.timesheet_adjustments
  for each row execute function public.audit_business_row();

create or replace function public.find_or_create_open_timesheet_period(p_min_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_period_id uuid; v_status text; v_month date; v_attempt integer := 0;
begin
  select id into v_period_id from public.timesheet_periods
  where status='open' and (year,month)>=(extract(year from date_trunc('month',p_min_date))::integer,extract(month from date_trunc('month',p_min_date))::integer)
  order by year,month limit 1 for update;
  if v_period_id is not null then return v_period_id; end if;
  v_month := date_trunc('month',p_min_date)::date;
  loop
    v_attempt := v_attempt+1;
    if v_attempt>120 then raise exception using errcode='54000',message='could not find an open timesheet period'; end if;
    insert into public.timesheet_periods(year,month)
    values(extract(year from v_month)::integer,extract(month from v_month)::integer)
    on conflict(year,month) do nothing;
    select id,status into v_period_id,v_status from public.timesheet_periods
    where year=extract(year from v_month)::integer and month=extract(month from v_month)::integer for update;
    if v_status='open' then return v_period_id; end if;
    v_month := (v_month+interval '1 month')::date;
  end loop;
end;
$$;
revoke all on function public.find_or_create_open_timesheet_period(date) from public,anon,authenticated;

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
      if tg_op='UPDATE'
         and new.employee_id is not distinct from old.employee_id
         and new.work_date is not distinct from old.work_date
         and new.kind is not distinct from old.kind
         and new.occurred_at is not distinct from old.occurred_at
         and new.device_occurred_at is not distinct from old.device_occurred_at
         and new.source is not distinct from old.source
         and new.idempotency_key is not distinct from old.idempotency_key then return new;
      raise exception using errcode='55000',message='attendance period is locked';
    end if;
    if v_period.status='hr_reviewed' then
      select id into v_actor_id from public.app_users where auth_user_id=(select auth.uid()) and status='active';
      update public.timesheet_periods set status='open',reviewed_by=null,reviewed_at=null,updated_at=now() where id=v_period.id;
      if v_actor_id is not null then
        insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
        values(v_actor_id,'timesheet.review_invalidated','timesheet_period',v_period.id,to_jsonb(v_period),jsonb_build_object('status','open'),'Source attendance changed after HR review');
      end if;
    end if;
    if tg_op='DELETE' then return old; else return new; end if;
  end if;

  if tg_table_name='leave_requests' then
    if tg_op='DELETE' then v_date:=old.start_date; else v_date:=new.start_date; end if;
  else
    if tg_op='DELETE' then v_date:=old.work_date; else v_date:=new.work_date; end if;
  end if;
  if tg_op='UPDATE' then
    if tg_table_name='leave_requests' then v_date:=old.start_date; else v_date:=old.work_date; end if;
    if old.status is distinct from new.status and old.status<>'approved' and new.status<>'approved' then return new; end if;
  end if;
  select * into v_period from public.timesheet_periods p
    where p.year=extract(year from v_date)::int and p.month=extract(month from v_date)::int for update;
  if v_period.status='locked' then raise exception using errcode='55000',message='attendance period is locked'; end if;
  if v_period.status='hr_reviewed' then
    select id into v_actor_id from public.app_users where auth_user_id=(select auth.uid()) and status='active';
    update public.timesheet_periods set status='open',reviewed_by=null,reviewed_at=null,updated_at=now() where id=v_period.id;
    if v_actor_id is not null then
      insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
      values(v_actor_id,'timesheet.review_invalidated','timesheet_period',v_period.id,to_jsonb(v_period),jsonb_build_object('status','open'),'Approved request changed after HR review');
    end if;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;

create or replace function public.queue_late_attendance_adjustment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_source_period_id uuid; v_target_period_id uuid; v_status text;
begin
  if new.source<>'offline' then return new; end if;
  select id,status into v_source_period_id,v_status from public.timesheet_periods
  where year=extract(year from new.work_date)::integer and month=extract(month from new.work_date)::integer;
  if v_status is distinct from 'locked' then return new; end if;
  v_target_period_id := public.find_or_create_open_timesheet_period((now() at time zone 'Asia/Ho_Chi_Minh')::date);
  insert into public.timesheet_adjustments(employee_id,source_event_id,source_period_id,target_period_id,work_date)
  values(new.employee_id,new.id,v_source_period_id,v_target_period_id,new.work_date)
  on conflict(source_event_id) do nothing;
  return new;
end;
$$;
create trigger queue_late_attendance_adjustment after insert on public.attendance_events
  for each row execute function public.queue_late_attendance_adjustment();

create or replace function public.review_late_attendance_adjustment(
  p_adjustment_id uuid,p_decision text,p_regular_minutes_delta integer,p_overtime_minutes_delta integer,p_note text
) returns public.timesheet_adjustments language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_adjustment public.timesheet_adjustments%rowtype; v_target public.timesheet_periods%rowtype;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') or length(trim(coalesce(p_note,'')))<3 then
    raise exception using errcode='22023',message='valid decision and review note required';
  end if;
  if p_regular_minutes_delta is null or p_overtime_minutes_delta is null
     or p_regular_minutes_delta not between -1440 and 1440 or p_overtime_minutes_delta not between -1440 and 1440 then
    raise exception using errcode='22023',message='adjustment minutes are outside the valid range';
  end if;
  select * into v_adjustment from public.timesheet_adjustments where id=p_adjustment_id for update;
  if not found or v_adjustment.status<>'pending_review' then raise exception using errcode='40001',message='adjustment is not pending'; end if;
  if v_actor.employee_id is not null and v_actor.employee_id=v_adjustment.employee_id then
    raise exception using errcode='42501',message='self approval is not allowed';
  end if;
  select * into v_target from public.timesheet_periods where id=v_adjustment.target_period_id for update;
  if not found or v_target.status<>'open' then
    v_adjustment.target_period_id := public.find_or_create_open_timesheet_period((now() at time zone 'Asia/Ho_Chi_Minh')::date);
    select * into v_target from public.timesheet_periods where id=v_adjustment.target_period_id for update;
  end if;
  update public.timesheet_adjustments set target_period_id=v_target.id,
    regular_minutes_delta=case when p_decision='approved' then p_regular_minutes_delta else 0 end,
    overtime_minutes_delta=case when p_decision='approved' then p_overtime_minutes_delta else 0 end,
    status=p_decision,review_note=trim(p_note),reviewed_by=v_actor.id,reviewed_at=now(),updated_at=now()
  where id=p_adjustment_id returning * into v_adjustment;
  if p_decision='approved' then
    delete from public.timesheet_exception_reviews where period_id=v_target.id and snapshot_version=v_target.version;
    delete from public.timesheet_days where period_id=v_target.id and snapshot_version=v_target.version;
  end if;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
  values(v_actor.id,'timesheet.adjustment.'||p_decision,'timesheet_adjustment',v_adjustment.id,
    jsonb_build_object('status','pending_review'),to_jsonb(v_adjustment),trim(p_note));
  return v_adjustment;
end;
$$;
revoke all on function public.review_late_attendance_adjustment(uuid,text,integer,integer,text) from public;
grant execute on function public.review_late_attendance_adjustment(uuid,text,integer,integer,text) to authenticated;

create or replace function public.review_timesheet_period(p_period_id uuid)
returns public.timesheet_periods language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_period public.timesheet_periods%rowtype; v_missing boolean;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  select * into v_period from public.timesheet_periods where id=p_period_id for update;
  if not found or v_period.status<>'open' then raise exception using errcode='40001',message='period is not open'; end if;
  if not exists(select 1 from public.timesheet_days where period_id=p_period_id and snapshot_version=v_period.version) then
    raise exception using errcode='23514',message='timesheet snapshot is missing';
  end if;
  if exists(select 1 from public.timesheet_adjustments where target_period_id=p_period_id and status='pending_review') then
    raise exception using errcode='23514',message='pending prior-period adjustments remain';
  end if;
  select exists(
    select 1 from public.timesheet_days d cross join lateral jsonb_array_elements_text(d.exceptions) as issue(code)
    where d.period_id=p_period_id and d.snapshot_version=v_period.version and not exists(
      select 1 from public.timesheet_exception_reviews r where r.period_id=d.period_id and r.employee_id=d.employee_id
        and r.work_date=d.work_date and r.issue_code=issue.code and r.snapshot_version=d.snapshot_version
    )
  ) into v_missing;
  if v_missing then raise exception using errcode='23514',message='unreviewed timesheet exceptions remain'; end if;
  update public.timesheet_periods set status='hr_reviewed',reviewed_by=v_actor.id,reviewed_at=now(),updated_at=now()
    where id=p_period_id returning * into v_period;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json)
    values(v_actor.id,'timesheet.hr_reviewed','timesheet_period',p_period_id,to_jsonb(v_period));
  return v_period;
end;
$$;

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
    period_id,employee_id,work_date,regular_minutes,overtime_minutes,leave_days,late_minutes,early_minutes,
    exceptions,source_revision,snapshot_version,employee_code_snapshot,full_name_snapshot,department_snapshot,
    previous_period_regular_adjustment,previous_period_overtime_adjustment,previous_period_source_period_id
  )
  select p_period_id,d.employee_id,d.work_date,d.regular_minutes,d.overtime_minutes,d.leave_days,d.late_minutes,d.early_minutes,
    coalesce(d.exceptions,'[]'::jsonb),d.source_revision,p_version,d.employee_code_snapshot,d.full_name_snapshot,d.department_snapshot,
    coalesce(d.previous_period_regular_adjustment,0),coalesce(d.previous_period_overtime_adjustment,0),d.previous_period_source_period_id
  from jsonb_to_recordset(p_days) as d(
    employee_id uuid,work_date date,regular_minutes integer,overtime_minutes integer,leave_days numeric,
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
