import { useState, useEffect, useMemo } from "react";

import { useSearchParams } from "react-router-dom";



import HrAppLayout from "../../hr/layout/HrAppLayout";

import employeeAttendanceApi from "../api/employeeAttendanceApi";

import AttendanceFormModal from "../components/AttendanceFormModal";

import AttendanceHistoryModal from "../components/AttendanceHistoryModal";

import PhotoCell from "../../../../modules/me/components/PhotoCell";

import { statusLabel, statusClass, approvalLabel, approvalClass } from "../labels";

import { formatVnTime, formatVnDate, calcOvertime, formatOvertime } from "../../../../utils/vnTime";

import { toCsv, downloadCsv } from "../../hr/hrUtils";
import { localeForLanguage, translate, useLanguage } from "../../../../services/i18n/LanguageProvider";

import "../../../../modules/me/attendance.css";

import "../../employee.css";
import HrHero from "../../hr/HrHero";



const vnToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(new Date());



// Trang quản trị: lịch sử chấm công của TOÀN BỘ nhân viên,

// + KPI (chấm hôm nay / bất thường / chờ duyệt), duyệt công,

// xuất file theo tháng và báo cáo công việc.

const EmployeeAttendanceHistoryPage = () => {

    const [rows, setRows] = useState([]);

    const [employees, setEmployees] = useState([]);

    const [logs, setLogs] = useState([]);

    const [employeeShifts, setEmployeeShifts] = useState([]);

    const [shifts, setShifts] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");



    // Bộ lọc theo nhân viên (?employee=<id> - link từ trang Thống kê)

    const [searchParams] = useSearchParams();

    const q = searchParams.get("employee") || "";

    const [calMonth, setCalMonth] = useState(() => vnToday().slice(0, 7));

    const [selectedDate, setSelectedDate] = useState(() => vnToday());

    const [search, setSearch] = useState("");

    const { language } = useLanguage();

    const locale = localeForLanguage(language);

    const L = (text) => translate(text, language);



    // Modal thêm / sửa

    const [modalOpen, setModalOpen] = useState(false);

    const [historyRow, setHistoryRow] = useState(null);

    const [editRow, setEditRow] = useState(null);

    const [dupNotice, setDupNotice] = useState(null);



    const empMap = useMemo(

        () => Object.fromEntries(employees.map((e) => [e.id, e])),

        [employees]

    );



    const load = async () => {

        try {

            const [a, e, lg, es, s] = await Promise.all([

                employeeAttendanceApi.attendanceAll(),

                employeeAttendanceApi.employeesAll(),

                employeeAttendanceApi.logsAll ? employeeAttendanceApi.logsAll() : Promise.resolve(null),

                employeeAttendanceApi.employeeShiftsAll(),

                employeeAttendanceApi.shiftsAll(),

            ]);

            setRows(a.data.data?.items || []);

            setEmployees(e.data.data?.items || []);

            if (lg?.data?.data) setLogs(lg.data.data.items || []);

            setEmployeeShifts(es.data.data?.items || []);

            setShifts(s.data.data?.items || []);

        } catch (err) {

            setError(err.response?.data?.message || err.message);

        } finally {

            setLoading(false);

        }

    };



    useEffect(() => {

        load();

    }, []);



    const filtered = useMemo(() => {

        const term = search.trim().toLocaleLowerCase();

        return rows.filter((r) => {

            if (q && r.employeeId !== q) return false;

            const employee = empMap[r.employeeId];

            const haystack = [r.employeeCode, r.employeeName, employee?.employeeCode, employee?.fullName]

                .join(" ").toLocaleLowerCase();

            if (term && !haystack.includes(term)) return false;

            if (selectedDate && (r.attendanceDate || "").slice(0, 10) !== selectedDate) return false;

            return true;

        });

    }, [rows, q, selectedDate, search, empMap]);



    const calCells = useMemo(() => {

        const [year, monthNumber] = calMonth.split("-").map(Number);

        const blanks = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;

        const days = new Date(year, monthNumber, 0).getDate();

        return [...Array(blanks).fill(null), ...Array.from({ length: days }, (_, index) =>

            `${calMonth}-${String(index + 1).padStart(2, "0")}`)];

    }, [calMonth]);



    const calTitle = useMemo(() => {

        const [year, monthNumber] = calMonth.split("-").map(Number);

        const today = vnToday();

        const day = selectedDate ? Number(selectedDate.slice(8)) : calMonth === today.slice(0, 7) ? Number(today.slice(8)) : "…";

        return day !== "…" ? new Date(year, monthNumber - 1, Number(day)).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : new Date(year, monthNumber - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });

    }, [calMonth, selectedDate, locale]);



    const dayStatus = useMemo(() => rows.reduce((result, row) => {

        const day = (row.attendanceDate || "").slice(0, 10);

        if (!day) return result;

        const status = Number(row.approvalStatus) === 0 ? "pending" : "done";

        if (status === "pending" || !result[day]) result[day] = status;

        return result;

    }, {}), [rows]);



    const shiftCalendar = (offset) => {

        const [year, monthNumber] = calMonth.split("-").map(Number);

        const next = new Date(year, monthNumber - 1 + offset, 1);

        setCalMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);

        setSelectedDate("");

    };

    const selectDay = (day) => { setSelectedDate(day); setCalMonth(day.slice(0, 7)); };

    const viewToday = () => { setSelectedDate(vnToday()); setCalMonth(vnToday().slice(0, 7)); };

    const clearDay = () => setSelectedDate("");



    // ===== Chỉ số theo ngày đang chọn =====

    const kpi = useMemo(() => {

        const metricDate = selectedDate || vnToday();

        const dayLogs = logs.filter((log) => log.logTime &&

            new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(new Date(log.logTime)) === metricDate);

        const latestByEmployee = new Map();

        dayLogs.forEach((log) => {

            const previous = latestByEmployee.get(log.employeeId);

            if (!previous || new Date(log.logTime) > new Date(previous.logTime)) latestByEmployee.set(log.employeeId, log);

        });

        const weekdayBit = 1 << ((new Date(`${metricDate}T00:00:00`).getDay() + 6) % 7);

        const activeShiftIds = new Set(shifts.filter((shift) => shift.isActive && (Number(shift.workDays) & weekdayBit)).map((shift) => shift.id));

        const scheduledEmployees = new Set(employeeShifts.filter((assignment) =>

            activeShiftIds.has(assignment.shiftId) &&

            (assignment.effectiveFrom || "").slice(0, 10) <= metricDate &&

            (!assignment.effectiveTo || assignment.effectiveTo.slice(0, 10) >= metricDate)

        ).map((assignment) => assignment.employeeId));

        const checkedIn = new Set(dayLogs.filter((log) => log.type === 1).map((log) => log.employeeId));

        return {

            workforce: employees.length,

            scheduled: scheduledEmployees.size,

            checkedIn: checkedIn.size,

            onShift: [...latestByEmployee.values()].filter((log) => log.type === 1).length,

            checkedOut: new Set(dayLogs.filter((log) => log.type === 2).map((log) => log.employeeId)).size,

            absent: Math.max(0, scheduledEmployees.size - checkedIn.size),

        };

    }, [rows, logs, employees, employeeShifts, shifts, selectedDate]);



    // ===== Duyệt công (thấp / cao cấp: duyệt / từ chối) =====

    const approve = (row, ok) => {

        setError("");

        setEditRow({ ...row, approvalStatus: ok ? 1 : 2, _approvalDecision: true });

        setModalOpen(true);

    };



    // ===== Xuất file theo tháng (CSV) =====

    const exportMonth = () => {

        const target = rows.filter((row) => (row.attendanceDate || "").slice(0, 7) === calMonth &&

            (!q || row.employeeId === q) && (!search.trim() || `${row.employeeCode || ""} ${row.employeeName || ""} ${empMap[row.employeeId]?.employeeCode || ""} ${empMap[row.employeeId]?.fullName || ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));

        const rowsCsv = target.map((r) => {

            const e = empMap[r.employeeId];

            return {

                "Mã NV": r.employeeCode || e?.employeeCode || "",

                "Họ tên": e?.fullName || "",

                "Ngày": formatVnDate(r.attendanceDate),

                "Giờ vào": formatVnTime(r.checkInTime) || "",

                "Giờ ra": formatVnTime(r.checkOutTime) || "",

                "Giờ công": r.actualHours != null ? `${r.actualHours}h` : "",

                "Trạng thái": statusLabel(r.status),

                "Duyệt": approvalLabel(r.approvalStatus),

            };

        });

        const headers = Object.keys(rowsCsv[0] || { "Mã NV": "" });

        downloadCsv(

            `cham-cong-${calMonth}.csv`,

            toCsv(rowsCsv, headers)

        );

    };



    const submitModal = async (form, isEdit) => {

        if (isEdit && editRow?.approvalStatus === 1 && !editRow?._approvalDecision) {

            setError("Không thể chỉnh sửa bản ghi chấm công đã được duyệt.");

            return;

        }

        const asDateTimeOffset = (time, isCheckout = false) => {

            if (!time) return null;

            const dateTime = new Date(`${form.attendanceDate}T${time}:00`);

            if (isCheckout && form.checkInTime && time < form.checkInTime) dateTime.setDate(dateTime.getDate() + 1);

            return dateTime.toISOString();

        };

        const payload = {

            employeeId: form.employeeId,

            attendanceDate: form.attendanceDate,

            status: form.status === "" ? null : Number(form.status),

            actualHours: form.actualHours === "" ? null : Number(form.actualHours),

            approvalStatus: Number(form.approvalStatus),

            note: form.note || null,

            checkInTime: asDateTimeOffset(form.checkInTime),

            checkOutTime: asDateTimeOffset(form.checkOutTime, true),

        };

        try {

            if (isEdit) {

                payload.id = editRow.id;

                await employeeAttendanceApi.update(payload);

            } else {

                // Pre-check trùng từ dữ liệu đã tải: "+ Thêm" chỉ cho trường hợp chưa có chấm công

                const dup = rows.find((r) => r.employeeId === form.employeeId && (r.attendanceDate || "").slice(0, 10) === form.attendanceDate);

                if (dup) {

                    setModalOpen(false);

                    setEditRow(null);

                    setDupNotice({ employeeId: form.employeeId, attendanceDate: form.attendanceDate });

                    return;

                }

                // Create chỉ nhận các field của CreateAttendanceModelView

                await employeeAttendanceApi.create({

                    employeeId: payload.employeeId,

                    attendanceDate: payload.attendanceDate,

                    status: payload.status,

                    actualHours: payload.actualHours,

                    checkInTime: asDateTimeOffset(form.checkInTime),

                    checkOutTime: asDateTimeOffset(form.checkOutTime, true),

                    note: payload.note,

                });

            }

            setModalOpen(false);

            setEditRow(null);

            load();

        } catch (err) {

            // Fallback: server vẫn chặn trùng (race / dữ liệu chưa load hết)

            if (!isEdit && err.response?.status === 400 && String(err.response?.data?.message || "").includes("Attendance already exists")) {

                setModalOpen(false);

                setEditRow(null);

                setDupNotice({ employeeId: form.employeeId, attendanceDate: form.attendanceDate });

                return;

            }

            setError(err.response?.data?.message || err.message);

            throw err;

        }

    };



    const empCode = (row) => {

        const e = empMap[row.employeeId];

        return e?.employeeCode || row.employeeCode || "—";

    };



    const empFull = (row) => {

        const e = empMap[row.employeeId];

        return e ? e.fullName : (row.employeeName || "—");

    };



    const PageLayout = HrAppLayout;



    return (

        <PageLayout>

            <div className="att-content attendance-history-compact">

                {error && <div className="att-error">{error}</div>}

                {loading ? (

                    <div className="att-loading">{L("Đang tải...")}</div>

                ) : (

                    <>

                        <HrHero
                            ico="🕒"
                            title="Lịch sử chấm công"
                            sub="Theo dõi, duyệt và xử lý chấm công toàn bộ nhân viên theo ngày."
                            kpis={[
                                { ico: "👥", label: "Quân số", value: kpi.workforce, tone: "blue" },
                                { ico: "📅", label: "Có lịch làm", value: kpi.scheduled, tone: "green" },
                                { ico: "✅", label: "Đã vào ca", value: kpi.checkedIn, tone: "ok" },
                                { ico: "◷", label: "Đang trong ca", value: kpi.onShift, tone: "warn" },
                                { ico: "↩", label: "Đã ra ca", value: kpi.checkedOut, tone: "gray" },
                                { ico: "✕", label: "Vắng", value: kpi.absent, tone: "red" },
                            ]}
                        />



                        <div className="att-cal-strip">

                            <div className="att-cal">

                                <div className="att-cal-head">

                                    <button type="button" className="att-cal-nav" onClick={() => shiftCalendar(-1)} aria-label={L("Tháng trước")}>‹</button>

                                    <span className="att-cal-title">{calTitle}</span>

                                    <button type="button" className="att-cal-nav" onClick={() => shiftCalendar(1)} aria-label={L("Tháng sau")}>›</button>

                                </div>

                                <div className="att-cal-wk"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>CC</span><span>T7</span></div>

                                <div className="att-cal-grid">

                                    {calCells.map((day, index) => day ? (

                                        <button key={day} type="button" className={`att-cal-day${dayStatus[day] ? ` att-cal-day--${dayStatus[day]}` : ""}${selectedDate === day ? " att-cal-day--selected" : ""}`} onClick={() => selectDay(day)}>{Number(day.slice(8))}</button>

                                    ) : <span key={`blank-${index}`} className="att-cal-day att-cal-day--blank" />)}

                                </div>

                                <div className="att-cal-footer">

                                    <div className="att-cal-legend"><span><i className="att-dot att-dot--pending" />{L("Chưa duyệt")}</span><span><i className="att-dot att-dot--done" />{L("Đã xử lý")}</span><span><i className="att-dot att-dot--none" />{L("Không có bản ghi")}</span></div>

                                    <div className="att-cal-actions">

                                        <button type="button" className={`att-cal-action${selectedDate === vnToday() ? " active" : ""}`} onClick={viewToday}>{L("Xem hôm nay")}</button>

                                        <button type="button" className={`att-cal-action${selectedDate ? "" : " active"}`} onClick={clearDay}>{L("Xem tất cả")}</button>

                                    </div>

                                </div>

                            </div>

                        </div>



                        <section className="att-card">

                            <div className="admin-toolbar attendance-history-toolbar">

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

                                <span className="att-muted">{filtered.length} {L("bản ghi")}</span>

                                <button

                                    type="button"

                                    className="admin-link-btn"

                                    onClick={exportMonth}

                                >

                                    {L("⬇ Xuất file tháng")}

                                </button>

                                <button

                                    type="button"

                                    className="admin-link-btn"

                                    onClick={() => {

                                        setEditRow(null);

                                        setModalOpen(true);

                                    }}

                                >

                                    {L("+ Thêm")}

                                </button>

                            </div>



                            <div className="att-table-wrap">

                                <table className="att-table">

                                    <thead>

                                        <tr>

                                            <th>Nhân viên</th>

                                            <th>Ngày</th>

                                            <th className="att-col-status">Trạng thái</th>

                                            <th>Giờ vào</th>

                                            <th>Giờ ra</th>

                                            <th className="att-col-actual">Giờ thực</th>
                                            <th className="att-col-ot">Tăng ca</th>

                                            <th className="att-col-photo">Ảnh vào ca</th>

                                            <th className="att-col-photo">Ảnh ra ca</th>

                                            <th className="att-col-approval">Duyệt</th>

                                        </tr>

                                    </thead>

                                    <tbody>

                                        {filtered.length === 0 ? (

                                            <tr>

                                                <td colSpan={10}>

                                                    <span className="att-muted">Không có bản ghi phù hợp.</span>

                                                </td>

                                            </tr>

                                        ) : (

                                            filtered.map((row) => (

                                                <tr key={row.id}>

                                                    <td><span className="work-schedule-employee-code">{empCode(row)}</span><strong className="work-schedule-employee-name">{empFull(row)}</strong></td>

                                                    <td>{formatVnDate(row.attendanceDate)}</td>

                                                    <td className="att-col-status">

                                                        <span

                                                            className={`att-badge ${statusClass(row.status)}`}

                                                        >

                                                            {L(statusLabel(row.status))}

                                                        </span>

                                                    </td>

                                                    <td>{formatVnTime(row.checkInTime) || "—"}</td>

                                                    <td>{formatVnTime(row.checkOutTime) || "—"}</td>

                                                    <td className="att-col-actual">{row.actualHours != null ? `${row.actualHours}h` : "—"}</td>
                                                    <td className="att-col-ot">{(() => { const ot = calcOvertime(row); return ot > 0 ? <i className="att-badge warn">+{formatOvertime(ot)}</i> : <span className="att-muted">—</span>; })()}</td>

                                                    <td className="att-col-photo"><PhotoCell src={row.checkInPhoto} alt="Vào ca" hideYesBadge /></td>

                                                    <td className="att-col-photo"><PhotoCell src={row.checkOutPhoto} alt="Ra ca" hideYesBadge /></td>

                                                    <td>

                                                        <div className="att-approval-cell">

                                                            {row.approvalStatus === 0 ? (

                                                                row.checkOutTime ? (

                                                                    <>

                                                                        <button

                                                                            type="button"

                                                                            className="admin-link-btn admin-link-btn--sm admin-link-btn--approve"

                                                                            onClick={() => approve(row, true)}

                                                                        >

                                                                            Duyệt

                                                                        </button>

                                                                        <button type="button" className="admin-link-btn admin-link-btn--sm" onClick={() => { setEditRow(row); setModalOpen(true); }}>Sửa</button>

                                                                    </>

                                                                ) : (

                                                                    <button type="button" className="admin-link-btn admin-link-btn--sm" title="Nhân viên chưa ra ca — cập nhật giờ ra ca để có thể duyệt" onClick={() => { setEditRow(row); setModalOpen(true); }}>Sửa</button>

                                                                )

                                                            ) : (

                                                                <div

                                                                    className="att-approval-detail"

                                                                    onClick={() => setHistoryRow(row)}

                                                                    title={L("Xem chi tiết")}

                                                                >

                                                                    <span className={`att-badge ${approvalClass(row.approvalStatus)}`}>{L(approvalLabel(row.approvalStatus))}</span>

                                                                    {row.approvedAt && <small>{formatVnTime(row.approvedAt)} · {formatVnDate(row.approvedAt)}</small>}

                                                                    <span className="att-approval-detail-hover">{L("Xem chi tiết")}</span>

                                                                </div>

                                                            )}

                                                        </div>

                                                    </td>

                                                </tr>

                                            ))

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



                {dupNotice && (() => {

                    const dupEmp = employees.find((e) => e.id === dupNotice.employeeId);

                    const dupName = dupEmp ? `${dupEmp.fullName} · ${dupEmp.employeeCode}` : "Nhân viên này";

                    return (

                        <div className="att-guide-overlay" onMouseDown={(e) => e.target === e.currentTarget && setDupNotice(null)}>

                            <section className="att-history-modal" role="dialog" aria-modal="true">

                                <header className="att-history-modal-head">

                                    <h2>Bản ghi đã tồn tại</h2>

                                    <p>{dupName} · {formatVnDate(dupNotice.attendanceDate)}</p>

                                    <button type="button" onClick={() => setDupNotice(null)} aria-label="Đóng">×</button>

                                </header>

                                <div className="att-history-body">

                                    <div className="att-history-section">

                                        <div className="att-history-section-title">

                                            <span className="att-badge warn">Lưu ý</span>

                                        </div>

                                        <div className="att-history-change-detail">

                                            Nhân viên đã có bản ghi chấm công trong ngày này. Nút “+ Thêm” chỉ dùng cho trường hợp nhân viên quên chấm hoặc chưa có bản ghi (chấm bổ sung).

                                        </div>

                                        <div className="att-history-row">

                                            <span className="att-history-label">Bạn có thể</span>

                                            <span>Chọn một ngày khác, hoặc bấm “Sửa” trên bản ghi hiện có nếu cần điều chỉnh.</span>

                                        </div>

                                    </div>

                                </div>

                                <footer className="att-history-modal-foot">

                                    <button type="button" className="admin-link-btn" onClick={() => setDupNotice(null)}>Đóng</button>

                                </footer>

                            </section>

                        </div>

                    );

                })()}



                {historyRow && (

                    <AttendanceHistoryModal

                        row={historyRow}

                        employeeLabel={`${empCode(historyRow)} · ${empFull(historyRow)}`}

                        onClose={() => setHistoryRow(null)}

                    />

                )}

            </div>

        </PageLayout>

    );

};



export default EmployeeAttendanceHistoryPage;

