import './types';
import { OMI_AUDIO_INPUT_STORAGE_KEY } from './useAudioManager';

export const getMicrophoneConstraints = (): MediaTrackConstraints => {
  const constraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  const globalAudioDevices = (window as SafeAny).__mosGlobalAudioDevices || {};
  if (globalAudioDevices.selectedInputId) {
    constraints.deviceId = { exact: globalAudioDevices.selectedInputId };
  }

  return constraints;
};

export const getOmiCallMicrophoneStream = async () => {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: getMicrophoneConstraints(),
      video: false,
    });
  } catch (err) {
    const globalAudioDevices = (window as SafeAny).__mosGlobalAudioDevices || {};
    const canRetryDefault =
      globalAudioDevices.selectedInputId &&
      ['OverconstrainedError', 'NotFoundError', 'NotReadableError'].includes((err as SafeAny)?.name);

    if (!canRetryDefault) throw err;

    console.warn(
      '[OmiCallContext] Selected microphone is unavailable. Falling back to system default microphone.',
      err
    );
    if ((window as SafeAny).__mosGlobalAudioDevices) {
      (window as SafeAny).__mosGlobalAudioDevices.selectedInputId = '';
    }
    try {
      localStorage.removeItem(OMI_AUDIO_INPUT_STORAGE_KEY);
    } catch (e) {}

    return navigator.mediaDevices.getUserMedia({
      audio: getMicrophoneConstraints(),
      video: false,
    });
  }
};

export const getLiveAudioTracks = (stream: MediaStream) => {
  return stream.getAudioTracks().filter((track) => track.readyState === 'live' && track.enabled);
};

export const hasUsableMicrophoneStream = (stream: MediaStream | null | undefined) => {
  return !!stream && getLiveAudioTracks(stream).length > 0;
};

export const stopMediaStream = (stream: MediaStream | null | undefined) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const isPlainRecord = (value: unknown): value is Record<string, SafeAny> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const omitDefaultAudioDevice = (audioConstraints: MediaTrackConstraints | boolean | undefined) => {
  if (!isPlainRecord(audioConstraints)) return audioConstraints;

  const nextAudioConstraints = { ...audioConstraints };
  const deviceId: SafeAny = nextAudioConstraints.deviceId;
  const isDefaultDevice =
    deviceId === 'default' ||
    (isPlainRecord(deviceId) && (deviceId.ideal === 'default' || deviceId.exact === 'default'));

  if (isDefaultDevice) {
    delete nextAudioConstraints.deviceId;
  }

  if ('voiceIsolation' in nextAudioConstraints) {
    delete (nextAudioConstraints as SafeAny).voiceIsolation;
  }

  return nextAudioConstraints;
};

export const sanitizeOmiCallMediaConstraints = (constraints?: MediaStreamConstraints) => {
  if (!constraints?.audio) return constraints;

  const sanitizedAudio = omitDefaultAudioDevice(constraints.audio);
  if (sanitizedAudio === constraints.audio) return constraints;

  return {
    ...constraints,
    audio: sanitizedAudio,
  };
};

export const installOmiCallMediaConstraintPatch = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if ((window as SafeAny).__mosOmiCallMediaConstraintPatchInstalled) return;
  if (!navigator.mediaDevices?.getUserMedia) return;

  const mediaDevices = navigator.mediaDevices;
  const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

  try {
    (mediaDevices as SafeAny).getUserMedia = (constraints?: MediaStreamConstraints) => {
      const sanitizedConstraints = sanitizeOmiCallMediaConstraints(constraints);

      if (sanitizedConstraints !== constraints) {
        console.log('[OmiCallContext] Removed hard-coded default audio device from media constraints.', {
          original: constraints,
          sanitized: sanitizedConstraints,
        });
      }

      return originalGetUserMedia(sanitizedConstraints as MediaStreamConstraints);
    };
    (window as SafeAny).__mosOmiCallMediaConstraintPatchInstalled = true;
  } catch (err) {
    console.warn('[OmiCallContext] Failed to install OmiCall media constraint patch:', err);
  }
};

export const shouldUsePreparedMicrophoneForConstraints = (constraints?: MediaStreamConstraints) => {
  if (!constraints?.audio) return false;
  if (constraints.video) return false;
  return true;
};
