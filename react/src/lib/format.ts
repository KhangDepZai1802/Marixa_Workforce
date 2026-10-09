export const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function businessDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00+07:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: BUSINESS_TIME_ZONE }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: BUSINESS_TIME_ZONE }).format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: BUSINESS_TIME_ZONE }).format(date);
}

export function formatMinutes(value: number | null | undefined): string {
  const minutes = Math.max(0, value ?? 0);
  return `${Math.floor(minutes / 60)} giờ ${String(minutes % 60).padStart(2, "0")} phút`;
}

export const statusLabels: Record<string, string> = {
  active: "Đang hoạt động", disabled: "Đã khóa", pending: "Chờ duyệt", pending_review: "Chờ HR đối soát",
  approved: "Đã duyệt", rejected: "Từ chối", cancelled: "Đã hủy", open: "Đang mở",
  hr_reviewed: "HR đã kiểm tra", locked: "Đã khóa kỳ", needs_review: "Cần kiểm tra", reviewed: "Đã kiểm tra",
  ready: "Đã tải ảnh", not_provided: "Không có ảnh", failed: "Tải ảnh lỗi", pending_upload: "Đang chờ tải ảnh",
};

export function labelStatus(status: string | null | undefined): string {
  return status ? statusLabels[status] ?? status : "—";
}
