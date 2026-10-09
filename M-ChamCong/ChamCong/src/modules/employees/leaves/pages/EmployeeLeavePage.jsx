import { useState, useEffect, useMemo, useCallback } from "react";
import HrAppLayout from "../../hr/layout/HrAppLayout";
import HrHero from "../../hr/HrHero";
import employeeApi from "../../api/employeeApi";
import "../../employee.css";
import "../leaves.css";

const LABELS = { 1: "Chờ duyệt", 2: "Đã duyệt", 3: "Từ chối", 4: "Đã hủy" };
const TONES = { 1: "warn", 2: "ok", 3: "bad", 4: "muted" };
const STATUS_FILTERS = [
    ["", "Tất cả"],
    ["1", "Chờ duyệt"],
    ["2", "Đã duyệt"],
    ["3", "Từ chối"],
    ["4", "Đã hủy"],
];

const AVA_COLORS = ["#2f6df6", "#16a085", "#e67e22", "#8e44ad", "#c0392b", "#1565c0", "#00838f", "#d8436b"];
const avaColor = (seed = "") => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return AVA_COLORS[Math.abs(h) % AVA_COLORS.length];
};
const fmtDay = (v, locale) => (v ? new Date(v).toLocaleDateString(locale) : "—");

// ===== Trang Nghỉ phép (nhân sự) — giao diện riêng, mobile-friendly =====
const EmployeeLeavePage = ({ hrMode = false }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState("");
    const [notice, setNotice] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await employeeApi.leaveRequests();
            setRows(res.data.data?.items || []);
        } catch (e) {
            setError(e.response?.data?.message || e.message || "Không tải được đơn nghỉ phép.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const flash = (m) => { setNotice(m); setTimeout(() => setNotice(""), 3000); };

    const approve = async (row) => {
        if (!window.confirm(`Duyệt đơn nghỉ phép của ${row.employeeName}?`)) return;
        setBusy("approve-" + row.id);
        try {
            await employeeApi.approveLeave(row.id, "");
            flash(`Đã duyệt đơn của ${row.employeeName}.`);
            await load();
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setBusy("");
        }
    };
    const reject = async (row) => {
        const note = window.prompt(`Lý do từ chối đơn của ${row.employeeName} (không bắt buộc):`) || "";
        setBusy("reject-" + row.id);
        try {
            await employeeApi.rejectLeave(row.id, note);
            flash(`Đã từ chối đơn của ${row.employeeName}.`);
            await load();
        } catch (e) {
            setError(e.response?.data?.message || e.message);
        } finally {
            setBusy("");
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (status && String(r.status) !== status) return false;
            if (!q) return true;
            return `${r.employeeCode || ""} ${r.employeeName || ""} ${r.leaveTypeName || ""} ${r.reason || ""}`
                .toLowerCase().includes(q);
        });
    }, [rows, search, status]);

    const kpi = useMemo(() => ({
        total: rows.length,
        pending: rows.filter((r) => r.status === 1).length,
        approved: rows.filter((r) => r.status === 2).length,
        rejected: rows.filter((r) => r.status === 3).length,
    }), [rows]);

    const kpis = [
        { label: "Tổng đơn", value: kpi.total, tone: "blue", ico: "📄" },
        { label: "Chờ duyệt", value: kpi.pending, tone: "warn", ico: "⏳" },
        { label: "Đã duyệt", value: kpi.approved, tone: "green", ico: "✅" },
        { label: "Từ chối", value: kpi.rejected, tone: "red", ico: "⛔" },
    ];

    return (
        <HrAppLayout title="Nghỉ phép" subtitle="Xem & duyệt đơn nghỉ phép của nhân viên">
            <div className="att-content lp-page">
                <HrHero
                    ico="🏖️"
                    title="Đơn nghỉ phép"
                    sub="Duyệt đơn nghỉ phép: chờ · đã duyệt · từ chối · đã hủy."
                    kpis={kpis}
                />
                {error && <div className="lp-err">{error}<button onClick={() => setError("")}>×</button></div>}
                {notice && <div className="lp-notice">✓ {notice}</div>}

                {loading ? (
                    <div className="att-loading">Đang tải...</div>
                ) : (
                    <div className="lp-card">
                        {/* Toolbar: filter pills + search */}
                        <div className="lp-toolbar">
                            <div className="lp-filters">
                                {STATUS_FILTERS.map(([val, label]) => {
                                    const count = val === "" ? kpi.total : rows.filter((r) => String(r.status) === val).length;
                                    return (
                                        <button
                                            key={val}
                                            type="button"
                                            className={`lp-filter${status === val ? " active" : ""}`}
                                            onClick={() => setStatus(val)}
                                        >
                                            <span>{label}</span><i>{count}</i>
                                        </button>
                                    );
                                })}
                            </div>
                            <label className="lp-search">
                                <span aria-hidden="true">⌕</span>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Tìm mã, tên, loại phép, lý do..."
                                    aria-label="Tìm đơn nghỉ phép"
                                />
                            </label>
                        </div>

                        {/* Table */}
                        <div className="lp-table-wrap">
                            <table className="lp-table">
                                <thead>
                                    <tr>
                                        <th>Nhân viên</th>
                                        <th>Loại phép</th>
                                        <th>Thời gian</th>
                                        <th>Số ngày</th>
                                        <th>Trạng thái</th>
                                        <th className="lp-th-act">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="lp-empty">Không có đơn nghỉ phép phù hợp.</td></tr>
                                    ) : (
                                        filtered.map((r) => (
                                            <tr key={r.id} className={r.status === 3 ? "lp-row--bad" : r.status === 2 ? "lp-row--ok" : ""}>
                                                <td>
                                                    <div className="lp-user">
                                                        <span className="lp-ava" style={{ background: avaColor(r.employeeCode || r.employeeName) }}>
                                                            {(r.employeeName || "?").slice(0, 1).toUpperCase()}
                                                        </span>
                                                        <div className="lp-user-meta">
                                                            <strong>{r.employeeName || "—"}</strong>
                                                            <small>{r.employeeCode || ""}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{r.leaveTypeName || "—"}</td>
                                                <td>
                                                    <div className="lp-date">
                                                        <strong>{fmtDay(r.fromDate, "vi-VN")}</strong>
                                                        <span>→</span>
                                                        <strong>{fmtDay(r.toDate, "vi-VN")}</strong>
                                                    </div>
                                                </td>
                                                <td>{r.totalDays != null ? `${r.totalDays} ngày` : "—"}</td>
                                                <td>
                                                    <span className={`lp-badge lp-badge--${TONES[r.status] || "muted"}`}>{LABELS[r.status] || "—"}</span>
                                                    {r.approverName && <small className="lp-approver">{r.approverName}</small>}
                                                </td>
                                                <td className="lp-th-act">
                                                    {r.status === 1 ? (
                                                        <div className="lp-actions">
                                                            <button
                                                                type="button"
                                                                className="lp-btn lp-btn--ok"
                                                                onClick={() => approve(r)}
                                                                disabled={busy === "approve-" + r.id}
                                                            >
                                                                {busy === "approve-" + r.id ? "Đang duyệt…" : "✓ Duyệt"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="lp-btn lp-btn--bad"
                                                                onClick={() => reject(r)}
                                                                disabled={busy === "reject-" + r.id}
                                                            >
                                                                {busy === "reject-" + r.id ? "Đang từ chối…" : "Từ chối"}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="lp-muted">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </HrAppLayout>
    );
};

export default EmployeeLeavePage;
