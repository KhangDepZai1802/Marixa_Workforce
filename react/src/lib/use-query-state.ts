"use client";
import { usePathname, useSearchParams } from "next/navigation";

export function useQueryState() {
  const pathname = usePathname();
  const params = useSearchParams();
  function updateQuery(values: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === "") next.delete(key); else next.set(key, value);
    }
    const query = next.toString();
    const href = pathname + (query ? `?${query}` : "");
    if (href === window.location.pathname + window.location.search) return;
    // These filters belong to client components. Keep Back/Forward and URL sharing
    // without re-rendering server layouts and authenticating again on each edit.
    if (replace) window.history.replaceState(null, "", href); else window.history.pushState(null, "", href);
  }
  return { params, updateQuery };
}
