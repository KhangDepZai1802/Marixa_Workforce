-- Require photo intent and GPS for new events; preserve historical rows and idempotent retries.
-- Photos still upload after the event and remain pending until registered.
create or replace function public.create_attendance_event(
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
  -- Preserve retries of historical events, including uploads still pending.
  select * into v_event from public.attendance_events where idempotency_key=p_idempotency_key;
  if found then
    if v_event.employee_id=v_account.employee_id then return v_event; end if;
    raise exception using errcode='23505', message='idempotency key already used';
  end if;
  if p_photo_expected is distinct from true then
    raise exception using errcode='22023', message='attendance photo required';
  end if;
  if p_latitude is null or p_longitude is null or p_accuracy_m is null then
    raise exception using errcode='22023', message='attendance location required';
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
    'pending',
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
