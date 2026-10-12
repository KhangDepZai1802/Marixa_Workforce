import { createRequestId, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";
import { buildTemplateWorkbook, xlsxResponse } from "@/lib/employee-xlsx";

export const runtime = "nodejs";

// File mẫu rỗng: chỉ tiêu đề + một hàng ví dụ để người dùng điền đúng khuôn,
// khớp hoàn toàn với export và danh-sach-nhan-vien.
export async function GET(_request: Request) {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword)
    return jsonError(403, "FORBIDDEN", "Bạn không có quyền tải mẫu danh sách.", requestId);
  const workbook = buildTemplateWorkbook();
  return xlsxResponse(await workbook.xlsx.writeBuffer(), "mau-nhan-vien.xlsx", requestId);
}
