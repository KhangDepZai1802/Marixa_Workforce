import { useState, useEffect, useMemo, useCallback } from "react";
import AdminAppLayout from "../layout/AdminAppLayout";
import adminApi from "../api/adminApi";
import { toCsv, downloadCsv } from "../../employees/hr/hrUtils";
import { translate, useLanguage } from "../../../services/i18n/LanguageProvider";
import "../admin.css";

// ===== QUÁ TRÌNH CÔNG TÁC =====
// Dữ liệu lưu local (localStorage) vì chưa có API "work history" phía backend.
const LS_KEY = "marixa_admin_work_history";

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "—");

const blankRow = () => ({
    id: Date.now(),
    employeeId: "",
    employeeCode: "",
    employeeName: "",
    startDate: "",
    endDate: "",
    position: "",
    phongBan: "",
    chucVu: "",
    donVi: "",
    manager: "",
    note: "",
});

const AdminWorkPage = () => {
    const { language } = useLanguage();
    const L = (t) => translate(t, language);

    const [employees, setEmployees] = useState([]);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(blankRow());
    const [empQuery, setEmpQuery] = useState("");
    const [error, setError] = useState("");

    // Đọc localStorage
    useEffect(() => {
        try { const raw = localStorage.getItem(LS_KEY); if (raw) setRows(JSON.parse(raw)); } catch { setRows([]); }
    }, []);
    // Lưu localStorage
    useEffect(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch { /* noop */ } }, [rows]);

    const load = useCallback(async () => {
        try {
            const e = await adminApi.employees();
            setEmployees(e.data.data?.items || []);
        } catch { /* local data still usable */ }
    }, []);
    useEffect(() => { load(); }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows
            .filter((r) => {
                if (!q) return true;
                const hay = `${r.employeeCode} ${r.employeeName} ${r.position} ${r.phongBan} ${r.chucVu} ${r.donVi} ${r.manager}`.toLowerCase();
                return hay.includes(q);
            })
            .sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    }, [rows, search]);

    // Người đang nhập (tìm theo mã NV / họ tên) để preview dữ liệu
    const matched = useMemo(() => {
        const q = empQuery.trim().toLowerCase();
        if (!q) return null;
        return (
            employees.find((e) => String(e.employeeCode || "").toLowerCase() === q)
            || employees.find((e) => String(e.fullName || "").toLowerCase().includes(q))
            || null
        );
    }, [employees, empQuery]);

    const openAdd = () => { setEditing(null); setForm(blankRow()); setEmpQuery(""); setError(""); setModal(true); };
    const openEdit = (row) => { setEditing(row.id); setForm({ ...row }); setEmpQuery(row.employeeCode || row.employeeName || ""); setError(""); setModal(true); };

    // Áp dữ liệu nhân viên đã nhập vào form (preview live)
    useEffect(() => {
        if (!matched) return;
        setForm((prev) => ({
            ...prev,
            employeeId: matched.id,
            employeeCode: matched.employeeCode || prev.employeeCode,
            employeeName: matched.fullName || prev.employeeName,
            position: matched.positionName || prev.position,
            phongBan: matched.departmentName || prev.phongBan,
            chucVu: matched.positionName || prev.chucVu,
            donVi: matched.departmentName || prev.donVi,
            manager: matched.managerName || prev.manager,
        }));
    }, [matched]);

    const save = async () => {
        if (!form.employeeName.trim() && !form.employeeId) { setError(L("Vui lòng nhập mã nhân viên.")); return; }
        if (!form.startDate) { setError(L("Vui lòng chọn ngày bắt đầu.")); return; }
        setError("");
        if (editing) {
            setRows((prev) => prev.map((r) => (r.id === editing ? { ...form, id: editing } : r)));
        } else {
            setRows((prev) => [...prev, { ...form }]);
        }
        setModal(false);
    };

    const remove = (row) => {
        if (!window.confirm(`${L("Xóa quá trình công tác")} của ${row.employeeName || row.employeeCode}?`)) return;
        setRows((prev) => prev.filter((r) => r.id !== row.id));
    };

    const exportCsv = () => {
        const data = filtered.map((r) => ({
            "Mã NV": r.employeeCode || "—",
            [L("Nhân viên")]: r.employeeName || "—",
            [L("Từ ngày")]: fmtDate(r.startDate),
            [L("Đến ngày")]: fmtDate(r.endDate),
            [L("Vị trí công việc")]: r.position || "—",
            [L("Phòng ban")]: r.phongBan || "—",
            [L("Chức vụ")]: r.chucVu || "—",
            [L("Đơn vị công tác")]: r.donVi || "—",
            [L("Quản lý trực tiếp")]: r.manager || "—",
        }));
        downloadCsv("congtac.csv", toCsv(data, Object.keys(data[0] || { a: "" })));
    };

    return (
        <AdminAppLayout title={L("Công tác")} subtitle={L("Quá trình công tác của nhân viên")}>
            <div className="att-content">
                {error && <div className="att-error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}

                <section className="att-card">
                    <div className="admin-toolbar">
                        <label className="admin-search">
                            <span aria-hidden="true">⌕</span>
                            <input type="search" placeholder={L("Tìm nhân viên / vị trí / đơn vị...")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={L("Tìm")} />
                        </label>
                        <span className="att-muted">{filtered.length} {L("lượt công tác")}</span>
                        <button type="button" className="admin-link-btn" onClick={exportCsv}>⬇ {L("Xuất CSV")}</button>
                        <button type="button" className="work-add-btn" onClick={openAdd}>+ {L("Thêm công tác")}</button>
                    </div>

                    <div className="att-table-wrap">
                        <table className="att-table">
                            <thead>
                                <tr>
                                    <th>{L("Mã NV")}</th>
                                    <th>{L("Từ ngày")}</th>
                                    <th>{L("Đến ngày")}</th>
                                    <th>{L("Vị trí công việc")}</th>
                                    <th>{L("Phòng ban")}</th>
                                    <th>{L("Chức vụ")}</th>
                                    <th>{L("Đơn vị công tác")}</th>
                                    <th>{L("Quản lý trực tiếp")}</th>
                                    <th>{L("Thao tác")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan="9" className="att-muted">{L("Chưa có quá trình công tác.")}</td></tr>
                                ) : filtered.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <span className="work-emp-cell">
                                                <strong>{r.employeeCode || "—"}</strong>
                                                <small>{r.employeeName}</small>
                                            </span>
                                        </td>
                                        <td>{fmtDate(r.startDate)}</td>
                                        <td>{fmtDate(r.endDate)}</td>
                                        <td>{r.position || "—"}</td>
                                        <td>{r.phongBan || "—"}</td>
                                        <td>{r.chucVu || "—"}</td>
                                        <td>{r.donVi || "—"}</td>
                                        <td>{r.manager || "—"}</td>
                                        <td>
                                            <div className="admin-row-actions">
                                                <button type="button" className="admin-link-btn" onClick={() => openEdit(r)}>{L("Sửa")}</button>
                                                <button type="button" className="admin-link-btn admin-link-btn--danger" onClick={() => remove(r)}>{L("Xóa")}</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Modal thêm / sửa */}
                {modal && (
                    <div className="att-guide-overlay work-overlay" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}>
                        <section className="att-detail-modal work-modal">
                            <header className="att-detail-modal-head">
                                <div><h2>{editing ? L("Sửa công tác") : L("Thêm công tác")}</h2></div>
                                <button type="button" onClick={() => setModal(false)}>×</button>
                            </header>
                            <div className="work-form">
                                <label>{L("Nhân viên")}<input value={empQuery} onChange={(e) => setEmpQuery(e.target.value)} placeholder={L("Nhập mã nhân viên (VD: NV001)")} autoFocus /></label>

                                {empQuery.trim() && !matched && (
                                    <p className="att-muted work-emp-warn">{L("Không tìm thấy nhân viên theo mã này.")}</p>
                                )}
                                {matched && (
                                    <div className="work-emp-preview">
                                        <span className="work-emp-preview-ava">{(matched.fullName || "?").slice(0, 1).toUpperCase()}</span>
                                        <div className="work-emp-preview-info">
                                            <strong>{matched.employeeCode} · {matched.fullName}</strong>
                                            <small>{matched.positionName || L("Chưa có chức vụ")} · {matched.departmentName || L("Chưa có phòng ban")} · {L("QL")} {matched.managerName || "—"}</small>
                                        </div>
                                    </div>
                                )}

                                <div className="work-form-row">
                                    <label>{L("Từ ngày")}<input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
                                    <label>{L("Đến ngày")}<input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
                                </div>
                                <label>{L("Vị trí công việc")}<input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder={L("VD: Kỹ sư cơ khí")} /></label>
                                <div className="work-form-row">
                                    <label>{L("Phòng ban")}<input value={form.phongBan} onChange={(e) => setForm({ ...form, phongBan: e.target.value })} placeholder={L("VD: Phòng Kỹ thuật")} /></label>
                                    <label>{L("Chức vụ")}<input value={form.chucVu} onChange={(e) => setForm({ ...form, chucVu: e.target.value })} placeholder={L("VD: Trưởng phòng")} /></label>
                                </div>
                                <div className="work-form-row">
                                    <label>{L("Đơn vị công tác")}<input value={form.donVi} onChange={(e) => setForm({ ...form, donVi: e.target.value })} placeholder={L("VD: Công ty X")} /></label>
                                    <label>{L("Quản lý trực tiếp")}<input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} placeholder={L("Họ tên người quản lý")} /></label>
                                </div>
                                <label>{L("Ghi chú")}<textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={L("Nội dung công tác...")} /></label>
                                <div className="work-form-actions">
                                    <button type="button" className="admin-link-btn" onClick={() => setModal(false)}>{L("Hủy")}</button>
                                    <button type="button" className="work-save" onClick={save}>{L("Lưu")}</button>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </AdminAppLayout>
    );
};

export default AdminWorkPage;
