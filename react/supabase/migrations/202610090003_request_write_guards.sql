-- Restrict client inserts to request fields; reviewers and state transitions are
-- exclusively controlled by transactional decision functions.
alter table public.attendance_corrections alter column status set default 'pending';
alter table public.leave_requests alter column status set default 'pending';
alter table public.overtime_requests alter column status set default 'pending';
revoke insert on public.attendance_corrections, public.leave_requests, public.overtime_requests from authenticated;
grant insert (employee_id,work_date,proposed_check_in,proposed_check_out,reason) on public.attendance_corrections to authenticated;
grant insert (employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason) on public.leave_requests to authenticated;
grant insert (employee_id,work_date,start_at,end_at,reason) on public.overtime_requests to authenticated;
