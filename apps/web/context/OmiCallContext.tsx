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
    __mosLastOmiCallAudioDiagnostics?: any;
    __mosLastOmiCallMicrophoneReinforcement?: any;
    __mosOmiCallPeerConnections?: Set<RTCPeerConnection>;
    __mosOmiCallPeerConnectionTrackerInstalled?: boolean;
    __mosOmiCallMediaConstraintPatchInstalled?: boolean;
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
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  setSelectedAudioInputId: (deviceId: string) => void;
  setSelectedAudioOutputId: (deviceId: string) => void;
  refreshAudioDevices: () => Promise<void>;
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

const OMI_AUDIO_INPUT_STORAGE_KEY = 'mos_omicall_audio_input_id';
const OMI_AUDIO_OUTPUT_STORAGE_KEY = 'mos_omicall_audio_output_id';
let selectedOmiCallAudioInputId = '';
let selectedOmiCallAudioOutputId = '';

const applyOmiCallAudioOutputDevice = async (element: HTMLMediaElement | null | undefined) => {
  if (!element || element.muted) return;

  const setSinkId = (element as HTMLMediaElement & { setSinkId?: (sinkId: string) => Promise<void> }).setSinkId;
  if (typeof setSinkId !== 'function') return;

  try {
    await setSinkId.call(element, selectedOmiCallAudioOutputId || '');
  } catch (err) {
    console.warn('[OmiCallContext] Failed to route audio output device:', err);
  }
};

const applyOmiCallAudioOutputToActiveMedia = (call?: any) => {
  if (typeof document !== 'undefined') {
    document.querySelectorAll<HTMLMediaElement>('#mos-omicall-media-bridge audio, #mos-omicall-media-bridge video')
      .forEach(element => void applyOmiCallAudioOutputDevice(element));
  }

  const activeCall = call || (typeof window !== 'undefined' ? (window as any).activeCall : null);
  Object.values(activeCall?.players || {}).forEach((player: any) => {
    if (typeof HTMLMediaElement !== 'undefined' && player instanceof HTMLMediaElement) {
      void applyOmiCallAudioOutputDevice(player);
    }
  });

  void applyOmiCallAudioOutputDevice(ringbackAudio);
};

const playRingback = () => {
  if (typeof window === 'undefined') return;
  try {
    if (!ringbackAudio) {
      ringbackAudio = new Audio('https://cdn.omicrm.com/sdk/assets/audios/call/ringing.mp3');
      ringbackAudio.loop = true;
    }
    applyOmiCallAudioOutputToActiveMedia();
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

const getMicrophoneConstraints = (): MediaTrackConstraints => {
  const constraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  if (selectedOmiCallAudioInputId) {
    constraints.deviceId = { exact: selectedOmiCallAudioInputId };
  }

  return constraints;
};

const getOmiCallMicrophoneStream = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: getMicrophoneConstraints(),
      video: false,
    });
  } catch (err: any) {
    const canRetryDefault =
      selectedOmiCallAudioInputId &&
      ['OverconstrainedError', 'NotFoundError', 'NotReadableError'].includes(err?.name);

    if (!canRetryDefault) throw err;

    console.warn('[OmiCallContext] Selected microphone is unavailable. Falling back to system default microphone.', err);
    selectedOmiCallAudioInputId = '';
    try {
      localStorage.removeItem(OMI_AUDIO_INPUT_STORAGE_KEY);
    } catch (e) {}

    return navigator.mediaDevices.getUserMedia({
      audio: getMicrophoneConstraints(),
      video: false,
    });
  }
};

