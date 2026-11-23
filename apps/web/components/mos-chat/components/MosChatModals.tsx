'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import dayjs, { type Dayjs } from 'dayjs';
import { message as antdMessage, type GlobalToken } from 'antd';
import type {
  MosChatAccessConfig,
  MosChatConversation,
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskItem,
  MosChatWorkflowInstance,
  MosChatWorkflowTemplate,
  SafeAny,
} from '@mos-lab/shared';
import type { SpaceDepartmentOrTeamGroup } from '../constants/chat-constants';
import { MosChatSpaceConfigModal } from '../MosChatSpaceConfigModal';
import { MosChatCustomerPickerModal } from '../MosChatCustomerPickerModal';
import type { RichEditorViewMode } from '../MosChatRichEditorModal';
import { MosChatTaskModal } from '../modals/MosChatTaskModal';
import { MosChatNegotiateDeadlineModal } from '../modals/MosChatNegotiateDeadlineModal';
import { MosChatMissionDispatchModal } from '../modals/MosChatMissionDispatchModal';
import { MosChatCreateSpaceModal } from '../modals/MosChatCreateSpaceModal';
import { MosChatSpaceMembersDesktopModal } from '../modals/MosChatSpaceMembersDesktopModal';
import { MosChatNicknameAndDriveModals } from '../modals/MosChatNicknameAndDriveModals';
import { MosChatAccessControlModal } from '../modals/MosChatAccessControlModal';
import { MosChatSidebarCustomizationModals } from '../modals/MosChatSidebarCustomizationModals';
import { MosChatMessageAuditModal } from '../modals/MosChatMessageAuditModal';

const MosChatTriggerWorkflowModal = dynamic(
  () => import('../workflows/MosChatWorkflowModals').then((m) => m.MosChatTriggerWorkflowModal),
  { ssr: false }
);
const MosChatSaveThreadWorkflowModal = dynamic(
  () => import('../workflows/MosChatWorkflowModals').then((m) => m.MosChatSaveThreadWorkflowModal),
  { ssr: false }
);
const MosChatRichEditorModal = dynamic(
  () => import('../MosChatRichEditorModal').then((m) => m.MosChatRichEditorModal),
  { ssr: false }
);
const MosChatImageLightboxViewer = dynamic(
  () => import('./MosChatImageLightboxViewer').then((m) => m.MosChatImageLightboxViewer),
  { ssr: false }
);

export interface MosChatModalsProps {
  isDark: boolean;
  isMobile: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;

  currentUser: SafeAny;
  isDannyAccount: boolean;
  isStrictDannySuperAdmin: boolean;
  canUseAiCopilot: boolean;
  staffDirectory: MosChatStaffMember[];
  activeConversation: MosChatConversation | null;
  setConversations: React.Dispatch<React.SetStateAction<MosChatConversation[]>>;
  notifyLivePeers: () => void;

  // Task & Negotiate Modals
  taskModalOpen: boolean;
  setTaskModalOpen: (open: boolean) => void;
  editingTask: MosChatTaskItem | null;
  setEditingTask: (t: MosChatTaskItem | null) => void;
  taskModalSourceMsg: MosChatMessage | null;
  taskTitle: string;
  setTaskTitle: (val: string) => void;
  taskDoneState: boolean;
  setTaskDoneState: (val: boolean) => void;
  taskArchivedState: boolean;
  setTaskArchivedState: (val: boolean) => void;
  taskAssignee: string;
  setTaskAssignee: (val: string) => void;
  assigneeOptions: Array<{ label: string; value: string; staffId?: number }>;
  taskPriority: 'URGENT' | 'HIGH' | 'NORMAL';
  setTaskPriority: (p: SafeAny) => void;
  taskDeadline: Dayjs | null;
  setTaskDeadline: (d: Dayjs | null) => void;
  taskDeadlineMode: 'none' | 'preset' | 'custom';
  setTaskDeadlineMode: (m: SafeAny) => void;
  selectedDeadlinePresetId: string;
  setSelectedDeadlinePresetId: (id: string) => void;
  taskNegotiatedDeadline?: Dayjs | null;
  setTaskNegotiatedDeadline?: (d: Dayjs | null) => void;
  taskNegotiationNote?: string;
  setTaskNegotiationNote?: (n: string) => void;
  taskRemindMode: 'preset' | 'custom';
  setTaskRemindMode: (m: SafeAny) => void;
  selectedPresetId: string;
  setSelectedPresetId: (id: string) => void;
  setTaskRemindSeconds: (sec: number) => void;
  customRemindDate: Dayjs | null;
  setCustomRemindDate: (d: Dayjs | null) => void;
  handleConfirmCreateTask: () => Promise<void> | void;

