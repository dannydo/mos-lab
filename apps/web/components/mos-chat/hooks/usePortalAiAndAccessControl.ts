'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import {
  isCanonicalSuperAdminIdentity,
  type MosChatAccessConfig,
  type MosChatMessage,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { playNeuralSpeech, setNeuralSpeechSpeed, stopSpeaking } from '../../voice-assistant/speech-utils';
import { copyMosChatSessionPermalink } from '../components/MosChatAiSessionsModal';
import {
  AI_COPILOT_CONV_ID,
  AI_COPILOT_GROUP_ACCESS_KEY,
  SPACE_DEPARTMENT_AND_TEAM_GROUPS,
  type SpaceDepartmentOrTeamGroup,
} from '../constants/chat-constants';
import { useChatAiCopilotState } from '../shared/hooks/useChatAiCopilotState';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { formatBackendAiMessage, matchesStaffGroup } from '../utils/chat-helpers';
import { syncConversationIntoUrl } from '../utils/mos-chat-permalink';

export interface UsePortalAiAndAccessControlParams {
  currentUser?: SafeAny;
  staffDirectory: MosChatStaffMember[];
  standalone: boolean;
  isMobile: boolean;
  activeConvId: string;
  setActiveConvId: (id: string) => void;
  setActiveSubtab: (tab: MosChatActiveSubtab) => void;
  setMobileActiveView: (view: 'inbox' | 'conversation' | 'thread') => void;
  targetNavigationAiSessionId?: string | null;
  targetNavigationTimestamp?: number | null;
  onAccessChange?: (canAccess: boolean) => void;
  scrollToChatBottom: (target?: 'main' | 'thread' | { dockConvId: string }, behavior?: ScrollBehavior) => void;
  antdMessage: MessageInstance;
}

