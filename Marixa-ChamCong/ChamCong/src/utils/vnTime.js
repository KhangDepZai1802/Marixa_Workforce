// Tiện ích giờ Việt Nam (UTC+7) dùng cho module chấm công.

export const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

// Định dạng giờ HH:mm tại Việt Nam (rỗng nếu không có giá trị).
export const formatVnTime = (iso) =>
    iso
        ? new Date(iso).toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: VN_TIMEZONE,
          })
        : "";

// Định dạng ngày DD/MM/YYYY tại Việt Nam (rỗng nếu không có giá trị).
export const formatVnDate = (d) =>
    d
        ? new Date(d).toLocaleDateString("vi-VN", { timeZone: VN_TIMEZONE })
        : "";

// ===== TĂNG CA (Overtime) =====
// "Làm việc từ 8:00 đến 17:00" = 8h làm việc chuẩn (1h nghỉ giữa ca).
// Vượt quá 17:00 (actualHours > 8h chuẩn) -> tính là tăng ca (OT).
export const OT_STANDARD_HOURS = 8;

// Tính giờ tăng ca (số thực, >= 0) từ một bản ghi chấm công.
// OT = phần thời gian VƯỢT QUA mốc ra ca chuẩn 17:00 (quy định 8h-17h).
// Dùng GIỜ RA CA (checkOut) làm chuẩn: ra 18:00 -> OT = 1h (17:00 -> 18:00).
// Không dùng actualHours vì đó là thời gian trần (gồm cả giờ nghỉ trưa)
// -> nếu trừ 8h chuẩn sẽ "vượt" sai (VD 8h-18h = 10h trần - 8h = 2h, sai).
export const calcOvertime = (row, standardHours = OT_STANDARD_HOURS) => {
    // Ưu tiên giá trị backend đã tính theo AttendanceRule (net + tăng ca),
    // có sẵn khi đọc API -> không phải chờ HR duyệt.
    if (row && row.overtimeHours != null && row.overtimeHours !== "") return Number(row.overtimeHours);
    // Chiếu sang giờ Việt Nam (UTC+7) rồi so mốc 17:00.
    const toVnMinutes = (iso) => {
        const t = new Date(iso);
        const vn = new Date(t.getTime() + t.getTimezoneOffset() * 60000 + 7 * 3600000);
        return vn.getHours() * 60 + vn.getMinutes();
    };

    if (row && row.checkOutTime) {
        const mins = toVnMinutes(row.checkOutTime);
        const stdMins = 17 * 60; // mốc ra ca chuẩn 17:00
        if (mins > stdMins) return Math.round(((mins - stdMins) / 60) * 10) / 10;
        return 0;
    }

    // Fallback: chưa có giờ ra ca (vẫn đang làm / chưa chấm ra) -> ước lượng từ actualHours.
    if (row && row.actualHours != null && row.actualHours !== "") {
        return Math.max(0, Number(row.actualHours) - standardHours);
    }
    return 0;
};

// Dạng hiển thị "Xh" (rỗng nếu không có OT).
export const formatOvertime = (ot) => (ot > 0 ? `${ot}h` : "");
