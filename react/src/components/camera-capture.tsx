"use client";

import Image from "next/image";
import { compressPhoto, getCurrentLocation, type AttendanceLocation } from "@/features/attendance/evidence";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/dialog";
import { Button, Notice } from "@/components/ui";

export function CameraCapture({ kind, onConfirm, onClose }: { kind: "check_in" | "check_out"; onConfirm: (photo: Blob, location: AttendanceLocation) => Promise<void>; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState("");
  const previewRef = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [stage, setStage] = useState<"idle" | "location" | "saving">("idle");
  const busy = capturing || stage !== "idle";
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (previewRef.current) URL.revokeObjectURL(previewRef.current); };
  }, []);

  useEffect(() => {
    if (photo) return;
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
  }, [photo, cameraAttempt]);

  async function capture() {
    const video = videoRef.current;
    if (!ready || inFlight.current || !video?.videoWidth || !video.videoHeight) return;
    inFlight.current = true; setCapturing(true); setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Không xử lý được khung hình.");
      context.drawImage(video, 0, 0);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Không chụp được ảnh. Hãy thử lại.");
      await prepare(new File([blob], `cham-cong-${Date.now()}.jpg`, { type: "image/jpeg" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không chụp được ảnh."); }
    finally { inFlight.current = false; setCapturing(false); }
  }

  async function prepare(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Ảnh cần ở định dạng JPG, PNG hoặc WebP.");
    const compressed = await compressPhoto(file);
    if (!mounted.current) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(compressed);
    setPreview(previewRef.current); setPhoto(compressed); setReady(false);
    streamRef.current?.getTracks().forEach(track => track.stop());
  }

  async function selectPhoto(file: File) {
    if (inFlight.current) return;
    inFlight.current = true; setCapturing(true); setError("");
    try { await prepare(file); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không xử lý được ảnh. Hãy chọn ảnh khác."); }
    finally { inFlight.current = false; setCapturing(false); }
  }

  function retake() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = ""; setPreview(""); setPhoto(null); setReady(false); setError("");
    setCameraAttempt(value => value + 1);
  }

  async function confirm() {
    if (!photo || inFlight.current) return;
    inFlight.current = true; setStage("location"); setError("");
    try {
      const location = await getCurrentLocation();
      if (!mounted.current) return;
      setStage("saving");
      await onConfirm(photo, location);
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : "Chưa chấm công được. Hãy thử lại."); }
    finally { inFlight.current = false; if (mounted.current) setStage("idle"); }
  }

  return <Dialog title={kind === "check_in" ? "Ảnh chấm vào" : "Ảnh chấm ra"} className="camera-dialog" busy={busy} onClose={onClose}>
    <p className="subtle-note">Chụp ảnh hoặc chọn ảnh từ máy. Khi xác nhận, hệ thống lấy vị trí hiện tại rồi ghi nhận giờ chấm.</p>
    {photo ? <div className="photo-preview attendance-photo-preview"><Image src={preview} width={480} height={360} alt="Ảnh chấm công đã chọn" unoptimized /></div>
      : <video ref={videoRef} className="camera-video" autoPlay muted playsInline aria-label="Hình ảnh từ camera" />}
    {error && <Notice kind="error">{error}</Notice>}
    <div aria-busy={busy}>
      <p className="subtle-note" role="status">{stage === "location" ? "Đang lấy vị trí hiện tại… Hãy cho phép quyền vị trí khi trình duyệt hỏi." : stage === "saving" ? "Đang ghi nhận lượt chấm…" : capturing ? "Đang xử lý ảnh…" : photo ? "Ảnh đã sẵn sàng. Cần bật vị trí để hoàn tất chấm công." : ready ? "Đặt camera đúng vị trí rồi bấm Chụp ảnh." : error ? "Bạn có thể chọn ảnh từ máy hoặc thử mở lại camera." : "Đang mở camera…"}</p>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} aria-label="Ảnh chấm công từ máy" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void selectPhoto(file); }} />
      <div className="form-actions">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>{photo ? "Đổi ảnh từ máy" : "Chọn ảnh từ máy"}</Button>
        {photo ? <Button type="button" variant="secondary" disabled={busy} onClick={retake}>Chụp lại</Button>
          : <Button type="button" disabled={!ready || busy} onClick={() => void capture()}>Chụp ảnh</Button>}
        {!photo && error && <Button type="button" variant="secondary" disabled={busy} onClick={retake}>Thử lại camera</Button>}
      </div>
      {photo && <Button type="button" className="attendance-submit" disabled={busy} onClick={() => void confirm()}>{stage === "location" ? "Đang lấy vị trí…" : stage === "saving" ? "Đang ghi nhận…" : kind === "check_in" ? "Xác nhận chấm vào" : "Xác nhận chấm ra"}</Button>}
      <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Hủy chấm công</Button>
    </div>
  </Dialog>;
}
