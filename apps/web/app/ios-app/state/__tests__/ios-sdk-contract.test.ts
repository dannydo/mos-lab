// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { apiClient } from '~/lib/api-client';
import {
  INITIAL_BOOKINGS,
  COMBO_PACKAGES_CVL,
  SERUM_TIERS_CVL,
  STAFF_QUEUE,
  SALON_INFO,
  KNOWN_STAFF_AVATARS,
  resolveStaffAvatarUrl,
  filterBookingsForCvlScope,
  resolveCustomerBookingTab,
  resolveServicingSubStatus,
} from '../mockData';
import { enqueueOfflineAction, getPendingActions, syncPendingActions } from '../offlineSync';
import { thermalPrinterService } from '../../services/thermalPrinterService';
import { useIosAppState, resolveActorProfile } from '../useIosAppState';

describe('iOS State, SDK Integration & Live/Demo Mode Contract', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('re-exports shared helpers, catalog & avatars from mockData without raw feather emoji', () => {
    expect(INITIAL_BOOKINGS.length).toBeGreaterThan(0);
    expect(COMBO_PACKAGES_CVL.length).toBe(4);
    expect(SERUM_TIERS_CVL.length).toBe(4);
    expect(STAFF_QUEUE.length).toBeGreaterThan(0);
    expect(SALON_INFO.storeId).toBe(6);
    expect(resolveStaffAvatarUrl(null, 13783, 'Khanh Cao')).toBe(KNOWN_STAFF_AVATARS['13783']);
    expect(
      resolveStaffAvatarUrl('https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg', 3832, 'Ánh Tuyết')
    ).toBe('https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg');
    expect(resolveStaffAvatarUrl(null, 3832, 'Ánh Tuyết')).toBe(KNOWN_STAFF_AVATARS['3832']);
    expect(typeof filterBookingsForCvlScope).toBe('function');
    expect(typeof resolveCustomerBookingTab).toBe('function');
    expect(typeof resolveServicingSubStatus).toBe('function');

    const serializedCatalog = JSON.stringify({
      COMBO_PACKAGES_CVL,
      SERUM_TIERS_CVL,
      STAFF_QUEUE,
      actorCvl: resolveActorProfile('CVL'),
      actorCvll: resolveActorProfile('CVLL'),
    });
    expect(serializedCatalog.includes('\u{1FAB6}')).toBe(false);
  });

  it('syncPendingActions delegates to apiClient.ios.executeBookingAction and clears synced items', async () => {
    const execSpy = vi.spyOn(apiClient.ios, 'executeBookingAction').mockResolvedValue({ success: true } as any);

    enqueueOfflineAction('CHECK_IN', 336695, { note: 'offline-checkin' });
    expect(getPendingActions()).toHaveLength(1);

    const res = await syncPendingActions({ staffId: 13783, name: 'Khanh Cao', tier: 'CVL' });
    expect(execSpy).toHaveBeenCalledTimes(1);
    expect(execSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 336695,
        action: 'CHECK_IN',
        actorStaffId: 13783,
        isOfflineSynced: true,
      })
    );
    expect(res.syncedCount).toBe(1);
    expect(res.remainingCount).toBe(0);
  });

  it('thermalPrinterService uses apiClient.ios.printReceipt when configured for LAN_IP', async () => {
    const printSpy = vi.spyOn(apiClient.ios, 'printReceipt').mockResolvedValue({ success: true } as any);
    thermalPrinterService.setConnectionType('LAN_IP', '192.168.1.200');

    const result = await thermalPrinterService.printReceipt({
      orderId: 336695,
      customerName: 'Chị Trúc',
      staffName: 'Khanh Cao',
      storeName: 'Chi nhánh Đề Thám',
      storeAddress: '159A Đề Thám',
      storePhone: '0937554430',
      dateStr: '12/11/2026',
      services: [{ name: 'New Flawless Mink 770', price: 770000 }],
      subtotal: 770000,
      discount: 0,
      tipAmount: 100000,
      total: 870000,
      paymentMethod: 'VIETQR',
    });

    expect(printSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        printerIp: '192.168.1.200',
        rawText: expect.stringContaining('WINGS LASHES'),
      })
    );
    expect(result.success).toBe(true);
    thermalPrinterService.setConnectionType('BLUETOOTH');
  });

  it('Live Mode (isDemoMode=false) starts with empty bookings, omits demo param, and never injects INITIAL_BOOKINGS on network error', async () => {
    const getSpy = vi.spyOn(apiClient.ios, 'getBookings').mockRejectedValue(new Error('Network offline'));

    const { result } = renderHook(() => useIosAppState(1, true, 'CVL', undefined, false));

    expect(result.current.bookings).toEqual([]);
    expect(result.current.isDemoMode).toBe(false);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalled();
    });

    const firstCallParams = getSpy.mock.calls[0]?.[0];
    expect(firstCallParams?.demo).toBeUndefined();
    expect(result.current.bookings).toEqual([]);
  });

  it('Demo Mode (isDemoMode=true) passes demo:true to apiClient.ios.getBookings and retains INITIAL_BOOKINGS fallback when offline', async () => {
    const getSpy = vi.spyOn(apiClient.ios, 'getBookings').mockRejectedValue(new Error('Offline demo'));

    const { result } = renderHook(() => useIosAppState(1, true, 'CC', undefined, true));

    expect(result.current.bookings.length).toBe(INITIAL_BOOKINGS.length);
    expect(result.current.isDemoMode).toBe(true);

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalled();
    });

    const firstCallParams = getSpy.mock.calls[0]?.[0];
    expect(firstCallParams?.demo).toBe(true);
    expect(result.current.bookings.length).toBe(INITIAL_BOOKINGS.length);
  });

  it('preserves handleUpdateCustomerAvatar optimistic update and posts UPDATE_CUSTOMER_AVATAR via SDK', async () => {
    vi.spyOn(apiClient.ios, 'getBookings').mockResolvedValue({
      success: true,
      bookings: [INITIAL_BOOKINGS[2]],
      counts: { incoming: 1, servicing: 0, done: 0, cancel: 0 },
    } as any);
    const execSpy = vi.spyOn(apiClient.ios, 'executeBookingAction').mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useIosAppState(2, true, 'CVL', 336695, false));

    await waitFor(() => {
      expect(result.current.bookings).toHaveLength(1);
    });

    await act(async () => {
      await result.current.handleUpdateCustomerAvatar('https://cdn.wingslashes.com/new-avatar.jpg', 336695);
    });

    expect(result.current.bookings[0]?.customerAvatar).toBe('https://cdn.wingslashes.com/new-avatar.jpg');
    expect(execSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 336695,
        action: 'UPDATE_CUSTOMER_AVATAR',
        customerAvatar: 'https://cdn.wingslashes.com/new-avatar.jpg',
      })
    );
  });
});
