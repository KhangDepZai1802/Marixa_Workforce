import { useCallback, useEffect, useMemo, useState } from "react";
import { getAuth } from "../../../services/auth/auth";
import AppLayout from "../../../components/layout/AppLayout";
import relatedApi from "../api/relatedApi";
import { useLanguage, localeForLanguage } from "../../../services/i18n/LanguageProvider";
import "../attendance.css";
import "../leave.css";

const PAGE_SIZE = 5;
const STATUS = {
    1: { label: "Chờ duyệt", className: "pending" },
    2: { label: "Đã duyệt", className: "approved" },
    3: { label: "Từ chối", className: "rejected" },
    4: { label: "Đã hủy", className: "cancelled" },
};

const localDate = (value) => {
    if (!value) return null;
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day);
};

const dateInput = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (value, locale = "vi-VN") =>
    localDate(value)?.toLocaleDateString(locale) || "—";

const daysBetween = (from, to) => {
    if (!from || !to || to < from) return 0;
    return Math.round((localDate(to) - localDate(from)) / 86400000) + 1;
};

const statusOf = (status) => STATUS[status] || { label: "Không rõ", className: "pending" };
const roundDays = (value) => Math.round(value * 100) / 100;
const formatDayCount = (value, language) => {
    const days = roundDays(Number(value) || 0);
    if (language === "zh") return `${days} 天`;
    if (language === "en") return `${days} ${days === 1 ? "day" : "days"}`;
    return `${days} ngày`;
};

const rangeInYear = (request, year) => {
    const start = localDate(request.fromDate);
    const end = localDate(request.toDate);
    if (!start || !end) return 0;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const clippedStart = start > yearStart ? start : yearStart;
    const clippedEnd = end < yearEnd ? end : yearEnd;
    if (clippedEnd < clippedStart) return 0;
    const calendarDays = daysBetween(dateInput(start), dateInput(end));
    const requestDays = Number(request.totalDays) || calendarDays;
    return (daysBetween(dateInput(clippedStart), dateInput(clippedEnd)) / calendarDays) * requestDays;
};

