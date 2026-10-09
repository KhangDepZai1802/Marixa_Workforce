import { useState, useEffect } from "react";
import { getAuth } from "../../../services/auth/auth";
import AppLayout from "../../../components/layout/AppLayout";
import relatedApi from "../api/relatedApi";
import "../attendance.css";

const FETCHERS = {
    contract: (id) => relatedApi.contractsByEmployee(id),
    salary: (id) => relatedApi.salariesByEmployee(id),
    insurance: (id) => relatedApi.insuranceByEmployee(id),
    bank: (id) => relatedApi.bankAccountsByEmployee(id),
};

const ICONS = {
    contract: "📋",
    salary: "💰",
    insurance: "🛡️",
    bank: "🏦",
};

const ACCENT = {
    contract: "entd--indigo",
    salary: "entd--emerald",
    insurance: "entd--sky",
    bank: "entd--amber",
};

const EntityDetailPage = ({ kind, title, subtitle, columns, emptyMessage }) => {
    const auth = getAuth();
    const userId = auth?.userId;
    const employeeId = auth?.employeeId;

    const [items, setItems] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const load = async () => {
            try {
                if (!employeeId) {
                    setError("Chưa xác định được nhân viên đang đăng nhập.");
                    setLoading(false);
                    return;
                }
                const [res, profileRes] = await Promise.allSettled([
                    FETCHERS[kind](employeeId),
                    userId ? relatedApi.employeeByUser(userId) : Promise.resolve(null),
                ]);
                if (profileRes.status === "fulfilled" && profileRes.value) {
                    setProfile(profileRes.value.data.data || null);
                }
                if (res.status === "fulfilled") setItems(res.value.data.data || []);
            } catch (err) {
                setError(err.response?.data?.message || err.message || "Không thể tải dữ liệu.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [kind, userId, employeeId]);

    return (
        <AppLayout title={title} subtitle={subtitle} profile={profile}>
            <div className={`entd-page entd-page--${kind}`}>
                {/* Hero banner */}
                <header className={`entd-hero ${ACCENT[kind] || ""}`}>
                    <div className="entd-hero-icon">{ICONS[kind] || "📄"}</div>
                    <div className="entd-hero-text">
                        <h1>{title}</h1>
                        <p>{subtitle}</p>
                    </div>
                    <div className="entd-hero-stat">
                        <strong>{loading ? "…" : items.length}</strong>
                        <span>ghi chép</span>
                    </div>
                </header>

                {error && <div className="att-error">{error}</div>}

                {loading ? (
                    <div className="att-loading">Đang tải...</div>
                ) : items.length === 0 ? (
                    <div className="entd-empty">
                        <span className="entd-empty-icon">{ICONS[kind] || "📄"}</span>
                        <p>{emptyMessage || "Chưa có dữ liệu."}</p>
                    </div>
                ) : (
                    <div className="entd-card">
                        <div className="att-table-wrap att-table-wrap--stack">
                            <table className="att-table entd-table att-table--stack">
                                <thead>
                                    <tr>
                                        {columns.map((c) => (
                                            <th key={c.key}>{c.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((row) => (
                                        <tr key={row.id}>
                                            {columns.map((c) => (
                                                <td key={c.key} data-label={c.label}>
                                                    {c.render ? c.render(row) : row[c.key] ?? "—"}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default EntityDetailPage;
