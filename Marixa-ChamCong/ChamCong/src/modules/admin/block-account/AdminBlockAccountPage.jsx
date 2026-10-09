import AdminAppLayout from "../layout/AdminAppLayout";
import adminApi from "../api/adminApi";
import { useState, useEffect, useCallback, useMemo } from "react";
import "./block-account.css";

const AdminBlockAccountPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [message, setMessage] = useState("");

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([adminApi.employees(), adminApi.users()])
            .then(([empRes, usrRes]) => {
                const employees = empRes.data.data?.items || [];
                const users = usrRes.data.data?.items || [];
                const merged = employees.map((e) => {
                    const u = users.find((x) => x.id === e.userId);
                    return { ...e, isLockedOut: u?.isLockedOut ?? false, userId: u?.id || null };
                });
                setUsers(merged);
            })
            .catch(() => setUsers([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const flash = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(""), 3000);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter((u) => {
            const hay = `${u.fullName || ""} ${u.employeeCode || ""} ${u.email || ""}`.toLowerCase();
            if (q && !hay.includes(q)) return false;
            if (statusFilter === "blocked" && !u.isLockedOut) return false;
            if (statusFilter === "active" && (u.isLockedOut || !u.userId)) return false;
            if (statusFilter === "noaccount" && (u.userId || u.isLockedOut)) return false;
            return true;
        });
    }, [users, search, statusFilter]);

    // KPI
    const kpi = useMemo(() => {
        const blocked = users.filter((u) => u.isLockedOut).length;
        const active = users.filter((u) => u.userId && !u.isLockedOut).length;
        const noAccount = users.filter((u) => !u.userId).length;
        return { total: users.length, blocked, active, noAccount };
    }, [users]);

    const blockAccount = async (user) => {
        if (!user.userId) return;
        if (!window.confirm(`Chặn tài khoản của ${user.fullName} (${user.employeeCode})?`)) return;
        try {
            await adminApi.blockUser(user.userId, {});
            flash(`Đã chặn tài khoản của ${user.fullName}.`);
            load();
        } catch (err) {
            flash(err.response?.data?.message || err.message || "Không chặn được.");
        }
    };

    const unblockAccount = async (user) => {
        if (!window.confirm(`Mở chặn tài khoản của ${user.fullName} (${user.employeeCode})?`)) return;
        try {
            await adminApi.unblockUser(user.userId);
            flash(`Đã mở chặn tài khoản của ${user.fullName}.`);
            load();
        } catch (err) {
            flash(err.response?.data?.message || err.message || "Không mở chặn được.");
        }
    };

    // Nút thao tác: chỉ HIỆN "Chặn/Mở chặn" khi CÓ tài khoản (userId).
    // Chưa có tài khoản -> ẩn hoàn toàn cột thao tác (hiện "Chưa có").
    const actionOf = (u) => {
        if (u.isLockedOut) {
            return <button type="button" className="blk-btn blk-btn--unblock" onClick={() => unblockAccount(u)}>Mở chặn</button>;
        }
        if (u.userId) {
            return <button type="button" className="blk-btn blk-btn--block" onClick={() => blockAccount(u)}>Chặn</button>;
        }
        return null;
    };

    const accountBadge = (u) => {
        if (u.isLockedOut) return <span className="att-badge bad">Đã chặn</span>;
        if (u.userId) return <span className="att-badge ok">Đang hoạt động</span>;
        return <span className="att-badge muted">Chưa có</span>;
    };

    const FILTERS = [
        ["", "Tất cả"],
        ["active", "Đang hoạt động"],
        ["blocked", "Đã chặn"],
        ["noaccount", "Chưa có tài khoản"],
    ];

    return (
        <AdminAppLayout title="Chặn tài khoản" subtitle="Quản lý chặn / mở chặn tài khoản nhân viên">
            <div className="att-content">
                {message && <div className={`blk-notice${message.includes("chặn được") || message.includes("chặn thất") ? " is-error" : ""}`}>{message}</div>}

                {/* ===== Hero + KPI ===== */}
                <div className="blk-hero">
                    <div className="blk-hero-left">
                        <span className="blk-hero-ico">🔒</span>
                        <div>
                            <h2>Quản lý chặn tài khoản</h2>
                            <p>Chặn / mở chặn tài khoản. Nút chặn chỉ hiện với nhân viên đã có tài khoản.</p>
                        </div>
                    </div>
                    <div className="blk-kpi-row">
                        <div className="blk-kpi blk-kpi--blue"><span className="blk-kpi-ico">👥</span><div><span className="blk-kpi-label">Tổng nhân viên</span><strong>{kpi.total}</strong></div></div>
                        <div className="blk-kpi blk-kpi--green"><span className="blk-kpi-ico">✅</span><div><span className="blk-kpi-label">Đang hoạt động</span><strong>{kpi.active}</strong></div></div>
                        <div className="blk-kpi blk-kpi--red"><span className="blk-kpi-ico">🚫</span><div><span className="blk-kpi-label">Đã chặn</span><strong>{kpi.blocked}</strong></div></div>
                        <div className="blk-kpi blk-kpi--gray"><span className="blk-kpi-ico">⬜</span><div><span className="blk-kpi-label">Chưa có TK</span><strong>{kpi.noAccount}</strong></div></div>
                    </div>
                </div>

                {/* ===== Bảng ===== */}
                {loading ? (
                    <div className="att-loading">Đang tải...</div>
                ) : (
                    <div className="att-card blk-card">
                        <div className="blk-toolbar">
                            <label className="admin-search">
                                <span aria-hidden="true">⌕</span>
                                <input type="search" placeholder="Tìm mã, họ tên, email..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Tìm nhân viên" />
                            </label>
                            <div className="blk-filters">
                                {FILTERS.map(([value, label]) => (
                                    <button key={value} type="button" className={`blk-filter${statusFilter === value ? " active" : ""}`} onClick={() => setStatusFilter(value)}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="att-table-wrap">
                            <table className="att-table blk-table">
                                <thead>
                                    <tr>
                                        <th>Mã NV</th>
                                        <th>Họ tên</th>
                                        <th>Email</th>
                                        <th>Trạng thái</th>
                                        <th>Tài khoản</th>
                                        <th className="blk-th-act">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} className="att-muted blk-empty">Không tìm thấy nhân viên phù hợp.</td></tr>
                                    ) : (
                                        filtered.map((u) => (
                                            <tr key={u.id} className={u.isLockedOut ? "blk-row--blocked" : ""}>
                                                <td className="blk-code">{u.employeeCode}</td>
                                                <td>
                                                    <div className="blk-user">
                                                        <span className="blk-ava" style={{ background: "hsl(" + Math.abs([...String(u.employeeCode || u.fullName)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)) % 360 + " 55% 45%)" }}>
                                                            {(u.fullName || "?").slice(0, 1).toUpperCase()}
                                                        </span>
                                                        <strong>{u.fullName}</strong>
                                                    </div>
                                                </td>
                                                <td>{u.email || <span className="att-muted">—</span>}</td>
                                                <td><span className={`att-badge ${u.status === 2 ? "ok" : "warn"}`}>{u.status === 2 ? "Đang làm" : "Đã nghỉ"}</span></td>
                                                <td>{accountBadge(u)}</td>
                                                <td className="blk-th-act">
                                                    {actionOf(u) || <span className="blk-noaction">—</span>}
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
        </AdminAppLayout>
    );
};

export default AdminBlockAccountPage;
