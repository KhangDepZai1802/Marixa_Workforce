-- ===== FILE: 202610090001_initial_workforce.sql =====
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
      values(v_request.employee_id,v_year,-v_year_days,'deduction',v_request.id,v_request.version,'Nghá»‰ phÃ©p Ä‘Ã£ duyá»‡t',v_actor_id);
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


-- ===== FILE: 202610090002_secure_attendance_rpcs.sql =====
-- Route all sensitive writes through SECURITY DEFINER RPCs. Authenticated clients
-- retain read access, but cannot forge server-derived attendance metadata.
revoke insert on public.attendance_events, public.attendance_photos from authenticated;
drop policy if exists attendance_self_insert on public.attendance_events;
drop policy if exists photos_insert_owner on public.attendance_photos;

create or replace function public.current_employee_id() returns uuid language sql stable security definer set search_path = '' as $$
  select employee_id from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false limit 1
$$;
create or replace function public.current_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false limit 1
$$;

create or replace function public.create_attendance_event(
  p_kind text, p_source text, p_device_occurred_at timestamptz, p_idempotency_key uuid,
  p_latitude double precision, p_longitude double precision, p_accuracy_m double precision
) returns public.attendance_events language plpgsql security definer set search_path = '' as $$
declare v_account public.app_users%rowtype; v_employee public.employees%rowtype; v_office public.office_locations%rowtype;
  v_policy public.work_policies%rowtype; v_occurred timestamptz; v_work_date date; v_distance double precision; v_flag text := 'unknown'; v_event public.attendance_events%rowtype;
begin
  select * into v_account from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false;
  if not found or v_account.employee_id is null then raise exception using errcode='42501', message='active employee profile required'; end if;
  select * into v_employee from public.employees where id=v_account.employee_id and status='active';
  if not found then raise exception using errcode='42501', message='active employee required'; end if;
  if p_kind not in ('check_in','check_out') or p_source not in ('online','offline') then raise exception using errcode='22023', message='invalid attendance event'; end if;
  if p_idempotency_key is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 or p_accuracy_m <= 0 then raise exception using errcode='22023', message='invalid attendance evidence'; end if;
  if p_source='offline' and p_device_occurred_at is null then raise exception using errcode='22023', message='device timestamp required'; end if;
  v_occurred := case when p_source='offline' then p_device_occurred_at else now() end;
  v_work_date := (v_occurred at time zone 'Asia/Ho_Chi_Minh')::date;
  select * into v_policy from public.work_policies where effective_from <= v_work_date and (effective_to is null or effective_to >= v_work_date) order by effective_from desc limit 1;
  if not found or v_policy.photo_retention_days is null then raise exception using errcode='55000', message='attendance policy and photo retention must be configured'; end if;
  select * into v_office from public.office_locations where active order by created_at limit 1;
  if not found then raise exception using errcode='55000', message='active office location must be configured'; end if;
  if found then
    v_distance := 6371000 * 2 * asin(sqrt(
      power(sin(radians(p_latitude-v_office.latitude)/2),2) +
      cos(radians(v_office.latitude))*cos(radians(p_latitude))*power(sin(radians(p_longitude-v_office.longitude)/2),2)
    ));
    v_flag := case when p_accuracy_m > v_office.radius_m then 'inaccurate' when v_distance <= v_office.radius_m then 'inside' else 'outside' end;
  end if;
  insert into public.attendance_events(employee_id,work_date,kind,occurred_at,device_occurred_at,received_at,source,idempotency_key,
    latitude,longitude,accuracy_m,office_location_id,office_radius_m_at_capture,distance_m,location_flag,evidence_status,review_status)
  values(v_account.employee_id,v_work_date,p_kind,v_occurred,p_device_occurred_at,now(),p_source,p_idempotency_key,
    p_latitude,p_longitude,p_accuracy_m,v_office.id,v_office.radius_m,v_distance,v_flag,'pending',case when p_source='offline' then 'needs_review' else 'pending' end)
  on conflict (idempotency_key) do nothing returning * into v_event;
  if found then return v_event; end if;
  select * into v_event from public.attendance_events where idempotency_key=p_idempotency_key;
  if found and v_event.employee_id=v_account.employee_id then return v_event; end if;
  raise exception using errcode='23505', message='attendance already exists for this day and kind';
