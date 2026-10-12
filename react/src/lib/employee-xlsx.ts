import ExcelJS from "exceljs";

// Template thống nhất cho 3 file (mau-nhan-vien, danh-sach-nhan-vien, export).
// 35 tiêu đề chiếm trọn các cột A..AI; mọi file dùng chung đúng chuỗi này
// để import/export/danh-sach không lệch cột.
export const EMPLOYEE_TEMPLATE_HEADERS = [
  "Mã nhân viên", "Họ / tên đệm", "Tên", "Ngày sinh", "Giới tính",
  "CCCD / CMT", "Ngày cấp CCCD / CMT", "Nơi cấp CCCD / CMT", "Điện thoại", "Email",
  "Địa chỉ thường trú", "Địa chỉ hiện tại", "Phòng ban", "Chức vụ", "Ngày vào làm",
  "Ngày kết thúc thử việc", "Loại lao động", "Trạng thái", "Chấm công qua điện thoại",
  "Số hợp đồng", "Loại hợp đồng", "Ngày ký hợp đồng", "Ngày hết hạn hợp đồng",
  "Lương cơ bản", "Hình thức trả lương", "Phụ cấp chức vụ", "Phụ cấp khác",
  "Số BHXH", "Mã số thuế cá nhân", "Tham gia BHXH", "Ngân hàng", "Số tài khoản",
  "Ghi chú", "Ngày kết thúc làm việc", "Lý do kết thúc làm việc",
] as const;

// Chỉ số (0-based) của từng trường cần trong schema `employees` (cột A..AI).
const COL = {
  code: 0, hoTenDem: 1, ten: 2, sinhNhat: 3, gioiTinh: 4,
  cccd: 5, capCccd: 6, noiCapCccd: 7, dienThoai: 8, email: 9,
  diaChiThuc: 10, diaChiHienTai: 11, phongBan: 12, chucVu: 13, ngayVaoLam: 14,
  ketThucThuViec: 15, loaiLaoDong: 16, trangThai: 17, chamCongDienThoai: 18,
  soHopDong: 19, loaiHopDong: 20, ngayKyHopDong: 21, hetHanHopDong: 22,
  luongCoBan: 23, hinhThucTraLuong: 24, phuCapChucVu: 25, phuCapKhac: 26,
  soBhxh: 27, mstCaNhan: 28, thamGiaBhxh: 29, nganHang: 30, soTaiKhoan: 31,
  ghiChu: 32, ngayKetThuc: 33, lyDoKetThuc: 34,
} as const;

export type EmployeeXlsxRow = { values: Map<number, string | number | Date>; rowNumber: number };
export type EmployeeImportResultRow = {
  rowNumber: number;
  employeeCode: string;
  fullName: string;
  status: "created" | "updated" | "skipped" | "error";
  issues: string[];
  employeeId?: string;
};
export type EmployeeImportResult = {
  total: number; created: number; updated: number; skipped: number; errors: number;
  rows: EmployeeImportResultRow[];
};
export type StoredEmployeeFields = {
  employee_code: string; full_name: string; work_email: string;
  phone: string | null; department: string | null; job_title: string | null;
  hire_date: string | null; status: string;
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Đang hoạt động", inactive: "Không hoạt động", terminated: "Đã nghỉ việc",
};
const STATUS_FROM_LABEL = new Map<string, string>([
  ["đang hoạt động", "active"], ["active", "active"],
  ["không hoạt động", "inactive"], ["nghỉ tạm thời", "inactive"], ["inactive", "inactive"],
  ["đã nghỉ việc", "terminated"], ["terminated", "terminated"],
]);

export function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

// Lấy giá trị tại trường (0-based index) từ 1-based column (cột A..AI).
function cell(row: EmployeeXlsxRow, index: number): string {
  return cellText(row.values.get(index + 1));
}

