import { dotClass, dayStatusText } from "./statUtils";
import { useLanguage, localeForLanguage } from "../../../services/i18n/LanguageProvider";

// Lệnh công tháng: lưới T2..CN + chấm trạng thái + chú giải.
const StatCalendar = ({ ym, weeks }) => {
    const { language } = useLanguage();
    const monthName = new Date(ym.y, ym.m, 1).toLocaleDateString(localeForLanguage(language), {
        month: "long",
        year: "numeric",
    });

    return (
        <div className="att-card att-stat-card att-stat-calendar">
            <h2 className="att-stat-title">📅 Lịch công {monthName}</h2>
            <div className="att-cal">
                <div className="att-cal-head">
                    {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                        <span
                            key={d}
                            className={
                                d === "CN" ? "att-cal-hd last" : "att-cal-hd"
                            }
                        >
                            {d}
                        </span>
                    ))}
                </div>
                <div className="att-cal-grid">
                    {weeks.map((week, wi) => (
                        <div className="att-cal-row" key={wi}>
                            {week.map((cell, ci) => (
                                <div
                                    key={ci}
                                    className={`att-cal-cell ${
                                        cell.code === "rest" ? "rest" : ""
                                    } status-${cell.code}`}
                                >
                                    <span className="att-cal-num">
                                        {cell.date.getDate()}
                                    </span>
                                    <span
                                        className={`att-cal-dot ${dotClass(
                                            cell.code
                                        )}`}
                                        title={dayStatusText(cell.code)}
                                    >
                                        {cell.code === "rest"
                                            ? "—"
                                            : cell.code === "future" ||
                                                cell.code === "nodata"
                                            ? "·"
                                            : "●"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="att-cal-legend">
                    <span><i className="att-cal-dot ok" /> Đủ công</span>
                    <span><i className="att-cal-dot warn" /> Thiếu công</span>
                    <span><i className="att-cal-dot bad" /> Vắng</span>
                    <span><i className="att-cal-dot info" /> Nghỉ phép</span>
                    <span><i className="att-cal-dot nodata" /> Chưa chấm</span>
                    <span><i className="att-cal-dot future" /> Chưa tới</span>
                    <span><i className="att-cal-dot rest" /> — Cuối tuần / lễ</span>
                </div>
            </div>
        </div>
    );
};

export default StatCalendar;
