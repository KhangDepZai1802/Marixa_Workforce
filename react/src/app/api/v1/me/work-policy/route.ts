import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";
import { businessDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  const date = businessDate();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("work_policies")
    .select("id,effective_from,effective_to,start_time,lunch_start,lunch_end,end_time,working_weekdays,late_grace_minutes")
    .lte("effective_from", date)
    .or(`effective_to.is.null,effective_to.gte.${date}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return jsonError(500, "POLICY_READ_FAILED", "Không thể tải ca làm chung.", requestId);
  return jsonApiResponse({ data, request_id: requestId });
}
