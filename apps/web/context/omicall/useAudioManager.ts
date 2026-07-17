import { useState, useCallback, useEffect } from 'react';

export const OMI_AUDIO_INPUT_STORAGE_KEY = 'mos_omicall_audio_input_id';
export const OMI_AUDIO_OUTPUT_STORAGE_KEY = 'mos_omicall_audio_output_id';

// Shared device IDs accessible by utility functions
export const globalAudioDevices = {
  selectedInputId: '',
  selectedOutputId: '',
};

// Web Audio API Ringtone Helpers
let audioCtx: AudioContext | null = null;
let ringtoneInterval: SafeAny = null;

export const playRingtone = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();

    const playBeep = () => {
      if (!audioCtx) return;

      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(480, audioCtx.currentTime);

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

export const stopRingtone = () => {
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

let ringbackAudio: SafeAny = null;

export const applyOmiCallAudioOutputDevice = async (element: HTMLMediaElement | null | undefined) => {
  if (!element || element.muted) return;

  const setSinkId = (element as HTMLMediaElement & { setSinkId?: (sinkId: string) => Promise<void> }).setSinkId;
  if (typeof setSinkId !== 'function') return;

  try {
    await setSinkId.call(element, globalAudioDevices.selectedOutputId || '');
  } catch (err) {
    console.warn('[OmiCallContext] Failed to route audio output device:', err);
  }
};

export const applyOmiCallAudioOutputToActiveMedia = (call?: SafeAny) => {
  if (typeof document !== 'undefined') {
    document
      .querySelectorAll<HTMLMediaElement>('#mos-omicall-media-bridge audio, #mos-omicall-media-bridge video')
      .forEach((element) => void applyOmiCallAudioOutputDevice(element));
  }

  const activeCall = call || (typeof window !== 'undefined' ? (window as SafeAny).activeCall : null);
  Object.values(activeCall?.players || {}).forEach((player: SafeAny) => {
    if (typeof HTMLMediaElement !== 'undefined' && player instanceof HTMLMediaElement) {
      void applyOmiCallAudioOutputDevice(player);
    }
  });

  void applyOmiCallAudioOutputDevice(ringbackAudio);
};

export const playRingback = () => {
  if (typeof window === 'undefined') return;
  try {
    if (!ringbackAudio) {
      ringbackAudio = new Audio('https://cdn.omicrm.com/sdk/assets/audios/call/ringing.mp3');
      ringbackAudio.loop = true;
    }
    applyOmiCallAudioOutputToActiveMedia();
    ringbackAudio.play().catch((e: SafeAny) => {
      console.warn('[OmiCallContext] Failed to play ringback audio:', e);
    });
  } catch (e) {
    console.error('[OmiCallContext] Failed to init ringback audio:', e);
  }
};

export const stopRingback = () => {
  if (ringbackAudio) {
    try {
      ringbackAudio.pause();
      ringbackAudio.currentTime = 0;
    } catch (e) {}
  }
};

export function useAudioManager(callState: string) {
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputIdState] = useState('');
  const [selectedAudioOutputId, setSelectedAudioOutputIdState] = useState('');

  const refreshAudioDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputDevices = devices.filter((device) => device.kind === 'audioinput');
      const outputDevices = devices.filter((device) => device.kind === 'audiooutput');

      if (
        globalAudioDevices.selectedInputId &&
        !inputDevices.some((device) => device.deviceId === globalAudioDevices.selectedInputId)
      ) {
        globalAudioDevices.selectedInputId = '';
        setSelectedAudioInputIdState('');
        localStorage.removeItem(OMI_AUDIO_INPUT_STORAGE_KEY);
      }

      if (
        globalAudioDevices.selectedOutputId &&
        !outputDevices.some((device) => device.deviceId === globalAudioDevices.selectedOutputId)
      ) {
        globalAudioDevices.selectedOutputId = '';
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

  const setSelectedAudioInputId = useCallback(
    (deviceId: string) => {
      globalAudioDevices.selectedInputId = deviceId || '';
      setSelectedAudioInputIdState(globalAudioDevices.selectedInputId);
      try {
        if (globalAudioDevices.selectedInputId) {
          localStorage.setItem(OMI_AUDIO_INPUT_STORAGE_KEY, globalAudioDevices.selectedInputId);
        } else {
          localStorage.removeItem(OMI_AUDIO_INPUT_STORAGE_KEY);
        }
      } catch (e) {}

      // Hook reinforce calls trigger if call is active
      const activeCall = typeof window !== 'undefined' ? (window as SafeAny).activeCall : null;
      if (activeCall && ['ringing', 'incoming', 'connected'].includes(callState)) {
        // Handled via event hook or context callbacks
        const event = new CustomEvent('mos_omicall_reinforce', {
          detail: { reason: 'audio-input-selected', forceNewStream: true },
        });
        window.dispatchEvent(event);
      }
    },
    [callState]
  );

  const setSelectedAudioOutputId = useCallback((deviceId: string) => {
    globalAudioDevices.selectedOutputId = deviceId || '';
    setSelectedAudioOutputIdState(globalAudioDevices.selectedOutputId);
    try {
      if (globalAudioDevices.selectedOutputId) {
        localStorage.setItem(OMI_AUDIO_OUTPUT_STORAGE_KEY, globalAudioDevices.selectedOutputId);
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
    globalAudioDevices.selectedInputId = storedInputId;
    globalAudioDevices.selectedOutputId = storedOutputId;
    setSelectedAudioInputIdState(storedInputId);
    setSelectedAudioOutputIdState(storedOutputId);
    void refreshAudioDevices();

    const handleDeviceChange = () => void refreshAudioDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
    };
  }, [refreshAudioDevices]);

  return {
    audioInputDevices,
    audioOutputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    refreshAudioDevices,
  };
}
