import { useMemo } from "react";
import { translate, useLanguage } from "../../../../services/i18n/LanguageProvider";
import { statusLabel, statusClass } from "../labels";
import { formatVnDate, formatVnTime } from "../../../../utils/vnTime";

// Modal chi tiết chấm công của 1 nhân viên trong 1 tháng.
// Hiển thị bảng ngày / giờ vào / giờ ra / giờ thực tế + tổng kết cuối trang.
const AttendanceDetailModal = ({ monthRows, employeeLabel, onClose }) => {
    const { language } = useLanguage();
    const L = (text) => translate(text, language);
    const summary = useMemo(() => {
        const total = monthRows.length;
        const worked = monthRows.filter((r) => [1, 2, 3].includes(r.status)).length;
        const late = monthRows.filter((r) => r.status === 2).length;
        const absent = monthRows.filter((r) => r.status === 4).length;
        const leave = monthRows.filter((r) => r.status === 5).length;
        const hours = monthRows.reduce((sum, r) => sum + (r.actualHours || 0), 0);
        return { total, worked, late, absent, leave, hours };
    }, [monthRows]);

    const sorted = useMemo(
        () => [...monthRows].sort((a, b) => new Date(a.attendanceDate) - new Date(b.attendanceDate)),
        [monthRows]
    );

    return (
        <div className="att-guide-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <section className="att-detail-modal" role="dialog" aria-modal="true">
                <header className="att-detail-modal-head">
                    <div>
                        <h2>{L("Chi tiết chấm công")}</h2>
                        <p>{employeeLabel}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={L("Đóng")}>×</button>
                </header>

                <div className="att-detail-summary">
                    <div className="att-detail-stat"><span>{L("Tổng")}</span><strong>{summary.total}</strong></div>
                    <div className="att-detail-stat att-detail-stat--ok"><span>{L("Công")}</span><strong>{summary.worked}</strong></div>
                    <div className="att-detail-stat att-detail-stat--warn"><span>{L("Đi trễ")}</span><strong>{summary.late}</strong></div>
                    <div className="att-detail-stat att-detail-stat--bad"><span>{L("Vắng")}</span><strong>{summary.absent}</strong></div>
                    <div className="att-detail-stat att-detail-stat--info"><span>{L("Nghỉ phép")}</span><strong>{summary.leave}</strong></div>
                    <div className="att-detail-stat"><span>{L("Tổng giờ")}</span><strong>{summary.hours}h</strong></div>
                </div>

                {(() => {
                    const changed = sorted.filter((r) => r.changeSummary);
                    if (changed.length === 0) return null;
                    return (
                        <div className="att-detail-changes">
                            <strong>{L("Nội dung đã sửa")}</strong>
                            {changed.map((r) => (
                                <div key={r.id} className="att-detail-change-row">
                                    <span className="att-muted">{formatVnDate(r.attendanceDate)}</span>
                                    <span>{r.changeSummary}</span>
                                    {r.lastUpdatedBy && (
                                        <small className="att-muted">
                                            · {r.lastUpdatedBy} · {formatVnDate(r.lastUpdatedTime)} {formatVnTime(r.lastUpdatedTime)}
                                        </small>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {sorted.length === 0 ? (
                    <p className="att-muted">{L("Không có bản ghi trong tháng này.")}</p>
                ) : (
                    <div className="att-table-wrap">
                        <table className="att-table att-table--compact">
                            <thead>
                                <tr>
                                    <th>{L("Ngày")}</th>
                                    <th>{L("Giờ vào")}</th>
                                    <th>{L("Giờ ra")}</th>
                                    <th>{L("Giờ thực tế")}</th>
                                    <th>{L("Trạng thái")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((row) => (
                                    <tr key={row.id}>
                                        <td>{formatVnDate(row.attendanceDate)}</td>
                                        <td>{formatVnTime(row.checkInTime) || "—"}</td>
                                        <td>{formatVnTime(row.checkOutTime) || "—"}</td>
                                        <td>{row.actualHours != null ? `${row.actualHours}h` : "—"}</td>
                                        <td>
                                            <span className={`att-badge ${statusClass(row.status)}`}>
                                                {L(statusLabel(row.status))}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <footer>
                    <button type="button" className="admin-link-btn" onClick={onClose}>{L("Đóng")}</button>
                </footer>
            </section>
        </div>
    );
};

export default AttendanceDetailModal;