end; $$;

create or replace function public.register_attendance_photo(p_event_id uuid,p_storage_path text,p_mime_type text,p_bytes integer)
returns public.attendance_photos language plpgsql security definer set search_path = '' as $$
declare v_employee uuid; v_date date; v_expected text; v_retention integer; v_photo public.attendance_photos%rowtype;
begin
  select e.employee_id,e.work_date into v_employee,v_date from public.attendance_events e
  where e.id=p_event_id and e.employee_id=(select public.current_employee_id()) for update;
  if not found then raise exception using errcode='42501',message='event not owned by current user'; end if;
  select photo_retention_days into v_retention from public.work_policies where effective_from <= v_date and (effective_to is null or effective_to >= v_date) order by effective_from desc limit 1;
  if v_retention is null then raise exception using errcode='55000',message='photo retention must be configured'; end if;
  if p_mime_type not in ('image/webp','image/jpeg') or p_bytes not between 1 and 200000 then raise exception using errcode='22023',message='invalid photo'; end if;
  v_expected := v_employee::text||'/'||to_char(v_date,'YYYY/MM/DD')||'/'||p_event_id::text||case when p_mime_type='image/webp' then '.webp' else '.jpg' end;
  if p_storage_path <> v_expected then raise exception using errcode='22023',message='invalid storage path'; end if;
  insert into public.attendance_photos(attendance_event_id,storage_path,mime_type,bytes,uploaded_at,expires_at)
    values(p_event_id,p_storage_path,p_mime_type,p_bytes,now(),now()+make_interval(days=>v_retention))
    on conflict(attendance_event_id) do update set storage_path=excluded.storage_path,mime_type=excluded.mime_type,bytes=excluded.bytes,uploaded_at=now(),expires_at=excluded.expires_at,deleted_at=null
    returning * into v_photo;
  update public.attendance_events set evidence_status='ready',updated_at=now() where id=p_event_id;
  return v_photo;
end; $$;

revoke all on function public.create_attendance_event(text,text,timestamptz,uuid,double precision,double precision,double precision), public.register_attendance_photo(uuid,text,text,integer) from public;
grant execute on function public.create_attendance_event(text,text,timestamptz,uuid,double precision,double precision,double precision), public.register_attendance_photo(uuid,text,text,integer) to authenticated;

-- ===== FILE: 202610090003_request_write_guards.sql =====
-- Restrict client inserts to request fields; reviewers and state transitions are
-- exclusively controlled by transactional decision functions.
alter table public.attendance_corrections alter column status set default 'pending';
alter table public.leave_requests alter column status set default 'pending';
alter table public.overtime_requests alter column status set default 'pending';
revoke insert on public.attendance_corrections, public.leave_requests, public.overtime_requests from authenticated;
grant insert (employee_id,work_date,proposed_check_in,proposed_check_out,reason) on public.attendance_corrections to authenticated;
grant insert (employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason) on public.leave_requests to authenticated;
grant insert (employee_id,work_date,start_at,end_at,reason) on public.overtime_requests to authenticated;

-- ===== FILE: 202610090004_admin_guardrails.sql =====
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

-- ===== FILE: 202610090005_timesheet_workflow.sql =====
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

-- ===== FILE: 202610090006_leave_ledger_admin.sql =====
create unique index if not exists work_policies_effective_from_unique on public.work_policies(effective_from);
revoke update,delete on public.work_policies from anon,authenticated;

create or replace function public.add_leave_balance_entry(p_employee_id uuid,p_year integer,p_amount numeric,p_entry_type text,p_reason text)
returns public.leave_ledger language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_entry public.leave_ledger%rowtype;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  if p_entry_type not in ('grant','carryover','adjustment') or p_amount=0 or length(trim(coalesce(p_reason,'')))<3 then
    raise exception using errcode='22023',message='valid entry type, amount, and reason required';
  end if;
  if p_year not between 2000 and 2200 then raise exception using errcode='22023',message='invalid leave year'; end if;
  if not exists(select 1 from public.employees where id=p_employee_id) then raise exception using errcode='P0002',message='employee not found'; end if;
  insert into public.leave_ledger(employee_id,year,amount_days,entry_type,reason,created_by)
  values(p_employee_id,p_year,p_amount,p_entry_type,trim(p_reason),v_actor.id) returning * into v_entry;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
  values(v_actor.id,'leave_ledger.'||p_entry_type,'leave_ledger',v_entry.id,to_jsonb(v_entry),trim(p_reason));
  return v_entry;
