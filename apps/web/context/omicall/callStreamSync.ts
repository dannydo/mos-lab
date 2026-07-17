import './types';
import {
  getOmiCallMicrophoneStream,
  getLiveAudioTracks,
  hasUsableMicrophoneStream,
  stopMediaStream,
} from './microphoneUtils';
import { getActiveOmiCallPeerConnection, getOmiCallSdkUid, summarizeMediaTrack } from './peerConnectionTracker';
import { resumeOmiCallAudioGraph, isMediaStream } from './audioDiagnostics';

export const syncOmiCallLocalStreamFromSender = (activeCall: SafeAny, peerConnection: RTCPeerConnection) => {
  const audioSenders = peerConnection.getSenders().filter((sender) => sender.track?.kind === 'audio');
  const localStream = activeCall.streams?.local;

  if (isMediaStream(localStream)) {
    localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
      if (!audioSenders.some((sender) => sender.track?.id === track.id)) {
        localStream.removeTrack(track);
        track.stop();
      }
    });
    audioSenders.forEach((sender) => {
      const track = sender.track;
      if (
        track &&
        !localStream.getAudioTracks().some((existingTrack: MediaStreamTrack) => existingTrack.id === track.id)
      ) {
        localStream.addTrack(track);
      }
    });
    activeCall.streams.local = localStream;
    return localStream;
  }

  const nextLocalStream = new MediaStream();
  audioSenders.forEach((sender) => {
    if (sender.track) nextLocalStream.addTrack(sender.track);
  });
  activeCall.streams = activeCall.streams || {};
  activeCall.streams.local = nextLocalStream;
  return nextLocalStream;
};

export const syncOmiCallRemoteStreamFromReceiver = (activeCall: SafeAny, peerConnection: RTCPeerConnection) => {
  const audioReceivers = peerConnection.getReceivers().filter((receiver) => receiver.track?.kind === 'audio');
  if (!audioReceivers.length) return null;

  const remoteStream = isMediaStream(activeCall.streams?.remote) ? activeCall.streams.remote : new MediaStream();

  remoteStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
    if (!audioReceivers.some((receiver) => receiver.track?.id === track.id)) {
      remoteStream.removeTrack(track);
    }
  });

  audioReceivers.forEach((receiver) => {
    const track = receiver.track;
    if (
      track &&
      !remoteStream.getAudioTracks().some((existingTrack: MediaStreamTrack) => existingTrack.id === track.id)
    ) {
      remoteStream.addTrack(track);
    }
  });

  activeCall.streams = activeCall.streams || {};
  activeCall.streams.remote = remoteStream;
  return remoteStream;
};

export const attachMicrophoneStreamToOmiCall = async (
  activeCall: SafeAny,
  peerConnection: RTCPeerConnection,
  microphoneStream: MediaStream,
  stage: string
) => {
  const [microphoneTrack] = getLiveAudioTracks(microphoneStream);
  if (!microphoneTrack) return false;

  microphoneTrack.enabled = true;

  const sessionDescriptionHandler = activeCall.session?.sessionDescriptionHandler;
  let audioGraphState = await resumeOmiCallAudioGraph(sessionDescriptionHandler);
  let reinforcementMode = 'stable-sender-track';

  if (typeof sessionDescriptionHandler?.setRealLocalMediaStream === 'function') {
    sessionDescriptionHandler.setRealLocalMediaStream(microphoneStream);
    reinforcementMode = 'sdk-real-local-stream';
  } else if (sessionDescriptionHandler) {
    sessionDescriptionHandler.localMediaStreamReal = microphoneStream;
    sessionDescriptionHandler.localMediaStream = microphoneStream;
  }

  const audioSender = peerConnection.getSenders().find((sender) => sender.track?.kind === 'audio');
  if (audioSender) {
    if (audioSender.track?.id !== microphoneTrack.id) {
      await audioSender.replaceTrack(microphoneTrack);
      reinforcementMode =
        reinforcementMode === 'sdk-real-local-stream'
          ? 'sdk-real-local-stream+sender-track'
          : 'stable-sender-replace-track';
    }
  } else {
    peerConnection.addTrack(microphoneTrack, microphoneStream);
    reinforcementMode = `${reinforcementMode}+sender-add-track`;
  }

  audioGraphState = await resumeOmiCallAudioGraph(sessionDescriptionHandler);

  activeCall.audio = true;
  activeCall.__mosUserMuted = false;
  activeCall.__mosMicrophoneStream = microphoneStream;
  activeCall.streams = activeCall.streams || {};
  activeCall.streams.local = microphoneStream;

  peerConnection.getSenders().forEach((sender) => {
    if (sender.track?.kind === 'audio') {
      sender.track.enabled = true;
    }
  });

  const localStream = isMediaStream(activeCall.streams.local)
    ? activeCall.streams.local
    : syncOmiCallLocalStreamFromSender(activeCall, peerConnection);

  localStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
    track.enabled = true;
  });

  const result = {
    stage,
    at: new Date().toISOString(),
    uid: getOmiCallSdkUid(activeCall),
    uuid: activeCall.uuid || activeCall.callUuid || activeCall.call_uuid || null,
    track: summarizeMediaTrack(microphoneTrack),
    senderTracks: peerConnection
      .getSenders()
      .filter((sender) => sender.track?.kind === 'audio')
      .map((sender) => summarizeMediaTrack(sender.track)),
    localStreamTracks: localStream.getAudioTracks().map((track: MediaStreamTrack) => summarizeMediaTrack(track)),
    mode: reinforcementMode,
    audioGraphState,
    senderCount: peerConnection.getSenders().length,
    audioSenderCount: peerConnection.getSenders().filter((sender) => sender.track?.kind === 'audio').length,
  };

  (window as SafeAny).__mosLastOmiCallMicrophoneReinforcement = result;
  console.log('[OmiCallContext] microphone sender reinforced:', JSON.stringify(result));
  return true;
};

export const reinforceOmiCallMicrophoneSender = async (
  call: SafeAny,
  stage: string,
  options: { forceNewStream?: boolean } = {}
) => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;

  const activeCall = call || (window as SafeAny).activeCall;
  const peerConnection = getActiveOmiCallPeerConnection(activeCall);
  if (!activeCall || !peerConnection || peerConnection.signalingState === 'closed') return false;
  if (activeCall.__mosUserMuted) return false;

  let nextStream: MediaStream | null = null;
  const previousStream = isMediaStream(activeCall.__mosMicrophoneStream) ? activeCall.__mosMicrophoneStream : null;

  try {
    nextStream =
      !options.forceNewStream && hasUsableMicrophoneStream(previousStream)
        ? previousStream
        : await getOmiCallMicrophoneStream();

    if (!nextStream) return false;

    const attached = await attachMicrophoneStreamToOmiCall(activeCall, peerConnection, nextStream, stage);
    if (attached && previousStream && previousStream !== nextStream) {
      stopMediaStream(previousStream);
    }
    return attached;
  } catch (err) {
    if (nextStream && nextStream !== previousStream) {
      stopMediaStream(nextStream);
    }
    console.warn('[OmiCallContext] Failed to reinforce microphone sender:', err);
    return false;
  }
};
