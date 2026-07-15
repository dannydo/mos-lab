'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../lib/api';
import { message } from 'antd';

declare global {
  interface Window {
    OMICallSDK: any;
    OMICallUI: any;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

export type CallState = 'idle' | 'ringing' | 'incoming' | 'connected' | 'analyzing' | 'wrapup';

export interface CurrentCall {
  phone: string;
  name: string;
  direction: 'inbound' | 'outbound';
  callUuid?: string | null;
  legacyUserId?: number | null;
}

interface OmiCallContextType {
  sdkLoaded: boolean;
  sdkError: boolean;
  isRegistered: boolean;
  isTabMuted: boolean; // Indicates if call active on another tab
  callState: CallState;
  callDuration: number;
  currentCall: CurrentCall | null;
  makeCall: (phone: string, name?: string) => Promise<void>;
  answerCall: () => void;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  isMuted: boolean;
  isHeld: boolean;
  sipConfig: any;
  setCallState: (state: CallState) => void;
  setCurrentCall: (call: CurrentCall | null) => void;
}

const OmiCallContext = createContext<OmiCallContextType | undefined>(undefined);

// Web Audio API Ringtone Helpers
let audioCtx: AudioContext | null = null;
let ringtoneInterval: any = null;

const playRingtone = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    audioCtx = new AudioContextClass();
    
    const playBeep = () => {
      if (!audioCtx) return;
      
      // Dual tone generator (similar to phone ring)
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      osc2.frequency.setValueAtTime(480, audioCtx.currentTime); // Ring pitch
      
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.8);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);
      
      osc1.start(audioCtx.currentTime);
      osc2.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 1.0);
      osc2.stop(audioCtx.currentTime + 1.0);
    };
    
    playBeep();
    ringtoneInterval = setInterval(playBeep, 2000);
  } catch (e) {
    console.error('[OmiCallContext] Failed to play synthesized ringtone:', e);
  }
};

const stopRingtone = () => {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (audioCtx) {
    try {
      audioCtx.close();
    } catch (e) {}
    audioCtx = null;
  }
};

// Title Flashing and Browser Notifications
let titleInterval: any = null;

const triggerIncomingNotification = (phone: string) => {
  if (typeof window === 'undefined') return;
  
  let showCallTitle = true;
  titleInterval = setInterval(() => {
    document.title = showCallTitle ? `📞 CUỘC GỌI ĐẾN: ${phone}` : 'mos-lab — Wings Lashes CRM';
    showCallTitle = !showCallTitle;
  }, 1000);

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Cuộc gọi đến OmiCall', {
        body: `Số điện thoại: ${phone}. Click vào để xem chi tiết cuộc gọi.`,
        tag: 'omicall-call'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Cuộc gọi đến OmiCall', {
            body: `Số điện thoại: ${phone}`
          });
        }
      });
    }
  }
};

const clearIncomingNotification = () => {
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
  }
  if (typeof window !== 'undefined') {
    document.title = 'mos-lab — Wings Lashes CRM';
  }
};

