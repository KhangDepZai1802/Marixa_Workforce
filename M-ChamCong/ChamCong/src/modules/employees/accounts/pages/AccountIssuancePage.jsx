import { useState, useEffect, useMemo, useCallback } from "react";



import HrAppLayout from "../../hr/layout/HrAppLayout";

import employeeApi from "../../api/employeeApi";

import "../../../../modules/me/attendance.css";

import "../../employee.css";

import "../account-issuance.css";
import HrHero from "../../hr/HrHero";



const workingStatus = [1, 2, 3];

const activationCodeValidityMinutes = 1440;

const employeeStatus = { 1: "Đang thử việc", 2: "Đang làm", 3: "Tạm nghỉ" };

const date = (value) => value ? new Date(value).toLocaleDateString("vi-VN") : "—";

const isCodeActive = (code) => !code.isUsed && new Date(code.expiresAt) > new Date();

const initials = (employee) => `${employee.givenName?.[0] || ""}${employee.familyName?.[0] || ""}`.toLocaleUpperCase("vi");

const maskCitizenId = (value) => value ? `${value.slice(0, 4)} ${"•".repeat(Math.max(4, value.length - 7))} ${value.slice(-3)}` : "Chưa cập nhật";

const gender = (value) => ({ 1: "Nam", 2: "Nữ" })[value] || "Chưa cập nhật";

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



