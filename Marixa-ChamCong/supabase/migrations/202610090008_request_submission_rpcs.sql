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
