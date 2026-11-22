import { OmiCallContextType } from './types';

export const FLOATING_LAUNCHER_VISIBILITY_KEY = 'mos_omicall_floating_launcher_visible';

export function getCurrentStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('mos_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getFloatingLauncherVisibilityKey() {
  if (typeof window === 'undefined') return FLOATING_LAUNCHER_VISIBILITY_KEY;

  try {
    const currentUser = getCurrentStoredUser();
    const identity = currentUser?.id ?? currentUser?.username;
    return identity ? `${FLOATING_LAUNCHER_VISIBILITY_KEY}:${identity}` : FLOATING_LAUNCHER_VISIBILITY_KEY;
  } catch {
    return FLOATING_LAUNCHER_VISIBILITY_KEY;
  }
}

export function readFloatingLauncherVisibility() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(getFloatingLauncherVisibilityKey()) !== 'false';
}

export function getAdminOmiCallEnabledKey(): string {
  if (typeof window === 'undefined') return 'mos_admin_omicall_enabled';
  try {
    const currentUser = getCurrentStoredUser();
    const identity = currentUser?.id ?? currentUser?.username;
    return identity ? `mos_admin_omicall_enabled:${identity}` : 'mos_admin_omicall_enabled';
  } catch {
    return 'mos_admin_omicall_enabled';
  }
}

export function readAdminOmiCallEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(getAdminOmiCallEnabledKey()) === 'true';
}

export const defaultOmiCallFallback: OmiCallContextType = {
  sdkLoaded: false,
  isSdkReady: false,
  sdkError: false,
  isRegistered: false,
  isTabMuted: false,
  callState: 'idle',
  callDuration: 0,
  currentCall: null,
  makeCall: async () => {},
  executeCall: async () => {},
  cancelConfirm: () => {},
  answerCall: () => {},
  rejectCall: () => {},
  hangUp: () => {},
  toggleMute: () => {},
  toggleHold: () => {},
  isMuted: false,
  isHeld: false,
  sipConfig: null,
  setCallState: () => {},
  setCurrentCall: () => {},
  isSimulated: false,
  setIsSimulated: () => {},
  audioInputDevices: [],
  audioOutputDevices: [],
  selectedAudioInputId: '',
  selectedAudioOutputId: '',
  setSelectedAudioInputId: () => {},
  setSelectedAudioOutputId: () => {},
  refreshAudioDevices: async () => {},
  omicallReady: false,
  setOmicallReady: () => {},
  floatingLauncherVisible: false,
  setFloatingLauncherVisible: () => {},
  isCallLogModalOpen: false,
  callLogCustomerInfo: null,
  openCallLogModal: () => {},
  closeCallLogModal: () => {},
  canAccessOmiCall: false,
  isGrowthMember: false,
  isAdmin: false,
  adminOmiCallEnabled: false,
  setAdminOmiCallEnabled: () => {},
  resolvedLog: null,
  setResolvedLog: () => {},
  submittingWrapup: false,
  setSubmittingWrapup: () => {},
};
