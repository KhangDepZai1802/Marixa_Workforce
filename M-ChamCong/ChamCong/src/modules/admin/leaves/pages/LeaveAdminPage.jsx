import AdminListPage from "../../AdminListPage";
import adminApi from "../../api/adminApi";
import { currentUserId } from "../../util";

// ===== Trang Nghỉ phép (quản trị) =====
const LeaveAdminPage = ({ hrMode = false }) => {
    const approve = async (row) => {
        await adminApi.updateLeave({
            id: row.id,
            employeeId: row.employeeId,
            leaveTypeId: row.leaveTypeId,
            fromDate: row.fromDate,
            toDate: row.toDate,
            totalDays: row.totalDays ?? null,
            reason: row.reason ?? null,
            status: 2, // Đã duyệt
            approvedBy: currentUserId(),
            approvedAt: new Date().toISOString(),
        });
    };
    const reject = async (row) => {
        await adminApi.updateLeave({
            id: row.id,
            employeeId: row.employeeId,
            leaveTypeId: row.leaveTypeId,
            fromDate: row.fromDate,
            toDate: row.toDate,
            totalDays: row.totalDays ?? null,
            reason: row.reason ?? null,
            status: 3, // Từ chối
            approvedBy: currentUserId(),
            approvedAt: new Date().toISOString(),
        });
    };

    const LABELS = { 1: "Chờ duyệt", 2: "Đã duyệt", 3: "Từ chối", 4: "Đã hủy" };
    const TONES = { 1: "warn", 2: "ok", 3: "bad", 4: "muted" };

    return (
        <AdminListPage
            title="Nghỉ phép"
            subtitle="Duyệt / từ chối các đơn xin nghỉ phép"
            fetcher={adminApi.leaveRequests}
            columns={[
                { key: "employeeName", label: "Nhân viên" },
                { key: "leaveTypeName", label: "Loại phép" },
                { key: "fromDate", label: "Từ", date: true },
                { key: "toDate", label: "Đến", date: true },
                { key: "totalDays", label: "Số ngày" },
                { key: "reason", label: "Lý do" },
                {
                    key: "status",
                    label: "Trạng thái",
                    badge: (v) => TONES[v] || "muted",
                    labelOf: (v) => LABELS[v] || v,
                },
            ]}
            searchKeys={["employeeName", "leaveTypeName", "reason"]}
            searchPlaceholder="Tìm nhân viên, loại phép, lý do..."
            filter={{
                key: "status",
                options: [
                    ["1", "Chờ duyệt"],
                    ["2", "Đã duyệt"],
                    ["3", "Từ chối"],
                    ["4", "Đã hủy"],
                ],
            }}
            approve={approve}
            reject={reject}
            pendingOf={(r) => r.status === 1}
            emptyText="Không có đơn nghỉ phép nào."
            hrMode={hrMode}
        />
    );
};

export default LeaveAdminPage;