const measureAudioSignal = async (stream: MediaStream, sampleCount = 8, sampleMs = 80) => {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  let ctx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;

  try {
    const audioContext = new AudioContextClass() as AudioContext;
    ctx = audioContext;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);
    let maxRms = 0;

    for (let sample = 0; sample < sampleCount; sample += 1) {
      await new Promise(resolve => setTimeout(resolve, sampleMs));
      analyser.getByteTimeDomainData(data);

      let sumSquares = 0;
      for (let index = 0; index < data.length; index += 1) {
        const normalized = (data[index] - 128) / 128;
        sumSquares += normalized * normalized;
      }

      maxRms = Math.max(maxRms, Math.sqrt(sumSquares / data.length));
    }

    return maxRms;
  } catch (err) {
    console.warn('[OmiCallContext] Microphone signal probe skipped:', err);
    return null;
  } finally {
    try {
      source?.disconnect();
    } catch (e) {}
    try {
      await ctx?.close();
    } catch (e) {}
  }
};

const measureMicrophoneSignal = async (stream: MediaStream) => {
  return measureAudioSignal(stream);
};

const getLiveAudioTracks = (stream: MediaStream) => {
  return stream.getAudioTracks().filter(track => track.readyState === 'live' && track.enabled);
};

const stopMediaStream = (stream: MediaStream | null | undefined) => {
  stream?.getTracks().forEach(track => track.stop());
};

const isPlainRecord = (value: unknown): value is Record<string, any> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const omitDefaultAudioDevice = (audioConstraints: MediaTrackConstraints | boolean | undefined) => {
  if (!isPlainRecord(audioConstraints)) return audioConstraints;

  const nextAudioConstraints = { ...audioConstraints };
  const deviceId: any = nextAudioConstraints.deviceId;
  const isDefaultDevice =
    deviceId === 'default' ||
    (isPlainRecord(deviceId) && (deviceId.ideal === 'default' || deviceId.exact === 'default'));

  if (isDefaultDevice) {
    delete nextAudioConstraints.deviceId;
  }

  if ('voiceIsolation' in nextAudioConstraints) {
    delete (nextAudioConstraints as Record<string, any>).voiceIsolation;
  }

  return nextAudioConstraints;
};

const sanitizeOmiCallMediaConstraints = (constraints?: MediaStreamConstraints) => {
  if (!constraints?.audio) return constraints;

  const sanitizedAudio = omitDefaultAudioDevice(constraints.audio);
  if (sanitizedAudio === constraints.audio) return constraints;

  return {
    ...constraints,
    audio: sanitizedAudio,
  };
};

const installOmiCallMediaConstraintPatch = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (window.__mosOmiCallMediaConstraintPatchInstalled) return;
  if (!navigator.mediaDevices?.getUserMedia) return;

  const mediaDevices = navigator.mediaDevices;
  const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

  try {
    (mediaDevices as any).getUserMedia = (constraints?: MediaStreamConstraints) => {
      const sanitizedConstraints = sanitizeOmiCallMediaConstraints(constraints);

      if (sanitizedConstraints !== constraints) {
        console.log('[OmiCallContext] Removed hard-coded default audio device from media constraints.', {
          original: constraints,
          sanitized: sanitizedConstraints,
        });
      }

      return originalGetUserMedia(sanitizedConstraints as MediaStreamConstraints);
    };
    window.__mosOmiCallMediaConstraintPatchInstalled = true;
  } catch (err) {
    console.warn('[OmiCallContext] Failed to install OmiCall media constraint patch:', err);
  }
};

const shouldUsePreparedMicrophoneForConstraints = (constraints?: MediaStreamConstraints) => {
  if (!constraints?.audio) return false;
  if (constraints.video) return false;
  return true;
};

