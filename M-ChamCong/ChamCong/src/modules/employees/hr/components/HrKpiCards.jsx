// 2 thẻ KPI nhân sự (đã bỏ 2 KPI chấm công).
const HrKpiCards = ({ kpis }) => {
    const cards = [
        {
            icon: "📄",
            title: "Hợp đồng sắp hết hạn",
            value: kpis.noContractEnd,
            of: kpis.activeCount,
            sub: `${kpis.noContractEnd} người chưa có hợp đồng / chưa nhập ngày hết hạn`,
            tone: "warn",
        },
        {
            icon: "💰",
            title: "Hồ sơ đủ để tính lương",
            value: kpis.readyForPayroll,
            of: kpis.activeCount,
            sub: `trên ${kpis.activeCount} hồ sơ · ${kpis.missingSalary} hồ sơ còn thiếu`,
            tone: "ok",
        },
    ];

    return (
        <div className="hr-kpi-row">
            {cards.map((c) => (
                <div
                    key={c.title}
                    className={`hr-card hr-card--${c.tone}`}
                >
                    <div className="hr-card-head">
                        <span className="hr-card-icon">{c.icon}</span>
                        <span className="hr-card-title">{c.title}</span>
                    </div>
                    <div className="hr-card-value">
                        <strong>{c.value}</strong>
                        <span className="hr-card-of">/{c.of}</span>
                    </div>
                    <p className="hr-card-sub">{c.sub}</p>
                </div>
            ))}
        </div>
    );
};

export default HrKpiCards;
