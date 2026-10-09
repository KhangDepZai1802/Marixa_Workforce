import { formatVnTime, formatVnDate, calcOvertime, formatOvertime } from "../../../utils/vnTime";
import PhotoCell from "./PhotoCell";
import { statusLabel, statusClass, approvalLabel, approvalClass } from "../../employees/attendance/labels";

// Bảng lịch sử chấm công của NHÂN VIÊN (display-only).
// Cùng phong cách compact với trang /employees/attendance-history nhưng
// KHÔNG hiện nút Sửa / Xóa / Xem chi tiết — chỉ hiển thị.
// Các ô <td data-label> dùng để CSS mobile biến bảng thành thẻ xếp dọc.
const HistoryTable = ({ history }) => {
    if (!history || history.length === 0) {
        return (
            <section className="att-card">
                <p className="att-muted">Chưa có bản ghi chấm công nào.</p>
            </section>
        );
    }

    return (
        <div className="att-content attendance-history-compact">
            <section className="att-card">
                <div className="att-table-wrap att-table-wrap--stack">
                    <table className="att-table att-table--stack">
                        <thead>
                            <tr>
                                <th>Ngày</th>
                                <th className="att-col-status">Trạng thái</th>
                                <th>Giờ vào</th>
                                <th>Giờ ra</th>
                                <th className="att-col-actual">Giờ thực</th>
                                <th className="att-col-ot">Tăng ca</th>
                                <th className="att-col-photo">Ảnh vào ca</th>
                                <th className="att-col-photo">Ảnh ra ca</th>
                                <th className="att-col-approval">Duyệt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((row) => (
                                <tr key={row.id}>
                                    <td data-label="Ngày">{formatVnDate(row.attendanceDate)}</td>
                                    <td className="att-col-status" data-label="Trạng thái">
                                        <span className={`att-badge ${statusClass(row.status)}`}>
                                            {statusLabel(row.status)}
                                        </span>
                                    </td>
                                    <td data-label="Giờ vào">{formatVnTime(row.checkInTime) || "—"}</td>
                                    <td data-label="Giờ ra">{formatVnTime(row.checkOutTime) || "—"}</td>
                                    <td className="att-col-actual" data-label="Giờ thực">{row.actualHours != null ? `${row.actualHours}h` : "—"}</td>
                                    <td className="att-col-ot" data-label="Tăng ca">{(() => { const ot = calcOvertime(row); return ot > 0 ? <i className="att-badge warn">+{formatOvertime(ot)}</i> : <span className="att-muted">—</span>; })()}</td>
                                    <td className="att-col-photo" data-label="Ảnh vào ca"><PhotoCell src={row.checkInPhoto} alt="Vào ca" hideYesBadge /></td>
                                    <td className="att-col-photo" data-label="Ảnh ra ca"><PhotoCell src={row.checkOutPhoto} alt="Ra ca" hideYesBadge /></td>
                                    <td className="att-col-approval" data-label="Duyệt">
                                        <div className="att-approval-cell att-approval-cell--view">
                                            <span className={`att-badge ${approvalClass(row.approvalStatus)}`}>
                                                {approvalLabel(row.approvalStatus)}
                                            </span>
                                            {row.approvedAt && <small>{formatVnTime(row.approvedAt)} · {formatVnDate(row.approvedAt)}</small>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default HistoryTable;
