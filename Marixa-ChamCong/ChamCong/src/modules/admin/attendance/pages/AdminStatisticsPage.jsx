import { useState, useEffect, useMemo } from "react";
import AdminAppLayout from "../../layout/AdminAppLayout";
import HrAppLayout from "../../../employees/hr/layout/HrAppLayout";
import adminAttendanceApi from "../api/adminAttendanceApi";
import AttendanceFormModal from "../components/AttendanceFormModal";
import AttendanceDetailModal from "../../../employees/attendance/components/AttendanceDetailModal";
import { formatVnDate } from "../../../../utils/vnTime";
import "../../../../modules/me/attendance.css";
import "../../admin.css";
import "../../../employees/employee.css";

// Trang quản trị: thống kê công của TOÀN BỘ nhân viên theo tháng,
// dạng bảng có nút Thêm / Sửa / Xóa.
// Trích "YYYY-MM" từ chuỗi ngày (bất biến theo múi giờ).
const monthOf = (iso) => (iso || "").slice(0, 7);

const AdminStatisticsPage = ({ hrMode = false }) => {
    const [rows, setRows] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const now = new Date();
    const [month, setMonth] = useState(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
    const [showAll, setShowAll] = useState(true);
    const [search, setSearch] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const [detailEmpId, setDetailEmpId] = useState(null);

    const empMap = useMemo(
        () => Object.fromEntries(employees.map((e) => [e.id, e])),
        [employees]
    );

    const load = async () => {
        try {
            const [a, e] = await Promise.all([
                adminAttendanceApi.attendanceAll(),
                adminAttendanceApi.employeesAll(),
            ]);
            setRows(a.data.data?.items || []);
            setEmployees(e.data.data?.items || []);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const monthRows = useMemo(
        () => rows.filter((r) => monthOf(r.attendanceDate) === month),
        [rows, month]
    );

    // Thống kê theo nhân viên trong tháng đang chọn
    const perEmployee = useMemo(() => {
        const map = {};
        monthRows.forEach((r) => {
            const e = (map[r.employeeId] = map[r.employeeId] || {
                days: 0,
                worked: 0,
                late: 0,
                absent: 0,
                leave: 0,
                hours: 0,
            });
            e.days += 1;
            if ([1, 2, 3].includes(r.status)) e.worked += 1;
            if (r.status === 2) e.late += 1;
            if (r.status === 4) e.absent += 1;
            if (r.status === 5) e.leave += 1;
            e.hours += r.actualHours || 0;
        });
        return employees
            .map((emp) => ({ emp, stat: map[emp.id] || null }))
            .filter((x) => x.stat || showAll);
    }, [employees, monthRows, showAll]);

    const kpi = useMemo(
        () => ({
            total: employees.length,
            active: new Set(monthRows.map((r) => r.employeeId)).size,
            records: monthRows.length,
            late: monthRows.filter((r) => r.status === 2).length,
            absent: monthRows.filter((r) => r.status === 4).length,
        }),
        [monthRows, employees]
    );

    const visibleEmployees = useMemo(() => {
        const q = search.trim().toLocaleLowerCase();
        if (!q) return perEmployee;
        return perEmployee.filter(({ emp }) =>
            [emp.fullName, emp.employeeCode, emp.email]
                .some((value) => String(value || "").toLocaleLowerCase().includes(q))
        );
    }, [perEmployee, search]);

    const latestRowOf = (empId) =>
        rows
            .filter((r) => r.employeeId === empId && monthOf(r.attendanceDate) === month)
            .sort(
                (a, b) =>
                    new Date(b.attendanceDate) - new Date(a.attendanceDate)
            )[0] || null;

    const submitModal = async (form, isEdit) => {
        const payload = {
            id: isEdit ? editRow.id : undefined,
            employeeId: form.employeeId,
            attendanceDate: form.attendanceDate,
            status: form.status === "" ? null : Number(form.status),
            actualHours:
                form.actualHours === "" ? null : Number(form.actualHours),
            approvalStatus: Number(form.approvalStatus),
            note: form.note || null,
        };
        try {
            if (isEdit) {
                await adminAttendanceApi.update(payload);
            } else {
                // Create chỉ nhận các field của CreateAttendanceModelView
                await adminAttendanceApi.create({
                    employeeId: payload.employeeId,
                    attendanceDate: payload.attendanceDate,
                    status: payload.status,
                    note: payload.note,
                });
            }
            setModalOpen(false);
            setEditRow(null);
            load();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
            throw err;
        }
    };

    const doDelete = async (row) => {
        const e = empMap[row.employeeId];
        const name = e ? `${e.employeeCode} · ${e.fullName}` : row.employeeCode;
        if (!window.confirm(`Xóa bản ghi ngày ${formatVnDate(row.attendanceDate)} của ${name}?`))
            return;
        try {
            await adminAttendanceApi.softDelete(row.id);
            load();
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        }
    };

    const PageLayout = hrMode ? HrAppLayout : AdminAppLayout;

    return (
        <PageLayout
            title={hrMode ? "Thống kê công" : "Thống kê công · Quản trị"}
            subtitle="Tổng hợp ngày công của tất cả nhân viên theo tháng"
        >
            <div className="att-content">
                {error && <div className="att-error">{error}</div>}
                {loading ? (
                    <div className="att-loading">Đang tải...</div>
                ) : (
                    <>
                        <section className="admin-card">
                            <div className="admin-kpi-row">
                                <div className="admin-kpi">
                                    <span className="admin-kpi-label">Nhân viên</span>
                                    <strong>{kpi.total}</strong>
                                    <span className="admin-kpi-sub">đang làm</span>
                                </div>
                                <div className="admin-kpi">
                                    <span className="admin-kpi-label">Có ngày công</span>
                                    <strong>{kpi.active}</strong>
                                    <span className="admin-kpi-sub">trong tháng</span>
                                </div>
                                <div className="admin-kpi">
                                    <span className="admin-kpi-label">Bản ghi</span>
                                    <strong>{kpi.records}</strong>
                                    <span className="admin-kpi-sub">trong tháng</span>
                                </div>
                                <div className="admin-kpi admin-kpi--bad">
                                    <span className="admin-kpi-label">Đi trễ</span>
                                    <strong>{kpi.late}</strong>
                                    <span className="admin-kpi-sub">lượt</span>
                                </div>
                                <div className="admin-kpi admin-kpi--bad">
                                    <span className="admin-kpi-label">Vắng mặt</span>
                                    <strong>{kpi.absent}</strong>
                                    <span className="admin-kpi-sub">lượt</span>
                                </div>
                            </div>
                        </section>

                        <section className="att-card">
                            <div className="admin-toolbar stats-toolbar">
                                <label className="admin-search">
                                    <span aria-hidden="true">⌕</span>
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Tìm mã hoặc tên nhân viên..."
                                        aria-label="Tìm nhân viên"
                                    />
                                </label>
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="admin-link-btn"
                                    onClick={() => {
                                        setEditRow(null);
                                        setModalOpen(true);
                                    }}
                                >
                                    + Thêm bản ghi
                                </button>
                                <label className="admin-check">
                                    <input
                                        type="checkbox"
                                        checked={showAll}
                                        onChange={(e) =>
                                            setShowAll(e.target.checked)
                                        }
                                    />
                                    hiện cả người chưa có
                                </label>
                            </div>

                            <div className="att-table-wrap">
                                <table className="att-table">
                                    <thead>
                                        <tr>
                                            <th>Nhân viên</th>
                                            <th>Ngày đã làm</th>
                                            <th>Đi trễ</th>
                                            <th>Vắng mặt</th>
                                            <th>Nghỉ phép</th>
                                            <th>Tổng giờ</th>
                                            <th /></tr>
                                    </thead>
                                    <tbody>
                                        {visibleEmployees.length === 0 ? (
                                            <tr>
                                                <td colSpan="7">
                                                    <span className="att-muted">
                                                        {search.trim()
                                                            ? "Không tìm thấy nhân viên phù hợp."
                                                            : "Chưa có dữ liệu trong tháng này."}
                                                    </span>
                                                </td>
                                            </tr>
                                        ) : (
                                            visibleEmployees.map(({ emp, stat }) => {
                                                const latest =
                                                    latestRowOf(emp.id);
                                                return (
                                                    <tr key={emp.id}>
                                                        <td>
                                                            <strong>
                                                                {emp.fullName}
                                                            </strong>{" "}
                                                            <span className="att-muted">
                                                                {emp.employeeCode}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {stat
                                                                ? `${stat.worked} / ${stat.days}`
                                                                : "—"}
                                                        </td>
                                                        <td>
                                                            {stat
                                                                ? stat.late
                                                                : "—"}
                                                        </td>
                                                        <td>
                                                            {stat
                                                                ? stat.absent
                                                                : "—"}
                                                        </td>
                                                        <td>
                                                            {stat
                                                                ? stat.leave
                                                                : "—"}
                                                        </td>
                                                        <td>
                                                            {stat
                                                                ? `${stat.hours}h`
                                                                : "—"}
                                                        </td>
                                                        <td>
                                                            <div className="admin-row-actions">
                                                                <button
                                                                    type="button"
                                                                    className="admin-view-link"
                                                                    onClick={() => setDetailEmpId(emp.id)}
                                                                    >
                                                                    Chi tiết
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-link-btn"
                                                                    onClick={() => {
                                                                        setEditRow(
                                                                            latest || {
                                                                                employeeId: emp.id,
                                                                                attendanceDate: `${month}-01`,
                                                                            }
                                                                        );
                                                                        setModalOpen(
                                                                            true
                                                                        );
                                                                    }}
                                                                >
                                                                    Sửa
                                                                </button>
                                                                {latest && (
                                                                    <button
                                                                        type="button"
                                                                        className="admin-link-btn admin-link-btn--danger"
                                                                        onClick={() =>
                                                                            doDelete(
                                                                                latest
                                                                            )
                                                                        }
                                                                    >
                                                                        Xóa
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}

                <AttendanceFormModal
                    open={modalOpen}
                    row={editRow}
                    employees={employees}
                    onClose={() => {
                        setModalOpen(false);
                        setEditRow(null);
                    }}
                    onSubmit={submitModal}
                />

                {detailEmpId && (
                    <AttendanceDetailModal
                        monthRows={rows.filter((r) => r.employeeId === detailEmpId && monthOf(r.attendanceDate) === month)}
                        employeeLabel={(() => {
                            const e = empMap[detailEmpId];
                            return e ? `${e.employeeCode} · ${e.fullName}` : String(detailEmpId);
                        })()}
                        onClose={() => setDetailEmpId(null)}
                    />
                )}
            </div>
        </PageLayout>
    );
};

export default AdminStatisticsPage;
