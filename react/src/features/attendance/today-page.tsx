"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { businessDate, formatDate, formatDateTime, formatTime } from "@/lib/format";
import { Button, EmptyState, Notice, Panel, StatusBadge } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { listQueuedAttendance, removeQueuedAttendance, saveQueuedAttendance, syncQueuedAttendance, type QueuedAttendance } from "./offline-queue";

type AttendanceEvent = { id: string; kind: "check_in" | "check_out"; occurred_at: string; work_date: string; source: string; evidence_status: string; location_flag: string | null };

async function compressPhoto(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") {
    if (file.size <= 200_000) return file;
    throw new Error("Trình duyệt không hỗ trợ nén ảnh. Hãy chọn ảnh nhỏ hơn 200 KB.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không xử lý được ảnh này.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.72, 0.62, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= 190_000) return blob;
    }
    const finalBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.45));
    if (finalBlob && finalBlob.size <= 200_000) return finalBlob;
    throw new Error("Ảnh vẫn lớn hơn 200 KB sau khi nén. Hãy chọn ảnh khác.");
  } finally { bitmap.close(); }
}

function getLocation(): Promise<{ latitude: number; longitude: number; accuracy_m: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => navigator.geolocation.getCurrentPosition(
    (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy_m: position.coords.accuracy }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
  ));
}

