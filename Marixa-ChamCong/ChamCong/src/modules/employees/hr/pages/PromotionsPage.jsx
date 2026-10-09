import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../../../services/api/axiosClient";
import { getAuth } from "../../../../services/auth/auth";
import HrAppLayout from "../layout/HrAppLayout";
import AppLayout from "../../../../components/layout/AppLayout";
import { localeForLanguage, useLanguage } from "../../../../services/i18n/LanguageProvider";
import "./promotions.css";
import HrHero from "../HrHero";

const unwrap = (response) => response?.data?.data;
const statusText = (status) => ["Chờ duyệt", "Đã duyệt", "Từ chối"][status] || "Không rõ";
const localDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const errorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (typeof data === "string") return data;
    if (data?.message) return data.message;
    if (data?.title) return data.title;
    const firstValidationError = Object.values(data?.errors || {}).flat()[0];
    return firstValidationError || fallback;
};

export default function PromotionsPage({ selfMode = false }) {
    const [rows, setRows] = useState([]);
    const [options, setOptions] = useState({ employees: [], positions: [], roles: ["Employee", "Manager", "HR"] });
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [formOpen, setFormOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [detail, setDetail] = useState(null);
    const [review, setReview] = useState(null);
    const [reviewError, setReviewError] = useState("");
    const [reviewSaving, setReviewSaving] = useState(false);
    const [payload, setPayload] = useState({ employeeId: "", newPositionId: "", targetRoleName: "Employee", effectiveDate: localDate(), reason: "", additionalNote: "" });
    const auth = getAuth();
    const { language } = useLanguage();
    const dateLocale = localeForLanguage(language);
    const roles = auth?.roles || [];
    const isElevatedReviewer = roles.some((role) => ["Admin", "HR"].includes(role));
    const isManager = roles.includes("Manager");
    const canReviewRow = (row) => isElevatedReviewer || (isManager && row.targetRoleName !== "HR" && row.employeeId !== auth?.employeeId);
    const load = useCallback(async () => {
        setBusy(true);
        setError("");
        try {
            const [records, config] = await Promise.all([
                axiosClient.get(`/EmployeePromotion/${selfMode ? "mine" : "get-all"}`),
                axiosClient.get("/EmployeePromotion/options"),
            ]);
            setRows(unwrap(records) || []);
            const data = unwrap(config) || {};
            setOptions({ employees: data.employees || [], positions: data.positions || [], roles: data.roles || ["Employee"], currentEmployee: data.currentEmployee || null });
        } catch (e) { setError(errorMessage(e, "Không tải được dữ liệu thăng chức.")); }
        finally { setBusy(false); }
    }, [selfMode]);
    useEffect(() => { load(); }, [load]);

    const visible = useMemo(() => rows.filter((row) => (filter === "all" || row.status === Number(filter)) && `${row.employeeName} ${row.currentEmployeeCode} ${row.newPositionName} ${row.proposedByName}`.toLowerCase().includes(search.toLowerCase())), [rows, search, filter]);
    const counts = [rows.length, rows.filter((x) => x.status === 0).length, rows.filter((x) => x.status === 1).length, rows.filter((x) => x.status === 2).length];
    const selectedEmployee = options.employees.find((x) => x.id === payload.employeeId);

    const submit = async (event) => {
        event.preventDefault(); setFormError(""); setNotice("");
        if (!payload.newPositionId) { setFormError("Hãy chọn chức vụ bạn muốn đề xuất."); return; }
        if (payload.reason.trim().length < 5) { setFormError("Lý do cần có ít nhất 5 ký tự để cấp trên có đủ thông tin xét duyệt."); return; }
        setSaving(true);
        try {
            await axiosClient.post("/EmployeePromotion/request", { ...payload, reason: payload.reason.trim(), employeeId: selfMode ? null : payload.employeeId || null });
            setFormOpen(false); setFormError(""); setPayload((p) => ({ ...p, employeeId: "", newPositionId: "", reason: "", additionalNote: "", effectiveDate: localDate() })); setNotice("Đã gửi đề xuất thăng chức."); await load();
        } catch (e) { setFormError(errorMessage(e, "Không gửi được đề xuất. Vui lòng kiểm tra thông tin và thử lại.")); }
        finally { setSaving(false); }
    };
    const decide = async (approve) => {
        setReviewError(""); setReviewSaving(true); setNotice("");
        try {
            await axiosClient.post(`/EmployeePromotion/review/${review.id}`, { approve, comment: review.comment });
            setReview(null); setNotice(approve ? "Đã duyệt. Chức vụ, mã nhân viên và quyền tài khoản đã được cập nhật." : "Đã từ chối đề xuất."); await load();
        } catch (e) { setReviewError(errorMessage(e, "Không xử lý được đề xuất. Kiểm tra quyền xét duyệt rồi thử lại.")); }
        finally { setReviewSaving(false); }
    };

    const Content = <section className={`promotion-page${selfMode ? " promotion-page--self" : " promotion-page--admin"}`}>
        <HrHero ico="🚀" title={(selfMode ? "Đề xuất thăng chức" : "Quản lý thăng chức")} sub={(selfMode ? "Gửi nguyện vọng phát triển và theo dõi quá trình xét duyệt." : "Quản lý đề xuất từ nhân viên và đề cử trong phạm vi phụ trách.")} kpis={[{ ico: "▤", label: "Tổng đề xuất", value: counts[0], tone: "blue" }, { ico: "◷", label: "Chờ xử lý", value: counts[1], tone: "warn" }, { ico: "✓", label: "Đã duyệt", value: counts[2], tone: "green" }, { ico: "✕", label: "Từ chối", value: counts[3], tone: "red" }]}/>
        {!selfMode && <nav className="promotion-tabs"><Link to="/employees">Nhân sự</Link><span>›</span><strong>Thăng chức</strong></nav>}
        {error && <div className="promotion-alert error">{String(error)}</div>}{notice && <div className="promotion-alert success">{notice}</div>}
        <div className="promotion-toolbar"><button className="promotion-primary" onClick={() => setFormOpen(true)}>＋ {(selfMode ? "Tạo đề xuất" : "Đề cử thăng chức")}</button><label className="promotion-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm nhân viên, mã hoặc chức vụ..." /></label><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="0">Chờ duyệt</option><option value="1">Đã duyệt</option><option value="2">Từ chối</option></select><button onClick={load} className="promotion-refresh">↻ Làm mới</button></div>
        <div className="promotion-list">{busy ? <div className="promotion-empty">Đang tải đề xuất...</div> : visible.length === 0 ? <div className="promotion-empty"><span>↗</span><b>Chưa có đề xuất thăng chức</b><small>Các đề xuất mới sẽ xuất hiện tại đây.</small></div> : visible.map((row) => <article className="promotion-card" key={row.id}><div className="promotion-avatar">{row.employeeName?.split(" ").slice(-1)[0]?.[0] || "N"}</div><div className="promotion-main"><div className="promotion-title"><div><h3>{row.employeeName}</h3><span>{row.currentEmployeeCode} · {row.departmentName || "Chưa có phòng ban"}</span></div><span className={`promotion-badge badge-${row.status}`}>{statusText(row.status)}</span></div><div className="promotion-move"><span>{row.currentPositionName || "Chưa có chức vụ"}</span><b>→</b><strong>{row.newPositionName}</strong><small>Vai trò sau duyệt: {row.targetRoleName}</small></div><p className="promotion-reason">{row.reason}</p><div className="promotion-meta"><span>{row.proposalType === 1 ? "Tự đề xuất" : "Được đề cử"} bởi {row.proposedByName}</span><span>Hiệu lực dự kiến {new Date(row.effectiveDate).toLocaleDateString(dateLocale)}</span>{row.newEmployeeCode && <span>Mã mới <b>{row.newEmployeeCode}</b></span>}{row.decisionNote && <span>Ghi chú: {row.decisionNote}</span>}</div></div>{!selfMode && <div className="promotion-actions"><button onClick={() => setDetail(row)}>Thông tin</button>{Number(row.status) === 0 && canReviewRow(row) && <><button onClick={() => setReview({ ...row, approve: true, comment: "" })}>Duyệt</button><button className="promotion-link" onClick={() => setReview({ ...row, approve: false, comment: "" })}>Từ chối</button></>}</div>}</article>)}</div>
        {formOpen && <div className="promotion-overlay" onMouseDown={(e) => e.target === e.currentTarget && !saving && setFormOpen(false)}><form className="promotion-dialog" onSubmit={submit}><button type="button" className="promotion-close" onClick={() => !saving && setFormOpen(false)}>×</button><span className="promotion-eyebrow">ĐỀ XUẤT NHÂN SỰ</span><h2>{selfMode ? "Nguyện vọng thăng chức" : "Đề cử thăng chức"}</h2><p>Thông tin sẽ được gửi đến cấp có thẩm quyền để xét duyệt.</p>
            {!selfMode && <label>Nhân viên <select required value={payload.employeeId} onChange={(e) => setPayload({ ...payload, employeeId: e.target.value })}><option value="">Chọn nhân viên</option>{options.employees.map((e) => <option value={e.id} key={e.id}>{e.name} · {e.employeeCode} · {e.department}</option>)}</select></label>}
            {selfMode && <div className="promotion-info"><b>{options.currentEmployee?.name || auth?.userName || "Hồ sơ của tôi"}</b>{options.currentEmployee?.employeeCode && <span> · {options.currentEmployee.employeeCode}</span>}<br />{options.currentEmployee?.position || "Chưa có chức vụ"}{options.currentEmployee?.department ? ` · ${options.currentEmployee.department}` : ""}<br />Đề xuất sẽ được gửi đến quản lý trực tiếp.</div>}
            <div className="promotion-form-grid"><label>Chức vụ đề xuất<select required value={payload.newPositionId} onChange={(e) => setPayload({ ...payload, newPositionId: e.target.value })}><option value="">Chọn chức vụ</option>{options.positions.map((p) => <option value={p.id} key={p.id}>{p.name} · {p.code}</option>)}</select></label><label>Vai trò sau khi duyệt<select value={payload.targetRoleName} onChange={(e) => setPayload({ ...payload, targetRoleName: e.target.value })}>{options.roles.map((role) => <option value={role} key={role}>{({ Employee: "Nhân viên", Manager: "Quản lý", HR: "Nhân sự" })[role] || role}</option>)}</select></label><label>Ngày hiệu lực<input type="date" min={localDate()} required value={payload.effectiveDate} onChange={(e) => setPayload({ ...payload, effectiveDate: e.target.value })} /></label><label className="promotion-full">Lý do đề xuất<textarea required minLength={5} maxLength={2000} rows={3} value={payload.reason} onChange={(e) => setPayload({ ...payload, reason: e.target.value })} placeholder="Nêu thành tích, năng lực hoặc cơ sở đề xuất..." /></label><label className="promotion-full">Ghi chú thêm<textarea maxLength={2000} rows={2} value={payload.additionalNote} onChange={(e) => setPayload({ ...payload, additionalNote: e.target.value })} placeholder="Mục tiêu, phạm vi trách nhiệm mới..." /></label></div>
            {!selfMode && selectedEmployee?.userId == null && payload.targetRoleName !== "Employee" && <div className="promotion-alert error">Nhân viên chưa có tài khoản; chỉ có thể cấp vai trò quản lý sau khi liên kết tài khoản.</div>}
            <div className="promotion-info">Khi duyệt, mã nhân viên mới được tạo theo mã chức vụ. Vai trò tài khoản sẽ đồng bộ tự động. Quyền quản trị hệ thống không thể cấp từ biểu mẫu này.</div>{formError && <div className="promotion-alert error" role="alert">{String(formError)}</div>}{options.positions.length === 0 && <div className="promotion-alert error">Chưa có chức vụ đang hoạt động để chọn. Vui lòng liên hệ bộ phận nhân sự.</div>}<footer><button type="button" className="promotion-secondary" disabled={saving} onClick={() => setFormOpen(false)}>Hủy</button><button className="promotion-primary" type="submit" disabled={saving || options.positions.length === 0}>{saving ? "Đang gửi..." : "Gửi đề xuất"}</button></footer></form></div>}
        {detail && <div className="promotion-overlay" onMouseDown={(e) => e.target === e.currentTarget && setDetail(null)}><section className="promotion-dialog promotion-detail"><button className="promotion-close" onClick={() => setDetail(null)}>×</button><span className="promotion-eyebrow">HỒ SƠ XÉT DUYỆT</span><h2>{detail.employeeName}</h2><p>{detail.currentEmployeeCode} · {detail.departmentName || "Chưa có phòng ban"} · {detail.currentPosition || detail.currentPositionName || "Chưa có chức vụ"}</p><div className="promotion-detail-grid"><div><span>Mã nhân viên</span><b>{detail.currentEmployeeCode}</b></div><div><span>Phòng ban</span><b>{detail.departmentName || "Chưa có phòng ban"}</b></div><div><span>Chức vụ hiện tại</span><b>{detail.currentPosition || detail.currentPositionName || "Chưa có chức vụ"}</b></div><div><span>Quản lý trực tiếp</span><b>{detail.managerName || "Chưa cập nhật"}</b></div><div><span>Email</span><b>{detail.email || "Chưa cập nhật"}</b></div><div><span>Số điện thoại</span><b>{detail.phoneNumber || "Chưa cập nhật"}</b></div><div><span>Ngày vào làm</span><b>{detail.startDate ? new Date(detail.startDate).toLocaleDateString(dateLocale) : "Chưa cập nhật"}</b></div><div><span>Người đề xuất</span><b>{detail.proposedByName} · {detail.proposalType === 1 ? "Tự đề xuất" : "Được đề cử"}</b></div></div><div className="promotion-info"><b>Đề xuất:</b> {detail.currentPositionName || detail.currentPosition || "Chưa có chức vụ"} → {detail.newPositionName}<br /><b>Vai trò dự kiến:</b> {detail.targetRoleName} · <b>Ngày hiệu lực:</b> {new Date(detail.effectiveDate).toLocaleDateString(dateLocale)}<br /><b>Lý do:</b> {detail.reason}{detail.additionalNote && <><br /><b>Ghi chú:</b> {detail.additionalNote}</>}</div><footer><button className="promotion-secondary" onClick={() => setDetail(null)}>Đóng</button>{Number(detail.status) === 0 && canReviewRow(detail) && <><button className="promotion-secondary" onClick={() => { setDetail(null); setReview({ ...detail, approve: false, comment: "" }); }}>Từ chối</button><button className="promotion-primary" onClick={() => { setDetail(null); setReview({ ...detail, approve: true, comment: "" }); }}>Xét duyệt</button></>}</footer></section></div>}
        {review && <div className="promotion-overlay" onMouseDown={(e) => e.target === e.currentTarget && !reviewSaving && setReview(null)}><div className="promotion-dialog promotion-review"><button className="promotion-close" disabled={reviewSaving} onClick={() => setReview(null)}>×</button><span className="promotion-eyebrow">XÉT DUYỆT</span><h2>{review.approve ? "Xác nhận thăng chức" : "Từ chối đề xuất"}</h2><p>{review.employeeName} · {review.currentEmployeeCode} · {review.departmentName}</p><div className="promotion-detail-grid"><div><span>Chức vụ hiện tại</span><b>{review.currentPosition || review.currentPositionName || "Chưa cập nhật"}</b></div><div><span>Chức vụ đề xuất</span><b>{review.newPositionName}</b></div><div><span>Người đề xuất</span><b>{review.proposedByName}</b></div><div><span>Vai trò dự kiến</span><b>{review.targetRoleName}</b></div></div><div className="promotion-info">{review.approve ? `Mã nhân viên sẽ được đổi tự động theo mã chức vụ ${review.newPositionCode}. Vai trò ${review.targetRoleName} sẽ được gán khi xác nhận.` : `Lý do đề xuất: ${review.reason}`}</div><label>Ghi chú{!review.approve && " (bắt buộc)"}<textarea rows={3} value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} placeholder="Nhập ghi chú xét duyệt..." /></label>{reviewError && <div className="promotion-alert error" role="alert">{String(reviewError)}</div>}<footer><button className="promotion-secondary" disabled={reviewSaving} onClick={() => setReview(null)}>Hủy</button><button className="promotion-primary" disabled={reviewSaving || (!review.approve && !review.comment.trim())} onClick={() => decide(review.approve)}>{reviewSaving ? "Đang xử lý..." : review.approve ? "✓ Duyệt và cập nhật" : "Từ chối đề xuất"}</button></footer></div></div>}
    </section>;

    return selfMode ? <AppLayout>{Content}</AppLayout> : <HrAppLayout>{Content}</HrAppLayout>;
}
