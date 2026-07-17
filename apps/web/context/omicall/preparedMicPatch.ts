import './types';
import {
  getOmiCallMicrophoneStream,
  getLiveAudioTracks,
  stopMediaStream,
  shouldUsePreparedMicrophoneForConstraints,
} from './microphoneUtils';
import { measureMicrophoneSignal } from './audioDiagnostics';

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

export const installPreparedMicrophonePatch = (stream: MediaStream) => {
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
  let timeout: SafeAny = null;

  const restore = () => {
    if (restored) return;
    restored = true;
    if (timeout) clearTimeout(timeout);
    try {
      (mediaDevices as SafeAny).getUserMedia = originalGetUserMedia;
    } catch (err) {
      console.warn('[OmiCallContext] Failed to restore getUserMedia after OmiCall mic patch:', err);
    }
  };

  try {
    (mediaDevices as SafeAny).getUserMedia = async (constraints?: MediaStreamConstraints) => {
      if (shouldUsePreparedMicrophoneForConstraints(constraints)) {
        consumedCount += 1;
        console.log('[OmiCallContext] Supplying validated microphone stream to OmiCall SDK.', {
          constraints,
          consumedCount,
          tracks: stream.getAudioTracks().map((track) => ({
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

export const prepareMicrophoneForOmiCall = async () => {
  if (typeof window === 'undefined') return;

  if (!(window as SafeAny).isSecureContext) {
    // Falls back to window.isSecureContext if not secure context
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt không hỗ trợ hoặc đang chặn MediaDevices/getUserMedia.');
  }

  try {
    const permissionStatus = await navigator.permissions?.query({ name: 'microphone' as SafeAny });
    if (permissionStatus?.state === 'denied') {
      throw new Error(
        'Quyền Microphone đang bị chặn. Hãy mở biểu tượng khóa trên thanh địa chỉ và chọn Allow Microphone.'
      );
    }
  } catch (err) {
    if ((err as SafeAny)?.message?.includes('Microphone')) throw err;
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
      tracks: audioTracks.map((track) => ({
        id: track.id,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: typeof track.getSettings === 'function' ? track.getSettings() : null,
      })),
    });
    dispatchOmiCallNotification(
      'warning',
      'Microphone đã được cấp quyền nhưng mẫu thử đang im lặng. Hãy nói thử khi cuộc gọi kết nối để kiểm tra 2 chiều.',
      8
    );
  }

  return stream;
};
