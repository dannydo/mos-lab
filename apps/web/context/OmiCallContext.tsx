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
  sdkUid?: string | null;
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

const getMicrophoneConstraints = () => ({
  deviceId: { ideal: 'default' },
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
});

const ensureMicrophoneAvailable = async () => {
  if (typeof window === 'undefined') return;

  if (!window.isSecureContext) {
    throw new Error('Trình duyệt phải chạy qua HTTPS để dùng microphone.');
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ hoặc đang chặn MediaDevices/getUserMedia.');
  }

  try {
    const permissionStatus = await navigator.permissions?.query({ name: 'microphone' as any });
    if (permissionStatus?.state === 'denied') {
      throw new Error('Quyền Microphone đang bị chặn. Hãy mở biểu tượng khóa trên thanh địa chỉ và chọn Allow Microphone.');
    }
  } catch (err: any) {
    if (err?.message?.includes('Microphone')) throw err;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: getMicrophoneConstraints(),
    video: false,
  });

  const audioTracks = stream.getAudioTracks();
  const hasLiveAudio = audioTracks.some(track => track.readyState === 'live' && track.enabled);
  stream.getTracks().forEach(track => track.stop());

  if (!hasLiveAudio) {
    throw new Error('Không tìm thấy microphone đang hoạt động.');
  }
};

const unlockAudioPlayback = async () => {
  if (typeof window === 'undefined') return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    await ctx.close();
  } catch (err) {
    console.warn('[OmiCallContext] Audio playback unlock skipped:', err);
  }
};

const refreshOmiCallMediaDevices = async () => {
  try {
    navigator.mediaDevices?.dispatchEvent?.(new Event('devicechange'));
    await new Promise(resolve => setTimeout(resolve, 350));
  } catch (err) {
    console.warn('[OmiCallContext] Media device refresh skipped:', err);
  }
};

const getOmiCallSdkUid = (call: any) => call?.uid || call?.sdkUid || null;

const getOmiCallMediaContainer = () => {
  if (typeof document === 'undefined') return null;

  let container = document.getElementById('mos-omicall-media-bridge');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mos-omicall-media-bridge';
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText = 'position:fixed;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    document.body.appendChild(container);
  }

  return container;
};

const ensureOmiCallMediaElement = (id: string, muted: boolean) => {
  const existing = document.getElementById(id) as HTMLVideoElement | null;
  if (existing) {
    existing.autoplay = true;
    existing.playsInline = true;
    existing.muted = muted;
    return existing;
  }

  const container = getOmiCallMediaContainer();
  if (!container) return null;

  const video = document.createElement('video');
  video.id = id;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = muted;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('webkit-playsinline', 'true');
  video.style.cssText = 'width:1px;height:1px;opacity:0;pointer-events:none;';
  container.appendChild(video);

  return video;
};

const playOmiCallMediaElement = (element: HTMLMediaElement) => {
  const playPromise = element.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((err: any) => {
      console.warn('[OmiCallContext] OmiCall media playback is not ready yet:', err);
    });
  }
};

const isMediaStream = (value: any): value is MediaStream => {
  return typeof MediaStream !== 'undefined' && value instanceof MediaStream;
};

const attachOmiCallStream = (call: any, streamKey: string, muted: boolean) => {
  const uid = getOmiCallSdkUid(call);
  const stream = call?.streams?.[streamKey];
  if (!uid || !isMediaStream(stream)) return;

  const element = ensureOmiCallMediaElement(`${uid}-${streamKey}`, muted);
  if (!element) return;

  element.muted = muted;
  element.autoplay = true;
  element.srcObject = stream;

  if (call.players && !call.players[streamKey]) {
    call.players[streamKey] = element;
  }

  const trackListenerKey = '__mosOmiCallTrackListener';
  if (!(element as any)[trackListenerKey]) {
    const onAddTrack = () => {
      try {
        element.load();
      } catch (e) {}
      playOmiCallMediaElement(element);
    };
    stream.addEventListener('addtrack', onAddTrack);
    (element as any)[trackListenerKey] = onAddTrack;
  }

  playOmiCallMediaElement(element);
};

const shouldMuteOmiCallStream = (streamKey: string) => {
  const normalizedKey = streamKey.toLowerCase();
  return !['remote', 'receiver', 'receivers'].includes(normalizedKey);
};

const ensureOmiCallMediaBridge = (call: any) => {
  if (typeof document === 'undefined') return;

  const uid = getOmiCallSdkUid(call);
  if (!uid) return;

  ensureOmiCallMediaElement(`${uid}-remote`, false);
  ensureOmiCallMediaElement(`${uid}-local`, true);

  attachOmiCallStream(call, 'remote', false);
  attachOmiCallStream(call, 'local', true);

  Object.keys(call?.streams || {}).forEach(streamKey => {
    attachOmiCallStream(call, streamKey, shouldMuteOmiCallStream(streamKey));
  });
};

const scheduleOmiCallMediaBridgeSync = (call: any) => {
  ensureOmiCallMediaBridge(call);
  [250, 1000, 2500].forEach(delay => {
    setTimeout(() => ensureOmiCallMediaBridge(call), delay);
  });
};

