import "./hr-hero.css";

// Hero banner dùng chung cho các trang quản trị nhân sự (phong cách block-accounts):
// - Nền tối gradient, icon + tiêu đề + mô tả bên trái.
// - Dải KPI chip bên phải (đổi tone: blue/green/red/gray/warn/ok).
const HrHero = ({ ico, title, sub, kpis }) => {
    return (
        <div className="hr-hero">
            <div className="hr-hero-left">
                {ico && <span className="hr-hero-ico" aria-hidden="true">{ico}</span>}
                <div>
                    {title && <h2>{title}</h2>}
                    {sub && <p>{sub}</p>}
                </div>
            </div>
            {kpis && kpis.length > 0 && (
                <div className="hr-kpi-row" role="list">
                    {kpis.map((k, i) => (
                        <div
                            key={k.label + i}
                            role="listitem"
                            className={`hr-kpi${k.tone ? ` hr-kpi--${k.tone}` : ""}`}
                        >
                            {k.ico && <span className="hr-kpi-ico" aria-hidden="true">{k.ico}</span>}
                            <div>
                                <span className="hr-kpi-label">{k.label}</span>
                                <strong>{k.value}</strong>
                                {k.sub && <small className="hr-kpi-sub">{k.sub}</small>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HrHero;
