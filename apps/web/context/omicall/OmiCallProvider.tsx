'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../../lib/api-client';
import { message } from 'antd';
import { CallState, CurrentCall, OmiCallContextType } from './types';
import {
  useAudioManager,
  playRingtone,
  stopRingtone,
  playRingback,
  stopRingback,
  applyOmiCallAudioOutputToActiveMedia,
} from './useAudioManager';
import {
  installOmiCallMediaConstraintPatch,
  installOmiCallPeerConnectionTracker,
  getMicrophoneConstraints,
  prepareMicrophoneForOmiCall,
  installPreparedMicrophonePatch,
  refreshOmiCallMediaDevices,
  unlockAudioPlayback,
  ensureOmiCallSwitchboardOnline,
  getOmiCallSdkUid,
  scheduleOmiCallMediaBridgeSync,
  recordOmiCallAudioDiagnostics,
  reinforceOmiCallMicrophoneSender,
  cleanupOmiCallMediaBridge,
  auditActiveCallAudio,
  triggerIncomingNotification,
  clearIncomingNotification,
} from './useSipConnection';

const OmiCallContext = createContext<OmiCallContextType | undefined>(undefined);

export function OmiCallProvider({ children }: { children: React.ReactNode }) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkErrors] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [sipConfig, setSipConfig] = useState<SafeAny>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const simulatedTimerRef = useRef<SafeAny>(null);
  const [shouldInit, setShouldInit] = useState(false);
  const [omicallReady, setOmicallReadyState] = useState(false);
  const [lastRegisterEvent, setLastRegisterEvent] = useState<SafeAny>(null);

  // Global CallLogModal states
  const [isCallLogModalOpen, setIsCallLogModalOpen] = useState(false);
  const [callLogCustomerInfo, setCallLogCustomerInfo] = useState<{
    legacyUserId: number;
    customerName: string;
    planId?: number | null;
  } | null>(null);

  // Shared AI Analysis states
  const [resolvedLog, setResolvedLog] = useState<SafeAny>(null);
  const [submittingWrapup, setSubmittingWrapup] = useState(false);

  const openCallLogModal = useCallback(
    (info: { legacyUserId: number; customerName: string; planId?: number | null }) => {
      setCallLogCustomerInfo(info);
      setIsCallLogModalOpen(true);
    },
    []
  );

  const closeCallLogModal = useCallback(() => {
    setIsCallLogModalOpen(false);
    setCallLogCustomerInfo(null);
    if (callStateRef.current === 'wrapup') {
      setCallState('idle');
      setCurrentCall(null);
      setResolvedLog(null);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('mos_token'));
    }
  }, []);

  // Load initial value of omicallReady from localStorage once token is available
  useEffect(() => {
    if (token) {
      const resolvedAutoInit = localStorage.getItem('mos_omicall_auto_init');
      if (resolvedAutoInit === 'true') {
        setOmicallReadyState(true);
      }
    }
  }, [token]);

  // Set ready status helper
  const setOmicallReady = (ready: boolean) => {
    setOmicallReadyState(ready);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_omicall_auto_init', String(ready));
      // If we turned it off, unregister OmiCall to release connection resources
      if (!ready && window.OMICallSDK) {
        try {
          window.OMICallSDK.unregister();
        } catch (e) {
          console.error('[OmiCallContext] Failed to unregister on toggle off:', e);
        }
        setIsRegistered(false);
        setShouldInit(false);
      }
    }
  };

  // Run initialization when omicallReady & token are true
  useEffect(() => {
    if (omicallReady && token) {
      setShouldInit(true);
    }
  }, [omicallReady, token]);

  // Call States
  const [callState, setCallState] = useState<CallState>('idle');
  const callStateRef = useRef<CallState>('idle');
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const [currentCall, setCurrentCall] = useState<CurrentCall | null>(null);
  const currentCallRef = useRef<CurrentCall | null>(null);
  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  // Multi-Tab Sync State
  const [isTabMuted] = useState(false);

  // Use the extracted Audio Manager hook
  const {
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    refreshAudioDevices,
  } = useAudioManager(callState);

  // Listen to audio input selected reinforcement requests
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleReinforce = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const activeCall = (window as SafeAny).activeCall;
      if (activeCall) {
        void reinforceOmiCallMicrophoneSender(activeCall, detail.reason, { forceNewStream: detail.forceNewStream });
        void recordOmiCallAudioDiagnostics(activeCall, detail.reason);
      }
    };
    window.addEventListener('mos_omicall_reinforce', handleReinforce);

    const handleNotification = (e: Event) => {
      const { type, content, duration } = (e as CustomEvent).detail;
      if (type === 'success') message.success(content, duration);
      else if (type === 'error') message.error(content, duration);
      else if (type === 'warning') message.warning(content, duration);
      else if (type === 'info') message.info(content, duration);
    };
    window.addEventListener('omicall-notification', handleNotification);

    return () => {
      window.removeEventListener('mos_omicall_reinforce', handleReinforce);
      window.removeEventListener('omicall-notification', handleNotification);
    };
  }, []);

  // 1. Dynamic Script Loading
  useEffect(() => {
    if (typeof window === 'undefined' || !shouldInit) return;

    installOmiCallMediaConstraintPatch();
    installOmiCallPeerConnectionTracker();

    const existing = document.querySelector('script[src*="core.min.js"]');
    if (existing) {
      setSdkLoaded(true);
      return;
    }

    const scriptUrl = process.env.NEXT_PUBLIC_OMICALL_SDK_URL || '/core.min.js';
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.setAttribute('omi-call-sdk', '');
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => {
      console.log('[OmiCallContext] OmiCall SDK loaded successfully');
      setSdkLoaded(true);
    };
    script.onerror = () => {
      console.error('[OmiCallContext] Failed to load OmiCall SDK script. Enabling simulation mode.');
      setSdkErrors(true);
      setIsSimulated(true);
      setIsRegistered(true);
    };
    document.body.appendChild(script);
  }, [shouldInit]);

  // 3. Audio Recording Timer
  useEffect(() => {
    let timer: SafeAny = null;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (callState === 'idle') {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  // Polling AI analysis log during wrapup
  useEffect(() => {
    if (callState !== 'wrapup' || !currentCall) {
      setResolvedLog(null);
      return;
    }

    if (isSimulated) {
      setResolvedLog({
        id: 0,
        customerName: currentCall.name,
        legacyUserId: currentCall.legacyUserId || 0,
        callUuid: currentCall.callUuid || 'simulated-' + Date.now(),
      });
      return;
    }

    let intervalId: SafeAny = null;
    let attempts = 0;

    const pollLog = async () => {
      attempts++;
      try {
        const data = (await apiClient.omicall.getLatestLog({
          phone: currentCall.phone,
          direction: currentCall.direction,
        })) as SafeAny;

        if (data && data.id) {
          setResolvedLog(data);

          // Update current call with resolved customer name and ID
          setCurrentCall({
            ...currentCall,
            legacyUserId: data.legacyUserId,
            name: data.customerName || currentCall.name,
            callUuid: data.callUuid,
          });

          clearInterval(intervalId);
          return;
        }
      } catch (err) {
        // Log not ready yet
      }

      if (attempts >= 20) {
        console.warn('[OmiCallWidget] AI analysis polling timed out');
        clearInterval(intervalId);
      }
    };

    intervalId = setInterval(pollLog, 3000);
    pollLog();
    return () => clearInterval(intervalId);
  }, [callState, currentCall, isSimulated, setCurrentCall]);

  // 4. SDK Initialise and SIP Device registration
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
            await window.OMICallSDK.register({
              sipRealm: config.sipRealm,
              sipUser: config.sipUser,
              sipPassword: config.sipPassword,
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
      }
      if (data?.status === 'disconnect') {
        isRegisteredLocal = false;
        setIsRegistered(false);
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

      // Auto-open global CallLogModal
      const activeCallDetail = currentCallRef.current;
      if (activeCallDetail) {
        setCallLogCustomerInfo({
          legacyUserId: activeCallDetail.legacyUserId || 0,
          customerName: activeCallDetail.name || 'Khách hàng',
          planId: activeCallDetail.planId || null,
        });
        setIsCallLogModalOpen(true);
      }

      cleanupOmiCallMediaBridge(data);
    };

    // Register event listeners immediately if SDK is available
    if (window.OMICallSDK) {
      try {
        window.OMICallSDK.on('register', handleRegister);
        window.OMICallSDK.on('invite', handleInvite);
        window.OMICallSDK.on('ringing', handleRinging);
        window.OMICallSDK.on('accepted', handleAccepted);
        window.OMICallSDK.on('ended', handleEnded);
      } catch (e) {
        console.error('[OmiCallContext] Failed to attach listeners early:', e);
      }
    }

    const initAndRegister = async () => {
      try {
        console.log('[OmiCallContext] Starting initAndRegister with token...');
        setIsRegistered(false);
        setIsSimulated(false);

        const config = (await apiClient.omicall.getSipConfig()) as SafeAny;
        setSipConfig(config);
        localSipConfig = config;
        setIsSimulated(false);

        if (!active) return;

        // Initialize SDK singleton only once
        if (!(window as SafeAny).__omicall_initialized) {
          console.log('[OmiCallContext] Initializing OmiCall SDK singleton...');
          window.OMICallSDK.init({
            allowMultiTab: true,
            rootBody: document.getElementById('omicall-root') || document.body,
            media: {
              constraints: {
                audio: getMicrophoneConstraints(),
                video: false,
              },
            },
          });
          (window as SafeAny).__omicall_initialized = true;

          // Re-attach listeners now that SDK init is finished to ensure registration events bind properly
          try {
            window.OMICallSDK.on('register', handleRegister);
            window.OMICallSDK.on('invite', handleInvite);
            window.OMICallSDK.on('ringing', handleRinging);
            window.OMICallSDK.on('accepted', handleAccepted);
            window.OMICallSDK.on('ended', handleEnded);
          } catch (e) {}
        } else {
          console.log('[OmiCallContext] OmiCall SDK singleton already initialized. Skipping init.');
        }

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
          } catch (pe) {}

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
          setIsRegistered(true);
          setIsSimulated(false);
          if (registrationTimeout) {
            clearTimeout(registrationTimeout);
            registrationTimeout = null;
          }
          return;
        }

        if (currentState === 'connecting') {
          console.log('[OmiCallContext] Already connecting via auto-reconnect! Waiting for event callbacks.');
          return;
        }

        // Only unregister if the current state is online or connecting
        if (currentState === 'online' || currentState === 'connecting') {
          try {
            console.log('[OmiCallContext] Extension state is active/connecting. Unregistering first...');
            window.OMICallSDK.unregister();
            // Wait for SDK to release socket
            await new Promise((resolve) => setTimeout(resolve, 1200));
          } catch (e) {
            console.warn('[OmiCallContext] unregister failed:', e);
          }
        }

        if (!active) return;

        // Register SIP extension manually
        console.log('[OmiCallContext] Extension is offline. Registering SIP extension manually...');
        const registerStatus = await window.OMICallSDK.register({
          sipRealm: config.sipRealm,
          sipUser: config.sipUser,
          sipPassword: config.sipPassword,
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
      // Wait 4500ms on mount/bootstrap to let page fetches finish, layout hydrate, and SDK stabilize
      setTimeout(() => {
        if (active) {
          void initAndRegister();
        }
      }, 4500);
    };

    const startCheck = () => {
      let duration = 0;
      if (window.OMICallSDK) {
        runInitOnce();
      } else {
        checkInterval = setInterval(() => {
          duration += 100;
          if (window.OMICallSDK) {
            clearInterval(checkInterval);
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
      if (window.OMICallSDK) {
        window.OMICallSDK.unregister();
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
        } catch (e) {}
        try {
          window.OMICallSDK.unregister();
        } catch (e) {}
      }
    };
  }, [token, shouldInit]);

  // 5. Calling Actions
  const makeCall = async (phone: string, name?: string, customerId?: number, avatar?: string, planId?: number) => {
    if (isTabMuted) {
      message.warning('Có cuộc gọi đang diễn ra trên một tab khác.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    setCallState('confirming');
    setCurrentCall({
      phone: cleanPhone,
      name: name || 'Khách hàng',
      direction: 'outbound',
      legacyUserId: customerId,
      avatar: avatar || null,
      planId: planId || null,
    });
    setShouldInit(true);
  };

  const executeCall = async () => {
    if (!currentCall) return;
    const { phone: cleanPhone, name, legacyUserId: customerId, avatar } = currentCall;

    if (isSimulated) {
      console.log(`[OmiCallContext] Simulating outbound call to ${cleanPhone}...`);
      try {
        setCallState('ringing');
        playRingback();

        if (simulatedTimerRef.current) clearTimeout(simulatedTimerRef.current);
        simulatedTimerRef.current = setTimeout(() => {
          stopRingback();
          try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
              const connectCtx = new AudioContextClass();
              const osc = connectCtx.createOscillator();
              const gain = connectCtx.createGain();
              osc.connect(gain);
              gain.connect(connectCtx.destination);
              osc.type = 'sine';
              osc.frequency.setValueAtTime(600, connectCtx.currentTime);
              gain.gain.setValueAtTime(0.08, connectCtx.currentTime);
              osc.start(connectCtx.currentTime);
              osc.stop(connectCtx.currentTime + 0.15);
            }
          } catch (e) {}

          setCallState('connected');
          console.log('[OmiCallContext] Simulated call connected.');
        }, 2500);
      } catch (err) {
        console.error('[OmiCallContext] Simulated makeCall failed:', err);
        setCallState('idle');
        setCurrentCall(null);
      }
      return;
    }

    if (!isRegistered || !window.OMICallSDK) {
      message.error('Vui lòng đợi thiết bị SIP đăng ký thành công.');
      return;
    }

    let preparedMicrophonePatch: ReturnType<typeof installPreparedMicrophonePatch> | null = null;
    let preparedMicrophoneStream: MediaStream | null | undefined = null;

    try {
      preparedMicrophoneStream = await prepareMicrophoneForOmiCall();
      if (!preparedMicrophoneStream) {
        message.error('Không chuẩn bị được microphone để thực hiện cuộc gọi.', 12);
        return;
      }
      preparedMicrophonePatch = installPreparedMicrophonePatch(preparedMicrophoneStream);
      await refreshOmiCallMediaDevices();
      await refreshAudioDevices();
      await unlockAudioPlayback();
    } catch (err) {
      console.warn('[OmiCallContext] Microphone preflight failed:', err);
      message.error((err as SafeAny)?.message || 'Vui lòng cấp quyền Microphone để thực hiện cuộc gọi.', 12);
      preparedMicrophonePatch?.releaseIfUnused();
      return;
    }

    try {
      const isSwitchboardOnline = await ensureOmiCallSwitchboardOnline();
      if (!isSwitchboardOnline) {
        preparedMicrophonePatch?.releaseIfUnused();
        message.error('Tổng đài OmiCall chưa trực tuyến. Vui lòng thử lại sau vài giây.');
        return;
      }

      const hotlineNumber = sipConfig?.phoneNumber || '';
      const omicallCall = await window.OMICallSDK.makeCall(cleanPhone, {
        ...(hotlineNumber ? { sipNumber: { number: hotlineNumber } } : {}),
        userData: JSON.stringify({
          customerName: name || 'Khách hàng',
        }),
      });

      if (!omicallCall) {
        preparedMicrophonePatch?.release();
        console.warn('[OmiCallContext] OmiCall SDK did not create an outbound call.');
        message.error('OmiCall chưa tạo được cuộc gọi thật. Vui lòng đợi trạng thái tổng đài sẵn sàng rồi gọi lại.');
        setCallState('idle');
        setCurrentCall(null);
        return;
      }

      omicallCall.__mosMicrophoneStream = preparedMicrophoneStream;
      omicallCall.__mosPreparedMicrophonePatch = preparedMicrophonePatch;
      scheduleOmiCallMediaBridgeSync(omicallCall);
      void reinforceOmiCallMicrophoneSender(omicallCall, 'outbound-created');
      void recordOmiCallAudioDiagnostics(omicallCall, 'outbound-created');
      setCallState('ringing');
      setIsMuted(false);
      setIsHeld(false);
      setCurrentCall({
        phone: cleanPhone,
        name: name || 'Khách hàng',
        direction: 'outbound',
        callUuid: omicallCall.uuid || null,
        sdkUid: getOmiCallSdkUid(omicallCall),
        legacyUserId: customerId,
        avatar: avatar || null,
      });
      playRingback();
    } catch (err) {
      preparedMicrophonePatch?.release();
      console.error('[OmiCallContext] makeCall failed:', err);
      message.error('Lỗi khi thực hiện cuộc gọi: ' + (err as SafeAny).message);
      setCallState('idle');
      setCurrentCall(null);
    }
  };

  const cancelConfirm = () => {
    setCallState('idle');
    setCurrentCall(null);
  };

  const answerCall = () => {
    const activeCall = (window as SafeAny).activeCall;
    scheduleOmiCallMediaBridgeSync(activeCall);
    void reinforceOmiCallMicrophoneSender(activeCall, 'answer');
    void recordOmiCallAudioDiagnostics(activeCall, 'answer');
    if (activeCall && typeof activeCall.accept === 'function') {
      activeCall.accept();
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as SafeAny).answer === 'function') {
      (window.OMICallSDK as SafeAny).answer();
    } else {
      console.warn('[OmiCallContext] answerCall method not found');
    }
    setCallState('connected');
    stopRingtone();
    stopRingback();
    clearIncomingNotification();
  };

  const rejectCall = () => {
    const activeCall = (window as SafeAny).activeCall;
    const callForCleanup = activeCall || currentCallRef.current;
    if (activeCall && typeof activeCall.decline === 'function') {
      activeCall.decline();
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as SafeAny).decline === 'function') {
      (window.OMICallSDK as SafeAny).decline();
    } else {
      console.warn('[OmiCallContext] rejectCall method not found');
    }
    setCallState('idle');
    setCurrentCall(null);
    stopRingtone();
    stopRingback();
    clearIncomingNotification();
    cleanupOmiCallMediaBridge(callForCleanup);
  };

  const hangUp = () => {
    if (isSimulated) {
      if (simulatedTimerRef.current) clearTimeout(simulatedTimerRef.current);
      setCallState('wrapup');
      stopRingback();

      // Auto-open global CallLogModal for simulated calls
      const activeCallDetail = currentCallRef.current;
      if (activeCallDetail) {
        setCallLogCustomerInfo({
          legacyUserId: activeCallDetail.legacyUserId || 0,
          customerName: activeCallDetail.name || 'Khách hàng',
          planId: activeCallDetail.planId || null,
        });
        setIsCallLogModalOpen(true);
      }
      return;
    }

    const activeCall = (window as SafeAny).activeCall;
    const callForCleanup = activeCall || currentCallRef.current;
    if (activeCall && typeof activeCall.end === 'function') {
      activeCall.end();
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as SafeAny).hangup === 'function') {
      (window.OMICallSDK as SafeAny).hangup();
    } else {
      console.warn('[OmiCallContext] hangUp method not found');
    }
    setCallState('wrapup');
    stopRingback();
    setTimeout(() => cleanupOmiCallMediaBridge(callForCleanup), 3000);
  };

  const toggleMute = () => {
    const activeCall = (window as SafeAny).activeCall;
    if (activeCall && typeof activeCall.mute === 'function') {
      activeCall.mute((audioEnabled: boolean) => {
        const muted = !audioEnabled;
        activeCall.__mosUserMuted = muted;
        setIsMuted(muted);
        void recordOmiCallAudioDiagnostics(activeCall, muted ? 'muted' : 'unmuted');
      });
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as SafeAny).mute === 'function') {
      (window.OMICallSDK as SafeAny).mute((audioEnabled: boolean) => {
        setIsMuted(!audioEnabled);
      });
    } else {
      setIsMuted((prev) => !prev);
    }
  };

  const toggleHold = () => {
    const nextHold = !isHeld;
    const activeCall = (window as SafeAny).activeCall;
    if (activeCall && typeof activeCall.hold === 'function') {
      activeCall.hold(nextHold);
      setIsHeld(nextHold);
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as SafeAny).hold === 'function') {
      (window.OMICallSDK as SafeAny).hold(nextHold);
      setIsHeld(nextHold);
    } else {
      setIsHeld(nextHold);
    }
  };

  return (
    <OmiCallContext.Provider
      value={{
        sdkLoaded,
        sdkError,
        isRegistered,
        isTabMuted,
        callState,
        callDuration,
        currentCall,
        makeCall,
        executeCall,
        cancelConfirm,
        answerCall,
        rejectCall,
        hangUp,
        toggleMute,
        toggleHold,
        isMuted,
        isHeld,
        sipConfig,
        setCallState,
        setCurrentCall,
        isSimulated,
        audioInputDevices,
        audioOutputDevices,
        selectedAudioInputId,
        selectedAudioOutputId,
        setSelectedAudioInputId,
        setSelectedAudioOutputId,
        refreshAudioDevices,
        omicallReady,
        setOmicallReady,
        lastRegisterEvent,
        isCallLogModalOpen,
        callLogCustomerInfo,
        openCallLogModal,
        closeCallLogModal,
        resolvedLog,
        setResolvedLog,
        submittingWrapup,
        setSubmittingWrapup,
      }}
    >
      {children}
      <div id="omicall-root" style={{ display: 'none' }} />
    </OmiCallContext.Provider>
  );
}

export function useOmiCall() {
  const context = useContext(OmiCallContext);
  if (!context) {
    throw new Error('useOmiCall must be used within an OmiCallProvider');
  }
  return context;
}
