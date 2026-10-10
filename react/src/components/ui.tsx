import type { ButtonHTMLAttributes, ReactNode } from "react";
import { labelStatus } from "@/lib/format";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-header-action">{action}</div>}</div>;
}

export function Panel({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    {(title || action) && <div className="panel-heading"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{action}</div>}
    {children}
  </section>;
}

export function StatCard({ label, value, detail, tone = "blue" }: { label: string; value: ReactNode; detail?: string; tone?: "blue" | "cyan" | "gold" | "green" }) {
  return <div className={`stat-card stat-${tone}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="empty-state"><span className="empty-state-mark" aria-hidden="true">—</span><strong>{title}</strong>{description && <p>{description}</p>}</div>;
}

export function Notice({ kind = "info", children }: { kind?: "info" | "success" | "warning" | "error"; children: ReactNode }) {
  return <div className={`notice notice-${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

export function LoadingState({ label = "Đang tải dữ liệu…" }: { label?: string }) {
  return <div className="loading-state" role="status"><span className="spinner" aria-hidden="true" />{label}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const tone = value === "approved" || value === "active" || value === "locked" || value === "reviewed" ? "positive"
    : value === "rejected" || value === "disabled" || value === "failed" ? "negative" : "neutral";
  return <span className={`badge badge-${tone}`} data-status={value ?? undefined}>{labelStatus(value)}</span>;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function TableWrap({ children }: { children: ReactNode }) { return <div className="table-wrap">{children}</div>; }
