import { useState, useEffect, useMemo } from "react";
import { getAuth } from "../../../services/auth/auth";
import AppLayout from "../../../components/layout/AppLayout";
import relatedApi from "../../me/api/relatedApi";
import { formatVnDate } from "../../../utils/vnTime";
import { AvatarBlock } from "../components/AvatarBlock";
import "../../me/attendance.css";
import "../profile.css";

const statusLabel = (s) =>
    ({ 1: "Thử việc", 2: "Đang làm", 3: "Tạm nghỉ", 4: "Đã nghỉ việc", 5: "Chấm dứt" })[s] || "—";
const statusTone = (s) =>
    ({ 1: "warn", 2: "ok", 3: "info", 4: "bad", 5: "bad" })[s] || "info";
const genderLabel = (g) => ({ 1: "Nam", 2: "Nữ" })[g] || "—";
const laborLabel = (t) =>
    ({ 1: "Chính thức", 2: "Bán thời gian", 3: "Thực tập", 4: "Cộng tác" })[t] || "—";

const ProfilePage = () => {
    const auth = getAuth();
    const userId = auth?.userId;

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const notify = (msg) => {
        setNotice(msg);
        setTimeout(() => setNotice(""), 3000);
    };

    useEffect(() => {
        const load = async () => {
            try {
                if (!userId) {
                    setError("Chưa xác định được tài khoản đang đăng nhập.");
                    setLoading(false);
                    return;
                }
                const res = await relatedApi.employeeByUser(userId);
                setProfile(res.data.data || null);
            } catch (err) {
                setError(err.response?.data?.message || err.message || "Không thể tải hồ sơ.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [userId]);

    const fullName = profile?.fullName || auth?.userName || "—";
    const code = profile?.employeeCode || auth?.employeeCode || "—";

    // Số năm / tháng làm việc
    const tenure = useMemo(() => {
        if (!profile?.startDate) return null;
        const s = new Date(profile.startDate);
        const ms = Date.now() - s.getTime();
        const months = Math.floor(ms / (1000 * 60 * 60 * 24 * 30.4));
        if (months >= 12) return `${Math.floor(months / 12)} năm ${months % 12} tháng`;
        return months > 0 ? `${months} tháng` : "Đang thử việc";
    }, [profile?.startDate]);

    const personal = [
        ["Ngày sinh", profile?.birthDate ? formatVnDate(profile.birthDate) : "—"],
        ["Giới tính", genderLabel(profile?.gender)],
        ["CCCD", profile?.citizenId || "—"],
        ["Điện thoại", profile?.phoneNumber || "—"],
        ["Email", profile?.email || "—"],
        ["Địa chỉ", profile?.permanentAddress || "—"],
    ];
    const work = [
        ["Phòng ban", profile?.departmentName || "—"],
        ["Chức vụ", profile?.positionName || "—"],
        ["Loại hợp đồng", laborLabel(profile?.laborType)],
        ["Ngày vào", profile?.startDate ? formatVnDate(profile.startDate) : "—"],
        ["Thử việc đến", profile?.probationEndDate ? formatVnDate(profile.probationEndDate) : "—"],
        ["Thời gian làm việc", tenure || "—"],
    ];

    return (
        <AppLayout title="Hồ sơ" subtitle="Thông tin cá nhân và tài khoản của bạn" profile={profile}>
            {notice && <div className="profile-notice">{notice}</div>}
            {error && <div className="att-error">{error}</div>}

            {loading ? (
                <div className="att-loading">Đang tải...</div>
            ) : (
                <div className="profile-v2">
                    {/* HERO */}
                    <section className="profile-hero">
                        <div className="profile-hero-avatar">
                            <AvatarBlock auth={auth} notice={notify} size="hero" />
                        </div>
                        <div className="profile-hero-body">
                            <div className="profile-hero-name">
                                <strong>{fullName}</strong>
                                <span className="profile-hero-code">{code}</span>
                            </div>
                            <div className="profile-hero-meta">
                                <span className="att-badge info">{profile?.positionName || "Chưa có chức vụ"}</span>
                                <span className="att-badge" style={{ background: "#eef4ff", color: "#2f6df6" }}>{profile?.departmentName || "Chưa có phòng ban"}</span>
                                <span className={`att-badge ${statusTone(profile?.status)}`}>{statusLabel(profile?.status)}</span>
                            </div>
                        </div>
                    </section>

                    {/* KPI */}
                    <div className="profile-kpi-row">
                        <div className="profile-kpi profile-kpi--blue"><i>⏱</i><div><span>Thời gian làm việc</span><strong>{tenure || "—"}</strong></div></div>
                        <div className="profile-kpi profile-kpi--teal"><i>🏢</i><div><span>Phòng ban</span><strong>{profile?.departmentName || "—"}</strong></div></div>
                        <div className="profile-kpi profile-kpi--green"><i>📋</i><div><span>Trạng thái</span><strong>{statusLabel(profile?.status)}</strong></div></div>
                        <div className="profile-kpi profile-kpi--amber"><i>🆔</i><div><span>Mã nhân viên</span><strong>{code}</strong></div></div>
                    </div>

                    {/* TH thông tin cá nhân + công việc */}
                    <div className="profile-grid">
                        <section className="profile-card">
                            <h2>👤 Thông tin cá nhân</h2>
                            <dl className="profile-info">
                                {personal.map(([label, value]) => (
                                    <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>
                                ))}
                            </dl>
                        </section>

                        <section className="profile-card">
                            <h2>💼 Công việc</h2>
                            <dl className="profile-info">
                                {work.map(([label, value]) => (
                                    <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>
                                ))}
                            </dl>
                        </section>
                    </div>
                </div>
            )}
        </AppLayout>
    );
};

export default ProfilePage;
