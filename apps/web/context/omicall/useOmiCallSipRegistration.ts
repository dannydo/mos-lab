import { Dispatch, MutableRefObject, SetStateAction, useEffect } from 'react';
import { message } from 'antd';
import { apiClient } from '../../lib/api-client';
import { cleanupOmiCallMediaBridge } from './mediaBridge';
import { CallState, CurrentCall } from './types';
import { playRingback, playRingtone, stopRingback, stopRingtone } from './useAudioManager';
import {
  clearIncomingNotification,
  getOmiCallSdkUid,
  recordOmiCallAudioDiagnostics,
  reinforceOmiCallMicrophoneSender,
  scheduleOmiCallMediaBridgeSync,
  triggerIncomingNotification,
  auditActiveCallAudio,
} from './useSipConnection';

interface UseOmiCallSipRegistrationParams {
  token: string | null;
  shouldInit: boolean;
  isSdkReadyRef: MutableRefObject<boolean>;
  isRegisteredRef: MutableRefObject<boolean>;
  sipConfigRef: MutableRefObject<SafeAny>;
  pendingOutboundCallRef: MutableRefObject<(() => Promise<void>) | null>;
  callStateRef: MutableRefObject<CallState>;
  currentCallRef: MutableRefObject<CurrentCall | null>;
  initOmiCallSdk: () => boolean;
  refreshAudioDevices: () => Promise<void>;
  setSipConfig: Dispatch<SetStateAction<SafeAny>>;
  setIsRegistered: Dispatch<SetStateAction<boolean>>;
  setIsSimulated: Dispatch<SetStateAction<boolean>>;
  setLastRegisterEvent: Dispatch<SetStateAction<SafeAny>>;
  setCallState: Dispatch<SetStateAction<CallState>>;
  setCurrentCall: Dispatch<SetStateAction<CurrentCall | null>>;
  setCallLogCustomerInfo: Dispatch<
    SetStateAction<{ legacyUserId: number; customerName: string; planId?: number | null } | null>
  >;
  setIsCallLogModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function useOmiCallSipRegistration({
  token,
  shouldInit,
  isSdkReadyRef,
  isRegisteredRef,
  sipConfigRef,
  pendingOutboundCallRef,
  callStateRef,
  currentCallRef,
  initOmiCallSdk,
  refreshAudioDevices,
  setSipConfig,
  setIsRegistered,
  setIsSimulated,
  setLastRegisterEvent,
  setCallState,
  setCurrentCall,
  setCallLogCustomerInfo,
  setIsCallLogModalOpen,
}: UseOmiCallSipRegistrationParams) {
  useEffect(() => {
    if (typeof window === 'undefined' || !token || !shouldInit) return;

    // Disable WebRTC connection in headless/test environments to prevent SIP single-registration lock conflicts
    if (typeof window !== 'undefined' && localStorage.getItem('mos_testing_bot') === 'true') {
      console.log('[OmiCallContext] Testing bot environment detected. Skipping real SIP connection.');
      setLastRegisterEvent({ status: 'skipped', message: 'Môi trường test tự động' });
      setIsSimulated(true);
      setIsRegistered(true);
      return;
    }

    let active = true;
    let checkInterval: SafeAny = null;
    let registrationTimeout: SafeAny = null;
    let initStarted = false;
    let isRegisteredLocal = false;

    let retryCount = 0;
    const MAX_RETRIES = 3;
    let retryTimer: SafeAny = null;
    let localSipConfig: SafeAny = null;

    const triggerAutoRetry = () => {
      if (!active || isRegisteredLocal) return;
      if (retryCount >= MAX_RETRIES) {
        console.warn('[OmiCallContext] Max registration retries reached. Falling back to Simulation Mode.');
        setLastRegisterEvent({
          status: 'failed',
          message: 'Không thể đăng ký máy lẻ sau 3 lần thử (lỗi mạng hoặc mật khẩu sai)',
        });
        setIsSimulated(true);
        setIsRegistered(true);
        if (registrationTimeout) {
          clearTimeout(registrationTimeout);
          registrationTimeout = null;
        }
        return;
      }

      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(async () => {
        if (!active || isRegisteredLocal) return;
        retryCount++;
        console.log(`[OmiCallContext] Retrying SIP registration (${retryCount}/${MAX_RETRIES})...`);
        try {
          const config = localSipConfig || (await apiClient.omicall.getSipConfig());
          if (config) {
            localSipConfig = config;
            sipConfigRef.current = config;
            await window.OMICallSDK.register({
              sipRealm: config.sipRealm,
              sipUser: config.sipUser,
              sipPassword: config.sipPassword,
              wssUri: 'wss://sig.omicrm.com',
            });
          }
        } catch (e) {
          console.warn('[OmiCallContext] Auto-retry registration failed:', e);
        }
      }, 4000);
    };

    // Define listener callbacks first to capture all SDK events immediately
    const handleRegister = (data: SafeAny) => {
      console.log('[OmiCallContext] register event:', data);
      setLastRegisterEvent(data);
      if (data?.status === 'connected') {
        isRegisteredLocal = true;
        isRegisteredRef.current = true;
        retryCount = 0;
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        if (registrationTimeout) {
          clearTimeout(registrationTimeout);
          registrationTimeout = null;
        }
        setIsRegistered(true);
        setIsSimulated(false);

        // Drain queued outbound call if waiting for SDK connection
        if (pendingOutboundCallRef.current) {
          console.log('[OmiCallContext] SDK connected! Executing queued outbound call...');
          const queuedCall = pendingOutboundCallRef.current;
          pendingOutboundCallRef.current = null;
          void queuedCall();
        }
      }
      if (data?.status === 'disconnect') {
        isRegisteredLocal = false;
        isRegisteredRef.current = false;
        setIsRegistered(false);
        if (pendingOutboundCallRef.current) {
          message.destroy('omicall_queue_msg');
          pendingOutboundCallRef.current = null;
          message.error('Mất kết nối tới tổng đài OmiCall.');
        }
        triggerAutoRetry();
      }
    };

    const handleInvite = (data: SafeAny) => {
      console.log('[OmiCallContext] invite event:', data);
      if (callStateRef.current !== 'idle') return;
      scheduleOmiCallMediaBridgeSync(data);

      const phone = data.phoneNumber || data.callerNumber || 'Unknown';
      setCallState('incoming');
      setCurrentCall({
        phone,
        name: 'Khách hàng gọi đến',
        direction: 'inbound',
        callUuid: data.callUuid || data.call_uuid || data.uuid || null,
        sdkUid: getOmiCallSdkUid(data),
      });
      playRingtone();
      triggerIncomingNotification(phone);
    };

    const handleRinging = (data: SafeAny) => {
      console.log('[OmiCallContext] ringing event:', data);
      scheduleOmiCallMediaBridgeSync(data);
      void recordOmiCallAudioDiagnostics(data, 'ringing');
      setCallState('ringing');
      if (currentCallRef.current?.direction === 'outbound') {
        playRingback();
      }
      if (data.callUuid || data.call_uuid || data.uuid || getOmiCallSdkUid(data)) {
        setCurrentCall((prev) =>
          prev
            ? {
                ...prev,
                callUuid: data.callUuid || data.call_uuid || data.uuid || prev.callUuid,
                sdkUid: getOmiCallSdkUid(data) || prev.sdkUid,
              }
            : null
        );
      }
    };

    const handleAccepted = (data: SafeAny) => {
      console.log('[OmiCallContext] accepted event:', data);
      scheduleOmiCallMediaBridgeSync(data);
      void reinforceOmiCallMicrophoneSender(data, 'accepted');
      void recordOmiCallAudioDiagnostics(data, 'accepted');
      setCallState('connected');
      stopRingtone();
      stopRingback();
      clearIncomingNotification();
      if (data.callUuid || data.call_uuid || data.uuid || getOmiCallSdkUid(data)) {
        setCurrentCall((prev) =>
          prev
            ? {
                ...prev,
                callUuid: data.callUuid || data.call_uuid || data.uuid || prev.callUuid,
                sdkUid: getOmiCallSdkUid(data) || prev.sdkUid,
              }
            : null
        );
      }
      setTimeout(auditActiveCallAudio, 1000);
      [3000, 8000].forEach((delay) => {
        setTimeout(
          () => void reinforceOmiCallMicrophoneSender((window as SafeAny).activeCall || data, `accepted+${delay}ms`),
          delay
        );
        setTimeout(
          () => void recordOmiCallAudioDiagnostics((window as SafeAny).activeCall || data, `accepted+${delay}ms`),
          delay
        );
      });
    };

    const handleEnded = (data: SafeAny) => {
      console.log('[OmiCallContext] ended event:', data);
      setCallState('wrapup');
      stopRingtone();
      stopRingback();
      clearIncomingNotification();
      if (data.callUuid || data.call_uuid) {
        setCurrentCall((prev) => (prev ? { ...prev, callUuid: data.callUuid || data.call_uuid } : null));
      }

      // Auto-open global CallLogModal only for customer calls (not internal staff calls)
      const activeCallDetail = currentCallRef.current;
      if (activeCallDetail?.legacyUserId) {
        setCallLogCustomerInfo({
          legacyUserId: activeCallDetail.legacyUserId,
          customerName: activeCallDetail.name || 'Khách hàng',
          planId: activeCallDetail.planId || null,
        });
        setIsCallLogModalOpen(true);
      }

      if (typeof cleanupOmiCallMediaBridge === 'function') {
        cleanupOmiCallMediaBridge(data);
      }
    };

    const attachSdkListeners = () => {
      if (!window.OMICallSDK) return;
      try {
        window.OMICallSDK.off?.('register', handleRegister);
        window.OMICallSDK.off?.('invite', handleInvite);
        window.OMICallSDK.off?.('ringing', handleRinging);
        window.OMICallSDK.off?.('accepted', handleAccepted);
        window.OMICallSDK.off?.('ended', handleEnded);
        window.OMICallSDK.on('register', handleRegister);
        window.OMICallSDK.on('invite', handleInvite);
        window.OMICallSDK.on('ringing', handleRinging);
        window.OMICallSDK.on('accepted', handleAccepted);
        window.OMICallSDK.on('ended', handleEnded);
      } catch (e) {
        console.error('[OmiCallContext] Failed to attach listeners:', e);
      }
    };

    // Register event listeners immediately if SDK is available
    attachSdkListeners();

    const initAndRegister = async () => {
      try {
        console.log('[OmiCallContext] Starting initAndRegister with token...');
        isRegisteredRef.current = false;
        setIsRegistered(false);
        setIsSimulated(false);

        const config = (await apiClient.omicall.getSipConfig()) as SafeAny;
        sipConfigRef.current = config;
        setSipConfig(config);
        localSipConfig = config;
        setIsSimulated(false);

        if (!active) return;

        // Initialize SDK singleton only once
        if (!(window as SafeAny).__omicall_initialized || !isSdkReadyRef.current) {
          initOmiCallSdk();
        } else {
          console.log('[OmiCallContext] OmiCall SDK singleton already initialized. Skipping init.');
        }

        // Always attach listeners even when initOmiCallSdk already ran on script.onload
        attachSdkListeners();

        // Request Microphone permission before registering device
        try {
          if (!window.isSecureContext) {
            message.error(
              '⚠️ CẢNH BÁO: Trình duyệt đang chạy ở chế độ không bảo mật (Insecure Context). Hãy truy cập qua http://localhost:4000 hoặc HTTPS để sử dụng Microphone và cuộc gọi!',
              15
            );
          }

          let micState = 'prompt';
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as SafeAny });
            micState = permissionStatus.state;
          } catch (_pe) {}

          if (micState === 'denied') {
            message.error(
              '⚠️ QUAN TRỌNG: Quyền truy cập Microphone đang bị chặn trên trình duyệt! Hãy nhấp vào biểu tượng chiếc khóa 🔒 ở bên trái thanh địa chỉ và chọn "Cho phép" (Allow) Microphone.',
              15
            );
          } else {
            // Only call getUserMedia if permission is not already granted to avoid locking the audio hardware during SDK init
            if (micState !== 'granted') {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach((t) => t.stop());
            }
            await refreshAudioDevices();
          }
        } catch (e) {
          console.warn('[OmiCallContext] Microphone permission request failed or denied:', e);
          message.error(
            '⚠️ Không thể kết nối cuộc gọi: Trình duyệt chưa được cấp quyền sử dụng Microphone. Vui lòng cấp quyền Microphone trên thanh địa chỉ!',
            15
          );
        }

        // Set connection timeout first to avoid race conditions: if not connected in 30s, auto fallback to Simulation mode
        registrationTimeout = setTimeout(() => {
          if (active && !isRegisteredLocal) {
            console.warn('[OmiCallContext] SIP registration timed out after 30s. Falling back to Simulation Mode.');
            setLastRegisterEvent({ status: 'timeout', message: 'Hết thời gian chờ phản hồi (30s) từ tổng đài' });
            setIsSimulated(true);
            setIsRegistered(true);
            message.warning('Kết nối tổng đài OmiCall bị treo. Đã chuyển sang chế độ mô phỏng.');
          }
        }, 30000);

        // Wait a brief moment for the SDK to check its cache and update its status
        await new Promise((resolve) => setTimeout(resolve, 600));

        const currentState = window.OMICallSDK.getSbState();
        console.log('[OmiCallContext] OmiCall SDK Switchboard state after init:', currentState);

        if (currentState === 'online') {
          console.log('[OmiCallContext] Already online via auto-reconnect! Skipping manual register.');
          isRegisteredLocal = true;
          isRegisteredRef.current = true;
          setIsRegistered(true);
          setIsSimulated(false);
          if (registrationTimeout) {
            clearTimeout(registrationTimeout);
            registrationTimeout = null;
          }
          if (pendingOutboundCallRef.current) {
            const queuedCall = pendingOutboundCallRef.current;
            pendingOutboundCallRef.current = null;
            void queuedCall();
          }
          return;
        }

        if (currentState === 'connecting') {
          console.log('[OmiCallContext] Already connecting via auto-reconnect! Waiting for event callbacks.');
          return;
        }

        // Only unregister if the current state is online or connecting
        if (currentState === 'online' || currentState === 'connecting') {
          if ((window as SafeAny).__omicall_initialized) {
            try {
              console.log('[OmiCallContext] Extension state is active/connecting. Unregistering first...');
              window.OMICallSDK.unregister();
              // Wait for SDK to release socket
              await new Promise((resolve) => setTimeout(resolve, 1200));
            } catch (e) {
              console.warn('[OmiCallContext] unregister failed:', e);
            }
          }
        }

        if (!active) return;

        // Register SIP extension manually
        console.log('[OmiCallContext] Extension is offline. Registering SIP extension manually...');
        const registerStatus = await window.OMICallSDK.register({
          sipRealm: config.sipRealm,
          sipUser: config.sipUser,
          sipPassword: config.sipPassword,
          wssUri: 'wss://sig.omicrm.com',
        });

        if (!active) return;

        if (!registerStatus || registerStatus.status) {
          console.log('[OmiCallContext] SIP device registration command sent successfully');
        } else {
          console.warn('[OmiCallContext] SIP registration request rejected.', registerStatus);
          isRegisteredLocal = false;
          setIsRegistered(false);
          setIsSimulated(false);
          if (registrationTimeout) {
            clearTimeout(registrationTimeout);
            registrationTimeout = null;
          }
        }
      } catch (err) {
        if ((err as SafeAny)?.response?.status === 404) {
          console.log(
            '[OmiCallContext] OmiCall WebRTC is not configured for this account. Call Simulation Mode enabled.'
          );
        } else {
          console.error('[OmiCallContext] SIP config or init failure. Call Simulation Mode enabled:', err);
        }
        setLastRegisterEvent({ status: 'failed', message: (err as Error).message || 'Lỗi cấu hình SIP' });
        setIsSimulated(true);
        setIsRegistered(true);
      }
    };