const installPreparedMicrophonePatch = (stream: MediaStream) => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      wasConsumed: () => false,
      restore: () => {},
      release: () => stopMediaStream(stream),
      releaseIfUnused: () => stopMediaStream(stream),
    };
  }

  const mediaDevices = navigator.mediaDevices;
  const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
  let restored = false;
  let consumedCount = 0;
  let timeout: any = null;

  const restore = () => {
    if (restored) return;
    restored = true;
    if (timeout) clearTimeout(timeout);
    try {
      (mediaDevices as any).getUserMedia = originalGetUserMedia;
    } catch (err) {
      console.warn('[OmiCallContext] Failed to restore getUserMedia after OmiCall mic patch:', err);
    }
  };

  try {
    (mediaDevices as any).getUserMedia = async (constraints?: MediaStreamConstraints) => {
      if (shouldUsePreparedMicrophoneForConstraints(constraints)) {
        consumedCount += 1;
        console.log('[OmiCallContext] Supplying validated microphone stream to OmiCall SDK.', {
          constraints,
          consumedCount,
          tracks: stream.getAudioTracks().map(track => ({
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: typeof track.getSettings === 'function' ? track.getSettings() : null,
          })),
        });
        setTimeout(restore, 0);
        return stream;
      }

      return originalGetUserMedia(constraints as MediaStreamConstraints);
    };

    timeout = setTimeout(() => {
      restore();
      if (!consumedCount) {
        stopMediaStream(stream);
      }
    }, 30000);
  } catch (err) {
    console.warn('[OmiCallContext] Failed to install OmiCall mic patch:', err);
    restore();
  }

  return {
    wasConsumed: () => consumedCount > 0,
    restore,
    release: () => {
      restore();
      stopMediaStream(stream);
    },
    releaseIfUnused: () => {
      restore();
      if (!consumedCount) stopMediaStream(stream);
    },
  };
};

const prepareMicrophoneForOmiCall = async () => {
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

  const stream = await getOmiCallMicrophoneStream();

  const audioTracks = getLiveAudioTracks(stream);

  if (!audioTracks.length) {
    stopMediaStream(stream);
    throw new Error('Không tìm thấy microphone đang hoạt động.');
  }

  const maxRms = await measureMicrophoneSignal(stream);

  if (maxRms !== null && maxRms < 0.0005) {
    console.warn('[OmiCallContext] Microphone permission is granted but the short preflight sample was silent.', {
      maxRms,
      tracks: audioTracks.map(track => ({
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: typeof track.getSettings === 'function' ? track.getSettings() : null,
      })),
    });
    message.warning('Microphone đã được cấp quyền nhưng mẫu thử đang im lặng. Hãy nói thử khi cuộc gọi kết nối để kiểm tra 2 chiều.', 8);
  }

  console.log('[OmiCallContext] Microphone preflight passed:', {
    maxRms,
    tracks: audioTracks.map(track => ({
      id: track.id,
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      settings: typeof track.getSettings === 'function' ? track.getSettings() : null,
    })),
  });

  return stream;
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

const installOmiCallPeerConnectionTracker = () => {
  if (typeof window === 'undefined') return;
  if (window.__mosOmiCallPeerConnectionTrackerInstalled) return;
  if (typeof window.RTCPeerConnection !== 'function') return;

  const OriginalRTCPeerConnection = window.RTCPeerConnection;
  const trackedPeerConnections = new Set<RTCPeerConnection>();

  const PatchedRTCPeerConnection = function(this: RTCPeerConnection, ...args: ConstructorParameters<typeof RTCPeerConnection>) {
    const peerConnection = new OriginalRTCPeerConnection(...args);
    trackedPeerConnections.add(peerConnection);

    const pruneIfTerminal = () => {
      if (['closed', 'failed', 'disconnected'].includes(peerConnection.connectionState)) {
        setTimeout(() => {
          if (peerConnection.connectionState === 'closed') {
            trackedPeerConnections.delete(peerConnection);
          }
        }, 15000);
      }
    };

    peerConnection.addEventListener('connectionstatechange', pruneIfTerminal);
    return peerConnection;
  } as any;

  try {
    PatchedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
    Object.setPrototypeOf(PatchedRTCPeerConnection, OriginalRTCPeerConnection);
    window.RTCPeerConnection = PatchedRTCPeerConnection;
    window.__mosOmiCallPeerConnections = trackedPeerConnections;
    window.__mosOmiCallPeerConnectionTrackerInstalled = true;
  } catch (err) {
    console.warn('[OmiCallContext] Failed to install OmiCall peer connection tracker:', err);
  }
};

const getOmiCallSdkUid = (call: any) => call?.uid || call?.sdkUid || null;

const getActiveOmiCallPeerConnection = (call: any): RTCPeerConnection | null => {
  const fromCall = call?.session?.sessionDescriptionHandler?.peerConnection;
  if (fromCall) return fromCall;

  const trackedPeerConnections = Array.from(window.__mosOmiCallPeerConnections || []);
  return trackedPeerConnections.find(peerConnection => peerConnection.signalingState !== 'closed') || null;
};

const summarizeMediaTrack = (track: MediaStreamTrack | null) => track ? {
  id: track.id,
  kind: track.kind,
  label: track.label,
  enabled: track.enabled,
  muted: track.muted,
  readyState: track.readyState,
  settings: typeof track.getSettings === 'function' ? track.getSettings() : null,
} : null;

const resumeOmiCallAudioGraph = async (sessionDescriptionHandler: any) => {
  const audioContext = sessionDescriptionHandler?.constructor?.audioContext;

  if (audioContext?.state === 'suspended' && typeof audioContext.resume === 'function') {
    await audioContext.resume();
  }

  return audioContext?.state || null;
};

const syncOmiCallLocalStreamFromSender = (activeCall: any, peerConnection: RTCPeerConnection) => {
  const audioSenders = peerConnection.getSenders().filter(sender => sender.track?.kind === 'audio');
  const localStream = activeCall.streams?.local;

  if (isMediaStream(localStream)) {
    localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
      if (!audioSenders.some(sender => sender.track?.id === track.id)) {
        localStream.removeTrack(track);
        track.stop();
      }
    });
    audioSenders.forEach(sender => {
      const track = sender.track;
      if (track && !localStream.getAudioTracks().some((existingTrack: MediaStreamTrack) => existingTrack.id === track.id)) {
        localStream.addTrack(track);
      }
    });
    activeCall.streams.local = localStream;
    return localStream;
  }

  const nextLocalStream = new MediaStream();
  audioSenders.forEach(sender => {
    if (sender.track) nextLocalStream.addTrack(sender.track);
  });
  activeCall.streams = activeCall.streams || {};
  activeCall.streams.local = nextLocalStream;
  return nextLocalStream;
};

