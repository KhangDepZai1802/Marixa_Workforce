"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, TableWrap } from "@/components/ui";
import { MobileFilters } from "@/components/mobile-filters";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";

type Audit = { id: string; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; before_json: unknown; after_json: unknown; reason: string | null; created_at: string };
export default function AdminAuditPage() {
  const [rows, setRows] = useState<Audit[]>([]); const [action, setAction] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async (filter: string) => { try { const params = new URLSearchParams({ page_size: "100" }); if (filter.trim()) params.set("action", filter.trim()); const result = await apiRequest<ApiEnvelope<Audit[]>>("/api/v1/admin/audit?" + params); setError(""); setRows(result.data ?? []); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được nhật ký."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let active = true;
    apiRequest<ApiEnvelope<Audit[]>>("/api/v1/admin/audit?page_size=100")
      .then(result => { if (active) { setError(""); setRows(result.data ?? []); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "Không tải được nhật ký."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await load(action); }
  return <>
    <PageHeader title="Nhật ký hệ thống" description="Nhật ký bất biến hỗ trợ truy vết quyết định và thay đổi tài khoản/cấu hình." action={<Button type="button" variant="secondary" onClick={() => void load(action)} disabled={loading}>Làm mới</Button>} />
    {error && <Notice kind="error">{error}</Notice>}
    <Panel title="Hoạt động gần đây" description={rows.length + " sự kiện đang hiển thị, tối đa 100."}>
      <MobileFilters><form className="toolbar" onSubmit={search}><Field label="Lọc theo thao tác"><input value={action} onChange={e => setAction(e.target.value)} placeholder="Ví dụ account." /></Field><Button type="submit" variant="secondary" disabled={loading}>Lọc</Button></form></MobileFilters>
      {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState title="Chưa có hoạt động phù hợp" /> : <TableWrap><table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Đối tượng</th><th>Người thao tác</th><th>Lý do / dữ liệu</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td data-label="Thời gian">{formatDateTime(row.created_at)}</td><td data-label="Thao tác"><strong>{row.action}</strong></td><td data-label="Đối tượng">{row.entity_type}<small>{row.entity_id ?? "—"}</small></td><td data-label="Người thao tác">{row.actor_user_id ?? "Tác vụ hệ thống"}</td><td data-label="Lý do / dữ liệu">{row.reason || "—"}<details><summary>Xem thay đổi</summary><pre className="audit-json">{JSON.stringify({ before: row.before_json, after: row.after_json }, null, 2)}</pre></details></td></tr>)}</tbody></table></TableWrap>}
    </Panel>
  </>;
}