export function OmiCallProvider({ children }: { children: React.ReactNode }) {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkErrors] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [sipConfig, setSipConfig] = useState<any>(null);
  
  // Call States
  const [callState, setCallState] = useState<CallState>('idle');
  const callStateRef = useRef<CallState>('idle');
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const [currentCall, setCurrentCall] = useState<CurrentCall | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  // Multi-Tab Sync State
  const [isTabMuted, setIsTabMuted] = useState(false);

  // 1. Dynamic Script Loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existing = document.querySelector('script[src*="core.min.js"]');
    if (existing) {
      setSdkLoaded(true);
      return;
    }

    const scriptUrl = process.env.NEXT_PUBLIC_OMICALL_SDK_URL || 'https://cdn.omicrm.com/sdk/web/3.0.42/core.min.js';
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => {
      console.log('[OmiCallContext] OmiCall SDK loaded successfully');
      setSdkLoaded(true);
    };
    script.onerror = () => {
      console.error('[OmiCallContext] Failed to load OmiCall SDK script');
      setSdkErrors(true);
    };
    document.body.appendChild(script);
  }, []);

  // 2. BroadcastChannel Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = new BroadcastChannel('mos_omicall_sync');
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'STATE_CHANGE') {
        // Sync states from active tab
        setCallState(payload.callState);
        setCurrentCall(payload.currentCall);
        setCallDuration(payload.callDuration);
        setIsMuted(payload.isMuted);
        setIsHeld(payload.isHeld);
        setIsTabMuted(payload.callState !== 'idle');
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const broadcastState = useCallback((state: CallState, call: CurrentCall | null, duration: number, muted: boolean, held: boolean) => {
    if (typeof window === 'undefined') return;
    try {
      const channel = new BroadcastChannel('mos_omicall_sync');
      channel.postMessage({
        type: 'STATE_CHANGE',
        payload: { callState: state, currentCall: call, callDuration: duration, isMuted: muted, isHeld: held }
      });
      channel.close();
    } catch (e) {
      console.error('[OmiCallContext] Failed to broadcast call state:', e);
    }
  }, []);

  // Automatically broadcast local changes if we are the active caller
  useEffect(() => {
    if (!isTabMuted) {
      broadcastState(callState, currentCall, callDuration, isMuted, isHeld);
    }
  }, [callState, currentCall, callDuration, isMuted, isHeld, isTabMuted, broadcastState]);

  // 3. Audio Recording Timer
  useEffect(() => {
    let timer: any = null;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else if (callState === 'idle') {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  // 4. SDK Initialise and SIP Device registration
  useEffect(() => {
    if (!sdkLoaded || typeof window === 'undefined' || !window.OMICallSDK) return;

    const token = localStorage.getItem('mos_token');
    if (!token) return;

    const initAndRegister = async () => {
      try {
        const res = await api.get('/omicall/sip-config');
        const config = res.data;
        setSipConfig(config);

        // Initialize SDK
        window.OMICallSDK.init({
          allowMultiTab: false, // Turn off native multi-tab to avoid registration conflicts
          rootBody: document.body
        });

        // Request Microphone permission before registering device
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop()); // Release immediately
        } catch (e) {
          console.warn('[OmiCallContext] Microphone permission request failed or denied:', e);
        }

        // Register SIP extension
        const registerStatus = await window.OMICallSDK.register({
          sipRealm: config.sipRealm,
          sipUser: config.sipUser,
          sipPassword: config.sipPassword
        });

        if (registerStatus && registerStatus.status) {
          console.log('[OmiCallContext] SIP device registered successfully');
          setIsRegistered(true);
        } else {
          console.error('[OmiCallContext] SIP registration failed:', registerStatus);
          setIsRegistered(false);
        }

        // Register event callbacks
        window.OMICallSDK.on('invite', (data: any) => {
          console.log('[OmiCallContext] invite event:', data);
          if (callStateRef.current !== 'idle') return; // Don't interrupt active calls
          
          const phone = data.phoneNumber || data.callerNumber || 'Unknown';
          setCallState('incoming');
          setCurrentCall({
            phone,
            name: 'Khách hàng gọi đến',
            direction: 'inbound',
            callUuid: data.callUuid || data.call_uuid || null
          });
          playRingtone();
          triggerIncomingNotification(phone);
        });

        window.OMICallSDK.on('ringing', (data: any) => {
          console.log('[OmiCallContext] ringing event:', data);
          setCallState('ringing');
        });

        window.OMICallSDK.on('accepted', (data: any) => {
          console.log('[OmiCallContext] accepted event:', data);
          setCallState('connected');
          stopRingtone();
          clearIncomingNotification();
          if (data.callUuid || data.call_uuid) {
            setCurrentCall(prev => prev ? { ...prev, callUuid: data.callUuid || data.call_uuid } : null);
          }
        });

        window.OMICallSDK.on('ended', (data: any) => {
          console.log('[OmiCallContext] ended event:', data);
          setCallState('analyzing');
          stopRingtone();
          clearIncomingNotification();
        });

      } catch (err: any) {
        console.error('[OmiCallContext] SIP config or init failure:', err);
        // Show silent warning or fallback
      }
    };

    initAndRegister();

    // unregister cleanup on page close
    const handleUnload = () => {
      if (window.OMICallSDK) {
        window.OMICallSDK.unregister();
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      if (window.OMICallSDK) {
        try {
          window.OMICallSDK.unregister();
        } catch (e) {}
      }
    };
  }, [sdkLoaded]);

  // 5. Calling Actions
  const makeCall = async (phone: string, name?: string) => {
    if (isTabMuted) {
      message.warning('Có cuộc gọi đang diễn ra trên một tab khác.');
      return;
    }
    if (!isRegistered || !window.OMICallSDK) {
      message.error('Vui lòng đợi thiết bị SIP đăng ký thành công.');
      return;
    }

    // Request Mic permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      message.error('Vui lòng cấp quyền Microphone để thực hiện cuộc gọi.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    try {
      setCallState('ringing');
      setCurrentCall({
        phone: cleanPhone,
        name: name || 'Khách hàng',
        direction: 'outbound',
        callUuid: null
      });

      window.OMICallSDK.makeCall(cleanPhone, {
        userData: {
          customerName: name || 'Khách hàng'
        }
      });
    } catch (err: any) {
      console.error('[OmiCallContext] makeCall failed:', err);
      message.error('Lỗi khi thực hiện cuộc gọi: ' + err.message);
      setCallState('idle');
      setCurrentCall(null);
    }
  };

  const answerCall = () => {
    if (window.OMICallSDK) {
      window.OMICallSDK.answer();
      setCallState('connected');
      stopRingtone();
      clearIncomingNotification();
    }
  };

  const rejectCall = () => {
    if (window.OMICallSDK) {
      window.OMICallSDK.decline();
      setCallState('idle');
      setCurrentCall(null);
      stopRingtone();
      clearIncomingNotification();
    }
  };

  const hangUp = () => {
    if (window.OMICallSDK) {
      window.OMICallSDK.hangup();
      setCallState('analyzing');
    }
  };

  const toggleMute = () => {
    if (window.OMICallSDK) {
      const nextMute = !isMuted;
      window.OMICallSDK.mute(nextMute);
      setIsMuted(nextMute);
    }
  };

  const toggleHold = () => {
    if (window.OMICallSDK) {
      const nextHold = !isHeld;
      window.OMICallSDK.hold(nextHold);
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
        answerCall,
        rejectCall,
        hangUp,
        toggleMute,
        toggleHold,
        isMuted,
        isHeld,
        sipConfig,
        setCallState,
        setCurrentCall
      }}
    >
      {children}
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
