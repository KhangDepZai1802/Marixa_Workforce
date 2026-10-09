import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
export function proxy(request: NextRequest) {
  if (safeMethods.has(request.method) || !request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : request.nextUrl.origin;
  if (!origin || origin !== expected) {
    return NextResponse.json({ error: { code: "CSRF_REJECTED", message: "Yêu cầu không cùng nguồn." }, request_id: randomUUID() }, { status: 403 });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/api/:path*"] };
