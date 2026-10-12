"use client";
import { useEffect, useState } from "react";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";

export function useResource<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const key = `${path}:${version}`;
  const [result, setResult] = useState<{ key: string; data: T | null; page?: ApiEnvelope<T>["page"]; error: string } | null>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    apiRequest<ApiEnvelope<T>>(path, { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) setResult({ key, data: response.data, page: response.page, error: "" }); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setResult({ key, data: null, error: cause instanceof Error ? cause.message : "Không tải được dữ liệu. Hãy thử lại." }); });
    return () => controller.abort();
  }, [path, key]);
  const current = result?.key === key ? result : null;
  return { page: current?.page, data: current?.data ?? null, error: current?.error ?? "", loading: Boolean(path && !current), reload: () => setVersion(value => value + 1) };
}
