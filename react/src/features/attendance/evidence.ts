export type AttendanceLocation = { latitude: number; longitude: number; accuracy_m: number };

export function getCurrentLocation(): Promise<AttendanceLocation> {
  if (!window.isSecureContext) return Promise.reject(new Error("Hãy mở trang qua HTTPS để lấy vị trí."));
  if (!navigator.geolocation) return Promise.reject(new Error("Trình duyệt không hỗ trợ vị trí. Hãy dùng trình duyệt khác."));
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (![coords.latitude, coords.longitude, coords.accuracy].every(Number.isFinite)
        || Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180 || coords.accuracy < 0 || coords.accuracy > 10000) {
        reject(new Error("Chưa xác định được vị trí đủ chính xác. Hãy bật định vị và thử lại."));
        return;
      }
      // The database requires a positive radius; report zero-accuracy readings as 1 m.
      resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy_m: Math.max(1, coords.accuracy) });
    },
    (error) => reject(new Error(error.code === 1
      ? "Chưa được cấp quyền vị trí. Hãy cho phép vị trí trong cài đặt trình duyệt rồi thử lại."
      : error.code === 3 ? "Lấy vị trí quá lâu. Hãy bật định vị, kiểm tra kết nối và thử lại."
        : "Không lấy được vị trí hiện tại. Hãy bật định vị trên thiết bị và thử lại.")),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  ));
}

export async function compressPhoto(file: File): Promise<Blob> {
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  try {
    let source: CanvasImageSource;
    let width: number;
    let height: number;
    if (typeof createImageBitmap === "function") {
      try { bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { bitmap = null; }
    }
    if (bitmap) {
      source = bitmap; width = bitmap.width; height = bitmap.height;
    } else {
      objectUrl = URL.createObjectURL(file);
      const image = new window.Image();
      image.src = objectUrl;
      await image.decode();
      source = image; width = image.naturalWidth; height = image.naturalHeight;
    }
    const scale = Math.min(1, 1280 / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không xử lý được ảnh này.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.72, 0.62, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
      if (blob && blob.size <= 190_000) return blob;
    }
    const finalBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.45));
    if (finalBlob && finalBlob.size <= 200_000) return finalBlob;
    throw new Error("Ảnh vẫn lớn hơn 200 KB sau khi nén. Hãy chọn ảnh khác.");
  } finally { bitmap?.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
}

