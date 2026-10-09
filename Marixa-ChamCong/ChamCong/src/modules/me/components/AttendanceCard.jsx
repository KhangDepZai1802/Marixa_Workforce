import { useState } from "react";
import relatedApi from "../api/relatedApi";
import { formatVnTime } from "../../../utils/vnTime";
import CameraCapture from "./CameraCapture";

const dayNames = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// Dải tuần hiện tại (T2..CN) + số ngày đã chấm.
const buildWeek = (records) => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + mondayOffset
    );
    const keySet = new Set(
        records.map((r) => new Date(r.attendanceDate).toDateString())
    );
    const todayKey = now.toDateString();
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate() + i
        );
        const key = d.toDateString();
        days.push({
            label: dayNames[i],
            num: d.getDate(),
            isToday: key === todayKey,
            checked: keySet.has(key),
        });
    }
    return { days, count: days.filter((d) => d.checked).length };
};



const AttendanceCard = ({ employeeId, record, history, onChanged }) => {
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState("");
    const [error, setError] = useState("");
    // Ảnh vừa chụp, chờ gửi kèm lần chấm công
    const [pendingPhoto, setPendingPhoto] = useState(null);
    // Đổi key sau mỗi lần chấm công -> camera về trạng thái "chưa chụp"
    const [camKey, setCamKey] = useState(0);

    const checkInTime = record?.checkInTime
        ? formatVnTime(record.checkInTime)
        : "";
    const checkOutTime = record?.checkOutTime
        ? formatVnTime(record.checkOutTime)
        : "";
    const isCheckedIn = !!checkInTime;
    const isCheckedOut = !!checkOutTime;

    const week = buildWeek(history || []);

    const todayLabel = !isCheckedIn
        ? "Chưa chấm"
        : isCheckedOut
            ? "Hoàn tất"
            : "Đang làm";

    const check = async (type) => {
        if (!employeeId) {
            setError("Chưa xác định được nhân viên. Vui lòng đăng nhập lại.");
            return;
        }
        // Bắt buộc phải có ảnh chụp mới trước khi chấm công (vào ca / ra ca)
        if (!pendingPhoto) {
            setError(
                type === 1
                    ? "Hãy chụp ảnh trước khi nhấn Vào ca."
                    : "Hãy chụp ảnh trước khi nhấn Ra ca."
            );
            return;
        }
        setBusy(true);
        setError("");
        setDone("");

        try {
            let photoUrl = null;
            if (pendingPhoto) {
                const up = await relatedApi.uploadPhoto(
                    pendingPhoto,
                    type === 1 ? "checkin" : "checkout"
                );
                photoUrl = up.data?.data;
                if (!photoUrl) {
                    // Upload thất bại (VD: server lỗi) -> báo lỗi, không chấm
                    // công im lặng với ảnh rỗng.
                    throw new Error(
                        up.data?.message || "Không tải được ảnh chụp."
                    );
                }
            }

            const response = await relatedApi.checkin(
                employeeId,
                type,
                photoUrl
            );
            const data = response.data.data;
            setDone(
                data?.alreadyRecorded
                    ? data.message || "Đã có lần chấm cùng loại gần đây."
                    : data?.message || "Đã ghi nhận chấm công."
            );
            // Dùng xong ảnh -> xóa luôn để lần ra/vào ca sau phải chụp mới
            setPendingPhoto(null);
            setCamKey((k) => k + 1);
            onChanged?.(data?.attendance || null);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    err.message ||
                    "Chấm công thất bại."
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="att-hero">
            <div className="att-hero-title">
                <h2>Chấm công</h2>
                {!isCheckedOut && (
                    <p>
                        {isCheckedIn
                            ? "Chụp một ảnh của bạn để ra ca."
                            : "Chụp một ảnh của bạn để vào ca."}
                    </p>
                )}
            </div>

            {!isCheckedOut && (
                <CameraCapture
                    key={camKey}
                    onPhoto={setPendingPhoto}
                    locked={busy}
                />
            )}

            {!isCheckedIn && !isCheckedOut ? (
                <div className="att-hero-actions">
                    <button
                        type="button"
                        onClick={() => check(1)}
                        disabled={busy || !pendingPhoto}
                    >
                        Vào ca
                    </button>
                    {!pendingPhoto && (
                        <span className="att-cam-hint">
                            Chụp ảnh trước khi nhấn Vào ca.
                        </span>
                    )}
                </div>
            ) : isCheckedIn && !isCheckedOut ? (
                <div className="att-hero-actions">
                    <button
                        type="button"
                        onClick={() => check(2)}
                        disabled={busy || !pendingPhoto}
                    >
                        Ra ca
                    </button>
                    {!pendingPhoto && (
                        <span className="att-cam-hint">
                            Chụp ảnh trước khi nhấn Ra ca.
                        </span>
                    )}
                </div>
            ) : (
                <div className="att-hero-done">
                    Đã chấm công hôm nay. Cảm ơn bạn!
                </div>
            )}

            <div className="att-hero-times">
                <div className="att-hero-slot">
                    <span className="att-hero-label">Vào ca</span>
                    <strong>{checkInTime || "—"}</strong>
                </div>
                <div className="att-hero-slot">
                    <span className="att-hero-label">Ra ca</span>
                    <strong>{checkOutTime || "—"}</strong>
                </div>
                <div className="att-hero-slot">
                    <span className="att-hero-label">Hôm nay</span>
                    <strong className="att-hero-status">{todayLabel}</strong>
                </div>
            </div>

            <div className="att-week-section">
                <div className="att-week-head">
                    <h2>Tuần này</h2>
                    <span className="att-week-count">
                        <strong>{week.count}</strong> ngày đã chấm
                    </span>
                </div>
                <div className="att-week">
                    {week.days.map((d) => (
                        <div
                            key={d.label}
                            className={`att-week-day${d.isToday ? " today" : ""}${
                                d.checked ? " checked" : ""
                            }`}
                        >
                            <span className="att-week-num">{d.num}</span>
                            <span className="att-week-name">{d.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {pendingPhoto && !busy && (
                <p className="att-cam-hint">
                    Ảnh đã sẵn sàng — nhấn Vào ca / Ra ca để lưu lại.
                </p>
            )}
            {done && <p className="att-checkin-done">{done}</p>}
            {error && <p className="att-checkin-error">{error}</p>}
        </section>
    );
};

export default AttendanceCard;
