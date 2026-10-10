"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { formatDateTime, labelStatus } from "@/lib/format";

type RequestItem = { id: string; status: string; created_at: string; employees?: { full_name: string } | { full_name: string }[] | null };
type Requests = { leave: RequestItem[]; overtime: RequestItem[]; corrections: RequestItem[] };

export function NotificationBell({ role, onOpen }: { role: "employee" | "hr" | "admin"; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Requests | null>(null);
  const [retry, setRetry] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const employee = role === "employee";
  const href = employee ? "/my-requests" : "/hr/requests";
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let active = true;
    apiRequest<ApiEnvelope<Requests>>(employee ? "/api/v1/me/requests" : "/api/v1/hr/requests", { signal: controller.signal })
      .then(result => { if (active) setData(result.data); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được thông báo."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [open, employee, retry]);
  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    function keyboard(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } }
    document.addEventListener("mousedown", outside); window.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("mousedown", outside); window.removeEventListener("keydown", keyboard); };
  }, [open]);
  const rows = data ? [
    ...data.leave.map(item => ({ ...item, kind: "Đơn nghỉ phép" })),
    ...data.overtime.map(item => ({ ...item, kind: "Yêu cầu tăng ca" })),
    ...data.corrections.map(item => ({ ...item, kind: "Đề nghị sửa công" })),
  ].sort((left, right) => right.created_at.localeCompare(left.created_at)) : [];
  const pending = rows.filter(item => item.status === "pending").length;
  return <div className="notification-container" ref={container} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={button} type="button" className="reference-header-button notification-trigger" aria-label="Thông báo" aria-expanded={open} aria-controls="notification-panel" onClick={() => { if (!open) { setLoading(true); setError(""); onOpen(); } setOpen(value => !value); }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4" /></svg>
    </button>
    {open && <section id="notification-panel" className="notification-panel" aria-labelledby="notification-heading"><header><div><h2 id="notification-heading">Thông báo</h2><p>{employee ? "Yêu cầu của bạn gần đây" : "Yêu cầu chờ xử lý"}</p></div><button type="button" aria-label="Đóng thông báo" onClick={() => { setOpen(false); button.current?.focus(); }}>×</button></header>
      <div className="notification-body">{loading ? <p className="notification-empty" role="status">Đang tải thông báo…</p> : error ? <div className="notification-empty" role="alert"><p>{error}</p><button type="button" className="button button-secondary" onClick={() => { setError(""); setLoading(true); setRetry(value => value + 1); }}>Thử lại</button></div> : rows.length ? <>{pending > 0 && <p className="notification-summary">{pending} yêu cầu đang chờ</p>}<ul>{rows.slice(0, 8).map(item => { const name = Array.isArray(item.employees) ? item.employees[0]?.full_name : item.employees?.full_name; return <li key={`${item.kind}-${item.id}`}><Link href={href} onClick={() => setOpen(false)}><span className={`notification-dot ${item.status === "pending" ? "is-pending" : ""}`} aria-hidden="true" /><span><strong>{item.kind}</strong><span>{!employee && name ? `${name} · ` : ""}{labelStatus(item.status)}</span><small>Gửi lúc {formatDateTime(item.created_at)}</small></span></Link></li>; })}</ul></> : <p className="notification-empty">{employee ? "Bạn chưa có yêu cầu nào." : "Không có yêu cầu đang chờ xử lý."}</p>}</div>
      <footer><Link href={href} onClick={() => setOpen(false)}>Xem tất cả yêu cầu →</Link></footer>
    </section>}
  </div>;
}