end; $$;
revoke all on function public.add_leave_balance_entry(uuid,integer,numeric,text,text) from public;
grant execute on function public.add_leave_balance_entry(uuid,integer,numeric,text,text) to authenticated;
create or replace function public.cancel_leave_request(p_request_id uuid,p_reason text)
returns public.leave_requests language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_request public.leave_requests%rowtype; v_type public.leave_types%rowtype; v_debit record;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.employee_id is null then raise exception using errcode='42501',message='employee profile required'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception using errcode='22023',message='cancellation reason required'; end if;
  select * into v_request from public.leave_requests where id=p_request_id for update;
  if not found or v_request.employee_id<>v_actor.employee_id then raise exception using errcode='42501',message='request is not owned by current user'; end if;
  if v_request.status not in ('pending','approved') then raise exception using errcode='40001',message='request cannot be cancelled'; end if;
  select * into v_type from public.leave_types where id=v_request.leave_type_id;
  if v_request.status='approved' and v_type.deducts_annual_balance then
    for v_debit in select year,amount_days from public.leave_ledger where leave_request_id=v_request.id and request_version=v_request.version and entry_type='deduction'
    loop
      insert into public.leave_ledger(employee_id,year,amount_days,entry_type,leave_request_id,request_version,reason,created_by)
      values(v_request.employee_id,v_debit.year,-v_debit.amount_days,'reversal',v_request.id,v_request.version,'HoÃ n phÃ©p do há»§y: '||trim(p_reason),v_actor.id);
    end loop;
  end if;
  update public.leave_requests set status='cancelled',updated_at=now() where id=p_request_id returning * into v_request;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
  values(v_actor.id,'leave.cancelled','leave_request',v_request.id,to_jsonb(v_request),trim(p_reason));
  return v_request;
end; $$;

create or replace function public.cancel_overtime_request(p_request_id uuid,p_reason text)
returns public.overtime_requests language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_request public.overtime_requests%rowtype;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.employee_id is null or length(trim(coalesce(p_reason,'')))<3 then raise exception using errcode='42501',message='employee profile and cancellation reason required'; end if;
  select * into v_request from public.overtime_requests where id=p_request_id for update;
  if not found or v_request.employee_id<>v_actor.employee_id then raise exception using errcode='42501',message='request is not owned by current user'; end if;
  if v_request.status not in ('pending','approved') then raise exception using errcode='40001',message='request cannot be cancelled'; end if;
  update public.overtime_requests set status='cancelled',updated_at=now() where id=p_request_id returning * into v_request;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason) values(v_actor.id,'overtime.cancelled','overtime_request',v_request.id,to_jsonb(v_request),trim(p_reason));
  return v_request;
end; $$;

create or replace function public.cancel_attendance_correction(p_request_id uuid,p_reason text)
returns public.attendance_corrections language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_request public.attendance_corrections%rowtype;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.employee_id is null or length(trim(coalesce(p_reason,'')))<3 then raise exception using errcode='42501',message='employee profile and cancellation reason required'; end if;
  select * into v_request from public.attendance_corrections where id=p_request_id for update;
  if not found or v_request.employee_id<>v_actor.employee_id then raise exception using errcode='42501',message='request is not owned by current user'; end if;
  if v_request.status not in ('pending','approved') then raise exception using errcode='40001',message='request cannot be cancelled'; end if;
  update public.attendance_corrections set status='cancelled',updated_at=now() where id=p_request_id returning * into v_request;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason) values(v_actor.id,'attendance_correction.cancelled','attendance_correction',v_request.id,to_jsonb(v_request),trim(p_reason));
  return v_request;
end; $$;

revoke all on function public.cancel_leave_request(uuid,text),public.cancel_overtime_request(uuid,text),public.cancel_attendance_correction(uuid,text) from public;
grant execute on function public.cancel_leave_request(uuid,text),public.cancel_overtime_request(uuid,text),public.cancel_attendance_correction(uuid,text) to authenticated;