const cleanupOmiCallMediaBridge = (call: any) => {
  if (typeof document === 'undefined') return;

  const uid = getOmiCallSdkUid(call);
  if (!uid) return;

  [`${uid}-remote`, `${uid}-local`].forEach(id => {
    const el = document.getElementById(id) as HTMLMediaElement | null;
    if (!el) return;
    try {
      el.pause();
      el.srcObject = null;
    } catch (e) {}
    el.remove();
  });
};

const auditActiveCallAudio = () => {
  if (typeof window === 'undefined') return;

  const activeCall = (window as any).activeCall;
  ensureOmiCallMediaBridge(activeCall);

  const localTracks = activeCall?.streams?.local?.getAudioTracks?.() || [];
  const remoteTracks = activeCall?.streams?.remote?.getAudioTracks?.() || [];

  if (!localTracks.length || localTracks.every((track: MediaStreamTrack) => track.readyState !== 'live' || !track.enabled)) {
    console.warn('[OmiCallContext] Active call has no live local microphone track.', activeCall);
    message.error('Microphone chưa được gửi vào cuộc gọi. Hãy kiểm tra quyền mic và chọn đúng input trên Chrome.', 12);
  }

  if (!remoteTracks.length) {
    console.warn('[OmiCallContext] Active call has no remote audio track yet.', activeCall);
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
          scheduleOmiCallMediaBridgeSync(data);
          
          const phone = data.phoneNumber || data.callerNumber || 'Unknown';
          setCallState('incoming');
          setCurrentCall({
            phone,
            name: 'Khách hàng gọi đến',
            direction: 'inbound',
            callUuid: data.callUuid || data.call_uuid || data.uuid || null,
            sdkUid: getOmiCallSdkUid(data)
          });
          playRingtone();
          triggerIncomingNotification(phone);
        });

        window.OMICallSDK.on('ringing', (data: any) => {
          console.log('[OmiCallContext] ringing event:', data);
          scheduleOmiCallMediaBridgeSync(data);
          setCallState('ringing');
          if (currentCallRef.current?.direction === 'outbound') {
            playRingback();
          }
          if (data.callUuid || data.call_uuid || data.uuid || getOmiCallSdkUid(data)) {
            setCurrentCall(prev => prev ? {
              ...prev,
              callUuid: data.callUuid || data.call_uuid || data.uuid || prev.callUuid,
              sdkUid: getOmiCallSdkUid(data) || prev.sdkUid
            } : null);
          }
        });

        window.OMICallSDK.on('accepted', (data: any) => {
          console.log('[OmiCallContext] accepted event:', data);
          scheduleOmiCallMediaBridgeSync(data);
          setCallState('connected');
          stopRingtone();
          stopRingback();
          clearIncomingNotification();
          if (data.callUuid || data.call_uuid || data.uuid || getOmiCallSdkUid(data)) {
            setCurrentCall(prev => prev ? {
              ...prev,
              callUuid: data.callUuid || data.call_uuid || data.uuid || prev.callUuid,
              sdkUid: getOmiCallSdkUid(data) || prev.sdkUid
            } : null);
          }
          setTimeout(auditActiveCallAudio, 1000);
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
          cleanupOmiCallMediaBridge(data);
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

    try {
      await ensureMicrophoneAvailable();
      await refreshOmiCallMediaDevices();
      await unlockAudioPlayback();
    } catch (err: any) {
      console.warn('[OmiCallContext] Microphone preflight failed:', err);
      message.error(err?.message || 'Vui lòng cấp quyền Microphone để thực hiện cuộc gọi.', 12);
      return;
    }

    try {
      const isSwitchboardOnline = await ensureOmiCallSwitchboardOnline();
      if (!isSwitchboardOnline) {
        message.error('Tổng đài OmiCall chưa trực tuyến. Vui lòng thử lại sau vài giây.');
        return;
      }

      const hotlineNumber = sipConfig?.phoneNumber || '';
      const omicallCall = await window.OMICallSDK.makeCall(cleanPhone, {
        ...(hotlineNumber ? { sipNumber: { number: hotlineNumber } } : {}),
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

      scheduleOmiCallMediaBridgeSync(omicallCall);
      setCallState('ringing');
      setCurrentCall({
        phone: cleanPhone,
        name: name || 'Khách hàng',
        direction: 'outbound',
        callUuid: omicallCall.uuid || null,
        sdkUid: getOmiCallSdkUid(omicallCall),
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
    scheduleOmiCallMediaBridgeSync(activeCall);
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
    const callForCleanup = activeCall || currentCallRef.current;
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
    cleanupOmiCallMediaBridge(callForCleanup);
  };

  const hangUp = () => {
    if (isSimulated) {
      if (simulatedTimerRef.current) clearTimeout(simulatedTimerRef.current);
      setCallState('wrapup');
      stopRingback();
      return;
    }

    const activeCall = (window as any).activeCall;
    const callForCleanup = activeCall || currentCallRef.current;
    if (activeCall && typeof activeCall.end === 'function') {
      activeCall.end();
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as any).hangup === 'function') {
      (window.OMICallSDK as any).hangup();
    } else {
      console.warn('[OmiCallContext] hangUp method not found');
    }
    setCallState('wrapup');
    stopRingback();
    setTimeout(() => cleanupOmiCallMediaBridge(callForCleanup), 3000);
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