const AccountIssuancePage = ({ hrMode = false }) => {

    const [employees, setEmployees] = useState([]);

    const [users, setUsers] = useState([]);

    const [codes, setCodes] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(new Set());

    const [issued, setIssued] = useState("");

    const [verificationEmployee, setVerificationEmployee] = useState(null);

    const [activationCode, setActivationCode] = useState("");

    const [confirmed, setConfirmed] = useState(false);

    const [busy, setBusy] = useState(false);

    const [, refreshExpiry] = useState(0);



    const load = useCallback(async () => {

        setLoading(true);

        try {

            const [e, u, c] = await Promise.all([employeeApi.employees(), employeeApi.users(), employeeApi.activationCodes()]);

            setEmployees(e.data.data?.items || []);

            setUsers(u.data.data?.items || []);

            setCodes(c.data.data?.items || []);

        } catch (err) { setError(err.response?.data?.message || err.message || "Không tải được danh sách tài khoản."); }

        finally { setLoading(false); }

    }, []);

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

    const visibleEmployees = useMemo(() => working
        .filter((employee) => `${employee.employeeCode} ${employee.fullName} ${employee.email || ""}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")))
        .sort((a, b) => {
            const aUnlinked = rowState(a).key === "none" ? 0 : 1;
            const bUnlinked = rowState(b).key === "none" ? 0 : 1;
            if (aUnlinked !== bUnlinked) return aUnlinked - bUnlinked;
            return 0;
        }), [working, search, rowState]);
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

        if (!ids.length) { setError("Chọn nhân viên hợp lệ chưa có tài khoản."); return; }

        setBusy(true); setError("");

        let success = 0;

        for (const id of ids) {

            try { await employeeApi.createActivationCode({ employeeId: id, code: generateCode(), validMinutes: activationCodeValidityMinutes }); success++; }

            catch { /* report the total below and reload the actual codes */ }

        }

        setIssued(`Đã cấp ${success}/${ids.length} mã kích hoạt (hạn 1 ngày).`);

        setSelected(new Set());

        setBusy(false);

        await load();

    };

    const openVerification = async (employee) => {

        setError(""); setIssued(""); setBusy(true);

        try {

            let code = activeCodeFor(employee.id);

            if (!code) {

                const value = generateCode();

                const response = await employeeApi.createActivationCode({ employeeId: employee.id, code: value, validMinutes: activationCodeValidityMinutes });

                code = response.data.data;

                setCodes((previous) => [...previous, code]);

            }

            setVerificationEmployee(employee);

            setActivationCode(code.code);

            setConfirmed(false);

        } catch (err) { setError(err.response?.data?.message || "Không cấp được mã kích hoạt."); }

        finally { setBusy(false); }

    };

    const renewAccount = async (employee) => {

        if (!isLinked(employee)) { await openVerification(employee); return; }

        setBusy(true); setError(""); setIssued("");

        try {

            const response = await employeeApi.createActivationCode({ employeeId: employee.id, code: generateCode(), validMinutes: activationCodeValidityMinutes });

            setCodes((previous) => [...previous.filter((code) => code.employeeId !== employee.id || code.isUsed), response.data.data]);

            setIssued(`Đã cấp lại mã kích hoạt cho ${employee.fullName}. Mã có hiệu lực trong 1 ngày.`);

        } catch (err) { setError(err.response?.data?.message || "Không cấp lại được mã kích hoạt."); }

        finally { setBusy(false); }

    };

    const verifyAndCreate = async (event) => {

        event.preventDefault();

        if (!confirmed) { setError("Vui lòng xác nhận đã kiểm tra thông tin nhân sự."); return; }

        const code = codes.find((item) => item.employeeId === verificationEmployee.id && item.code === activationCode.trim() && isCodeActive(item));

        if (!code) { setError("Mã kích hoạt không đúng, đã dùng hoặc hết hạn."); return; }

        setBusy(true); setError("");

        try {

            await employeeApi.verifyEmployeeActivation({ employeeId: verificationEmployee.id, code: activationCode.trim() });

            setVerificationEmployee(null);

            setIssued(`Đã xác minh thông tin và mã kích hoạt cho ${verificationEmployee.fullName}. Nhân viên dùng mã này để đặt hoặc đặt lại mật khẩu.`);

            await load();

        } catch (err) { setError(err.response?.data?.message || "Không xác minh được mã kích hoạt."); }

        finally { setBusy(false); }

    };

    const PageLayout = HrAppLayout;



    return <PageLayout title="Cấp tài khoản" subtitle="Xác minh hồ sơ và cấp mã kích hoạt cho nhân viên">

        <div className="att-content account-issuance">

            {error && <div className="att-error">{error}<button onClick={() => setError("")}>×</button></div>}

            {issued && <div className="att-notice account-notice">✓ {issued}</div>}

            {loading && <div className="att-loading">Đang tải...</div>}

            {!loading && <>

                <HrHero
                    ico="🔑"
                    title="Cấp tài khoản"
                    sub="Xác minh hồ sơ và cấp mã kích hoạt cho nhân viên."
                    kpis={[
                        { ico: "👥", label: "Tổng hồ sơ", value: kpis.total, tone: "blue" },
                        { ico: "✅", label: "Đang làm", value: kpis.working, tone: "green" },
                        { ico: "🔑", label: "Đã có tài khoản", value: kpis.has, tone: "ok" },
                        { ico: "⚠", label: "Chưa có", value: kpis.none, tone: "warn" },
                        { ico: "✕", label: "Lỗi dữ liệu", value: (kpis.invalid + kpis.dup), tone: "red" },
                        { ico: "⬛", label: "Sẵn sàng cấp", value: kpis.ready, tone: "gray" },
                    ]}
                />

                <div className="att-card">

                    <div className="admin-toolbar account-toolbar"><div className="account-toolbar-actions"><label className="account-search"><span>⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, họ tên, email..." aria-label="Tìm nhân viên" /></label><button type="button" className="account-export-btn" onClick={() => downloadUnlinkedEmployees(unlinked)}>Xuất Excel ({unlinked.length})</button><button type="button" className="account-export-btn" onClick={issueCodes} disabled={busy || !selected.size}>Cấp mã ({selected.size})</button></div></div>
                    <div className="att-table-wrap"><table className="att-table account-table"><thead><tr><th>Chọn</th><th>Nhân viên</th><th>Trạng thái</th><th>Email</th><th>Mã kích hoạt</th></tr></thead><tbody>

                        {visibleEmployees.length === 0 ? <tr><td colSpan={5} className="att-muted">{search ? "Không tìm thấy nhân viên phù hợp." : "Không có nhân viên đang làm."}</td></tr> : visibleEmployees.map((employee) => {

                            const state = rowState(employee);

                            const code = activeCodeFor(employee.id);

                            const canIssue = state.key === "none";

                            return <tr key={employee.id}><td><input type="checkbox" className="admin-check" checked={selected.has(employee.id)} disabled={!canIssue} onChange={() => toggle(employee.id)} /></td><td><div className="att-emp-cell"><span className="att-emp-code">{employee.employeeCode}</span><span className="att-emp-name">{employee.fullName}</span></div></td><td><span className={`att-badge ${state.cls}`}>{state.label}</span></td><td>{employee.email || "—"}</td><td>{code ? <code className="account-code">{code.code}</code> : "—"}</td></tr>;

                        })}

                    </tbody></table></div>

                </div>

            </>}

            {verificationEmployee && <div className="account-overlay" onMouseDown={(event) => event.target === event.currentTarget && setVerificationEmployee(null)}><form className="account-modal" onSubmit={verifyAndCreate}>

                <header><div><h2>Xác minh mã kích hoạt</h2><p>Kiểm tra thông tin nhân sự trước khi xác nhận tài khoản</p></div><button type="button" aria-label="Đóng" onClick={() => setVerificationEmployee(null)}>×</button></header>

                <section className="account-profile"><h3>Thông tin nhân sự</h3><div className="account-identity"><div className="account-avatar">{initials(verificationEmployee)}</div><div><strong>{verificationEmployee.fullName}</strong><span>Mã nhân viên: {verificationEmployee.employeeCode}</span><i>● Chưa kích hoạt</i></div></div>

                    <div className="account-profile-grid">{[

                        ["Họ và tên", verificationEmployee.fullName], ["Mã nhân viên", verificationEmployee.employeeCode],

                        ["CCCD / căn cước", maskCitizenId(verificationEmployee.citizenId)], ["Ngày sinh", date(verificationEmployee.birthDate)],

                        ["Giới tính", gender(verificationEmployee.gender)], ["Số điện thoại", verificationEmployee.phoneNumber || "Chưa cập nhật"],

                        ["Email", verificationEmployee.email || "Chưa cập nhật"], ["Chức vụ", verificationEmployee.positionName || "Chưa cập nhật"],

                        ["Phòng ban", verificationEmployee.departmentName || "Chưa cập nhật"], ["Chi nhánh", verificationEmployee.branchName || "Chưa cập nhật"],

                        ["Ngày vào làm", date(verificationEmployee.startDate)], ["Người quản lý", verificationEmployee.managerName || "Chưa cập nhật"],

                    ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>

                </section>

                <section className="account-verify"><h3>Xác minh mã kích hoạt</h3><label>Mã kích hoạt<input autoFocus required value={activationCode} onChange={(event) => { setActivationCode(event.target.value.toUpperCase()); setError(""); }} placeholder="Nhập mã kích hoạt" /></label><small>Mã còn hạn đến {date(activeCodeFor(verificationEmployee.id)?.expiresAt)}.</small><label className="account-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setError(""); }} />Tôi xác nhận đã kiểm tra đúng thông tin nhân sự.</label></section>

                {error && <div className="account-modal-error" role="alert">{error}</div>}

                <p className="account-activation-note">Sau khi xác minh, nhân viên sẽ dùng mã này để tự đặt mật khẩu và hoàn tất kích hoạt tài khoản.</p>

                <footer><button type="button" onClick={() => setVerificationEmployee(null)}>Hủy</button><button className="account-confirm-btn" disabled={busy}>{busy ? "Đang xác minh…" : "✓ Xác minh & kích hoạt"}</button></footer>

            </form></div>}

        </div>

    </PageLayout>;

};



export default AccountIssuancePage;

