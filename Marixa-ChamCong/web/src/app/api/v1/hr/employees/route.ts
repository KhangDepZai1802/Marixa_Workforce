import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createSchema = z.object({ employee_code: z.string().trim().min(1).max(30), full_name: z.string().trim().min(2).max(160), work_email: z.string().email().max(254), phone: z.string().trim().max(30).nullable().optional(), department: z.string().trim().max(100).nullable().optional(), job_title: z.string().trim().max(120).nullable().optional(), hire_date: z.string().date().nullable().optional() }).strict();
export async function GET(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem hồ sơ nhân viên.", requestId);
  const url = new URL(request.url); const q = url.searchParams.get("q")?.trim();
  const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page") ?? 1) || 1));
  const size = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") ?? 50) || 50));
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("employees").select("id,employee_code,full_name,work_email,phone,department,job_title,hire_date,status,created_at", { count: "exact" }).order("full_name");
  if (q) query = query.or(`employee_code.ilike.%${q}%,full_name.ilike.%${q}%,work_email.ilike.%${q}%,department.ilike.%${q}%`);
  const { data, count, error } = await query.range((page - 1) * size, page * size - 1);
  if (error) return jsonError(500, "EMPLOYEES_READ_FAILED", "Không thể tải danh sách nhân viên.", requestId);
  return Response.json({ data, page: { number: page, size, total: count ?? 0 }, request_id: requestId });
}
export async function POST(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền tạo hồ sơ nhân viên.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra hồ sơ nhân viên.", requestId, Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0] ?? "body"), i.message])));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("employees").insert(parsed.data).select("id,employee_code,full_name,work_email,phone,department,job_title,hire_date,status").single();
  if (error?.code === "23505") return jsonError(409, "EMPLOYEE_DUPLICATE", "Mã nhân viên hoặc email đã tồn tại.", requestId);
  if (error || !data) return jsonError(500, "EMPLOYEE_CREATE_FAILED", "Không thể tạo hồ sơ nhân viên.", requestId);
  return Response.json({ data, request_id: requestId }, { status: 201 });
}
