import { useCallback, useEffect, useMemo, useState } from "react";
import HrAppLayout from "../../hr/layout/HrAppLayout";
import employeeAttendanceApi from "../api/employeeAttendanceApi";
import { approvalClass, approvalLabel } from "../labels";
import { getAuth } from "../../../../services/auth/auth";
import "../../employee.css";
import HrHero from "../../hr/HrHero";
import EmployeeShiftDetailModal from "../components/EmployeeShiftDetailModal";

const vnToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(new Date());
const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const weekdayBit = (date) => 1 << ((date.getDay() + 6) % 7);
const dateOnly = (value) => (value || "").slice(0, 10);
const weekdaysForShift = (workDays) => ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]
    .filter((_, index) => Number(workDays) & (1 << index))
    .join(", ");

const EmployeeWorkSchedulePage = () => {
    const [employees, setEmployees] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedDate, setSelectedDate] = useState(vnToday);
    const [calendarMonth, setCalendarMonth] = useState(() => vnToday().slice(0, 7));
    const [search, setSearch] = useState("");
    const [notice, setNotice] = useState("");
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);
    const [assignmentForm, setAssignmentForm] = useState(() => ({
        shiftId: "",
        effectiveFrom: vnToday(),
        effectiveTo: vnToday(),
        note: "",
    }));
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [shiftDetailEmp, setShiftDetailEmp] = useState(null);
    const [employeePickerSearch, setEmployeePickerSearch] = useState("");
    const [assignmentError, setAssignmentError] = useState("");
    const [savingAssignment, setSavingAssignment] = useState(false);
    const auth = getAuth();
    const elevatedScheduler = (auth?.roles || []).some((role) => ["Admin", "HR"].includes(role));
        const canSchedule = elevatedScheduler || (auth?.roles || []).includes("Manager");
    // Nút "Sửa" hiện cho Admin, HR, Manager (backend PUT /EmployeeShift/update và
    // PUT /Shift/update đã mở cho cả 3 role này).
    const canEditShifts = ["Admin", "HR", "Manager"].some((role) => (auth?.roles || []).includes(role));

    const loadScheduleData = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [employeeResponse, assignmentResponse, shiftResponse, attendanceResponse] = await Promise.all([
            employeeAttendanceApi.employeesAll(),
            employeeAttendanceApi.employeeShiftsAll(),
            employeeAttendanceApi.shiftsAll(),
            employeeAttendanceApi.attendanceAll(),
            ]);
            setEmployees(employeeResponse.data.data?.items || []);
            setAssignments(assignmentResponse.data.data?.items || []);
            setShifts(shiftResponse.data.data?.items || []);
            setAttendance(attendanceResponse.data.data?.items || []);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Không tải được lịch làm.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadScheduleData(); }, [loadScheduleData]);

    const shiftById = useMemo(() => new Map(shifts.map((shift) => [shift.id, shift])), [shifts]);
    const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);

    const scheduleForDate = useMemo(() => (date) => {
        const dateValue = dayKey(date);
        const bit = weekdayBit(date);
        const byEmployee = new Map();
        assignments.forEach((assignment) => {
            const shift = shiftById.get(assignment.shiftId);
            if (!shift?.isActive || !(Number(shift.workDays) & bit) || dateOnly(assignment.effectiveFrom) > dateValue || (assignment.effectiveTo && dateOnly(assignment.effectiveTo) < dateValue)) return;
            const employee = employeeById.get(assignment.employeeId);
            if (!employee) return;
            const current = byEmployee.get(employee.id) || { employee, shifts: [] };
            if (!current.shifts.some((item) => item.id === shift.id)) current.shifts.push(shift);
            byEmployee.set(employee.id, current);
        });
        return [...byEmployee.values()].sort((a, b) => a.employee.employeeCode.localeCompare(b.employee.employeeCode, "vi"));
    }, [assignments, employeeById, shiftById]);

    const monthDates = useMemo(() => {
        const [year, month] = calendarMonth.split("-").map(Number);
        const first = new Date(year, month - 1, 1);
        const offset = (first.getDay() + 6) % 7;
        const daysInMonth = new Date(year, month, 0).getDate();
        const count = Math.ceil((offset + daysInMonth) / 7) * 7;
        return Array.from({ length: count }, (_, index) => {
            const date = new Date(year, month - 1, index - offset + 1);
            return date.getMonth() === month - 1 ? date : null;
        });
    }, [calendarMonth]);

    const selectedDateObject = useMemo(() => {
        const [year, month, day] = selectedDate.split("-").map(Number);
        return new Date(year, month - 1, day);
    }, [selectedDate]);
    const scheduled = useMemo(() => scheduleForDate(selectedDateObject), [scheduleForDate, selectedDateObject]);
    const attendanceByEmployee = useMemo(() => {
        const result = new Map();
        attendance.filter((row) => dateOnly(row.attendanceDate) === selectedDate).forEach((row) => {
            const previous = result.get(row.employeeId);
            if (!previous || new Date(row.lastUpdatedTime || row.createdTime) > new Date(previous.lastUpdatedTime || previous.createdTime)) result.set(row.employeeId, row);
        });
        return result;
    }, [attendance, selectedDate]);
    const visibleScheduled = useMemo(() => {
        const term = search.trim().toLocaleLowerCase();
        if (!term) return scheduled;
        return scheduled.filter(({ employee }) => `${employee.employeeCode} ${employee.fullName}`.toLocaleLowerCase().includes(term));
    }, [scheduled, search]);
    const visibleEmployeesForAssignment = useMemo(() => {
        const term = employeePickerSearch.trim().toLocaleLowerCase();
        const active = employees.filter((employee) => {
            if (employee.deletedTime || [4, 5].includes(Number(employee.status))) return false;
            if (elevatedScheduler) return true;
            return employee.managerId === auth?.employeeId || employee.departmentManagerId === auth?.employeeId;
        });
        if (!term) return active;
        return active.filter((employee) => `${employee.employeeCode} ${employee.fullName}`.toLocaleLowerCase().includes(term));
    }, [employees, employeePickerSearch, elevatedScheduler, auth?.employeeId]);

    const openAssignmentModal = () => {
        setAssignmentForm({ shiftId: "", effectiveFrom: vnToday(), effectiveTo: vnToday(), note: "" });
        setSelectedEmployeeIds([]);
        setEmployeePickerSearch("");
        setAssignmentError("");
        setShowAssignmentModal(true);
    };
    const toggleEmployeeSelection = (employeeId) => {
        setSelectedEmployeeIds((current) => current.includes(employeeId)
            ? current.filter((id) => id !== employeeId)
            : [...current, employeeId]);
    };
    const toggleVisibleEmployees = () => {
        const visibleIds = visibleEmployeesForAssignment.map((employee) => employee.id);
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedEmployeeIds.includes(id));
        setSelectedEmployeeIds((current) => allSelected
            ? current.filter((id) => !visibleIds.includes(id))
            : [...new Set([...current, ...visibleIds])]);
    };
    const createAssignment = async (event) => {
        event.preventDefault();
        if (selectedEmployeeIds.length < 2) {
            setAssignmentError("Vui lòng chọn ít nhất 2 nhân viên.");
            return;
        }
        if (!assignmentForm.shiftId) {
            setAssignmentError("Vui lòng chọn ca làm.");
            return;
        }
        if (!assignmentForm.effectiveFrom || !assignmentForm.effectiveTo || assignmentForm.effectiveTo < assignmentForm.effectiveFrom) {
            setAssignmentError("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
            return;
        }

        setSavingAssignment(true);
        setAssignmentError("");
        setNotice("");
        try {
            const response = await employeeAttendanceApi.createEmployeeShifts({
                employeeIds: selectedEmployeeIds,
                shiftId: assignmentForm.shiftId,
                effectiveFrom: assignmentForm.effectiveFrom,
                effectiveTo: assignmentForm.effectiveTo,
                note: assignmentForm.note.trim() || null,
            });
            const result = response.data.data || {};
            const alreadyNames = result.alreadyAssignedEmployeeNames || [];
            const alreadyText = alreadyNames.length
                ? ` Đã có lịch ca này: ${alreadyNames.join(", ")}.`
                : "";
            const assignedEmployeeCount = result.assignedEmployeeCount || 0;
            const createdAssignmentCount = result.createdAssignmentCount || 0;
            setNotice(assignedEmployeeCount > 0
                ? `Đã xếp lịch cho ${assignedEmployeeCount} nhân viên (${createdAssignmentCount} khoảng lịch).${alreadyText}`
                : `Nhân viên đã chọn đều có lịch ca này trong khoảng ngày yêu cầu.${alreadyText}`);
            chooseDate(assignmentForm.effectiveFrom);
            setShowAssignmentModal(false);
            await loadScheduleData();
        } catch (err) {
            const body = err.response?.data;
            setAssignmentError(body?.data?.errorMessage || body?.message || err.message || "Không thể thêm lịch làm.");
        } finally {
            setSavingAssignment(false);
        }
    };

    const moveMonth = (offset) => {
        const [year, month] = calendarMonth.split("-").map(Number);
        const next = new Date(year, month - 1 + offset, 1);
        setCalendarMonth(dayKey(next).slice(0, 7));
    };
    const chooseDate = (value) => {
        if (!value) return;
        setSelectedDate(value);
        setCalendarMonth(value.slice(0, 7));
    };
    const monthLabel = new Date(`${calendarMonth}-01T00:00:00`).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
    const selectedLabel = selectedDateObject.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

    return (
        <HrAppLayout>
            <div className="att-content work-schedule-page">
                        <HrHero
                            ico="📅"
                            title="Lịch làm"
                            sub="Chọn ngày để xem danh sách nhân viên có ca làm trong tháng."
                            kpis={[
                                { ico: "📅", label: "Ngày đang xem", value: selectedLabel, tone: "blue" },
                                { ico: "👥", label: "Người có lịch", value: scheduled.length + " người", tone: "green" },
                                { ico: "✅", label: "Đã chấm công", value: scheduled.filter(function (x) { return attendanceByEmployee.has(x.employee.id) && attendanceByEmployee.get(x.employee.id) && attendanceByEmployee.get(x.employee.id).checkInTime; }).length, tone: "ok" },
                            ]}
                        />
                {error && <div className="att-error">{error}</div>}
                {notice && <div className="work-schedule-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Đóng thông báo">×</button></div>}
                {loading ? <div className="att-loading">Đang tải lịch làm...</div> : (
                    <>
                        <section className="work-schedule-calendar att-card">
                            <div className="work-schedule-calendar-head">
                                <button type="button" className="att-cal-nav" onClick={() => moveMonth(-1)} aria-label="Tháng trước">‹</button>
                                <h2>{monthLabel}</h2>
                                <button type="button" className="att-cal-nav" onClick={() => moveMonth(1)} aria-label="Tháng sau">›</button>
                                <label className="work-schedule-date-picker">Chọn ngày <input type="date" value={selectedDate} onChange={(event) => chooseDate(event.target.value)} /></label>
                                <button type="button" className="admin-link-btn" onClick={() => chooseDate(vnToday())}>Xem hôm nay</button>
                            </div>
                            <div className="work-schedule-weekdays"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
                            <div className="work-schedule-days">
                                {monthDates.map((date, index) => {
                                    if (!date) return <span key={`empty-${index}`} className="work-schedule-day is-empty" />;
                                    const key = dayKey(date);
                                    const count = scheduleForDate(date).length;
                                    return <button key={key} type="button" className={`work-schedule-day${selectedDate === key ? " is-selected" : ""}${key === vnToday() ? " is-today" : ""}`} onClick={() => chooseDate(key)} aria-label={`${date.getDate()} tháng ${date.getMonth() + 1}, ${count} người có lịch làm`}>
                                        <span>{date.getDate()}</span><small>{count}</small>
                                    </button>;
                                })}
                            </div>
                            <div className="work-schedule-calendar-foot"><span><i className="work-schedule-count-dot" />Số người có lịch làm</span><span>Chọn ngày để xem danh sách ca</span></div>
                        </section>

                        <div className="work-schedule-day-summary">
                            <div><span>Ngày đang xem</span><strong>{selectedLabel}</strong></div>
                            <div><span>Người có lịch làm</span><strong>{scheduled.length} người</strong></div>
                        </div>

                        <section className="att-card work-schedule-list">
                            <div className="work-schedule-list-head">
                                <label className="admin-search"><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã hoặc tên nhân viên..." aria-label="Tìm nhân viên" /></label>
                                {canSchedule && <button type="button" className="work-schedule-add-btn" onClick={openAssignmentModal}>+ Thêm lịch làm</button>}
                            </div>
                            <div className="att-table-wrap">
                                <table className="att-table work-schedule-table">
                                    <thead><tr><th>Nhân viên</th><th>Ca làm</th><th>Giờ làm</th><th>Chấm công</th><th>Duyệt chấm công</th><th>Thao tác</th></tr></thead>
                                    <tbody>
                                        {visibleScheduled.length === 0 ? <tr><td colSpan={6}><span className="att-muted">{scheduled.length ? "Không tìm thấy nhân viên phù hợp." : "Ngày này chưa có nhân viên được xếp lịch làm."}</span></td></tr> : visibleScheduled.map(({ employee, shifts: employeeShifts }) => {
                                            const record = attendanceByEmployee.get(employee.id);
                                            return <tr key={employee.id}>
                                                <td><span className="work-schedule-employee-code">{employee.employeeCode}</span><strong className="work-schedule-employee-name">{employee.fullName}</strong></td>
                                                <td>{employeeShifts.map((shift) => shift.name).join(", ")}</td>
                                                <td>{employeeShifts.map((shift) => `${String(shift.startTime).slice(0, 5)}–${String(shift.endTime).slice(0, 5)}`).join(", ")}</td>
                                                <td><span className={`att-badge ${record ? "ok" : "warn"}`}>{record ? "Đã chấm công" : "Chưa chấm công"}</span></td>
                                                <td><span className={`att-badge ${record ? approvalClass(Number(record.approvalStatus)) : ""}`}>{record ? approvalLabel(Number(record.approvalStatus)) : "Chưa có bản ghi"}</span></td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="admin-view-link"
                                                                    onClick={() => setShiftDetailEmp(employee)}
                                                                >
                                                                    Xem
                                                                </button>
                                                            </td>
                                            </tr>;
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}
                {showAssignmentModal && (
                    <div className="att-guide-overlay" onMouseDown={(event) => event.target === event.currentTarget && setShowAssignmentModal(false)}>
                        <section className="att-detail-modal work-schedule-assignment-modal" role="dialog" aria-modal="true" aria-labelledby="work-schedule-assignment-title">
                            <header className="att-detail-modal-head">
                                <div><h2 id="work-schedule-assignment-title">Thêm lịch làm</h2><p>Chọn ca, khoảng ngày và ít nhất 2 nhân viên.</p></div>
                                <button type="button" onClick={() => setShowAssignmentModal(false)} aria-label="Đóng">×</button>
                            </header>
                            <form onSubmit={createAssignment}>
                                <div className="work-schedule-assignment-grid">
                                    <label>Ca làm
                                        <select required value={assignmentForm.shiftId} onChange={(event) => setAssignmentForm((current) => ({ ...current, shiftId: event.target.value }))}>
                                            <option value="">Chọn ca</option>
                                            {shifts.filter((shift) => shift.isActive).map((shift) => <option key={shift.id} value={shift.id}>{shift.name} · {String(shift.startTime).slice(0, 5)}–{String(shift.endTime).slice(0, 5)}</option>)}
                                        </select>
                                    </label>
                                    <div className="work-schedule-assignment-days">
                                        <span>Ngày áp dụng theo ca</span>
                                        <strong>{shifts.find((shift) => shift.id === assignmentForm.shiftId) ? weekdaysForShift(shifts.find((shift) => shift.id === assignmentForm.shiftId).workDays) : "Chọn ca để xem"}</strong>
                                    </div>
                                    <label>Ngày bắt đầu
                                        <input type="date" required value={assignmentForm.effectiveFrom} onChange={(event) => setAssignmentForm((current) => ({ ...current, effectiveFrom: event.target.value }))} />
                                    </label>
                                    <label>Ngày kết thúc
                                        <input type="date" required min={assignmentForm.effectiveFrom} value={assignmentForm.effectiveTo} onChange={(event) => setAssignmentForm((current) => ({ ...current, effectiveTo: event.target.value }))} />
                                    </label>
                                    <label className="work-schedule-assignment-note">Ghi chú (không bắt buộc)
                                        <input type="text" maxLength={500} value={assignmentForm.note} onChange={(event) => setAssignmentForm((current) => ({ ...current, note: event.target.value }))} placeholder="Ví dụ: lịch làm tháng 10" />
                                    </label>
                                </div>
                                <div className="work-schedule-employee-picker">
                                    <div className="work-schedule-picker-head">
                                        <strong>Chọn nhân viên ({selectedEmployeeIds.length} đã chọn)</strong>
                                        <button type="button" className="admin-link-btn" onClick={toggleVisibleEmployees}>{visibleEmployeesForAssignment.length > 0 && visibleEmployeesForAssignment.every((employee) => selectedEmployeeIds.includes(employee.id)) ? "Bỏ chọn danh sách" : "Chọn danh sách đang hiển thị"}</button>
                                    </div>
                                    <label className="admin-search"><span aria-hidden="true">⌕</span><input type="search" value={employeePickerSearch} onChange={(event) => setEmployeePickerSearch(event.target.value)} placeholder="Tìm theo mã hoặc tên..." aria-label="Tìm nhân viên để xếp lịch" /></label>
                                    <div className="work-schedule-employee-options">
                                        {visibleEmployeesForAssignment.map((employee) => <label key={employee.id} className="work-schedule-employee-option">
                                            <input type="checkbox" checked={selectedEmployeeIds.includes(employee.id)} onChange={() => toggleEmployeeSelection(employee.id)} />
                                            <span><strong>{employee.fullName}</strong><small>{employee.employeeCode}</small></span>
                                        </label>)}
                                        {visibleEmployeesForAssignment.length === 0 && <span className="att-muted">Không tìm thấy nhân viên.</span>}
                                    </div>
                                </div>
                                {assignmentError && <div className="att-error" role="alert">{assignmentError}</div>}
                                <p className="work-schedule-assignment-hint">Lịch chỉ áp dụng vào các thứ làm việc đã cấu hình trong ca. Nếu nhân viên đã có lịch cùng ca bao phủ toàn bộ khoảng ngày, hệ thống không tạo dòng trùng.</p>
                                <footer className="work-schedule-assignment-actions">
                                    <button type="button" className="admin-link-btn" onClick={() => setShowAssignmentModal(false)} disabled={savingAssignment}>Hủy</button>
                                    <button type="submit" className="work-schedule-add-btn" disabled={savingAssignment}>{savingAssignment ? "Đang lưu..." : "Lưu lịch làm"}</button>
                                </footer>
                            </form>
                        </section>
                    </div>
                )}
                {shiftDetailEmp && (
                    <EmployeeShiftDetailModal
                        employee={shiftDetailEmp}
                        assignments={assignments}
                        shifts={shifts}
                        canEdit={canEditShifts}
                        onUpdated={loadScheduleData}
                        onClose={() => setShiftDetailEmp(null)}
                    />
                )}
            </div>
        </HrAppLayout>
    );
};

export default EmployeeWorkSchedulePage;
