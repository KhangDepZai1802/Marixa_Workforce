create table if not exists public.app_schema_migrations (
  version text primary key, checksum text not null, applied_at timestamptz not null default now()
);
revoke all on public.app_schema_migrations from anon, authenticated;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create table public.employees (
  id uuid primary key default gen_random_uuid(), employee_code text not null unique,
  full_name text not null, work_email text not null unique, phone text, department text, job_title text,
  hire_date date, status text not null default 'active' check (status in ('active','inactive','terminated')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.app_users (
  id uuid primary key default gen_random_uuid(), auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  employee_id uuid unique references public.employees(id) on delete restrict,
  role text not null default 'employee' check (role in ('employee','hr','admin')),
  status text not null default 'active' check (status in ('active','disabled')),
  must_change_password boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index app_users_single_active_admin on public.app_users ((role)) where role = 'admin' and status = 'active';

create table public.office_locations (
  id uuid primary key default gen_random_uuid(), name text not null, latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180), radius_m integer not null check(radius_m > 0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.work_policies (
  id uuid primary key default gen_random_uuid(), effective_from date not null, effective_to date,
  timezone text not null default 'Asia/Ho_Chi_Minh', start_time time not null default '08:00', lunch_start time not null default '12:00',
  lunch_end time not null default '13:00', end_time time not null default '17:00', working_weekdays integer[] not null default array[1,2,3,4,5,6],
  late_grace_minutes integer not null default 0 check(late_grace_minutes >= 0), photo_retention_days integer check(photo_retention_days > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(effective_to is null or effective_to >= effective_from), check(start_time < lunch_start and lunch_start < lunch_end and lunch_end < end_time)
);
create index work_policies_effective_idx on public.work_policies(effective_from desc);
create table public.holidays (
  id uuid primary key default gen_random_uuid(), holiday_date date not null unique, name text not null,
  is_working_override boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id) on delete restrict,
  work_date date not null, kind text not null check(kind in ('check_in','check_out')), occurred_at timestamptz not null,
  device_occurred_at timestamptz, received_at timestamptz not null default now(), source text not null check(source in ('online','offline')),
  idempotency_key uuid not null unique, latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180), accuracy_m double precision not null check(accuracy_m > 0),
  office_location_id uuid references public.office_locations(id) on delete set null, office_radius_m_at_capture integer,
  distance_m double precision, location_flag text not null default 'unknown' check(location_flag in ('inside','outside','inaccurate','unknown')),
  evidence_status text not null default 'pending' check(evidence_status in ('pending','ready','failed','expired')),
  review_status text not null default 'pending' check(review_status in ('pending','needs_review','reviewed','rejected')),
  review_note text, reviewed_by uuid references public.app_users(id), reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(employee_id, work_date, kind), check(source <> 'offline' or device_occurred_at is not null)
);
create index attendance_events_date_idx on public.attendance_events(work_date, employee_id);
create index attendance_events_review_idx on public.attendance_events(review_status, evidence_status, work_date);
create table public.attendance_photos (
  id uuid primary key default gen_random_uuid(), attendance_event_id uuid not null unique references public.attendance_events(id) on delete restrict,
  storage_path text not null unique, mime_type text not null check(mime_type in ('image/webp','image/jpeg')), bytes integer not null check(bytes > 0 and bytes <= 200000),
  uploaded_at timestamptz not null default now(), expires_at timestamptz, deleted_at timestamptz, created_at timestamptz not null default now()
);
create table public.attendance_corrections (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id) on delete restrict,
  work_date date not null, proposed_check_in timestamptz, proposed_check_out timestamptz, reason text not null,
  status text not null default 'pending' check(status in ('draft','pending','approved','rejected','cancelled')),
  reviewer_id uuid references public.app_users(id), reviewed_at timestamptz, review_note text,
  before_json jsonb, after_json jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index attendance_corrections_pending_idx on public.attendance_corrections(status, employee_id);

create table public.leave_types (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  deducts_annual_balance boolean not null default false, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id) on delete restrict,
  leave_type_id uuid not null references public.leave_types(id) on delete restrict, start_date date not null, end_date date not null,
  day_parts jsonb not null, total_days numeric(5,2) not null check(total_days > 0), reason text not null,
  status text not null default 'draft' check(status in ('draft','pending','approved','rejected','cancelled')),
  version integer not null default 1, reviewer_id uuid references public.app_users(id), reviewed_at timestamptz, review_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(end_date >= start_date)
);
create index leave_requests_employee_date_idx on public.leave_requests(employee_id, start_date, end_date);
create table public.leave_ledger (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id) on delete restrict,
  year integer not null, amount_days numeric(7,2) not null check(amount_days <> 0),
  entry_type text not null check(entry_type in ('grant','carryover','adjustment','deduction','reversal')),
  leave_request_id uuid references public.leave_requests(id) on delete restrict, request_version integer,
  reason text not null, created_by uuid not null references public.app_users(id) on delete restrict, created_at timestamptz not null default now(),
  check ((entry_type in ('deduction','reversal') and leave_request_id is not null) or entry_type in ('grant','carryover','adjustment'))
);
create unique index leave_ledger_request_once on public.leave_ledger(leave_request_id, request_version, entry_type) where leave_request_id is not null;

create table public.overtime_requests (
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id) on delete restrict,
  work_date date not null, start_at timestamptz not null, end_at timestamptz not null, reason text not null,
  status text not null default 'draft' check(status in ('draft','pending','approved','rejected','cancelled')),
  reviewer_id uuid references public.app_users(id), reviewed_at timestamptz, review_note text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(end_at > start_at)
);

