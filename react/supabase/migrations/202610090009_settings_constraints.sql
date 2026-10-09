create unique index if not exists office_locations_one_active on public.office_locations((active)) where active=true;
alter table public.work_policies add constraint work_policies_timezone_marixa_check check(timezone='Asia/Ho_Chi_Minh');
