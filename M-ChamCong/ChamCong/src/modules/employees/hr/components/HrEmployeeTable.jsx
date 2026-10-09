import { STATUS_LABELS, STATUS_TONES } from "../hooks/useHrFilters";
import { docCompleteness } from "../hrUtils";

const MISSING_SECTIONS = [
    "danh tính",
    "pháp lý",
    "liên hệ",
    "điều kiện",
    "hợp đồng",
    "lương&chế độ",
    "bảo hiểm&thue",
    "thanh toán",
];

// Bảng nhân sự: checkbox + Mã NV + Họ tên + Phòng ban + Chức vụ + Trạng thái
// + Hồ sơ (nhóm thiếu) + Xem/Sửa.
const HrEmployeeTable = ({
    employees,
    selected,
    onToggle,
    onToggleAll,
    data,
    onView,
    onEdit,
    onArchive,
    onRestore,
    quickFilter,
}) => {
    const allSelected =
        employees.length > 0 && employees.every((e) => selected.has(e.id));

    return (
        <div className="hr-employee-list">
            <div className="hr-missing-legend" aria-label="Chú thích các nhóm hồ sơ">
                <strong>Còn thiếu:</strong>
                {MISSING_SECTIONS.map((section, index) => (
                    <span key={section}><b>{index + 1}</b> {section === "bảo hiểm&thue" ? "bảo hiểm & thuế" : section === "lương&chế độ" ? "lương & chế độ" : section}</span>
                ))}
            </div>
            <div className="hr-table-wrap">
                <table className="hr-table">
                <thead>
                    <tr>
                        <th className="hr-col-check">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => onToggleAll(allSelected)}
                                aria-label="Chọn tất cả"
                            />
                        </th>
                        <th>Nhân viên</th>
                        <th>Phòng ban</th>
                        <th>Chức vụ</th>
                        <th>Trạng thái</th>
                        <th>Hồ sơ</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    {employees.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="hr-empty">
                                Không có nhân viên nào khớp bộ lọc.
                            </td>
                        </tr>
                    ) : (
                        employees.map((e) => {
                            const comp = docCompleteness(e, data);
                            return (
                                <tr key={e.id}>
                                    <td className="hr-col-check">
                                        <input
                                            type="checkbox"
                                            checked={selected.has(e.id)}
                                            onChange={() => onToggle(e.id)}
                                            aria-label={"Chọn " + e.fullName}
                                        />
                                    </td>
                                    <td><div className="att-emp-cell"><span className="att-emp-code">{e.employeeCode}</span><span className="att-emp-name">{e.fullName}</span></div></td>
                                    <td>{e.departmentName || "—"}</td>
                                    <td>{e.positionName || "—"}</td>
                                    <td>
                                        <span
                                            className={`hr-badge hr-badge--${STATUS_TONES[e.status] || "muted"}`}
                                        >
                                            {STATUS_LABELS[e.status] || "Chưa rõ"}
                                        </span>
                                    </td>
                                    <td className="hr-missing">
                                        {comp.missing.length
                                            ? comp.missing.map((section) => (
                                                <span className="hr-missing-number" key={section} title={section}>
                                                    {MISSING_SECTIONS.indexOf(section) + 1}
                                                </span>
                                            ))
                                            : <span className="hr-missing-complete">Đủ</span>}
                                    </td>
                                    <td>
                                        <div className="hr-row-actions">
                                            <button
                                                type="button"
                                                className="hr-mini-btn"
                                                onClick={() => onView(e)}
                                            >
                                                Xem
                                            </button>
                                            <button
                                                type="button"
                                                className="hr-mini-btn"
                                                onClick={() => onEdit(e)}
                                            >
                                                Sửa
                                            </button>
                                            {!e.isArchived && [1, 2, 3].includes(e.status) && quickFilter !== "resigned" && (
                                                <button
                                                    type="button"
                                                    className="hr-mini-btn hr-mini-btn--archive"
                                                    onClick={() => onArchive(e)}
                                                >
                                                    Lưu trữ
                                                </button>
                                            )}
                                            {e.isArchived && (
                                                <button
                                                    type="button"
                                                    className="hr-mini-btn hr-mini-btn--restore"
                                                    onClick={() => onRestore(e)}
                                                >
                                                    Khôi phục
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
                </table>
            </div>
        </div>
    );
};

export default HrEmployeeTable;