const reinforceOmiCallMicrophoneSender = async (call: any, stage: string) => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;

  const activeCall = call || (window as any).activeCall;
  const peerConnection = getActiveOmiCallPeerConnection(activeCall);
  if (!activeCall || !peerConnection || peerConnection.signalingState === 'closed') return false;
  if (activeCall.__mosUserMuted) return false;

  let freshStream: MediaStream | null = null;

  try {
    freshStream = await getOmiCallMicrophoneStream();

    const [freshTrack] = getLiveAudioTracks(freshStream);
    if (!freshTrack) {
      stopMediaStream(freshStream);
      return false;
    }

    freshTrack.enabled = true;
    const sessionDescriptionHandler = activeCall.session?.sessionDescriptionHandler;
    let reinforcementMode = 'sender-replace-track';
    let audioGraphState = await resumeOmiCallAudioGraph(sessionDescriptionHandler);

    if (typeof sessionDescriptionHandler?.setRealLocalMediaStream === 'function') {
      const previousRealStream = sessionDescriptionHandler.localMediaStreamReal;
      sessionDescriptionHandler.setRealLocalMediaStream(freshStream);
      if (isMediaStream(previousRealStream)) {
        previousRealStream.getTracks().forEach((track: MediaStreamTrack) => {
          if (track.id !== freshTrack.id) track.stop();
        });
      }
      audioGraphState = await resumeOmiCallAudioGraph(sessionDescriptionHandler);
      reinforcementMode = 'sdk-real-local-stream';
    } else {
      const audioSender = peerConnection.getSenders().find(sender => sender.track?.kind === 'audio');

      if (audioSender) {
        await audioSender.replaceTrack(freshTrack);
      } else {
        peerConnection.addTrack(freshTrack, freshStream);
      }
    }

    activeCall.audio = true;
    activeCall.__mosUserMuted = false;
    peerConnection.getSenders().forEach(sender => {
      if (sender.track?.kind === 'audio') {
        sender.track.enabled = true;
      }
    });
    const localStream = syncOmiCallLocalStreamFromSender(activeCall, peerConnection);
    localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
      track.enabled = true;
    });

    const result = {
      stage,
      at: new Date().toISOString(),
      uid: getOmiCallSdkUid(activeCall),
      uuid: activeCall.uuid || activeCall.callUuid || activeCall.call_uuid || null,
      track: summarizeMediaTrack(freshTrack),
      senderTracks: peerConnection.getSenders()
        .filter(sender => sender.track?.kind === 'audio')
        .map(sender => summarizeMediaTrack(sender.track)),
      localStreamTracks: localStream.getAudioTracks().map(track => summarizeMediaTrack(track)),
      mode: reinforcementMode,
      audioGraphState,
      senderCount: peerConnection.getSenders().length,
      audioSenderCount: peerConnection.getSenders().filter(sender => sender.track?.kind === 'audio').length,
    };

    window.__mosLastOmiCallMicrophoneReinforcement = result;
    console.log('[OmiCallContext] microphone sender reinforced:', JSON.stringify(result));
    return true;
  } catch (err) {
    stopMediaStream(freshStream);
    console.warn('[OmiCallContext] Failed to reinforce microphone sender:', err);
    return false;
  }
};

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
    void applyOmiCallAudioOutputDevice(existing);
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
  void applyOmiCallAudioOutputDevice(video);

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

  applyOmiCallAudioOutputToActiveMedia(call);
};

