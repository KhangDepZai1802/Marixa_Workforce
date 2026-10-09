import { useState, useEffect } from "react";
import { getAuth } from "../../../services/auth/auth";
import AppLayout from "../../../components/layout/AppLayout";
import relatedApi from "../api/relatedApi";
import "../attendance.css";

const AttendanceRulesPage = () => {
    const auth = getAuth();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        if (!auth?.userId) {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const [res, profRes] = await Promise.all([
                    relatedApi.attendanceRulesActive(),
                    relatedApi.employeeByUser(auth.userId).catch(() => ({ data: { data: null } })),
                ]);
                setProfile(profRes.data?.data || null);
                setRules(res.data?.data || []);
            } catch (err) {
                setError(err.response?.data?.message || err.message || "Không tải được quy định.");
            } finally {
                setLoading(false);
            }
        })();
    }, [auth?.userId]);

    // Format phút -> "Xh Ym"
    const fmtMin = (m) => {
        if (!m) return "0 phút";
        const h = Math.floor(m / 60), r = m % 60;
        return h ? `${h}h${r ? ` ${r}m` : ""}` : `${r} phút`;
    };

    const fmtHours = (h) => (h ? `${h}h` : "—");

    const timeToBadge = (t) => {
        if (!t) return "—";
        return <span className="att-badge info">{t}</span>;
    };

    const ruleCard = (r, idx) => {
        const accent = ["#2f6df6", "#16a085", "#e67e22", "#8e44ad"][idx % 4];
        return (
            <article
                key={r.id}
                className="att-card rule-card"
                style={{ borderTop: `3px solid ${accent}` }}
            >
                <header className="rule-head">
                    <div className="rule-head-left">
                        <span className="rule-ava" style={{ background: accent }}>
                            {(r.code || "?").slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                            <h3>{r.name}</h3>
                            <p>{r.description || "Chưa có mô tả"}</p>
                        </div>
                    </div>
                    <i className="att-badge ok">Hiệu lực</i>
                </header>

                {r.description && <p className="rule-desc">{r.description}</p>}

                <div className="rule-grid">
                    <div className="rule-tile">
                        <span>Giờ vào</span>
                        <strong>{timeToBadge(r.checkInTime)}</strong>
                    </div>
                    <div className="rule-tile">
                        <span>Giờ ra</span>
                        <strong>{timeToBadge(r.checkOutTime)}</strong>
                    </div>
                    <div className="rule-tile">
                        <span>Số giờ chuẩn</span>
                        <strong>{fmtHours(r.standardHours)}</strong>
                    </div>
                    <div className="rule-tile rule-tile--break">
                        <span>Nghỉ giữa ca</span>
                        <strong>{r.breakMinutes ? "12:00 - 13:00" : "—"}</strong>
                        <small>{r.breakMinutes ? "Nghỉ trưa 1 giờ, 13:00 vào làm lại" : "Không trừ giờ nghỉ"}</small>
                    </div>
                    <div className="rule-tile">
                        <span>Dung sai đi trễ</span>
                        <strong>{fmtMin(r.lateGraceMinutes)}</strong>
                    </div>
                    <div className="rule-tile">
                        <span>Ngưỡng về sớm</span>
                        <strong>{fmtMin(r.earlyLeaveThresholdMinutes)}</strong>
                    </div>
                    <div className="rule-tile">
                        <span>Chụp ảnh</span>
                        <strong>
                            <i className={`att-badge ${r.photoRequired ? "ok" : "warn"}`}>
                                {r.photoRequired ? "Bắt buộc" : "Tùy chọn"}
                            </i>
                        </strong>
                    </div>
                    <div className="rule-tile">
                        <span>Định vị GPS</span>
                        <strong>
                            <i className={`att-badge ${r.gpsRequired ? "ok" : "warn"}`}>
                                {r.gpsRequired ? "Bắt buộc" : "Tùy chọn"}
                            </i>
                        </strong>
                    </div>
                </div>

                <footer className="rule-foot">
                    <span className="rule-code">{r.code}</span>
                    <small>Hiệu lực từ {new Date(r.createdTime).toLocaleDateString("vi-VN")}</small>
                </footer>
            </article>
        );
    };

    return (
        <AppLayout
            profile={profile}
            title="Quy định"
            subtitle="Quy định chấm công hiện hành của công ty"
        >
            <div className="att-content">
                {error && (
                    <div className="att-error" role="alert">
                        {error}
                        <button onClick={() => setError("")}>×</button>
                    </div>
                )}
                {loading ? (
                    <div className="att-loading">Đang tải...</div>
                ) : rules.length === 0 ? (
                    <div className="att-card">
                        <h2>Quy định chấm công</h2>
                        <p className="att-muted">
                            Chưa có quy định chấm công nào được công bố. Vui lòng liên hệ quản trị viên.
                        </p>
                    </div>
                ) : (
                    <div className="rules-page">
                        <section className="att-card">
                            <h2>📋 Quy định chấm công</h2>
                            <p className="att-muted">
                                Đây là các quy tắc chấm công hiện hành áp dụng cho toàn công ty.
                                Hãy đọc kỹ trước khi chấm công để tránh bị đánh dấu đi trễ / về sớm.
                            </p>
                        </section>
                        <div className="rules-grid">
                            {rules.map((r, i) => ruleCard(r, i))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default AttendanceRulesPage;
