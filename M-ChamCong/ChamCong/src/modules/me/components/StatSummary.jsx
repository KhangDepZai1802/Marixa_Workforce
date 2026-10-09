import { hoursShort } from "./statUtils";

// Tóm tắt tổng giờ và tăng ca trong hai thẻ gọn.
const StatSummary = ({ stats }) => {
    const missingHours = Math.max(0, stats.standardMin - stats.hoursWorked);
    const overtime = stats.otWeekday + stats.otWeekend + stats.otHoliday;
    return (
        <div className="att-stat-bottom">
            <div className="att-card att-stat-card att-stat-compact">
                <div className="att-stat-tile-head">
                    <span className="att-stat-tile-icon" aria-hidden="true">◷</span>
                    <span className="att-stat-tile-arrow" aria-hidden="true">⌄</span>
                </div>
                <h2 className="att-stat-title">Tổng giờ</h2>
                <strong className="att-stat-tile-value">{hoursShort(stats.hoursWorked)}</strong>
                <p className="att-stat-tile-sub">
                    Chuẩn {hoursShort(stats.standardMin)} <span>·</span> Thiếu {hoursShort(missingHours)}
                </p>
            </div>
            <div className="att-card att-stat-card att-stat-compact">
                <div className="att-stat-tile-head">
                    <span className="att-stat-tile-icon" aria-hidden="true">↗</span>
                    <span className="att-stat-tile-arrow" aria-hidden="true">⌄</span>
                </div>
                <h2 className="att-stat-title">Tăng ca</h2>
                <strong className="att-stat-tile-value">{hoursShort(overtime)}</strong>
                <p className="att-stat-tile-sub" title={`Ngày thường ${hoursShort(stats.otWeekday)} · Cuối tuần ${hoursShort(stats.otWeekend)} · Lễ ${hoursShort(stats.otHoliday)}`}>
                    Thường {hoursShort(stats.otWeekday)} <span>·</span> Cuối tuần {hoursShort(stats.otWeekend)} <span>·</span> Lễ {hoursShort(stats.otHoliday)}
                </p>
            </div>
        </div>
    );
};

export default StatSummary;