create table public.timesheet_periods (
  id uuid primary key default gen_random_uuid(), year integer not null check(year between 2000 and 2200), month integer not null check(month between 1 and 12),
  status text not null default 'open' check(status in ('open','hr_reviewed','locked')),
  reviewed_by uuid references public.app_users(id), reviewed_at timestamptz, locked_by uuid references public.app_users(id), locked_at timestamptz,
  version integer not null default 1, unlock_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(year,month)
);
create table public.timesheet_days (
  id uuid primary key default gen_random_uuid(), period_id uuid not null references public.timesheet_periods(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict, work_date date not null,
  regular_minutes integer not null default 0 check(regular_minutes >= 0), overtime_minutes integer not null default 0 check(overtime_minutes >= 0),
  leave_days numeric(4,2) not null default 0 check(leave_days >= 0), late_minutes integer not null default 0 check(late_minutes >= 0),
  early_minutes integer not null default 0 check(early_minutes >= 0), exceptions jsonb not null default '[]', source_revision text not null,
  snapshot_version integer not null, created_at timestamptz not null default now(),
  unique(period_id, employee_id, work_date, snapshot_version)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid not null references public.app_users(id) on delete restrict,
  action text not null, entity_type text not null, entity_id uuid, before_json jsonb, after_json jsonb, reason text,
  request_id uuid, created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.current_employee_id() returns uuid language sql stable security definer set search_path = '' as $$
  select employee_id from public.app_users where auth_user_id = (select auth.uid()) and status = 'active' limit 1
$$;
create or replace function public.current_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.app_users where auth_user_id = (select auth.uid()) and status = 'active' limit 1
$$;
create or replace function public.is_staff_or_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_role() in ('hr','admin'), false)
$$;
revoke all on function public.current_employee_id(), public.current_role(), public.is_staff_or_admin() from public;
grant execute on function public.current_employee_id(), public.current_role(), public.is_staff_or_admin() to authenticated;

alter table public.employees enable row level security;
alter table public.app_users enable row level security;
alter table public.office_locations enable row level security;
alter table public.work_policies enable row level security;
alter table public.holidays enable row level security;
alter table public.attendance_events enable row level security;
alter table public.attendance_photos enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_ledger enable row level security;
alter table public.overtime_requests enable row level security;
alter table public.timesheet_periods enable row level security;
alter table public.timesheet_days enable row level security;
alter table public.audit_logs enable row level security;

grant select on public.employees, public.app_users, public.office_locations, public.work_policies, public.holidays, public.attendance_events, public.attendance_photos, public.attendance_corrections, public.leave_types, public.leave_requests, public.leave_ledger, public.overtime_requests, public.timesheet_periods, public.timesheet_days, public.audit_logs to authenticated;
revoke all on public.employees, public.app_users, public.office_locations, public.work_policies, public.holidays, public.attendance_events, public.attendance_photos, public.attendance_corrections, public.leave_types, public.leave_requests, public.leave_ledger, public.overtime_requests, public.timesheet_periods, public.timesheet_days, public.audit_logs from anon, authenticated;
grant select on public.employees, public.app_users, public.office_locations, public.work_policies, public.holidays, public.attendance_events, public.attendance_photos, public.attendance_corrections, public.leave_types, public.leave_requests, public.leave_ledger, public.overtime_requests, public.timesheet_periods, public.timesheet_days, public.audit_logs to authenticated;
grant insert on public.employees, public.attendance_events, public.attendance_corrections, public.leave_requests, public.overtime_requests, public.office_locations, public.work_policies, public.holidays, public.leave_types to authenticated;
grant insert on public.attendance_photos to authenticated;
grant update on public.employees, public.office_locations, public.work_policies, public.holidays, public.leave_types to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy employees_self_read on public.employees for select to authenticated using (id = (select public.current_employee_id()) or (select public.is_staff_or_admin()));
create policy employees_staff_write on public.employees for all to authenticated using ((select public.is_staff_or_admin())) with check ((select public.is_staff_or_admin()));
create policy app_users_self_read on public.app_users for select to authenticated using (auth_user_id = (select auth.uid()) or (select public.current_role()) = 'admin');
create policy attendance_self_read on public.attendance_events for select to authenticated using (employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()));
create policy attendance_self_insert on public.attendance_events for insert to authenticated with check (employee_id = (select public.current_employee_id()));
create policy photos_read_authorized on public.attendance_photos for select to authenticated using (exists(select 1 from public.attendance_events e where e.id = attendance_event_id and (e.employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()))));
create policy photos_insert_owner on public.attendance_photos for insert to authenticated with check (exists(select 1 from public.attendance_events e where e.id = attendance_event_id and e.employee_id = (select public.current_employee_id())));
create policy corrections_self_read on public.attendance_corrections for select to authenticated using (employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()));
create policy corrections_self_insert on public.attendance_corrections for insert to authenticated with check(employee_id = (select public.current_employee_id()));
create policy leave_types_read_active on public.leave_types for select to authenticated using (active or (select public.current_role()) = 'admin');
create policy leave_requests_self_read on public.leave_requests for select to authenticated using(employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()));
create policy leave_requests_self_insert on public.leave_requests for insert to authenticated with check(employee_id = (select public.current_employee_id()));
create policy ledger_self_read on public.leave_ledger for select to authenticated using(employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()));
create policy overtime_self_read on public.overtime_requests for select to authenticated using(employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()));
create policy overtime_self_insert on public.overtime_requests for insert to authenticated with check(employee_id = (select public.current_employee_id()));
create policy policies_read on public.work_policies for select to authenticated using(true);
create policy policies_admin on public.work_policies for all to authenticated using((select public.current_role()) = 'admin') with check((select public.current_role()) = 'admin');
create policy holidays_read on public.holidays for select to authenticated using(true);
create policy holidays_admin on public.holidays for all to authenticated using((select public.current_role()) = 'admin') with check((select public.current_role()) = 'admin');
create policy locations_read on public.office_locations for select to authenticated using(active or (select public.current_role()) = 'admin');
create policy locations_admin on public.office_locations for all to authenticated using((select public.current_role()) = 'admin') with check((select public.current_role()) = 'admin');
create policy timesheet_periods_staff_read on public.timesheet_periods for select to authenticated using((select public.is_staff_or_admin()));
create policy timesheet_days_self_read on public.timesheet_days for select to authenticated using(employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()));
create policy audit_admin_read on public.audit_logs for select to authenticated using((select public.current_role()) = 'admin');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('attendance-photos','attendance-photos',false,200000,array['image/webp','image/jpeg'])
on conflict (id) do update set public=false, file_size_limit=200000, allowed_mime_types=array['image/webp','image/jpeg'];
create policy attendance_photo_object_read on storage.objects for select to authenticated using (
  bucket_id = 'attendance-photos' and exists (
    select 1 from public.attendance_photos p join public.attendance_events e on e.id = p.attendance_event_id
    where p.storage_path = name and p.deleted_at is null and (e.employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()))
  )
);
create policy attendance_photo_object_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'attendance-photos' and (storage.foldername(name))[1] = (select public.current_employee_id())::text
);
create policy attendance_photo_object_update on storage.objects for update to authenticated using (
  bucket_id = 'attendance-photos' and (storage.foldername(name))[1] = (select public.current_employee_id())::text
) with check (bucket_id = 'attendance-photos' and (storage.foldername(name))[1] = (select public.current_employee_id())::text);
create policy attendance_photo_object_owner_delete on storage.objects for delete to authenticated using (
  bucket_id = 'attendance-photos' and (storage.foldername(name))[1] = (select public.current_employee_id())::text
);
create policy attendance_photo_object_delete on storage.objects for delete to authenticated using (
  bucket_id = 'attendance-photos' and (select public.current_role()) = 'admin'
);

