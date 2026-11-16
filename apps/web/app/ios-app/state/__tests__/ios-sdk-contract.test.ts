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
import { mergeServerBookingsWithLocalState } from '../iosBookingMerge';
import {
  enqueueOfflineAction,
  getLocalProgressSnapshot,
  getPendingActions,
  saveLocalProgressSnapshot,
  syncPendingActions,
} from '../offlineSync';
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

  it('resolves CC Thục Nghi with her own avatar and never falls back to Diễm Hương (37790)', () => {
    const withFullAuth = resolveActorProfile('CC', {
      id: 58,
      role: 'cc',
      displayName: 'Thục Nghi',
      legacyStaffId: 34295,
      avatarUrl: 'https://lh3.googleusercontent.com/thuc-nghi-avatar',
    });
    expect(withFullAuth.staffId).toBe(34295);
    expect(withFullAuth.name).toBe('Thục Nghi');
    expect(withFullAuth.avatar).toBe('https://lh3.googleusercontent.com/thuc-nghi-avatar');

    const withStaleLocalUser = resolveActorProfile('CC', {
      id: 58,
      role: 'cc',
      displayName: 'Thục Nghi',
    });
    expect(withStaleLocalUser.name).toBe('Thục Nghi');
    expect(withStaleLocalUser.avatar).toBe(KNOWN_STAFF_AVATARS['34295']);
    expect(withStaleLocalUser.avatar).not.toBe(KNOWN_STAFF_AVATARS['37790']);

    const unknownCc = resolveActorProfile('CC', {
      id: 999,
      role: 'cc',
      displayName: 'Minh Anh',
    });
    expect(unknownCc.name).toBe('Minh Anh');
    expect(unknownCc.avatar).toBeUndefined();

    const demoCc = resolveActorProfile('CC');
    expect(demoCc.staffId).toBe(37790);
    expect(demoCc.avatar).toBe(KNOWN_STAFF_AVATARS['37790']);
  });

  it('resolves Admin Khải (or any authenticated admin) to their own real account across CC, CVL, CVLL roles (MOS-BUG-233)', () => {
    const adminKhai = {
      id: 6,
      role: 'admin',
      displayName: 'Nguyễn Quang Khải',
      legacyStaffId: 45103,
      avatarUrl: 'https://lh3.googleusercontent.com/khai-avatar',
    };

    // 1. In CC role: MUST show Khải's account, NOT dummy Diễm Hương
    const ccActor = resolveActorProfile('CC', adminKhai);
    expect(ccActor.name).toBe('Nguyễn Quang Khải');
    expect(ccActor.staffId).toBe(45103);
    expect(ccActor.avatar).toBe('https://lh3.googleusercontent.com/khai-avatar');
    expect(ccActor.tier).toBe('CC');
    expect(ccActor.badgeLabel).toBe('CC · Tư Vấn Viên');

    // 2. In CVL role: MUST show Khải's account, NOT dummy Khanh Cao/Thảo Ly
    const cvlActor = resolveActorProfile('CVL', adminKhai);
    expect(cvlActor.name).toBe('Nguyễn Quang Khải');
    expect(cvlActor.staffId).toBe(45103);
    expect(cvlActor.avatar).toBe('https://lh3.googleusercontent.com/khai-avatar');
    expect(cvlActor.tier).toBe('CVL');

    // 3. In CVLL role: MUST show Khải's account
    const cvllActor = resolveActorProfile('CVLL', adminKhai);
    expect(cvllActor.name).toBe('Nguyễn Quang Khải');
    expect(cvllActor.staffId).toBe(45103);
    expect(cvllActor.avatar).toBe('https://lh3.googleusercontent.com/khai-avatar');
    expect(cvllActor.tier).toBe('CVLL');
  });

  it('persists and restores Admin selected role via localStorage mos_ios_selected_role', async () => {
    window.localStorage.setItem(
      'mos_user',
      JSON.stringify({
        id: 6,
        role: 'admin',
        displayName: 'Nguyễn Quang Khải',
        legacyStaffId: 45103,
      })
    );
    window.localStorage.setItem('mos_ios_selected_role', 'CC');

    vi.spyOn(apiClient.ios, 'getBookings').mockResolvedValue({
      success: true,
      bookings: [],
      counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
    } as any);

    const { result } = renderHook(() => useIosAppState(1, true, 'CVL', undefined, false));

    await waitFor(() => {
      expect(result.current.role).toBe('CC');
      expect(result.current.actor.name).toBe('Nguyễn Quang Khải');
    });

    // Test that changing role updates localStorage
    act(() => {
      result.current.setRole('CVLL');
    });
    expect(result.current.role).toBe('CVLL');
    expect(window.localStorage.getItem('mos_ios_selected_role')).toBe('CVLL');
  });

  it('refreshes stale mos_user via apiClient.auth.me when mos_token exists on mount', async () => {
    window.localStorage.setItem('mos_token', 'test-token');
    window.localStorage.setItem('mos_user', JSON.stringify({ id: 58, role: 'cc', displayName: 'Thục Nghi' }));
    vi.spyOn(apiClient.ios, 'getBookings').mockResolvedValue({
      success: true,
      bookings: [],
      counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
    } as any);
    const meSpy = vi.spyOn(apiClient.auth, 'me').mockResolvedValue({
      id: 58,
      username: 'thucnghitran2104@gmail.com',
      displayName: 'Thục Nghi',
      role: 'cc',
      isActive: true,
      legacyStaffId: 34295,
      avatarUrl: 'https://lh3.googleusercontent.com/thuc-nghi-fresh',
    } as any);

    const { result } = renderHook(() => useIosAppState(1, true, 'CC', undefined, false));

    await waitFor(() => {
      expect(meSpy).toHaveBeenCalledTimes(1);
      expect(result.current.actor.staffId).toBe(34295);
    });
    expect(result.current.actor.avatar).toBe('https://lh3.googleusercontent.com/thuc-nghi-fresh');
  });

  it('mergeServerBookingsWithLocalState propagates CHECKED_IN, INCOMING revert, and CANCELLED transitions immediately', () => {
    const baseBooking = {
      ...INITIAL_BOOKINGS[0],
      id: 338978,
      status: 'INCOMING' as const,
      assignedStaffId: 0,
      assignedStaffName: 'Chờ phân công (Đầu tua)',
    };

    // 1. Server poll reports CHECKED_IN (e.g. checked in on Legacy App or another iPad)
    const afterCheckIn = mergeServerBookingsWithLocalState(
      [baseBooking],
      [
        {
          ...baseBooking,
          status: 'CHECKED_IN',
          checkInStaffId: 37790,
          checkInStaffName: 'Diễm Hương',
          assignedStaffId: 46272,
          assignedStaffName: 'Thảo Ly',
        },
      ],
      0,
      6
    );
    expect(afterCheckIn[0]?.status).toBe('CHECKED_IN');
    expect(resolveCustomerBookingTab(afterCheckIn[0]!)).toBe('SERVICING');
    expect(afterCheckIn[0]?.assignedStaffId).toBe(46272);
    expect(afterCheckIn[0]?.assignedStaffName).toBe('Thảo Ly');

    // 2. Server poll reports INCOMING (reverted on Legacy App) -> clears local servicing snapshot
    saveLocalProgressSnapshot(338978, { status: 'SERVICING', currentStep: 7 });
    const afterRevert = mergeServerBookingsWithLocalState(
      [{ ...afterCheckIn[0]!, status: 'SERVICING' }],
      [{ ...baseBooking, status: 'INCOMING' }],
      0,
      6
    );
    expect(afterRevert[0]?.status).toBe('INCOMING');
    expect(resolveCustomerBookingTab(afterRevert[0]!)).toBe('INCOMING');
    expect(getLocalProgressSnapshot(338978)).toBeNull();

    // 3. Server poll reports CANCELLED -> transitions to CANCELLED and clears snapshot
    saveLocalProgressSnapshot(338978, { status: 'SERVICING', currentStep: 7 });
    const afterCancel = mergeServerBookingsWithLocalState(
      [{ ...afterCheckIn[0]!, status: 'SERVICING' }],
      [{ ...baseBooking, status: 'CANCELLED' }],
      0,
      6
    );
    expect(afterCancel[0]?.status).toBe('CANCELLED');
    expect(resolveCustomerBookingTab(afterCancel[0]!)).toBe('CANCEL');
    expect(getLocalProgressSnapshot(338978)).toBeNull();
  });
});
