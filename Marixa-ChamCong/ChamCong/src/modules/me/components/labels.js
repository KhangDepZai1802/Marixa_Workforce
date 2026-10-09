// Nhãn + class badge dùng chung 2 trang quản trị chấm công.
export const statusLabel = (s) =>
    ({
        1: "Đúng giờ",
        2: "Đi trễ",
        3: "Về sớm",
        4: "Vắng mặt",
        5: "Nghỉ phép",
        6: "Lễ",
        7: "Ngoại tuần",
    })[s] || "Chưa đánh giá";

export const statusClass = (s) =>
    ({
        1: "ok",
        2: "warn",
        3: "warn",
        4: "bad",
        5: "info",
        6: "info",
        7: "info",
    })[s] || "";

export const approvalLabel = (s) =>
    ({ 0: "Chờ duyệt", 1: "Đã duyệt", 2: "Từ chối" })[s] ?? "Chờ duyệt";

export const approvalClass = (s) =>
    ({ 0: "warn", 1: "ok", 2: "bad" })[s] || "";
