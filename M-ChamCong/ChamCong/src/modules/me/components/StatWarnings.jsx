import { Link } from "react-router-dom";

// Khối cảnh báo "Bạn cần kiểm tra" (chỉ hiện khi có việc cần xử lý).
const StatWarnings = ({ warnings }) => {
    const hasItems = warnings.list.length > 0 || warnings.noDataDays > 0;
    if (!hasItems) return null;
    const count = warnings.list.length + (warnings.noDataDays > 0 ? 1 : 0);
    const preview = warnings.list[0] || `${warnings.noDataDays} ngày chưa có dữ liệu chấm công`;

    return (
        <div className="att-card att-stat-card att-stat-warn">
            <div className="att-stat-tile-head">
                <span className="att-stat-tile-icon warn" aria-hidden="true">!</span>
                <Link className="att-stat-tile-arrow" to="/attendance/attendance-history" aria-label="Xem chi tiết cảnh báo">↗</Link>
            </div>
            <h2 className="att-stat-title">Bạn cần kiểm tra</h2>
            <strong className="att-stat-tile-value">{count} mục</strong>
            <p className="att-stat-tile-sub" title={preview}>{preview}</p>
        </div>
    );
};

export default StatWarnings;
