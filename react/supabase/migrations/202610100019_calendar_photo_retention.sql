-- New uploads expire after three calendar months. Historical expiry is unchanged.
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
  values(p_event_id,p_storage_path,p_mime_type,p_bytes,now(),now()+interval '3 months')
  on conflict(attendance_event_id) do update set storage_path=excluded.storage_path,mime_type=excluded.mime_type,
    bytes=excluded.bytes,uploaded_at=now(),expires_at=excluded.expires_at,deleted_at=null returning * into v_photo;
  update public.attendance_events set evidence_status='ready',updated_at=now() where id=p_event_id;
  return v_photo;
end;
$$;
revoke all on function public.register_attendance_photo(uuid,text,text,integer) from public;
grant execute on function public.register_attendance_photo(uuid,text,text,integer) to authenticated;


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
  if v_count>0 then
    insert into public.audit_logs(actor_user_id,action,entity_type,after_json)
      select id,'attendance_photos.retention_deleted','attendance_photo_batch',jsonb_build_object('count',v_count,'photo_ids',p_ids)
      from public.app_users where role='admin' and status='active';
  end if;
  return v_count;
end; $$;
revoke all on function public.finalize_photo_retention(uuid[]) from public,anon,authenticated;
grant execute on function public.finalize_photo_retention(uuid[]) to service_role;

