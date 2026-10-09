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
