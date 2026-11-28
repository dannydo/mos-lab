'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { GlobalToken } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type {
  MosChatConversation,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  SafeAny,
} from '@mos-lab/shared';
import { FALLBACK_CONVERSATIONS, FALLBACK_TASKS, getInitialStaffDirectory } from '../constants/chat-constants';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { computeUniqueTasks } from '../utils/portal-task-selectors';
import { cleanQuotedText } from '../utils/quoteUtils';
import { usePortalAiAndAccessControl } from './usePortalAiAndAccessControl';
import { usePortalAttachmentsAndPaste } from './usePortalAttachmentsAndPaste';
import { usePortalAvatarAndPresence } from './usePortalAvatarAndPresence';
import { usePortalBootstrapAndRealtime } from './usePortalBootstrapAndRealtime';
import { usePortalComposerRefs } from './usePortalComposerRefs';
import { usePortalDockState } from './usePortalDockState';
import { usePortalKeyboardAndAutofocus } from './usePortalKeyboardAndAutofocus';
import { usePortalLayoutAndResize } from './usePortalLayoutAndResize';
import { usePortalMentionAutocomplete } from './usePortalMentionAutocomplete';
import { usePortalMessageMutations } from './usePortalMessageMutations';
import { usePortalMessageSending } from './usePortalMessageSending';
import { usePortalMissionActions } from './usePortalMissionActions';
import { usePortalNavigationAndShortcuts } from './usePortalNavigationAndShortcuts';
import { usePortalReadSync } from './usePortalReadSync';
import { usePortalSidebarActions } from './usePortalSidebarActions';
import { usePortalSidebarPrefs } from './usePortalSidebarPrefs';
import { usePortalSpacesAndDockActions } from './usePortalSpacesAndDockActions';
import { usePortalTaskActions } from './usePortalTaskActions';
import { usePortalTaskModals } from './usePortalTaskModals';
import { usePortalUiAdapters } from './usePortalUiAdapters';

export interface UsePortalStateWiringParams {
  open: boolean;
  standalone: boolean;
  onOpen?: () => void;
  onClose: () => void;
  onToggle: () => void;
  currentUser?: SafeAny;
  onAccessChange?: (canAccess: boolean) => void;
  onUnreadCountChange?: (unreadCount: number, activeTaskCount: number) => void;
  targetNavigation?: {
    conversationId?: string;
    messageId?: string;
    timestamp?: number;
    openTab?: MosChatActiveSubtab;
    taskId?: string;
    aiSessionId?: string;
  } | null;
  isDark: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  accentContrast: string;
  antdMessage: MessageInstance;
  notification: NotificationInstance;
}

