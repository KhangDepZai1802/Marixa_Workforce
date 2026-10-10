import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
export async function proxy(request: NextRequest) {
  const privateApi = request.nextUrl.pathname.startsWith("/api/v1/");
  const mutation = !safeMethods.has(request.method) && request.nextUrl.pathname.startsWith("/api/");
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : request.nextUrl.origin;
  if (mutation && (!origin || origin !== expected)) {
    const response = NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Yêu cầu không cùng nguồn." }, request_id: randomUUID() }, { status: 403 });
    if (privateApi) response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key && request.cookies.getAll().some(cookie => cookie.name.startsWith("sb-"))) {
    const supabase = createServerClient(url, key, { cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: values => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    } });
    // Refresh once before Server Components (which cannot write response cookies).
    // Route handlers still validate getUser() and the live account role/status.
    await supabase.auth.getClaims();
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/api/:path*", "/today", "/my-attendance", "/my-requests", "/my-profile", "/hr/:path*", "/admin/:path*", "/change-password"] };
