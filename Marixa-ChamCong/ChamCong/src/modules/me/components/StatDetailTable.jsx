import { formatVnTime, calcOvertime, formatOvertime } from "../../../utils/vnTime";
import { pad2 } from "./statUtils";

// Bảng chi tiết chấm công trong tháng (đồng bộ lịch sử chấm công).
const StatDetailTable = ({ monthRows, holidayMap }) => {
    if (!monthRows.length) {
        return (
            <div className="att-card att-stat-card">
                <h2 className="att-stat-title">Chi tiết chấm công</h2>
                <p className="att-muted">
                    Chưa có bản ghi chấm công trong tháng này.
                </p>
            </div>
        );
    }

    return (
        <div className="att-card att-stat-card">
            <h2 className="att-stat-title">Chi tiết chấm công</h2>
            <div className="att-table-wrap">
                <table className="att-table att-stat-table">
                    <thead>
                        <tr>
                            <th>Ngày</th>
                            <th>Ca</th>
                            <th>Vào</th>
                            <th>Ra</th>
                            <th>Giờ công</th>
                            <th>OT</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {monthRows.map((row) => {
                            const dd = new Date(row.attendanceDate);
                            const inT = row.checkInTime
                                ? formatVnTime(row.checkInTime)
                                : "";
                            const outT = row.checkOutTime
                                ? formatVnTime(row.checkOutTime)
                                : "";
                            const workHours =
                                row.actualHours != null ? row.actualHours : 0;
                            const overtime = calcOvertime(row);
                            const short =
                                !outT || row.status === 2 || row.status === 3;
                            return (
                                <tr key={row.id}>
                                    <td>
                                        {pad2(dd.getDate())}/
                                        {pad2(dd.getMonth() + 1)}
                                    </td>
                                    <td>{row.plannedShiftName || "Hành chính"}</td>
                                    <td>{inT || "—"}</td>
                                    <td>{outT || "—"}</td>
                                    <td>{workHours > 0 ? workHours + "h" : "—"}</td>
                                    <td>{overtime > 0 ? "+" + formatOvertime(overtime) : "—"}</td>
                                    <td>
                                        <span
                                            className={`att-badge ${short ? "warn" : "ok"}`}
                                        >
                                            {short
                                                ? "● Thiếu công"
                                                : "● Đủ công"}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StatDetailTable;
