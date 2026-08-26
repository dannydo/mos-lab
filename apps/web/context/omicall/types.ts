declare global {
  interface Window {
    OMICallSDK: SafeAny;
    OMICallUI: SafeAny;
    AudioContext: SafeAny;
    webkitAudioContext: SafeAny;
    __mosLastOmiCallAudioDiagnostics?: SafeAny;
    __mosLastOmiCallMicrophoneReinforcement?: SafeAny;
    __mosOmiCallPeerConnections?: Set<RTCPeerConnection>;
    __mosOmiCallPeerConnectionTrackerInstalled?: boolean;
    __mosOmiCallMediaConstraintPatchInstalled?: boolean;
  }
}

export type CallState = 'idle' | 'confirming' | 'ringing' | 'incoming' | 'connected' | 'analyzing' | 'wrapup';

export interface CurrentCall {
  phone: string;
  name: string;
  direction: 'inbound' | 'outbound';
  callUuid?: string | null;
  sdkUid?: string | null;
  legacyUserId?: number | null;
  avatar?: string | null;
  planId?: number | null;
}

export interface OmiCallContextType {
  sdkLoaded: boolean;
  sdkError: boolean;
  isRegistered: boolean;
  isTabMuted: boolean;
  callState: CallState;
  callDuration: number;
  currentCall: CurrentCall | null;
  makeCall: (phone: string, name?: string, customerId?: number, avatar?: string, planId?: number) => Promise<void>;
  executeCall: () => Promise<void>;
  cancelConfirm: () => void;
  answerCall: () => void;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  isMuted: boolean;
  isHeld: boolean;
  sipConfig: SafeAny;
  setCallState: (state: CallState) => void;
  setCurrentCall: (call: CurrentCall | null) => void;
  isSimulated: boolean;
  setIsSimulated: (simulated: boolean) => void;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  selectedAudioInputId: string;
  selectedAudioOutputId: string;
  setSelectedAudioInputId: (deviceId: string) => void;
  setSelectedAudioOutputId: (deviceId: string) => void;
  refreshAudioDevices: () => Promise<void>;
  omicallReady: boolean;
  setOmicallReady: (ready: boolean) => void;
  /** Per-user browser preference for the idle floating OmiCall launcher. Active call controls are never hidden. */
  floatingLauncherVisible: boolean;
  setFloatingLauncherVisible: (visible: boolean) => void;
  lastRegisterEvent?: SafeAny;

  // Global CallLogModal features
  isCallLogModalOpen: boolean;
  callLogCustomerInfo: { legacyUserId: number; customerName: string; planId?: number | null } | null;
  openCallLogModal: (info: { legacyUserId: number; customerName: string; planId?: number | null }) => void;
  closeCallLogModal: () => void;

  // Share AI analysis wrapup polling properties
  resolvedLog: SafeAny;
  setResolvedLog: (log: SafeAny) => void;
  submittingWrapup: boolean;
  setSubmittingWrapup: (submitting: boolean) => void;
}
