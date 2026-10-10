-- Review a late punch against the locked snapshot and all already approved
-- compensation for the same employee and source day, under one transaction lock.
drop function if exists public.review_late_attendance_adjustment(uuid,text,integer,integer,text);
create function public.review_late_attendance_adjustment(
  p_actor_auth_user_id uuid,p_adjustment_id uuid,p_decision text,p_regular_minutes_delta integer,
  p_overtime_minutes_delta integer,p_expected_regular_minutes integer,
  p_expected_overtime_minutes integer,p_note text
) returns public.timesheet_adjustments language plpgsql security definer set search_path = '' as $$
declare
  v_actor public.app_users%rowtype;
  v_adjustment public.timesheet_adjustments%rowtype;
  v_source public.timesheet_periods%rowtype;
  v_target public.timesheet_periods%rowtype;
  v_snapshot public.timesheet_days%rowtype;
  v_approved_regular integer;
  v_approved_overtime integer;
  v_before jsonb;
begin
  select * into v_actor from public.app_users where auth_user_id=p_actor_auth_user_id and status='active' and must_change_password=false;
  if not found or v_actor.role not in ('hr','admin') then raise exception using errcode='42501',message='forbidden'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') or length(trim(coalesce(p_note,'')))<3 then
    raise exception using errcode='22023',message='valid decision and review note required';
  end if;
  if p_regular_minutes_delta is null or p_overtime_minutes_delta is null
     or p_regular_minutes_delta not between -1440 and 1440 or p_overtime_minutes_delta not between -1440 and 1440
     or p_expected_regular_minutes is null or p_expected_overtime_minutes is null
     or p_expected_regular_minutes not between 0 and 1440 or p_expected_overtime_minutes not between 0 and 1440 then
    raise exception using errcode='22023',message='invalid adjustment minutes';
  end if;
  select * into v_adjustment from public.timesheet_adjustments where id=p_adjustment_id for update;
  if not found or v_adjustment.status<>'pending_review' then raise exception using errcode='40001',message='adjustment is not pending'; end if;
  if v_actor.employee_id is not null and v_actor.employee_id=v_adjustment.employee_id then
    raise exception using errcode='42501',message='self approval is not allowed';
  end if;
  select * into v_source from public.timesheet_periods where id=v_adjustment.source_period_id for update;
  if v_source.status<>'locked' then raise exception using errcode='40001',message='source period is not locked'; end if;
  -- Serialize approvals for the source day even when there are two late events.
  perform pg_advisory_xact_lock(hashtextextended(v_adjustment.employee_id::text||':'||v_adjustment.work_date::text,0));
  select * into v_snapshot from public.timesheet_days where period_id=v_source.id
    and snapshot_version=v_source.version and employee_id=v_adjustment.employee_id
    and work_date=v_adjustment.work_date and previous_period_source_period_id is null for update;
  if not found then raise exception using errcode='40001',message='locked source snapshot is missing'; end if;
  select coalesce(sum(regular_minutes_delta),0)::integer,coalesce(sum(overtime_minutes_delta),0)::integer
    into v_approved_regular,v_approved_overtime from public.timesheet_adjustments
    where employee_id=v_adjustment.employee_id and work_date=v_adjustment.work_date
      and source_period_id=v_source.id and status='approved';
  if p_decision='approved' and
     (p_regular_minutes_delta<>p_expected_regular_minutes-v_snapshot.regular_minutes-v_approved_regular
       or p_overtime_minutes_delta<>p_expected_overtime_minutes-v_snapshot.overtime_minutes-v_approved_overtime) then
    raise exception using errcode='40001',message='adjustment differs from uncompensated source day';
  end if;
  select * into v_target from public.timesheet_periods where id=v_adjustment.target_period_id for update;
  if not found or v_target.status<>'open' then
    select * into v_target from public.timesheet_periods where id=public.find_or_create_open_timesheet_period((now() at time zone 'Asia/Ho_Chi_Minh')::date) for update;
  end if;
  v_before:=to_jsonb(v_adjustment);
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
    v_before,to_jsonb(v_adjustment)||jsonb_build_object('expected_regular_minutes',p_expected_regular_minutes,
    'expected_overtime_minutes',p_expected_overtime_minutes,'source_snapshot_id',v_snapshot.id),trim(p_note));
  return v_adjustment;
end; $$;
revoke all on function public.review_late_attendance_adjustment(uuid,uuid,text,integer,integer,integer,integer,text) from public,anon,authenticated;
grant execute on function public.review_late_attendance_adjustment(uuid,uuid,text,integer,integer,integer,integer,text) to service_role;
