import './types';
import { applyOmiCallAudioOutputDevice, applyOmiCallAudioOutputToActiveMedia } from './useAudioManager';
import { getOmiCallSdkUid, getActiveOmiCallPeerConnection } from './peerConnectionTracker';
import { hasUsableMicrophoneStream, stopMediaStream } from './microphoneUtils';
import { getAudioWarningKeys } from './audioDiagnostics';

// Forward declaration or direct import of stream sync
import { syncOmiCallRemoteStreamFromReceiver } from './callStreamSync';

export const isMediaStream = (value: SafeAny): value is MediaStream => {
  return typeof MediaStream !== 'undefined' && value instanceof MediaStream;
};

export const getOmiCallMediaContainer = () => {
  if (typeof document === 'undefined') return null;

  let container = document.getElementById('mos-omicall-media-bridge');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mos-omicall-media-bridge';
    container.setAttribute('aria-hidden', 'true');
    container.style.cssText =
      'position:fixed;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    document.body.appendChild(container);
  }

  return container;
};

export const ensureOmiCallMediaElement = (id: string, muted: boolean) => {
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

export const playOmiCallMediaElement = (element: HTMLMediaElement) => {
  const playPromise = element.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((err: SafeAny) => {
      console.warn('[OmiCallContext] OmiCall media playback is not ready yet:', err);
    });
  }
};

export const attachOmiCallStream = (call: SafeAny, streamKey: string, muted: boolean) => {
  const uid = getOmiCallSdkUid(call);
  const stream = call?.streams?.[streamKey];
  if (!uid || !isMediaStream(stream)) return;

  const element = ensureOmiCallMediaElement(`${uid}-${streamKey}`, muted);
  if (!element) return;

  element.muted = muted;
  element.autoplay = true;
  element.srcObject = stream;
  void applyOmiCallAudioOutputDevice(element);

  if (call.players && !call.players[streamKey]) {
    call.players[streamKey] = element;
  }

  const sdkPlayer = call.players?.[streamKey];
  if (
    sdkPlayer &&
    sdkPlayer !== element &&
    typeof HTMLMediaElement !== 'undefined' &&
    sdkPlayer instanceof HTMLMediaElement
  ) {
    sdkPlayer.muted = muted;
    sdkPlayer.autoplay = true;
    sdkPlayer.srcObject = stream;
    void applyOmiCallAudioOutputDevice(sdkPlayer);
    playOmiCallMediaElement(sdkPlayer);
  }

  const trackListenerKey = '__mosOmiCallTrackListener';
  if (!(element as SafeAny)[trackListenerKey]) {
    const onAddTrack = () => {
      try {
        element.load();
      } catch (e) {}
      playOmiCallMediaElement(element);
    };
    stream.addEventListener('addtrack', onAddTrack);
    (element as SafeAny)[trackListenerKey] = onAddTrack;
  }

  playOmiCallMediaElement(element);
};

export const shouldMuteOmiCallStream = (streamKey: string) => {
  const normalizedKey = streamKey.toLowerCase();
  return !['remote', 'receiver', 'receivers'].includes(normalizedKey);
};

export const ensureOmiCallMediaBridge = (call: SafeAny) => {
  if (typeof document === 'undefined') return;

  const uid = getOmiCallSdkUid(call);
  if (!uid) return;

  const peerConnection = getActiveOmiCallPeerConnection(call);
  if (peerConnection) {
    syncOmiCallRemoteStreamFromReceiver(call, peerConnection);
    if (hasUsableMicrophoneStream(call.__mosMicrophoneStream)) {
      call.streams = call.streams || {};
      call.streams.local = call.__mosMicrophoneStream;
    }
  }

  ensureOmiCallMediaElement(`${uid}-remote`, false);
  ensureOmiCallMediaElement(`${uid}-local`, true);

  attachOmiCallStream(call, 'remote', false);
  attachOmiCallStream(call, 'local', true);

  Object.keys(call?.streams || {}).forEach((streamKey) => {
    attachOmiCallStream(call, streamKey, shouldMuteOmiCallStream(streamKey));
  });

  applyOmiCallAudioOutputToActiveMedia(call);
};

export const scheduleOmiCallMediaBridgeSync = (call: SafeAny) => {
  ensureOmiCallMediaBridge(call);
  [250, 1000, 2500].forEach((delay) => {
    setTimeout(() => ensureOmiCallMediaBridge(call), delay);
  });
};

export const cleanupOmiCallMediaBridge = (call: SafeAny) => {
  if (typeof document === 'undefined') return;

  getAudioWarningKeys().clear();

  if (isMediaStream(call?.__mosMicrophoneStream)) {
    stopMediaStream(call.__mosMicrophoneStream);
    call.__mosMicrophoneStream = null;
  }
  call?.__mosPreparedMicrophonePatch?.releaseIfUnused?.();
  if (call?.__mosPreparedMicrophonePatch) {
    call.__mosPreparedMicrophonePatch = null;
  }

  const uid = getOmiCallSdkUid(call);
  if (!uid) return;

  [`${uid}-remote`, `${uid}-local`].forEach((id) => {
    const el = document.getElementById(id) as HTMLMediaElement | null;
    if (!el) return;
    try {
      el.pause();
      el.srcObject = null;
    } catch (e) {}
    el.remove();
  });
};