-- ===== FILE: 202610090007_final_constraints.sql =====
create or replace function public.prevent_last_active_office_removal() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if old.active and not new.active then
    perform pg_advisory_xact_lock(hashtext('marixa-active-office'));
    select count(*) into v_count from public.office_locations where active and id<>old.id;
    if v_count=0 then raise exception using errcode='23514',message='at least one active office is required'; end if;
  end if;
  return new;
end; $$;
create trigger preserve_active_office before update of active on public.office_locations for each row execute function public.prevent_last_active_office_removal();

create or replace function public.add_leave_balance_entry(p_employee_id uuid,p_year integer,p_amount numeric,p_entry_type text,p_reason text)
returns public.leave_ledger language plpgsql security definer set search_path = '' as $$
declare v_actor public.app_users%rowtype; v_entry public.leave_ledger%rowtype; v_balance numeric;
begin
  select * into v_actor from public.app_users where auth_user_id=(select auth.uid()) and status='active' and must_change_password=false for update;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  if p_entry_type not in ('grant','carryover','adjustment') or p_amount=0 or length(trim(coalesce(p_reason,'')))<3 then
    raise exception using errcode='22023',message='valid entry type, amount, and reason required';
  end if;
  if p_year not between 2000 and 2200 then raise exception using errcode='22023',message='invalid leave year'; end if;
  if p_entry_type in ('grant','carryover') and p_amount<0 then raise exception using errcode='22023',message='grants and carryovers must be positive'; end if;
  if not exists(select 1 from public.employees where id=p_employee_id) then raise exception using errcode='P0002',message='employee not found'; end if;
  perform pg_advisory_xact_lock(hashtext(p_employee_id::text||':'||p_year::text));
  select coalesce(sum(amount_days),0) into v_balance from public.leave_ledger where employee_id=p_employee_id and year=p_year;
  if v_balance+p_amount<0 then raise exception using errcode='23514',message='leave balance cannot be negative'; end if;
  insert into public.leave_ledger(employee_id,year,amount_days,entry_type,reason,created_by)
  values(p_employee_id,p_year,p_amount,p_entry_type,trim(p_reason),v_actor.id) returning * into v_entry;
  insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,after_json,reason)
  values(v_actor.id,'leave_ledger.'||p_entry_type,'leave_ledger',v_entry.id,to_jsonb(v_entry),trim(p_reason));
  return v_entry;
end; $$;

-- ===== FILE: 202610090008_request_submission_rpcs.sql =====
-- Request creation is transactional and computes authoritative leave quantities in
-- SQL. Clients cannot set status/reviewer fields or bypass weekday/date checks.
revoke insert on public.leave_requests,public.overtime_requests,public.attendance_corrections from authenticated;
revoke insert (employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason) on public.leave_requests from authenticated;
revoke insert (employee_id,work_date,start_at,end_at,reason) on public.overtime_requests from authenticated;
revoke insert (employee_id,work_date,proposed_check_in,proposed_check_out,reason) on public.attendance_corrections from authenticated;
create unique index if not exists attendance_correction_one_pending_per_day on public.attendance_corrections(employee_id,work_date) where status='pending';

