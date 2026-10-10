"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Dialog } from "@/components/dialog";
import { Button, EmptyState, Field, Notice, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { businessDate, formatDate, formatDateTime, formatTime } from "@/lib/format";

type EventRow = { id: string; work_date: string; kind: "check_in" | "check_out"; occurred_at: string; source: string; location_flag: string | null; evidence_status: string; review_status: string };

export function AttendanceHistoryPage() {
  const params = useSearchParams();
  const requestedMonth = params.get("month");
  const [month, setMonth] = useState(() => requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : businessDate().slice(0, 7));
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [view, setView] = useState("list");
  useEffect(() => {
    let active = true;
    const [year, number] = month.split("-").map(Number);
    const from = `${month}-01`, to = new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
    apiRequest<ApiEnvelope<EventRow[]>>(`/api/v1/attendance/events?from=${from}&to=${to}&page_size=62`)
      .then(result => { if (active) { setRows(result.data ?? []); setError(""); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được lịch sử chấm công."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month]);
  const days = useMemo(() => {
    const grouped = new Map<string, EventRow[]>();
    for (const event of rows) if (!source || event.source === source) grouped.set(event.work_date, [...(grouped.get(event.work_date) ?? []), event]);
    return [...grouped].sort(([left], [right]) => right.localeCompare(left)).map(([date, events]) => ({ date, events, checkIn: events.find(event => event.kind === "check_in"), checkOut: events.find(event => event.kind === "check_out") }));
  }, [rows, source]);
  const selected = rows.filter(event => event.work_date === selectedDate);
  const first = new Date(`${month}-01T00:00:00Z`), offset = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return <div className="personal-attendance-history">
    <PageHeader title="Lịch sử chấm công" description="Theo dõi lịch công và các lượt chấm của bạn" />
    {error && <Notice kind="error">{error}</Notice>}
    <Panel title="Lịch công của tôi" action={<div className="leave-view-switch"><Button type="button" variant={view === "list" ? "primary" : "ghost"} aria-pressed={view === "list"} onClick={() => setView("list")}>Danh sách</Button><Button type="button" variant={view === "calendar" ? "primary" : "ghost"} aria-pressed={view === "calendar"} onClick={() => setView("calendar")}>Lịch</Button></div>}>
      <div className="reference-history-controls"><Field label="Tháng"><input type="month" required value={month} onChange={event => { if (event.target.value) { setMonth(event.target.value); setLoading(true); } }} /></Field><Field label="Nguồn chấm công"><select value={source} onChange={event => setSource(event.target.value)}><option value="">Tất cả nguồn</option><option value="online">Trực tuyến</option><option value="offline">Đồng bộ offline</option></select></Field><span className="subtle-note">{loading ? "Đang tải…" : `${days.length} ngày có lượt chấm`}</span></div>
      {!loading && view === "list" && <div className="phone-work-history">{days.map(day => <details className="phone-work-day" key={day.date}><summary><div className="phone-work-day-head"><strong>{formatDate(day.date)}</strong><span>{day.checkOut ? "Đã chấm ra" : "Đã chấm vào"}</span></div><div className="phone-work-day-times"><span>{formatTime(day.checkIn?.occurred_at)} → {formatTime(day.checkOut?.occurred_at)}</span><strong>{day.events.length} lượt chấm</strong></div><div className="phone-work-day-foot"><span>{day.events.some(event => event.source === "offline") ? "Có đồng bộ offline" : "Trực tuyến"}</span><span className="phone-work-expand">Chi tiết <span>⌄</span></span></div></summary><div className="phone-work-day-detail">{day.events.map(event => <p key={event.id}>{event.kind === "check_in" ? "Vào ca" : "Ra ca"} · {formatTime(event.occurred_at)} · <StatusBadge value={event.review_status} /></p>)}<Button type="button" variant="secondary" onClick={() => setSelectedDate(day.date)}>Xem thông tin lượt chấm</Button></div></details>)}</div>}
      {loading ? <p className="loading-state" role="status">Đang tải lịch sử…</p> : view === "calendar" ? <div className="leave-calendar">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(label => <span key={label} className="calendar-weekday">{label}</span>)}{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: count }, (_, index) => { const date = `${month}-${String(index + 1).padStart(2, "0")}`, day = days.find(item => item.date === date); return <button type="button" key={date} className={`calendar-day ${date === businessDate() ? "calendar-today" : ""}`} aria-label={`${formatDate(date)}, ${day?.events.length ?? 0} lượt chấm`} onClick={() => setSelectedDate(date)}><span>{index + 1}</span>{day && <><small>Vào: {formatTime(day.checkIn?.occurred_at)}</small><small>Ra: {formatTime(day.checkOut?.occurred_at)}</small></>}</button>; })}</div> : days.length ? <div className="table-wrap" style={{ marginTop: 18 }}><table><thead><tr><th>Ngày</th><th>Vào ca</th><th>Ra ca</th><th>Nguồn</th><th>Đối soát</th><th>Thao tác</th></tr></thead><tbody>{days.map(day => <tr key={day.date}><td>{formatDate(day.date)}</td><td>{formatTime(day.checkIn?.occurred_at)}</td><td>{formatTime(day.checkOut?.occurred_at)}</td><td>{day.events.some(event => event.source === "offline") ? "Có đồng bộ offline" : "Trực tuyến"}</td><td>{[...new Set(day.events.map(event => event.review_status))].map(status => <StatusBadge key={status} value={status} />)}</td><td><Button type="button" variant="ghost" onClick={() => setSelectedDate(day.date)}>Xem chi tiết</Button></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có lượt chấm trong tháng này" description="Lượt chấm đã đồng bộ sẽ hiển thị tại đây." />}
    </Panel>
    {selectedDate && <Dialog title={`Chi tiết công · ${formatDate(selectedDate)}`} onClose={() => setSelectedDate(null)}>{selected.length ? <div className="request-list">{selected.map(event => <article className="request-card" key={event.id}><strong>{event.kind === "check_in" ? "Vào ca" : "Ra ca"} · {formatDateTime(event.occurred_at)}</strong><p>{event.source === "offline" ? "Đồng bộ offline" : "Trực tuyến"} · {event.location_flag === "outside" ? "Ngoài văn phòng" : event.location_flag === "inside" ? "Trong văn phòng" : "Không có vị trí"}</p><div className="inline-actions"><StatusBadge value={event.evidence_status} /><StatusBadge value={event.review_status} /></div></article>)}</div> : <EmptyState title="Chưa có lượt chấm ngày này" />}</Dialog>}
  </div>;
}