create or replace function public.mark_attendance_photo_ready() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.attendance_events set evidence_status = 'ready', updated_at = now() where id = new.attendance_event_id;
  return new;
end; $$;
create trigger attendance_photo_ready after insert on public.attendance_photos for each row execute function public.mark_attendance_photo_ready();

create or replace function public.decide_leave_request(p_request_id uuid, p_decision text, p_note text default null)
returns public.leave_requests language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.app_users%rowtype; v_target public.app_users%rowtype; v_request public.leave_requests%rowtype;
  v_type public.leave_types%rowtype; v_balance numeric; v_actor_id uuid; v_year integer; v_year_days numeric;
begin
  select * into v_actor from public.app_users where auth_user_id = (select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501', message='forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception using errcode='22023', message='invalid decision'; end if;
  select * into v_request from public.leave_requests where id=p_request_id for update;
  if not found or v_request.status <> 'pending' then raise exception using errcode='40001', message='request is not pending'; end if;
  select * into v_target from public.app_users where employee_id=v_request.employee_id and status='active';
  if not found or v_target.employee_id = v_actor.employee_id then raise exception using errcode='42501', message='self approval is forbidden'; end if;
  if v_target.role='hr' and v_actor.role <> 'admin' then raise exception using errcode='42501', message='admin approval required'; end if;
  v_actor_id := v_actor.id;
  select * into v_type from public.leave_types where id=v_request.leave_type_id;
  if p_decision='approved' and v_type.deducts_annual_balance then
    for v_year,v_year_days in
      select extract(year from (item->>'date')::date)::int,
        sum(case when item->>'part'='full' then 1 else 0.5 end)
      from jsonb_array_elements(v_request.day_parts) item group by 1
    loop
      select coalesce(sum(amount_days),0) into v_balance from public.leave_ledger where employee_id=v_request.employee_id and year=v_year;
      if v_balance < v_year_days then raise exception using errcode='23514', message='insufficient leave balance'; end if;
      insert into public.leave_ledger(employee_id,year,amount_days,entry_type,leave_request_id,request_version,reason,created_by)
      values(v_request.employee_id,v_year,-v_year_days,'deduction',v_request.id,v_request.version,'Nghỉ phép đã duyệt',v_actor_id);
    end loop;
  end if;
  update public.leave_requests set status=p_decision, reviewer_id=v_actor_id, reviewed_at=now(), review_note=p_note, updated_at=now()
    where id=p_request_id returning * into v_request;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
  values(v_actor_id,'leave.'||p_decision,'leave_request',v_request.id,to_jsonb(v_request),p_note);
  return v_request;
end; $$;

create or replace function public.decide_overtime_request(p_request_id uuid, p_decision text, p_note text default null)
returns public.overtime_requests language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_target public.app_users%rowtype; v_request public.overtime_requests%rowtype;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501', message='forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception using errcode='22023', message='invalid decision'; end if;
  select * into v_request from public.overtime_requests where id=p_request_id for update;
  if not found or v_request.status <> 'pending' then raise exception using errcode='40001', message='request is not pending'; end if;
  select * into v_target from public.app_users where employee_id=v_request.employee_id and status='active';
  if not found or v_target.employee_id=v_actor.employee_id then raise exception using errcode='42501', message='self approval is forbidden'; end if;
  if v_target.role='hr' and v_actor.role <> 'admin' then raise exception using errcode='42501', message='admin approval required'; end if;
  update public.overtime_requests set status=p_decision,reviewer_id=v_actor.id,reviewed_at=now(),review_note=p_note,updated_at=now()
    where id=p_request_id returning * into v_request;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
  values(v_actor.id,'overtime.'||p_decision,'overtime_request',v_request.id,to_jsonb(v_request),p_note);
  return v_request;
end; $$;

create or replace function public.decide_attendance_correction(p_request_id uuid, p_decision text, p_note text default null)
returns public.attendance_corrections language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_target public.app_users%rowtype; v_request public.attendance_corrections%rowtype; v_before jsonb;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501', message='forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception using errcode='22023', message='invalid decision'; end if;
  select * into v_request from public.attendance_corrections where id=p_request_id for update;
  if not found or v_request.status <> 'pending' then raise exception using errcode='40001', message='request is not pending'; end if;
  select * into v_target from public.app_users where employee_id=v_request.employee_id and status='active';
  if not found or v_target.employee_id=v_actor.employee_id then raise exception using errcode='42501', message='self approval is forbidden'; end if;
  if v_target.role='hr' and v_actor.role <> 'admin' then raise exception using errcode='42501', message='admin approval required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'occurred_at',occurred_at) order by kind),'[]'::jsonb) into v_before
    from public.attendance_events where employee_id=v_request.employee_id and work_date=v_request.work_date;
  update public.attendance_corrections set status=p_decision,reviewer_id=v_actor.id,reviewed_at=now(),review_note=p_note,before_json=v_before,
      after_json=case when p_decision='approved' then jsonb_build_object('check_in',proposed_check_in,'check_out',proposed_check_out) else null end,updated_at=now()
    where id=p_request_id returning * into v_request;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
  values(v_actor.id,'attendance_correction.'||p_decision,'attendance_correction',v_request.id,v_before,to_jsonb(v_request),p_note);
  return v_request;
end; $$;

create or replace function public.review_attendance_event(p_event_id uuid, p_result text, p_note text default null)
returns public.attendance_events language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_event public.attendance_events%rowtype; v_before jsonb;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501', message='forbidden'; end if;
  if p_result not in ('reviewed','rejected') then raise exception using errcode='22023', message='invalid review result'; end if;
  select * into v_event from public.attendance_events where id=p_event_id for update;
  if not found then raise exception using errcode='P0002', message='event not found'; end if;
  v_before := to_jsonb(v_event) - 'latitude' - 'longitude';
  update public.attendance_events set review_status=p_result, review_note=p_note, reviewed_by=v_actor.id, reviewed_at=now(), updated_at=now()
    where id=p_event_id returning * into v_event;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
    values(v_actor.id,'attendance.'||p_result,'attendance_event',v_event.id,v_before,to_jsonb(v_event)-'latitude'-'longitude',p_note);
  return v_event;
end; $$;
revoke all on function public.decide_leave_request(uuid,text,text), public.decide_overtime_request(uuid,text,text), public.decide_attendance_correction(uuid,text,text), public.review_attendance_event(uuid,text,text) from public;
grant execute on function public.decide_leave_request(uuid,text,text), public.decide_overtime_request(uuid,text,text), public.decide_attendance_correction(uuid,text,text), public.review_attendance_event(uuid,text,text) to authenticated;

