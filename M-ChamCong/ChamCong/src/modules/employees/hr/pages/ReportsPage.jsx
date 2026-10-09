import { useCallback, useEffect, useMemo, useState } from "react";
import HrAppLayout from "../layout/HrAppLayout";
import AdminAppLayout from "../../../admin/layout/AdminAppLayout";
import employeeApi from "../../api/employeeApi";
import { getAuth } from "../../../../services/auth/auth";
import { localeForLanguage, translate, useLanguage } from "../../../../services/i18n/LanguageProvider";
import "../reports.css";
import HrHero from "../HrHero";

const S = { pending: 0, approved: 1, rejected: 2, revise: 3, sent: 4, upperApproved: 5, upperRequest: 6, complete: 7 };
const SCROLL_TO_OUTBOUND_KEY = "hr-file-reports-scroll-outbound";
const ACTION_SUCCESS_KEY = "hr-file-reports-action-success";
const STATUS = {
    0: ["Chờ tôi duyệt", "pending"], 1: ["Chờ gửi cấp trên", "approved"],
    2: ["Từ chối", "rejected"], 3: ["Chờ nhân viên bổ sung", "rejected"],
    4: ["Cấp trên đang duyệt", "sent"], 5: ["Cấp trên đã duyệt", "approved"],
    6: ["Cần xử lý", "rejected"], 7: ["Hoàn tất", "approved"],
};
let activeLocale = "vi-VN";
const date = (value) => value ? new Date(value).toLocaleDateString(activeLocale) : "—";
const time = (value) => value ? new Date(value).toLocaleString(activeLocale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const size = (bytes = 0) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const positionLevel = (position = "") => {
    const title = position.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (/chu tich|chairman|owner|tong giam doc|ceo|general director/.test(title)) return 100;
    if (/pho giam doc|deputy director|vice president/.test(title)) return 80;
    if (/giam doc|director/.test(title)) return 90;
    if (/pho truong|deputy head/.test(title)) return 65;
    if (/truong phong|truong bo phan|head of/.test(title)) return 70;
    if (/quan ly|manager|supervisor/.test(title)) return 60;
    if (/truong nhom|team lead|leader/.test(title)) return 50;
    if (/admin|quan tri/.test(title)) return 65;
    return 0;
};
const getUpperRecipients = (employees, report, currentEmployeeId) => {
    const sameId = (left, right) => String(left || "").toLowerCase() === String(right || "").toLowerCase();
    const excluded = (employee) => !sameId(employee.id, report.employeeId) && !sameId(employee.id, currentEmployeeId);
    const chainFrom = (employee) => {
        const chain = [];
        const visited = new Set([String(employee?.id || "").toLowerCase()]);
        let managerId = employee?.managerId;
        while (managerId && !visited.has(String(managerId).toLowerCase())) {
            visited.add(String(managerId).toLowerCase());
            const manager = employees.find((item) => sameId(item.id, managerId));
            if (!manager) break;
            chain.push(manager);
            managerId = manager.managerId;
        }
        return chain;
    };
    const current = employees.find((employee) => sameId(employee.id, currentEmployeeId));
    if (current) {
        const ancestors = chainFrom(current).filter(excluded);
        if (ancestors.length) return ancestors;
        const senderChain = chainFrom(employees.find((employee) => sameId(employee.id, report.employeeId)));
        const currentIndex = senderChain.findIndex((employee) => sameId(employee.id, current.id));
        if (currentIndex >= 0 && senderChain.slice(currentIndex + 1).some(excluded)) return senderChain.slice(currentIndex + 1).filter(excluded);
        const currentLevel = positionLevel(current.positionName);
        const higher = employees.filter((employee) => excluded(employee) && positionLevel(employee.positionName) > currentLevel);
        if (higher.length) return higher;
    }
    const executives = employees.filter((employee) => excluded(employee) && /chủ tịch|tổng giám đốc|giám đốc điều hành|giám đốc|chairman|ceo|director/i.test(employee.positionName || ""));
    if (executives.length) return executives;
    const reportChain = chainFrom(employees.find((employee) => sameId(employee.id, report.employeeId)));
    const currentIndex = reportChain.findIndex((employee) => sameId(employee.id, currentEmployeeId));
    return (currentIndex >= 0 ? reportChain.slice(currentIndex + 1) : reportChain.slice(1)).filter(excluded);
};

export default function ReportsPage({ admin = false } = {}) {
    const auth = getAuth();
    const { language } = useLanguage();
    const locale = localeForLanguage(language);
    const L = (text) => translate(text, language);
    activeLocale = localeForLanguage(language);
    const [reports, setReports] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(() => {
        const message = sessionStorage.getItem(ACTION_SUCCESS_KEY);
        sessionStorage.removeItem(ACTION_SUCCESS_KEY);
        return message;
    });
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({ period: "", departmentId: "", reportType: "", status: "", overdue: "" });
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState(null);
    const [dialog, setDialog] = useState("");
    const [comment, setComment] = useState("");
    const [recipient, setRecipient] = useState("Ban Giám đốc");
    const [dialogDeadline, setDialogDeadline] = useState("");
    const [busy, setBusy] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const load = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const params = Object.fromEntries(Object.entries({ ...filters, search }).filter(([, value]) => value !== ""));
            const [reportResponse, departmentResponse, employeeResponse] = await Promise.all([employeeApi.employeeReports(params), employeeApi.departments(), employeeApi.employees()]);
            setReports(reportResponse.data.data || []);
            setDepartments(departmentResponse.data.data?.items || []);
            setEmployees(employeeResponse.data.data?.items || []);
        } catch (err) { setError(err.response?.data?.message || err.message || L("Không tải được báo cáo file.")); }
        finally { setLoading(false); }
    }, [filters, search]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!loading && sessionStorage.getItem(SCROLL_TO_OUTBOUND_KEY) === "1") {
            sessionStorage.removeItem(SCROLL_TO_OUTBOUND_KEY);
            requestAnimationFrame(() => document.getElementById("hr-file-outbound-section")?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }
    }, [loading]);

    const counts = useMemo(() => ({
        total: reports.length,
        pending: reports.filter((r) => r.status === S.pending).length,
        toUpper: reports.filter((r) => r.status === S.approved).length,
        upperRequest: reports.filter((r) => r.status === S.upperRequest).length,
        complete: reports.filter((r) => r.status === S.complete).length,
        needsWork: reports.filter((r) => [S.rejected, S.revise, S.upperRequest].includes(r.status)).length,
        overdue: reports.filter((r) => r.deadline && new Date(r.deadline) < new Date() && ![S.rejected, S.upperApproved, S.complete].includes(r.status)).length,
    }), [reports]);
    const isUpperRecipient = (report) => String(report.upperRecipientEmployeeId || "").toLowerCase() === String(auth?.employeeId || "").toLowerCase();
    const pages = Math.max(1, Math.ceil(reports.length / 20));
    const visible = reports.slice((page - 1) * 20, page * 20);
    const inbound = reports.filter((r) => [S.pending, S.revise].includes(r.status));
    const outbound = reports.filter((r) => [S.approved, S.sent, S.upperApproved, S.complete].includes(r.status));
    const upperRequests = reports.filter((r) => r.status === S.upperRequest);
    const monthOptions = [...new Set(reports.map((r) => String(r.period).slice(0, 7)).filter((month) => month.length === 7))].sort().reverse();
    const activities = reports.flatMap((r) => (r.events || []).map((event) => ({ ...event, reportCode: r.reportCode })))
        .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)).slice(0, 5);

    const open = async (report) => {
        setSelected(report); setDialog(""); setComment("");
        try { await employeeApi.reportViewed(report.id); } catch { /* viewed history is best-effort */ }
        setSelected((current) => current?.id === report.id ? { ...current, events: [...(current.events || []), { actionName: "Quản lý mở báo cáo", actorName: auth?.userName || "Quản lý", occurredAt: new Date().toISOString() }] } : current);
    };
    const submitAction = async (event) => {
        event?.preventDefault();
        const reloadAfterAction = ["forward", "revision", "reject"].includes(dialog);
        setBusy(true); setError("");
        try {
            if (dialog === "forward") {
                const recipientEmployee = employees.find((employee) => employee.id === recipient);
                const recipientLabel = recipientEmployee ? `${recipientEmployee.fullName} · ${recipientEmployee.employeeCode} · ${recipientEmployee.departmentName || "Chưa có bộ phận"}` : "";
                await employeeApi.forwardEmployeeReport(selected.id, { recipient: recipientLabel, recipientEmployeeId: recipient, note: comment });
            } else if (dialog === "revision") {
                await employeeApi.reviewEmployeeReport(selected.id, { status: S.revise, comment });
            } else if (dialog === "reject") {
                await employeeApi.reviewEmployeeReport(selected.id, { status: S.rejected, comment });
            } else if (dialog === "upper-request") {
                await employeeApi.upperDecision(selected.id, { status: S.upperRequest, request: comment, deadline: dialogDeadline || null });
                setSelected({ ...selected, status: S.upperRequest, upperRequest: comment, upperRequestDeadline: dialogDeadline || null });
            } else if (dialog === "upper-approved") {
                await employeeApi.upperDecision(selected.id, { status: S.upperApproved, request: comment });
                setSelected({ ...selected, status: S.upperApproved });
            } else if (dialog === "reply") {
                await employeeApi.respondToUpperRequest(selected.id, { comment, transferToEmployee: false });
                setSelected({ ...selected, events: [...(selected.events || []), { actionName: "Phản hồi cấp trên", comment, actorName: auth?.userName || "Quản lý", occurredAt: new Date().toISOString() }] });
            } else if (dialog === "transfer") {
                await employeeApi.respondToUpperRequest(selected.id, { comment, transferToEmployee: true });
                setSelected({ ...selected, status: S.revise, managerComment: comment });
            }
            if (reloadAfterAction) {
                const messages = { forward: "Đã duyệt và gửi báo cáo lên cấp trên.", revision: "Đã gửi yêu cầu chỉnh sửa cho nhân viên.", reject: "Đã từ chối báo cáo." };
                sessionStorage.setItem(ACTION_SUCCESS_KEY, messages[dialog]);
                if (dialog === "forward") sessionStorage.setItem(SCROLL_TO_OUTBOUND_KEY, "1");
                window.location.reload();
                return;
            }
            await load();
            setDialog("");
        } catch (err) { setError(err.response?.data?.message || "Không cập nhật được luồng xử lý."); }
        finally { setBusy(false); }
    };
    const complete = async (report = selected) => {
        setBusy(true); setError("");
        try { await employeeApi.completeEmployeeReport(report.id); setSelected({ ...report, status: S.complete, sentToUpper: true }); await load(); }
        catch (err) { setError(err.response?.data?.message || "Không thể hoàn tất báo cáo."); }
        finally { setBusy(false); }
    };
    const download = async (apiCall, filename, preview = false) => {
        try { const response = await apiCall; const url = URL.createObjectURL(response.data); if (preview) window.open(url, "_blank", "noopener"); else { const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); } setTimeout(() => URL.revokeObjectURL(url), 30000); }
        catch { setError("Không tải được file."); }
    };
    const startDialog = (type, report = selected) => { setSelected(report); setDialog(type); setComment(""); setRecipient(type === "forward" ? getUpperRecipients(employees, report, auth?.employeeId)[0]?.id || "" : ""); setDialogDeadline(""); };
    const filter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
    const monthLabel = filters.period ? new Date(`${filters.period}-01`).toLocaleDateString(locale, { month: "long", year: "numeric" }) : L("Tất cả tháng");

    const PageLayout = admin ? AdminAppLayout : HrAppLayout;

    return <PageLayout title={L("Quản lý báo cáo")} subtitle={`${L("Báo cáo file nhân viên gửi")} · ${L(monthLabel)}`}>
        <div className="att-content hr-file-reports">
            {error && <div className="hr-report-error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
            {success && <div className="hr-report-success" role="status">{success}<button onClick={() => setSuccess("")}>×</button></div>}
            <label className="admin-search hr-file-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Tìm mã báo cáo / tên báo cáo / người gửi..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></label>
            <div className="hr-file-filters">
                <label>{L("Tháng")}<select className="hr-select" value={filters.period} onChange={(e) => filter("period", e.target.value)}><option value="">{L("Tất cả tháng")}</option>{monthOptions.map((month) => <option key={month} value={month}>{new Date(`${month}-01`).toLocaleDateString(locale, { month: "2-digit", year: "numeric" })}</option>)}</select></label>
                <label>{L("Phòng ban")}<select className="hr-select" value={filters.departmentId} onChange={(e) => filter("departmentId", e.target.value)}><option value="">{L("Tất cả phòng ban")}</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
                <label>{L("Loại báo cáo")}<select className="hr-select" value={filters.reportType} onChange={(e) => filter("reportType", e.target.value)}><option value="">{L("Tất cả loại báo cáo")}</option>{[...new Set(reports.map((r) => r.reportType).filter(Boolean))].map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>{L("Trạng thái")}<select className="hr-select" value={filters.status} onChange={(e) => filter("status", e.target.value)}><option value="">{L("Tất cả trạng thái")}</option>{Object.entries(STATUS).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>{L("Deadline")}<select className="hr-select" value={filters.overdue} onChange={(e) => filter("overdue", e.target.value)}><option value="">{L("Mọi hạn nộp")}</option><option value="true">{L("Quá hạn")}</option><option value="false">{L("Chưa quá hạn")}</option></select></label>
                <button className="hr-file-filter-button" onClick={load}>⌕</button>
            </div>
            {loading ? <div className="att-loading">{L("Đang tải báo cáo file…")}</div> : <>
                <HrHero ico="📑" title="Quản lý báo cáo" sub="Báo cáo file nhân viên gửi, theo dõi luồng duyệt và phản hồi cấp trên." kpis={[{ ico: "▣", label: "Tổng báo cáo", value: counts.total, tone: "blue" }, { ico: "⇣", label: "Chờ tôi duyệt", value: counts.pending, tone: "warn" }, { ico: "⇡", label: "Chờ gửi cấp trên", value: counts.toUpper, tone: "green" }, { ico: "⚑", label: "Cấp trên yêu cầu", value: counts.upperRequest, tone: "red" }, { ico: "✓", label: "Hoàn tất", value: counts.complete, tone: "ok" }, { ico: "⚠", label: "Quá hạn", value: counts.overdue, tone: "red" }]}/>
                <ReportSection title={L("📥 1. Báo cáo cấp dưới gửi đến tôi")}>
                    <ReportTable reports={inbound} columns="inbound" open={open} onAction={startDialog} />
                </ReportSection>
                <ReportSection id="hr-file-outbound-section" title={L("📤 2. Báo cáo gửi cấp trên")}>
                    <ReportTable reports={outbound} columns="outbound" open={open} onAction={startDialog} complete={complete} isUpperRecipient={isUpperRecipient} />
                </ReportSection>
                <ReportSection title={L("📌 3. Yêu cầu / phản hồi từ cấp trên")}>
                    <ReportTable reports={upperRequests} columns="requests" open={open} onAction={startDialog} complete={complete} />
                </ReportSection>
                <ReportSection title={L("📋 4. Tất cả báo cáo")}>
                    <ReportTable reports={visible} columns="all" open={open} onAction={startDialog} />
                    <footer className="hr-file-pagination"><span>{L("Hiển thị")} {reports.length ? (page - 1) * 20 + 1 : 0}–{Math.min(page * 20, reports.length)} {L("trong")} {reports.length} {L("báo cáo")}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>›</button></div></footer>
                </ReportSection>
                <ReportSection title={L("🕐 Hoạt động gần đây")}><ul className="hr-file-activity">{activities.map((item, i) => <li key={`${item.occurredAt}-${i}`}><time>{new Date(item.occurredAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time><span>{item.actorName} · {L(item.actionName)} · {item.reportCode}</span></li>)}{activities.length === 0 && <li>{L("Chưa có hoạt động.")}</li>}</ul></ReportSection>
            </>}
            {selected && <ReportModal report={selected} close={() => { setSelected(null); setDialog(""); }} openDialog={startDialog} complete={complete} download={download} isUpperRecipient={isUpperRecipient(selected)} />}
            {selected && dialog && <ActionDialog type={dialog} report={selected} comment={comment} setComment={setComment} recipient={recipient} setRecipient={setRecipient} employees={employees} currentEmployeeId={auth?.employeeId} deadline={dialogDeadline} setDeadline={setDialogDeadline} close={() => setDialog("")} submit={submitAction} busy={busy} error={error} />}
        </div>
    </PageLayout>;
}

function Kpi({ icon, label, value, tone = "" }) { return <article className={`hr-file-kpi ${tone}`}><span>{icon}</span><small>{label}</small><strong>{value}</strong></article>; }
function ReportSection({ id, title, children }) { return <section id={id} className="hr-file-section"><header><h2>{title}</h2></header>{children}</section>; }
function ReportTable({ reports, columns, open, onAction, complete, isUpperRecipient = () => false }) {
    const { language } = useLanguage();
    const L = (text) => translate(text, language);
    activeLocale = localeForLanguage(language);
    const empty = reports.length === 0;
    return <div className="att-card hr-file-table-wrap"><table className="hr-file-table"><thead><tr><th>{L("Mã BC")}</th><th>{L("Tên báo cáo")}</th><th>{columns === "outbound" ? L("Bộ phận") : L("Phòng ban")}</th>{columns !== "outbound" && columns !== "requests" && <th>{L("Người gửi")}</th>}{columns === "outbound" && <><th>{L("Người nhận")}</th><th>{L("Ngày gửi")}</th></>}{columns === "requests" && <><th>{L("Nội dung yêu cầu")}</th><th>{L("Người gửi")}</th><th>{L("Hạn xử lý")}</th></>}{columns === "all" && <th>{L("Cấp hiện tại")}</th>}{columns !== "requests" && columns !== "outbound" && <th>{L("Deadline")}</th>}<th>{L("Trạng thái")}</th><th>{L("Thao tác")}</th></tr></thead><tbody>
        {reports.map((r) => <tr key={r.id}>
            <td>{r.reportCode}</td><td><strong>{r.title}</strong><small>{r.reportType}</small></td><td>{r.departmentName || "—"}</td>
            {columns !== "outbound" && columns !== "requests" && <td>{r.employeeName}<small>{r.employeeCode}</small></td>}
            {columns === "outbound" && <><td>{r.upperRecipient || "—"}</td><td>{date(r.sentToUpperAt)}</td></>}
            {columns === "requests" && <><td>{r.upperRequest || "—"}</td><td>{r.upperRecipient || "Cấp trên"}</td><td>{date(r.upperRequestDeadline)}</td></>}
            {columns === "all" && <td>{r.status >= S.sent ? L("Cấp trên") : L("Quản lý")}</td>}
            {columns !== "requests" && columns !== "outbound" && <td>{date(r.deadline)}</td>}
            <td><span className={`hr-file-status ${STATUS[r.status]?.[1]}`}>{L(STATUS[r.status]?.[0]) || "—"}</span></td>
            <td><div className="hr-file-row-actions"><button onClick={() => open(r)}>{L("Xem")}</button>
                {columns === "inbound" && r.status === S.pending && <><button onClick={() => onAction("forward", r)}>{L("Duyệt & gửi")}</button><button onClick={() => onAction("revision", r)}>{L("Yêu cầu sửa")}</button><button onClick={() => onAction("reject", r)}>{L("Từ chối")}</button></>}
                {columns === "outbound" && r.status === S.approved && <button onClick={() => onAction("forward", r)}>{L("Gửi cấp trên")}</button>}
                {columns === "outbound" && r.status === S.sent && isUpperRecipient(r) && <><button onClick={() => onAction("upper-approved", r)}>{L("Cấp trên duyệt")}</button><button onClick={() => onAction("upper-request", r)}>{L("Ghi nhận yêu cầu")}</button></>}
                {columns === "requests" && <><button onClick={() => onAction("reply", r)}>{L("Phản hồi")}</button><button onClick={() => onAction("transfer", r)}>{L("Chuyển cấp dưới")}</button><button onClick={() => complete(r)}>{L("Hoàn tất")}</button></>}
            </div></td>
        </tr>)}
        {empty && <tr><td colSpan="9" className="hr-file-empty">{L("Không có báo cáo phù hợp.")}</td></tr>}
    </tbody></table></div>;
}

function ReportModal({ report, close, openDialog, complete, download, isUpperRecipient }) {
    const { language } = useLanguage();
    const L = (text) => translate(text, language);
    activeLocale = localeForLanguage(language);
    const steps = [L("Nhân viên gửi"), L("Quản lý duyệt"), L("Cấp trên"), L("Hoàn tất")];
    const active = report.status === S.complete ? 3 : report.status >= S.sent ? 2 : report.status >= S.approved ? 1 : 0;
    const files = (report.versions || []).flatMap((version) => [{ id: version.id, name: version.fileName, size: version.fileSize, version: version.version, uploadedAt: version.uploadedAt, attachment: false }, ...(version.attachments || []).map((a) => ({ id: a.id, name: a.fileName, size: a.fileSize, version: version.version, attachment: true }))]);
    return <div className="hr-file-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}><section className="hr-file-modal" role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
        <header><h2 id="report-detail-title">{L("Chi tiết báo cáo")}</h2><button onClick={close}>×</button></header>
        <span className="hr-file-report-code">{report.reportCode}</span><h3>{report.title}</h3><span className={`hr-file-status ${STATUS[report.status]?.[1]}`}>{L(STATUS[report.status]?.[0])}</span>
        <div className="hr-file-detail-grid"><span>{L("Người gửi")}<strong>{report.employeeName}</strong></span><span>{L("Bộ phận")}<strong>{report.departmentName || "—"}</strong></span><span>{L("Ngày gửi")}<strong>{date(report.submittedAt)}</strong></span><span>{L("Deadline")}<strong>{date(report.deadline)}</strong></span></div>
        <section className="hr-file-modal-section"><h4>{L("Nội dung báo cáo")}</h4>{[[L("1. Tổng quan"), report.overview], [L("2. Kết quả thực hiện"), report.results], [L("3. Khó khăn / vấn đề"), report.issues], [L("4. Kiến nghị / đề xuất"), report.recommendations]].map(([label, value]) => <div className="hr-file-content-block" key={label}><strong>{label}</strong><p>{value || L("Chưa có nội dung.")}</p></div>)}</section>
        <section className="hr-file-modal-section"><h4>{L("File đính kèm")}</h4>{files.map((file) => <div className="hr-file-version" key={file.id}><span>📄 {file.name}<small>{file.version ? `${L("Phiên bản")} ${file.version} · ` : ""}{size(file.size)}{file.uploadedAt ? ` · ${date(file.uploadedAt)}` : ""}</small></span><div className="hr-file-actions-inline"><button onClick={() => download(file.attachment ? employeeApi.downloadReportAttachment(file.id) : employeeApi.downloadEmployeeReport(file.id), file.name, true)}>{L("Xem")}</button><button onClick={() => download(file.attachment ? employeeApi.downloadReportAttachment(file.id) : employeeApi.downloadEmployeeReport(file.id), file.name)}>{L("Tải xuống")}</button></div></div>)}{files.length === 0 && <p>{L("Không có file đính kèm.")}</p>}</section>
        <section className="hr-file-modal-section"><h4>{L("Luồng xử lý")}</h4><div className="hr-file-flow">{steps.map((step, i) => <span key={step} className={i < active ? "done" : i === active ? "active" : ""}>{i < active ? "✓" : i === active ? "●" : "○"}<small>{step}</small></span>)}</div></section>
        <section className="hr-file-modal-section"><h4>{L("Lịch sử")}</h4><div className="hr-file-timeline">{(report.events || []).map((event, i) => <p key={`${event.actionName}-${event.occurredAt}-${i}`}>● {event.actorName} · {L(event.actionName)} — {time(event.occurredAt)}{event.comment ? ` · ${event.comment}` : ""}</p>)}{report.events?.length === 0 && <p>{L("Chưa có lịch sử xử lý.")}</p>}</div></section>
        {report.upperRequest && <section className="hr-file-rejection"><strong>{L("Yêu cầu từ cấp trên")} · {L("Hạn xử lý")} {date(report.upperRequestDeadline)}</strong><p>{report.upperRequest}</p></section>}
        {report.status === S.pending && <section className="hr-file-modal-section"><h4>{L("Nhận xét")}</h4><p>{L("Duyệt và chuyển báo cáo lên cấp trên, yêu cầu chỉnh sửa hoặc từ chối.")}</p><div className="hr-file-actions"><button onClick={() => openDialog("reject", report)}>{L("Từ chối")}</button><button onClick={() => openDialog("revision", report)}>{L("Yêu cầu sửa")}</button><button className="primary" onClick={() => openDialog("forward", report)}>{L("Duyệt & gửi cấp trên")}</button></div></section>}
        {report.status === S.approved && <section className="hr-file-modal-section"><div className="hr-file-actions"><button className="primary" onClick={() => openDialog("forward", report)}>{L("Gửi cấp trên")}</button></div></section>}
        {report.status === S.sent && isUpperRecipient && <section className="hr-file-modal-section"><h4>{L("Phản hồi cấp trên")}</h4><div className="hr-file-actions"><button onClick={() => openDialog("upper-request", report)}>{L("Yêu cầu bổ sung")}</button><button className="primary" onClick={() => openDialog("upper-approved", report)}>{L("Cấp trên đã duyệt")}</button></div></section>}
        {report.status === S.upperRequest && <section className="hr-file-modal-section"><div className="hr-file-actions"><button onClick={() => openDialog("reply", report)}>{L("Phản hồi")}</button><button onClick={() => openDialog("transfer", report)}>{L("Chuyển cấp dưới xử lý")}</button><button className="primary" onClick={() => complete(report)}>{L("Hoàn tất")}</button></div></section>}
        {report.status === S.upperApproved && <section className="hr-file-modal-section"><div className="hr-file-actions"><button className="primary" onClick={() => complete(report)}>{L("Đánh dấu hoàn tất")}</button></div></section>}
    </section></div>;
}

function ActionDialog({ type, report, comment, setComment, recipient, setRecipient, employees, currentEmployeeId, deadline, setDeadline, close, submit, busy, error }) {
    const { language } = useLanguage();
    const L = (text) => translate(text, language);
    activeLocale = localeForLanguage(language);
    const configs = {
        forward: [L("Duyệt và gửi cấp trên"), L("Người nhận tiếp theo"), L("Ghi chú gửi cấp trên")],
        revision: [L("Yêu cầu nhân viên chỉnh sửa"), L("Nhận xét / nội dung cần bổ sung"), ""],
        reject: [L("Từ chối báo cáo"), L("Lý do từ chối"), ""],
        "upper-request": [L("Yêu cầu từ cấp trên"), L("Nội dung yêu cầu bổ sung"), ""],
        "upper-approved": [L("Cấp trên đã duyệt"), L("Ghi chú"), ""],
        reply: [L("Phản hồi cấp trên"), L("Nội dung phản hồi"), ""],
        transfer: [L("Chuyển yêu cầu cho cấp dưới"), L("Nội dung cần nhân viên xử lý"), ""],
    };
    const [title, fieldLabel, placeholder] = configs[type];
    const recipients = getUpperRecipients(employees, report, currentEmployeeId);
    const selectedRecipient = recipients.find((employee) => employee.id === recipient);
    return <div className="hr-file-overlay hr-file-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}><form className={`hr-file-action-dialog ${type === "forward" ? "hr-file-action-dialog--forward" : ""}`} onSubmit={submit}>
        <header><h3>{title}</h3><button type="button" onClick={close}>×</button></header><p>{L("Báo cáo")}: <strong>{report.reportCode}</strong> · {report.title}</p>
        {type === "forward" && <><label>{L("Người nhận tiếp theo")}<select required disabled={!recipients.length} value={recipient} onChange={(e) => setRecipient(e.target.value)}><option value="">{recipients.length ? L("Chọn cấp trên nhận báo cáo") : L("Không tìm thấy cấp trên trong hồ sơ nhân sự")}</option>{recipients.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName} · {employee.employeeCode} · {employee.departmentName || L("Chưa có bộ phận")}</option>)}</select></label>{selectedRecipient && <div className="hr-file-recipient-card"><strong>{selectedRecipient.fullName}</strong><span>{L("Mã NV:")} {selectedRecipient.employeeCode}</span><span>{L("Bộ phận:")} {selectedRecipient.departmentName || L("Chưa có bộ phận")}</span></div>}<section className="hr-file-forward-content"><h4>{L("Nội dung báo cáo")}</h4>{[[L("Tổng quan"), report.overview], [L("Kết quả thực hiện"), report.results], [L("Khó khăn / vấn đề"), report.issues], [L("Kiến nghị / đề xuất"), report.recommendations]].map(([label, value]) => <p key={label}><strong>{label}:</strong> {value || L("Chưa có nội dung.")}</p>)}</section></>}
        {type === "upper-request" && <label>{L("Hạn xử lý")}<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>}
        <label>{fieldLabel}<textarea required={type !== "upper-approved" && type !== "forward"} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={placeholder || L("Ghi chú (không bắt buộc)")} /></label>
        {error && <div className="hr-report-error" role="alert">{error}</div>}
        <footer><button type="button" onClick={close}>{L("Hủy")}</button><button className="primary" disabled={busy || (type === "forward" && (!recipients.length || !selectedRecipient))}>{busy ? L("Đang lưu…") : L("Xác nhận")}</button></footer>
    </form></div>;
}
