"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useQueryState() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  function updateQuery(values: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === "") next.delete(key); else next.set(key, value);
    }
    const query = next.toString();
    const href = pathname + (query ? `?${query}` : "");
    if (replace) router.replace(href, { scroll: false }); else router.push(href, { scroll: false });
  }
  return { params, updateQuery };
}
