import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";

export type QueuedAttendance = {
  employee_id: string;
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
  attempts: number;
  next_retry_at: string | null;
  status: "local_only" | "event_synced_photo_pending" | "retry_error" | "requires_attention";
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

export async function listQueuedAttendance(employeeId: string): Promise<QueuedAttendance[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as QueuedAttendance[])
        .filter(item => item.employee_id === employeeId)
        .sort((a, b) => a.queued_at.localeCompare(b.queued_at)));
      request.onerror = () => reject(request.error ?? new Error("Không đọc được hàng đợi offline."));
    });
  } finally { db.close(); }
}

export async function countUnassignedQueuedAttendance(): Promise<number> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as QueuedAttendance[])
        .filter(item => !item.employee_id).length);
      request.onerror = () => reject(request.error ?? new Error("Không kiểm tra được hàng đợi cũ."));
    });
  } finally { db.close(); }
}

export async function saveQueuedAttendance(item: QueuedAttendance): Promise<void> {
  if (!item.employee_id) throw new Error("Không xác định được chủ sở hữu lượt chấm offline.");
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

export async function syncQueuedAttendance(employeeId: string, force = false): Promise<{ synced: number; remaining: number; message?: string }> {
  if (!employeeId) throw new Error("Không xác định được tài khoản để đồng bộ lượt chấm.");
  if (typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, remaining: (await listQueuedAttendance(employeeId)).length };
  const queue = await listQueuedAttendance(employeeId);
  let synced = 0;
  let message: string | undefined;
  for (const item of queue) {
    if (item.requires_attention) continue;
    if (!force && item.next_retry_at && Date.parse(item.next_retry_at) > Date.now()) continue;
    let eventSynced = false;
    try {
      const result = await apiRequest<ApiEnvelope<{ id: string }>>("/api/v1/attendance/events", {
        method: "POST",
        body: JSON.stringify({
          kind: item.kind,
          source: "offline",
          device_occurred_at: item.device_occurred_at,
          idempotency_key: item.idempotency_key,
          queue_owner_id: item.employee_id,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracy_m: item.accuracy_m,
          photo_expected: Boolean(item.photo),
        }),
      });
      eventSynced = true;
      if (item.photo) {
        await saveQueuedAttendance({ ...item, status: "event_synced_photo_pending", next_retry_at: null });
        const body = new FormData();
        body.set("photo", item.photo, `attendance-${item.kind}.webp`);
        await apiRequest(`/api/v1/attendance/events/${result.data.id}/photo`, { method: "POST", body });
      }
      await removeQueuedAttendance(item.idempotency_key);
      synced += 1;
    } catch (cause) {
      const conflict = cause instanceof ApiError && cause.status === 409;
      const attention = conflict || (cause instanceof ApiError && [400, 422].includes(cause.status));
      const attempts = (item.attempts ?? 0) + 1;
      const delayMs = Math.min(300_000, 1000 * 2 ** Math.min(attempts - 1, 8));
      const updated: QueuedAttendance = { ...item, attempts, requires_attention: attention,
        status: attention ? "requires_attention" : eventSynced ? "event_synced_photo_pending" : "retry_error",
        next_retry_at: attention ? null : new Date(Date.now() + delayMs).toISOString(),
        last_error: cause instanceof Error ? cause.message : "Chưa đồng bộ được lượt chấm." };
      await saveQueuedAttendance(updated);
      message = updated.last_error ?? undefined;
      if (!(cause instanceof ApiError) || cause.status >= 500 || cause.status === 401) break;
    }
  }
  return { synced, remaining: (await listQueuedAttendance(employeeId)).length, message };
}