  negotiateModalOpen: boolean;
  setNegotiateModalOpen: (open: boolean) => void;
  negotiatingTask: MosChatTaskItem | null;
  setNegotiatingTask: (t: MosChatTaskItem | null) => void;
  negotiateProposedDeadline: Dayjs | null;
  setNegotiateProposedDeadline: (d: Dayjs | null) => void;
  negotiateReason: string;
  setNegotiateReason: (r: string) => void;
  isSubmittingNegotiation: boolean;
  handleSubmitNegotiation: () => Promise<void> | void;

  // Mission Modal
  missionModalOpen: boolean;
  setMissionModalOpen: (open: boolean) => void;
  missionSourceMsg: MosChatMessage | null;
  missionTitle: string;
  setMissionTitle: (val: string) => void;
  missionType: 'FEATURE' | 'BUG';
  setMissionType: (val: 'FEATURE' | 'BUG') => void;
  missionNote: string;
  setMissionNote: (val: string) => void;
  isDispatchingMission: boolean;
  handleConfirmDispatchMission: () => Promise<void> | void;

  // Space & Nickname Modals
  newRoomModalOpen: boolean;
  setNewRoomModalOpen: (open: boolean) => void;
  newRoomType: 'space' | 'dm';
  roomSearchQuery: string;
  setRoomSearchQuery: (val: string) => void;
  roomGroupFilter: string;
  setRoomGroupFilter: (val: string) => void;
  selectedMemberIds: number[];
  setSelectedMemberIds: React.Dispatch<React.SetStateAction<number[]>>;
  newRoomEmoji: string;
  setNewRoomEmoji: (val: string) => void;
  newRoomColor: string;
  setNewRoomColor: (val: string) => void;
  newRoomName: string;
  setNewRoomName: (val: string) => void;
  newRoomSubtitle: string;
  setNewRoomSubtitle: (val: string) => void;
  handleCreateSpace: () => Promise<void> | void;
  handleSelectSelfChat: () => Promise<void> | void;
  handleSelectColleague: (colleague: MosChatStaffMember) => Promise<void> | void;
  handleToggleDepartmentOrTeam: (group: SafeAny) => void;

  spaceMembersModalOpen: boolean;
  setSpaceMembersModalOpen: (open: boolean) => void;
  addMemberSelectedStaffId: number | null;
  setAddMemberSelectedStaffId: (id: number | null) => void;
  handleAddMemberToSpace: (id: number) => Promise<void> | void;
  handleBulkAddGroupToSpace: (group: SafeAny) => Promise<void> | void;
  handleRemoveMemberFromSpace: (id: number) => Promise<void> | void;
  handleOpenNicknameModal: (staffId: number) => void;

  spaceConfigModalOpen: boolean;
  setSpaceConfigModalOpen: (open: boolean) => void;
  editingNicknameTarget: { staffId: number; displayName: string; currentNickname: string; isMe: boolean } | null;
  setEditingNicknameTarget: (target: SafeAny) => void;
  nicknameInputVal: string;
  setNicknameInputVal: (val: string) => void;
  isUpdatingNickname: boolean;
  handleSaveNickname: (overrideVal?: string) => Promise<void> | void;

  // Drive Link & Lightbox
  driveLinkModalOpen: boolean;
  setDriveLinkModalOpen: (open: boolean) => void;
  driveLinkInput: string;
  setDriveLinkInput: (val: string) => void;
  handleConfirmDriveLink: () => void;
  triggerFilePicker: (scope: SafeAny, convId?: string) => void;
  uploadTargetRef: React.MutableRefObject<{ scope: SafeAny; convId?: string }>;
  lightboxImage: { items: SafeAny[]; currentIndex: number; zoom: number; rotate: number } | null;
  setLightboxImage: React.Dispatch<React.SetStateAction<SafeAny>>;

