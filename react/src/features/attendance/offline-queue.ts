import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";

export type QueuedAttendance = {
  idempotency_key: string;
  kind: "check_in" | "check_out";
  device_occurred_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  photo: Blob | null;
  queued_at: string;
  requires_attention: boolean;
  last_error: string | null;
};

const DATABASE = "marixa-attendance-queue";
const STORE = "events";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Trình duyệt không hỗ trợ lưu hàng đợi offline.")); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "idempotency_key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không mở được hàng đợi offline."));
  });
}

export async function listQueuedAttendance(): Promise<QueuedAttendance[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as QueuedAttendance[]).sort((a, b) => a.queued_at.localeCompare(b.queued_at)));
      request.onerror = () => reject(request.error ?? new Error("Không đọc được hàng đợi offline."));
    });
  } finally { db.close(); }
}

export async function saveQueuedAttendance(item: QueuedAttendance): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không lưu được lượt chấm trên thiết bị."));
      tx.onabort = () => reject(tx.error ?? new Error("Không lưu được lượt chấm trên thiết bị."));
    });
  } finally { db.close(); }
}

export async function removeQueuedAttendance(idempotencyKey: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(idempotencyKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Không cập nhật được hàng đợi offline."));
      tx.onabort = () => reject(tx.error ?? new Error("Không cập nhật được hàng đợi offline."));
    });
  } finally { db.close(); }
}

export async function syncQueuedAttendance(): Promise<{ synced: number; remaining: number; message?: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, remaining: (await listQueuedAttendance()).length };
  const queue = await listQueuedAttendance();
  let synced = 0;
  let message: string | undefined;
  for (const item of queue) {
    if (item.requires_attention) continue;
    try {
      const result = await apiRequest<ApiEnvelope<{ id: string }>>("/api/v1/attendance/events", {
        method: "POST",
        body: JSON.stringify({
          kind: item.kind,
          source: "offline",
          device_occurred_at: item.device_occurred_at,
          idempotency_key: item.idempotency_key,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracy_m: item.accuracy_m,
          photo_expected: Boolean(item.photo),
        }),
      });
      if (item.photo) {
        const body = new FormData();
        body.set("photo", item.photo, `attendance-${item.kind}.webp`);
        await apiRequest(`/api/v1/attendance/events/${result.data.id}/photo`, { method: "POST", body });
      }
      await removeQueuedAttendance(item.idempotency_key);
      synced += 1;
    } catch (cause) {
      const conflict = cause instanceof ApiError && cause.status === 409;
      const updated = { ...item, requires_attention: conflict, last_error: cause instanceof Error ? cause.message : "Chưa đồng bộ được lượt chấm." };
      await saveQueuedAttendance(updated);
      message = updated.last_error;
      if (!(cause instanceof ApiError) || cause.status >= 500 || cause.status === 401) break;
    }
  }
  return { synced, remaining: (await listQueuedAttendance()).length, message };
}
