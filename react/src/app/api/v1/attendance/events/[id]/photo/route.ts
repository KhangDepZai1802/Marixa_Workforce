import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
const BUCKET = "attendance-photos";
const MAX_BYTES = 200_000;

export async function POST(request: Request, context: RouteContext) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa có hồ sơ nhân viên.", requestId);
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: event } = await supabase.from("attendance_events").select("id, employee_id, work_date, evidence_status").eq("id", id).maybeSingle();
  if (!event || event.employee_id !== actor.employeeId) return jsonError(404, "EVENT_NOT_FOUND", "Không tìm thấy lượt chấm công.", requestId);
  if (event.evidence_status === "ready") {
    const { data: photo } = await supabase.from("attendance_photos").select("id, uploaded_at").eq("attendance_event_id", id).maybeSingle();
    return Response.json({ data: { event_id: id, evidence_status: "ready", photo }, replayed: true, request_id: requestId });
  }
  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError(400, "INVALID_MULTIPART", "Tệp ảnh không hợp lệ.", requestId); }
  const file = form.get("photo");
  if (!(file instanceof File)) return jsonError(422, "PHOTO_REQUIRED", "Cần tải ảnh chấm công lên.", requestId);
  if (!new Set(["image/webp", "image/jpeg", "image/png"]).has(file.type) || file.size <= 0 || file.size > MAX_BYTES)
    return jsonError(422, "PHOTO_INVALID", "Ảnh phải là WebP, JPEG hoặc PNG và không vượt quá 200 KB.", requestId);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isWebp = bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if ((file.type === "image/webp" && !isWebp) || (file.type === "image/jpeg" && !isJpeg) || (file.type === "image/png" && !isPng))
    return jsonError(422, "PHOTO_CONTENT_MISMATCH", "Nội dung tệp không khớp định dạng ảnh.", requestId);
  const [year, month] = event.work_date.split("-");
  const extension = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
  const path = `${actor.employeeId}/${year}/${month}/${event.work_date}/${id}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: true, cacheControl: "3600" });
  if (uploadError) return jsonError(503, "PHOTO_UPLOAD_FAILED", "Giờ chấm đã được ghi nhận. Ảnh chưa tải lên; hãy thử lại khi có mạng.", requestId);
  const { data: photo, error: metadataError } = await supabase.rpc("register_attendance_photo", {
    p_event_id: id, p_storage_path: path, p_mime_type: file.type, p_bytes: file.size,
  });
  if (metadataError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return jsonError(503, "PHOTO_METADATA_FAILED", "Chưa lưu được thông tin ảnh. Vui lòng thử đồng bộ lại.", requestId);
  }
  return Response.json({ data: { event_id: id, evidence_status: "ready", photo: { id: photo.id, uploaded_at: photo.uploaded_at } }, request_id: requestId }, { status: 201 });
}

export async function GET(_request: Request, context: RouteContext) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: event } = await supabase.from("attendance_events").select("id, employee_id, evidence_status").eq("id", id).maybeSingle();
  if (!event || (event.employee_id !== actor.employeeId && !["hr", "admin"].includes(actor.role)))
    return jsonError(404, "EVENT_NOT_FOUND", "Không tìm thấy lượt chấm công.", requestId);
  const { data: photo } = await supabase.from("attendance_photos").select("storage_path, expires_at, deleted_at").eq("attendance_event_id", id).maybeSingle();
  if (!photo || photo.deleted_at || event.evidence_status === "expired") return jsonError(410, "PHOTO_EXPIRED", "Ảnh đã hết thời hạn lưu.", requestId);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(photo.storage_path, 60);
  if (error || !data) return jsonError(404, "PHOTO_UNAVAILABLE", "Không thể mở ảnh chấm công.", requestId);
  return Response.json({ data: { url: data.signedUrl, expires_in: 60 }, request_id: requestId });
}
