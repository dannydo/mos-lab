import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useOmiCallSipRegistration } from '../useOmiCallSipRegistration';
import { useOmiCallActions } from '../useOmiCallActions';

const mockGetSipConfig = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    omicall: {
      getSipConfig: mockGetSipConfig,
    },
  },
}));

vi.mock('../useAudioManager', () => ({
  playRingback: vi.fn(),
  playRingtone: vi.fn(),
  stopRingback: vi.fn(),
  stopRingtone: vi.fn(),
}));

const mockPrepareMic = vi.hoisted(() => vi.fn());
const mockInstallMicPatch = vi.hoisted(() => vi.fn());
const mockEnsureOnline = vi.hoisted(() => vi.fn());

vi.mock('../useSipConnection', () => ({
  clearIncomingNotification: vi.fn(),
  getOmiCallSdkUid: vi.fn(() => 'uid-1'),
  recordOmiCallAudioDiagnostics: vi.fn(),
  reinforceOmiCallMicrophoneSender: vi.fn(),
  scheduleOmiCallMediaBridgeSync: vi.fn(),
  triggerIncomingNotification: vi.fn(),
  auditActiveCallAudio: vi.fn(),
  installPreparedMicrophonePatch: mockInstallMicPatch,
  prepareMicrophoneForOmiCall: mockPrepareMic,
  refreshOmiCallMediaDevices: vi.fn(),
  unlockAudioPlayback: vi.fn(),
  ensureOmiCallSwitchboardOnline: mockEnsureOnline,
}));