export function TodayPage() {
  const today = businessDate();
  const weekStartDate = new Date(`${today}T00:00:00Z`);
  weekStartDate.setUTCDate(weekStartDate.getUTCDate() - (weekStartDate.getUTCDay() + 6) % 7);
  const weekStart = weekStartDate.toISOString().slice(0, 10);
  const [weekEvents, setWeekEvents] = useState<AttendanceEvent[]>([]);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [queue, setQueue] = useState<QueuedAttendance[]>([]);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [includeLocation, setIncludeLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [mobileCapture, setMobileCapture] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [eventResult, pending] = await Promise.all([
        apiRequest<ApiEnvelope<AttendanceEvent[]>>(`/api/v1/attendance/events?from=${weekStart}&to=${today}&page_size=31`),
        listQueuedAttendance(),
      ]);
      setError("");
      setEvents((eventResult.data ?? []).filter(event => event.work_date === today)); setWeekEvents(eventResult.data ?? []);
      setQueue(pending);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu chấm công.");
      try { setQueue(await listQueuedAttendance()); } catch { setQueue([]); }
    } finally { setLoading(false); }
  }, [today, weekStart]);

  const sync = useCallback(async () => {
    if (!navigator.onLine) { setMessage("Thiết bị đang offline. Lượt chấm vẫn được giữ trên thiết bị."); return; }
    setSyncing(true);
    setMessage("");
    try {
      const result = await syncQueuedAttendance();
      if (result.synced) setMessage(`Đã đồng bộ ${result.synced} lượt chấm lên máy chủ.`);
      else if (result.message) setMessage(`Chưa đồng bộ được: ${result.message}`);
      await refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Chưa đồng bộ được hàng đợi.");
    } finally { setSyncing(false); }
  }, [refresh]);

  useEffect(() => {
    const onlineTimer = window.setTimeout(() => setOnline(navigator.onLine), 0);
    let active = true;
    Promise.all([
      apiRequest<ApiEnvelope<AttendanceEvent[]>>(`/api/v1/attendance/events?from=${weekStart}&to=${today}&page_size=31`),
      listQueuedAttendance(),
    ]).then(([eventResult, pending]) => {
      if (active) { setError(""); setEvents((eventResult.data ?? []).filter(event => event.work_date === today)); setWeekEvents(eventResult.data ?? []); setQueue(pending); }
    }).catch(async (cause: unknown) => {
      if (!active) return;
      setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu chấm công.");
      try { setQueue(await listQueuedAttendance()); } catch { setQueue([]); }
    }).finally(() => { if (active) setLoading(false); });
    const onOnline = () => { setOnline(true); void sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { active = false; window.clearTimeout(onlineTimer); window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, [refresh, sync, today, weekStart]);

  const localToday = queue.filter((item) => item.device_occurred_at && businessDate(new Date(item.device_occurred_at)) === today);
  const checkIn = events.find((event) => event.kind === "check_in") ?? localToday.find((event) => event.kind === "check_in");
  const checkOut = events.find((event) => event.kind === "check_out") ?? localToday.find((event) => event.kind === "check_out");
  const nextKind = !checkIn ? "check_in" : !checkOut ? "check_out" : null;

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
    setBusy(true); setError(""); setMessage("");
    try {
      const location = includeLocation ? await getLocation() : null;
      if (includeLocation && !location) setMessage("Không lấy được vị trí. Hệ thống vẫn cho phép chấm công.");
      const key = crypto.randomUUID();
      const occurredAt = new Date().toISOString();
      const item: QueuedAttendance = {
        idempotency_key: key, kind: nextKind, device_occurred_at: occurredAt,
        latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, accuracy_m: location?.accuracy_m ?? null,
        photo, queued_at: occurredAt, requires_attention: false, last_error: null,
      };

      if (!navigator.onLine) {
        await saveQueuedAttendance(item);
        setMessage("Đã lưu trên thiết bị. Ứng dụng sẽ đồng bộ khi có mạng.");
        await refresh(); setMobileCapture(false);
        return;
      }

      try {
        const result = await apiRequest<ApiEnvelope<AttendanceEvent>>("/api/v1/attendance/events", {
          method: "POST",
          body: JSON.stringify({
            kind: item.kind, source: "online", device_occurred_at: null, idempotency_key: key,
            latitude: item.latitude, longitude: item.longitude, accuracy_m: item.accuracy_m, photo_expected: Boolean(photo),
          }),
        });
        if (photo) {
          const form = new FormData(); form.set("photo", photo, `attendance-${item.kind}.webp`);
          try { await apiRequest(`/api/v1/attendance/events/${result.data.id}/photo`, { method: "POST", body: form }); }
          catch (cause) {
            await saveQueuedAttendance(item);
            setMessage(`Đã ghi nhận giờ chấm. Ảnh đang chờ đồng bộ${cause instanceof Error ? `: ${cause.message}` : "."}`);
            await refresh(); setMobileCapture(false);
            return;
          }
        }
        setMessage(`Đã ghi nhận ${item.kind === "check_in" ? "giờ vào" : "giờ ra"} lúc ${formatTime(result.data.occurred_at)}.`);
        setPhoto(null); setPhotoName("");
        await refresh(); setMobileCapture(false);
      } catch (cause) {
        if (cause instanceof ApiError && cause.status < 500) throw cause;
        await saveQueuedAttendance(item);
        setMessage("Chưa kết nối được máy chủ. Lượt chấm đã lưu trên thiết bị và sẽ tự đồng bộ lại.");
        await refresh(); setMobileCapture(false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không gửi được lượt chấm.");
    } finally { setBusy(false); }
  }

  async function discardQueue(key: string) {
    if (!window.confirm("Xóa lượt chấm đang lưu trên thiết bị? Hành động này không thể hoàn tác.")) return;
    await removeQueuedAttendance(key);
    await refresh();
  }

  return <div className="reference-attendance">
    {!online && <Notice kind="warning">Bạn đang offline. Lượt chấm mới được lưu trên thiết bị và chưa được máy chủ xác nhận.</Notice>}
    {error && <Notice kind="error">{error}</Notice>}
    {message && <Notice kind={message.startsWith("Đã ghi nhận") || message.startsWith("Đã đồng bộ") ? "success" : "info"}>{message}</Notice>}
    <section className="phone-attendance">
      <header className="phone-attendance-heading"><h1>Chấm công của tôi</h1><span>Theo dõi ca làm hôm nay</span></header>
      <div className="phone-clock-card"><p>{now ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(now) : formatDate(today)}</p><strong className="phone-live-clock">{now ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now) : "—"}</strong><div>◷ Ca làm hôm nay</div><b>Giờ ca theo cấu hình công ty</b></div>
      <div className="phone-attendance-body"><div className="phone-status-row"><span aria-hidden="true">⌖</span><div><strong>Vị trí chấm công</strong><small>{includeLocation ? "Lấy vị trí khi xác nhận" : "Vị trí là tùy chọn"}</small></div></div><div className="phone-status-row"><span aria-hidden="true">⌁</span><div><strong>{online ? "Kết nối sẵn sàng" : "Không có kết nối mạng"}</strong><small className={online ? "phone-online" : ""}>{online ? "Thiết bị đang trực tuyến" : "Lượt chấm sẽ được lưu trên thiết bị"}</small></div></div><section className="phone-timeline"><h2>Dòng thời gian hôm nay</h2>{loading ? <p role="status">Đang tải…</p> : !checkIn ? <p>Chưa có lượt chấm hôm nay</p> : <><div><i /><span>Vào ca</span><b>{formatTime("occurred_at" in checkIn ? checkIn.occurred_at : checkIn.device_occurred_at)}</b></div>{checkOut && <div><i /><span>Ra ca</span><b>{formatTime("occurred_at" in checkOut ? checkOut.occurred_at : checkOut.device_occurred_at)}</b></div>}<p>{localToday.length ? "Có lượt chấm đang chờ đồng bộ" : "Lượt chấm đã được máy chủ ghi nhận"}</p></>}</section></div>
      <div className="phone-check-action"><button type="button" disabled={!nextKind || loading || busy} onClick={() => { setError(""); setMobileCapture(true); }}>▣ {nextKind === "check_in" ? "Chấm vào" : nextKind === "check_out" ? "Chấm ra" : "Đã hoàn tất hôm nay"}</button></div>
    </section>
    {queue.length > 0 && <div className="phone-attendance phone-queue">      <Panel title="Đồng bộ trên thiết bị" description="Event offline được giữ trong IndexedDB cho đến khi máy chủ xác nhận.">
        <div className="queue-summary"><strong>{queue.length}</strong><span>lượt đang chờ</span><Button type="button" variant="secondary" disabled={!online || syncing || queue.length === 0} onClick={sync}>{syncing ? "Đang đồng bộ…" : "Đồng bộ ngay"}</Button></div>
        {queue.length > 0 ? <div className="queue-list">{queue.map((item) => <div className="queue-item" key={item.idempotency_key}>
          <div><strong>{item.kind === "check_in" ? "Chấm vào" : "Chấm ra"} · {formatDateTime(item.device_occurred_at)}</strong><small>{item.requires_attention ? "Có xung đột; hãy gửi yêu cầu sửa công." : item.last_error ?? "Đã lưu trên thiết bị, chờ xác nhận máy chủ."}</small></div>
          <button className="text-button" type="button" onClick={() => discardQueue(item.idempotency_key)}>Xóa</button>
        </div>)}</div> : <EmptyState title="Không có lượt chấm chờ" description="Lượt chấm được giữ ở đây nếu mạng bị gián đoạn." />}
      </Panel></div>}
    {mobileCapture && <Dialog title={nextKind === "check_out" ? "Chấm ra" : "Chấm vào"} className="phone-camera-sheet" busy={busy} onClose={() => setMobileCapture(false)}><p>Ảnh và vị trí là tùy chọn. Xác nhận để ghi nhận giờ chấm công.</p><label className="reference-photo-label"><input className="reference-photo-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={choosePhoto} />{photoName ? `Ảnh sẵn sàng: ${photoName}` : "Chọn hoặc chụp ảnh của bạn"}</label><div className="reference-attendance-options"><label className="check-item"><input type="checkbox" checked={includeLocation} disabled={busy} onChange={event => setIncludeLocation(event.target.checked)} />Ghi vị trí (tùy chọn)</label>{photo && <Button type="button" variant="ghost" disabled={busy} onClick={() => { setPhoto(null); setPhotoName(""); }}>Bỏ ảnh</Button>}</div>{error && <Notice kind="error">{error}</Notice>}<button type="button" className="phone-camera-confirm" disabled={!nextKind || busy || loading} onClick={submitAttendance}>{busy ? "Đang ghi nhận…" : "Xác nhận chấm công"}</button></Dialog>}
    <div className="desktop-attendance-content">
    <div className="today-layout">
      <Panel title="Chấm công" description={nextKind === "check_out" ? "Ghi nhận giờ ra ca của bạn." : nextKind ? "Ghi nhận giờ vào ca của bạn." : "Đã chấm công hôm nay. Cảm ơn bạn!"} action={<span className={`connection-pill ${online ? "connection-online" : "connection-offline"}`}>{online ? "Có kết nối" : "Đang offline"}</span>}>
        <label className="reference-photo-label"><input className="reference-photo-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choosePhoto} /><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7h5l2-3h4l2 3h5v14H3Z" /><circle cx="12" cy="14" r="4" /></svg>{photoName ? `Ảnh sẵn sàng: ${photoName}` : "Chọn hoặc chụp ảnh của bạn (tùy chọn)"}</label>
        <div className="reference-attendance-options"><label className="check-item"><input type="checkbox" checked={includeLocation} onChange={event => setIncludeLocation(event.target.checked)} />Ghi vị trí nếu thiết bị cho phép (tùy chọn)</label>{photo && <Button type="button" variant="ghost" onClick={() => { setPhoto(null); setPhotoName(""); }}>Bỏ ảnh đã chọn</Button>}</div>
        <div className="attendance-action">
          <Button type="button" className="button-large" disabled={!nextKind || busy || loading} onClick={submitAttendance}>
            {busy ? "Đang ghi nhận…" : nextKind === "check_in" ? "Chấm vào" : nextKind === "check_out" ? "Chấm ra" : "Đã đủ lượt chấm hôm nay"}
          </Button>
          <span className="attendance-next">{nextKind ? "Giờ chấm sẽ được ghi nhận khi bạn xác nhận." : "Bạn đã chấm đủ vào và ra."}</span>
        </div>
        <p className="subtle-note">Ảnh và GPS là tùy chọn. Bạn vẫn có thể chấm công khi không có ảnh hoặc vị trí.</p>
        <div className="reference-attendance-status">
          <div><span>Vào ca</span><strong>{checkIn ? formatTime("occurred_at" in checkIn ? checkIn.occurred_at : checkIn.device_occurred_at) : "—"}</strong><small>{checkIn && !("id" in checkIn) ? "Đang chờ đồng bộ" : ""}</small></div>
          <div><span>Ra ca</span><strong>{checkOut ? formatTime("occurred_at" in checkOut ? checkOut.occurred_at : checkOut.device_occurred_at) : "—"}</strong><small>{checkOut && !("id" in checkOut) ? "Đang chờ đồng bộ" : ""}</small></div>
          <div><span>Hôm nay</span><strong>{checkOut ? "Đã hoàn tất" : checkIn ? "Đang trong ca" : "Chưa vào ca"}</strong><small>{formatDate(today)}</small></div>
        </div>
        <div className="reference-week-header"><h2>Tuần này</h2><span>{new Set(weekEvents.map(event => event.work_date)).size} ngày đã chấm</span></div>
        <div className="reference-week">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label, index) => { const date = new Date(`${weekStart}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + index); const iso = date.toISOString().slice(0, 10); return <Link key={label} href={`/my-attendance?month=${iso.slice(0, 7)}`} aria-current={iso === today ? "date" : undefined} data-checked={weekEvents.some(event => event.work_date === iso)}><strong>{date.getUTCDate()}</strong><span>{label}</span></Link>; })}</div>
      </Panel>

      <Panel title="Đồng bộ trên thiết bị" description="Event offline được giữ trong IndexedDB cho đến khi máy chủ xác nhận.">
        <div className="queue-summary"><strong>{queue.length}</strong><span>lượt đang chờ</span><Button type="button" variant="secondary" disabled={!online || syncing || queue.length === 0} onClick={sync}>{syncing ? "Đang đồng bộ…" : "Đồng bộ ngay"}</Button></div>
        {queue.length > 0 ? <div className="queue-list">{queue.map((item) => <div className="queue-item" key={item.idempotency_key}>
          <div><strong>{item.kind === "check_in" ? "Chấm vào" : "Chấm ra"} · {formatDateTime(item.device_occurred_at)}</strong><small>{item.requires_attention ? "Có xung đột; hãy gửi yêu cầu sửa công." : item.last_error ?? "Đã lưu trên thiết bị, chờ xác nhận máy chủ."}</small></div>
          <button className="text-button" type="button" onClick={() => discardQueue(item.idempotency_key)}>Xóa</button>
        </div>)}</div> : <EmptyState title="Không có lượt chấm chờ" description="Lượt chấm được giữ ở đây nếu mạng bị gián đoạn." />}
      </Panel>
    </div>
    <Panel title="Lượt chấm hôm nay" description="Lượt chấm ngoài văn phòng vẫn được ghi nhận; nhãn vị trí chỉ để HR tham khảo.">
      {loading ? <p className="table-loading">Đang tải…</p> : events.length === 0 ? <EmptyState title="Chưa có lượt chấm từ máy chủ" description={queue.length ? "Dữ liệu trong hàng đợi chưa được tính là đã đồng bộ." : "Khi chấm vào hoặc ra, lịch sử sẽ hiển thị tại đây."} /> : <div className="table-wrap"><table><thead><tr><th>Loại</th><th>Giờ ghi nhận</th><th>Nguồn</th><th>Ảnh</th><th>Vị trí</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.kind === "check_in" ? "Chấm vào" : "Chấm ra"}</td><td>{formatDateTime(event.occurred_at)}</td><td>{event.source === "offline" ? "Đồng bộ offline" : "Trực tuyến"}</td><td><StatusBadge value={event.evidence_status} /></td><td>{event.location_flag === "outside" ? "Ngoài văn phòng" : event.location_flag === "inside" ? "Trong văn phòng" : "Không có vị trí"}</td></tr>)}</tbody></table></div>}
    </Panel>
    </div>
  </div>;
}
