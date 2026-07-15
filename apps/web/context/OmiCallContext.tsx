'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api-client';
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
  makeCall: (phone: string, name?: string, customerId?: number) => Promise<void>;
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
  isSimulated: boolean;
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

let ringbackAudio: any = null;

const playRingback = () => {
  if (typeof window === 'undefined') return;
  try {
    if (!ringbackAudio) {
      ringbackAudio = new Audio('https://cdn.omicrm.com/sdk/assets/audios/call/ringing.mp3');
      ringbackAudio.loop = true;
    }
    ringbackAudio.play().catch((e: any) => {
      console.warn('[OmiCallContext] Failed to play ringback audio:', e);
    });
  } catch (e) {
    console.error('[OmiCallContext] Failed to init ringback audio:', e);
  }
};

const stopRingback = () => {
  if (ringbackAudio) {
    try {
      ringbackAudio.pause();
      ringbackAudio.currentTime = 0;
    } catch (e) {}
  }
};

const ensureOmiCallSwitchboardOnline = async () => {
  if (typeof window === 'undefined' || !window.OMICallSDK) return true;

  const sdk = window.OMICallSDK;
  const onlineState = window.OMICallSDK.SB_STATE?.ONLINE;
  if (!onlineState) return true;

  const waitForConnected = () => new Promise<boolean>(resolve => {
    let settled = false;
    let timeout: any = null;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      try {
        sdk.off?.('register', onRegister);
      } catch (e) {}
      resolve(result);
    };

    const onRegister = (data: any) => {
      console.log('[OmiCallContext] register event:', data);
      if (data?.status === 'connected') finish(true);
      if (data?.status === 'disconnect') finish(false);
    };

    try {
      sdk.on?.('register', onRegister);
      timeout = setTimeout(() => finish(false), 8000);
    } catch (e) {
      finish(false);
    }
  });

  try {
    const currentState = sdk.getSbState?.();
    if (currentState === onlineState && sdk.validateSb?.()) {
      sdk.sbKeepAlive?.();
      return true;
    }

    let connected = false;
    if (typeof sdk.reregister === 'function') {
      const connectedPromise = waitForConnected();
      sdk.reregister(onlineState);
      connected = await connectedPromise;
    }

    if (typeof sdk.syncRegister === 'function') {
      await sdk.syncRegister(onlineState);
    }

    sdk.sbKeepAlive?.();

    return connected || sdk.validateSb?.() === true;
  } catch (err) {
    console.warn('[OmiCallContext] Failed to set OmiCall switchboard online:', err);
    return false;
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
  const [token, setToken] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);
  const simulatedTimerRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('mos_token'));
    }
  }, []);
  
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
  const [isTabMuted, setIsTabMuted] = useState(false);

  // 1. Dynamic Script Loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existing = document.querySelector('script[src*="core.min.js"]');
    if (existing) {
      setSdkLoaded(true);
      return;
    }

    const scriptUrl = process.env.NEXT_PUBLIC_OMICALL_SDK_URL || '/core.min.js';
    const script = document.createElement('script');
    script.src = scriptUrl;
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
  }, []);

  const broadcastState = useCallback((state: CallState, call: CurrentCall | null, duration: number, muted: boolean, held: boolean) => {
    // No-op since we use native allowMultiTab
  }, []);

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
    if (typeof window === 'undefined' || !token) return;

    let active = true;
    let checkInterval: any = null;
    let initStarted = false;

    const initAndRegister = async () => {
      try {
        console.log('[OmiCallContext] Starting initAndRegister with token...');
        setIsRegistered(false);
        setIsSimulated(false);

        const config = await apiClient.omicall.getSipConfig();
        setSipConfig(config);
        setIsSimulated(false);

        if (!active) return;

        // Initialize SDK
        window.OMICallSDK.init({
          allowMultiTab: true, // Enable native OmiCall multi-tab support
          rootBody: document.body
        });

        // Request Microphone permission before registering device
        try {
          if (!window.isSecureContext) {
            message.error('⚠️ CẢNH BÁO: Trình duyệt đang chạy ở chế độ không bảo mật (Insecure Context). Hãy truy cập qua http://localhost:4000 hoặc HTTPS để sử dụng Microphone và cuộc gọi!', 15);
          }

          let micBlocked = false;
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as any });
            if (permissionStatus.state === 'denied') {
              micBlocked = true;
            }
          } catch (pe) {}

          if (micBlocked) {
            message.error('⚠️ QUAN TRỌNG: Quyền truy cập Microphone đang bị chặn trên trình duyệt! Hãy nhấp vào biểu tượng chiếc khóa 🔒 ở bên trái thanh địa chỉ và chọn "Cho phép" (Allow) Microphone.', 15);
          } else {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop()); // Release immediately
          }
        } catch (e: any) {
          console.warn('[OmiCallContext] Microphone permission request failed or denied:', e);
          message.error('⚠️ Không thể kết nối cuộc gọi: Trình duyệt chưa được cấp quyền sử dụng Microphone. Vui lòng cấp quyền Microphone trên thanh địa chỉ!', 15);
        }

        // Register SIP extension
        const registerStatus = await window.OMICallSDK.register({
          sipRealm: config.sipRealm,
          sipUser: config.sipUser,
          sipPassword: config.sipPassword
        });

        if (!active) return;

        if (!registerStatus || registerStatus.status) {
          console.log('[OmiCallContext] SIP device registered successfully');
          await ensureOmiCallSwitchboardOnline();
          setIsRegistered(true);
          setIsSimulated(false);
        } else {
          console.warn('[OmiCallContext] SIP registration failed.', registerStatus);
          setIsRegistered(false);
          setIsSimulated(false);
        }

        // Register event callbacks
        window.OMICallSDK.on('register', (data: any) => {
          console.log('[OmiCallContext] register event:', data);
          if (data?.status === 'connected') {
            setIsRegistered(true);
            setIsSimulated(false);
          }
          if (data?.status === 'disconnect') {
            setIsRegistered(false);
          }
        });

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
          if (currentCallRef.current?.direction === 'outbound') {
            playRingback();
          }
          if (data.callUuid || data.call_uuid) {
            setCurrentCall(prev => prev ? { ...prev, callUuid: data.callUuid || data.call_uuid } : null);
          }
        });

        window.OMICallSDK.on('accepted', (data: any) => {
          console.log('[OmiCallContext] accepted event:', data);
          setCallState('connected');
          stopRingtone();
          stopRingback();
          clearIncomingNotification();
          if (data.callUuid || data.call_uuid) {
            setCurrentCall(prev => prev ? { ...prev, callUuid: data.callUuid || data.call_uuid } : null);
          }
        });

        window.OMICallSDK.on('ended', (data: any) => {
          console.log('[OmiCallContext] ended event:', data);
          setCallState('wrapup');
          stopRingtone();
          stopRingback();
          clearIncomingNotification();
          if (data.callUuid || data.call_uuid) {
            setCurrentCall(prev => prev ? { ...prev, callUuid: data.callUuid || data.call_uuid } : null);
          }
        });

      } catch (err: any) {
        if (err?.response?.status === 404) {
          console.log('[OmiCallContext] OmiCall WebRTC is not configured for this account. Call Simulation Mode enabled.');
        } else {
          console.error('[OmiCallContext] SIP config or init failure. Call Simulation Mode enabled:', err);
        }
        setIsSimulated(true);
        setIsRegistered(true);
      }
    };

    const runInitOnce = () => {
      if (!active || initStarted) return;
      initStarted = true;
      initAndRegister();
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
          } else if (duration >= 4000) { // 4 seconds timeout
            console.warn('[OmiCallContext] OmiCall SDK load timed out (possibly blocked by ad-blocker). Enabling Simulation Mode.');
            clearInterval(checkInterval);
            setIsSimulated(true);
            setIsRegistered(true);
          }
        }, 100);
      }
    };

    startCheck();

    // unregister cleanup on page close
    const handleUnload = () => {
      if (window.OMICallSDK) {
        window.OMICallSDK.unregister();
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      active = false;
      if (checkInterval) clearInterval(checkInterval);
      window.removeEventListener('beforeunload', handleUnload);
      if (window.OMICallSDK) {
        try {
          window.OMICallSDK.unregister();
        } catch (e) {}
      }
    };
  }, [token]);

  // 5. Calling Actions
  const makeCall = async (phone: string, name?: string, customerId?: number) => {
    if (isTabMuted) {
      message.warning('Có cuộc gọi đang diễn ra trên một tab khác.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');

    if (isSimulated) {
      console.log(`[OmiCallContext] Simulating outbound call to ${cleanPhone} (${name || 'Khách hàng'}, ID: ${customerId})...`);
      try {
        setCallState('ringing');
        setCurrentCall({
          phone: cleanPhone,
          name: name || 'Khách hàng',
          direction: 'outbound',
          callUuid: 'simulated-' + Date.now(),
          legacyUserId: customerId
        });

        playRingback();

        if (simulatedTimerRef.current) clearTimeout(simulatedTimerRef.current);
        simulatedTimerRef.current = setTimeout(() => {
          stopRingback();
          // Connect beep sound
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

    // Request Mic permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      message.error('Vui lòng cấp quyền Microphone để thực hiện cuộc gọi.');
      return;
    }

    try {
      const isSwitchboardOnline = await ensureOmiCallSwitchboardOnline();
      if (!isSwitchboardOnline) {
        message.error('Tổng đài OmiCall chưa trực tuyến. Vui lòng thử lại sau vài giây.');
        return;
      }

      const hotlineNumber = sipConfig?.phoneNumber || '';
      const extensionNumber = sipConfig?.extension || '';
      const omicallCall = await window.OMICallSDK.makeCall(cleanPhone, {
        hotline: hotlineNumber,
        sipNumber: { number: extensionNumber },
        userData: JSON.stringify({
          customerName: name || 'Khách hàng'
        })
      });

      if (!omicallCall) {
        console.warn('[OmiCallContext] OmiCall SDK did not create an outbound call.', {
          sbState: window.OMICallSDK.getSbState?.(),
          sbDetail: window.OMICallSDK.getDetailSbState?.(),
          canCallOut: window.OMICallSDK.canCallOut?.()
        });
        message.error('OmiCall chưa tạo được cuộc gọi thật. Vui lòng đợi trạng thái tổng đài sẵn sàng rồi gọi lại.');
        setCallState('idle');
        setCurrentCall(null);
        return;
      }

      setCallState('ringing');
      setCurrentCall({
        phone: cleanPhone,
        name: name || 'Khách hàng',
        direction: 'outbound',
        callUuid: omicallCall.uuid || null,
        legacyUserId: customerId
      });
      playRingback();
    } catch (err: any) {
      console.error('[OmiCallContext] makeCall failed:', err);
      message.error('Lỗi khi thực hiện cuộc gọi: ' + err.message);
      setCallState('idle');
      setCurrentCall(null);
    }
  };

  const answerCall = () => {
    const activeCall = (window as any).activeCall;
    if (activeCall && typeof activeCall.accept === 'function') {
      activeCall.accept();
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as any).answer === 'function') {
      (window.OMICallSDK as any).answer();
    } else {
      console.warn('[OmiCallContext] answerCall method not found');
    }
    setCallState('connected');
    stopRingtone();
    stopRingback();
    clearIncomingNotification();
  };

  const rejectCall = () => {
    const activeCall = (window as any).activeCall;
    if (activeCall && typeof activeCall.decline === 'function') {
      activeCall.decline();
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as any).decline === 'function') {
      (window.OMICallSDK as any).decline();
    } else {
      console.warn('[OmiCallContext] rejectCall method not found');
    }
    setCallState('idle');
    setCurrentCall(null);
    stopRingtone();
    stopRingback();
    clearIncomingNotification();
  };

  const hangUp = () => {
    if (isSimulated) {
      if (simulatedTimerRef.current) clearTimeout(simulatedTimerRef.current);
      setCallState('wrapup');
      stopRingback();
      return;
    }

    const activeCall = (window as any).activeCall;
    if (activeCall && typeof activeCall.end === 'function') {
      activeCall.end();
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as any).hangup === 'function') {
      (window.OMICallSDK as any).hangup();
    } else {
      console.warn('[OmiCallContext] hangUp method not found');
    }
    setCallState('wrapup');
    stopRingback();
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    const activeCall = (window as any).activeCall;
    if (activeCall && typeof activeCall.mute === 'function') {
      activeCall.mute(nextMute);
      setIsMuted(nextMute);
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as any).mute === 'function') {
      (window.OMICallSDK as any).mute(nextMute);
      setIsMuted(nextMute);
    } else {
      setIsMuted(nextMute);
    }
  };

  const toggleHold = () => {
    const nextHold = !isHeld;
    const activeCall = (window as any).activeCall;
    if (activeCall && typeof activeCall.hold === 'function') {
      activeCall.hold(nextHold);
      setIsHeld(nextHold);
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as any).hold === 'function') {
      (window.OMICallSDK as any).hold(nextHold);
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
        isSimulated
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
