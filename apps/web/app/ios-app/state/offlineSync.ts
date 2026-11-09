'use client';

import { resolveApiBaseUrl } from '~/lib/api-base-url';

export interface OfflineAction {
  id: string;
  action: string;
  bookingId: number;
  payload: Record<string, any>;
  createdAt: string;
  retryCount: number;
}

const OFFLINE_ACTIONS_STORAGE_KEY = 'mos_ios_offline_actions';
const PROGRESS_STORAGE_PREFIX = 'mos_ios_progress_booking_';
export const ACTIVE_SERVICING_BOOKING_KEY = 'mos_ios_active_servicing_id';
export const ACTIVE_SERVICING_STEP_KEY = 'mos_ios_active_servicing_step';

const DB_NAME = 'mos_ios_app_db';
const DB_VERSION = 1;
const STORE_NAME = 'service_progress';

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveToIndexedDb(key: string, value: any): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getFromIndexedDb(key: string): Promise<any> {
  const db = await openIndexedDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Lấy ID ca làm đang phục vụ dở dang của CVL
 */
export function getActiveServicingBookingId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_SERVICING_BOOKING_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Lấy ID ca làm đang phục vụ dở dang của CVL bất đồng bộ (IndexedDB fallback)
 */
export async function getActiveServicingBookingIdAsync(): Promise<number | null> {
  const syncId = getActiveServicingBookingId();
  if (syncId) return syncId;
  try {
    const idbId = await getFromIndexedDb(ACTIVE_SERVICING_BOOKING_KEY);
    if (idbId) {
      const num = Number(idbId);
      setActiveServicingBookingId(num);
      return num;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Lấy bước tiến trình (step: 6..15) ca làm đang phục vụ dở dang của CVL
 */
export function getActiveServicingStep(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_SERVICING_STEP_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Lấy bước tiến trình (step: 6..15) ca làm đang phục vụ dở dang của CVL bất đồng bộ (IndexedDB fallback)
 */
export async function getActiveServicingStepAsync(): Promise<number | null> {
  const syncStep = getActiveServicingStep();
  if (syncStep) return syncStep;
  try {
    const idbStep = await getFromIndexedDb(ACTIVE_SERVICING_STEP_KEY);
    if (idbStep) {
      const num = Number(idbStep);
      setActiveServicingStep(num);
      return num;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Lưu hoặc xóa ID ca làm đang phục vụ dở dang của CVL
 */
export function setActiveServicingBookingId(bookingId: number | null) {
  if (typeof window === 'undefined') return;
  try {
    if (bookingId) {
      window.localStorage.setItem(ACTIVE_SERVICING_BOOKING_KEY, String(bookingId));
      void saveToIndexedDb(ACTIVE_SERVICING_BOOKING_KEY, bookingId);
    } else {
      window.localStorage.removeItem(ACTIVE_SERVICING_BOOKING_KEY);
      window.localStorage.removeItem(ACTIVE_SERVICING_STEP_KEY);
      void saveToIndexedDb(ACTIVE_SERVICING_BOOKING_KEY, null);
      void saveToIndexedDb(ACTIVE_SERVICING_STEP_KEY, null);
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to set active servicing booking ID:', err);
  }
}

/**
 * Lưu bước tiến trình ca làm đang phục vụ
 */
export function setActiveServicingStep(step: number | null) {
  if (typeof window === 'undefined') return;
  try {
    if (step) {
      window.localStorage.setItem(ACTIVE_SERVICING_STEP_KEY, String(step));
      void saveToIndexedDb(ACTIVE_SERVICING_STEP_KEY, step);
    } else {
      window.localStorage.removeItem(ACTIVE_SERVICING_STEP_KEY);
      void saveToIndexedDb(ACTIVE_SERVICING_STEP_KEY, null);
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to set active servicing step:', err);
  }
}

/**
 * Lấy danh sách các action đang chờ đồng bộ từ localStorage
 */
export function getPendingActions(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_ACTIONS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[OfflineSync] Failed to read pending actions:', err);
    return [];
  }
}

/**
 * Lưu một action vào hàng đợi offline
 */
export function enqueueOfflineAction(action: string, bookingId: number, payload: Record<string, any>): OfflineAction {
  const item: OfflineAction = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    action,
    bookingId,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  if (typeof window === 'undefined') return item;

  try {
    const current = getPendingActions();
    current.push(item);
    window.localStorage.setItem(OFFLINE_ACTIONS_STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('[OfflineSync] Failed to enqueue offline action:', err);
  }

  return item;
}

/**
 * Xóa một action đã sync thành công khỏi hàng đợi
 */
export function removeOfflineAction(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getPendingActions();
    const updated = current.filter((item) => item.id !== id);
    window.localStorage.setItem(OFFLINE_ACTIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[OfflineSync] Failed to remove offline action:', err);
  }
}

// In-memory cache to guarantee synchronous reads never lose data even if localStorage throws QuotaExceededError
const progressMemoryCache = new Map<number, any>();

/**
 * Lưu snapshot tiến độ ca làm vào memory, IndexedDB và localStorage phòng vệ
 */
export function saveLocalProgressSnapshot(bookingId: number, progress: any) {
  if (typeof window === 'undefined' || !bookingId) return;
  try {
    const existing = progressMemoryCache.get(bookingId) || getLocalProgressSnapshot(bookingId) || {};
    const merged = {
      ...existing,
      ...progress,
      bookingId,
      savedAt: new Date().toISOString(),
    };

    // 1. Luôn cập nhật bộ nhớ RAM ngay tức thì
    progressMemoryCache.set(bookingId, merged);

    // 2. Lưu vào IndexedDB (dung lượng gigabytes, lưu trữ an toàn ảnh base64 mà không sợ tràn quota)
    void saveToIndexedDb(`${PROGRESS_STORAGE_PREFIX}${bookingId}`, merged);

    // 3. Lưu phòng vệ vào localStorage (có cơ chế dọn dẹp chống QuotaExceededError)
    try {
      window.localStorage.setItem(`${PROGRESS_STORAGE_PREFIX}${bookingId}`, JSON.stringify(merged));
    } catch (lsErr) {
      console.warn('[OfflineSync] LocalStorage quota exceeded, pruning old keys and retrying:', lsErr);
      try {
        // Dọn dẹp snapshot của các ca làm khác khỏi localStorage để nhường chỗ
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(PROGRESS_STORAGE_PREFIX) && k !== `${PROGRESS_STORAGE_PREFIX}${bookingId}`) {
            window.localStorage.removeItem(k);
          }
        }
        // Xóa queue offline actions cũ nếu quá lớn
        window.localStorage.removeItem(OFFLINE_ACTIONS_STORAGE_KEY);
        window.localStorage.setItem(`${PROGRESS_STORAGE_PREFIX}${bookingId}`, JSON.stringify(merged));
      } catch {
        // Nếu vẫn đầy, lưu bản metadata nhẹ vào localStorage (ảnh thật đã nằm an toàn trong IndexedDB và RAM)
        try {
          const lightweight = {
            ...merged,
            beforePhotoUrl: merged.beforePhotoUrl ? '[persisted_in_idb]' : undefined,
            cleanedPhotoUrl: merged.cleanedPhotoUrl ? '[persisted_in_idb]' : undefined,
            afterPhotoUrl: merged.afterPhotoUrl ? '[persisted_in_idb]' : undefined,
          };
          window.localStorage.setItem(`${PROGRESS_STORAGE_PREFIX}${bookingId}`, JSON.stringify(lightweight));
        } catch {
          // ignore
        }
      }
    }

    // 4. Nếu có currentStep, đồng bộ vào ACTIVE_SERVICING_STEP
    if (progress.currentStep) {
      setActiveServicingStep(progress.currentStep);
    }

    // 5. Tự động neo active servicing booking ID nếu ca làm đang thực hiện
    if (progress.status !== 'DONE' && progress.currentStep && progress.currentStep >= 6) {
      setActiveServicingBookingId(bookingId);
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to save local progress snapshot:', err);
  }
}

/**
 * Đọc snapshot tiến độ ca làm từ RAM cache hoặc local storage
 */
export function getLocalProgressSnapshot(bookingId: number) {
  if (typeof window === 'undefined' || !bookingId) return null;
  // Ưu tiên đọc từ RAM cache trước
  const inMem = progressMemoryCache.get(bookingId);
  if (inMem) return inMem;
  try {
    const raw = window.localStorage.getItem(`${PROGRESS_STORAGE_PREFIX}${bookingId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.beforePhotoUrl === '[persisted_in_idb]') delete parsed.beforePhotoUrl;
      if (parsed.cleanedPhotoUrl === '[persisted_in_idb]') delete parsed.cleanedPhotoUrl;
      if (parsed.afterPhotoUrl === '[persisted_in_idb]') delete parsed.afterPhotoUrl;
      progressMemoryCache.set(bookingId, parsed);
      return parsed;
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to get local progress snapshot:', err);
  }
  return null;
}

/**
 * Đọc snapshot tiến độ ca làm bất đồng bộ (luôn load từ IndexedDB để phục hồi 100% ảnh After/Before kể cả khi localStorage bị đầy)
 */
export async function getLocalProgressSnapshotAsync(bookingId: number) {
  const memOrLs = getLocalProgressSnapshot(bookingId) || {};
  try {
    const idbSnap = await getFromIndexedDb(`${PROGRESS_STORAGE_PREFIX}${bookingId}`);
    if (idbSnap) {
      const merged = {
        ...memOrLs,
        ...idbSnap,
      };
      progressMemoryCache.set(bookingId, merged);
      return merged;
    }
  } catch {
    // ignore
  }
  return Object.keys(memOrLs).length > 0 ? memOrLs : null;
}

/**
 * Xóa hoàn toàn snapshot tiến độ của một booking khi Admin hủy ca hoặc trả về Chờ đón
 */
export function clearLocalProgressSnapshot(bookingId: number) {
  if (typeof window === 'undefined' || !bookingId) return;
  try {
    const idNum = Number(bookingId);
    progressMemoryCache.delete(idNum);
    window.localStorage.removeItem(`${PROGRESS_STORAGE_PREFIX}${idNum}`);
    void saveToIndexedDb(`${PROGRESS_STORAGE_PREFIX}${idNum}`, null);
    const activeId = getActiveServicingBookingId();
    if (activeId && Number(activeId) === idNum) {
      setActiveServicingBookingId(null);
      setActiveServicingStep(null);
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to clear local progress snapshot:', err);
  }
}

/**
 * Đồng bộ toàn bộ các action đang chờ lên máy chủ
 */
export async function syncPendingActions(actorInfo?: {
  staffId?: number;
  name?: string;
  tier?: string;
}): Promise<{ syncedCount: number; remainingCount: number }> {
  if (typeof window === 'undefined') return { syncedCount: 0, remainingCount: 0 };
  if (!navigator.onLine) {
    return { syncedCount: 0, remainingCount: getPendingActions().length };
  }

  const actions = getPendingActions();
  if (actions.length === 0) return { syncedCount: 0, remainingCount: 0 };

  const token = typeof window !== 'undefined' ? window.localStorage.getItem('mos_token') || '' : '';
  const effectiveAuth = token
    ? `Bearer ${token}`
    : process.env.NODE_ENV !== 'production'
      ? 'Bearer mock-token-for-dev'
      : undefined;
  let syncedCount = 0;

  for (const item of actions) {
    try {
      const apiBase = resolveApiBaseUrl();
      const res = await fetch(`${apiBase}/ios/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(effectiveAuth ? { Authorization: effectiveAuth } : {}),
        },
        body: JSON.stringify({
          bookingId: item.bookingId,
          action: item.action,
          actorStaffId: actorInfo?.staffId,
          actorStaffName: actorInfo?.name,
          actorStaffTier: actorInfo?.tier,
          ...item.payload,
          isOfflineSynced: true,
          offlineSyncedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        removeOfflineAction(item.id);
        syncedCount += 1;
      } else {
        // Tăng retry count
        item.retryCount += 1;
      }
    } catch (err) {
      console.warn(`[OfflineSync] Network error syncing action ${item.id}:`, err);
      break; // Mạng vẫn chưa ổn định, dừng vòng lặp
    }
  }

  return { syncedCount, remainingCount: getPendingActions().length };
}
