import { useState, useMemo } from "react";

import HrAppLayout from "./hr/layout/HrAppLayout";
import { useEmployeeList } from "./hooks/useEmployeeList";
import ApproveButtons from "./components/ApproveButtons";
import { toCsv, downloadCsv } from "./hr/hrUtils";
import { localeForLanguage, translate, useLanguage } from "../../services/i18n/LanguageProvider";
import "../../modules/me/attendance.css";
import "./employee.css";
import HrHero from "./hr/HrHero";

// Trang danh sách quản trị dùng chung: tìm kiếm + bộ lọc + nút Duyệt/Từ chối +
// xuất CSV. Dùng cho: Nghỉ phép, Bảng lương, Người đã nghỉ việc, Báo cáo.
const EmployeeListPage = ({
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
    hero = {},
}) => {
    const { rows, loading, error, reload } = useEmployeeList(fetcher);
    const [search, setSearch] = useState("");
    const [filterVal, setFilterVal] = useState("");
    const { language } = useLanguage();
    const locale = localeForLanguage(language);
    const L = (text) => translate(text, language);

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
                (fn === reject ? L("Từ chối") : L("Duyệt")) +
                    L("thất bại:") + " " +
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
        if (c.type === "employee") {
            const name = x[c.key];
            const code = x["employeeCode"];
            if (name == null || name === "") return "-";
            return (
                <div className="att-emp-cell">
                    {code ? <span className="att-emp-code">{code}</span> : null}
                    <span className="att-emp-name">{name}</span>
                </div>
            );
        }
        const v = x[c.key];
        if (v == null || v === "") return "—";
        if (c.date) return new Date(v).toLocaleDateString(locale);
        if (c.badge)
            return (
                <span className={`att-badge ${c.badge(v)}`}>
                    {c.labelOf ? c.labelOf(v) : v}
                </span>
            );
        if (c.labelOf) return c.labelOf(v);
        return String(v);
    };

    const PageLayout = HrAppLayout;

    return (
        <PageLayout title={title} subtitle={subtitle}>
            <div className="att-content">
                {error && <div className="att-error">{error}</div>}
                {loading && <div className="att-loading">{L("Đang tải...")}</div>}
                {!loading && !error && (
                    <>
                    {hero.ico && (
                        <HrHero
                            ico={hero.ico}
                            title={title}
                            sub={hero.sub || subtitle}
                        />
                    )}
                    <div className="att-card">
                        <div className="admin-toolbar">
                            <label className="admin-search">
                                <span aria-hidden="true">⌕</span>
                                <input
                                    type="search"
                                    placeholder={L(searchPlaceholder)}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label={L(searchPlaceholder)}
                                />
                            </label>
                            {filter?.options && filter.options.length > 0 && (
                                <select
                                    value={filterVal}
                                    onChange={(e) =>
                                        setFilterVal(e.target.value)
                                    }
                                >
                                    <option value="">{L("Tất cả")}</option>
                                    {filter.options.map(([v, l]) => (
                                        <option key={v} value={v}>
                                            {l}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <span className="att-muted">
                                {filtered.length} {L("bản ghi")}
                            </span>
                            <button
                                type="button"
                                className="admin-link-btn"
                                onClick={exportCsv}
                            >
                                {L("⬇ Xuất CSV")}
                            </button>
                        </div>

                        <div className="att-table-wrap att-table-wrap--stack">
                            <table className="att-table att-table--stack">
                                <thead>
                                    <tr>
                                        {columns.map((c) => (
                                            <th key={c.key} data-label={c.label}>{c.label}</th>
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
                                                    L("Không có dữ liệu.")}
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((x, i) => (
                                            <tr key={x.id || i}>
                                                {columns.map((c) => (
                                                    <td key={c.key} data-label={c.label}>
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
                    </>
                )}
            </div>
        </PageLayout>
    );
};

export default EmployeeListPage;
