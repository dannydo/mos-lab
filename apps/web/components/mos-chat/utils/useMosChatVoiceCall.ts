'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MosChatMessage, MosChatVoiceCallSession, MosChatVoiceCallSignalEnvelope } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { chatCallAudio } from './chat-call-audio';

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
};

export interface UseMosChatVoiceCallOptions {
  currentStaffId?: string | number | null;
  enabled?: boolean;
  onCallSystemMessageCreated?: (msg: MosChatMessage) => void;
}

export function formatVoiceCallTimer(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function useMosChatVoiceCall(options: UseMosChatVoiceCallOptions) {
  const { currentStaffId, enabled = true, onCallSystemMessageCreated } = options;
  const myStaffId = currentStaffId != null ? String(currentStaffId) : '';

  const [activeCalls, setActiveCalls] = useState<MosChatVoiceCallSession[]>([]);
  const [currentCall, setCurrentCall] = useState<MosChatVoiceCallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<MosChatVoiceCallSession | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [speakingStaffIds, setSpeakingStaffIds] = useState<string[]>([]);
  const [audioWarning, setAudioWarning] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const vadAnalysersRef = useRef<Map<string, { analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> }>>(new Map());
  const vadAudioCtxRef = useRef<AudioContext | null>(null);
  const currentCallRef = useRef<MosChatVoiceCallSession | null>(null);
  const prevCallStatusRef = useRef<string | null>(null);
  const onSystemMsgRef = useRef(onCallSystemMessageCreated);

  currentCallRef.current = currentCall;
  onSystemMsgRef.current = onCallSystemMessageCreated;

  const cleanupMediaAndPeers = useCallback(() => {
    chatCallAudio.stopRingLoop();

    for (const pc of peerConnectionsRef.current.values()) {
      try {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.close();
      } catch {
        // ignore
      }
    }
    peerConnectionsRef.current.clear();
    pendingIceCandidatesRef.current.clear();

    for (const audioEl of remoteAudioElementsRef.current.values()) {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
      } catch {
        // ignore
      }
    }
    remoteAudioElementsRef.current.clear();
    vadAnalysersRef.current.clear();

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      localStreamRef.current = null;
    }

    setSpeakingStaffIds([]);
  }, []);

  const attachStreamToVad = useCallback((staffId: string, stream: MediaStream) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!vadAudioCtxRef.current || vadAudioCtxRef.current.state === 'closed') {
        vadAudioCtxRef.current = new AudioCtx();
      }
      const ctx = vadAudioCtxRef.current;
      if (!ctx) return;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      vadAnalysersRef.current.set(String(staffId), { analyser, data });
    } catch {
      // ignore VAD errors
    }
  }, []);

  const acquireLocalMicrophone = useCallback(async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setAudioWarning('Trình duyệt chưa hỗ trợ thu âm Microphone (chế độ chỉ nghe).');
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      localStreamRef.current = stream;
      setAudioWarning(null);
      if (myStaffId) {
        attachStreamToVad(myStaffId, stream);
      }
      return stream;
    } catch {
      setAudioWarning('Không thể truy cập Microphone (đang ở chế độ chỉ nghe).');
      return null;
    }
  }, [attachStreamToVad, myStaffId]);

  const getOrCreatePeerConnection = useCallback(
    async (callId: string, remoteStaffId: string): Promise<RTCPeerConnection | null> => {
      if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
        return null;
      }
      const existing = peerConnectionsRef.current.get(remoteStaffId);
      if (existing && existing.connectionState !== 'closed' && existing.signalingState !== 'closed') {
        return existing;
      }

      const pc = new RTCPeerConnection(DEFAULT_RTC_CONFIG);
      peerConnectionsRef.current.set(remoteStaffId, pc);

      const localStream = await acquireLocalMicrophone();
      if (localStream) {
        for (const track of localStream.getAudioTracks()) {
          track.enabled = !isMuted;
          pc.addTrack(track, localStream);
        }
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          void apiClient.chat
            .signalCall(callId, {
              targetStaffId: remoteStaffId,
              signalType: 'ice-candidate',
              candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
            })
            .catch(() => {
              // ignore transient signal error
            });
        }
      };

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;
        attachStreamToVad(remoteStaffId, remoteStream);
        if (typeof document !== 'undefined') {
          let audioEl = remoteAudioElementsRef.current.get(remoteStaffId);
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            audioEl.setAttribute('playsinline', 'true');
            remoteAudioElementsRef.current.set(remoteStaffId, audioEl);
          }
          audioEl.muted = isSpeakerMuted;
          audioEl.srcObject = remoteStream;
          audioEl.play().catch(() => {
            // Autoplay fallback
          });
        }
      };

      return pc;
    },
    [acquireLocalMicrophone, attachStreamToVad, isMuted, isSpeakerMuted]
  );

  const handleIncomingSignal = useCallback(
    async (signal: MosChatVoiceCallSignalEnvelope) => {
      const active = currentCallRef.current;
      if (!active || active.callId !== signal.callId) return;

      const remoteStaffId = String(signal.fromStaffId);
      const pc = await getOrCreatePeerConnection(signal.callId, remoteStaffId);
      if (!pc) return;

      try {
        if (signal.signalType === 'offer' && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp as RTCSessionDescriptionInit));
          const queuedCandidates = pendingIceCandidatesRef.current.get(remoteStaffId) || [];
          pendingIceCandidatesRef.current.delete(remoteStaffId);
          for (const cand of queuedCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await apiClient.chat.signalCall(signal.callId, {
            targetStaffId: remoteStaffId,
            signalType: 'answer',
            sdp: pc.localDescription,
          });
        } else if (signal.signalType === 'answer' && signal.sdp) {
          if (pc.signalingState === 'have-local-offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp as RTCSessionDescriptionInit));
            const queuedCandidates = pendingIceCandidatesRef.current.get(remoteStaffId) || [];
            pendingIceCandidatesRef.current.delete(remoteStaffId);
            for (const cand of queuedCandidates) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
          }
        } else if (signal.signalType === 'ice-candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate as RTCIceCandidateInit)).catch(() => {});
          } else {
            const queue = pendingIceCandidatesRef.current.get(remoteStaffId) || [];
            queue.push(signal.candidate as RTCIceCandidateInit);
            pendingIceCandidatesRef.current.set(remoteStaffId, queue);
          }
        }
      } catch {
        // Ignore transient WebRTC negotiation errors
      }
    },
    [getOrCreatePeerConnection]
  );

  const ensureMeshConnectionsForCall = useCallback(
    async (call: MosChatVoiceCallSession) => {
      if (!myStaffId || call.status !== 'ACTIVE') return;
      const amIParticipant = call.participants.some((p) => String(p.staffId) === myStaffId);
      if (!amIParticipant) return;

      for (const peer of call.participants) {
        const peerId = String(peer.staffId);
        if (peerId === myStaffId) continue;

        const existingPc = peerConnectionsRef.current.get(peerId);
        if (existingPc) continue;

        // Deterministic initiator rule to avoid offer collision
        if (myStaffId.localeCompare(peerId) < 0) {
          const pc = await getOrCreatePeerConnection(call.callId, peerId);
          if (!pc) continue;
          try {
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
            });
            await pc.setLocalDescription(offer);
            await apiClient.chat.signalCall(call.callId, {
              targetStaffId: peerId,
              signalType: 'offer',
              sdp: pc.localDescription,
            });
          } catch {
            // ignore
          }
        }
      }
    },
    [getOrCreatePeerConnection, myStaffId]
  );

  const syncActiveCalls = useCallback(async () => {
    if (!enabled || !myStaffId) return;
    try {
      const res = await apiClient.chat.listActiveCalls();
      if (!res?.success) return;

      const list = res.activeCalls || [];
      setActiveCalls(list);

      const myJoinedCall = list.find((c) => c.participants.some((p) => String(p.staffId) === myStaffId)) || null;

      const myRingingIncoming = !myJoinedCall
        ? list.find(
            (c) =>
              c.status === 'RINGING' &&
              String(c.initiatorId) !== myStaffId &&
              !c.declinedStaffIds.includes(myStaffId) &&
              (c.targetStaffIds.includes(myStaffId) || c.conversationType === 'space')
          ) || null
        : null;

      setIncomingCall(myRingingIncoming);

      if (myJoinedCall) {
        setCurrentCall(myJoinedCall);
        void ensureMeshConnectionsForCall(myJoinedCall);
      } else if (currentCallRef.current) {
        // Call was ended remotely
        chatCallAudio.playEndedTone();
        cleanupMediaAndPeers();
        setCurrentCall(null);
      }

      if (Array.isArray(res.pendingSignals) && res.pendingSignals.length > 0) {
        for (const sig of res.pendingSignals) {
          await handleIncomingSignal(sig);
        }
      }
    } catch {
      // Ignore transient network errors
    }
  }, [cleanupMediaAndPeers, enabled, ensureMeshConnectionsForCall, handleIncomingSignal, myStaffId]);

  // Poll faster (1.5s) when in a call or ringing, and 4.5s when idle
  useEffect(() => {
    if (!enabled || !myStaffId) return;
    void syncActiveCalls();

    const intervalMs = currentCall || incomingCall ? 1500 : 4500;
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && !currentCall && !incomingCall) {
        return;
      }
      void syncActiveCalls();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [currentCall, enabled, incomingCall, myStaffId, syncActiveCalls]);

  // Manage audio ringtones on state transitions
  useEffect(() => {
    if (incomingCall && !currentCall) {
      chatCallAudio.startIncomingRingtone();
      return () => {
        chatCallAudio.stopRingLoop();
      };
    }

    if (currentCall) {
      if (currentCall.status === 'RINGING' && prevCallStatusRef.current !== 'RINGING') {
        chatCallAudio.startOutgoingRingback();
      } else if (currentCall.status === 'ACTIVE' && prevCallStatusRef.current !== 'ACTIVE') {
        chatCallAudio.playConnectedChime();
      }
      prevCallStatusRef.current = currentCall.status;
    } else {
      prevCallStatusRef.current = null;
      chatCallAudio.stopRingLoop();
    }
  }, [currentCall, incomingCall]);

  // Call duration timer (tabular-nums)
  useEffect(() => {
    if (!currentCall || currentCall.status !== 'ACTIVE') {
      setDurationSec(0);
      return;
    }
    const baseMs = currentCall.connectedAt
      ? new Date(currentCall.connectedAt).getTime()
      : new Date(currentCall.startedAt).getTime();

    const updateTimer = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - baseMs) / 1000));
      setDurationSec(elapsed);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [currentCall]);

  // Voice Activity Detection (VAD) loop
  useEffect(() => {
    if (!currentCall || currentCall.status !== 'ACTIVE') {
      setSpeakingStaffIds([]);
      return;
    }
    const timer = setInterval(() => {
      const activeSpeakers: string[] = [];
      for (const [staffId, entry] of vadAnalysersRef.current.entries()) {
        if (staffId === myStaffId && isMuted) continue;
        entry.analyser.getByteFrequencyData(entry.data);
        let sum = 0;
        for (let i = 0; i < entry.data.length; i++) {
          sum += entry.data[i];
        }
        const avg = sum / entry.data.length;
        if (avg > 18) {
          activeSpeakers.push(staffId);
        }
      }
      setSpeakingStaffIds(activeSpeakers);
    }, 250);
    return () => clearInterval(timer);
  }, [currentCall, isMuted, myStaffId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupMediaAndPeers();
    };
  }, [cleanupMediaAndPeers]);

  const startOrJoinVoiceCall = useCallback(
    async (conversationId: string) => {
      if (!conversationId || isConnecting) return null;
      setIsConnecting(true);
      try {
        await acquireLocalMicrophone();
        const res = await apiClient.chat.startCall({ conversationId });
        if (res?.success && res.call) {
          setCurrentCall(res.call);
          setIncomingCall(null);
          setIsMuted(false);
          if (res.call.status === 'ACTIVE') {
            await ensureMeshConnectionsForCall(res.call);
          }
          return res.call;
        }
        return null;
      } finally {
        setIsConnecting(false);
      }
    },
    [acquireLocalMicrophone, ensureMeshConnectionsForCall, isConnecting]
  );

  const acceptIncomingCall = useCallback(
    async (callId?: string) => {
      const targetCallId = callId || incomingCall?.callId;
      if (!targetCallId || isConnecting) return null;
      setIsConnecting(true);
      try {
        await acquireLocalMicrophone();
        const res = await apiClient.chat.respondCall(targetCallId, { action: 'ACCEPT' });
        if (res?.success && res.call) {
          setIncomingCall(null);
          setCurrentCall(res.call);
          setIsMuted(false);
          await ensureMeshConnectionsForCall(res.call);
          return res.call;
        }
        return null;
      } finally {
        setIsConnecting(false);
      }
    },
    [acquireLocalMicrophone, ensureMeshConnectionsForCall, incomingCall?.callId, isConnecting]
  );

  const declineIncomingCall = useCallback(
    async (callId?: string) => {
      const targetCallId = callId || incomingCall?.callId;
      if (!targetCallId) return;
      chatCallAudio.stopRingLoop();
      setIncomingCall(null);
      try {
        const res = await apiClient.chat.respondCall(targetCallId, { action: 'DECLINE' });
        if (res?.systemMessage) {
          onSystemMsgRef.current?.(res.systemMessage);
        }
      } catch {
        // ignore
      }
    },
    [incomingCall?.callId]
  );

  const toggleMute = useCallback(async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getAudioTracks()) {
        track.enabled = !nextMuted;
      }
    }
    if (currentCallRef.current) {
      try {
        const res = await apiClient.chat.muteCall(currentCallRef.current.callId, {
          isMuted: nextMuted,
        });
        if (res?.success && res.call) {
          setCurrentCall(res.call);
        }
      } catch {
        // ignore
      }
    }
  }, [isMuted]);

  const toggleSpeakerMute = useCallback(() => {
    const nextSpeakerMuted = !isSpeakerMuted;
    setIsSpeakerMuted(nextSpeakerMuted);
    for (const audioEl of remoteAudioElementsRef.current.values()) {
      audioEl.muted = nextSpeakerMuted;
    }
  }, [isSpeakerMuted]);

  const endCurrentCall = useCallback(async () => {
    const active = currentCallRef.current;
    chatCallAudio.playEndedTone();
    cleanupMediaAndPeers();
    setCurrentCall(null);
    if (!active) return;
    try {
      const res = await apiClient.chat.endCall(active.callId);
      if (res?.systemMessage) {
        onSystemMsgRef.current?.(res.systemMessage);
      }
      void syncActiveCalls();
    } catch {
      // ignore
    }
  }, [cleanupMediaAndPeers, syncActiveCalls]);

  const getActiveCallForConversation = useCallback(
    (conversationId?: string | null): MosChatVoiceCallSession | null => {
      if (!conversationId) return null;
      return (
        activeCalls.find(
          (c) => c.conversationId === conversationId && (c.status === 'RINGING' || c.status === 'ACTIVE')
        ) || null
      );
    },
    [activeCalls]
  );

  return {
    activeCalls,
    currentCall,
    incomingCall,
    isMuted,
    isSpeakerMuted,
    durationSec,
    speakingStaffIds,
    audioWarning,
    isConnecting,
    startOrJoinVoiceCall,
    acceptIncomingCall,
    declineIncomingCall,
    toggleMute,
    toggleSpeakerMute,
    endCurrentCall,
    getActiveCallForConversation,
  };
}
