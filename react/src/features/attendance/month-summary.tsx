"use client";
import { useEffect, useState } from "react";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { EmptyState, LoadingState, Notice, Panel, StatCard } from "@/components/ui";
import { formatMinutes } from "@/lib/format";

type Day = { regular_minutes: number; overtime_minutes: number; overtime_kind: string | null; previous_period_regular_adjustment: number; previous_period_overtime_adjustment: number };
type Summary = { period: { status: string; version: number } | null; days: Day[] };
export function MonthSummary({ month, scope = "mine" }: { month: string; scope?: "mine" | "all" }) {
  const [result, setResult] = useState<{ month: string; data: Summary } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    apiRequest<ApiEnvelope<Summary>>(`/api/v1/reports/summary?month=${encodeURIComponent(month)}&scope=${scope}`)
      .then(response => { if (active) { setResult({ month, data: response.data }); setError(""); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được tổng hợp."); });
    return () => { active = false; };
  }, [month, scope]);
  const data = result?.month === month ? result.data : null;
  const sum = (field: keyof Day, kind?: string) => (data?.days ?? []).filter(day => !kind || day.overtime_kind === kind).reduce((total, day) => total + Number(day[field] ?? 0), 0);
  return <Panel title={`Tổng hợp công ${month}`} description={data?.period ? `${data.period.status === "locked" ? "Đã khóa" : "Bản tạm — theo lần HR tính gần nhất"} · phiên bản ${data.period.version}` : "Theo bảng công do HR tổng hợp."}>
    {error ? <Notice kind="error">{error}</Notice> : !data ? <LoadingState /> : !data.days.length ? <EmptyState title="Chưa có bảng công tổng hợp" /> : <>
      <div className="stats-grid">
        <StatCard label="Công thường" value={formatMinutes(sum("regular_minutes"))} />
        <StatCard label="Tăng ca tự động ngày nghỉ" value={formatMinutes(sum("overtime_minutes", "automatic_rest_day"))} tone="cyan" />
        <StatCard label="Tăng ca đã duyệt ngày thường" value={formatMinutes(sum("overtime_minutes", "approved_workday"))} tone="green" />
        <StatCard label="Điều chỉnh kỳ trước (phút)" value={`${sum("previous_period_regular_adjustment")} / ${sum("previous_period_overtime_adjustment")}`} detail="Công thường / tăng ca" tone="gold" />
      </div>
      {data.days.some(day => day.overtime_minutes > 0 && !day.overtime_kind) && <Notice>Snapshot cũ có tăng ca chưa phân loại: {formatMinutes(data.days.filter(day => !day.overtime_kind).reduce((total, day) => total + day.overtime_minutes, 0))}. Giữ nguyên số liệu đã khóa.</Notice>}
    </>}
  </Panel>;
}
