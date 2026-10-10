"use client";

import { useState } from "react";
import { Button, EmptyState, Field, Panel, StatusBadge } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { businessDate, formatDate, formatDateTime, labelStatus } from "@/lib/format";

export type LeaveRequest = { id: string; leave_type_id?: string; start_date: string; end_date: string; total_days: number; day_parts: { date: string; part: string }[]; reason: string; status: string; review_note: string | null; created_at: string; leave_types?: { name: string; deducts_annual_balance?: boolean } | { name: string; deducts_annual_balance?: boolean }[] | null };
export function leaveName(item: LeaveRequest) { return (Array.isArray(item.leave_types) ? item.leave_types[0]?.name : item.leave_types?.name) ?? "Đơn nghỉ"; }

export function LeaveHistory({ rows, types, loading, busy, onCancel }: { rows: LeaveRequest[]; types: { id: string; name: string }[]; loading: boolean; busy: boolean; onCancel: (id: string) => void }) {
  const [view, setView] = useState("list");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState(() => businessDate().slice(0, 7));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const selected = rows.find(item => item.id === selectedId);
  const invalid = !!from && !!to && from > to;
  const filtered = rows.filter(item => (!status || item.status === status) && (!type || item.leave_type_id === type) && `${leaveName(item)} ${item.reason}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")) && (!from || item.end_date >= from) && (!to || item.start_date <= to));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const monthStart = new Date(`${month}-01T00:00:00Z`);
  const offset = (monthStart.getUTCDay() + 6) % 7;
  const count = new Date(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0).getDate();
  function shiftMonth(delta: number) { const date = new Date(monthStart); date.setUTCMonth(date.getUTCMonth() + delta); setMonth(date.toISOString().slice(0, 7)); }
  return <Panel title="Lịch nghỉ của tôi" className="leave-history" action={<div className="leave-view-switch" aria-label="Cách xem lịch nghỉ">{[["list", "Danh sách"], ["calendar", "Lịch"]].map(([value, label]) => <button type="button" key={value} className="tab-button" aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>)}</div>}>
    <div className="leave-filters">
      <Field label="Trạng thái"><select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option>{["pending", "approved", "rejected", "cancelled"].map(value => <option key={value} value={value}>{labelStatus(value)}</option>)}</select></Field>
      <Field label="Loại nghỉ"><select value={type} onChange={event => { setType(event.target.value); setPage(1); }}><option value="">Tất cả loại nghỉ</option>{types.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Tìm kiếm"><input type="search" placeholder="Tìm loại nghỉ hoặc lý do" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></Field>
      <Field label="Từ ngày"><input type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} /></Field>
      <Field label="Đến ngày"><input type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(1); }} /></Field>
    </div>
    {(status || type || search || from || to) && <Button type="button" variant="ghost" onClick={() => { setStatus(""); setType(""); setSearch(""); setFrom(""); setTo(""); }}>Xóa bộ lọc</Button>}
    {!loading && !invalid && view === "list" && visible.length > 0 && <div className="phone-leave-list">{visible.map(item => <article className="phone-leave-item" key={item.id}><div className="phone-leave-item-head"><strong>{leaveName(item)}</strong><StatusBadge value={item.status} /></div><p>{formatDate(item.start_date)}{item.start_date !== item.end_date && ` → ${formatDate(item.end_date)}`}</p><div className="phone-leave-item-foot"><span>{item.total_days} ngày</span><button type="button" onClick={() => setSelectedId(item.id)} aria-label={`Xem chi tiết ${leaveName(item)} ${formatDate(item.start_date)}`}>Xem chi tiết ›</button></div></article>)}</div>}
    {invalid ? <p role="alert" className="notice notice-error">Ngày kết thúc phải từ ngày bắt đầu trở đi.</p> : loading ? <p className="loading-state" role="status">Đang tải lịch nghỉ…</p> : view === "list" ? filtered.length ? <div className="table-wrap leave-table" tabIndex={0} role="region" aria-label="Danh sách đơn nghỉ, cuộn ngang để xem thêm"><table><thead><tr><th>Loại nghỉ</th><th>Thời gian nghỉ</th><th>Gửi đơn lúc</th><th>Số ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><strong>{leaveName(item)}</strong></td><td>{formatDate(item.start_date)}<br /><span className="subtle-note">→ {formatDate(item.end_date)}</span></td><td>{formatDateTime(item.created_at)}</td><td>{item.total_days} ngày</td><td><StatusBadge value={item.status} /></td><td><button type="button" className="leave-view-btn" onClick={() => setSelectedId(item.id)}>Xem</button></td></tr>)}</tbody></table></div> : <EmptyState title="Không có đơn nghỉ phù hợp" description="Tạo đơn mới hoặc thay đổi bộ lọc để xem lịch nghỉ." /> : <>
      <div className="leave-month"><Button type="button" variant="secondary" aria-label="Tháng trước" onClick={() => shiftMonth(-1)}>‹</Button><strong>Tháng {month.slice(5)} / {month.slice(0, 4)}</strong><Button type="button" variant="secondary" aria-label="Tháng sau" onClick={() => shiftMonth(1)}>›</Button></div>
      <div className="leave-calendar">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: count }, (_, index) => { const date = `${month}-${String(index + 1).padStart(2, "0")}`; const items = filtered.filter(item => item.day_parts?.length ? item.day_parts.some(part => part.date === date) : item.start_date <= date && item.end_date >= date); return <button type="button" key={date} className={`calendar-day ${date === businessDate() ? "calendar-today" : ""}`} aria-label={`${formatDate(date)}, ${items.length} đơn nghỉ`} onClick={() => { setFrom(date); setTo(date); setView("list"); }}><span>{index + 1}</span>{items.slice(0, 2).map(item => <small key={item.id} title={`${leaveName(item)} · ${labelStatus(item.status)}`}>{leaveName(item)}</small>)}{items.length > 2 && <small>+{items.length - 2} đơn</small>}</button>; })}</div><p className="subtle-note">Chọn một ngày để xem các đơn nghỉ của ngày đó.</p>
    </>}
    {view === "list" && !loading && <footer className="reference-pagination"><span>Hiển thị {visible.length} / {filtered.length} đơn · 100 đơn gần nhất</span><div><Button type="button" variant="secondary" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</Button><span>{currentPage} / {pageCount}</span><Button type="button" variant="secondary" aria-label="Trang sau" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>›</Button></div></footer>}
    {selected && <Dialog title="Chi tiết đơn nghỉ phép" busy={busy} onClose={() => setSelectedId(null)}><div className="reference-request-details"><StatusBadge value={selected.status} /><h3>{leaveName(selected)}</h3><p>{formatDate(selected.start_date)} → {formatDate(selected.end_date)} · {selected.total_days} ngày</p><p>Gửi đơn lúc: {formatDateTime(selected.created_at)}</p><h4>Lý do nghỉ</h4><p>{selected.reason}</p>{selected.review_note && <p>Ghi chú: {selected.review_note}</p>}{selected.status === "pending" && <Button type="button" variant="danger" disabled={busy} onClick={() => onCancel(selected.id)}>Hủy đơn</Button>}</div></Dialog>}
  </Panel>;
}
