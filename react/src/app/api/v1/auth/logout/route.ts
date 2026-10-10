import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const requestId = createRequestId();
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) return jsonError(500, "LOGOUT_FAILED", "Không thể đăng xuất. Hãy thử lại.", requestId);
    return jsonApiResponse({ data: { signed_out: true }, request_id: requestId });
  } catch {
    return jsonError(503, "AUTH_UNAVAILABLE", "Chưa kết nối được Supabase.", requestId);
  }
}
