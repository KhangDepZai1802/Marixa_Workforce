export type Pagination = { page: number; size: number; from: number; to: number };

type PaginationOptions = {
  defaultPage?: number;
  defaultSize: number;
  maxPage?: number;
  maxSize: number;
};

function readBoundedInteger(value: string | null, fallback: number, minimum: number, maximum: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

export function getPagination(searchParams: URLSearchParams, options: PaginationOptions): Pagination {
  const page = readBoundedInteger(searchParams.get("page"), options.defaultPage ?? 1, 1, options.maxPage ?? 10_000);
  const size = readBoundedInteger(searchParams.get("page_size"), options.defaultSize, 1, options.maxSize);
  const from = (page - 1) * size;
  return { page, size, from, to: from + size - 1 };
}