  // Access Config Modal
  accessConfigModalOpen: boolean;
  setAccessConfigModalOpen: (open: boolean) => void;
  savingAccessConfig: boolean;
  accessConfigTab: 'chat' | 'ai';
  setAccessConfigTab: (tab: 'chat' | 'ai') => void;
  accessConfig: MosChatAccessConfig;
  persistAccessConfig: (cfg: MosChatAccessConfig, silent?: boolean) => Promise<void> | void;
  accessStaffSearch: string;
  setAccessStaffSearch: (val: string) => void;
  accessGroupFilter: string;
  setAccessGroupFilter: (val: string) => void;
  isStaffMemberAllowedInChat: (
    member: MosChatStaffMember,
    cfg?: MosChatAccessConfig
  ) => {
    allowed: boolean;
    reason: 'admin' | 'all' | 'individual' | 'group' | 'none';
    matchedGroups: SpaceDepartmentOrTeamGroup[];
  };
  isStaffMemberAllowedInAi: (
    member: MosChatStaffMember,
    cfg?: MosChatAccessConfig
  ) => {
    allowed: boolean;
    reason: 'admin' | 'individual' | 'group' | 'none';
    matchedGroups: SpaceDepartmentOrTeamGroup[];
  };

  // Sidebar Customization Modals
  quickCreateSectionModalOpen: boolean;
  setQuickCreateSectionModalOpen: (open: boolean) => void;
  quickCreateSectionTargetConvId: string | null;
  setQuickCreateSectionTargetConvId: (id: string | null) => void;
  quickCreateSectionName: string;
  setQuickCreateSectionName: (val: string) => void;
  handleCreateCustomSection: (name: string, targetConvId?: string | null) => void;

  sidebarCustomizeModalOpen: boolean;
  setSidebarCustomizeModalOpen: (open: boolean) => void;
  editingSectionId: string | null;
  setEditingSectionId: (id: string | null) => void;
  sidebarCustomizeTab: 'sections' | 'conversations';
  setSidebarCustomizeTab: (tab: 'sections' | 'conversations') => void;
  sidebarSections: SafeAny[];
  allUserConversations: MosChatConversation[];
  userPrefs: SafeAny;
  handleResetSidebarPrefs: () => void;
  newSectionNameInput: string;
  setNewSectionNameInput: (val: string) => void;
  editingSectionNameInput: string;
  setEditingSectionNameInput: (val: string) => void;
  handleRenameCustomSection: (id: string, name: string) => void;
  handleDeleteCustomSection: (id: string) => void;
  handleMoveSectionOrder: (id: string, dir: 'up' | 'down') => void;
  togglePinConversation: (id: string, pinned?: boolean) => void | Promise<SafeAny>;
  toggleMuteConversation: (id: string) => void;
  toggleHideConversation: (conv: MosChatConversation) => void;

  // History Modal
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  historyModalMessage: SafeAny;
  setHistoryModalMessage: (msg: SafeAny) => void;
  isMessageFromCurrentUser: (msg: MosChatMessage) => boolean;
  handleRestoreVersion: (msgId: string, versionText: string, replyId?: string) => Promise<void> | void;
  handleRestoreMessage: (msgId: string, replyId?: string) => Promise<void> | void;

  // Workflow & Rich Editor Modals
  triggerWorkflowModalOpen: boolean;
  setTriggerWorkflowModalOpen: (open: boolean) => void;
  workflowTemplates: MosChatWorkflowTemplate[];
  setWorkflowTemplates: React.Dispatch<React.SetStateAction<MosChatWorkflowTemplate[]>>;
  initialWorkflowCode: string;
  setWorkflowInstances: React.Dispatch<React.SetStateAction<MosChatWorkflowInstance[]>>;
  setTasks: React.Dispatch<React.SetStateAction<MosChatTaskItem[]>>;
  saveThreadWorkflowModalOpen: boolean;
  setSaveThreadWorkflowModalOpen: (open: boolean) => void;
  activeThreadMessage: MosChatMessage | null;
  fetchBootstrap: (silent?: boolean) => Promise<void>;

