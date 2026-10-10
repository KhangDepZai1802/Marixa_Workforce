-- Expired photo objects must be inaccessible even before the cleanup job removes them.
drop policy if exists attendance_photo_object_read on storage.objects;
create policy attendance_photo_object_read on storage.objects for select to authenticated using (
  bucket_id = 'attendance-photos' and exists (
    select 1
    from public.attendance_photos p
    join public.attendance_events e on e.id = p.attendance_event_id
    where p.storage_path = name
      and p.deleted_at is null
      and p.expires_at > now()
      and (e.employee_id = (select public.current_employee_id()) or (select public.is_staff_or_admin()))
  )
);