const scheduleOmiCallMediaBridgeSync = (call: any) => {
  ensureOmiCallMediaBridge(call);
  [250, 1000, 2500].forEach(delay => {
    setTimeout(() => ensureOmiCallMediaBridge(call), delay);
  });
};

const audioHealthWarningKeys = new Set<string>();

const describeOmiCallStream = async (call: any, streamKey: string) => {
  const stream = call?.streams?.[streamKey];
  const uid = getOmiCallSdkUid(call);
  const element = uid ? document.getElementById(`${uid}-${streamKey}`) as HTMLMediaElement | null : null;

  if (!isMediaStream(stream)) {
    return {
      exists: false,
      tracks: [],
      rms: null,
      element: element ? {
        muted: element.muted,
        autoplay: element.autoplay,
        paused: element.paused,
        hasSrcObject: !!element.srcObject,
        sinkId: (element as HTMLMediaElement & { sinkId?: string }).sinkId || null,
      } : null,
    };
  }

  const tracks = stream.getAudioTracks().map(track => ({
    id: track.id,
    label: track.label,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState,
    settings: typeof track.getSettings === 'function' ? track.getSettings() : null,
  }));

  return {
    exists: true,
    tracks,
    rms: tracks.length ? await measureAudioSignal(stream, 4, 60) : null,
    element: element ? {
      muted: element.muted,
      autoplay: element.autoplay,
      paused: element.paused,
      hasSrcObject: !!element.srcObject,
      sinkId: (element as HTMLMediaElement & { sinkId?: string }).sinkId || null,
    } : null,
  };
};

const getPeerConnectionAudioStats = async (peerConnection: RTCPeerConnection) => {
  const summarizeReports = async (source: RTCRtpSender | RTCRtpReceiver) => {
    try {
      const stats = await source.getStats();
      const reports = Array.from(stats.values());
      return reports
        .filter((report: any) => {
          const kind = report.kind || report.mediaType;
          return kind === 'audio' || String(report.id || '').toLowerCase().includes('audio');
        })
        .map((report: any) => ({
          id: report.id,
          type: report.type,
          kind: report.kind || report.mediaType || null,
          bytesSent: report.bytesSent ?? null,
          packetsSent: report.packetsSent ?? null,
          bytesReceived: report.bytesReceived ?? null,
          packetsReceived: report.packetsReceived ?? null,
          audioLevel: report.audioLevel ?? null,
          totalAudioEnergy: report.totalAudioEnergy ?? null,
          totalSamplesDuration: report.totalSamplesDuration ?? null,
          jitter: report.jitter ?? null,
          roundTripTime: report.roundTripTime ?? null,
          concealedSamples: report.concealedSamples ?? null,
          silentConcealedSamples: report.silentConcealedSamples ?? null,
        }));
    } catch (err) {
      return [{ error: err instanceof Error ? err.message : String(err) }];
    }
  };

  const senders = await Promise.all(peerConnection.getSenders().map(async sender => ({
    track: summarizeMediaTrack(sender.track),
    stats: await summarizeReports(sender),
  })));

  const receivers = await Promise.all(peerConnection.getReceivers().map(async receiver => ({
    track: summarizeMediaTrack(receiver.track),
    stats: await summarizeReports(receiver),
  })));

  return {
    connectionState: peerConnection.connectionState,
    iceConnectionState: peerConnection.iceConnectionState,
    iceGatheringState: peerConnection.iceGatheringState,
    signalingState: peerConnection.signalingState,
    senders,
    receivers,
  };
};