describe('OmiCall SIP listener attachment & queued outbound closure fixes', () => {
  const originalSdk = (window as SafeAny).OMICallSDK;
  const originalInitialized = (window as SafeAny).__omicall_initialized;
  const originalPermissions = navigator.permissions;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('mos_testing_bot');
    (navigator as SafeAny).permissions = {
      query: vi.fn().mockResolvedValue({ state: 'granted' }),
    };
  });

  afterEach(() => {
    (window as SafeAny).OMICallSDK = originalSdk;
    (window as SafeAny).__omicall_initialized = originalInitialized;
    (navigator as SafeAny).permissions = originalPermissions;
  });

  it('attaches SDK register listener even when __omicall_initialized and isSdkReadyRef are already true', async () => {
    const listeners = new Map<string, Set<(data: SafeAny) => void>>();
    const registerFn = vi.fn(async () => {
      listeners.get('register')?.forEach((cb) => cb({ status: 'connecting' }));
      listeners.get('register')?.forEach((cb) => cb({ status: 'connected' }));
      return { status: true };
    });

    (window as SafeAny).__omicall_initialized = true;
    (window as SafeAny).OMICallSDK = {
      SB_STATE: { ONLINE: 'online' },
      getSbState: () => 'offline',
      on: (evt: string, cb: (data: SafeAny) => void) => {
        if (!listeners.has(evt)) listeners.set(evt, new Set());
        listeners.get(evt)!.add(cb);
      },
      off: (evt: string, cb: (data: SafeAny) => void) => {
        listeners.get(evt)?.delete(cb);
      },
      register: registerFn,
      unregister: vi.fn(),
    };

    mockGetSipConfig.mockResolvedValue({
      sipRealm: 'quangnguyen2',
      sipUser: '110',
      sipPassword: 'decrypted-sip-password',
      phoneNumber: '02866810755',
    });

    const isSdkReadyRef = { current: true };
    const isRegisteredRef = { current: false };
    const sipConfigRef = { current: null as SafeAny };
    const queuedFn = vi.fn(async () => {});
    const pendingOutboundCallRef = { current: queuedFn as (() => Promise<void>) | null };
    const callStateRef = { current: 'confirming' as const };
    const currentCallRef = { current: null };
    const setIsRegistered = vi.fn();
    const setIsSimulated = vi.fn();

    function TestHarness() {
      useOmiCallSipRegistration({
        token: 'jwt-token',
        shouldInit: true,
        isSdkReadyRef,
        isRegisteredRef,
        sipConfigRef,
        pendingOutboundCallRef,
        callStateRef,
        currentCallRef,
        initOmiCallSdk: vi.fn(() => true),
        refreshAudioDevices: vi.fn(async () => {}),
        setSipConfig: vi.fn(),
        setIsRegistered,
        setIsSimulated,
        setLastRegisterEvent: vi.fn(),
        setCallState: vi.fn(),
        setCurrentCall: vi.fn(),
        setCallLogCustomerInfo: vi.fn(),
        setIsCallLogModalOpen: vi.fn(),
      });
      return null;
    }

    render(<TestHarness />);

    await waitFor(
      () => {
        expect(registerFn).toHaveBeenCalledTimes(1);
        expect(isRegisteredRef.current).toBe(true);
        expect(queuedFn).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 }
    );

    expect(setIsRegistered).toHaveBeenCalledWith(true);
    expect(setIsSimulated).toHaveBeenLastCalledWith(false);
    expect(pendingOutboundCallRef.current).toBeNull();
  });

  it('uses isRegisteredRef and sipConfigRef inside queued executeCall without re-queueing', async () => {
    const makeCallFn = vi.fn(async () => ({ uuid: 'call-uuid-1' }));
    let sbState = 'connecting';
    (window as SafeAny).__omicall_initialized = true;
    (window as SafeAny).OMICallSDK = {
      getSbState: () => sbState,
      makeCall: makeCallFn,
    };

    mockPrepareMic.mockResolvedValue({ getTracks: () => [] });
    mockInstallMicPatch.mockReturnValue({ release: vi.fn(), releaseIfUnused: vi.fn() });
    mockEnsureOnline.mockResolvedValue(true);

    const isSdkReadyRef = { current: true };
    const isRegisteredRef = { current: false };
    const sipConfigRef = { current: null as SafeAny };
    const pendingOutboundCallRef = { current: null as (() => Promise<void>) | null };
    const currentCallRef = {
      current: { phone: '0702610128', name: 'Bảo Hân', direction: 'outbound' as const },
    };

    const actions = useOmiCallActions({
      canAccessOmiCall: true,
      isAdmin: true,
      adminOmiCallEnabled: true,
      setAdminOmiCallEnabled: vi.fn(),
      isTabMuted: false,
      isSimulated: false,
      isRegistered: false,
      isRegisteredRef,
      sipConfig: null,
      sipConfigRef,
      currentCall: currentCallRef.current,
      isHeld: false,
      isSdkReadyRef,
      pendingOutboundCallRef,
      simulatedTimerRef: { current: null },
      currentCallRef,
      initOmiCallSdk: vi.fn(() => true),
      refreshAudioDevices: vi.fn(async () => {}),
      setOmicallReadyState: vi.fn(),
      setShouldInit: vi.fn(),
      setCallState: vi.fn(),
      setCurrentCall: vi.fn(),
      setIsSimulated: vi.fn(),
      setIsMuted: vi.fn(),
      setIsHeld: vi.fn(),
      setCallLogCustomerInfo: vi.fn(),
      setIsCallLogModalOpen: vi.fn(),
    });

    await actions.executeCall();
    expect(pendingOutboundCallRef.current).not.toBeNull();
    expect(makeCallFn).not.toHaveBeenCalled();

    // Simulate synchronous ref update inside handleRegister before React re-render
    sbState = 'online';
    isRegisteredRef.current = true;
    sipConfigRef.current = { phoneNumber: '02866810755' };

    const drained = pendingOutboundCallRef.current!;
    pendingOutboundCallRef.current = null;
    await drained();

    expect(makeCallFn).toHaveBeenCalledTimes(1);
    expect(makeCallFn).toHaveBeenCalledWith('0702610128', {
      sipNumber: { number: '02866810755' },
      userData: JSON.stringify({ customerName: 'Bảo Hân' }),
    });
  });
});
