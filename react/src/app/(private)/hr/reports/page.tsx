import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui";

export default function HrReportsPage() {
  return <>
    <PageHeader title="Báo cáo" description="Xuất Excel trực tiếp từ snapshot kỳ công đã tính." />
    <Panel title="Bảng công Excel" description="Chọn kỳ công, tính snapshot và tải file có số phút công thường, tăng ca, nghỉ, đi trễ và điều chỉnh kỳ trước.">
      <Link className="button button-primary" href="/hr/timesheets">Mở quản lý kỳ công</Link>
    </Panel>
  </>;
}
