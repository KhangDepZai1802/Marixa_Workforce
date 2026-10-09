import { useState, useEffect, useCallback } from "react";
import { getAuth } from "../../../services/auth/auth";
import AppLayout from "../../../components/layout/AppLayout";
import AttendanceCard from "../components/AttendanceCard";
import relatedApi from "../api/relatedApi";
import "../attendance.css";

const AttendancePage = () => {
    const auth = getAuth();
    const userId = auth?.userId;
    const employeeId = auth?.employeeId;

    const [profile, setProfile] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Bản ghi chấm công của HÔM NAY (để card chấm công + lịch sử đồng bộ)
    const todayRecord =
        history.find(
            (r) =>
                r.attendanceDate &&
                new Date(r.attendanceDate).toDateString() ===
                    new Date().toDateString()
        ) || null;

    const loadAttendance = useCallback(async () => {
        if (!employeeId) return [];
        const res = await relatedApi.attendanceByEmployee(employeeId);
        const data = res.data.data || [];
        setHistory(data);
        return data;
    }, [employeeId]);

    useEffect(() => {
        const load = async () => {
            if (!userId) {
                setError("Chưa xác định được tài khoản đang đăng nhập.");
                setLoading(false);
                return;
            }

            try {
                const profileRes = await relatedApi.employeeByUser(userId);
                setProfile(profileRes.data.data || null);

                if (employeeId) {
                    await loadAttendance();
                }
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                        err.message ||
                        "Không thể tải dữ liệu chấm công."
                );
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [userId, employeeId, loadAttendance]);

    // Sau khi chấm công: làm mới lại bản ghi hôm nay
    const handleChecked = () => {
        loadAttendance().catch(() => {});
    };

    return (
        <AppLayout profile={profile}>
            {error && <div className="att-error">{error}</div>}
            {loading ? (
                <div className="att-loading">Đang tải...</div>
            ) : (
                <AttendanceCard
                    employeeId={employeeId}
                    record={todayRecord}
                    history={history}
                    onChanged={handleChecked}
                />
            )}
        </AppLayout>
    );
};

export default AttendancePage;
