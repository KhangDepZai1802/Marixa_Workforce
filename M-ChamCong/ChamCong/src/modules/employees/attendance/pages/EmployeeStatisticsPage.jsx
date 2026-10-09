import { useState, useEffect, useMemo } from "react";

import HrAppLayout from "../../hr/layout/HrAppLayout";
import employeeAttendanceApi from "../api/employeeAttendanceApi";
import AttendanceFormModal from "../components/AttendanceFormModal";
import AttendanceDetailModal from "../components/AttendanceDetailModal";
import { translate, useLanguage } from "../../../../services/i18n/LanguageProvider";
import "../../../../modules/me/attendance.css";
import "../../employee.css";
import HrHero from "../../hr/HrHero";

// Trang quản trị: thống kê công của TOÀN BỘ nhân viên theo tháng.
// Trích "YYYY-MM" từ chuỗi ngày (bất biến theo múi giờ).
const monthOf = (iso) => (iso || "").slice(0, 7);

const EmployeeStatisticsPage = () => {
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
    const { language } = useLanguage();
    const L = (text) => translate(text, language);
    const [detailEmpId, setDetailEmpId] = useState(null);
    const [editRow, setEditRow] = useState(null);

    const empMap = useMemo(
        () => Object.fromEntries(employees.map((e) => [e.id, e])),
        [employees]
    );

    const load = async () => {
        try {
            const [a, e] = await Promise.all([
                employeeAttendanceApi.attendanceAll(),
                employeeAttendanceApi.employeesAll(),
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
            checkInTime: form.checkInTime ? new Date(`${form.attendanceDate}T${form.checkInTime}:00`).toISOString() : null,
            checkOutTime: form.checkOutTime ? new Date(`${form.attendanceDate}T${form.checkOutTime}:00`).toISOString() : null,
        };
        try {
            if (isEdit) {
                await employeeAttendanceApi.update(payload);
            } else {
                // Create chỉ nhận các field của CreateAttendanceModelView
                await employeeAttendanceApi.create({
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

    const PageLayout = HrAppLayout;

    return (
        <PageLayout
        >
            <div className="att-content">
                {error && <div className="att-error">{error}</div>}
                {loading ? (
                    <div className="att-loading">{L("Đang tải...")}</div>
                ) : (
                    <>
                        <HrHero
                            ico="📊"
                            title="Thống kê công"
                            sub="Tổng hợp ngày công, đi trễ, vắng mặt của toàn bộ nhân viên theo tháng."
                            kpis={[
                                { ico: "👥", label: "Nhân viên", value: kpi.total, tone: "blue", sub: "đang làm" },
                                { ico: "✅", label: "Có ngày công", value: kpi.active, tone: "green", sub: "trong tháng" },
                                { ico: "📝", label: "Bản ghi", value: kpi.records, tone: "gray", sub: "trong tháng" },
                                { ico: "⚠", label: "Đi trễ", value: kpi.late, tone: "warn", sub: "lượt" },
                                { ico: "✕", label: "Vắng mặt", value: kpi.absent, tone: "red", sub: "lượt" },
                            ]}
                        />

                        <section className="att-card">
                            <div className="admin-toolbar stats-toolbar">
                                <label className="admin-search">
                                    <span aria-hidden="true">⌕</span>
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={L("Tìm mã hoặc tên nhân viên...")}
                                        aria-label={L("Tìm nhân viên")}
                                    />
                                </label>
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                />
                                <label className="admin-check">
                                    <input
                                        type="checkbox"
                                        checked={showAll}
                                        onChange={(e) =>
                                            setShowAll(e.target.checked)
                                        }
                                    />
                                    {L("hiện cả người chưa có")}
                                </label>
                            </div>

                            <div className="att-table-wrap">
                                <table className="att-table">
                                    <thead>
                                        <tr>
                                            <th>{L("Nhân viên")}</th>
                                            <th>{L("Ngày đã làm")}</th>
                                            <th>{L("Đi trễ")}</th>
                                            <th>{L("Vắng mặt")}</th>
                                            <th>{L("Nghỉ phép")}</th>
                                            <th>{L("Tổng giờ")}</th>
                                            <th /></tr>
                                    </thead>
                                    <tbody>
                                        {visibleEmployees.length === 0 ? (
                                            <tr>
                                                <td colSpan="7">
                                                    <span className="att-muted">
                                                        {search.trim()
                                                            ? L("Không tìm thấy nhân viên phù hợp.")
                                                            : L("Chưa có dữ liệu trong tháng này.")}
                                                    </span>
                                                </td>
                                            </tr>
                                        ) : (
                                            visibleEmployees.map(({ emp, stat }) => {
                                                return (
                                                    <tr key={emp.id}>
                                                        <td>
                                                            <div className="att-emp-cell">
                                                                <span className="att-emp-code">{emp.employeeCode}</span>
                                                                <span className="att-emp-name">{emp.fullName}</span>
                                                            </div>
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
                                                                    {L("Chi tiết")}
                                                                </button>
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

export default EmployeeStatisticsPage;
