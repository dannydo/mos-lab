import './types';

export const getOmiCallSdkUid = (call: SafeAny) => call?.uid || call?.sdkUid || null;

export const summarizeMediaTrack = (track: MediaStreamTrack | null) =>
  track
    ? {
        id: track.id,
        kind: track.kind,
        label: track.label,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        settings: typeof track.getSettings === 'function' ? track.getSettings() : null,
      }
    : null;

export const installOmiCallPeerConnectionTracker = () => {
  if (typeof window === 'undefined') return;
  if ((window as SafeAny).__mosOmiCallPeerConnectionTrackerInstalled) return;
  if (typeof window.RTCPeerConnection !== 'function') return;

  const OriginalRTCPeerConnection = window.RTCPeerConnection;
  const trackedPeerConnections = new Set<RTCPeerConnection>();

  const PatchedRTCPeerConnection = function (
    this: RTCPeerConnection,
    ...args: ConstructorParameters<typeof RTCPeerConnection>
  ) {
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
  } as SafeAny;

  try {
    PatchedRTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
    Object.setPrototypeOf(PatchedRTCPeerConnection, OriginalRTCPeerConnection);
    window.RTCPeerConnection = PatchedRTCPeerConnection;
    (window as SafeAny).__mosOmiCallPeerConnections = trackedPeerConnections;
    (window as SafeAny).__mosOmiCallPeerConnectionTrackerInstalled = true;
  } catch (err) {
    console.warn('[OmiCallContext] Failed to install OmiCall peer connection tracker:', err);
  }
};

export const getActiveOmiCallPeerConnection = (call: SafeAny): RTCPeerConnection | null => {
  const fromCall = call?.session?.sessionDescriptionHandler?.peerConnection;
  if (fromCall) return fromCall;

  const trackedPeerConnections = Array.from(
    (window as SafeAny).__mosOmiCallPeerConnections || []
  ) as RTCPeerConnection[];
  return trackedPeerConnections.find((peerConnection) => peerConnection.signalingState !== 'closed') || null;
};

export const getPeerConnectionAudioStats = async (peerConnection: RTCPeerConnection) => {
  const summarizeReports = async (source: RTCRtpSender | RTCRtpReceiver) => {
    try {
      const stats = await source.getStats();
      const reports = Array.from(stats.values());
      return reports
        .filter((report: SafeAny) => {
          const kind = report.kind || report.mediaType;
          return (
            kind === 'audio' ||
            String(report.id || '')
              .toLowerCase()
              .includes('audio')
          );
        })
        .map((report: SafeAny) => ({
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
      return [{ error: err instanceof Error ? (err as SafeAny).message : String(err) }];
    }
  };

  const senders = await Promise.all(
    peerConnection.getSenders().map(async (sender) => ({
      track: summarizeMediaTrack(sender.track),
      stats: await summarizeReports(sender),
    }))
  );

  const receivers = await Promise.all(
    peerConnection.getReceivers().map(async (receiver) => ({
      track: summarizeMediaTrack(receiver.track),
      stats: await summarizeReports(receiver),
    }))
  );

  return {
    connectionState: peerConnection.connectionState,
    iceConnectionState: peerConnection.iceConnectionState,
    iceGatheringState: peerConnection.iceGatheringState,
    signalingState: peerConnection.signalingState,
    senders,
    receivers,
  };
};

export const describeOmiCallPeerConnections = async () => {
  if (typeof window === 'undefined') return [];

  const trackedPeerConnections = Array.from(
    (window as SafeAny).__mosOmiCallPeerConnections || []
  ) as RTCPeerConnection[];
  const activePeerConnections = trackedPeerConnections.filter((peerConnection) => {
    return peerConnection.signalingState !== 'closed';
  });

  return Promise.all(activePeerConnections.map(getPeerConnectionAudioStats));
};
