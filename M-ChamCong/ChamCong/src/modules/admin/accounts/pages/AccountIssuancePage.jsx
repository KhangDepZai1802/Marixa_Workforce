import { useState, useEffect, useMemo, useCallback } from "react";
import AdminAppLayout from "../../layout/AdminAppLayout";
import HrAppLayout from "../../../employees/hr/layout/HrAppLayout";
import adminApi from "../../api/adminApi";
import "../../../../modules/me/attendance.css";
import "../../admin.css";
import "../account-issuance.css";
import { localeForLanguage, translate, useLanguage } from "../../../../services/i18n/LanguageProvider";

const workingStatus = [1, 2, 3];
const activationCodeValidityMinutes = 1440;
const employeeStatus = { 1: "Đang thử việc", 2: "Đang làm", 3: "Tạm nghỉ" };
const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";
const isCodeActive = (code) => !code.isUsed && new Date(code.expiresAt) > new Date();
const initials = (employee) => `${employee.givenName?.[0] || ""}${employee.familyName?.[0] || ""}`.toLocaleUpperCase("vi");
const maskCitizenId = (value) => value ? `${value.slice(0, 4)} ${"•".repeat(Math.max(4, value.length - 7))} ${value.slice(-3)}` : "Chưa cập nhật";
const gender = (value) => ({ 1: "Nam", 2: "Nữ" })[value] || "Chưa cập nhật";
const AVA_HUES = ["#2f6df6", "#16a085", "#e67e22", "#8e44ad", "#c0392b", "#1565c0", "#00838f", "#d8436b"];
const avaColor = (seed = "") => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return AVA_HUES[Math.abs(h) % AVA_HUES.length];
};
// eslint-disable-next-line no-control-regex
const xmlEscape = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const downloadUnlinkedEmployees = (employees) => {
    const headers = ["Mã nhân viên", "Họ và tên", "Email", "Số điện thoại", "Phòng ban", "Chức vụ", "Người quản lý", "Ngày vào làm", "Trạng thái"];
    const rows = employees.map((e) => [e.employeeCode, e.fullName, e.email, e.phoneNumber, e.departmentName, e.positionName, e.managerName, date(e.startDate), employeeStatus[e.status] || "Khác"]);
    const row = (cells) => `<Row>${cells.map((value) => `<Cell><Data ss:Type="String">${xmlEscape(value)}</Data></Cell>`).join("")}</Row>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Chưa có tài khoản"><Table>${row(headers)}${rows.map(row).join("")}</Table></Worksheet></Workbook>`;
    const blob = new Blob(["\uFEFF", workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nhan-vien-chua-co-tai-khoan-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Bộ lọc nhanh
const FILTERS = {
    all: (s) => true,
    ready: (s) => s.key === "none",
    has: (s) => s.key === "has" || s.key === "activated",
    none: (s) => s.key === "none",
    issue: (s) => s.key === "invalid" || s.key === "dup",
    expired: (s) => s.key === "expired",
};

const AccountIssuancePage = ({ hrMode = false }) => {
    const [employees, setEmployees] = useState([]);
    const [users, setUsers] = useState([]);
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(new Set());
    const [issued, setIssued] = useState("");
    const [filter, setFilter] = useState("all");
    const [verificationEmployee, setVerificationEmployee] = useState(null);
    const [activationCode, setActivationCode] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [, refreshExpiry] = useState(0);

    const { language } = useLanguage();
    const locale = localeForLanguage(language);
    const L = useCallback((text) => translate(text, language), [language]);
    const d = (value) => value ? new Date(value).toLocaleDateString(locale) : "—";

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [e, u, c] = await Promise.all([adminApi.employees(), adminApi.users(), adminApi.activationCodes()]);
            setEmployees(e.data.data?.items || []);
            setUsers(u.data.data?.items || []);
            setCodes(c.data.data?.items || []);
        } catch (err) { setError(err.response?.data?.message || err.message || L("Không tải được danh sách tài khoản.")); }
        finally { setLoading(false); }
    }, [L]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const timer = setInterval(() => refreshExpiry(Date.now()), 30_000);
        return () => clearInterval(timer);
    }, []);

    const userIds = useMemo(() => new Set(users.map((user) => user.employeeId).filter(Boolean)), [users]);
    const isLinked = useCallback((employee) => Boolean(employee.userId || userIds.has(employee.id)), [userIds]);
    const activeCodeFor = useCallback((employeeId) => codes.find((code) => code.employeeId === employeeId && isCodeActive(code)), [codes]);
    const rowState = useCallback((employee) => {
        const hasAccount = isLinked(employee);
        const email = (employee.email || "").trim();
        const invalidEmail = email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const duplicateCode = employees.some((other) => other.employeeCode === employee.employeeCode && other.id !== employee.id);
        const latestCode = codes.filter((code) => code.employeeId === employee.id).sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime))[0];
        if (duplicateCode) return { key: "dup", label: "Trùng mã", cls: "bad" };
        if (invalidEmail) return { key: "invalid", label: "Email không hợp lệ", cls: "bad" };
        if (latestCode && isCodeActive(latestCode)) {
            if (hasAccount && latestCode.createdBy !== "Reissue" && !codes.some((code) => code.employeeId === employee.id && code.isUsed))
                return { key: "has", label: "Đã có tài khoản", cls: "ok" };
            return { key: "none", label: "Chưa có", cls: "warn" };
        }
        if (latestCode?.isUsed) return { key: "activated", label: "Đã kích hoạt", cls: "ok" };
        if (latestCode && hasAccount) return { key: "expired", label: "Mã hết hạn", cls: "warn" };
        if (hasAccount) return { key: "has", label: "Đã có tài khoản", cls: "ok" };
        return { key: "none", label: "Chưa có", cls: "warn" };
    }, [employees, isLinked, codes]);

    const working = employees.filter((employee) => workingStatus.includes(employee.status));
    const filtered = working.filter((employee) =>
        FILTERS[filter](rowState(employee)) &&
        `${employee.employeeCode} ${employee.fullName} ${employee.email || ""}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi"))
    );
    const unlinked = employees.filter((employee) => !isLinked(employee));
    const kpis = useMemo(() => ({
        total: employees.length,
        working: working.length,
        has: working.filter((employee) => isLinked(employee) && rowState(employee).key !== "none").length,
        none: working.filter((employee) => rowState(employee).key === "none" || !isLinked(employee)).length,
        invalid: working.filter((employee) => rowState(employee).key === "invalid").length,
        dup: working.filter((employee) => rowState(employee).key === "dup").length,
        ready: working.filter((employee) => rowState(employee).key === "none").length,
        choosing: selected.size,
    }), [employees.length, working, selected, isLinked, rowState]);

    const toggle = (id) => setSelected((previous) => {
        const next = new Set(previous);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const generateCode = () => `ACT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const issueCodes = async () => {
        const ids = [...selected].filter((id) => {
            const employee = working.find((item) => item.id === id);
            return employee && rowState(employee).key === "none";
        });
        if (!ids.length) { setError(L("Chọn nhân viên hợp lệ chưa có tài khoản.")); return; }
        setBusy(true); setError("");
        let success = 0;
        for (const id of ids) {
            try { await adminApi.createActivationCode({ employeeId: id, code: generateCode(), validMinutes: activationCodeValidityMinutes }); success++; }
            catch { /* report the total below and reload the actual codes */ }
        }
        setIssued(`${L("Đã cấp")} ${success}/${ids.length} ${L("mã kích hoạt (hạn 1 ngày).")}`);
        setSelected(new Set());
        setBusy(false);
        await load();
    };

    const openVerify = (employee) => {
        setActivationCode("");
        setConfirmed(false);
        setError("");
        setVerificationEmployee(employee);
    };

    const verifyAndCreate = async (event) => {
        event.preventDefault();
        if (!confirmed) { setError(L("Vui lòng xác nhận đã kiểm tra thông tin nhân sự.")); return; }
        const code = codes.find((item) => item.employeeId === verificationEmployee.id && item.code === activationCode.trim() && isCodeActive(item));
        if (!code) { setError(L("Mã kích hoạt không đúng, đã dùng hoặc hết hạn.")); return; }
        setBusy(true); setError("");
        try {
            await adminApi.verifyEmployeeActivation({ employeeId: verificationEmployee.id, code: activationCode.trim() });
            setVerificationEmployee(null);
            setIssued(`${L("Đã xác minh thông tin và mã kích hoạt cho")} ${verificationEmployee.fullName} ${L("Nhân viên dùng mã này để đặt hoặc đặt lại mật khẩu.")}`);
            await load();
        } catch (err) { setError(err.response?.data?.message || L("Không xác minh được mã kích hoạt.")); }
        finally { setBusy(false); }
    };
    const PageLayout = hrMode ? HrAppLayout : AdminAppLayout;

    const heroKpis = [
        { label: L("Đang làm việc"), value: kpis.working, tone: "blue", ico: "👥" },
        { label: L("Đã có tài khoản"), value: kpis.has, tone: "green", ico: "✅" },
        { label: L("Chưa có TK"), value: kpis.none, tone: "amber", ico: "🔑" },
        { label: L("Sẵn sàng cấp"), value: kpis.ready, tone: "teal", ico: "⚡" },
    ];

    const filterPills = [
        ["all", L("Tất cả"), kpis.working],
        ["ready", L("Sẵn sàng cấp"), kpis.ready],
        ["has", L("Đã có TK"), kpis.has],
        ["issue", L("Cần xử lý"), kpis.invalid + kpis.dup],
        ["expired", L("Mã hết hạn"), working.filter((e) => rowState(e).key === "expired").length],
    ];

    return <PageLayout title={L("Cấp tài khoản")} subtitle={L("Xác minh hồ sơ và cấp mã kích hoạt cho nhân viên")}>
        <div className="att-content account-issuance">
            {error && <div className="att-error ai-err">{error}<button onClick={() => setError("")}>×</button></div>}
            {issued && <div className="att-notice ai-notice">✓ {issued}</div>}
            {loading && <div className="att-loading">{L("Đang tải...")}</div>}
            {!loading && <>
                {/* ===== Hero ===== */}
                <div className="ai-hero">
                    <div className="ai-hero-head">
                        <span className="ai-hero-ico">🔐</span>
                        <div>
                            <h2>{L("Cấp & quản lý tài khoản")}</h2>
                            <p>{L("Xác minh hồ sơ, cấp mã kích hoạt và theo dõi tình trạng tài khoản nhân viên.")}</p>
                        </div>
                    </div>
                    <div className="ai-hero-kpis">
                        {heroKpis.map((k) => (
                            <div key={k.label} className={`ai-kpi ai-kpi--${k.tone}`}>
                                <span className="ai-kpi-ico">{k.ico}</span>
                                <div><span className="ai-kpi-label">{k.label}</span><strong>{k.value}</strong></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ===== Bảng ===== */}
                <div className="ai-card">
                    <div className="ai-toolbar">
                        <div className="ai-filters">
                            {filterPills.map(([key, label, count]) => (
                                <button key={key} type="button" className={`ai-filter${filter === key ? " active" : ""}`} onClick={() => setFilter(key)}>
                                    <span>{label}</span><i>{count}</i>
                                </button>
                            ))}
                        </div>
                        <div className="ai-actions">
                            <label className="ai-search">
                                <span aria-hidden="true">⌕</span>
                                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={L("Tìm mã, họ tên, email...")} aria-label={L("Tìm nhân viên")} />
                            </label>
                            <button type="button" className="ai-btn" onClick={() => downloadUnlinkedEmployees(unlinked)}>⬇ {L("Xuất Excel")} <i>{unlinked.length}</i></button>
                            <button type="button" className="ai-btn ai-btn--primary" onClick={issueCodes} disabled={busy || !selected.size}>＋ {L("Cấp mã")} <i>{selected.size}</i></button>
                        </div>
                    </div>

                    {/* Batch bar */}
                    {selected.size > 0 && (
                        <div className="ai-batchbar">
                            <span>Đã chọn <strong>{selected.size}</strong> nhân viên sẵn sàng cấp mã (hạn 1 ngày)</span>
                            <div>
                                <button type="button" className="ai-batchbtn" onClick={() => setSelected(new Set())}>{L("Bỏ chọn")}</button>
                                <button type="button" className="ai-batchbtn ai-batchbtn--go" onClick={issueCodes} disabled={busy}>{busy ? L("Đang cấp…") : `＋ ${L("Cấp mã ngay")}`}</button>
                            </div>
                        </div>
                    )}

                    <div className="ai-table-wrap">
                        <table className="ai-table">
                            <thead>
                                <tr>
                                    <th className="ai-th-check"><input type="checkbox" aria-label={L("Chọn tất cả")} checked={filtered.length > 0 && filtered.every((e) => rowState(e).key === "none" && selected.has(e.id))} onChange={(e) => { const readyIds = filtered.filter((x) => rowState(x).key === "none").map((x) => x.id); setSelected(e.target.checked ? new Set(readyIds) : new Set()); }} /></th>
                                    <th>{L("Nhân viên")}</th>
                                    <th>{L("Email")}</th>
                                    <th>{L("Trạng thái")}</th>
                                    <th className="ai-th-code">{L("Mã kích hoạt")}</th>
                                    <th className="ai-th-act">{L("Thao tác")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={6} className="ai-empty">{search ? L("Không tìm thấy nhân viên phù hợp.") : L("Không có nhân viên đang làm.")}</td></tr>
                                ) : filtered.map((employee) => {
                                    const state = rowState(employee);
                                    const code = activeCodeFor(employee.id);
                                    const canIssue = state.key === "none";
                                    return <tr key={employee.id} className={state.cls === "bad" ? "ai-row--bad" : state.cls === "ok" ? "ai-row--ok" : ""}>
                                        <td className="ai-th-check"><input type="checkbox" className="ai-check" checked={selected.has(employee.id)} disabled={!canIssue} onChange={() => toggle(employee.id)} aria-label={L("Chọn")} /></td>
                                        <td>
                                            <div className="ai-user">
                                                <span className="ai-ava" style={{ background: avaColor(employee.employeeCode || employee.fullName) }}>{initials(employee) || "?"}</span>
                                                <div className="ai-user-meta">
                                                    <strong>{employee.fullName}</strong>
                                                    <small>{employee.employeeCode}{employee.departmentName ? ` · ${employee.departmentName}` : ""}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="ai-email">{employee.email || "—"}</td>
                                        <td><span className={`att-badge ${state.cls}`}>{L(state.label)}</span></td>
                                        <td className="ai-th-code">{code ? <code className="ai-code">{code.code}</code> : <span className="ai-muted">—</span>}</td>
                                        <td className="ai-th-act">
                                            {code ? (
                                                <button type="button" className="ai-verify-btn" onClick={() => openVerify(employee)}>✓ {L("Xác minh")}</button>
                                            ) : canIssue ? (
                                                <button type="button" className="ai-issue-one-btn" onClick={() => { toggle(employee.id); if (!selected.has(employee.id)) setSelected((prev) => new Set([...prev, employee.id])); }}>{L("Chọn để cấp")}</button>
                                            ) : (
                                                <span className="ai-muted">—</span>
                                            )}
                                        </td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>}

            {/* ===== Modal xác minh ===== */}
            {verificationEmployee && <div className="ai-overlay" onMouseDown={(event) => event.target === event.currentTarget && setVerificationEmployee(null)}>
                <form className="ai-modal" onSubmit={verifyAndCreate}>
                    <header>
                        <div className="ai-modal-title">
                            <span className="ai-modal-ico">🔐</span>
                            <div><h2>{L("Xác minh mã kích hoạt")}</h2><p>{L("Kiểm tra thông tin nhân sự trước khi xác nhận tài khoản")}</p></div>
                        </div>
                        <button type="button" aria-label={L("Đóng")} onClick={() => setVerificationEmployee(null)}>×</button>
                    </header>

                    <section className="ai-profile">
                        <div className="ai-identity">
                            <span className="ai-avatar" style={{ background: avaColor(verificationEmployee.employeeCode || verificationEmployee.fullName) }}>{initials(verificationEmployee) || "?"}</span>
                            <div><strong>{verificationEmployee.fullName}</strong><span>{verificationEmployee.employeeCode}</span><i className="ai-identity-warn">● {L("Chưa kích hoạt")}</i></div>
                        </div>
                        <div className="ai-profile-grid">
                            {[
                                ["CCCD / căn cước", maskCitizenId(verificationEmployee.citizenId)],
                                ["Ngày sinh", d(verificationEmployee.birthDate)],
                                ["Giới tính", L(gender(verificationEmployee.gender))],
                                ["Số điện thoại", verificationEmployee.phoneNumber || L("Chưa cập nhật")],
                                ["Email", verificationEmployee.email || L("Chưa cập nhật")],
                                ["Chức vụ", verificationEmployee.positionName || L("Chưa cập nhật")],
                                ["Phòng ban", verificationEmployee.departmentName || L("Chưa cập nhật")],
                                ["Chi nhánh", verificationEmployee.branchName || L("Chưa cập nhật")],
                                ["Ngày vào làm", d(verificationEmployee.startDate)],
                                ["Người quản lý", verificationEmployee.managerName || L("Chưa cập nhật")],
                            ].map(([label, value]) => <div key={label}><small>{L(label)}</small><strong>{value}</strong></div>)}
                        </div>
                    </section>

                    <section className="ai-verify">
                        <label>{L("Mã kích hoạt")}
                            <input autoFocus required value={activationCode} onChange={(event) => { setActivationCode(event.target.value.toUpperCase()); setError(""); }} placeholder={L("Nhập mã kích hoạt (VD: ACT-XXXXXX)")} />
                        </label>
                        <small>{L("Mã còn hạn đến")} <strong>{d(activeCodeFor(verificationEmployee.id)?.expiresAt)}</strong>.</small>
                        <label className="ai-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setError(""); }} />{L("Tôi xác nhận đã kiểm tra đúng thông tin nhân sự.")}</label>
                    </section>

                    {error && <div className="ai-modal-error" role="alert">{error}</div>}
                    <p className="ai-activation-note">{L("Sau khi xác minh, nhân viên sẽ dùng mã này để tự đặt mật khẩu và hoàn tất kích hoạt tài khoản.")}</p>

                    <footer>
                        <button type="button" onClick={() => setVerificationEmployee(null)}>{L("Hủy")}</button>
                        <button className="ai-confirm-btn" disabled={busy}>{busy ? L("Đang xác minh…") : "✓ " + L("Xác minh & kích hoạt")}</button>
                    </footer>
                </form>
            </div>}
        </div>
    </PageLayout>;
};

export default AccountIssuancePage;