const describeOmiCallPeerConnections = async () => {
  if (typeof window === 'undefined') return [];

  const trackedPeerConnections = Array.from(window.__mosOmiCallPeerConnections || []);
  const activePeerConnections = trackedPeerConnections.filter(peerConnection => {
    return peerConnection.signalingState !== 'closed';
  });

  return Promise.all(activePeerConnections.map(getPeerConnectionAudioStats));
};

const hasLiveEnabledTrack = (streamInfo: any) => {
  return streamInfo?.tracks?.some((track: any) => track.readyState === 'live' && track.enabled);
};

const hasLiveAudioSender = (diagnostics: any) => {
  return diagnostics?.peerConnections?.some((peerConnection: any) => {
    return peerConnection.senders?.some((sender: any) => {
      return sender.track?.kind === 'audio' && sender.track.readyState === 'live' && sender.track.enabled;
    });
  });
};

const hasRemoteAudioReceiver = (diagnostics: any) => {
  return diagnostics?.peerConnections?.some((peerConnection: any) => {
    return peerConnection.receivers?.some((receiver: any) => {
      return receiver.track?.kind === 'audio' && receiver.track.readyState === 'live';
    });
  });
};

const warnOmiCallAudioHealth = (diagnostics: any) => {
  if (!diagnostics?.stage?.startsWith('accepted+')) return;

  const callKey = diagnostics.uuid || diagnostics.uid || 'active-call';
  const local = diagnostics.streams?.local;
  const remote = diagnostics.streams?.remote;

  if (!hasLiveEnabledTrack(local)) {
    const key = `${callKey}:local-track`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      message.error('Cuộc gọi đang không có live microphone track. Chrome có thể chưa gửi giọng bạn vào OmiCall.', 12);
    }
  }

  if (!hasLiveAudioSender(diagnostics)) {
    const key = `${callKey}:pc-audio-sender`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      message.error('WebRTC chưa có audio sender live. Giọng bạn có thể chưa được gửi vào cuộc gọi.', 12);
    }
  }

  if (!hasLiveEnabledTrack(remote)) {
    const key = `${callKey}:remote-track`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      message.error('Cuộc gọi chưa nhận được remote audio track từ OmiCall. Bạn có thể sẽ không nghe được khách.', 12);
    }
  }

  if (!hasRemoteAudioReceiver(diagnostics)) {
    const key = `${callKey}:pc-audio-receiver`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      message.error('WebRTC chưa có audio receiver live. Bạn có thể chưa nhận được tiếng khách.', 12);
    }
  }

  if (remote?.exists && (!remote.element?.hasSrcObject || remote.element?.muted || remote.element?.paused)) {
    const key = `${callKey}:remote-playback`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      message.error('Remote audio đã có stream nhưng playback element chưa phát. Hãy click vào trang hoặc reload trước khi gọi lại.', 12);
    }
  }
};

