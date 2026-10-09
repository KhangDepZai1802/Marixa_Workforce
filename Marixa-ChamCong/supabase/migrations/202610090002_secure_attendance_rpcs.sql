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
