import { useState, useEffect, useMemo } from "react";
import AdminAppLayout from "../../layout/AdminAppLayout";
import HrAppLayout from "../../../employees/hr/layout/HrAppLayout";
import adminApi from "../../api/adminApi";
import employeeApi from "../../../employees/api/employeeApi";
import "../../../../modules/me/attendance.css";
import "../../admin.css";
import HrHero from "../../../employees/hr/HrHero";
import { localeForLanguage, translate, useLanguage } from "../../../../services/i18n/LanguageProvider";

// 5 trạng thái hợp đồng (tính từ endDate so với hôm nay, giờ VN).
const CONTRACT_STATUS = {
    expired: { label: "Hết hạn", cls: "bad" },
    expiring: { label: "Sắp hết hạn", cls: "warn" },
    pending: { label: "Chờ ký", cls: "info" },
    none: { label: "Chưa lập", cls: "muted" },
    signed: { label: "Đã ký", cls: "ok" },
};

const daysUntil = (iso) => {
    const now = new Date();
    const end = new Date(iso);
    return Math.round((end - now) / 86400000);
};

const contractStateOf = (e, contracts) => {
    const c = contracts.find((x) => x.employeeId === e.id);
    if (!c) return "none";
    if (!c.endDate) return "signed";
    const d = daysUntil(c.endDate);
    if (d < 0) return "expired";
    if (d <= 30) return "expiring";
    return "signed";
};

