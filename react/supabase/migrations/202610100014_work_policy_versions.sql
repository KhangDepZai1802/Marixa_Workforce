-- Keep one shared shift in effect on each date. A new version closes the
-- previous one atomically, with the existing row audit trigger recording both.
revoke insert, update on public.work_policies from authenticated;
alter table public.work_policies add constraint work_policies_no_overlap
  exclude using gist (daterange(effective_from, effective_to + 1, '[)') with &&);

create or replace function public.create_work_policy_version(
  p_effective_from date,
  p_start_time time,
  p_lunch_start time,
  p_lunch_end time,
  p_end_time time,
  p_working_weekdays integer[],
  p_late_grace_minutes integer,
  p_photo_retention_days integer
) returns public.work_policies
language plpgsql security definer set search_path = '' as $$
declare
  v_previous public.work_policies%rowtype;
  v_created public.work_policies%rowtype;
begin
  if coalesce(public.current_role(), '') <> 'admin' then
    raise exception using errcode = '42501', message = 'admin role required';
  end if;
  if p_effective_from is null or p_start_time is null or p_lunch_start is null
     or p_lunch_end is null or p_end_time is null
     or not (p_start_time < p_lunch_start and p_lunch_start < p_lunch_end and p_lunch_end < p_end_time)
     or p_late_grace_minutes is null or p_late_grace_minutes < 0 or p_late_grace_minutes > 240
     or p_photo_retention_days is null or p_photo_retention_days < 1 or p_photo_retention_days > 3650
     or p_working_weekdays is null or cardinality(p_working_weekdays) < 1 or cardinality(p_working_weekdays) > 7
     or exists (select 1 from unnest(p_working_weekdays) as weekdays(day) where day is null or day < 1 or day > 7)
     or (select count(distinct day) from unnest(p_working_weekdays) as weekdays(day)) <> cardinality(p_working_weekdays)
  then
    raise exception using errcode = '22023', message = 'invalid work policy';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('marixa-work-policy-version'));
  select * into v_previous from public.work_policies
  order by effective_from desc, created_at desc limit 1 for update;
  if found then
    if p_effective_from <= v_previous.effective_from then
      raise exception using errcode = '23505', message = 'overlapping work policy date';
    end if;
    if v_previous.effective_to is not null and v_previous.effective_to <> p_effective_from - 1 then
      raise exception using errcode = '22023', message = 'work policy date gap or overlap';
    end if;
    if v_previous.effective_to is null then
      update public.work_policies set effective_to = p_effective_from - 1
      where id = v_previous.id;
    end if;
  end if;

  insert into public.work_policies (
    effective_from, effective_to, timezone, start_time, lunch_start, lunch_end,
    end_time, working_weekdays, late_grace_minutes, photo_retention_days
  ) values (
    p_effective_from, null, 'Asia/Ho_Chi_Minh', p_start_time, p_lunch_start,
    p_lunch_end, p_end_time, p_working_weekdays, p_late_grace_minutes,
    p_photo_retention_days
  ) returning * into v_created;
  return v_created;
end;
$$;

revoke all on function public.create_work_policy_version(date,time,time,time,time,integer[],integer,integer) from public;
grant execute on function public.create_work_policy_version(date,time,time,time,time,integer[],integer,integer) to authenticated;