const recordOmiCallAudioDiagnostics = async (call: any, stage: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  ensureOmiCallMediaBridge(call);

  const activeCall = call || (window as any).activeCall;
  if (!activeCall) return;

  const diagnostics = {
    stage,
    at: new Date().toISOString(),
    uid: getOmiCallSdkUid(activeCall),
    uuid: activeCall.uuid || activeCall.callUuid || activeCall.call_uuid || null,
    state: activeCall.state || null,
    direction: activeCall.direction || null,
    remoteNumber: activeCall.remoteNumber || null,
    streams: {
      local: await describeOmiCallStream(activeCall, 'local'),
      remote: await describeOmiCallStream(activeCall, 'remote'),
    },
    peerConnections: await describeOmiCallPeerConnections(),
  };

  window.__mosLastOmiCallAudioDiagnostics = diagnostics;
  console.log('[OmiCallContext] audio diagnostics:', diagnostics);
  console.log('[OmiCallContext] audio diagnostics json:', JSON.stringify(diagnostics));
  warnOmiCallAudioHealth(diagnostics);
  return diagnostics;
};

const cleanupOmiCallMediaBridge = (call: any) => {
  if (typeof document === 'undefined') return;

  audioHealthWarningKeys.clear();

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
  void recordOmiCallAudioDiagnostics(activeCall, 'audit');

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
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputIdState, setSelectedAudioInputIdState] = useState('');
  const [selectedAudioOutputIdState, setSelectedAudioOutputIdState] = useState('');

  // Multi-Tab Sync State
  const [isTabMuted, setIsTabMuted] = useState(false);

  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputDevices = devices.filter(device => device.kind === 'audioinput');
      const outputDevices = devices.filter(device => device.kind === 'audiooutput');

      if (selectedOmiCallAudioInputId && !inputDevices.some(device => device.deviceId === selectedOmiCallAudioInputId)) {
        selectedOmiCallAudioInputId = '';
        setSelectedAudioInputIdState('');
        localStorage.removeItem(OMI_AUDIO_INPUT_STORAGE_KEY);
      }

      if (selectedOmiCallAudioOutputId && !outputDevices.some(device => device.deviceId === selectedOmiCallAudioOutputId)) {
        selectedOmiCallAudioOutputId = '';
        setSelectedAudioOutputIdState('');
        localStorage.removeItem(OMI_AUDIO_OUTPUT_STORAGE_KEY);
        applyOmiCallAudioOutputToActiveMedia();
      }

      setAudioInputDevices(inputDevices);
      setAudioOutputDevices(outputDevices);
    } catch (err) {
      console.warn('[OmiCallContext] Failed to enumerate audio devices:', err);
    }
  }, []);

  const setSelectedAudioInputId = useCallback((deviceId: string) => {
    selectedOmiCallAudioInputId = deviceId || '';
    setSelectedAudioInputIdState(selectedOmiCallAudioInputId);
    try {
      if (selectedOmiCallAudioInputId) {
        localStorage.setItem(OMI_AUDIO_INPUT_STORAGE_KEY, selectedOmiCallAudioInputId);
      } else {
        localStorage.removeItem(OMI_AUDIO_INPUT_STORAGE_KEY);
      }
    } catch (e) {}

    const activeCall = typeof window !== 'undefined' ? (window as any).activeCall : null;
    if (activeCall && ['ringing', 'incoming', 'connected'].includes(callStateRef.current)) {
      void reinforceOmiCallMicrophoneSender(activeCall, 'audio-input-selected');
      void recordOmiCallAudioDiagnostics(activeCall, 'audio-input-selected');
    }
  }, []);

  const setSelectedAudioOutputId = useCallback((deviceId: string) => {
    selectedOmiCallAudioOutputId = deviceId || '';
    setSelectedAudioOutputIdState(selectedOmiCallAudioOutputId);
    try {
      if (selectedOmiCallAudioOutputId) {
        localStorage.setItem(OMI_AUDIO_OUTPUT_STORAGE_KEY, selectedOmiCallAudioOutputId);
      } else {
        localStorage.removeItem(OMI_AUDIO_OUTPUT_STORAGE_KEY);
      }
    } catch (e) {}

    applyOmiCallAudioOutputToActiveMedia();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedInputId = localStorage.getItem(OMI_AUDIO_INPUT_STORAGE_KEY) || '';
    const storedOutputId = localStorage.getItem(OMI_AUDIO_OUTPUT_STORAGE_KEY) || '';
    selectedOmiCallAudioInputId = storedInputId;
    selectedOmiCallAudioOutputId = storedOutputId;
    setSelectedAudioInputIdState(storedInputId);
    setSelectedAudioOutputIdState(storedOutputId);
    void refreshAudioDevices();

    const handleDeviceChange = () => void refreshAudioDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, [refreshAudioDevices]);

  // 1. Dynamic Script Loading
  useEffect(() => {
    if (typeof window === 'undefined') return;

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
          rootBody: document.body,
          media: {
            constraints: {
              audio: getMicrophoneConstraints(),
              video: false,
            },
          },
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
            await refreshAudioDevices();
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
          void recordOmiCallAudioDiagnostics(data, 'ringing');
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
          void reinforceOmiCallMicrophoneSender(data, 'accepted');
          void recordOmiCallAudioDiagnostics(data, 'accepted');
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
          [3000, 8000].forEach(delay => {
            setTimeout(() => void reinforceOmiCallMicrophoneSender((window as any).activeCall || data, `accepted+${delay}ms`), delay);
            setTimeout(() => void recordOmiCallAudioDiagnostics((window as any).activeCall || data, `accepted+${delay}ms`), delay);
          });
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

    let preparedMicrophonePatch: ReturnType<typeof installPreparedMicrophonePatch> | null = null;

    try {
      const preparedMicrophoneStream = await prepareMicrophoneForOmiCall();
      if (!preparedMicrophoneStream) {
        message.error('Không chuẩn bị được microphone để thực hiện cuộc gọi.', 12);
        return;
      }
      preparedMicrophonePatch = installPreparedMicrophonePatch(preparedMicrophoneStream);
      await refreshOmiCallMediaDevices();
      await refreshAudioDevices();
      await unlockAudioPlayback();
    } catch (err: any) {
      console.warn('[OmiCallContext] Microphone preflight failed:', err);
      message.error(err?.message || 'Vui lòng cấp quyền Microphone để thực hiện cuộc gọi.', 12);
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
          customerName: name || 'Khách hàng'
        })
      });

      if (!omicallCall) {
        preparedMicrophonePatch?.release();
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
        legacyUserId: customerId
      });
      playRingback();
    } catch (err: any) {
      preparedMicrophonePatch?.release();
      console.error('[OmiCallContext] makeCall failed:', err);
      message.error('Lỗi khi thực hiện cuộc gọi: ' + err.message);
      setCallState('idle');
      setCurrentCall(null);
    }
  };

  const answerCall = () => {
    const activeCall = (window as any).activeCall;
    scheduleOmiCallMediaBridgeSync(activeCall);
    void reinforceOmiCallMicrophoneSender(activeCall, 'answer');
    void recordOmiCallAudioDiagnostics(activeCall, 'answer');
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
    const activeCall = (window as any).activeCall;
    if (activeCall && typeof activeCall.mute === 'function') {
      activeCall.mute((audioEnabled: boolean) => {
        const muted = !audioEnabled;
        activeCall.__mosUserMuted = muted;
        setIsMuted(muted);
        void recordOmiCallAudioDiagnostics(activeCall, muted ? 'muted' : 'unmuted');
      });
    } else if (window.OMICallSDK && typeof (window.OMICallSDK as any).mute === 'function') {
      (window.OMICallSDK as any).mute((audioEnabled: boolean) => {
        setIsMuted(!audioEnabled);
      });
    } else {
      setIsMuted(prev => !prev);
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
        isSimulated,
        audioInputDevices,
        audioOutputDevices,
        selectedAudioInputId: selectedAudioInputIdState,
        selectedAudioOutputId: selectedAudioOutputIdState,
        setSelectedAudioInputId,
        setSelectedAudioOutputId,
        refreshAudioDevices,
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
