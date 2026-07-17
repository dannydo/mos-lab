'use client';

import './types';

// Re-export all sub-modules for backward compatibility
export {
  getMicrophoneConstraints,
  getOmiCallMicrophoneStream,
  getLiveAudioTracks,
  hasUsableMicrophoneStream,
  stopMediaStream,
  omitDefaultAudioDevice,
  sanitizeOmiCallMediaConstraints,
  installOmiCallMediaConstraintPatch,
  shouldUsePreparedMicrophoneForConstraints,
} from './microphoneUtils';

export { installPreparedMicrophonePatch, prepareMicrophoneForOmiCall } from './preparedMicPatch';

export {
  getOmiCallSdkUid,
  getActiveOmiCallPeerConnection,
  summarizeMediaTrack,
  installOmiCallPeerConnectionTracker,
  getPeerConnectionAudioStats,
  describeOmiCallPeerConnections,
} from './peerConnectionTracker';

export {
  measureAudioSignal,
  measureMicrophoneSignal,
  unlockAudioPlayback,
  refreshOmiCallMediaDevices,
  describeOmiCallStream,
  hasLiveEnabledTrack,
  hasLiveAudioSender,
  hasRemoteAudioReceiver,
  warnOmiCallAudioHealth,
  recordOmiCallAudioDiagnostics,
  auditActiveCallAudio,
} from './audioDiagnostics';

export {
  getOmiCallMediaContainer,
  ensureOmiCallMediaElement,
  playOmiCallMediaElement,
  attachOmiCallStream,
  shouldMuteOmiCallStream,
  ensureOmiCallMediaBridge,
  scheduleOmiCallMediaBridgeSync,
  cleanupOmiCallMediaBridge,
} from './mediaBridge';

export {
  syncOmiCallLocalStreamFromSender,
  syncOmiCallRemoteStreamFromReceiver,
  attachMicrophoneStreamToOmiCall,
  reinforceOmiCallMicrophoneSender,
} from './callStreamSync';

export { ensureOmiCallSwitchboardOnline } from './switchboardUtils';

export { triggerIncomingNotification, clearIncomingNotification } from './incomingNotification';
