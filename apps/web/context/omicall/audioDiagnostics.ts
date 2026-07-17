import './types';
import { getOmiCallSdkUid, describeOmiCallPeerConnections, summarizeMediaTrack } from './peerConnectionTracker';
import { getLiveAudioTracks, getMicrophoneConstraints, hasUsableMicrophoneStream } from './microphoneUtils';

const dispatchOmiCallNotification = (
  type: 'success' | 'error' | 'warning' | 'info',
  content: string,
  duration?: number
) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('omicall-notification', {
      detail: { type, content, duration },
    })
  );
};

export const resumeOmiCallAudioGraph = async (sessionDescriptionHandler: SafeAny) => {
  const audioContext = sessionDescriptionHandler?.constructor?.audioContext;

  if (audioContext?.state === 'suspended' && typeof audioContext.resume === 'function') {
    await audioContext.resume();
  }

  return audioContext?.state || null;
};

export const measureAudioSignal = async (stream: MediaStream, sampleCount = 8, sampleMs = 80) => {
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
      await new Promise((resolve) => setTimeout(resolve, sampleMs));
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

export const measureMicrophoneSignal = async (stream: MediaStream) => {
  return measureAudioSignal(stream);
};

export const unlockAudioPlayback = async () => {
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

export const refreshOmiCallMediaDevices = async () => {
  try {
    navigator.mediaDevices?.dispatchEvent?.(new Event('devicechange'));
    await new Promise((resolve) => setTimeout(resolve, 350));
  } catch (err) {
    console.warn('[OmiCallContext] Media device refresh skipped:', err);
  }
};

export const isMediaStream = (value: SafeAny): value is MediaStream => {
  return typeof MediaStream !== 'undefined' && value instanceof MediaStream;
};

export const describeOmiCallStream = async (call: SafeAny, streamKey: string) => {
  const stream = call?.streams?.[streamKey];
  const uid = getOmiCallSdkUid(call);
  const element = uid ? (document.getElementById(`${uid}-${streamKey}`) as HTMLMediaElement | null) : null;

  if (!isMediaStream(stream)) {
    return {
      exists: false,
      tracks: [],
      rms: null,
      element: element
        ? {
            muted: element.muted,
            autoplay: element.autoplay,
            paused: element.paused,
            hasSrcObject: !!element.srcObject,
            sinkId: (element as HTMLMediaElement & { sinkId?: string }).sinkId || null,
          }
        : null,
    };
  }

  const tracks = stream.getAudioTracks().map((track) => ({
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
    element: element
      ? {
          muted: element.muted,
          autoplay: element.autoplay,
          paused: element.paused,
          hasSrcObject: !!element.srcObject,
          sinkId: (element as HTMLMediaElement & { sinkId?: string }).sinkId || null,
        }
      : null,
  };
};

export const hasLiveEnabledTrack = (streamInfo: SafeAny) => {
  return streamInfo?.tracks?.some((track: SafeAny) => track.readyState === 'live' && track.enabled);
};

export const hasLiveAudioSender = (diagnostics: SafeAny) => {
  return diagnostics?.peerConnections?.some((peerConnection: SafeAny) => {
    return peerConnection.senders?.some((sender: SafeAny) => {
      return sender.track?.kind === 'audio' && sender.track.readyState === 'live' && sender.track.enabled;
    });
  });
};

export const hasRemoteAudioReceiver = (diagnostics: SafeAny) => {
  return diagnostics?.peerConnections?.some((peerConnection: SafeAny) => {
    return peerConnection.receivers?.some((receiver: SafeAny) => {
      return receiver.track?.kind === 'audio' && receiver.track.readyState === 'live';
    });
  });
};

const audioHealthWarningKeys = new Set<string>();

export const warnOmiCallAudioHealth = (diagnostics: SafeAny) => {
  if (!diagnostics?.stage?.startsWith('accepted+')) return;

  const callKey = diagnostics.uuid || diagnostics.uid || 'active-call';
  const local = diagnostics.streams?.local;
  const remote = diagnostics.streams?.remote;

  if (!hasLiveEnabledTrack(local)) {
    const key = `${callKey}:local-track`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      dispatchOmiCallNotification(
        'error',
        'Cuộc gọi đang không có live microphone track. Chrome có thể chưa gửi giọng bạn vào OmiCall.',
        12
      );
    }
  }

  if (!hasLiveAudioSender(diagnostics)) {
    const key = `${callKey}:pc-audio-sender`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      dispatchOmiCallNotification(
        'error',
        'WebRTC chưa có audio sender live. Giọng bạn có thể chưa được gửi vào cuộc gọi.',
        12
      );
    }
  }

  if (!hasLiveEnabledTrack(remote)) {
    const key = `${callKey}:remote-track`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      dispatchOmiCallNotification(
        'error',
        'Cuộc gọi chưa nhận được remote audio track từ OmiCall. Bạn có thể sẽ không nghe được khách.',
        12
      );
    }
  }

  if (!hasRemoteAudioReceiver(diagnostics)) {
    const key = `${callKey}:pc-audio-receiver`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      dispatchOmiCallNotification(
        'error',
        'WebRTC chưa có audio receiver live. Bạn có thể chưa nhận được tiếng khách.',
        12
      );
    }
  }

  if (remote?.exists && (!remote.element?.hasSrcObject || remote.element?.muted || remote.element?.paused)) {
    const key = `${callKey}:remote-playback`;
    if (!audioHealthWarningKeys.has(key)) {
      audioHealthWarningKeys.add(key);
      dispatchOmiCallNotification(
        'error',
        'Remote audio đã có stream nhưng playback element chưa phát. Hãy click vào trang hoặc reload trước khi gọi lại.',
        12
      );
    }
  }
};

export const recordOmiCallAudioDiagnostics = async (call: SafeAny, stage: string) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ensureOmiCallMediaBridge } = require('./mediaBridge');
  ensureOmiCallMediaBridge(call);

  const activeCall = call || (window as SafeAny).activeCall;
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

  (window as SafeAny).__mosLastOmiCallAudioDiagnostics = diagnostics;
  console.log('[OmiCallContext] audio diagnostics:', diagnostics);
  console.log('[OmiCallContext] audio diagnostics json:', JSON.stringify(diagnostics));
  warnOmiCallAudioHealth(diagnostics);
  return diagnostics;
};

export const auditActiveCallAudio = () => {
  if (typeof window === 'undefined') return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ensureOmiCallMediaBridge } = require('./mediaBridge');
  const activeCall = (window as SafeAny).activeCall;
  ensureOmiCallMediaBridge(activeCall);
  void recordOmiCallAudioDiagnostics(activeCall, 'audit');

  const localTracks = activeCall?.streams?.local?.getAudioTracks?.() || [];

  if (
    !localTracks.length ||
    localTracks.every((track: MediaStreamTrack) => track.readyState !== 'live' || !track.enabled)
  ) {
    console.warn('[OmiCallContext] Active call has no live local microphone track.', activeCall);
    dispatchOmiCallNotification(
      'error',
      'Microphone chưa được gửi vào cuộc gọi. Hãy kiểm tra quyền mic và chọn đúng input trên Chrome.',
      12
    );
  }
};

export const getAudioWarningKeys = () => audioHealthWarningKeys;
