"use client";

import { ChangePasswordButton } from "@/components/change-password";
import { useEffect, useState } from "react";
import { EmptyState, LoadingState, Notice, PageHeader, Panel } from "@/components/ui";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";

type Profile = {
  account: { role: string; status: string; must_change_password: boolean } | null;
  employee: { employee_code: string; full_name: string; work_email: string | null; phone: string | null; department: string | null; job_title: string | null; status: string } | null;
};

export default function MyProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    apiRequest<ApiEnvelope<Profile>>("/api/v1/me")
      .then((result) => setProfile(result.data))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Không tải được hồ sơ."))
      .finally(() => setLoading(false));
  }, []);

  return <>
    <PageHeader title="Hồ sơ cá nhân" description="Thông tin tài khoản và hồ sơ nhân viên được HR quản lý." />
    {error && <Notice kind="error">{error}</Notice>}
    {loading ? <Panel><LoadingState /></Panel> : !profile?.employee ? <Panel><EmptyState title="Tài khoản chưa gắn hồ sơ nhân viên" description="Hãy liên hệ HR để hoàn tất liên kết hồ sơ." /></Panel> :
      <div className="reference-profile-layout">
        <Panel className="reference-profile-summary"><div className="reference-profile-avatar" aria-hidden="true">{profile.employee.full_name.trim().charAt(0).toUpperCase()}</div><strong>{profile.employee.full_name}</strong><p>{profile.employee.employee_code}</p><p>{profile.employee.job_title || "Nhân viên"}</p><ChangePasswordButton className="button button-secondary" /></Panel>
        <div className="reference-profile-info">
        <Panel title="Thông tin nhân viên" description="Thông tin cơ bản đang lưu trong hồ sơ.">
          <div className="detail-grid">
            <Detail label="Họ và tên" value={profile.employee.full_name} />
            <Detail label="Mã nhân viên" value={profile.employee.employee_code} />
            <Detail label="Email công việc" value={profile.employee.work_email} />
            <Detail label="Điện thoại" value={profile.employee.phone} />
            <Detail label="Phòng ban" value={profile.employee.department} />
            <Detail label="Chức danh" value={profile.employee.job_title} />
            <Detail label="Trạng thái" value={profile.employee.status === "active" ? "Đang làm việc" : profile.employee.status} />
          </div>
        </Panel>
        <Panel title="Tài khoản truy cập" description="Quyền truy cập do admin cấp và quản lý.">
          <div className="detail-grid"><Detail label="Vai trò" value={profile.account?.role ?? "—"} /><Detail label="Trạng thái tài khoản" value={profile.account?.status === "active" ? "Đang hoạt động" : profile.account?.status} /></div>
          <div className="notice" style={{ marginTop: 16 }}>Thông tin thay đổi hồ sơ vui lòng gửi HR. Nếu cần reset mật khẩu, liên hệ quản trị viên.</div>
        </Panel>
        <Panel title="Quy trình chấm công" description="Múi giờ và giờ làm theo cấu hình công ty.">
          <ul className="rule-list"><li>Múi giờ nghiệp vụ: Asia/Ho_Chi_Minh.</li><li>Giờ làm và ngày làm việc theo ca chung do admin cấu hình cho từng ngày hiệu lực.</li><li>Ảnh và GPS là tùy chọn, không làm mất công nếu không có.</li><li>Ngày nghỉ vẫn có thể chấm công; giờ thực tế tự tính tăng ca theo quy định.</li></ul>
        </Panel>
        </div>
      </div>}
  </>;
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="detail-item"><span>{label}</span><strong>{value || "Chưa cập nhật"}</strong></div>;
}
