"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "@/components/dialog";
import { Button } from "@/components/ui";

export function MobileFilters({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <><div className="staff-desktop-filters">{children}</div><div className="staff-mobile-filters"><Button type="button" variant="secondary" aria-expanded={open} onClick={() => setOpen(true)}>Bộ lọc & tìm kiếm</Button></div>{open && <Dialog title="Bộ lọc & tìm kiếm" onClose={() => setOpen(false)}>{children}<Button type="button" variant="ghost" onClick={() => setOpen(false)}>Xem kết quả</Button></Dialog>}</>;
}
