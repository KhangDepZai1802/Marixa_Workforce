import AdminListPage from "../../AdminListPage";
import adminApi from "../../api/adminApi";

// ===== Trang Bảng lương (quản trị) =====
const PayrollAdminPage = () => {
    const LABELS = {
        1: "Nháp",
        2: "Đã tính",
        3: "Đã duyệt",
        4: "Đã trả",
        5: "Hủy",
    };
    const TONES = { 1: "muted", 2: "info", 3: "ok", 4: "ok", 5: "bad" };

    return (
        <AdminListPage
            title="Bảng lương"
            subtitle="Tổng quan & theo dõi bảng lương theo kỳ"
            fetcher={adminApi.payrolls}
            columns={[
                { key: "employeeName", label: "Nhân viên" },
                { key: "payrollMonth", label: "Kỳ lương", date: true },
                {
                    key: "basicSalary",
                    label: "Lương cơ bản",
                    labelOf: (v) => Number(v || 0).toLocaleString("vi-VN") + " ₫",
                },
                {
                    key: "netSalary",
                    label: "Thực nhận",
                    labelOf: (v) => Number(v || 0).toLocaleString("vi-VN") + " ₫",
                },
                {
                    key: "status",
                    label: "Trạng thái",
                    badge: (v) => TONES[v] || "muted",
                    labelOf: (v) => LABELS[v] || v,
                },
            ]}
            searchKeys={["employeeName"]}
            filter={{
                key: "status",
                options: [
                    ["1", "Nháp"],
                    ["2", "Đã tính"],
                    ["3", "Đã duyệt"],
                    ["4", "Đã trả"],
                    ["5", "Hủy"],
                ],
            }}
            emptyText="Chưa có bảng lương nào."
        />
    );
};

// ===== Trang Người đã nghỉ việc (lưu trữ + lịch sử) =====
const ResignedPage = ({ hrMode = false }) => {
    return (
        <AdminListPage
            title="Người đã nghỉ việc"
            subtitle="Lưu trữ hồ sơ & lịch sử của nhân viên đã rời đi"
            fetcher={async () => {
                const r = await adminApi.employees();
                const all = r.data.data?.items || [];
                return {
                    data: {
                        data: {
                            items: all.filter((e) =>
                                [4, 5].includes(e.status)
                            ),
                        },
                    },
                };
            }}
            columns={[
                { key: "employeeCode", label: "Mã NV" },
                { key: "fullName", label: "Họ tên" },
                { key: "departmentName", label: "Phòng ban" },
                { key: "positionName", label: "Chức vụ" },
                { key: "startDate", label: "Vào", date: true },
                {
                    key: "status",
                    label: "Trạng thái",
                    badge: (v) => (v === 4 ? "muted" : "bad"),
                    labelOf: (v) =>
                        ({ 4: "Đã nghỉ việc", 5: "Chấm dứt HĐ" })[v] || v,
                },
            ]}
            searchKeys={["employeeCode", "fullName", "departmentName"]}
            searchPlaceholder="Tìm mã nhân viên, họ tên, phòng ban..."
            emptyText="Không có nhân viên nào đã nghỉ việc."
            hrMode={hrMode}
        />
    );
};

// ===== Trang Báo cáo công việc (tổng hợp theo tháng, xuất CSV) =====
const ReportPage = ({ hrMode = false }) => {
    return (
        <AdminListPage
            title="Báo cáo công việc"
            subtitle="Tổng hợp chấm công theo nhân viên & tháng"
            fetcher={async () => {
                const a = await adminApi.attendances();
                const items = a.data.data?.items || [];
                const byKey = {};
                items.forEach((x) => {
                    const d = new Date(x.attendanceDate);
                    const key =
                        `${x.employeeId}·${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    byKey[key] =
                        byKey[key] ||
                        ({
                            employeeCode: x.employeeCode || "",
                            employeeName: x.employeeName || "",
                            month: d.toLocaleDateString("vi-VN", {
                                month: "long",
                                year: "numeric",
                            }),
                            days: 0,
                            hours: 0,
                            late: 0,
                            absent: 0,
                        });
                    const m = byKey[key];
                    m.days += 1;
                    m.hours += Number(x.actualHours) || 0;
                    if ([2, 3].includes(x.status)) m.late += 1;
                    if (x.status === 4) m.absent += 1;
                });
                return {
                    data: {
                        data: { items: Object.values(byKey) },
                    },
                };
            }}
            columns={[
                { key: "employeeCode", label: "Mã NV" },
                { key: "employeeName", label: "Nhân viên" },
                { key: "month", label: "Tháng" },
                { key: "days", label: "Số ngày" },
                {
                    key: "hours",
                    label: "Tổng giờ",
                    labelOf: (v) => `${v}h`,
                },
                { key: "late", label: "Trễ / về sớm" },
                { key: "absent", label: "Vắng mặt" },
            ]}
            searchKeys={["employeeName", "employeeCode", "month"]}
            emptyText="Chưa có dữ liệu chấm công để báo cáo."
            hrMode={hrMode}
        />
    );
};

export { PayrollAdminPage, ResignedPage, ReportPage };
