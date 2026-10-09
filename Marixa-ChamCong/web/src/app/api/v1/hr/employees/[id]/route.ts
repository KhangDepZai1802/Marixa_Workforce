import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ full_name: z.string().trim().min(2).max(160).optional(), work_email: z.string().email().max(254).optional(), phone: z.string().trim().max(30).nullable().optional(), department: z.string().trim().max(100).nullable().optional(), job_title: z.string().trim().max(120).nullable().optional(), hire_date: z.string().date().nullable().optional() }).strict().refine(v => Object.keys(v).length > 0);
export async function PATCH(request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền sửa hồ sơ nhân viên.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Thông tin hồ sơ không hợp lệ.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("employees").update(parsed.data).eq("id", id).select("id,employee_code,full_name,work_email,phone,department,job_title,hire_date,status").maybeSingle();
  if (error?.code === "23505") return jsonError(409, "EMPLOYEE_DUPLICATE", "Email đã thuộc hồ sơ khác.", requestId);
  if (error) return jsonError(500, "EMPLOYEE_UPDATE_FAILED", "Không thể cập nhật hồ sơ nhân viên.", requestId);
  if (!data) return jsonError(404, "EMPLOYEE_NOT_FOUND", "Không tìm thấy hồ sơ nhân viên.", requestId);
  return Response.json({ data, request_id: requestId });
}
