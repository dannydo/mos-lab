'use client';

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
 * Lưu hoặc xóa ID ca làm đang phục vụ dở dang của CVL
 */
export function setActiveServicingBookingId(bookingId: number | null) {
  if (typeof window === 'undefined') return;
  try {
    if (bookingId) {
      window.localStorage.setItem(ACTIVE_SERVICING_BOOKING_KEY, String(bookingId));
    } else {
      window.localStorage.removeItem(ACTIVE_SERVICING_BOOKING_KEY);
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to set active servicing booking ID:', err);
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

/**
 * Lưu snapshot tiến độ ca làm vào local storage (mốc thời gian, ảnh before/after, seconds)
 */
export function saveLocalProgressSnapshot(bookingId: number, progress: any) {
  if (typeof window === 'undefined' || !bookingId) return;
  try {
    const existing = getLocalProgressSnapshot(bookingId) || {};
    window.localStorage.setItem(
      `${PROGRESS_STORAGE_PREFIX}${bookingId}`,
      JSON.stringify({
        ...existing,
        ...progress,
        savedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    console.warn('[OfflineSync] Failed to save local progress snapshot:', err);
  }
}

/**
 * Đọc snapshot tiến độ ca làm từ local storage
 */
export function getLocalProgressSnapshot(bookingId: number) {
  if (typeof window === 'undefined' || !bookingId) return null;
  try {
    const raw = window.localStorage.getItem(`${PROGRESS_STORAGE_PREFIX}${bookingId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn('[OfflineSync] Failed to get local progress snapshot:', err);
    return null;
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

  const token = window.localStorage.getItem('mos_token') || '';
  let syncedCount = 0;

  for (const item of actions) {
    try {
      const res = await fetch('/api/ios/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
