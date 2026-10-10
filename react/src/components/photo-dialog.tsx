"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui";

export function PhotoDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="dialog photo-dialog" aria-label="Ảnh chấm công" onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-header"><div><h2>Ảnh chấm công</h2><p>Liên kết riêng tư có thời hạn ngắn.</p></div>
      <Button type="button" variant="secondary" onClick={onClose} autoFocus>Đóng</Button></div>
    <div className="photo-image-frame"><Image src={url} alt="Ảnh chấm công" fill unoptimized sizes="(max-width: 767px) 90vw, 640px" /></div>
  </dialog>;
}
