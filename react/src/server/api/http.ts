import "server-only";
import { randomUUID } from "node:crypto";

export function createRequestId() {
  return randomUUID();
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  requestId: string,
  fields?: Record<string, string>,
) {
  // Log only diagnostic identifiers, never credentials or request contents.
  console.warn(JSON.stringify({ request_id: requestId, status, code }));
  return jsonApiResponse(
    { error: { code, message, ...(fields ? { fields } : {}) }, request_id: requestId },
    { status },
  );
}

export function jsonApiResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  if (body && typeof body === "object" && "request_id" in body && typeof body.request_id === "string") {
    headers.set("X-Request-Id", body.request_id);
  }
  return Response.json(body, { ...init, headers });
}
