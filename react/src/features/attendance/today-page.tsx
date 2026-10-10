"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { businessDate, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { Button, EmptyState, Notice, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { countUnassignedQueuedAttendance, listQueuedAttendance, removeQueuedAttendance, saveQueuedAttendance, syncQueuedAttendance, type QueuedAttendance } from "./offline-queue";

type AttendanceEvent = { id: string; kind: "check_in" | "check_out"; occurred_at: string; work_date: string; source: string; evidence_status: string; location_flag: string | null };
type WorkPolicy = { start_time: string; lunch_start: string; lunch_end: string; end_time: string; working_weekdays: number[]; late_grace_minutes: number };

async function compressPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  try {
    let source: CanvasImageSource;
    let width: number;
    let height: number;
    if (typeof createImageBitmap === "function") {
      try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { bitmap = null; }
    }
    if (bitmap) {
      source = bitmap; width = bitmap.width; height = bitmap.height;
    } else {
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      source = image; width = image.naturalWidth; height = image.naturalHeight;
    }
    const scale = Math.min(1, 1280 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không xử lý được ảnh này.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.72, 0.62, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= 190_000) return blob;
    }
    const finalBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.45));
    if (finalBlob && finalBlob.size <= 200_000) return finalBlob;
    throw new Error("Ảnh vẫn lớn hơn 200 KB sau khi nén. Hãy chọn ảnh khác.");
  } finally { bitmap?.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
}

function getLocation(): Promise<{ latitude: number; longitude: number; accuracy_m: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy_m: position.coords.accuracy }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
  ));
}