const normalizeSearch = (v) =>
    String(v || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .toLocaleLowerCase("vi-VN");

const AdminContractPage = ({ hrMode = false }) => {
    const [employees, setEmployees] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Bộ lọc
    const [search, setSearch] = useState("");
    const [state, setState] = useState("");

    // Modal tạo hợp đồng
    const [showModal, setShowModal] = useState(false);
    const [empSearch, setEmpSearch] = useState("");
    const [showEmpOptions, setShowEmpOptions] = useState(false);
    const [form, setForm] = useState({
        employeeId: "",
        contractNumber: "",
        contractType: 2,
        startDate: "",
        endDate: "",
    });
    const { language } = useLanguage();
    const locale = localeForLanguage(language);
    const L = (text) => translate(text, language);
    const PageLayout = hrMode ? HrAppLayout : AdminAppLayout;
    const api = hrMode ? employeeApi : adminApi;

    const load = async () => {
        try {
            const [e, c] = await Promise.all([
                api.employees(),
                api.contracts(),
            ]);
            setEmployees(e.data.data?.items || []);
            setContracts(c.data.data?.items || []);
        } catch (err) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    /* eslint-disable react-hooks/exhaustive-deps */
    useEffect(() => {
        load();
    }, []);
    /* eslint-enable react-hooks/exhaustive-deps */

    const stateMap = useMemo(
        () =>
            Object.fromEntries(
                employees.map((e) => [e.id, contractStateOf(e, contracts)])
            ),
        [employees, contracts]
    );

    const PRIORITY = { pending: 1, none: 2, expired: 3, expiring: 4, signed: 5 };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = employees.filter((e) => {
            const s = stateMap[e.id];
            if (state && s !== state) return false;
            if (q) {
                const hit =
                    (e.fullName || "").toLowerCase().includes(q) ||
                    (e.employeeCode || "").toLowerCase().includes(q);
                if (!hit) return false;
            }
            return true;
        });
        if (!state) {
            list.sort(
                (a, b) =>
                    (PRIORITY[stateMap[a.id]] || 9) -
                    (PRIORITY[stateMap[b.id]] || 9)
            );
        }
        return list;
    }, [employees, search, state, stateMap]);

    const counts = useMemo(() => {
        const c = { expired: 0, expiring: 0, pending: 0, none: 0, signed: 0 };
        Object.values(stateMap).forEach((s) => c[s]++);
        return c;
    }, [stateMap]);

    const submitContract = async () => {
        if (!form.employeeId || !form.contractNumber) {
            alert(L("Chọn nhân viên và nhập số hợp đồng."));
            return;
        }
        try {
            await api.createContract({
                employeeId: form.employeeId,
                contractNumber: form.contractNumber,
                contractType: Number(form.contractType),
                startDate: form.startDate || new Date().toISOString().slice(0, 10),
                endDate: form.endDate || null,
            });
            setShowModal(false);
            setForm({
                employeeId: "",
                contractNumber: "",
                contractType: 2,
                startDate: "",
                endDate: "",
            });
            setEmpSearch("");
            load();
        } catch (err) {
            alert(L("Tạo thất bại:") + " " + (err.response?.data?.message || err.message));
        }
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const openModal = () => {
        setEmpSearch("");
        setShowEmpOptions(false);
        setShowModal(true);
    };

    const empTerm = normalizeSearch(empSearch.trim());
    const empOptions = empTerm
        ? employees
              .filter((e) => [1, 2, 3].includes(e.status))
              .filter((e) =>
                  normalizeSearch(`${e.fullName} ${e.employeeCode}`).includes(empTerm)
              )
              .slice(0, 8)
        : [];

    return (
        <PageLayout
            title={L("Hợp đồng lao động")}
            subtitle={L("Quản lý hợp đồng: hết hạn · sắp hết hạn · chờ ký · chưa lập · đã ký")}
        >
            <div className="att-content">
                {error && <div className="att-error">{error}</div>}
                {loading && <div className="att-loading">{L("Đang tải...")}</div>}

                {!loading && !error && (
<>
                        <HrHero
                            ico="📄"
                            title={L("Hợp đồng lao động")}
                            sub={L("Quản lý hợp đồng: hết hạn · sắp hết hạn · chờ ký · chưa lập · đã ký.")}
                            kpis={[
                                { ico: "📄", label: L("Tổng hồ sơ"), value: employees.length, tone: "blue" },
                                { ico: "✅", label: L("Đã ký"), value: counts.signed, tone: "green" },
                                { ico: "⚠", label: L("Sắp hết hạn"), value: counts.expiring, tone: "warn" },
                                { ico: "✕", label: L("Hết hạn"), value: counts.expired, tone: "red" },
                                { ico: "📝", label: L("Chưa lập"), value: counts.none, tone: "gray" },
                            ]}
                        />

                        {/* Thanh tìm kiếm + tạo + tải lại */}
                        <div className="admin-toolbar contract-toolbar">
                            <div className="admin-search">
                                <span>⌕</span>
                                <input
                                    type="search"
                                    placeholder={L("Tìm tên, mã NV...")}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label={L("Tìm nhân viên")}
                                />
                            </div>
                            <select
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                            >
                                <option value="">{L("Tất cả trạng thái")}</option>
                                <option value="expired">{L("Hết hạn")} ({counts.expired})</option>
                                <option value="expiring">{L("Sắp hết hạn")} ({counts.expiring})</option>
                                <option value="pending">{L("Chờ ký")}</option>
                                <option value="none">{L("Chưa lập")} ({counts.none})</option>
                                <option value="signed">{L("Đã ký")} ({counts.signed})</option>
                            </select>
                            <span className="att-muted">
                                {filtered.length} {L("hồ sơ")}
                            </span>
                            <button
                                type="button"
                                className="admin-link-btn"
                                onClick={load}
                            >
                                {L("⟳ Tải lại")}
                            </button>
                            <button
                                type="button"
                                className="admin-link-btn"
                                onClick={openModal}
                            >
                                {L("+ Tạo hợp đồng")}
                            </button>
                        </div>

                        <div className="att-card">
                            <div className="att-table-wrap att-table-wrap--stack">
                                <table className="att-table att-table--stack">
                                    <thead>
                                        <tr>
                                            <th data-label="Nhân viên">{L("Nhân viên")}</th>
                                            <th data-label="Phòng ban">{L("Phòng ban")}</th>
                                            <th data-label="Số HĐ">{L("Số HĐ")}</th>
                                            <th data-label="Loại">{L("Loại")}</th>
                                            <th data-label="Bắt đầu">{L("Bắt đầu")}</th>
                                            <th data-label="Hết hạn">{L("Hết hạn")}</th>
                                            <th data-label="Trạng thái">{L("Trạng thái")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="att-muted">
                                                    {L("Không có hợp đồng phù hợp.")}
                                                </td>
                                            </tr>
                                        ) : (
                                            filtered.map((e) => {
                                                const c = contracts.find(
                                                    (x) => x.employeeId === e.id
                                                );
                                                const s = stateMap[e.id];
                                                return (
                                                    <tr key={e.id}>
                                                        <td data-label="Nhân viên">
                                                            <div className="att-emp-cell">
                                                                <span className="att-emp-code">{e.employeeCode}</span>
                                                                <span className="att-emp-name">{e.fullName}</span>
                                                            </div>
                                                        </td>
                                                        <td data-label="Phòng ban">
                                                            {e.departmentName || "—"}
                                                        </td>
                                                        <td data-label="Số HĐ">
                                                            {c
                                                                ? c.contractNumber
                                                                : "—"}
                                                        </td>
                                                        <td data-label="Loại">
                                                            {
                                                                ({
                                                                    1: L("Thử việc"),
                                                                    2: L("Hạn định"),
                                                                    3: L("Không xác định"),
                                                                    4: L("Mùa vụ"),
                                                                })[
                                                                    c
                                                                        ? c.contractType
                                                                        : 0
                                                                ] || "—"
                                                            }
                                                        </td>
                                                        <td data-label="Bắt đầu">
                                                            {c?.startDate
                                                                ? new Date(
                                                                      c
                                                                          .startDate
                                                                  ).toLocaleDateString(
                                                                      locale
                                                                  )
                                                                : "—"}
                                                        </td>
                                                        <td data-label="Hết hạn">
                                                            {c?.endDate
                                                                ? new Date(
                                                                      c
                                                                          .endDate
                                                                  ).toLocaleDateString(
                                                                      locale
                                                                  )
                                                                : c
                                                                ? L("Không xác định")
                                                                : "—"}
                                                        </td>
                                                        <td data-label="Trạng thái">
                                                            <span
                                                                className={`att-badge ${CONTRACT_STATUS[s].cls}`}
                                                            >
                                                                {
                                                                    L(CONTRACT_STATUS[s].label)
                                                                }
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {showModal && (
                            <div className="att-overlay" onClick={() => setShowModal(false)}>
                                <div
                                    className="att-form-modal"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="att-form">
                                    <div className="att-form-head">
                                        <h2>{L("Tạo hợp đồng lao động")}</h2>
                                        <button type="button" className="att-form-close" aria-label={L("Đóng")} onClick={() => setShowModal(false)}>×</button>
                                    </div>
                                    <label>
                                        {L("Nhân viên")}
                                        <select
                                            value={form.employeeId}
                                            onChange={set("employeeId")}
                                        >
                                            <option value="">
                                                {L("— Chọn nhân viên —")}
                                            </option>
                                            {employees
                                                .filter((e) =>
                                                    [1, 2, 3].includes(e.status) &&
                                                    ["none", "expired"].includes(stateMap[e.id])
                                                )
                                                .map((e) => (
                                                    <option
                                                        key={e.id}
                                                        value={e.id}
                                                    >
                                                        {e.employeeCode} ·{" "}
                                                        {e.fullName}
                                                    </option>
                                                ))}
                                        </select>
                                        <small className="att-muted">
                                            {L("Nhân viên có hợp đồng đang hiệu lực không được tạo hợp đồng mới.")}
                                        </small>
                                    </label>
                                    <label>
                                        {L("Số hợp đồng")}
                                        <input
                                            value={form.contractNumber}
                                            onChange={set("contractNumber")}
                                            placeholder="HD-001"
                                        />
                                    </label>
                                    <label>
                                        {L("Loại hợp đồng")}
                                        <select
                                            value={form.contractType}
                                            onChange={set("contractType")}
                                        >
                                            <option value={1}>{L("Thử việc")}</option>
                                            <option value={2}>{L("Hạn định")}</option>
                                            <option value={3}>
                                                {L("Không xác định")}
                                            </option>
                                            <option value={4}>{L("Mùa vụ")}</option>
                                        </select>
                                    </label>
                                    <label>
                                        {L("Ngày bắt đầu")}
                                        <input
                                            type="date"
                                            value={form.startDate}
                                            onChange={set("startDate")}
                                        />
                                    </label>
                                    <label>
                                        {L("Ngày hết hạn")}
                                        <input
                                            type="date"
                                            value={form.endDate}
                                            onChange={set("endDate")}
                                        />
                                    </label>
                                    <div className="att-form-actions">
                                        <button
                                            type="button"
                                            className="att-form-btn"
                                            onClick={() => setShowModal(false)}
                                        >
                                            {L("Hủy")}
                                        </button>
                                        <button
                                            type="button"
                                            className="att-form-btn att-form-btn--primary"
                                            onClick={submitContract}
                                        >
                                            {L("Lưu hợp đồng")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </PageLayout>
    );
};

export default AdminContractPage;
