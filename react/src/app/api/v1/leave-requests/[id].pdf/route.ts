import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
const dateVi = (s: string) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(`${s}T12:00:00+07:00`));
export async function GET(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  const id = decodeURIComponent(new URL(request.url).pathname.split("/").at(-1) ?? "").replace(/\.pdf$/, "");
  const supabase = await createSupabaseServerClient();
  const { data: leave, error } = await supabase.from("leave_requests").select("id,employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason,status,version,review_note,reviewed_at,created_at,employees(employee_code,full_name,work_email),leave_types(name)").eq("id", id).maybeSingle();
  if (error || !leave || (actor.role === "employee" && leave.employee_id !== actor.employeeId)) return jsonError(404, "LEAVE_REQUEST_NOT_FOUND", "Không tìm thấy đơn nghỉ.", requestId);
  const font = await readFile(join(process.cwd(), "assets", "fonts", "be-vietnam-pro-vietnamese-400-normal.woff"));
  const doc = new PDFDocument({ size: "A4", margins: { top: 64, bottom: 64, left: 64, right: 64 }, info: { Title: "Đơn nghỉ phép Marixa", Author: "Marixa Workforce", Subject: `Phiên bản ${leave.version}` } });
  doc.font(font);
  const chunks: Buffer[] = [];
  const pdfBuffer = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  doc.fontSize(11).fillColor("#1647C8").text("MARIXA · WORKFORCE", { align: "center" });
  doc.moveDown(1.4).fontSize(19).fillColor("#172033").text("ĐƠN XIN NGHỈ", { align: "center" });
  doc.moveDown(0.4).fontSize(10).fillColor("#526174").text(`Phiên bản ${leave.version} · Trạng thái tại thời điểm xuất: ${leave.status}`, { align: "center" });
  doc.moveDown(2).fontSize(12).fillColor("#172033");
  const employee = Array.isArray(leave.employees) ? leave.employees[0] : leave.employees;
  const leaveType = Array.isArray(leave.leave_types) ? leave.leave_types[0] : leave.leave_types;
  const rows: [string, string][] = [
    ["Nhân viên", `${employee?.employee_code ?? ""} · ${employee?.full_name ?? ""}`],
    ["Email công việc", employee?.work_email ?? ""],
    ["Loại nghỉ", leaveType?.name ?? ""],
    ["Thời gian", `${dateVi(leave.start_date)} đến ${dateVi(leave.end_date)}`],
    ["Số ngày", `${leave.total_days} ngày`],
    ["Lý do", leave.reason],
    ["Ngày tạo", new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(leave.created_at))],
  ];
  for (const [label, value] of rows) {
    doc.fontSize(10).fillColor("#526174").text(label.toUpperCase(), { continued: false });
    doc.moveDown(0.25).fontSize(12).fillColor("#172033").text(value, { width: 460 });
    doc.moveDown(0.8);
  }
  doc.moveDown(1).fontSize(10).fillColor("#526174").text(`Xuất lúc ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}. Bản PDF này phản ánh dữ liệu đơn tại thời điểm xuất.`, { align: "left" });
  if (leave.review_note) doc.moveDown(1).fontSize(10).fillColor("#172033").text(`Ghi chú duyệt: ${leave.review_note}`);
  doc.end();
  const output = await pdfBuffer;
  return new Response(new Uint8Array(output), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="marixa-leave-${leave.id}-v${leave.version}.pdf"`, "Cache-Control": "private, no-store", "X-Request-Id": requestId } });
}