create or replace function public.submit_leave_request(p_type_id uuid,p_start date,p_end date,p_parts jsonb,p_reason text)
returns public.leave_requests language plpgsql security definer set search_path = '' as $$
declare v_employee uuid; v_type public.leave_types%rowtype; v_policy public.work_policies%rowtype; v_request public.leave_requests%rowtype; v_item record; v_days numeric:=0; v_count integer;
begin
  v_employee := (select public.current_employee_id());
  if v_employee is null then raise exception using errcode='42501',message='active employee profile required'; end if;
  perform pg_advisory_xact_lock(hashtext(v_employee::text||':leave'));
  if p_start is null or p_end is null or p_end<p_start or p_end-p_start>31 or length(trim(coalesce(p_reason,'')))<3 or jsonb_typeof(p_parts)<>'array' then raise exception using errcode='22023',message='invalid leave request'; end if;
  select * into v_type from public.leave_types where id=p_type_id and active;
  if not found then raise exception using errcode='22023',message='active leave type required'; end if;
  select count(*) into v_count from jsonb_array_elements(p_parts);
  if v_count<1 or v_count>31 then raise exception using errcode='22023',message='invalid leave day parts'; end if;
  if exists(select 1 from (select (value->>'date')::date as d,count(*) as n from jsonb_array_elements(p_parts) group by 1) q where q.n>1) then raise exception using errcode='22023',message='duplicate leave dates'; end if;
  for v_item in select (value->>'date')::date as work_date, value->>'part' as part from jsonb_array_elements(p_parts)
  loop
    if v_item.work_date not between p_start and p_end or v_item.part is null or v_item.part not in ('full','morning','afternoon') then raise exception using errcode='22023',message='invalid leave day part'; end if;
    select * into v_policy from public.work_policies where effective_from<=v_item.work_date and (effective_to is null or effective_to>=v_item.work_date) order by effective_from desc limit 1;
    if not found then raise exception using errcode='55000',message='work policy is not configured'; end if;
    if exists(select 1 from public.holidays where holiday_date=v_item.work_date and is_working_override=false) then raise exception using errcode='22023',message='leave date is not a working day'; end if;
    if not exists(select 1 from public.holidays where holiday_date=v_item.work_date) and not ((extract(isodow from v_item.work_date)::int)=any(v_policy.working_weekdays)) then raise exception using errcode='22023',message='leave date is not a working day'; end if;
    v_days := v_days + case when v_item.part='full' then 1 else 0.5 end;
  end loop;
  if exists(select 1 from public.leave_requests r cross join lateral jsonb_array_elements(r.day_parts) old_part
    where r.employee_id=v_employee and r.status in ('pending','approved') and old_part->>'date' in (select value->>'date' from jsonb_array_elements(p_parts)))
  then raise exception using errcode='23505',message='overlapping leave request exists'; end if;
  insert into public.leave_requests(employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason,status)
  values(v_employee,p_type_id,p_start,p_end,p_parts,v_days,trim(p_reason),'pending') returning * into v_request;
  return v_request;
end; $$;

create or replace function public.submit_overtime_request(p_date date,p_start timestamptz,p_end timestamptz,p_reason text)
returns public.overtime_requests language plpgsql security definer set search_path = '' as $$
declare v_employee uuid; v_request public.overtime_requests%rowtype;
begin
  v_employee := (select public.current_employee_id());
  if v_employee is null then raise exception using errcode='42501',message='active employee profile required'; end if;
  if p_start is null or p_end<=p_start or (p_start at time zone 'Asia/Ho_Chi_Minh')::date<>p_date or (p_end at time zone 'Asia/Ho_Chi_Minh')::date<>p_date or length(trim(coalesce(p_reason,'')))<3 then raise exception using errcode='22023',message='invalid overtime request'; end if;
  insert into public.overtime_requests(employee_id,work_date,start_at,end_at,reason,status) values(v_employee,p_date,p_start,p_end,trim(p_reason),'pending') returning * into v_request;
  return v_request;
end; $$;

create or replace function public.submit_attendance_correction(p_date date,p_check_in timestamptz,p_check_out timestamptz,p_reason text)
returns public.attendance_corrections language plpgsql security definer set search_path = '' as $$
declare v_employee uuid; v_request public.attendance_corrections%rowtype;
begin
  v_employee := (select public.current_employee_id());
  if v_employee is null then raise exception using errcode='42501',message='active employee profile required'; end if;
  if (p_check_in is null and p_check_out is null) or (p_check_in is not null and (p_check_in at time zone 'Asia/Ho_Chi_Minh')::date<>p_date) or (p_check_out is not null and (p_check_out at time zone 'Asia/Ho_Chi_Minh')::date<>p_date) or (p_check_in is not null and p_check_out is not null and p_check_out<=p_check_in) or length(trim(coalesce(p_reason,'')))<3 then raise exception using errcode='22023',message='invalid attendance correction'; end if;
  if exists(select 1 from public.attendance_corrections where employee_id=v_employee and work_date=p_date and status='pending') then raise exception using errcode='23505',message='pending correction exists'; end if;
  insert into public.attendance_corrections(employee_id,work_date,proposed_check_in,proposed_check_out,reason,status) values(v_employee,p_date,p_check_in,p_check_out,trim(p_reason),'pending') returning * into v_request;
  return v_request;
end; $$;

