import { hoursShort } from "./statUtils";

// KPI "Ngày công / Giờ làm / Đi trễ / Nghỉ phép".
const StatKpis = ({ stats }) => {
    const missingDays = Math.max(0, stats.expectedWorkdays - stats.daysWorked);
    const missingHours = Math.max(0, stats.standardMin - stats.hoursWorked);

    return (
        <>
            <div className="att-stat-kpi-grid">
                <div className="att-card att-stat-kpi">
                    <div className="att-stat-tile-head"><span className="att-stat-tile-icon" aria-hidden="true">▦</span><span className="att-stat-tile-arrow" aria-hidden="true">⌄</span></div>
                    <span className="att-kpi-label">Ngày công</span>
                    <div className="att-stat-value">
                        <strong>{stats.daysWorked}</strong>
                        <span className="att-stat-fraction">
                            / {stats.expectedWorkdays}
                        </span>
                    </div>
                    <span className="att-stat-unit">ngày công</span>
                    <span className="att-stat-sub">
                        {missingDays > 0
                            ? `Còn thiếu ${missingDays} ngày`
                            : "✓ Đủ ngày công kỳ vọng"}
                    </span>
                </div>

                <div className="att-card att-stat-kpi">
                    <div className="att-stat-tile-head"><span className="att-stat-tile-icon" aria-hidden="true">◷</span><span className="att-stat-tile-arrow" aria-hidden="true">⌄</span></div>
                    <span className="att-kpi-label">Giờ làm</span>
                    <div className="att-stat-value">
                        <strong>{hoursShort(stats.hoursWorked)}</strong>
                        <span className="att-stat-fraction">
                            / {hoursShort(stats.standardMin)}
                        </span>
                    </div>
                    <span className="att-stat-unit">giờ công</span>
                    <span className="att-stat-sub">
                        {missingHours > 0
                            ? `Còn thiếu ${hoursShort(missingHours)}`
                            : "✓ Đủ giờ công kỳ vọng"}
                    </span>
                </div>

                <div className="att-card att-stat-kpi">
                    <div className="att-stat-tile-head"><span className="att-stat-tile-icon warn" aria-hidden="true">!</span><span className="att-stat-tile-arrow" aria-hidden="true">⌄</span></div>
                    <span className="att-kpi-label">Đi trễ</span>
                    <div className="att-stat-value">
                        <strong>{stats.late}</strong>
                    </div>
                    <span className="att-stat-unit">lần</span>
                    <span className="att-stat-sub">
                        {stats.late > 0
                            ? `${stats.late} lần đi trễ trong tháng`
                            : "✓ Không có lần đi trễ"}
                    </span>
                </div>

                <div className="att-card att-stat-kpi">
                    <div className="att-stat-tile-head"><span className="att-stat-tile-icon" aria-hidden="true">☼</span><span className="att-stat-tile-arrow" aria-hidden="true">⌄</span></div>
                    <span className="att-kpi-label">Nghỉ phép</span>
                    <div className="att-stat-value">
                        <strong>{stats.leaveDays}</strong>
                    </div>
                    <span className="att-stat-unit">ngày</span>
                    <span className="att-stat-sub">
                        {stats.hasQuota
                            ? `Phép còn lại: ${Math.round(stats.remainingLeave)} ngày`
                            : "Chưa cấu hình hạn mức phép"}
                    </span>
                </div>
            </div>
        </>
    );
};

export default StatKpis;