export function usePortalAiAndAccessControl({
  currentUser,
  staffDirectory,
  standalone,
  isMobile,
  activeConvId,
  setActiveConvId,
  setActiveSubtab,
  setMobileActiveView,
  targetNavigationAiSessionId,
  targetNavigationTimestamp,
  onAccessChange,
  scrollToChatBottom,
  antdMessage,
}: UsePortalAiAndAccessControlParams) {
  const isDannyAccount = useMemo(() => {
    const isCanon = isCanonicalSuperAdminIdentity({ username: currentUser?.username, email: currentUser?.email });
    const roleLower = String(currentUser?.role || '')
      .toLowerCase()
      .trim();
    return isCanon || roleLower === 'super_admin' || roleLower === 'admin';
  }, [currentUser?.username, currentUser?.email, currentUser?.role]);

  // Chỉ duy nhất Super Admin Danny mới thấy và sử dụng nút gửi task vào mOS Mission (Điều răn UI-009)
  const isStrictDannySuperAdmin = useMemo(() => {
    const isCanon = isCanonicalSuperAdminIdentity({ username: currentUser?.username, email: currentUser?.email });
    const roleLower = String(currentUser?.role || '')
      .toLowerCase()
      .trim();
    return (roleLower === 'super_admin' && isCanon) || isCanon || Number(currentUser?.id) === 1;
  }, [currentUser?.id, currentUser?.username, currentUser?.email, currentUser?.role]);

  const [accessConfig, setAccessConfig] = useState<MosChatAccessConfig>({
    allowAllStaff: true,
    allowedGroupKeys: [
      'TEAM_ADMIN_MANAGER',
      'TEAM_CC',
      'TEAM_TELESALES',
      'TEAM_ACADEMY',
      'TEAM_CV',
      'TEAM_CS_CONTROL',
      'TEAM_QA_QC',
      'TEAM_INTERNAL',
    ],
    allowedStaffIds: [73],
    aiCopilotAllowedGroupKeys: ['TEAM_ADMIN_MANAGER'],
    aiCopilotAllowedStaffIds: [],
  });
  const [serverCanAccessChat, setServerCanAccessChat] = useState<boolean | null>(null);
  const [accessConfigModalOpen, setAccessConfigModalOpen] = useState<boolean>(false);
  const [accessConfigTab, setAccessConfigTab] = useState<'chat' | 'ai'>('chat');
  const [accessStaffSearch, setAccessStaffSearch] = useState<string>('');
  const [accessGroupFilter, setAccessGroupFilter] = useState<string>('ALL');
  const [savingAccessConfig, setSavingAccessConfig] = useState<boolean>(false);

  const [allowedAiGroups, setAllowedAiGroups] = useState<string[]>([]);
  const [aiSessionsModalOpen, setAiSessionsModalOpen] = useState<boolean>(false);
  const [aiAuditPrompt, setAiAuditPrompt] = useState<{ sessionId: string } | null>(null);
  const [aiAuditLoading, setAiAuditLoading] = useState<boolean>(false);
  const lastProcessedAiSessionNavRef = useRef<string | null>(null);

  const [aiThinkingActive, setAiThinkingActive] = useState<boolean>(false);
  const [aiElapsedSec, setAiElapsedSec] = useState<number>(0);
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Record<string, boolean>>({});
  const [appliedActionIds, setAppliedActionIds] = useState<Record<string, boolean>>({});
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [ttsSpeed, setTtsSpeed] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0;
    try {
      const saved = localStorage.getItem('mos_chat_tts_speed');
      const val = saved ? parseFloat(saved) : 1.0;
      return [0.8, 1.0, 1.25, 1.5, 1.75, 2.0].includes(val) ? val : 1.0;
    } catch {
      return 1.0;
    }
  });

  const handleSetTtsSpeed = useCallback((speed: number) => {
    setTtsSpeed(speed);
    try {
      localStorage.setItem('mos_chat_tts_speed', String(speed));
    } catch {
      // ignore storage error
    }
    setNeuralSpeechSpeed(speed);
  }, []);

  // MOS-BUG-135: MAI Spoken Urgent Announcements (iPhone Siri-style)
  const [maiVoiceAnnounceEnabled, setMaiVoiceAnnounceEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('mos_chat_mai_voice_announce_v1');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleMaiVoiceAnnounce = useCallback((enabled: boolean) => {
    setMaiVoiceAnnounceEnabled(enabled);
    try {
      localStorage.setItem('mos_chat_mai_voice_announce_v1', String(enabled));
    } catch {
      // ignore storage error
    }
  }, []);

  const [isUrgentSend, setIsUrgentSend] = useState<boolean>(false);

  const currentUserStaffMember = useMemo<MosChatStaffMember>(() => {
    const myId = Number(currentUser?.id);
    const uname = String(currentUser?.username || '')
      .toLowerCase()
      .trim();
    const found = staffDirectory.find(
      (s) =>
        (Number.isFinite(myId) && myId > 0 && s.id === myId) ||
        (uname &&
          String(s.username || '')
            .toLowerCase()
            .trim() === uname)
    );
    if (found) return found;
    return {
      id: Number.isFinite(myId) ? myId : 0,
      username: currentUser?.username || '',
      displayName: currentUser?.displayName || currentUser?.username || '',
      role: currentUser?.role || '',
      departmentCodes: [],
      teamCodes: [],
    };
  }, [currentUser?.id, currentUser?.username, currentUser?.displayName, currentUser?.role, staffDirectory]);

  const canManageChatThreads = useMemo(() => {
    if (isDannyAccount) return true;
    const roleLower = String(currentUser?.role || currentUserStaffMember?.role || '')
      .toLowerCase()
      .trim();
    return (
      roleLower === 'manager' ||
      roleLower === 'oc' ||
      roleLower === 'admin' ||
      roleLower === 'super_admin' ||
      matchesStaffGroup(currentUserStaffMember, 'TEAM_ADMIN_MANAGER')
    );
  }, [isDannyAccount, currentUser?.role, currentUserStaffMember]);

  const isStaffMemberAllowedInChat = useCallback(
    (
      member: MosChatStaffMember,
      cfg: MosChatAccessConfig = accessConfig
    ): {
      allowed: boolean;
      reason: 'admin' | 'all' | 'individual' | 'group' | 'none';
      matchedGroups: SpaceDepartmentOrTeamGroup[];
    } => {
      const roleLower = String(member.role || '')
        .toLowerCase()
        .trim();
      const unameLower = String(member.username || '')
        .toLowerCase()
        .trim();
      if (unameLower === 'danny' || roleLower === 'super_admin' || roleLower === 'admin') {
        return { allowed: true, reason: 'admin', matchedGroups: [] };
      }
      if (cfg.allowAllStaff) {
        return { allowed: true, reason: 'all', matchedGroups: [] };
      }
      const isIndividual = member.id > 0 && (cfg.allowedStaffIds || []).includes(member.id);
      const matchedGroups = SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter(
        (g) => (cfg.allowedGroupKeys || []).includes(g.key) && matchesStaffGroup(member, g.key)
      );
      if (isIndividual) {
        return { allowed: true, reason: 'individual', matchedGroups };
      }
      if (matchedGroups.length > 0) {
        return { allowed: true, reason: 'group', matchedGroups };
      }
      return { allowed: false, reason: 'none', matchedGroups: [] };
    },
    [accessConfig]
  );

  const isStaffMemberAllowedInAi = useCallback(
    (
      member: MosChatStaffMember,
      _cfg: MosChatAccessConfig = accessConfig
    ): {
      allowed: boolean;
      reason: 'admin' | 'individual' | 'group' | 'none';
      matchedGroups: SpaceDepartmentOrTeamGroup[];
    } => {
      const roleLower = String(member.role || '')
        .toLowerCase()
        .trim();
      const unameLower = String(member.username || '')
        .toLowerCase()
        .trim();
      if (unameLower === 'danny' || roleLower === 'super_admin' || roleLower === 'admin') {
        return { allowed: true, reason: 'admin', matchedGroups: [] };
      }
      return { allowed: false, reason: 'none', matchedGroups: [] };
    },
    [accessConfig]
  );

  const canUserAccessChat = useMemo(() => {
    if (isDannyAccount) return true;
    if (accessConfig.allowAllStaff) return true;
    if (serverCanAccessChat !== null) return serverCanAccessChat;
    return isStaffMemberAllowedInChat(currentUserStaffMember, accessConfig).allowed;
  }, [
    isDannyAccount,
    accessConfig.allowAllStaff,
    serverCanAccessChat,
    isStaffMemberAllowedInChat,
    currentUserStaffMember,
    accessConfig,
  ]);

  useEffect(() => {
    onAccessChange?.(canUserAccessChat);
  }, [canUserAccessChat, onAccessChange]);

  const canUseAiCopilot = useMemo(() => {
    if (isDannyAccount) return true;
    const roleLower = String(currentUser?.role || currentUserStaffMember?.role || '')
      .toLowerCase()
      .trim();
    const unameLower = String(currentUser?.username || currentUserStaffMember?.username || '')
      .toLowerCase()
      .trim();
    return unameLower === 'danny' || roleLower === 'super_admin' || roleLower === 'admin';
  }, [
    isDannyAccount,
    currentUser?.role,
    currentUser?.username,
    currentUserStaffMember?.role,
    currentUserStaffMember?.username,
  ]);

  const {
    aiPersonalStorageKey,
    aiSessionId,
    setAiSessionId,
    aiSessionIdRef,
    aiSessionOwnerId,
    setAiSessionOwnerId,
    aiSessionAccess,
    setAiSessionAccess,
    isAiSessionReadOnly,
    aiSessionReadOnlyRef,
    aiPermalinkPendingRef,
    aiHydratedRef,
    aiMessages,
    setAiMessages,
    buildInitialAiWelcomeMessage,
    syncAiChatSession,
    aiCopilotConversation,
  } = useChatAiCopilotState({
    currentUser,
    activeConvId,
    canUseAiCopilot,
    defaultUserDisplayName: 'Anh Danny',
    initialPendingPermalinkSessionId: targetNavigationAiSessionId ?? null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawGroups = window.localStorage.getItem(AI_COPILOT_GROUP_ACCESS_KEY);
      if (rawGroups) {
        const parsedGroups = JSON.parse(rawGroups);
        if (Array.isArray(parsedGroups)) {
          setAllowedAiGroups(parsedGroups.filter((g): g is string => typeof g === 'string'));
        }
      }
    } catch {
      // ignore
    }
  }, [aiPersonalStorageKey]);

  // 1-second timer while AI is thinking
  useEffect(() => {
    if (!aiThinkingActive) {
      setAiElapsedSec(0);
      return;
    }
    const interval = setInterval(() => {
      setAiElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [aiThinkingActive]);

  const replaceBrowserUrl = useCallback(
    (nextUrl: string | null) => {
      if (!standalone || !nextUrl || typeof window === 'undefined') return;
      try {
        window.history.replaceState(null, '', nextUrl);
      } catch {
        // ignore
      }
    },
    [standalone]
  );

  const handleClearAiChat = useCallback(() => {
    aiPermalinkPendingRef.current = null;
    setAiSessionId(null);
    setAiSessionOwnerId(null);
    setAiSessionAccess(null);
    setAiMessages([buildInitialAiWelcomeMessage()]);
    if (typeof window !== 'undefined') {
      replaceBrowserUrl(syncConversationIntoUrl(window.location.href, AI_COPILOT_CONV_ID, null));
    }
    antdMessage.success('Đã làm mới phiên hội thoại riêng tư với MAI');
  }, [
    aiPermalinkPendingRef,
    antdMessage,
    buildInitialAiWelcomeMessage,
    replaceBrowserUrl,
    setAiMessages,
    setAiSessionAccess,
    setAiSessionId,
    setAiSessionOwnerId,
  ]);

  /** Permalink / history: load one AI Copilot session by id and show it in the MAI conversation. */
  const openAiSessionById = useCallback(
    async (sessionId: string, options?: { auditReason?: string }): Promise<boolean> => {
      try {
        const res = await apiClient.ai.getSession(sessionId, options);
        const mapped: MosChatMessage[] = (res?.messages || []).map((bm) => formatBackendAiMessage(bm, currentUser));
        setAiMessages([buildInitialAiWelcomeMessage(), ...mapped]);
        setAiSessionId(res.session.id);
        setAiSessionOwnerId(Number(res.session.staffId) || null);
        setAiSessionAccess(res.access || null);
        setActiveConvId(AI_COPILOT_CONV_ID);
        setActiveSubtab('chat');
        if (isMobile) setMobileActiveView('conversation');
        if (typeof window !== 'undefined') {
          replaceBrowserUrl(syncConversationIntoUrl(window.location.href, AI_COPILOT_CONV_ID, res.session.id));
        }
        scrollToChatBottom('main', 'auto');
        return true;
      } catch (err: SafeAny) {
        const status = err?.response?.status;
        if (status === 403) {
          if (err?.response?.data?.auditAvailable) {
            // Admin / Super Admin may still review it, but only with a written reason (logged, read-only).
            setAiAuditPrompt({ sessionId });
          } else {
            antdMessage.warning(
              'Phiên hội thoại này là riêng tư. Chỉ chủ phiên hoặc người được chủ phiên chia sẻ mới xem được.'
            );
          }
        } else if (status === 404) {
          antdMessage.warning('Không tìm thấy phiên hội thoại. Liên kết có thể đã bị xóa hoặc không đúng.');
        } else {
          antdMessage.error('Không tải được phiên hội thoại. Vui lòng thử lại.');
        }
        return false;
      }
    },
    [
      antdMessage,
      buildInitialAiWelcomeMessage,
      currentUser,
      isMobile,
      replaceBrowserUrl,
      scrollToChatBottom,
      setActiveConvId,
      setActiveSubtab,
      setAiMessages,
      setAiSessionAccess,
      setAiSessionId,
      setAiSessionOwnerId,
      setMobileActiveView,
    ]
  );

  const handleConfirmAiAudit = useCallback(
    async (reason: string) => {
      if (!aiAuditPrompt) return;
      setAiAuditLoading(true);
      const ok = await openAiSessionById(aiAuditPrompt.sessionId, { auditReason: reason });
      setAiAuditLoading(false);
      if (ok) setAiAuditPrompt(null);
    },
    [aiAuditPrompt, openAiSessionById]
  );

  const handleCopyAiSessionPermalink = useCallback(() => {
    if (!aiSessionId) {
      antdMessage.info('Phiên này chưa có nội dung. Hãy nhắn cho MAI trước để tạo liên kết cố định.');
      return;
    }
    void copyMosChatSessionPermalink(aiSessionId);
    if (!aiSessionReadOnlyRef.current && !aiSessionAccess?.sharingEnabled) {
      antdMessage.info(
        'Phiên đang riêng tư: chỉ bạn mở được liên kết này. Bật "Chia sẻ phiên" nếu muốn người khác xem.'
      );
    }
  }, [aiSessionAccess?.sharingEnabled, aiSessionId, aiSessionReadOnlyRef, antdMessage]);

  const handleToggleAiSessionSharing = useCallback(async () => {
    if (!aiSessionId || aiSessionReadOnlyRef.current) return;
    const next = !aiSessionAccess?.sharingEnabled;
    try {
      const res = await apiClient.ai.setSessionSharing(aiSessionId, next);
      setAiSessionAccess((prev) => ({
        ...(prev || { mode: 'owner' as const, readOnly: false }),
        sharingEnabled: res.sharingEnabled,
      }));
      if (res.sharingEnabled) {
        antdMessage.success('Đã chia sẻ phiên: người đã đăng nhập mOS có liên kết sẽ xem được (chỉ xem).');
        void copyMosChatSessionPermalink(aiSessionId);
      } else {
        antdMessage.success('Đã dừng chia sẻ: chỉ bạn mở được liên kết của phiên này.');
      }
    } catch {
      antdMessage.error('Không đổi được trạng thái chia sẻ. Vui lòng thử lại.');
    }
  }, [aiSessionAccess?.sharingEnabled, aiSessionId, aiSessionReadOnlyRef, antdMessage, setAiSessionAccess]);

  const handleExecuteAiAction = useCallback(
    (action: { type: string; label: string; payload: Record<string, unknown> }, msgId: string, actionKey?: string) => {
      if (typeof window !== 'undefined' && action.payload) {
        window.dispatchEvent(new CustomEvent('mos-ai-copilot-apply-customer-filter', { detail: action.payload }));
      }
      setAppliedActionIds((prev) => ({
        ...prev,
        [msgId]: true,
        ...(actionKey ? { [actionKey]: true } : {}),
      }));
      antdMessage.success(`Đã kích hoạt: ${action.label}`);
    },
    [antdMessage]
  );

  const handleSpeakAiMessage = useCallback(
    (msg: MosChatMessage) => {
      if (speakingMsgId === msg.id) {
        stopSpeaking();
        setSpeakingMsgId(null);
        return;
      }
      stopSpeaking();
      setSpeakingMsgId(msg.id);
      void playNeuralSpeech(msg.text || '', {
        voice: 'vi-VN-HoaiMyNeural',
        speed: ttsSpeed,
        onStart: () => {
          setSpeakingMsgId(msg.id);
        },
        onEnd: () => {
          setSpeakingMsgId((prev) => (prev === msg.id ? null : prev));
        },
        onError: () => {
          setSpeakingMsgId((prev) => (prev === msg.id ? null : prev));
        },
      });
    },
    [speakingMsgId, ttsSpeed]
  );

  // Permalink: open the exact AI Copilot session requested by the link (needs the signed-in user to be known).
  useEffect(() => {
    const sessionId = targetNavigationAiSessionId;
    if (!sessionId || !currentUser?.id) return;
    const navKey = `${sessionId}:${targetNavigationTimestamp || 0}`;
    if (lastProcessedAiSessionNavRef.current === navKey) return;
    lastProcessedAiSessionNavRef.current = navKey;
    // The address bar echoing the session we are already showing (first message created it) needs no reload.
    if (aiSessionIdRef.current === sessionId) return;
    aiPermalinkPendingRef.current = sessionId;
    void openAiSessionById(sessionId).finally(() => {
      aiPermalinkPendingRef.current = null;
    });
  }, [
    targetNavigationAiSessionId,
    targetNavigationTimestamp,
    currentUser?.id,
    openAiSessionById,
    aiSessionIdRef,
    aiPermalinkPendingRef,
  ]);

  // Permalink: once a session exists (first message creates it) mirror it into the address bar.
  useEffect(() => {
    if (!standalone || typeof window === 'undefined') return;
    if (aiPermalinkPendingRef.current) return;
    if (activeConvId !== AI_COPILOT_CONV_ID || !aiSessionId) return;
    try {
      const nextUrl = syncConversationIntoUrl(window.location.href, AI_COPILOT_CONV_ID, aiSessionId);
      if (nextUrl) window.history.replaceState(null, '', nextUrl);
    } catch {
      // ignore
    }
  }, [standalone, activeConvId, aiSessionId, aiPermalinkPendingRef]);

  return {
    isDannyAccount,
    isStrictDannySuperAdmin,
    accessConfig,
    setAccessConfig,
    serverCanAccessChat,
    setServerCanAccessChat,
    accessConfigModalOpen,
    setAccessConfigModalOpen,
    accessConfigTab,
    setAccessConfigTab,
    accessStaffSearch,
    setAccessStaffSearch,
    accessGroupFilter,
    setAccessGroupFilter,
    savingAccessConfig,
    setSavingAccessConfig,
    allowedAiGroups,
    setAllowedAiGroups,
    aiPersonalStorageKey,
    aiSessionId,
    setAiSessionId,
    aiSessionIdRef,
    aiSessionOwnerId,
    setAiSessionOwnerId,
    aiSessionAccess,
    setAiSessionAccess,
    aiSessionsModalOpen,
    setAiSessionsModalOpen,
    aiAuditPrompt,
    setAiAuditPrompt,
    aiAuditLoading,
    isAiSessionReadOnly,
    aiSessionReadOnlyRef,
    aiPermalinkPendingRef,
    aiHydratedRef,
    aiMessages,
    setAiMessages,
    aiThinkingActive,
    setAiThinkingActive,
    aiElapsedSec,
    expandedThinkingIds,
    setExpandedThinkingIds,
    appliedActionIds,
    setAppliedActionIds,
    speakingMsgId,
    setSpeakingMsgId,
    ttsSpeed,
    handleSetTtsSpeed,
    maiVoiceAnnounceEnabled,
    handleToggleMaiVoiceAnnounce,
    isUrgentSend,
    setIsUrgentSend,
    currentUserStaffMember,
    canManageChatThreads,
    isStaffMemberAllowedInChat,
    isStaffMemberAllowedInAi,
    canUserAccessChat,
    canUseAiCopilot,
    buildInitialAiWelcomeMessage,
    syncAiChatSession,
    aiCopilotConversation,
    replaceBrowserUrl,
    handleClearAiChat,
    openAiSessionById,
    handleConfirmAiAudit,
    handleCopyAiSessionPermalink,
    handleToggleAiSessionSharing,
    handleExecuteAiAction,
    handleSpeakAiMessage,
  };
}