    const runInitOnce = () => {
      if (!active || initStarted) return;
      initStarted = true;
      // Execute immediately if user explicitly initiated an outbound call; otherwise wait for dashboard hydration
      if (callStateRef.current !== 'idle') {
        void initAndRegister();
        return;
      }
      setTimeout(() => {
        if (active) {
          void initAndRegister();
        }
      }, 4500);
    };

    const startCheck = () => {
      let duration = 0;
      if (window.OMICallSDK) {
        initOmiCallSdk();
        runInitOnce();
      } else {
        checkInterval = setInterval(() => {
          duration += 100;
          if (window.OMICallSDK) {
            clearInterval(checkInterval);
            initOmiCallSdk();
            runInitOnce();
          } else if (duration >= 4000) {
            console.warn('[OmiCallContext] OmiCall SDK load timed out. Enabling Simulation Mode.');
            clearInterval(checkInterval);
            setIsSimulated(true);
            setIsRegistered(true);
          }
        }, 100);
      }
    };

    startCheck();

    const handleUnload = () => {
      if (window.OMICallSDK && (window as SafeAny).__omicall_initialized) {
        try {
          window.OMICallSDK.unregister();
        } catch (e) {
          console.warn('[OmiCallContext] Safely caught unregister on beforeunload:', e);
        }
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      active = false;
      if (checkInterval) clearInterval(checkInterval);
      if (registrationTimeout) clearTimeout(registrationTimeout);
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('beforeunload', handleUnload);
      if (window.OMICallSDK) {
        try {
          window.OMICallSDK.off('register', handleRegister);
          window.OMICallSDK.off('invite', handleInvite);
          window.OMICallSDK.off('ringing', handleRinging);
          window.OMICallSDK.off('accepted', handleAccepted);
          window.OMICallSDK.off('ended', handleEnded);
        } catch (_e) {}
        if ((window as SafeAny).__omicall_initialized) {
          try {
            window.OMICallSDK.unregister();
          } catch (e) {
            console.warn('[OmiCallContext] Safely caught unregister on cleanup:', e);
          }
        }
      }
    };
  }, [token, shouldInit]);
}