export function TodayPage({ employeeId }: { employeeId: string }) {
  const today = businessDate();
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [policy, setPolicy] = useState<WorkPolicy | null>(null);
  const [policyUnavailable, setPolicyUnavailable] = useState(false);
  const [queue, setQueue] = useState<QueuedAttendance[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncInFlight = useRef(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [eventResult, pending, policyResult, unassigned] = await Promise.all([
        apiRequest<ApiEnvelope<AttendanceEvent[]>>(`/api/v1/attendance/events?from=${today}&to=${today}&page_size=31`),
        listQueuedAttendance(employeeId),
        apiRequest<ApiEnvelope<WorkPolicy | null>>("/api/v1/me/work-policy").catch(() => null),
        countUnassignedQueuedAttendance().catch(() => 0),
      ]);
      setError("");
      setEvents(eventResult.data ?? []);
      setQueue(pending);
      setPolicy(policyResult?.data ?? null);
      setPolicyUnavailable(policyResult === null);
      setUnassignedCount(unassigned);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu chấm công.");
      try { setQueue(await listQueuedAttendance(employeeId)); } catch { setQueue([]); }
    } finally { setLoading(false); }
  }, [today, employeeId]);

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
      apiRequest<ApiEnvelope<AttendanceEvent[]>>(`/api/v1/attendance/events?from=${today}&to=${today}&page_size=31`),
      listQueuedAttendance(employeeId),
      apiRequest<ApiEnvelope<WorkPolicy | null>>("/api/v1/me/work-policy").catch(() => null),
      countUnassignedQueuedAttendance().catch(() => 0),
    ]).then(([eventResult, pending, policyResult, unassigned]) => {
      if (active) { setError(""); setEvents(eventResult.data ?? []); setQueue(pending); setPolicy(policyResult?.data ?? null); setPolicyUnavailable(policyResult === null); setUnassignedCount(unassigned); }
    }).catch(async (cause: unknown) => {
      if (!active) return;
      setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu chấm công.");
      try { setQueue(await listQueuedAttendance(employeeId)); } catch { setQueue([]); }
    }).finally(() => { if (active) setLoading(false); });
    const onOnline = () => { setOnline(true); void sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const initialSyncTimer = window.setTimeout(() => { if (navigator.onLine && employeeId) void sync(); }, 0);
    return () => { active = false; window.clearTimeout(onlineTimer); window.clearTimeout(initialSyncTimer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [refresh, sync, today, employeeId]);

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

  async function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setPhoto(null); setPhotoName(""); setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Ảnh cần ở định dạng JPG, PNG hoặc WebP."); return; }
    try { setPhoto(await compressPhoto(file)); setPhotoName(file.name); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không xử lý được ảnh."); }
  }

  async function submitAttendance() {
    if (!nextKind || busy) return;
    if (!employeeId) { setError("Không xác định được hồ sơ nhân viên. Hãy đăng nhập lại."); return; }
    setBusy(true); setError(""); setConflict(false); setMessage("");
    try {
      const location = includeLocation ? await getLocation() : null;
      const locationNote = includeLocation && !location ? " Không có vị trí; lượt chấm vẫn hợp lệ." : "";
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
      // and optional photo upload still leaves the same key and photo to retry.
      await saveQueuedAttendance(item);

      if (!navigator.onLine) {
        setMessage(`Đã lưu trên thiết bị. Ứng dụng sẽ đồng bộ khi có mạng.${locationNote}`);
        await refresh();
        return;
      }

      try {
        const result = await apiRequest<ApiEnvelope<AttendanceEvent>>("/api/v1/attendance/events", {
          method: "POST",
          body: JSON.stringify({
            kind: item.kind, source: "online", device_occurred_at: item.device_occurred_at, idempotency_key: key,
            queue_owner_id: employeeId,
            latitude: item.latitude, longitude: item.longitude, accuracy_m: item.accuracy_m, photo_expected: Boolean(photo),
          }),
        });
        if (photo) {
          const form = new FormData(); form.set("photo", photo, `attendance-${item.kind}.webp`);
          try { await apiRequest(`/api/v1/attendance/events/${result.data.id}/photo`, { method: "POST", body: form }); }
          catch (cause) {
            await saveQueuedAttendance({ ...item, status: "event_synced_photo_pending" });
            setMessage(`Đã ghi nhận giờ chấm. Ảnh đang chờ đồng bộ${cause instanceof Error ? `: ${cause.message}` : "."}${locationNote}`);
            await refresh();
            return;
          }
        }
        await removeQueuedAttendance(key);
        setMessage(`Đã ghi nhận ${item.kind === "check_in" ? "giờ vào" : "giờ ra"} lúc ${formatTime(result.data.occurred_at)}.${locationNote}`);
        setPhoto(null); setPhotoName("");
        await refresh();
      } catch (cause) {
        if (cause instanceof ApiError && cause.status < 500) {
          await saveQueuedAttendance({ ...item, requires_attention: true, status: "requires_attention", last_error: cause.message });
          throw cause;
        }
        setMessage(`Chưa kết nối được máy chủ. Lượt chấm đã lưu trên thiết bị và sẽ tự đồng bộ lại.${locationNote}`);
        await refresh();
      }
    } catch (cause) {
      setConflict(cause instanceof ApiError && cause.code === "ATTENDANCE_ALREADY_EXISTS");
      setError(cause instanceof Error ? cause.message : "Không gửi được lượt chấm.");
    } finally { setBusy(false); }
  }

  async function discardQueue(key: string) {
    if (!window.confirm("Xóa lượt chấm đang lưu trên thiết bị? Hành động này không thể hoàn tác.")) return;
    await removeQueuedAttendance(key);
    await refresh();
  }

  return <>
    <PageHeader title="Chấm công hôm nay" description={`${formatDate(today)} · Múi giờ Asia/Ho_Chi_Minh`} action={<span className={`connection-pill ${online ? "connection-online" : "connection-offline"}`}>{online ? "Có kết nối" : "Đang offline"}</span>} />
    {!online && <Notice kind="warning">Bạn đang offline. Lượt chấm mới được lưu trên thiết bị và chưa được máy chủ xác nhận.</Notice>}
    {unassignedCount > 0 && <Notice kind="warning">Thiết bị còn {unassignedCount} lượt chấm từ phiên bản cũ chưa xác định được tài khoản. Các lượt này không được tự đồng bộ để tránh ghi nhầm công; hãy liên hệ HR để đối soát.</Notice>}
    {error && <Notice kind="error">{error}</Notice>}
    {conflict && <p><Link className="text-button" href="/my-requests">Gửi yêu cầu sửa công</Link></p>}
    {message && <Notice kind={message.startsWith("Đã ghi nhận") || message.startsWith("Đã đồng bộ") ? "success" : "info"}>{message}</Notice>}
    <div className="today-layout">
      <Panel title="Trạng thái hôm nay" description={policy ? `Ca chung có hiệu lực: ${policy.start_time.slice(0, 5)}–${policy.lunch_start.slice(0, 5)} và ${policy.lunch_end.slice(0, 5)}–${policy.end_time.slice(0, 5)}. Ngoài giờ không tự phát sinh tăng ca ngày thường.` : policyUnavailable ? "Không tải được ca chung hôm nay. Hãy thử làm mới trang." : "Chưa có ca chung hiệu lực hôm nay. Hãy liên hệ admin nếu không chấm công được."}>
        <div className="clock-state-grid">
          <div className={`clock-state ${checkIn ? "clock-done" : ""}`}><span className="clock-label">Giờ vào</span><strong>{checkIn ? formatTime("occurred_at" in checkIn ? checkIn.occurred_at : checkIn.device_occurred_at) : "Chưa chấm"}</strong><small>{checkIn && !("id" in checkIn) ? "Đang chờ đồng bộ" : ""}</small></div>
          <div className={`clock-state ${checkOut ? "clock-done" : ""}`}><span className="clock-label">Giờ ra</span><strong>{checkOut ? formatTime("occurred_at" in checkOut ? checkOut.occurred_at : checkOut.device_occurred_at) : "Chưa chấm"}</strong><small>{checkOut && !("id" in checkOut) ? "Đang chờ đồng bộ" : ""}</small></div>
        </div>
        <div className="checklist">
          <label className="check-item"><input type="checkbox" checked={includeLocation} onChange={(event) => setIncludeLocation(event.target.checked)} /> Ghi vị trí nếu thiết bị cho phép (tùy chọn)</label>
          <label className="check-item"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choosePhoto} /> Ảnh chấm công (tùy chọn)</label>
        </div>
        {photoName && <p className="selected-file">Ảnh đã nén: {photoName} <Button type="button" variant="ghost" onClick={() => { setPhoto(null); setPhotoName(""); }}>Bỏ ảnh</Button></p>}
        <div className="attendance-action">
          {nextKind ? <Button type="button" className="button-large" disabled={busy || loading} onClick={submitAttendance}>
            {busy ? "Đang ghi nhận…" : nextKind === "check_in" ? "Chấm vào" : "Chấm ra"}
          </Button> : <Link className="button button-primary button-large" href="/my-attendance">Xem lịch sử chấm công</Link>}
          <span className="attendance-next">{nextKind ? `Giờ hệ thống hiện tại${checkTime ? ` · mốc lịch ${checkTime}` : ""}` : "Bạn đã chấm đủ vào và ra."}</span>
          {!nextKind && <Link className="text-button" href="/my-requests">Gửi yêu cầu sửa công</Link>}
        </div>
        <p className="subtle-note">Ảnh và GPS là tùy chọn. Thiếu ảnh, GPS hoặc tọa độ văn phòng không ngăn chấm công; cờ ngoài văn phòng không làm mất công.</p>
      </Panel>
      <Panel title="Đồng bộ trên thiết bị" description="Event offline được giữ trong IndexedDB cho đến khi máy chủ xác nhận.">
        <div className="queue-summary"><strong>{queue.length}</strong><span>lượt đang chờ</span><Button type="button" variant="secondary" disabled={!online || syncing || queue.length === 0} onClick={() => void sync(true)}>{syncing ? "Đang đồng bộ…" : "Đồng bộ ngay"}</Button></div>
        {queue.length > 0 ? <div className="queue-list">{queue.map((item) => <div className="queue-item" key={item.idempotency_key}>
          <div><strong>{item.kind === "check_in" ? "Chấm vào" : "Chấm ra"} · {formatDateTime(item.device_occurred_at)}</strong><small>{item.requires_attention ? "Lượt chấm cần đối soát; hãy gửi yêu cầu sửa công." : item.status === "event_synced_photo_pending" ? "Đã ghi nhận giờ chấm; ảnh đang chờ đồng bộ." : item.last_error ?? "Đã lưu trên thiết bị, chờ xác nhận máy chủ."}</small>{item.requires_attention && <Link className="text-button" href="/my-requests">Gửi yêu cầu sửa công</Link>}</div>
          <button className="text-button" type="button" onClick={() => discardQueue(item.idempotency_key)}>Xóa</button>
        </div>)}</div> : <EmptyState title="Không có lượt chấm chờ" description="Lượt chấm được giữ ở đây nếu mạng bị gián đoạn." />}
      </Panel>
    </div>
    <Panel title="Lượt chấm hôm nay" description="Lượt chấm ngoài văn phòng vẫn được ghi nhận; nhãn vị trí chỉ để HR tham khảo.">
      {loading ? <p className="table-loading">Đang tải…</p> : events.length === 0 ? <EmptyState title="Chưa có lượt chấm từ máy chủ" description={queue.length ? "Dữ liệu trong hàng đợi chưa được tính là đã đồng bộ." : "Khi chấm vào hoặc ra, lịch sử sẽ hiển thị tại đây."} /> : <div className="table-wrap"><table><thead><tr><th>Loại</th><th>Giờ ghi nhận</th><th>Nguồn</th><th>Ảnh</th><th>Vị trí</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.kind === "check_in" ? "Chấm vào" : "Chấm ra"}</td><td>{formatDateTime(event.occurred_at)}</td><td>{event.source === "offline" ? "Đồng bộ offline" : "Trực tuyến"}</td><td><StatusBadge value={event.evidence_status === "pending" ? "pending_upload" : event.evidence_status} /></td><td>{event.location_flag === "outside" ? "Ngoài văn phòng" : event.location_flag === "inside" ? "Trong văn phòng" : event.location_flag === "inaccurate" ? "GPS chưa chính xác" : "Không có vị trí"}</td></tr>)}</tbody></table></div>}
    </Panel>
  </>;
}
