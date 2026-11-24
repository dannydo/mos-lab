'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import { message } from 'antd';
import {
  defaultOmiCallFallback,
  getAdminOmiCallEnabledKey,
  getCurrentStoredUser,
  getFloatingLauncherVisibilityKey,
  readAdminOmiCallEnabled,
  readFloatingLauncherVisibility,
} from './omicallStorage';
import { CallState, CurrentCall, OmiCallContextType } from './types';
import { useAudioManager } from './useAudioManager';
import { useOmiCallActions } from './useOmiCallActions';
import { useOmiCallSipRegistration } from './useOmiCallSipRegistration';
import { useOmiCallWrapupPolling } from './useOmiCallWrapupPolling';
import {
  getMicrophoneConstraints,
  installOmiCallMediaConstraintPatch,
  installOmiCallPeerConnectionTracker,
  recordOmiCallAudioDiagnostics,
  reinforceOmiCallMicrophoneSender,
} from './useSipConnection';

const OmiCallContext = createContext<OmiCallContextType | undefined>(undefined);

export function OmiCallProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SafeAny>(() => getCurrentStoredUser());

  useEffect(() => {
    const syncUser = () => {
      setCurrentUser(getCurrentStoredUser());
      setToken(localStorage.getItem('mos_token'));
    };
    window.addEventListener('storage', syncUser);
    window.addEventListener('mos_user_updated', syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener('mos_user_updated', syncUser);
    };
  }, []);

  const isAdmin = Boolean(
    currentUser &&
    (isSuperAdminRole(currentUser.role) ||
      isCanonicalSuperAdminIdentity({ username: currentUser.username, email: currentUser.email }))
  );
  const isGrowthMember = Boolean(
    currentUser &&
    (currentUser.isGrowthMember === true || currentUser.role === 'telesales' || currentUser.role === 'booker')
  );
  const canAccessOmiCall = isAdmin || isGrowthMember;

  const [adminOmiCallEnabled, setAdminOmiCallEnabledState] = useState<boolean>(() => {
    return readAdminOmiCallEnabled();
  });

  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const isSdkReadyRef = useRef(false);
  const pendingOutboundCallRef = useRef<(() => Promise<void>) | null>(null);
  const [sdkError, setSdkErrors] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const isRegisteredRef = useRef(false);
  useEffect(() => {
    isRegisteredRef.current = isRegistered;
  }, [isRegistered]);
  const [sipConfig, setSipConfig] = useState<SafeAny>(null);
  const sipConfigRef = useRef<SafeAny>(null);
  useEffect(() => {
    sipConfigRef.current = sipConfig;
  }, [sipConfig]);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mos_token');
    }
    return null;
  });
  const [isSimulated, setIsSimulated] = useState(false);
  const simulatedTimerRef = useRef<SafeAny>(null);
  const [omicallReady, setOmicallReadyState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (!canAccessOmiCall) return false;
      if (isAdmin && !readAdminOmiCallEnabled()) return false;
      return localStorage.getItem('mos_omicall_auto_init') === 'true';
    }
    return false;
  });
  const [floatingLauncherVisible, setFloatingLauncherVisibleState] = useState<boolean>(() => {
    if (!canAccessOmiCall) return false;
    if (isAdmin) return readAdminOmiCallEnabled() && readFloatingLauncherVisibility();
    return readFloatingLauncherVisibility();
  });
  const [shouldInit, setShouldInit] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (!canAccessOmiCall) return false;
      if (isAdmin && !readAdminOmiCallEnabled()) return false;
      const t = localStorage.getItem('mos_token');
      const r = localStorage.getItem('mos_omicall_auto_init') === 'true';
      return !!(t && r);
    }
    return false;
  });
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

  const setAdminOmiCallEnabled = useCallback((enabled: boolean) => {
    setAdminOmiCallEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(getAdminOmiCallEnabledKey(), String(enabled));
    }
    setFloatingLauncherVisibleState(enabled);
    if (enabled) {
      setOmicallReadyState(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mos_omicall_auto_init', 'true');
      }
      setShouldInit(true);
    } else {
      setOmicallReadyState(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mos_omicall_auto_init', 'false');
      }
      if (window.OMICallSDK && (window as SafeAny).__omicall_initialized) {
        try {
          window.OMICallSDK.unregister();
        } catch (e) {
          console.warn('[OmiCallContext] Failed to unregister on admin toggle off:', e);
        }
      }
      setIsRegistered(false);
      setShouldInit(false);
    }
  }, []);

  // Set ready status helper
  const setOmicallReady = (ready: boolean) => {
    if (!canAccessOmiCall) return;
    if (isAdmin && ready && !adminOmiCallEnabled) {
      setAdminOmiCallEnabledState(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(getAdminOmiCallEnabledKey(), 'true');
      }
      setFloatingLauncherVisibleState(true);
    }
    setOmicallReadyState(ready);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_omicall_auto_init', String(ready));
      // If we turned it off, unregister OmiCall to release connection resources
      if (!ready) {
        if (pendingOutboundCallRef.current) {
          message.destroy('omicall_queue_msg');
          pendingOutboundCallRef.current = null;
        }
        if (window.OMICallSDK && (window as SafeAny).__omicall_initialized) {
          try {
            window.OMICallSDK.unregister();
          } catch (e) {
            console.warn('[OmiCallContext] Failed to unregister on toggle off:', e);
          }
        }
        setIsRegistered(false);
        setShouldInit(false);
      } else {
        setShouldInit(true);
      }
    }
  };

  const setFloatingLauncherVisible = useCallback(
    (visible: boolean) => {
      if (!canAccessOmiCall) return;
      setFloatingLauncherVisibleState(visible);
      if (typeof window !== 'undefined') {
        localStorage.setItem(getFloatingLauncherVisibilityKey(), String(visible));
      }
    },
    [canAccessOmiCall]
  );

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

  const initOmiCallSdk = useCallback(() => {
    if (typeof window === 'undefined' || !window.OMICallSDK) return false;
    if ((window as SafeAny).__omicall_initialized && isSdkReadyRef.current) return true;

    try {
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
      setIsSdkReady(true);
      isSdkReadyRef.current = true;
      return true;
    } catch (e) {
      console.error('[OmiCallContext] Failed to init OMICallSDK:', e);
      return false;
    }
  }, []);

  // 1. Dynamic Script Loading
  useEffect(() => {
    if (typeof window === 'undefined' || !shouldInit) return;

    installOmiCallMediaConstraintPatch();
    installOmiCallPeerConnectionTracker();

    const existing = document.querySelector('script[src*="core.min.js"]');
    if (existing) {
      setSdkLoaded(true);
      if (window.OMICallSDK) {
        initOmiCallSdk();
      }
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
      if (window.OMICallSDK) {
        initOmiCallSdk();
      }
    };
    script.onerror = () => {
      console.error('[OmiCallContext] Failed to load OmiCall SDK script. Enabling simulation mode.');
      setSdkErrors(true);
      setIsSimulated(true);
      setIsRegistered(true);
    };
    document.body.appendChild(script);
  }, [initOmiCallSdk, shouldInit]);

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

  useOmiCallWrapupPolling({
    callState,
    currentCall,
    isSimulated,
    setResolvedLog,
    setCurrentCall,
  });

  useOmiCallSipRegistration({
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
  });

  const { makeCall, executeCall, cancelConfirm, answerCall, rejectCall, hangUp, toggleMute, toggleHold } =
    useOmiCallActions({
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
    });

  return (
    <OmiCallContext.Provider
      value={{
        sdkLoaded,
        isSdkReady,
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
        setIsSimulated,
        audioInputDevices,
        audioOutputDevices,
        selectedAudioInputId,
        selectedAudioOutputId,
        setSelectedAudioInputId,
        setSelectedAudioOutputId,
        refreshAudioDevices,
        omicallReady,
        setOmicallReady,
        floatingLauncherVisible,
        setFloatingLauncherVisible,
        canAccessOmiCall,
        isGrowthMember,
        isAdmin,
        adminOmiCallEnabled,
        setAdminOmiCallEnabled,
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
  return context ?? defaultOmiCallFallback;
}
