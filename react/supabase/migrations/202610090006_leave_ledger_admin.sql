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
      values(v_request.employee_id,v_debit.year,-v_debit.amount_days,'reversal',v_request.id,v_request.version,'Hoàn phép do hủy: '||trim(p_reason),v_actor.id);
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
