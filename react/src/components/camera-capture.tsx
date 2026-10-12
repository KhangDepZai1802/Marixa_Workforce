"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/dialog";
import { Button, Notice } from "@/components/ui";

export function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => Promise<void>; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) { stream.getTracks().forEach(track => track.stop()); return; }
        video.srcObject = stream;
        await video.play();
        if (!cancelled) setReady(true);
      } catch (cause) {
        stream?.getTracks().forEach(track => track.stop());
        if (cancelled) return;
        const name = cause instanceof DOMException ? cause.name : "";
        setError(name === "NotAllowedError" ? "Chưa được cấp quyền camera. Hãy cho phép quyền truy cập hoặc chọn ảnh từ thư viện." : name === "NotFoundError" ? "Không tìm thấy camera. Bạn có thể chọn ảnh từ thư viện." : "Không truy cập được camera. Bạn có thể chọn ảnh từ thư viện.");
      }
    }
    void start();
    return () => { cancelled = true; stream?.getTracks().forEach(track => track.stop()); streamRef.current = null; };
  }, []);

  async function capture() {
    const video = videoRef.current;
    if (!ready || capturing || !video?.videoWidth || !video.videoHeight) return;
    setCapturing(true); setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Không xử lý được khung hình.");
      context.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Không chụp được ảnh. Hãy thử lại.");
      await onCapture(new File([blob], `cham-cong-${Date.now()}.jpg`, { type: "image/jpeg" }));
      streamRef.current?.getTracks().forEach(track => track.stop());
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không chụp được ảnh."); }
    finally { setCapturing(false); }
  }

  return <Dialog title="Chụp ảnh chấm công" className="camera-dialog" busy={capturing} onClose={onClose}>
    <video ref={videoRef} className="camera-video" autoPlay muted playsInline aria-label="Hình ảnh từ camera" />
    {error ? <Notice kind="error">{error}</Notice> : <p className="subtle-note" role="status">{capturing ? "Đang xử lý ảnh…" : ready ? "Đặt camera đúng vị trí rồi bấm Chụp ảnh." : "Đang mở camera…"}</p>}
    <div className="form-actions"><Button type="button" variant="secondary" disabled={capturing} onClick={onClose}>Quay lại</Button><Button type="button" disabled={!ready || capturing} onClick={() => void capture()}>Chụp ảnh</Button></div>
  </Dialog>;
}
