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
