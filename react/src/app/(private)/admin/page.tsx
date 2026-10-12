"use client";
import Link from "next/link";
import { OperationsPanel } from "@/features/operations/operations-panel";
import { StaffTasks, type StaffOverview } from "@/features/workspace/workspace-home";
import { useResource } from "@/lib/use-resource";
import { Button, LoadingState, Notice, PageHeader, Panel } from "@/components/ui";

export default function AdminPage() {
  const { data, loading, error, reload } = useResource<StaffOverview>("/api/v1/hr/dashboard");
  return <div className="admin-workspace">
    <PageHeader title="Vận hành hệ thống" description="Theo dõi tác vụ, quản lý tài khoản và cấu hình Marixa." />
    <Panel title="Quản trị"><div className="quick-links">
      <Link href="/admin/accounts"><span><strong>Tài khoản và quyền truy cập</strong><small>Cấp tài khoản, khóa hoặc đặt lại mật khẩu</small></span><b>›</b></Link>
      <Link href="/admin/settings"><span><strong>Cấu hình hệ thống</strong><small>Ca làm, lịch nghỉ, loại nghỉ và vị trí tham khảo</small></span><b>›</b></Link>
      <Link href="/admin/audit"><span><strong>Nhật ký hoạt động</strong><small>Người thao tác, thay đổi và lý do</small></span><b>›</b></Link>
    </div></Panel>
    {loading ? <LoadingState /> : error ? <Notice kind="error">{error} <Button variant="secondary" onClick={reload}>Thử lại</Button></Notice> : data && <StaffTasks data={data} />}
    <OperationsPanel />
  </div>;
}
