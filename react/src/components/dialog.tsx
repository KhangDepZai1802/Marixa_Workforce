"use client";

import { useEffect, useRef } from "react";

export function Dialog({ title, onClose, children, busy = false, className = "" }: { title: string; onClose: () => void; children: React.ReactNode; busy?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { closeRef.current = onClose; busyRef.current = busy; }, [onClose, busy]);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) closeRef.current();
      if (event.key !== "Tab") return;
      const controls = [...(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') ?? [])];
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", keyboard);
    return () => { window.removeEventListener("keydown", keyboard); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  return <div className="dialog-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}><div ref={ref} tabIndex={-1} className={`dialog ${className}`} role="dialog" aria-modal="true" aria-label={title}><header className="reference-modal-heading"><h2>{title}</h2><button type="button" aria-label="Đóng" disabled={busy} onClick={onClose}>×</button></header>{children}</div></div>;
}
