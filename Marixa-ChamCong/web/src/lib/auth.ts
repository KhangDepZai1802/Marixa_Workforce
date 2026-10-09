import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "employee" | "hr" | "admin";
export type Actor = { userId: string; employeeId: string | null; role: Role; mustChangePassword: boolean };

export async function getActor(): Promise<Actor | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: account, error: accountError } = await supabase.from("app_users")
    .select("employee_id, role, status, must_change_password").eq("auth_user_id", user.id).maybeSingle();
  if (accountError || !account || account.status !== "active") return null;
  if (!["employee", "hr", "admin"].includes(account.role)) return null;
  return { userId: user.id, employeeId: account.employee_id, role: account.role as Role, mustChangePassword: account.must_change_password };
}

export function jsonError(status: number, code: string, message: string, requestId: string, fields?: Record<string, string>) {
  return Response.json({ error: { code, message, ...(fields ? { fields } : {}) }, request_id: requestId }, { status });
}
