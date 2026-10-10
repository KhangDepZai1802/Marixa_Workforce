"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { Button, LoadingState, Notice, Panel, StatCard, TableWrap } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

type Metrics = { database_bytes: number; storage_bytes: number; photo_pending: number; photo_failed: number;
  sync_review: number; expired_remaining: number; limits: { database_bytes: number; storage_bytes: number };
  runs: { id: string; started_at: string; finished_at: string | null; status: string; deleted_count: number; accrued_count: number; error_code: string | null }[] };
const usage = (used: number, limit: number) => `${(used / 1024 / 1024).toFixed(1)} MB · ${(used / limit * 100).toFixed(1)}%`;

export function OperationsPanel() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [checkedAt, setCheckedAt] = useState(0);
  const load = useCallback(async () => {
    try { const result = await apiRequest<ApiEnvelope<Metrics>>("/api/v1/admin/operations"); setData(result.data); setCheckedAt(Date.now()); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không đọc được vận hành."); }
  }, []);
  useEffect(() => {
    let active = true;
    apiRequest<ApiEnvelope<Metrics>>("/api/v1/admin/operations")
      .then(result => { if (active) { setData(result.data); setCheckedAt(Date.now()); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không đọc được vận hành."); });
    return () => { active = false; };
  }, []);
  async function run() {
    setBusy(true); setMessage("");
    try {
      const result = await apiRequest<ApiEnvelope<{ deleted: number }>>("/api/cron/cleanup-photos", { method: "POST" });
      setMessage(`Đã hoàn tất tác vụ: dọn ${result.data.deleted} ảnh hết hạn. Mỗi lượt xử lý tối đa 500 ảnh.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Tác vụ thất bại."); }
    finally { setBusy(false); }
  }
  const latest = data?.runs[0];
  const stale = !latest || checkedAt - Date.parse(latest.started_at) > 48 * 60 * 60 * 1000;
  return <Panel title="Vận hành và dung lượng" description="Dung lượng Storage lấy từ metadata của project; kiểm tra hạn mức thực tế trong Supabase Usage."
    action={<Button variant="secondary" disabled={busy} onClick={() => void load()}>Làm mới</Button>}>
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    {!data && !error && <LoadingState />}
    {data && <>
      <div className="stats-grid stats-grid-three">
        <StatCard label="Database / 500 MB" value={usage(data.database_bytes, data.limits.database_bytes)} />
        <StatCard label="Storage / 1 GB" value={usage(data.storage_bytes, data.limits.storage_bytes)} tone="cyan" />
        <StatCard label="Ảnh hết hạn còn chờ dọn" value={data.expired_remaining} tone="gold" />
      </div>
      {([['Database', data.database_bytes / data.limits.database_bytes], ['Storage', data.storage_bytes / data.limits.storage_bytes]] as const)
        .filter(([, ratio]) => ratio >= 0.7).map(([name, ratio]) => <Notice key={name} kind={ratio >= 0.95 ? "error" : "warning"}>
          {name} đã vượt ngưỡng {ratio >= 0.95 ? 95 : ratio >= 0.85 ? 85 : 70}%. Kiểm tra Usage, sao lưu và dọn ảnh hết hạn trước khi đầy.
        </Notice>)}
      {(stale || latest?.status !== "succeeded") && <Notice kind="warning">Chưa có lần bảo trì thành công gần đây. Kiểm tra Cron/Logs hoặc chạy lại bên dưới.</Notice>}
      <p>Ảnh chờ tải: {data.photo_pending} · Ảnh lỗi: {data.photo_failed} · Đồng bộ cần đối soát: {data.sync_review}.</p>
      <p>Queue chưa gửi nằm trên từng thiết bị; nhân viên kiểm tra ở trang Chấm công. Lỗi API được tra theo mã yêu cầu trong Vercel Logs.</p>
      <Button disabled={busy} onClick={() => void run()}>{busy ? "Đang bảo trì…" : "Dọn ảnh hết hạn và cập nhật phép tháng"}</Button>
      <TableWrap><table><thead><tr><th>Lần chạy</th><th>Kết quả</th><th>Ảnh đã dọn</th><th>Phép cộng</th></tr></thead><tbody>
        {data.runs.map(run => <tr key={run.id}><td>{formatDateTime(run.started_at)}</td><td>{run.status === "succeeded" ? "Thành công" : run.status === "failed" ? "Thất bại" : "Chưa hoàn tất"}<small>{run.error_code}</small></td><td>{run.deleted_count}</td><td>{run.accrued_count}</td></tr>)}
      </tbody></table></TableWrap>
    </>}
  </Panel>;
}