const LeaveFormModal = ({ types, remaining, language, onClose, onSubmit }) => {
    const today = dateInput(new Date());
    const [form, setForm] = useState({
        leaveTypeId: types[0]?.id || "",
        fromDate: today,
        toDate: today,
        period: "full",
        reason: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const totalDays = form.period === "full" ? daysBetween(form.fromDate, form.toDate) : 0.5;

    const update = (key, value) => {
        setForm((current) => {
            const next = { ...current, [key]: value };
            if (key === "period" && value !== "full") next.toDate = current.fromDate;
            if (key === "fromDate" && value > current.toDate) next.toDate = value;
            if (key === "fromDate" && current.period !== "full") next.toDate = value;
            return next;
        });
    };

    const submit = async (event) => {
        event.preventDefault();
        setError("");
        setSaving(true);
        try {
            await onSubmit({ ...form, totalDays });
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Không gửi được đơn nghỉ phép.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="leave-modal-backdrop">
            <section className="leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-form-title">
                <header className="leave-modal-head">
                    <h2 id="leave-form-title">Tạo đơn nghỉ phép</h2>
                    <button type="button" className="leave-icon-btn" onClick={onClose} aria-label="Đóng">×</button>
                </header>
                <form onSubmit={submit} className="leave-form">
                    <label>Loại nghỉ <span>*</span>
                        <select required value={form.leaveTypeId} onChange={(e) => update("leaveTypeId", e.target.value)}>
                            {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                        </select>
                    </label>
                    <div className="leave-form-row">
                        <label>Từ ngày <span>*</span><input type="date" required value={form.fromDate} onChange={(e) => update("fromDate", e.target.value)} /></label>
                        <label>Đến ngày <span>*</span><input type="date" required min={form.fromDate} disabled={form.period !== "full"} value={form.toDate} onChange={(e) => update("toDate", e.target.value)} /></label>
                    </div>
                    <fieldset className="leave-period">
                        <legend>Thời gian nghỉ</legend>
                        {[ ["full", "Cả ngày"], ["morning", "Buổi sáng"], ["afternoon", "Buổi chiều"] ].map(([value, label]) => (
                            <label key={value}><input type="radio" name="period" value={value} checked={form.period === value} onChange={() => update("period", value)} />{label}</label>
                        ))}
                    </fieldset>
                    <div className="leave-days-preview"><span>Tổng số ngày</span><strong>{formatDayCount(totalDays, language)}</strong></div>
                    <label>Lý do <span>*</span><textarea required rows="3" maxLength="500" value={form.reason} onChange={(e) => update("reason", e.target.value)} placeholder="Nhập lý do xin nghỉ phép" /></label>
                    {remaining != null && <div className="leave-balance-note">{language === "zh" ? `ℹ️ 您还剩 ${remaining} 天年假。提交后还剩 ${Math.max(0, remaining - totalDays)} 天。` : language === "en" ? `ℹ️ You have ${formatDayCount(remaining, language)} of leave remaining. After this request, you will have ${formatDayCount(Math.max(0, remaining - totalDays), language)} left.` : `ℹ️ Bạn còn ${remaining} ngày phép. Sau khi đăng ký còn ${Math.max(0, remaining - totalDays)} ngày.`}</div>}
                    {error && <p className="leave-form-error">{error}</p>}
                    <footer className="leave-modal-actions">
                        <button type="button" className="leave-btn secondary" onClick={onClose} disabled={saving}>Hủy</button>
                        <button type="submit" className="leave-btn primary" disabled={saving || !types.length}>{saving ? "Đang gửi..." : "Gửi đơn nghỉ phép"}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
};

const LeaveDetailsModal = ({ request, onClose, locale, language }) => {
    const status = statusOf(request.status);
    const created = request.createdTime ? new Date(request.createdTime) : null;
    const approved = request.approvedAt ? new Date(request.approvedAt) : null;
    return (
        <div className="leave-modal-backdrop">
            <section className="leave-modal leave-detail-modal" role="dialog" aria-modal="true" aria-labelledby="leave-detail-title">
                <header className="leave-modal-head">
                    <h2 id="leave-detail-title">Chi tiết đơn</h2>
                    <button type="button" className="leave-icon-btn" onClick={onClose} aria-label="Đóng">×</button>
                </header>
                <div className="leave-detail-body">
                    <div className="leave-detail-type"><strong>{request.leaveTypeName || "Nghỉ phép"}</strong><span className={`leave-status ${status.className}`}>{status.label}</span></div>
                    <p className="leave-detail-dates">📅 {formatDate(request.fromDate, locale)} → {formatDate(request.toDate, locale)} <span>·</span> {formatDayCount(request.totalDays ?? daysBetween(request.fromDate, request.toDate), language)}</p>
                    <div className="leave-detail-field"><span>Lý do</span><p>{request.reason || "—"}</p></div>
                    <div className="leave-detail-field"><span>Người duyệt</span><p>{request.approverName || "Chưa có thông tin"}</p></div>
                    <div className="leave-timeline">
                        <h3>Lịch sử</h3>
                        <div className="leave-timeline-item"><i /> <div><strong>Tạo và gửi đơn</strong><span>{created ? created.toLocaleString(locale) : "—"}</span></div></div>
                        <div className="leave-timeline-item"><i className={approved ? "complete" : ""} /> <div><strong>{approved ? status.label : "Chờ quản lý duyệt"}</strong><span>{approved ? approved.toLocaleString(locale) : "Chưa xử lý"}</span></div></div>
                    </div>
                </div>
            </section>
        </div>
    );
};

const LeaveCalendar = ({ month, requests, onShift, locale }) => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const dayCount = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = Array.from({ length: Math.ceil((offset + dayCount) / 7) * 7 }, (_, i) => {
        const day = i - offset + 1;
        return day > 0 && day <= dayCount ? day : null;
    });
    const monthRequests = requests.filter((request) => {
        const from = localDate(request.fromDate);
        const to = localDate(request.toDate);
        return from <= new Date(month.getFullYear(), month.getMonth() + 1, 0) && to >= first;
    });
    return (
        <div className="att-card leave-calendar-card">
            <div className="leave-calendar-head">
                <h2>Lịch nghỉ của tôi</h2>
                <div className="leave-calendar-nav"><button type="button" onClick={() => onShift(-1)} aria-label="Tháng trước">‹</button><strong>{month.toLocaleDateString(locale, { month: "long", year: "numeric" })}</strong><button type="button" onClick={() => onShift(1)} aria-label="Tháng sau">›</button></div>
            </div>
            <div className="leave-calendar-grid">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <strong key={day}>{day}</strong>)}
                {cells.map((day, index) => {
                    const date = day ? new Date(month.getFullYear(), month.getMonth(), day) : null;
                    const entries = date ? monthRequests.filter((request) => date >= localDate(request.fromDate) && date <= localDate(request.toDate)) : [];
                    return <div key={index} className={`leave-calendar-day${day ? "" : " empty"}`}><span>{day || ""}</span>{entries.map((entry) => <i key={entry.id} className={statusOf(entry.status).className} title={`${entry.leaveTypeName || "Nghỉ phép"} · ${statusOf(entry.status).label}`} />)}</div>;
                })}
            </div>
            {monthRequests.length > 0 && <ul className="leave-calendar-list">{monthRequests.map((request) => <li key={request.id}><i className={statusOf(request.status).className} /><span>{formatDate(request.fromDate, locale)} – {formatDate(request.toDate, locale)} · {request.leaveTypeName || "Nghỉ phép"}</span><b>{statusOf(request.status).label}</b></li>)}</ul>}
        </div>
    );
};

const LeavePage = () => {
    const { language } = useLanguage();
    const locale = localeForLanguage(language);
    const auth = getAuth();
    const employeeId = auth?.employeeId;
    const userId = auth?.userId;
    const [requests, setRequests] = useState([]);
    const [types, setTypes] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [view, setView] = useState("list");
    const [month, setMonth] = useState(() => new Date());
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [search, setSearch] = useState("");
    const [fromFilter, setFromFilter] = useState("");
    const [toFilter, setToFilter] = useState("");
    const [page, setPage] = useState(1);

    const load = useCallback(async () => {
        if (!employeeId) {
            setError("Chưa xác định được nhân viên đang đăng nhập.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError("");
        const [requestResult, typeResult, profileResult] = await Promise.allSettled([
            relatedApi.leavesByEmployee(employeeId),
            relatedApi.leaveTypesAll(),
            userId ? relatedApi.employeeByUser(userId) : Promise.resolve(null),
        ]);
        if (requestResult.status === "fulfilled") setRequests(requestResult.value.data.data || []);
        else setError(requestResult.reason.response?.data?.message || requestResult.reason.message || "Không tải được đơn nghỉ phép.");
        if (typeResult.status === "fulfilled") {
            const data = typeResult.value.data.data;
            setTypes((data?.items || data || []).filter((type) => type.isActive !== false));
        }
        if (profileResult.status === "fulfilled" && profileResult.value) setProfile(profileResult.value.data.data || null);
        setLoading(false);
    }, [employeeId, userId]);

    useEffect(() => { load(); }, [load]);

    const annualType = useMemo(() => types.find((type) => /năm|annual|year/i.test(`${type.name} ${type.code}`) && type.maxDays != null) || types.find((type) => type.isPaid && type.maxDays != null), [types]);
    const year = new Date().getFullYear();
    const annualRequests = useMemo(() => requests.filter((request) => request.leaveTypeId === annualType?.id && request.status !== 4), [requests, annualType]);
    const used = roundDays(annualRequests.filter((request) => request.status === 2).reduce((sum, request) => sum + rangeInYear(request, year), 0));
    const pending = roundDays(annualRequests.filter((request) => request.status === 1).reduce((sum, request) => sum + rangeInYear(request, year), 0));
    const remaining = annualType ? roundDays(Math.max(0, Number(annualType.maxDays) - used)) : null;

    const filtered = useMemo(() => requests.filter((request) => {
        const from = localDate(request.fromDate);
        const to = localDate(request.toDate);
        if (statusFilter && String(request.status) !== statusFilter) return false;
        if (typeFilter && request.leaveTypeId !== typeFilter) return false;
        const query = search.trim().toLocaleLowerCase("vi");
        if (query && !`${request.leaveTypeName || ""} ${request.reason || ""}`.toLocaleLowerCase("vi").includes(query)) return false;
        if (fromFilter && to < localDate(fromFilter)) return false;
        if (toFilter && from > localDate(toFilter)) return false;
        return true;
    }), [requests, statusFilter, typeFilter, search, fromFilter, toFilter]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const createRequest = async (form) => {
        await relatedApi.createLeaveRequest({
            employeeId,
            leaveTypeId: form.leaveTypeId,
            fromDate: form.fromDate,
            toDate: form.toDate,
            totalDays: form.totalDays,
            reason: form.reason.trim(),
        });
        setShowForm(false);
        setPage(1);
        setNotice("Đơn nghỉ phép đã được gửi.");
        setTimeout(() => setNotice(""), 3500);
        await load();
    };

    const changeMonth = (delta) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

    return (
        <AppLayout profile={profile}>
            <div className="leave-page">
                <header className="leave-page-head">
                    <div><h1>Đơn xin nghỉ phép</h1><p>Quản lý và theo dõi lịch nghỉ phép của bạn</p></div>
                    <button type="button" className="leave-btn primary" onClick={() => setShowForm(true)}>＋ Tạo đơn nghỉ phép</button>
                </header>
                {notice && <div className="leave-notice">{notice}</div>}
                {error && <div className="att-error">{error}</div>}
                {loading ? <div className="att-loading">Đang tải...</div> : (
                    <>
                        <section className="leave-stats" aria-label="Tổng quan phép năm">
                            <div className="leave-stat-card"><span>Phép năm</span><strong>{annualType ? formatDayCount(annualType.maxDays, language) : "Chưa cấu hình"}</strong></div>
                            <div className="leave-stat-card"><span>Đã sử dụng</span><strong>{annualType ? formatDayCount(used, language) : "—"}</strong></div>
                            <div className="leave-stat-card"><span>Đang chờ</span><strong>{annualType ? formatDayCount(pending, language) : "—"}</strong></div>
                            <div className="leave-stat-card"><span>Còn lại</span><strong>{remaining == null ? "—" : formatDayCount(remaining, language)}</strong></div>
                        </section>
                        <section className="leave-requests">
                            <div className="leave-section-head"><h2>Lịch nghỉ của tôi</h2><div className="leave-view-switch"><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>Danh sách</button><button type="button" className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>Lịch</button></div></div>
                            {view === "list" ? (
                                <>
                                    <div className="leave-filters">
                                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option><option value="1">Chờ duyệt</option><option value="2">Đã duyệt</option><option value="3">Từ chối</option><option value="4">Đã hủy</option></select>
                                        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}><option value="">Tất cả loại nghỉ</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select>
                                        <input type="search" placeholder="Tìm loại nghỉ hoặc lý do" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                                        <label>Từ ngày<input type="date" value={fromFilter} onChange={(e) => { setFromFilter(e.target.value); setPage(1); }} /></label>
                                        <label>Đến ngày<input type="date" value={toFilter} onChange={(e) => { setToFilter(e.target.value); setPage(1); }} /></label>
                                    </div>
                                    <div className="att-card leave-table-card"><div className="att-table-wrap att-table-wrap--stack"><table className="att-table leave-table att-table--stack"><thead><tr><th>Loại nghỉ</th><th>Thời gian</th><th>Số ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{pageItems.map((request) => { const status = statusOf(request.status); return <tr key={request.id}><td data-label="Loại nghỉ"><strong>{request.leaveTypeName || "Nghỉ phép"}</strong></td><td data-label="Thời gian">{formatDate(request.fromDate, locale)}<span className="leave-date-end">→ {formatDate(request.toDate, locale)}</span></td><td data-label="Số ngày">{formatDayCount(request.totalDays ?? daysBetween(request.fromDate, request.toDate), language)}</td><td data-label="Trạng thái"><span className={`leave-status ${status.className}`}>{status.label}</span></td><td data-label="Thao tác"><button type="button" className="leave-view-btn" onClick={() => setSelectedRequest(request)}>Xem</button></td></tr>; })}{!pageItems.length && <tr><td colSpan="5" className="leave-empty">Không tìm thấy đơn nghỉ phép phù hợp.</td></tr>}</tbody></table></div></div>
                                    <footer className="leave-pagination"><span>Hiển thị {pageItems.length} / {filtered.length} đơn</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>‹</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button type="button" key={number} className={page === number ? "active" : ""} onClick={() => setPage(number)}>{number}</button>)}<button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>›</button></div></footer>
                                </>
                            ) : <LeaveCalendar month={month} requests={filtered} onShift={changeMonth} locale={locale} />}
                        </section>
                    </>
                )}
            </div>
            {showForm && <LeaveFormModal types={types} remaining={remaining} language={language} onClose={() => setShowForm(false)} onSubmit={createRequest} />}
            {selectedRequest && <LeaveDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} locale={locale} language={language} />}
        </AppLayout>
    );
};

export default LeavePage;
