import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const schema = z.object({ code: z.string().trim().min(2).max(30).regex(/^[A-Za-z0-9_-]+$/), name: z.string().trim().min(2).max(120), deducts_annual_balance: z.boolean(), active: z.boolean().default(true) }).strict();
export async function POST(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được cấu hình loại nghỉ.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body); if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Mã hoặc tên loại nghỉ không hợp lệ.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("leave_types").insert(parsed.data).select("id,code,name,deducts_annual_balance,active").single();
  if (error?.code === "23505") return jsonError(409, "LEAVE_TYPE_EXISTS", "Mã loại nghỉ đã tồn tại.", requestId);
  if (error || !data) return jsonError(500, "LEAVE_TYPE_CREATE_FAILED", "Không thể tạo loại nghỉ.", requestId);
  return Response.json({ data, request_id: requestId }, { status: 201 });
}
