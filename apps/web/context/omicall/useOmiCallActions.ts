import { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { message, notification } from 'antd';
import { apiClient } from '../../lib/api-client';
import { cleanupOmiCallMediaBridge } from './mediaBridge';
import { CallState, CurrentCall, type MakeCallOptions } from './types';
import { playRingback, stopRingback, stopRingtone } from './useAudioManager';
import {
  clearIncomingNotification,
  ensureOmiCallSwitchboardOnline,
  getOmiCallSdkUid,
  installPreparedMicrophonePatch,
  prepareMicrophoneForOmiCall,
  recordOmiCallAudioDiagnostics,
  refreshOmiCallMediaDevices,
  reinforceOmiCallMicrophoneSender,
  scheduleOmiCallMediaBridgeSync,
  unlockAudioPlayback,
} from './useSipConnection';

interface UseOmiCallActionsParams {
  canAccessOmiCall: boolean;
  isAdmin: boolean;
  adminOmiCallEnabled: boolean;
  setAdminOmiCallEnabled: (enabled: boolean) => void;
  isTabMuted: boolean;
  isSimulated: boolean;
  isRegistered: boolean;
  isRegisteredRef: MutableRefObject<boolean>;
  sipConfig: SafeAny;
  sipConfigRef: MutableRefObject<SafeAny>;
  currentCall: CurrentCall | null;
  isHeld: boolean;
  isSdkReadyRef: MutableRefObject<boolean>;
  pendingOutboundCallRef: MutableRefObject<(() => Promise<void>) | null>;
  simulatedTimerRef: MutableRefObject<SafeAny>;
  currentCallRef: MutableRefObject<CurrentCall | null>;
  initOmiCallSdk: () => boolean;
  refreshAudioDevices: () => Promise<void>;
  setOmicallReadyState: Dispatch<SetStateAction<boolean>>;
  setShouldInit: Dispatch<SetStateAction<boolean>>;
  setCallState: Dispatch<SetStateAction<CallState>>;
  setCurrentCall: Dispatch<SetStateAction<CurrentCall | null>>;
  setIsSimulated: Dispatch<SetStateAction<boolean>>;
  setIsMuted: Dispatch<SetStateAction<boolean>>;
  setIsHeld: Dispatch<SetStateAction<boolean>>;
  setCallLogCustomerInfo: Dispatch<
    SetStateAction<{ legacyUserId: number; customerName: string; planId?: number | null } | null>
  >;
  setIsCallLogModalOpen: Dispatch<SetStateAction<boolean>>;
}

export function useOmiCallActions({
  canAccessOmiCall,
  isAdmin,
  adminOmiCallEnabled,
  setAdminOmiCallEnabled,
  isTabMuted,
  isSimulated,
  isRegistered,
  isRegisteredRef,
  sipConfig,
  sipConfigRef,
  currentCall,
  isHeld,
  isSdkReadyRef,
  pendingOutboundCallRef,
  simulatedTimerRef,
  currentCallRef,
  initOmiCallSdk,
  refreshAudioDevices,
  setOmicallReadyState,
  setShouldInit,
  setCallState,
  setCurrentCall,
  setIsSimulated,
  setIsMuted,
  setIsHeld,
  setCallLogCustomerInfo,
  setIsCallLogModalOpen,
}: UseOmiCallActionsParams) {
  const makeCall = async (
    phone: string,
    name?: string,
    customerId?: number,
    avatar?: string,
    planId?: number,
    options?: MakeCallOptions
  ) => {
    if (!canAccessOmiCall) {
      message.warning('Chỉ bộ phận Growth & Booking mới có quyền thực hiện cuộc gọi tổng đài.');
      return;
    }
    if (isAdmin && !adminOmiCallEnabled) {
      if (options?.autoEnableAdmin) {
        setAdminOmiCallEnabled(true);
      } else {
        message.info('Vui lòng bật công cụ OmiCall trong menu cá nhân trước khi thực hiện cuộc gọi.');
        return;
      }
    }
    if (isTabMuted) {
      message.warning('Có cuộc gọi đang diễn ra trên một tab khác.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    setCallState('confirming');
    setOmicallReadyState(true);
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
    const activeCallTarget = currentCallRef.current || currentCall;
    if (!activeCallTarget) return;
    const { phone: cleanPhone, name, legacyUserId: customerId, avatar } = activeCallTarget;

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
          } catch (_e) {}

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

    const isReady = isSdkReadyRef.current && (window as SafeAny).__omicall_initialized;
    const sbState = window.OMICallSDK?.getSbState?.();
    const isConnecting = sbState === 'connecting';
    const isCurrentlyRegistered = isRegistered || isRegisteredRef.current || sbState === 'online';

    if (!window.OMICallSDK || !isReady || !isCurrentlyRegistered || isConnecting) {
      if (window.OMICallSDK && !isReady) {
        initOmiCallSdk();
      }
      console.log('[OmiCallContext] SDK is initializing or connecting. Queueing outbound call...');
      message.loading({
        content: 'Đang kết nối tổng đài OmiCall, cuộc gọi sẽ tự động thực hiện ngay khi sẵn sàng...',
        key: 'omicall_queue_msg',
        duration: 8,
      });

      pendingOutboundCallRef.current = async () => {
        message.destroy('omicall_queue_msg');
        await executeCall();
      };
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

      const activeSipConfig = sipConfigRef.current || sipConfig;
      const hotlineNumber = activeSipConfig?.phoneNumber || '02866810755';
      void apiClient.omicall
        ?.recordCallIntent?.({
          phone: cleanPhone,
          extension: activeSipConfig?.extension || undefined,
        })
        ?.catch?.(() => {});
      const omicallCall = await window.OMICallSDK.makeCall(cleanPhone, {
        sipNumber: { number: hotlineNumber },
        userData: JSON.stringify({
          customerName: name || 'Khách hàng',
        }),
      });
      if (omicallCall?.uuid) {
        void apiClient.omicall
          ?.recordCallIntent?.({
            phone: cleanPhone,
            extension: activeSipConfig?.extension || undefined,
            callUuid: omicallCall.uuid,
          })
          ?.catch?.(() => {});
      }

      if (!omicallCall) {
        preparedMicrophonePatch?.release();
        console.warn(
          '[OmiCallContext] OmiCall SDK did not create an outbound call. Falling back to Simulation Mode...'
        );
        notification.warning({
          message: 'Tổng đài OmiCall (SIP 480 / Bị ngắt)',
          description:
            'Tổng đài OmiCall chưa tạo được cuộc gọi thoại (lỗi cước tài khoản OmiCall hoặc Trunk Viettel). Hệ thống tự động chuyển sang Chế độ Mô phỏng (Simulation Mode) để test!',
          duration: 5,
        });
        setIsSimulated(true);
        setCallState('ringing');
        playRingback();
        if (simulatedTimerRef.current) clearTimeout(simulatedTimerRef.current);
        simulatedTimerRef.current = setTimeout(() => {
          stopRingback();
          setCallState('connected');
        }, 2500);
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
    if (pendingOutboundCallRef.current) {
      message.destroy('omicall_queue_msg');
      pendingOutboundCallRef.current = null;
    }
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
    try {
      if (activeCall && typeof activeCall.decline === 'function') {
        activeCall.decline();
      } else if (window.OMICallSDK && typeof (window.OMICallSDK as SafeAny).decline === 'function') {
        (window.OMICallSDK as SafeAny).decline();
      } else {
        console.warn('[OmiCallContext] rejectCall method not found');
      }
    } catch (err: SafeAny) {
      console.warn('[OmiCallContext] Safely caught rejectCall PeerConnection exception:', err?.message || err);
    }
    setCallState('idle');
    setCurrentCall(null);
    stopRingtone();
    stopRingback();
    clearIncomingNotification();
    if (typeof cleanupOmiCallMediaBridge === 'function') {
      cleanupOmiCallMediaBridge(callForCleanup);
    }
  };

  const hangUp = () => {
    if (isSimulated) {
      if (simulatedTimerRef.current) clearTimeout(simulatedTimerRef.current);
      setCallState('wrapup');
      stopRingback();

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
      return;
    }

    const activeCall = (window as SafeAny).activeCall;
    const callForCleanup = activeCall || currentCallRef.current;
    try {
      if (activeCall && typeof activeCall.end === 'function') {
        activeCall.end();
      } else if (window.OMICallSDK && typeof (window.OMICallSDK as SafeAny).hangup === 'function') {
        (window.OMICallSDK as SafeAny).hangup();
      } else {
        console.warn('[OmiCallContext] hangUp method not found');
      }
    } catch (err: SafeAny) {
      console.warn('[OmiCallContext] Safely caught hangUp PeerConnection exception:', err?.message || err);
    }
    setCallState('wrapup');
    stopRingback();
    setTimeout(() => {
      if (typeof cleanupOmiCallMediaBridge === 'function') {
        cleanupOmiCallMediaBridge(callForCleanup);
      }
    }, 3000);
  };

  const toggleMute = () => {
    const activeCall = (window as SafeAny).activeCall;
    try {
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
    } catch (err: SafeAny) {
      console.warn('[OmiCallContext] Safely caught toggleMute PeerConnection exception:', err?.message || err);
      setIsMuted((prev) => !prev);
    }
  };

  const toggleHold = () => {
    const nextHold = !isHeld;
    const activeCall = (window as SafeAny).activeCall;
    try {
      if (activeCall && typeof activeCall.hold === 'function') {
        activeCall.hold(nextHold);
        setIsHeld(nextHold);
      } else if (window.OMICallSDK && typeof (window.OMICallSDK as SafeAny).hold === 'function') {
        (window.OMICallSDK as SafeAny).hold(nextHold);
        setIsHeld(nextHold);
      } else {
        setIsHeld(nextHold);
      }
    } catch (err: SafeAny) {
      console.warn('[OmiCallContext] Safely caught toggleHold PeerConnection exception:', err?.message || err);
      setIsHeld(nextHold);
    }
  };

  return {
    makeCall,
    executeCall,
    cancelConfirm,
    answerCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleHold,
  };
}
