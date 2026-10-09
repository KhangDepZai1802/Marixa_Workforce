import { useState, useMemo } from "react";
import AdminAppLayout from "./layout/AdminAppLayout";
import HrAppLayout from "../employees/hr/layout/HrAppLayout";
import { useAdminList } from "./hooks/useAdminList";
import ApproveButtons from "./components/ApproveButtons";
import { toCsv, downloadCsv } from "../employees/hr/hrUtils";
import "../../modules/me/attendance.css";
import "./admin.css";

// Trang danh sách quản trị dùng chung: tìm kiếm + bộ lọc + nút Duyệt/Từ chối +
// xuất CSV. Dùng cho: Nghỉ phép, Bảng lương, Người đã nghỉ việc, Báo cáo.
const AdminListPage = ({
    title,
    subtitle,
    fetcher,
    columns, // [{key,label,date,statusKind}]
    searchKeys = [],
    searchPlaceholder = "Tìm theo thông tin...",
    filter, // {key, options:[[v,label]]} (tùy chọn)
    approve,
    reject,
    pendingOf,
    emptyText,
    hrMode = false,
}) => {
    const { rows, loading, error, reload } = useAdminList(fetcher);
    const [search, setSearch] = useState("");
    const [filterVal, setFilterVal] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((x) => {
            if (q && searchKeys.length) {
                const hay = searchKeys
                    .map((k) => String(x[k] ?? ""))
                    .join(" ")
                    .toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (filter?.key && filterVal && String(x[filter.key]) !== filterVal)
                return false;
            return true;
        });
    }, [rows, search, filterVal, searchKeys, filter]);

    const act = async (row, fn) => {
        try {
            await fn(row);
            reload();
        } catch (e) {
            alert(
                (fn === reject ? "Từ chối" : "Duyệt") +
                    " thất bại: " +
                    (e.response?.data?.message || e.message)
            );
        }
    };

    const exportCsv = () => {
        const data = filtered.map((x) =>
            Object.fromEntries(columns.map((c) => [c.label, x[c.key]]))
        );
        downloadCsv(
            title.toLowerCase().replace(/\s+/g, "-") + ".csv",
            toCsv(data, columns.map((c) => c.label))
        );
    };

    const cell = (c, x) => {
        const v = x[c.key];
        if (v == null || v === "") return "—";
        if (c.date) return new Date(v).toLocaleDateString("vi-VN");
        if (c.badge)
            return (
                <span className={`att-badge ${c.badge(v)}`}>
                    {c.labelOf ? c.labelOf(v) : v}
                </span>
            );
        if (c.labelOf) return c.labelOf(v);
        return String(v);
    };

    const PageLayout = hrMode ? HrAppLayout : AdminAppLayout;

    return (
        <PageLayout title={title} subtitle={subtitle}>
            <div className="att-content">
                {error && <div className="att-error">{error}</div>}
                {loading && <div className="att-loading">Đang tải...</div>}
                {!loading && !error && (
                    <div className="att-card">
                        <div className="admin-toolbar">
                            <label className="admin-search">
                                <span aria-hidden="true">⌕</span>
                                <input
                                    type="search"
                                    placeholder={searchPlaceholder}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label={searchPlaceholder}
                                />
                            </label>
                            {filter?.options && filter.options.length > 0 && (
                                <select
                                    value={filterVal}
                                    onChange={(e) =>
                                        setFilterVal(e.target.value)
                                    }
                                >
                                    <option value="">Tất cả</option>
                                    {filter.options.map(([v, l]) => (
                                        <option key={v} value={v}>
                                            {l}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <span className="att-muted">
                                {filtered.length} bản ghi
                            </span>
                            <button
                                type="button"
                                className="admin-link-btn"
                                onClick={exportCsv}
                            >
                                ⬇ Xuất CSV
                            </button>
                        </div>

                        <div className="att-table-wrap">
                            <table className="att-table">
                                <thead>
                                    <tr>
                                        {columns.map((c) => (
                                            <th key={c.key}>{c.label}</th>
                                        ))}
                                        {approve && <th />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    columns.length +
                                                    (approve ? 1 : 0)
                                                }
                                                className="att-muted"
                                            >
                                                {emptyText ||
                                                    "Không có dữ liệu."}
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((x, i) => (
                                            <tr key={x.id || i}>
                                                {columns.map((c) => (
                                                    <td key={c.key}>
                                                        {cell(c, x)}
                                                    </td>
                                                ))}
                                                {approve && (
                                                    <td>
                                                        <ApproveButtons
                                                            pending={pendingOf?.(
                                                                x
                                                            )}
                                                            onApprove={() =>
                                                                act(
                                                                    x,
                                                                    approve
                                                                )
                                                            }
                                                            onReject={() =>
                                                                act(
                                                                    x,
                                                                    reject
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </PageLayout>
    );
};

export default AdminListPage;