export function usePortalStateWiring({
  open,
  standalone,
  onOpen,
  onClose,
  onToggle,
  currentUser,
  onAccessChange,
  onUnreadCountChange,
  targetNavigation,
  isDark,
  token,
  surfaceBg,
  surfaceRaised,
  borderColor,
  borderStrong,
  accentColor,
  accentContrast,
  antdMessage,
  notification,
}: UsePortalStateWiringParams) {
  const [conversations, setConversations] = useState<MosChatConversation[]>(FALLBACK_CONVERSATIONS);
  const [tasks, setTasks] = useState<MosChatTaskItem[]>(FALLBACK_TASKS);
  const [expandedChecklistTaskIds, setExpandedChecklistTaskIds] = useState<Record<string, boolean>>({});
  const [staffDirectory, setStaffDirectory] = useState<MosChatStaffMember[]>(getInitialStaffDirectory);
  const [workflowTemplates, setWorkflowTemplates] = useState<MosChatWorkflowTemplate[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<MosChatWorkflowInstance[]>([]);
  const [triggerWorkflowModalOpen, setTriggerWorkflowModalOpen] = useState<boolean>(false);
  const [initialWorkflowCode, setInitialWorkflowCode] = useState<string>('WF_CASH_ADVANCE');
  const [saveThreadWorkflowModalOpen, setSaveThreadWorkflowModalOpen] = useState<boolean>(false);

  const navigateToMessageRef = useRef<(convId: string, msgId?: string) => void>(() => {});
  const pendingNavRef = useRef<{ convId: string; msgId?: string } | null>(null);
  const retriedMissingMsgRef = useRef<Set<string>>(new Set());
  const lastVersionRef = useRef<number>(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const notifyLivePeers = useCallback(() => {
    try {
      broadcastChannelRef.current?.postMessage({ type: 'MOS_CHAT_SYNC', ts: Date.now() });
    } catch {
      // ignore
    }
  }, []);

  const uniqueTasks = useMemo<MosChatTaskItem[]>(() => computeUniqueTasks(tasks), [tasks]);

  // ── Layer 1 ──
  const layout = usePortalLayoutAndResize({ open, onOpen, onToggle, currentUser });
  const dock = usePortalDockState();
  const composerRefs = usePortalComposerRefs({
    activeConvId: layout.activeConvId,
    dockMessagesContainerRefs: dock.dockMessagesContainerRefs,
  });

  const aiAccess = usePortalAiAndAccessControl({
    currentUser,
    staffDirectory,
    standalone,
    isMobile: layout.isMobile,
    activeConvId: layout.activeConvId,
    setActiveConvId: layout.setActiveConvId,
    setActiveSubtab: layout.setActiveSubtab,
    setMobileActiveView: layout.setMobileActiveView,
    targetNavigationAiSessionId: targetNavigation?.aiSessionId,
    targetNavigationTimestamp: targetNavigation?.timestamp,
    onAccessChange,
    scrollToChatBottom: composerRefs.scrollToChatBottom,
    antdMessage,
  });

  const avatarPresence = usePortalAvatarAndPresence({
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    staffDirectory,
    presence: layout.presence,
    surfaceBg,
  });

  // ── Layer 2 ──
  const sidebarPrefs = usePortalSidebarPrefs({
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    conversations,
    aiCopilotConversation: aiAccess.aiCopilotConversation,
    canUseAiCopilot: aiAccess.canUseAiCopilot,
    isStrictDannySuperAdmin: aiAccess.isStrictDannySuperAdmin,
    open,
    activeConvId: layout.activeConvId,
    activeSubtab: layout.activeSubtab,
    sidebarFilter: layout.sidebarFilter,
    searchQuery: layout.searchQuery,
    dockedConvIds: dock.dockedConvIds,
    collapsedDockIds: dock.collapsedDockIds,
    setAccessConfig: aiAccess.setAccessConfig,
    setSavingAccessConfig: aiAccess.setSavingAccessConfig,
    notifyLivePeers,
    antdMessage,
  });

  const sidebarActions = usePortalSidebarActions({
    allUserConversations: sidebarPrefs.allUserConversations,
    userPrefs: sidebarPrefs.userPrefs,
    updateUserSidebarPrefs: sidebarPrefs.updateUserSidebarPrefs,
    getEffectiveUnreadCount: sidebarPrefs.getEffectiveUnreadCount,
    setConversations,
    setEditingSectionId: sidebarPrefs.setEditingSectionId,
    setEditingSectionName: sidebarPrefs.setEditingSectionName,
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    notifyLivePeers,
    antdMessage,
  });

  const attachments = usePortalAttachmentsAndPaste({
    open,
    dockAttachments: dock.dockAttachments,
    setDockAttachments: dock.setDockAttachments,
    antdMessage,
  });

  const realtime = usePortalBootstrapAndRealtime({
    open,
    openRef: layout.openRef,
    activeConvIdRef: layout.activeConvIdRef,
    activeSubtab: layout.activeSubtab,
    setActiveConvId: layout.setActiveConvId,
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    isStrictDannySuperAdmin: aiAccess.isStrictDannySuperAdmin,
    presence: layout.presence,
    maiVoiceAnnounceEnabled: aiAccess.maiVoiceAnnounceEnabled,
    ttsSpeed: aiAccess.ttsSpeed,
    setConversations,
    setTasks,
    staffDirectory,
    setStaffDirectory,
    setWorkflowTemplates,
    setWorkflowInstances,
    setAccessConfig: aiAccess.setAccessConfig,
    setServerCanAccessChat: aiAccess.setServerCanAccessChat,
    userSidebarPrefsStorageKey: sidebarPrefs.userSidebarPrefsStorageKey,
    userPrefs: sidebarPrefs.userPrefs,
    setUserPrefs: sidebarPrefs.setUserPrefs,
    lastLocalPrefsMutationAtRef: sidebarPrefs.lastLocalPrefsMutationAtRef,
    hasHydratedPrefsFromServerRef: sidebarPrefs.hasHydratedPrefsFromServerRef,
    dockedConvIds: dock.dockedConvIds,
    broadcastChannelRef,
    navigateToMessageRef,
    pendingNavRef,
    lastVersionRef,
    ensurePortalOpen: layout.ensurePortalOpen,
    setInitialWorkflowCode,
    setTriggerWorkflowModalOpen,
    updateComposerText: composerRefs.updateComposerText,
    notification,
    surfaceRaised,
    accentColor,
    accentContrast,
    borderColor,
    token,
  });

  const readSync = usePortalReadSync({
    open,
    standalone,
    isMobile: layout.isMobile,
    activeSubtab: layout.activeSubtab,
    setActiveConvId: layout.setActiveConvId,
    setActiveSubtab: layout.setActiveSubtab,
    setMobileActiveView: layout.setMobileActiveView,
    ensurePortalOpen: layout.ensurePortalOpen,
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    aiSessionId: aiAccess.aiSessionId,
    conversations,
    setConversations,
    visibleConversations: sidebarPrefs.visibleConversations,
    allUserConversations: sidebarPrefs.allUserConversations,
    activeConversation: sidebarPrefs.activeConversation,
    uniqueTasks,
    userPrefs: sidebarPrefs.userPrefs,
    updateUserPrefsLocalOnly: sidebarPrefs.updateUserPrefsLocalOnly,
    updateUserSidebarPrefs: sidebarPrefs.updateUserSidebarPrefs,
    getEffectiveUnreadCount: sidebarPrefs.getEffectiveUnreadCount,
    dockedConvIds: dock.dockedConvIds,
    collapsedDockIds: dock.collapsedDockIds,
    notifyLivePeers,
    navigateToMessageRef,
    scrollToChatBottom: composerRefs.scrollToChatBottom,
    onUnreadCountChange,
  });

  // ── Layer 3 ──
  const navActions = usePortalNavigationAndShortcuts({
    standalone,
    isMobile: layout.isMobile,
    isTabVisible: readSync.isTabVisible,
    setActiveConvId: layout.setActiveConvId,
    setActiveSubtab: layout.setActiveSubtab,
    setMobileActiveView: layout.setMobileActiveView,
    setSidebarFilter: layout.setSidebarFilter,
    setSearchQuery: layout.setSearchQuery,
    setThreadOpen: composerRefs.setThreadOpen,
    setActiveThreadMsgId: composerRefs.setActiveThreadMsgId,
    maximizedRef: layout.maximizedRef,
    panelWidthRef: layout.panelWidthRef,
    sidebarWidthRef: layout.sidebarWidthRef,
    threadWidthRef: layout.threadWidthRef,
    setPanelWidth: layout.setPanelWidth,
    persistPersonalLayout: layout.persistPersonalLayout,
    threadInputRef: composerRefs.threadInputRef,
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    conversations,
    setConversations,
    aiCopilotConversation: aiAccess.aiCopilotConversation,
    activeConversation: sidebarPrefs.activeConversation,
    userPrefs: sidebarPrefs.userPrefs,
    setUserPrefs: sidebarPrefs.setUserPrefs,
    updateUserPrefsLocalOnly: sidebarPrefs.updateUserPrefsLocalOnly,
    updateUserSidebarPrefs: sidebarPrefs.updateUserSidebarPrefs,
    markConversationReadOptimisticAndSync: readSync.markConversationReadOptimisticAndSync,
    fetchBootstrap: realtime.fetchBootstrap,
    notifyLivePeers,
    scrollToChatBottom: composerRefs.scrollToChatBottom,
    navigateToMessageRef,
    pendingNavRef,
    retriedMissingMsgRef,
    lastVersionRef,
    targetNavigation,
    antdMessage,
  });

  const msgMutations = usePortalMessageMutations({
    currentUser,
    isMobile: layout.isMobile,
    activeConversation: sidebarPrefs.activeConversation,
    setConversations,
    setAiMessages: aiAccess.setAiMessages,
    uniqueTasks,
    setTasks,
    notifiedBuzzIdsRef: realtime.notifiedBuzzIdsRef,
    lastVersionRef,
    lastTapRef: layout.lastTapRef,
    setHeartFlyMsgId: layout.setHeartFlyMsgId,
    setMobileActiveMsgId: layout.setMobileActiveMsgId,
    setMobileActiveView: layout.setMobileActiveView,
    setHighlightedMsgId: navActions.setHighlightedMsgId,
    setActiveThreadMsgId: composerRefs.setActiveThreadMsgId,
    setThreadOpen: composerRefs.setThreadOpen,
    isMessageFromCurrentUser: avatarPresence.isMessageFromCurrentUser,
    handleOpenThread: navActions.handleOpenThread,
    onRecordEmojiUsed: sidebarPrefs.recordEmojiUsed,
    notifyLivePeers,
    antdMessage,
  });

  const mentions = usePortalMentionAutocomplete({
    isDark,
    token,
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    canUseAiCopilot: aiAccess.canUseAiCopilot,
    conversations,
    activeConversation: sidebarPrefs.activeConversation,
    staffDirectory,
    composerInputRef: composerRefs.composerInputRef,
    threadInputRef: composerRefs.threadInputRef,
    composerTextRef: composerRefs.composerTextRef,
    threadTextRef: composerRefs.threadTextRef,
    composerCursorPosRef: composerRefs.composerCursorPosRef,
    threadCursorPosRef: composerRefs.threadCursorPosRef,
    setComposerCursorPos: composerRefs.setComposerCursorPos,
    setThreadCursorPos: composerRefs.setThreadCursorPos,
    updateComposerText: composerRefs.updateComposerText,
    updateThreadInput: composerRefs.updateThreadInput,
    isComposingRef: composerRefs.isComposingRef,
    lastCompositionEndMsRef: composerRefs.lastCompositionEndMsRef,
    getAvatarInitials: avatarPresence.getAvatarInitials,
  });

  const spacesDock = usePortalSpacesAndDockActions({
    open,
    isMobile: layout.isMobile,
    isTabVisible: readSync.isTabVisible,
    onClose,
    activeConvId: layout.activeConvId,
    setActiveConvId: layout.setActiveConvId,
    activeSubtab: layout.activeSubtab,
    setActiveSubtab: layout.setActiveSubtab,
    setMobileActiveView: layout.setMobileActiveView,
    threadOpen: composerRefs.threadOpen,
    activeThreadMsgId: composerRefs.activeThreadMsgId,
    setActiveThreadMsgId: composerRefs.setActiveThreadMsgId,
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    staffDirectory,
    conversations,
    setConversations,
    visibleConversations: sidebarPrefs.visibleConversations,
    activeConversation: sidebarPrefs.activeConversation,
    userPrefs: sidebarPrefs.userPrefs,
    setTasks,
    setDockedConvIds: dock.setDockedConvIds,
    scrollToChatBottom: composerRefs.scrollToChatBottom,
    markThreadReadOptimisticAndSync: navActions.markThreadReadOptimisticAndSync,
    notifyLivePeers,
    antdMessage,
  });

  const msgSending = usePortalMessageSending({
    currentUser,
    isStrictDannySuperAdmin: aiAccess.isStrictDannySuperAdmin,
    canUseAiCopilot: aiAccess.canUseAiCopilot,
    activeConversation: sidebarPrefs.activeConversation,
    setConversations,
    aiSessionId: aiAccess.aiSessionId,
    setAiSessionId: aiAccess.setAiSessionId,
    setAiSessionOwnerId: aiAccess.setAiSessionOwnerId,
    aiSessionReadOnlyRef: aiAccess.aiSessionReadOnlyRef,
    aiMessages: aiAccess.aiMessages,
    setAiMessages: aiAccess.setAiMessages,
    setAiThinkingActive: aiAccess.setAiThinkingActive,
    composerTextRef: composerRefs.composerTextRef,
    updateComposerText: composerRefs.updateComposerText,
    threadTextRef: composerRefs.threadTextRef,
    threadInputRef: composerRefs.threadInputRef,
    updateThreadInput: composerRefs.updateThreadInput,
    lastSentRef: composerRefs.lastSentRef,
    stagedAttachments: attachments.stagedAttachments,
    setStagedAttachments: attachments.setStagedAttachments,
    threadAttachments: attachments.threadAttachments,
    setThreadAttachments: attachments.setThreadAttachments,
    hasActiveUploadsForScope: attachments.hasActiveUploadsForScope,
    replyingToMessage: composerRefs.replyingToMessage,
    setReplyingToMessage: composerRefs.setReplyingToMessage,
    activeThreadMsgId: composerRefs.activeThreadMsgId,
    setActiveThreadMsgId: composerRefs.setActiveThreadMsgId,
    activeThreadMessage: spacesDock.activeThreadMessage,
    isUrgentSend: aiAccess.isUrgentSend,
    setIsUrgentSend: aiAccess.setIsUrgentSend,
    closeMentionDropdown: mentions.closeMentionDropdown,
    dockedConvIds: dock.dockedConvIds,
    setInitialWorkflowCode,
    setTriggerWorkflowModalOpen,
    setSaveThreadWorkflowModalOpen,
    handleBuzzMessage: msgMutations.handleBuzzMessage,
    fetchBootstrap: realtime.fetchBootstrap,
    notifyLivePeers,
    scrollToChatBottom: composerRefs.scrollToChatBottom,
    cleanQuotedText,
    onRecordEmojisFromText: sidebarPrefs.recordEmojisFromText,
    antdMessage,
  });

  const taskModals = usePortalTaskModals({
    currentUser,
    staffDirectory,
    setStaffDirectory,
    uniqueTasks,
    setTasks,
    composerTextRef: composerRefs.composerTextRef,
    fetchBootstrap: realtime.fetchBootstrap,
    notifyLivePeers,
    antdMessage,
  });

  const taskActions = usePortalTaskActions({
    currentUser,
    currentUserStaffMember: aiAccess.currentUserStaffMember,
    staffDirectory,
    conversations,
    setConversations,
    activeConversation: sidebarPrefs.activeConversation,
    uniqueTasks,
    setTasks,
    setExpandedChecklistTaskIds,
    presence: layout.presence,
    userPrefs: sidebarPrefs.userPrefs,
    notifyLivePeers,
    antdMessage,
    taskForm: taskModals,
  });

  const missionActions = usePortalMissionActions({
    isStrictDannySuperAdmin: aiAccess.isStrictDannySuperAdmin,
    aiSessionId: aiAccess.aiSessionId,
    conversations,
    setConversations,
    setAiMessages: aiAccess.setAiMessages,
    activeConversation: sidebarPrefs.activeConversation,
    setTasks,
    selectConversation: readSync.selectConversation,
    handleOpenThread: navActions.handleOpenThread,
    notifyLivePeers,
    antdMessage,
  });

  const anyComposerBlockingModalOpen = Boolean(
    taskModals.taskModalOpen ||
    spacesDock.newRoomModalOpen ||
    spacesDock.spaceMembersModalOpen ||
    aiAccess.accessConfigModalOpen ||
    sidebarPrefs.sidebarCustomizeModalOpen ||
    sidebarPrefs.quickCreateSectionModalOpen ||
    attachments.driveLinkModalOpen
  );
  const anyEscapeBlockingModalOpen = Boolean(
    anyComposerBlockingModalOpen ||
    taskModals.negotiateModalOpen ||
    missionActions.missionModalOpen ||
    msgMutations.historyModalOpen ||
    triggerWorkflowModalOpen ||
    saveThreadWorkflowModalOpen
  );

  usePortalKeyboardAndAutofocus({
    open,
    onClose,
    onToggle,
    activeConvId: layout.activeConvId,
    activeSubtab: layout.activeSubtab,
    threadOpen: composerRefs.threadOpen,
    setThreadOpen: composerRefs.setThreadOpen,
    setSearchModalOpen: navActions.setSearchModalOpen,
    lightboxImage: attachments.lightboxImage,
    setLightboxImage: attachments.setLightboxImage,
    composerInputRef: composerRefs.composerInputRef,
    threadInputRef: composerRefs.threadInputRef,
    dockInputRefs: dock.dockInputRefs,
    dockedConvIds: dock.dockedConvIds,
    collapsedDockIds: dock.collapsedDockIds,
    anyComposerBlockingModalOpen,
    anyEscapeBlockingModalOpen,
  });

  const uiAdapters = usePortalUiAdapters({
    isDark,
    token,
    surfaceBg,
    surfaceRaised,
    borderColor,
    borderStrong,
    currentUser,
    currentUserStaffId: aiAccess.currentUserStaffMember.id,
    isStrictDannySuperAdmin: aiAccess.isStrictDannySuperAdmin,
    conversations,
    activeConversation: sidebarPrefs.activeConversation,
    activeThreadMessage: spacesDock.activeThreadMessage,
    staffDirectory,
    expandedChecklistTaskIds,
    setExpandedChecklistTaskIds,
    avatarPresence,
    attachments,
    composerRefs,
    dock,
    msgMutations,
    msgSending,
    taskModals,
    taskActions,
    missionActions,
    selectConversation: readSync.selectConversation,
    handleOpenThread: navActions.handleOpenThread,
    frequentEmojis: sidebarPrefs.frequentEmojis,
    onResetFrequentEmojis: sidebarPrefs.resetEmojiUsage,
    onRecordEmojiUsed: sidebarPrefs.recordEmojiUsed,
    antdMessage,
  });

  return {
    conversations,
    setConversations,
    tasks,
    setTasks,
    uniqueTasks,
    staffDirectory,
    workflowTemplates,
    setWorkflowTemplates,
    workflowInstances,
    setWorkflowInstances,
    triggerWorkflowModalOpen,
    setTriggerWorkflowModalOpen,
    initialWorkflowCode,
    setInitialWorkflowCode,
    saveThreadWorkflowModalOpen,
    setSaveThreadWorkflowModalOpen,
    navigateToMessageRef,
    notifyLivePeers,
    layout,
    dock,
    composerRefs,
    aiAccess,
    avatarPresence,
    sidebarPrefs,
    sidebarActions,
    attachments,
    realtime,
    readSync,
    navActions,
    msgMutations,
    mentions,
    spacesDock,
    msgSending,
    taskModals,
    taskActions,
    missionActions,
    uiAdapters,
  };
}
