export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const body = contentType.includes("application/json") ? await response.json().catch(() => null) : null;
    throw new ApiError(body?.error?.message ?? "Không thể hoàn tất yêu cầu. Hãy thử lại.", response.status, body?.error?.code);
  }
  if (contentType.includes("application/json")) return response.json() as Promise<T>;
  return response as T;
}

export type ApiEnvelope<T> = { data: T; request_id?: string; page?: { number: number; size: number; total: number } };