  richEditorModalState: {
    open: boolean;
    scope: 'main' | 'thread';
    title: string;
    initialMode?: RichEditorViewMode;
  };
  setRichEditorModalState: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      scope: 'main' | 'thread';
      title: string;
      initialMode?: RichEditorViewMode;
    }>
  >;
  composerText: string;
  setComposerText: (t: string) => void;
  threadInput: string;
  setThreadInput: (t: string) => void;
  composerInputRef: React.RefObject<HTMLTextAreaElement | null>;
  threadInputRef: React.RefObject<HTMLTextAreaElement | null>;
  stagedAttachments: MosChatImageAttachment[];
  setStagedAttachments: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  handleSendMessage: (convId: string, text: string, quote?: SafeAny, atts?: SafeAny) => Promise<SafeAny> | SafeAny;
  activeThreadMsgId: string | null;
  threadAttachments: MosChatImageAttachment[];
  setThreadAttachments: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  scrollToChatBottom: (scope: SafeAny, behavior: SafeAny) => void;

  // Customer & Booking Picker Modal
  customerPickerOpen?: boolean;
  setCustomerPickerOpen?: (open: boolean) => void;
  onSelectCustomerCard?: (card: MosChatCustomerCard, sendImmediately?: boolean) => void;
}

export const MosChatModals: React.FC<MosChatModalsProps> = (props) => {
  const {
    isDark,
    activeConversation,
    setConversations,
    notifyLivePeers,
    spaceConfigModalOpen,
    setSpaceConfigModalOpen,
    setSpaceMembersModalOpen,
    userPrefs,
    togglePinConversation,
    lightboxImage,
    setLightboxImage,
    isStrictDannySuperAdmin,
    triggerWorkflowModalOpen,
    setTriggerWorkflowModalOpen,
    workflowTemplates,
    setWorkflowTemplates,
    initialWorkflowCode,
    setWorkflowInstances,
    setTasks,
    saveThreadWorkflowModalOpen,
    setSaveThreadWorkflowModalOpen,
    activeThreadMessage,
    fetchBootstrap,
    richEditorModalState,
    setRichEditorModalState,
    composerText,
    setComposerText,
    threadInput,
    setThreadInput,
    composerInputRef,
    threadInputRef,
    stagedAttachments,
    setStagedAttachments,
    handleSendMessage,
    activeThreadMsgId,
    threadAttachments,
    setThreadAttachments,
    scrollToChatBottom,
    currentUser,
    canUseAiCopilot,
    staffDirectory,
    customerPickerOpen,
    setCustomerPickerOpen,
    onSelectCustomerCard,
  } = props;

  return (
    <>
      <MosChatTaskModal {...props} />
      <MosChatNegotiateDeadlineModal {...props} />
      <MosChatMissionDispatchModal {...props} />
      <MosChatCreateSpaceModal {...props} />
      <MosChatSpaceMembersDesktopModal {...props} />

      <MosChatSpaceConfigModal
        open={spaceConfigModalOpen}
        conversation={activeConversation}
        onClose={() => setSpaceConfigModalOpen(false)}
        onUpdated={(updatedConv: SafeAny) => {
          setConversations((prev) => prev.map((c) => (c.id === updatedConv.id ? { ...c, ...updatedConv } : c)));
          notifyLivePeers();
        }}
        onOpenMembersModal={() => setSpaceMembersModalOpen(true)}
        isPinned={activeConversation ? Boolean((userPrefs?.pinnedIds || []).includes(activeConversation.id)) : false}
        togglePinConversation={togglePinConversation}
      />

      <MosChatNicknameAndDriveModals {...props} />
      <MosChatAccessControlModal {...props} />

      {lightboxImage && (
        <MosChatImageLightboxViewer lightboxImage={lightboxImage} setLightboxImage={setLightboxImage} />
      )}

      <MosChatSidebarCustomizationModals {...props} />
      <MosChatMessageAuditModal {...props} />

      {isStrictDannySuperAdmin && activeConversation && triggerWorkflowModalOpen && (
        <MosChatTriggerWorkflowModal
          open={triggerWorkflowModalOpen}
          isDark={isDark}
          conversationId={activeConversation.id}
          templates={workflowTemplates}
          staffDirectory={staffDirectory}
          initialTemplateCode={initialWorkflowCode}
          onClose={() => setTriggerWorkflowModalOpen(false)}
          onCreated={(res: SafeAny) => {
            if (res?.workflow) setWorkflowInstances((prev) => [res.workflow, ...prev]);
            if (res?.conversation) {
              setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
            }
            if (res?.task) setTasks((prev) => [res.task!, ...prev]);
            antdMessage.success(`Đã phát thẻ quy trình: ${res.workflow.title}`);
            notifyLivePeers();
          }}
        />
      )}

      {isStrictDannySuperAdmin && activeConversation && saveThreadWorkflowModalOpen && (
        <MosChatSaveThreadWorkflowModal
          open={saveThreadWorkflowModalOpen}
          isDark={isDark}
          conversationId={activeConversation.id}
          messageId={activeThreadMessage?.id ?? null}
          defaultName={
            activeThreadMessage?.text
              ? `Quy trình: ${activeThreadMessage.text.replace(/[*#_`]/g, '').slice(0, 48)}`
              : 'Quy trình Phối hợp Nội bộ Mới'
          }
          existingTemplates={workflowTemplates}
          onClose={() => setSaveThreadWorkflowModalOpen(false)}
          onSaved={(res: SafeAny) => {
            if (res?.template) {
              setWorkflowTemplates((prev) =>
                prev.some((t) => t.code === res.template.code)
                  ? prev.map((t) => (t.code === res.template.code ? res.template : t))
                  : [res.template, ...prev]
              );
            }
            antdMessage.success(`Đã lưu & áp dụng Quy trình: ${res.template.name} (v${res.template.version})`);
            void fetchBootstrap(true);
            notifyLivePeers();
          }}
        />
      )}

      {richEditorModalState.open && (
        <MosChatRichEditorModal
          open={richEditorModalState.open}
          onClose={() => setRichEditorModalState((prev) => ({ ...prev, open: false }))}
          initialValue={richEditorModalState.scope === 'main' ? composerText : threadInput}
          initialMode={richEditorModalState.initialMode}
          onApply={(newText: string) => {
            const targetRef = richEditorModalState.scope === 'main' ? composerInputRef : threadInputRef;
            if (richEditorModalState.scope === 'main') {
              setComposerText(newText);
            } else {
              setThreadInput(newText);
            }
            setTimeout(() => {
              if (targetRef.current) {
                targetRef.current.style.height = 'auto';
                targetRef.current.style.height = `${Math.min(targetRef.current.scrollHeight, 180)}px`;
                targetRef.current.focus();
              }
            }, 50);
          }}
          onSend={async (textToSend: string) => {
            if (richEditorModalState.scope === 'main') {
              if (activeConversation) {
                const attachmentsToSend = stagedAttachments;
                setComposerText('');
                setStagedAttachments([]);
                if (composerInputRef.current) composerInputRef.current.value = '';
                await handleSendMessage(activeConversation.id, textToSend, null, attachmentsToSend);
              }
            } else if (activeConversation && activeThreadMsgId) {
              const attachmentsToSend = threadAttachments;
              setThreadInput('');
              setThreadAttachments([]);
              if (threadInputRef.current) {
                threadInputRef.current.value = '';
                threadInputRef.current.style.height = 'auto';
              }
              const newReply = {
                id: `th-${Date.now()}`,
                senderId: currentUser?.id || 'me',
                senderName: currentUser?.displayName || 'Danny Do',
                senderRole: 'Super Admin',
                senderAvatar: 'DD',
                text: textToSend,
                attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
                timeLabel: dayjs().format('HH:mm'),
                createdAt: new Date().toISOString(),
              };
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== activeConversation.id) return c;
                  return {
                    ...c,
                    messages: c.messages.map((m: SafeAny) =>
                      m.id === activeThreadMsgId
                        ? { ...m, unreadThreadReplyCount: 0, thread: [...(m.thread || []), newReply] }
                        : m
                    ),
                  };
                })
              );
              scrollToChatBottom('thread', 'smooth');
            }
          }}
          title={richEditorModalState.title}
          isDark={isDark}
          canUseAiCopilot={canUseAiCopilot}
        />
      )}

      {customerPickerOpen && onSelectCustomerCard && (
        <MosChatCustomerPickerModal
          open={customerPickerOpen}
          onClose={() => setCustomerPickerOpen?.(false)}
          onSelectCustomerCard={onSelectCustomerCard}
          isDark={isDark}
          zIndex={1400}
        />
      )}
    </>
  );
};
