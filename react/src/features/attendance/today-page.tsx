"use client";

import Link from "next/link";
import type { AttendanceLocation } from "./evidence";
import { CameraCapture } from "@/components/camera-capture";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { BUSINESS_TIME_ZONE, businessDate, formatDate, formatDateTime, formatMinutes, formatTime } from "@/lib/format";
import { calculateAttendanceDay } from "@/lib/domain/timesheet";
import { Button, LoadingState, Notice, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { countUnassignedQueuedAttendance, listQueuedAttendance, removeQueuedAttendance, saveQueuedAttendance, syncQueuedAttendance, type QueuedAttendance } from "./offline-queue";

type AttendanceEvent = { id: string; kind: "check_in" | "check_out"; occurred_at: string; work_date: string; source: string; evidence_status: string; location_flag: string | null };
type WorkPolicy = { start_time: string; lunch_start: string; lunch_end: string; end_time: string; working_weekdays: number[]; late_grace_minutes: number };

export function TodayPage({ employeeId }: { employeeId: string }) {
  const today = businessDate();
  const weekStartDate = new Date(`${today}T00:00:00Z`);
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - (weekStartDate.getUTCDay() + 6) % 7);
  const weekStart = weekStartDate.toISOString().slice(0, 10);
  const [weekEvents, setWeekEvents] = useState<AttendanceEvent[]>([]);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [policy, setPolicy] = useState<WorkPolicy | null>(null);
  const [policyUnavailable, setPolicyUnavailable] = useState(false);
  const [queue, setQueue] = useState<QueuedAttendance[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncInFlight = useRef(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [eventResult, pending, policyResult, unassigned] = await Promise.all([
        apiRequest<ApiEnvelope<AttendanceEvent[]>>(`/api/v1/attendance/events?from=${weekStart}&to=${today}&page_size=31`),
        listQueuedAttendance(employeeId),
        apiRequest<ApiEnvelope<WorkPolicy | null>>("/api/v1/me/work-policy").catch(() => null),
        countUnassignedQueuedAttendance().catch(() => 0),
      ]);
      setError("");
      setEvents((eventResult.data ?? []).filter(event => event.work_date === today)); setWeekEvents(eventResult.data ?? []);
      setQueue(pending);
      setPolicy(policyResult?.data ?? null);
      setPolicyUnavailable(policyResult === null);
      setUnassignedCount(unassigned);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu chấm công.");
      try { setQueue(await listQueuedAttendance(employeeId)); } catch { setQueue([]); }
    } finally { setLoading(false); }
  }, [today, weekStart, employeeId]);

  const sync = useCallback(async (force = false) => {
    if (!navigator.onLine) { setMessage("Thiết bị đang offline. Lượt chấm vẫn được giữ trên thiết bị."); return; }
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncing(true);
    setMessage("");
    try {
      const result = await syncQueuedAttendance(employeeId, force);
      if (result.synced) setMessage(`Đã đồng bộ ${result.synced} lượt chấm lên máy chủ.`);
      else if (result.message) setMessage(`Chưa đồng bộ được: ${result.message}`);
      await refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Chưa đồng bộ được hàng đợi.");
    } finally { syncInFlight.current = false; setSyncing(false); }
  }, [refresh, employeeId]);

  useEffect(() => {
    const onlineTimer = window.setTimeout(() => setOnline(navigator.onLine), 0);
    let active = true;
    Promise.all([
      apiRequest<ApiEnvelope<AttendanceEvent[]>>(`/api/v1/attendance/events?from=${weekStart}&to=${today}&page_size=31`),
      listQueuedAttendance(employeeId),
      apiRequest<ApiEnvelope<WorkPolicy | null>>("/api/v1/me/work-policy").catch(() => null),
      countUnassignedQueuedAttendance().catch(() => 0),
    ]).then(([eventResult, pending, policyResult, unassigned]) => {
      if (active) { setError(""); setEvents((eventResult.data ?? []).filter(event => event.work_date === today)); setWeekEvents(eventResult.data ?? []); setQueue(pending); setPolicy(policyResult?.data ?? null); setPolicyUnavailable(policyResult === null); setUnassignedCount(unassigned); }
    }).catch(async (cause: unknown) => {
      if (!active) return;
      setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu chấm công.");
      try { setQueue(await listQueuedAttendance(employeeId)); } catch { setQueue([]); }
    }).finally(() => { if (active) setLoading(false); });
    const onOnline = () => { setOnline(true); void sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const initialSyncTimer = window.setTimeout(() => {
      if (navigator.onLine && employeeId) {
        void listQueuedAttendance(employeeId).then(pending => {
          if (active && pending.some(item => !item.requires_attention)) void sync();
        }).catch(() => { /* Initial load already reports IndexedDB errors. */ });
      }
    }, 0);
    return () => { active = false; window.clearTimeout(onlineTimer); window.clearTimeout(initialSyncTimer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [refresh, sync, today, weekStart, employeeId]);

  useEffect(() => {
    if (!online || syncing) return;
    const nextRetry = queue.filter(item => !item.requires_attention && item.next_retry_at)
      .map(item => Date.parse(item.next_retry_at!)).filter(Number.isFinite).sort((a, b) => a - b)[0];
    if (nextRetry === undefined) return;
    const timer = window.setTimeout(() => void sync(), Math.max(0, nextRetry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [queue, online, syncing, sync]);

  const localToday = queue.filter((item) => item.device_occurred_at && businessDate(new Date(item.device_occurred_at)) === today);
  const checkIn = events.find((event) => event.kind === "check_in") ?? localToday.find((event) => event.kind === "check_in");
  const checkOut = events.find((event) => event.kind === "check_out") ?? localToday.find((event) => event.kind === "check_out");
  const nextKind = !checkIn ? "check_in" : !checkOut ? "check_out" : null;
  const checkTime = useMemo(() => policy ? (nextKind === "check_in" ? policy.start_time : policy.end_time).slice(0, 5) : null, [nextKind, policy]);
  const totalWorked = useMemo(() => {
    if (!checkIn || !checkOut || !policy) return null;
    const result = calculateAttendanceDay({
      checkIn: new Date("occurred_at" in checkIn ? checkIn.occurred_at : checkIn.device_occurred_at),
      checkOut: new Date("occurred_at" in checkOut ? checkOut.occurred_at : checkOut.device_occurred_at),
      policy: { start: policy.start_time, lunchStart: policy.lunch_start, lunchEnd: policy.lunch_end, end: policy.end_time, lateGraceMinutes: policy.late_grace_minutes },
      timeZone: BUSINESS_TIME_ZONE, isWorkday: false, approvedLeave: [], approvedOvertime: [],
    });
    // Reuse the net elapsed-time calculation; this display does not grant payroll or overtime.
    return result.complete ? result.overtimeMinutes : null;
  }, [checkIn, checkOut, policy]);
  const checkedDates = new Set(weekEvents.map(event => event.work_date));
  for (const item of queue) {
    const date = businessDate(new Date(item.device_occurred_at));
    if (date >= weekStart && date <= today) checkedDates.add(date);
  }

  async function submitAttendance(photo: Blob, location: AttendanceLocation) {
    if (!nextKind || busy) return;
    if (!photo.size) throw new Error("Bạn cần chụp hoặc chọn ảnh trước khi chấm công.");
    if (!employeeId) { setError("Không xác định được hồ sơ nhân viên. Hãy đăng nhập lại."); return; }
    setBusy(true); setError(""); setConflict(false); setMessage("");
    try {
      const key = crypto.randomUUID();
      const occurredAt = new Date().toISOString();
      const item: QueuedAttendance = {
        employee_id: employeeId,
        idempotency_key: key, kind: nextKind, device_occurred_at: occurredAt,
        latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, accuracy_m: location?.accuracy_m ?? null,
        photo, queued_at: occurredAt, requires_attention: false, last_error: null,
        attempts: 0, next_retry_at: null, status: "local_only",
      };

      // Persist before any network request so a reload between event creation
      // and photo upload still leaves the same key and photo to retry.
      await saveQueuedAttendance(item);
      setCameraOpen(false);

      if (!navigator.onLine) {
        setMessage(`Đã lưu trên thiết bị. Ứng dụng sẽ đồng bộ khi có mạng.`);
        await refresh();
        return;
      }

      try {
        const result = await apiRequest<ApiEnvelope<AttendanceEvent>>("/api/v1/attendance/events", {
          method: "POST",
          body: JSON.stringify({
            kind: item.kind, source: "online", device_occurred_at: item.device_occurred_at, idempotency_key: key,
            queue_owner_id: employeeId,
            latitude: item.latitude, longitude: item.longitude, accuracy_m: item.accuracy_m, photo_expected: true,
          }),
        });
        // Render the event confirmed by the server without a second read of
        // attendance and work policy before releasing the submit button.
        const recordEvent = (event: AttendanceEvent) => {
          setEvents(current => [...current.filter(row => row.id !== event.id), event].filter(row => row.work_date === today));
          setWeekEvents(current => [...current.filter(row => row.id !== event.id), event]);
        };
        recordEvent(result.data);
        if (photo) {
          const form = new FormData(); form.set("photo", photo, `attendance-${item.kind}.webp`);
          try {
            await apiRequest(`/api/v1/attendance/events/${result.data.id}/photo`, { method: "POST", body: form });
            recordEvent({ ...result.data, evidence_status: "ready" });
          }
          catch (cause) {
            await saveQueuedAttendance({ ...item, status: "event_synced_photo_pending" });
            setMessage(`Đã ghi nhận giờ chấm. Ảnh đang chờ đồng bộ${cause instanceof Error ? `: ${cause.message}` : "."}`);
            setQueue(await listQueuedAttendance(employeeId));
            return;
          }
        }
        await removeQueuedAttendance(key);
        setMessage(`Đã ghi nhận ${item.kind === "check_in" ? "giờ vào" : "giờ ra"} lúc ${formatTime(result.data.occurred_at)}.`);
        setQueue(await listQueuedAttendance(employeeId));
      } catch (cause) {
        if (cause instanceof ApiError && cause.status < 500) {
          await saveQueuedAttendance({ ...item, requires_attention: true, status: "requires_attention", last_error: cause.message });
          throw cause;
        }
        setMessage(`Chưa kết nối được máy chủ. Lượt chấm đã lưu trên thiết bị và sẽ tự đồng bộ lại.`);
        await refresh();
      }
    } catch (cause) {
      setConflict(cause instanceof ApiError && cause.code === "ATTENDANCE_ALREADY_EXISTS");
      setError(cause instanceof Error ? cause.message : "Không gửi được lượt chấm.");
      throw cause;
    } finally { setBusy(false); }
  }

  async function discardQueue(key: string) {
    if (!window.confirm("Xóa lượt chấm đang lưu trên thiết bị? Hành động này không thể hoàn tác.")) return;
    await removeQueuedAttendance(key);
    await refresh();
  }

  return <div className="workspace-home">
    {cameraOpen && <CameraCapture kind={nextKind ?? "check_in"} onConfirm={submitAttendance} onClose={() => setCameraOpen(false)} />}
    <PageHeader title="Chấm công" description={formatDate(today) + " · Giờ Việt Nam"} action={<Button type="button" variant="secondary" disabled={busy || cameraOpen || loading} onClick={() => void refresh()}>Làm mới</Button>} />
    {!online && <Notice kind="warning">Bạn đang mất mạng. Lượt chấm được lưu trên thiết bị và sẽ gửi khi kết nối trở lại.</Notice>}
    {unassignedCount > 0 && <Notice kind="warning">Thiết bị còn {unassignedCount} lượt chấm từ phiên bản cũ chưa xác định được tài khoản. Hãy liên hệ HR để đối soát.</Notice>}
    {error && <Notice kind="error">{error}</Notice>}
    {conflict && <Link className="text-button" href="/my-requests?tab=correction">Gửi yêu cầu sửa công</Link>}
    {message && <Notice kind={message.startsWith("Đã ghi nhận") || message.startsWith("Đã đồng bộ") ? "success" : "info"}>{message}</Notice>}
    <div className="today-layout">
      <Panel>
        <div className="attendance-overview"><div><small>Hôm nay · {formatDate(today)}</small><strong>{now ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now) : "—"}</strong></div><span className="badge">{online ? "Có kết nối" : "Đang offline"}</span></div>
        {loading ? <LoadingState label="Đang tải giờ chấm…" /> : <div className="attendance-punches">
          <div><span>Vào ca</span><strong>{checkIn ? formatTime("occurred_at" in checkIn ? checkIn.occurred_at : checkIn.device_occurred_at) : "—"}</strong><small>{checkIn ? "id" in checkIn ? "Đã ghi nhận" : "Chờ đồng bộ" : "Chưa chấm vào"}</small></div>
          <div><span>Ra ca</span><strong>{checkOut ? formatTime("occurred_at" in checkOut ? checkOut.occurred_at : checkOut.device_occurred_at) : "—"}</strong><small>{checkOut ? "id" in checkOut ? "Đã ghi nhận" : "Chờ đồng bộ" : "Chưa chấm ra"}</small></div>
        </div>}
        {checkOut && <div className="attendance-worked"><span>Tổng giờ đã chấm</span><strong>{totalWorked === null ? "—" : formatMinutes(totalWorked)}</strong><small>Đã trừ khoảng nghỉ theo ca. Công thường và tăng ca xem trong bảng công tháng.{localToday.length > 0 ? " Có lượt chấm đang chờ đồng bộ." : ""}</small></div>}
        <p className="subtle-note">{policy ? `Ca chung: ${policy.start_time.slice(0, 5)}–${policy.end_time.slice(0, 5)} · Nghỉ ${policy.lunch_start.slice(0, 5)}–${policy.lunch_end.slice(0, 5)}` : policyUnavailable ? "Chưa tải được ca chung. Chọn Làm mới để thử lại." : "Chưa có ca chung hiệu lực hôm nay."}</p>
        {nextKind ? <Button type="button" className="button-large attendance-submit" disabled={busy || cameraOpen || loading || !employeeId} onClick={() => { setError(""); setMessage(""); setCameraOpen(true); }}>{busy ? "Đang ghi nhận…" : nextKind === "check_in" ? "Chấm vào" : "Chấm ra"}</Button> : <Link className="button button-secondary attendance-submit" href="/my-attendance">Xem lịch sử chấm công</Link>}
        <p className="subtle-note">{nextKind ? `Bắt buộc chụp hoặc chọn ảnh và lấy vị trí hiện tại. Giờ chấm được ghi nhận khi xác nhận${checkTime ? ` · mốc lịch ${checkTime}` : ""}.` : "Bạn đã có giờ vào và giờ ra hôm nay."}</p>
        {!nextKind && <Link className="text-button" href="/my-requests?tab=correction">Cần sửa giờ chấm?</Link>}
        {!employeeId && <Notice kind="warning">Tài khoản chưa được liên kết hồ sơ nhân viên. Liên hệ quản trị viên để chấm công.</Notice>}
      </Panel>
      <div className="today-side">
        <Panel title="Tuần này" description={checkedDates.size + " ngày đã chấm · gồm lượt đang chờ đồng bộ"}>
          <div className="reference-week">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label, index) => {
            const date = new Date(`${weekStart}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + index); const iso = date.toISOString().slice(0, 10);
            const checked = checkedDates.has(iso);
            return <div key={label} className={`${iso === today ? "today" : ""} ${checked ? "checked" : ""}`}><small>{label}</small><strong>{date.getUTCDate()}</strong><span aria-label={checked ? "Đã chấm" : "Chưa có lượt chấm"}>{checked ? "✓" : "—"}</span></div>;
          })}</div>
          <Link className="text-button" href={`/my-attendance?month=${today.slice(0, 7)}`}>Xem lịch công tháng →</Link>
        </Panel>
        <Panel title="Đồng bộ trên thiết bị" description={queue.length ? `${queue.length} lượt đang chờ xử lý` : "Không có lượt chấm chờ đồng bộ"}>
          {queue.length ? <><div className="queue-summary"><Button type="button" variant="secondary" disabled={!online || syncing} onClick={() => void sync(true)}>{syncing ? "Đang đồng bộ…" : "Đồng bộ ngay"}</Button></div><div className="queue-list">{queue.map(item => <div className="queue-item" key={item.idempotency_key}><strong>{item.kind === "check_in" ? "Chấm vào" : "Chấm ra"} · {formatDateTime(item.device_occurred_at)}</strong><p>{item.requires_attention ? "Lượt chấm cần đối soát; hãy gửi yêu cầu sửa công." : item.status === "event_synced_photo_pending" ? "Đã ghi nhận giờ chấm; ảnh đang chờ đồng bộ." : item.last_error ?? "Đã lưu trên thiết bị, chờ xác nhận máy chủ."}</p><div className="inline-actions">{item.requires_attention && <Link className="text-button" href="/my-requests?tab=correction">Gửi yêu cầu sửa công</Link>}<button className="text-button" type="button" onClick={() => void discardQueue(item.idempotency_key)}>Xóa</button></div></div>)}</div></> : <p className="muted-text">Khi mất mạng, lượt chấm sẽ được giữ tại đây cho đến khi gửi thành công.</p>}
        </Panel>
      </div>
    </div>
    {events.length > 0 && <Panel title="Lượt chấm đã ghi nhận"><div className="table-wrap"><table><thead><tr><th>Loại</th><th>Giờ ghi nhận</th><th>Nguồn</th><th>Ảnh</th><th>Vị trí</th></tr></thead><tbody>{events.map(event => <tr key={event.id}><td data-label="Loại">{event.kind === "check_in" ? "Chấm vào" : "Chấm ra"}</td><td data-label="Giờ ghi nhận">{formatDateTime(event.occurred_at)}</td><td data-label="Nguồn">{event.source === "offline" ? "Đồng bộ offline" : "Trực tuyến"}</td><td data-label="Ảnh"><StatusBadge value={event.evidence_status === "pending" ? "pending_upload" : event.evidence_status} /></td><td data-label="Vị trí">{event.location_flag === "outside" ? "Ngoài văn phòng" : event.location_flag === "inside" ? "Trong văn phòng" : event.location_flag === "inaccurate" ? "GPS chưa chính xác" : "Không có vị trí"}</td></tr>)}</tbody></table></div></Panel>}
  </div>;
}