revoke all on function public.submit_leave_request(uuid,date,date,jsonb,text),public.submit_overtime_request(date,timestamptz,timestamptz,text),public.submit_attendance_correction(date,timestamptz,timestamptz,text) from public;
grant execute on function public.submit_leave_request(uuid,date,date,jsonb,text),public.submit_overtime_request(date,timestamptz,timestamptz,text),public.submit_attendance_correction(date,timestamptz,timestamptz,text) to authenticated;

-- ===== FILE: 202610090009_settings_constraints.sql =====
create unique index if not exists office_locations_one_active on public.office_locations((active)) where active=true;
alter table public.work_policies add constraint work_policies_timezone_marixa_check check(timezone='Asia/Ho_Chi_Minh');

-- ===== FILE: 202610090010_locked_period_immutability.sql =====
create or replace function public.prevent_locked_period_mutation() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_date date; v_period public.timesheet_periods%rowtype; v_actor_id uuid;
begin
  if tg_table_name='attendance_events' then
    if tg_op='DELETE' then v_date:=old.work_date; else v_date:=new.work_date; end if;
    select * into v_period from public.timesheet_periods p where p.year=extract(year from v_date)::int and p.month=extract(month from v_date)::int for update;
    if v_period.status='locked' then raise exception using errcode='55000',message='attendance period is locked'; end if;
    if v_period.status='hr_reviewed' then
      select id into v_actor_id from public.app_users where auth_user_id=(select auth.uid()) and status='active';
      update public.timesheet_periods set status='open',reviewed_by=null,reviewed_at=null,updated_at=now() where id=v_period.id;
      if v_actor_id is not null then insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
        values(v_actor_id,'timesheet.review_invalidated','timesheet_period',v_period.id,to_jsonb(v_period),jsonb_build_object('status','open'),'Source attendance changed after HR review'); end if;
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
    if (old.status is distinct from new.status) and old.status<>'approved' and new.status<>'approved' then return new; end if;
  end if;
  select * into v_period from public.timesheet_periods p where p.year=extract(year from v_date)::int and p.month=extract(month from v_date)::int for update;
  if v_period.status='locked' then raise exception using errcode='55000',message='attendance period is locked'; end if;
  if v_period.status='hr_reviewed' then
    select id into v_actor_id from public.app_users where auth_user_id=(select auth.uid()) and status='active';
    update public.timesheet_periods set status='open',reviewed_by=null,reviewed_at=null,updated_at=now() where id=v_period.id;
    if v_actor_id is not null then insert into public.audit_logs(actor_user_id,action,entity_type,entity_id,before_json,after_json,reason)
      values(v_actor_id,'timesheet.review_invalidated','timesheet_period',v_period.id,to_jsonb(v_period),jsonb_build_object('status','open'),'Approved request changed after HR review'); end if;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

create trigger prevent_locked_attendance_event before insert or update or delete on public.attendance_events for each row execute function public.prevent_locked_period_mutation();
create trigger prevent_locked_leave_decision before update of status or delete on public.leave_requests for each row execute function public.prevent_locked_period_mutation();
create trigger prevent_locked_overtime_decision before update of status or delete on public.overtime_requests for each row execute function public.prevent_locked_period_mutation();
create trigger prevent_locked_correction_decision before update of status or delete on public.attendance_corrections for each row execute function public.prevent_locked_period_mutation();

-- ===== FILE: 202610090011_timesheet_employee_snapshot.sql =====
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

-- ===== FILE: 202610090012_optional_evidence_and_leave_accrual.sql =====
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
  drop constraint if exists attendance_events_latitude_range,
  drop constraint if exists attendance_events_longitude_range,
  drop constraint if exists attendance_events_accuracy_range,
  drop constraint if exists attendance_events_location_all_or_none,
  drop constraint if exists attendance_events_evidence_status_check;
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
        'Cá»™ng phÃ©p nÄƒm thÃ¡ng '||to_char(v_month,'YYYY-MM'),v_actor_id)
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
  reason text not null default 'Äá»“ng bá»™ cháº¥m cÃ´ng sau khi ká»³ gá»‘c Ä‘Ã£ khÃ³a',
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
         and new.idempotency_key is not distinct from old.idempotency_key then
        return new;
      end if;
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


-- ===== SEED: (xem run-migrations.mjs - duoc chay tu dong, khong can paste seed rieng) =====