export function parseDateCell(row: EmployeeXlsxRow, index: number): string | null | undefined {
  const value: unknown = row.values.get(index + 1);
  const text = cellText(value);
  if (!text) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return undefined;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function readEmployeeRows(workbook: ExcelJS.Workbook): EmployeeXlsxRow[] {
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const rows: EmployeeXlsxRow[] = [];
  let last = 0;
  sheet.eachRow((row, number) => {
    row.eachCell({ includeEmpty: false }, () => { last = number; });
  });
  for (let number = 2; number <= last; number += 1) {
    const row = sheet.getRow(number);
    const values = new Map<number, string | number | Date>();
    row.eachCell({ includeEmpty: true }, (cellObj, col) => {
      const raw = cellObj.value;
      if (typeof raw === "number") values.set(col, raw);
      else if (raw instanceof Date) values.set(col, raw);
      else values.set(col, cellText(raw));
    });
    rows.push({ values, rowNumber: number });
  }
  return rows;
}
export function isBlankRow(row: EmployeeXlsxRow): boolean {
  for (const value of row.values.values()) {
    if (typeof value === "string" && value.trim()) return false;
    if (typeof value === "number" || value instanceof Date) return false;
  }
  return true;
}

export type RowValidation = { ok: true; data: StoredEmployeeFields } | { ok: false; issues: string[] };

// Kiểm tra một hàng; lỗi ghi theo từng trường để UI hiện chi tiết từng dòng.
export function validateEmployeeRow(row: EmployeeXlsxRow, seenCodes: Set<string>): RowValidation {
  const issues: string[] = [];
  const code = cell(row, COL.code).toUpperCase().replace(/\s+/g, "");
  const fullName = [cell(row, COL.hoTenDem), cell(row, COL.ten)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const phone = cell(row, COL.dienThoai).replace(/[^0-9+]/g, "");
  const email = cell(row, COL.email).trim().toLowerCase();
  const department = cell(row, COL.phongBan);
  const jobTitle = cell(row, COL.chucVu);
  const statusRaw = cell(row, COL.trangThai);
  const hireRaw = cell(row, COL.ngayVaoLam);

  if (!code) issues.push("Thiếu Mã nhân viên");
  else if (code.length > 30) issues.push("Mã nhân viên dài quá 30 ký tự");
  if (!fullName) issues.push("Thiếu Họ và tên (cần “Họ / tên đệm” và/hoặc “Tên”)");
  else if (fullName.length > 160) issues.push("Họ và tên dài quá 160 ký tự");
  if (!email) issues.push("Thiếu Email");
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push("Email sai định dạng");
  if (phone && !/^\+?(\d|\s){8,14}$/.test(phone)) issues.push("Điện thoại sai định dạng (8-13 số)");

  const hireDate = parseDateCell(row, COL.ngayVaoLam);
  if (hireRaw && hireDate === undefined) issues.push("“Ngày vào làm” sai định dạng (đề xuất yyyy-mm-dd)");
  if (hireDate && new Date(hireDate).getTime() > Date.now() + 60_000) issues.push("“Ngày vào làm” nằm trong tương lai");

  let status = "active";
  if (statusRaw) {
    const found = STATUS_FROM_LABEL.get(statusRaw.toLowerCase());
    if (!found) issues.push(`Trạng thái “${statusRaw}” không hợp lệ (Dùng: ${Object.values(STATUS_LABELS).join(" / ")})`);
    else status = found;
  }
  if (code && seenCodes.has(code)) issues.push(`Trùng mã nhân viên “${code}” trong file`);

  if (issues.length > 0) return { ok: false, issues };
  seenCodes.add(code);
  return {
    ok: true,
    data: {
      employee_code: code, full_name: fullName, work_email: email,
      phone: phone || null, department: department || null, job_title: jobTitle || null,
      hire_date: hireDate ?? null, status,
    },
  };
}

// Build sheet dùng chung template (header + data) — 35 cột A..AI.
export function buildEmployeeSheet(workbook: ExcelJS.Workbook, rows: EmployeeXlsxRow[], withExample = false): ExcelJS.Worksheet {
  const sheet = workbook.worksheets[0] ?? workbook.addWorksheet("Nhân viên");
  sheet.spliceRows(1, sheet.rowCount); // làm sạch trước khi ghi
  const header = sheet.addRow([...EMPLOYEE_TEMPLATE_HEADERS] as unknown as (string | number)[]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1647C8" } };
  header.height = 26;
  for (let i = 0; i < EMPLOYEE_TEMPLATE_HEADERS.length; i += 1) sheet.getColumn(i + 1).width = 16;
  if (withExample) {
    const example: (string | number)[] = [];
    const put = (fieldIndex: number, value: string | number) => {
      example[fieldIndex] = value;
    };
    while (example.length < EMPLOYEE_TEMPLATE_HEADERS.length) example.push("");
    put(COL.code, "NV000");
    put(COL.hoTenDem, "Nguyễn Văn");
    put(COL.ten, "An");
    put(COL.sinhNhat, "1995-01-15");
    put(COL.gioiTinh, "Nam");
    put(COL.dienThoai, "0900000000");
    put(COL.email, "van.nguyen@congty.vn");
    put(COL.phongBan, "IT");
    put(COL.chucVu, "Developer");
    put(COL.ngayVaoLam, "2026-01-01");
    put(COL.trangThai, "Đang hoạt động");
    sheet.addRow(example);
  }
  for (const row of rows) {
    const values: (string | number)[] = [];
    for (let index = 0; index < EMPLOYEE_TEMPLATE_HEADERS.length; index += 1) {
      const raw = row.values.get(index + 1);
      values[index] = raw instanceof Date ? raw.toISOString().slice(0, 10) : (raw ?? "");
    }
    sheet.addRow(values);
  }
  return sheet;
}

export function buildEmployeeWorkbook(rows: EmployeeXlsxRow[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Marixa Workforce";
  workbook.created = new Date();
  buildEmployeeSheet(workbook, rows);
  return workbook;
}
export function buildTemplateWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Marixa Workforce";
  workbook.created = new Date();
  buildEmployeeSheet(workbook, [], true);
  return workbook;
}

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export function xlsxResponse(buffer: ArrayBuffer, filename: string, requestId: string): Response {
  const headers = new Headers({ "Content-Type": XLSX_CONTENT_TYPE, "Cache-Control": "private, no-store", "X-Request-Id": requestId });
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  return new Response(buffer, { headers, status: 200 });
}
