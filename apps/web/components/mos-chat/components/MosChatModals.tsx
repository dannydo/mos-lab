'use client';

import React from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Modal,
  Input,
  Select,
  DatePicker,
  Switch,
  Tooltip,
  Popconfirm,
  message as antdMessage,
  type GlobalToken,
} from 'antd';
import {
  AlarmClockPlus,
  Archive,
  Bell,
  BellOff,
  Bot,
  Calendar,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderKanban,
  FolderPlus,
  Handshake,
  HardDrive,
  Hash,
  History,
  ImagePlus,
  Loader2,
  MessageSquare,
  Minus,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  RotateCw,
  Rocket,
  Search,
  ShieldCheck,
  Sliders,
  UserMinus,
  UserPlus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  type MosChatConversation,
  type MosChatMessage,
  type MosChatStaffMember,
  type MosChatImageAttachment,
  type MosChatTaskItem,
  type MosChatWorkflowTemplate,
  type MosChatWorkflowInstance,
  type MosChatAccessConfig,
  type MosChatCustomerCard,
  type SafeAny,
  removeVietnameseTones,
} from '@mos-lab/shared';
import {
  DEADLINE_PRESETS,
  REMINDER_PRESETS,
  SPACE_DEPARTMENT_AND_TEAM_GROUPS,
  type SpaceDepartmentOrTeamGroup,
} from '../constants/chat-constants';
import { matchesStaffGroup } from '../utils/chat-helpers';
import { MosChatSpaceEmojiColorPicker } from '../MosChatSpaceEmojiColorPicker';
import { MosChatSpaceConfigModal } from '../MosChatSpaceConfigModal';
import { MosChatTriggerWorkflowModal, MosChatSaveThreadWorkflowModal } from '../workflows/MosChatWorkflowModals';
import { MosChatRichEditorModal, type RichEditorViewMode } from '../MosChatRichEditorModal';
import { MosChatCustomerPickerModal } from '../MosChatCustomerPickerModal';

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
  renderUserAvatarNode: (props: any) => React.ReactNode;

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
  setTaskPriority: (p: any) => void;
  taskDeadline: Dayjs | null;
  setTaskDeadline: (d: Dayjs | null) => void;
  taskDeadlineMode: 'none' | 'preset' | 'custom';
  setTaskDeadlineMode: (m: any) => void;
  selectedDeadlinePresetId: string;
  setSelectedDeadlinePresetId: (id: string) => void;
  taskNegotiatedDeadline?: Dayjs | null;
  setTaskNegotiatedDeadline?: (d: Dayjs | null) => void;
  taskNegotiationNote?: string;
  setTaskNegotiationNote?: (n: string) => void;
  taskRemindMode: 'preset' | 'custom';
  setTaskRemindMode: (m: any) => void;
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
  handleToggleDepartmentOrTeam: (group: any) => void;

  spaceMembersModalOpen: boolean;
  setSpaceMembersModalOpen: (open: boolean) => void;
  addMemberSelectedStaffId: number | null;
  setAddMemberSelectedStaffId: (id: number | null) => void;
  handleAddMemberToSpace: (id: number) => Promise<void> | void;
  handleBulkAddGroupToSpace: (group: any) => Promise<void> | void;
  handleRemoveMemberFromSpace: (id: number) => Promise<void> | void;
  handleOpenNicknameModal: (staffId: number) => void;

  spaceConfigModalOpen: boolean;
  setSpaceConfigModalOpen: (open: boolean) => void;
  editingNicknameTarget: { staffId: number; displayName: string; currentNickname: string; isMe: boolean } | null;
  setEditingNicknameTarget: (target: any) => void;
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
  triggerFilePicker: (scope: any, convId?: string) => void;
  uploadTargetRef: React.MutableRefObject<{ scope: any; convId?: string }>;
  lightboxImage: { items: any[]; currentIndex: number; zoom: number; rotate: number } | null;
  setLightboxImage: React.Dispatch<React.SetStateAction<any>>;

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
  sidebarSections: any[];
  allUserConversations: MosChatConversation[];
  userPrefs: any;
  handleResetSidebarPrefs: () => void;
  newSectionNameInput: string;
  setNewSectionNameInput: (val: string) => void;
  editingSectionNameInput: string;
  setEditingSectionNameInput: (val: string) => void;
  handleRenameCustomSection: (id: string, name: string) => void;
  handleDeleteCustomSection: (id: string) => void;
  handleMoveSectionOrder: (id: string, dir: 'up' | 'down') => void;
  togglePinConversation: (id: string) => void;
  toggleMuteConversation: (id: string) => void;
  toggleHideConversation: (conv: MosChatConversation) => void;

  // History Modal
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  historyModalMessage: any;
  setHistoryModalMessage: (msg: any) => void;
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
  handleSendMessage: (convId: string, text: string, quote?: any, atts?: any) => Promise<any> | any;
  activeThreadMsgId: string | null;
  threadAttachments: MosChatImageAttachment[];
  setThreadAttachments: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  scrollToChatBottom: (scope: any, behavior: any) => void;

  // Customer & Booking Picker Modal
  customerPickerOpen?: boolean;
  setCustomerPickerOpen?: (open: boolean) => void;
  onSelectCustomerCard?: (card: MosChatCustomerCard, sendImmediately?: boolean) => void;
}

export const MosChatModals: React.FC<MosChatModalsProps> = ({
  isDark,
  isMobile,
  token,
  surfaceBg,
  surfaceRaised,
  canvasBg,
  borderColor,
  borderStrong,
  accentColor,
  renderUserAvatarNode,
  currentUser,
  isDannyAccount,
  isStrictDannySuperAdmin,
  canUseAiCopilot,
  staffDirectory,
  activeConversation,
  setConversations,
  notifyLivePeers,

  taskModalOpen,
  setTaskModalOpen,
  editingTask,
  setEditingTask,
  taskModalSourceMsg,
  taskTitle,
  setTaskTitle,
  taskDoneState,
  setTaskDoneState,
  taskArchivedState,
  setTaskArchivedState,
  taskAssignee,
  setTaskAssignee,
  assigneeOptions,
  taskPriority,
  setTaskPriority,
  taskDeadline,
  setTaskDeadline,
  taskDeadlineMode,
  setTaskDeadlineMode,
  selectedDeadlinePresetId,
  setSelectedDeadlinePresetId,
  taskNegotiatedDeadline,
  setTaskNegotiatedDeadline,
  taskNegotiationNote,
  setTaskNegotiationNote,
  taskRemindMode,
  setTaskRemindMode,
  selectedPresetId,
  setSelectedPresetId,
  setTaskRemindSeconds,
  customRemindDate,
  setCustomRemindDate,
  handleConfirmCreateTask,

  negotiateModalOpen,
  setNegotiateModalOpen,
  negotiatingTask,
  setNegotiatingTask,
  negotiateProposedDeadline,
  setNegotiateProposedDeadline,
  negotiateReason,
  setNegotiateReason,
  isSubmittingNegotiation,
  handleSubmitNegotiation,

  missionModalOpen,
  setMissionModalOpen,
  missionSourceMsg,
  missionTitle,
  setMissionTitle,
  missionType,
  setMissionType,
  missionNote,
  setMissionNote,
  isDispatchingMission,
  handleConfirmDispatchMission,

  newRoomModalOpen,
  setNewRoomModalOpen,
  newRoomType,
  roomSearchQuery,
  setRoomSearchQuery,
  roomGroupFilter,
  setRoomGroupFilter,
  selectedMemberIds,
  setSelectedMemberIds,
  newRoomEmoji,
  setNewRoomEmoji,
  newRoomColor,
  setNewRoomColor,
  newRoomName,
  setNewRoomName,
  newRoomSubtitle,
  setNewRoomSubtitle,
  handleCreateSpace,
  handleSelectSelfChat,
  handleSelectColleague,
  handleToggleDepartmentOrTeam,

  spaceMembersModalOpen,
  setSpaceMembersModalOpen,
  addMemberSelectedStaffId,
  setAddMemberSelectedStaffId,
  handleAddMemberToSpace,
  handleBulkAddGroupToSpace,
  handleRemoveMemberFromSpace,
  handleOpenNicknameModal,

  spaceConfigModalOpen,
  setSpaceConfigModalOpen,
  editingNicknameTarget,
  setEditingNicknameTarget,
  nicknameInputVal,
  setNicknameInputVal,
  isUpdatingNickname,
  handleSaveNickname,

  driveLinkModalOpen,
  setDriveLinkModalOpen,
  driveLinkInput,
  setDriveLinkInput,
  handleConfirmDriveLink,
  triggerFilePicker,
  uploadTargetRef,
  lightboxImage,
  setLightboxImage,

  accessConfigModalOpen,
  setAccessConfigModalOpen,
  savingAccessConfig,
  accessConfigTab,
  setAccessConfigTab,
  accessConfig,
  persistAccessConfig,
  accessStaffSearch,
  setAccessStaffSearch,
  accessGroupFilter,
  setAccessGroupFilter,
  isStaffMemberAllowedInChat,
  isStaffMemberAllowedInAi,

  quickCreateSectionModalOpen,
  setQuickCreateSectionModalOpen,
  quickCreateSectionTargetConvId,
  setQuickCreateSectionTargetConvId,
  quickCreateSectionName,
  setQuickCreateSectionName,
  handleCreateCustomSection,

  sidebarCustomizeModalOpen,
  setSidebarCustomizeModalOpen,
  editingSectionId,
  setEditingSectionId,
  sidebarCustomizeTab,
  setSidebarCustomizeTab,
  sidebarSections,
  allUserConversations,
  userPrefs,
  handleResetSidebarPrefs,
  newSectionNameInput,
  setNewSectionNameInput,
  editingSectionNameInput,
  setEditingSectionNameInput,
  handleRenameCustomSection,
  handleDeleteCustomSection,
  handleMoveSectionOrder,
  togglePinConversation,
  toggleMuteConversation,
  toggleHideConversation,

  historyModalOpen,
  setHistoryModalOpen,
  historyModalMessage,
  setHistoryModalMessage,
  isMessageFromCurrentUser,
  handleRestoreVersion,
  handleRestoreMessage,

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

  customerPickerOpen,
  setCustomerPickerOpen,
  onSelectCustomerCard,
}) => {
  return (
    <>
      {/* ================= MODAL: MESSAGE TO TASK -> REMINDER ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={taskModalOpen}
        zIndex={1350}
        onCancel={() => {
          setTaskModalOpen(false);
          setEditingTask(null);
        }}
        onOk={handleConfirmCreateTask}
        okText={
          editingTask
            ? 'Lưu thay đổi'
            : taskRemindMode === 'preset' && selectedPresetId === 'none'
              ? 'Lưu Task'
              : 'Lưu & Hẹn giờ'
        }
        cancelText="Hủy"
        title={
          <span className="flex items-center gap-2 text-[14px] font-bold">
            {editingTask ? (
              <>
                <Pencil size={16} className="text-amber-500" />
                <span>Chỉnh Sửa Công Việc</span>
              </>
            ) : (
              <>
                <AlarmClockPlus size={16} className="text-amber-500" />
                <span>Giao Task & Hẹn Giờ Nhắc</span>
              </>
            )}
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 440}
      >
        <div className="space-y-3 py-1">
          {taskModalSourceMsg && (
            <div
              className="p-2 rounded-lg text-[11.5px]"
              style={{ background: surfaceRaised, borderLeft: '3px solid #d4a84b' }}
            >
              <strong>{taskModalSourceMsg.senderName}:</strong> &ldquo;{taskModalSourceMsg.text}&rdquo;
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">Tên công việc</div>
            <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          </div>

          {editingTask && (
            <div
              className="p-2.5 rounded-lg space-y-2.5"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <div className="text-[11px] font-bold text-slate-400">Trạng thái công việc</div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] flex items-center gap-2 font-medium">
                  <Check size={14} className={taskDoneState ? 'text-emerald-400' : 'text-slate-400'} />
                  <span>Đã hoàn thành</span>
                </span>
                <Switch checked={taskDoneState} onChange={(checked) => setTaskDoneState(checked)} size="small" />
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                <span className="text-[12px] flex items-center gap-2 font-medium">
                  <Archive size={14} className={taskArchivedState ? 'text-amber-400' : 'text-slate-400'} />
                  <span>Lưu trữ (Archived)</span>
                </span>
                <Switch
                  checked={taskArchivedState}
                  onChange={(checked) => setTaskArchivedState(checked)}
                  size="small"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">
                Người phụ trách <span className="text-rose-400">*</span>
              </div>
              <Select
                className="w-full"
                value={taskAssignee || undefined}
                onChange={(val) => setTaskAssignee(val || '')}
                options={assigneeOptions}
                showSearch
                allowClear
                loading={assigneeOptions.length === 0}
                notFoundContent={
                  assigneeOptions.length === 0 ? 'Đang tải danh sách nhân sự...' : 'Không tìm thấy nhân sự'
                }
                getPopupContainer={(trigger) => trigger?.parentElement || document.body}
                dropdownStyle={{ zIndex: 1400 }}
                status={!taskAssignee ? 'warning' : undefined}
                placeholder="Chọn nhân sự phụ trách..."
                optionRender={(option) => {
                  const valStr = String(option.value || '').trim();
                  const matchedStaff = staffDirectory.find(
                    (s) =>
                      String(s.displayName || '').toLowerCase() === valStr.toLowerCase() ||
                      String(s.username || '').toLowerCase() === valStr.toLowerCase()
                  );
                  return (
                    <div className="flex items-center gap-2 py-0.5 min-w-0">
                      {renderUserAvatarNode({
                        staffId: matchedStaff?.id,
                        name: matchedStaff?.displayName || valStr,
                        username: matchedStaff?.username,
                        avatarUrl: matchedStaff?.avatarUrl,
                        sizeClass: 'w-5 h-5',
                        roundedClass: 'rounded-full',
                        textSizeClass: 'text-[9px]',
                      })}
                      <span className="truncate text-xs font-medium">{option.label}</span>
                    </div>
                  );
                }}
                labelRender={(props) => {
                  const valStr = String(props.value || '').trim();
                  const matchedStaff = staffDirectory.find(
                    (s) =>
                      String(s.displayName || '').toLowerCase() === valStr.toLowerCase() ||
                      String(s.username || '').toLowerCase() === valStr.toLowerCase()
                  );
                  return (
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      {renderUserAvatarNode({
                        staffId: matchedStaff?.id,
                        name: matchedStaff?.displayName || valStr,
                        username: matchedStaff?.username,
                        avatarUrl: matchedStaff?.avatarUrl,
                        sizeClass: 'w-4 h-4',
                        roundedClass: 'rounded-full',
                        textSizeClass: 'text-[8px]',
                      })}
                      <span className="truncate">{props.label || props.value}</span>
                    </span>
                  );
                }}
                filterOption={(input, option) => {
                  const normInput = removeVietnameseTones(input.trim().toLowerCase());
                  if (!normInput) return true;
                  const normLabel = removeVietnameseTones(String(option?.label || '').toLowerCase());
                  const normValue = removeVietnameseTones(String(option?.value || '').toLowerCase());
                  return normLabel.includes(normInput) || normValue.includes(normInput);
                }}
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">Mức ưu tiên</div>
              <Select
                className="w-full"
                value={taskPriority}
                onChange={setTaskPriority}
                options={[
                  { value: 'URGENT', label: 'Khẩn cấp' },
                  { value: 'HIGH', label: 'Quan trọng' },
                  { value: 'NORMAL', label: 'Bình thường' },
                ]}
              />
            </div>
          </div>

          {/* Deadline Section (MOS-BUG-125) */}
          <div
            className="p-2.5 rounded-lg space-y-2 text-left"
            style={{
              background: surfaceRaised,
              border: `1px solid ${taskDeadline ? 'rgba(212, 168, 75, 0.4)' : borderColor}`,
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-500">
                <CalendarClock size={13} />
                <span>Hạn chót hoàn thành (Deadline)</span>
              </span>
              {taskDeadline && (
                <span className="text-amber-500 font-semibold tabular-nums text-[10.5px]">
                  Hạn: {taskDeadline.format('HH:mm DD/MM/YYYY')}
                </span>
              )}
            </div>

            {/* Deadline Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              {DEADLINE_PRESETS.map((preset) => {
                const isSelected = taskDeadlineMode === 'preset' && selectedDeadlinePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTaskDeadlineMode('preset');
                      setSelectedDeadlinePresetId(preset.id);
                      setTaskDeadline(preset.getDate());
                    }}
                    className="h-8 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                      border: `1px solid ${isSelected ? '#d4a84b' : borderColor}`,
                      color: isSelected ? '#d4a84b' : token.colorText,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {/* Custom Deadline Picker Button */}
              <button
                type="button"
                onClick={() => {
                  setTaskDeadlineMode('custom');
                  if (!taskDeadline) {
                    const defaultCustom = dayjs().hour(17).minute(30).second(0);
                    setTaskDeadline(defaultCustom.isBefore(dayjs()) ? defaultCustom.add(1, 'day') : defaultCustom);
                  }
                }}
                className="h-8 rounded-lg text-[11px] font-bold cursor-pointer transition-colors col-span-3 flex items-center justify-center gap-1.5"
                style={{
                  background: taskDeadlineMode === 'custom' ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                  border: `1px solid ${taskDeadlineMode === 'custom' ? '#d4a84b' : borderColor}`,
                  color: taskDeadlineMode === 'custom' ? '#d4a84b' : token.colorText,
                }}
              >
                <Calendar size={13} />
                <span>Tùy chỉnh ngày & giờ chót hoàn thành</span>
              </button>
            </div>

            {/* Custom Deadline Picker Drawer */}
            {taskDeadlineMode === 'custom' && (
              <div
                className="p-2 rounded-lg space-y-1.5"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <DatePicker
                  showTime={{ format: 'HH:mm' }}
                  format="DD/MM/YYYY HH:mm"
                  value={taskDeadline}
                  onChange={(val) => {
                    setTaskDeadline(val);
                  }}
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  className="w-full h-8 text-[12px]"
                  placeholder="Chọn thời hạn chót..."
                />

                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-slate-400 mr-0.5">Gợi ý:</span>
                  {[
                    { label: '+2 giờ', get: () => dayjs().add(2, 'hour') },
                    {
                      label: '17:30 hôm nay',
                      get: () => {
                        const t = dayjs().hour(17).minute(30).second(0);
                        return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                      },
                    },
                    {
                      label: '22:00 hôm nay',
                      get: () => {
                        const t = dayjs().hour(22).minute(0).second(0);
                        return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                      },
                    },
                    { label: '12:00 trưa mai', get: () => dayjs().add(1, 'day').hour(12).minute(0).second(0) },
                    { label: '17:30 chiều mai', get: () => dayjs().add(1, 'day').hour(17).minute(30).second(0) },
                    { label: '+2 ngày', get: () => dayjs().add(2, 'day').hour(17).minute(30).second(0) },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setTaskDeadline(chip.get())}
                      className="px-2 py-0.5 rounded text-[10px] cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                      style={{
                        background: 'rgba(212, 168, 75, 0.12)',
                        color: '#d4a84b',
                        border: '1px solid rgba(212, 168, 75, 0.25)',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Negotiation review banner in Edit modal */}
          {editingTask && taskNegotiatedDeadline && (
            <div
              className="p-2.5 rounded-lg space-y-1.5 text-left"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1.5px dashed rgba(245, 158, 11, 0.45)',
              }}
            >
              <div className="flex items-center justify-between text-amber-500 font-bold text-[11.5px]">
                <span className="flex items-center gap-1">
                  <Handshake size={13} />
                  <span>Đề xuất dời hạn từ người nhận</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {taskNegotiatedDeadline ? dayjs(taskNegotiatedDeadline).format('HH:mm DD/MM/YYYY') : ''}
                </span>
              </div>
              {taskNegotiationNote && (
                <div className="text-[11px] italic text-slate-300 bg-black/20 p-1.5 rounded">
                  &ldquo;{taskNegotiationNote}&rdquo;
                </div>
              )}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="h-6 px-2.5 rounded-md text-[11px] font-bold cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm inline-flex items-center gap-1"
                  onClick={() => {
                    if (taskNegotiatedDeadline) {
                      setTaskDeadline(taskNegotiatedDeadline);
                      if (setTaskNegotiatedDeadline) setTaskNegotiatedDeadline(null);
                      if (setTaskNegotiationNote) setTaskNegotiationNote('');
                      antdMessage.success('Đã áp dụng hạn mới từ đề xuất thương lượng!');
                    }
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Áp dụng hạn đề xuất này</span>
                </button>
                <button
                  type="button"
                  className="h-6 px-2.5 rounded-md text-[11px] font-bold cursor-pointer bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1"
                  onClick={() => {
                    if (setTaskNegotiatedDeadline) setTaskNegotiatedDeadline(null);
                    if (setTaskNegotiationNote) setTaskNegotiationNote('');
                    antdMessage.info('Đã hủy bỏ đề xuất thương lượng');
                  }}
                >
                  <X size={12} />
                  <span>Bác bỏ đề xuất</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5">
              <span>Hẹn giờ nhắc (Reminder)</span>
              {taskRemindMode === 'custom' && customRemindDate && (
                <span className="text-amber-500 font-semibold tabular-nums text-[10.5px]">
                  {customRemindDate.isAfter(dayjs())
                    ? `Nhắc lúc: ${customRemindDate.format('HH:mm DD/MM')}`
                    : 'Chọn thời gian tương lai'}
                </span>
              )}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {REMINDER_PRESETS.map((preset) => {
                const isSelected = taskRemindMode === 'preset' && selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setTaskRemindMode('preset');
                      setSelectedPresetId(preset.id);
                      setTaskRemindSeconds(preset.getSeconds());
                    }}
                    className="h-8 rounded-lg text-[11.5px] font-semibold cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                      border: `1px solid ${isSelected ? '#d4a84b' : borderColor}`,
                      color: isSelected ? '#d4a84b' : token.colorText,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}

              {/* Custom Date & Time Option */}
              <button
                type="button"
                onClick={() => {
                  setTaskRemindMode('custom');
                  if (!customRemindDate) {
                    setCustomRemindDate(dayjs().add(1, 'hour').minute(0).second(0));
                  }
                }}
                className="h-8 rounded-lg text-[11.5px] font-bold cursor-pointer transition-colors col-span-3 flex items-center justify-center gap-1.5"
                style={{
                  background: taskRemindMode === 'custom' ? 'rgba(212, 168, 75, 0.18)' : surfaceRaised,
                  border: `1px solid ${taskRemindMode === 'custom' ? '#d4a84b' : borderColor}`,
                  color: taskRemindMode === 'custom' ? '#d4a84b' : token.colorText,
                }}
              >
                <Calendar size={13} />
                <span>Tùy chỉnh ngày & giờ nhắc hẹn (như ý)</span>
              </button>
            </div>

            {/* Custom Date & Time Picker */}
            {taskRemindMode === 'custom' && (
              <div
                className="p-2.5 rounded-lg space-y-2"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <div className="flex items-center gap-2">
                  <DatePicker
                    showTime={{ format: 'HH:mm' }}
                    format="DD/MM/YYYY HH:mm"
                    value={customRemindDate}
                    onChange={(val) => setCustomRemindDate(val)}
                    disabledDate={(current) => current && current < dayjs().startOf('day')}
                    className="w-full h-8 text-[12px]"
                    placeholder="Chọn ngày và giờ nhắc hẹn..."
                  />
                </div>

                {/* Quick Add Helper Chips */}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-400 mr-0.5">Nhanh:</span>
                  {[
                    { label: '+10 phút', get: () => dayjs().add(10, 'minute') },
                    { label: '+30 phút', get: () => dayjs().add(30, 'minute') },
                    { label: '+1 giờ', get: () => dayjs().add(1, 'hour') },
                    { label: '+2 giờ', get: () => dayjs().add(2, 'hour') },
                    {
                      label: '17:30 hôm nay',
                      get: () => {
                        const t = dayjs().hour(17).minute(30).second(0);
                        return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                      },
                    },
                    {
                      label: '09:00 sáng mai',
                      get: () => dayjs().add(1, 'day').hour(9).minute(0).second(0),
                    },
                    {
                      label: '14:00 chiều mai',
                      get: () => dayjs().add(1, 'day').hour(14).minute(0).second(0),
                    },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setCustomRemindDate(chip.get())}
                      className="px-2 py-0.5 rounded text-[10.5px] cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                      style={{
                        background: 'rgba(212, 168, 75, 0.12)',
                        color: '#d4a84b',
                        border: '1px solid rgba(212, 168, 75, 0.25)',
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Live preview banner */}
                {customRemindDate && (
                  <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-0.5">
                    <Clock size={12} className="shrink-0 text-emerald-400" />
                    <span>
                      Sẽ nhắc hẹn vào lúc{' '}
                      <strong className="text-emerald-300">{customRemindDate.format('HH:mm - DD/MM/YYYY')}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: THƯƠNG LƯỢNG DỜI HẠN CHÓT (MOS-BUG-125) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={negotiateModalOpen}
        zIndex={1360}
        onCancel={() => {
          setNegotiateModalOpen(false);
          setNegotiatingTask(null);
        }}
        onOk={handleSubmitNegotiation}
        confirmLoading={isSubmittingNegotiation}
        okText="Gửi đề xuất dời hạn"
        cancelText="Đóng"
        title={
          <span className="flex items-center gap-2 text-[14px] font-bold text-amber-500">
            <Handshake size={16} />
            <span>Thương Lượng Dời Hạn Chót Task</span>
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 460}
      >
        <div className="space-y-3 py-1">
          {negotiatingTask && (
            <div
              className="p-2.5 rounded-lg text-[12px] space-y-1 text-left"
              style={{ background: surfaceRaised, borderLeft: '3px solid #d4a84b' }}
            >
              <div className="font-extrabold text-[13px]">{negotiatingTask.title}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                <span>
                  Giao bởi: <strong>{negotiatingTask.creatorName || 'Hệ thống'}</strong>
                </span>
                <span>·</span>
                <span>
                  Hạn hiện tại:{' '}
                  <strong className="text-amber-400">
                    {negotiatingTask.deadline
                      ? dayjs(negotiatingTask.deadline).format('HH:mm DD/MM/YYYY')
                      : 'Chưa đặt hạn'}
                  </strong>
                </span>
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              Thời hạn đề xuất dời sang <span className="text-rose-400">*</span>
            </div>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              value={negotiateProposedDeadline}
              onChange={(val) => setNegotiateProposedDeadline(val)}
              className="w-full h-9 text-[12px]"
              placeholder="Chọn ngày và giờ bạn xin dời hạn..."
            />
            {/* Quick helper chips */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              <span className="text-[10px] text-slate-400 mr-0.5">Gợi ý:</span>
              {[
                { label: '+2 giờ', get: () => dayjs().add(2, 'hour') },
                {
                  label: '17:30 hôm nay',
                  get: () => {
                    const t = dayjs().hour(17).minute(30).second(0);
                    return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                  },
                },
                {
                  label: '22:00 hôm nay',
                  get: () => {
                    const t = dayjs().hour(22).minute(0).second(0);
                    return t.isBefore(dayjs()) ? t.add(1, 'day') : t;
                  },
                },
                { label: '12:00 trưa mai', get: () => dayjs().add(1, 'day').hour(12).minute(0).second(0) },
                { label: '17:30 chiều mai', get: () => dayjs().add(1, 'day').hour(17).minute(30).second(0) },
                { label: '+2 ngày', get: () => dayjs().add(2, 'day').hour(17).minute(30).second(0) },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setNegotiateProposedDeadline(chip.get())}
                  className="px-2 py-0.5 rounded text-[10.5px] cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                  style={{
                    background: 'rgba(212, 168, 75, 0.12)',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.25)',
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              Lý do / Giải trình đề xuất dời hạn <span className="text-rose-400">*</span>
            </div>
            <Input.TextArea
              rows={3}
              value={negotiateReason}
              onChange={(e) => setNegotiateReason(e.target.value)}
              placeholder="VD: Đang xử lý khẩn cấp khách VIP tại quầy, xin dời hạn sang 22:00 tối nay..."
            />
          </div>

          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 leading-relaxed text-left">
            💡 Khi gửi đề xuất, người giao việc ({negotiatingTask?.creatorName || 'người tạo'}) sẽ nhận được thông báo
            để xét duyệt hoặc phản hồi trao đổi.
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: CHUYỂN VÀO mOS MISSION (1-CLICK DISPATCH) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={missionModalOpen && isStrictDannySuperAdmin}
        zIndex={1360}
        onCancel={() => !isDispatchingMission && setMissionModalOpen(false)}
        footer={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400 text-left leading-snug min-w-0">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/15 text-amber-400 shrink-0 text-[10px]">
                ⚡
              </span>
              <span className="truncate">
                Tự động duyệt <strong className="text-slate-200 font-semibold">Cổng 1</strong> & đồng bộ 2 chiều ngay
                trong luồng Chat
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={isDispatchingMission}
                onClick={() => setMissionModalOpen(false)}
                className="h-9 px-3.5 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center cursor-pointer transition-all hover:opacity-90 shrink-0 whitespace-nowrap"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}`, color: token.colorText }}
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={isDispatchingMission || !missionTitle.trim()}
                onClick={() => void handleConfirmDispatchMission()}
                className="h-9 px-4 rounded-lg text-[12.5px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all hover:brightness-105 disabled:opacity-50 shrink-0 whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#04130d',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                }}
              >
                {isDispatchingMission ? (
                  <Loader2 size={14} className="animate-spin shrink-0" />
                ) : (
                  <Rocket size={15} className="shrink-0" />
                )}
                <span>{isDispatchingMission ? 'Đang chuyển sang mOS Mission...' : 'Chuyển vào mOS Mission'}</span>
              </button>
            </div>
          </div>
        }
        title={
          <div className="flex items-center justify-between gap-2 pr-6 flex-wrap">
            <span className="inline-flex items-center gap-2 text-[15px] font-extrabold">
              <span
                className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(167, 139, 250, 0.16)',
                  border: '1px solid rgba(167, 139, 250, 0.35)',
                  color: '#c4b5fd',
                }}
              >
                <Rocket size={15} />
              </span>
              <span>Chuyển vào mOS Mission</span>
            </span>
            <span
              className="inline-flex items-center justify-center leading-none gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold"
              style={{
                background: 'rgba(16, 185, 129, 0.14)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
              }}
            >
              <span>Đích kế tiếp: mOS Mission · Cổng 1</span>
            </span>
          </div>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 560}
      >
        <div className="space-y-3.5 py-1.5">
          {/* Next Destination Flow Banner */}
          <div
            className="px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-[11px]"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(248, 250, 252, 0.95)',
              border: `1px solid ${borderColor}`,
            }}
          >
            <div className="flex items-center gap-1.5 font-semibold text-slate-400 min-w-0">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold shrink-0">
                1
              </span>
              <span className="truncate">Luồng mOS Chat</span>
            </div>
            <span className="text-slate-500 shrink-0">→</span>
            <div className="flex items-center gap-1.5 font-extrabold text-emerald-400 min-w-0">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                2
              </span>
              <span className="truncate">mOS Mission (Cổng 1)</span>
            </div>
            <span className="text-slate-500 shrink-0">→</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-400 min-w-0">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                3
              </span>
              <span className="truncate">Xử lý & Nghiệm thu</span>
            </div>
          </div>

          {missionSourceMsg && (
            <div
              className="p-3 rounded-xl text-[12px] space-y-1.5"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderStrong}`,
                borderLeft: '3.5px solid #a78bfa',
              }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-purple-300 inline-flex items-center gap-1.5">
                  <span>📦 Gói ngữ cảnh từ {missionSourceMsg.senderName}</span>
                </span>
                <span
                  className="inline-flex items-center justify-center leading-none px-2 py-1 rounded-md text-[10.5px] font-bold tabular-nums"
                  style={{
                    background: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.06)',
                    color: token.colorTextSecondary,
                  }}
                >
                  {1 + (missionSourceMsg.thread?.length || 0)} tin nhắn ·{' '}
                  {(missionSourceMsg.attachments?.length || 0) +
                    (missionSourceMsg.thread || []).reduce(
                      (acc: number, r: SafeAny) => acc + (r.attachments?.length || 0),
                      0
                    )}{' '}
                  hình ảnh
                </span>
              </div>
              <div className="text-[11.5px] opacity-90 line-clamp-3 whitespace-pre-wrap leading-relaxed">
                &ldquo;{missionSourceMsg.text}&rdquo;
              </div>
            </div>
          )}

          <div>
            <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">Tiêu đề Ticket trên mOS Mission</div>
            <Input
              value={missionTitle}
              onChange={(e) => setMissionTitle(e.target.value)}
              placeholder="Nhập tiêu đề nhiệm vụ chuyển vào mOS Mission..."
            />
          </div>

          <div>
            <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">Phân loại nhiệm vụ</div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: 'FEATURE' as const, label: '✨ Tính năng / Nâng cấp mới', color: '#a78bfa' },
                { key: 'BUG' as const, label: '🐞 Sửa lỗi vận hành (Bug)', color: '#f43f5e' },
              ].map((opt) => {
                const active = missionType === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setMissionType(opt.key)}
                    className="h-9 px-3 rounded-lg text-[12px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all whitespace-nowrap"
                    style={{
                      background: active ? `${opt.color}22` : surfaceRaised,
                      border: `1.5px solid ${active ? opt.color : borderColor}`,
                      color: active ? opt.color : token.colorText,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-[11.5px] font-bold text-slate-300 mb-1.5">
              Chỉ đạo / Ghi chú triển khai cho mOS Mission (Tuỳ chọn)
            </div>
            <Input.TextArea
              rows={2}
              value={missionNote}
              onChange={(e) => setMissionNote(e.target.value)}
              placeholder="VD: Áp dụng đúng quy chuẩn Combo Elsa của Bảo Hân, giữ nguyên layout bảng..."
            />
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: CREATE NEW SPACE OR DM ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={newRoomModalOpen}
        zIndex={1350}
        onCancel={() => {
          setNewRoomModalOpen(false);
          setRoomSearchQuery('');
          setRoomGroupFilter('ALL');
          setSelectedMemberIds([]);
        }}
        footer={
          newRoomType === 'space' ? (
            <div className="flex items-center justify-between pt-2">
              <span className="text-[12px] text-slate-400 font-medium tabular-nums">
                Đã chọn: <strong className="text-emerald-500">{selectedMemberIds.length}</strong> thành viên
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewRoomModalOpen(false);
                    setRoomSearchQuery('');
                    setRoomGroupFilter('ALL');
                    setSelectedMemberIds([]);
                    setNewRoomEmoji('');
                    setNewRoomColor('#1a73e8');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}`, color: token.colorText }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateSpace}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer"
                  style={{ background: '#3b82f6' }}
                >
                  Tạo Space
                </button>
              </div>
            </div>
          ) : null
        }
        title={
          <span className="text-[15px] font-extrabold flex items-center gap-2">
            {newRoomType === 'space' ? (
              <>
                <Hash size={18} className="text-blue-500" />
                <span>Tạo Không gian làm việc mới (Space)</span>
              </>
            ) : (
              <>
                <MessageSquare size={18} className="text-emerald-500" />
                <span>Bắt đầu cuộc trò chuyện 1-1</span>
              </>
            )}
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 520}
      >
        {newRoomType === 'dm' ? (
          <div className="space-y-3 py-2">
            {/* Search Input */}
            <Input
              prefix={<Search size={14} className="text-slate-400 mr-1" />}
              value={roomSearchQuery}
              onChange={(e) => setRoomSearchQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc username đồng nghiệp..."
              allowClear
            />

            {/* Quick Department / Team Filter Pills for 1-1 Directory */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setRoomGroupFilter('ALL')}
                className="px-2 py-1 rounded-full text-[10.5px] font-bold shrink-0 cursor-pointer transition-colors"
                style={{
                  background: roomGroupFilter === 'ALL' ? '#3b82f6' : surfaceRaised,
                  color: roomGroupFilter === 'ALL' ? '#ffffff' : token.colorTextSecondary,
                  border: `1px solid ${roomGroupFilter === 'ALL' ? '#3b82f6' : borderColor}`,
                }}
              >
                Tất cả ({staffDirectory.length})
              </button>
              {SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((grp) => {
                const count = staffDirectory.filter((m) => matchesStaffGroup(m, grp.key)).length;
                if (count === 0) return null;
                const active = roomGroupFilter === grp.key;
                return (
                  <button
                    key={grp.key}
                    type="button"
                    onClick={() => setRoomGroupFilter(active ? 'ALL' : grp.key)}
                    className="px-2 py-1 rounded-full text-[10.5px] font-bold shrink-0 cursor-pointer transition-colors"
                    style={{
                      background: active ? `${grp.color}28` : surfaceRaised,
                      color: active ? grp.color : token.colorTextSecondary,
                      border: `1px solid ${active ? grp.color : borderColor}`,
                    }}
                  >
                    {grp.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Self Chat Option ("Chat với chính tôi") */}
            <div
              onClick={handleSelectSelfChat}
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all hover:brightness-105 border border-amber-500/30"
              style={{ background: 'rgba(212, 168, 75, 0.08)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                style={{ background: '#d4a84b', color: '#000' }}
              >
                Tôi
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[12.5px] text-amber-500">
                    Tin nhắn cho chính tôi (Self Chat)
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                    Sổ tay cá nhân
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Lưu trữ ghi chú, nháp tin nhắn, ảnh, tài liệu và tạo task nhắc hẹn riêng tư
                </div>
              </div>
            </div>

            {/* Colleagues List */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                Danh bạ đồng nghiệp ({staffDirectory.length})
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                {staffDirectory
                  .filter((m) => {
                    if (Number(m.id) === Number(currentUser?.id)) return false;
                    if (roomGroupFilter !== 'ALL' && !matchesStaffGroup(m, roomGroupFilter)) return false;
                    if (!roomSearchQuery.trim()) return true;
                    const q = removeVietnameseTones(roomSearchQuery.trim().toLowerCase());
                    const name = removeVietnameseTones((m.displayName || '').toLowerCase());
                    const user = removeVietnameseTones((m.username || '').toLowerCase());
                    const role = removeVietnameseTones((m.role || '').toLowerCase());
                    return name.includes(q) || user.includes(q) || role.includes(q);
                  })
                  .map((m) => {
                    const isAdm = m.role?.toLowerCase().includes('admin');
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleSelectColleague(m)}
                        className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-500/10"
                        style={{ border: `1px solid ${borderColor}` }}
                      >
                        {renderUserAvatarNode({
                          name: m.displayName || m.username,
                          avatarUrl: m.avatarUrl,
                          staffId: m.id,
                          sizeClass: 'w-8 h-8',
                          textClass: 'text-xs',
                          bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                          onlineDot: Boolean(m.isOnline),
                        })}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[12.5px] truncate">{m.displayName || m.username}</span>
                            <span
                              className="text-[9.5px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0"
                              style={{
                                background: isAdm ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: isAdm ? '#c084fc' : '#60a5fa',
                              }}
                            >
                              {m.role || 'Nhân sự'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">@{m.username}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Biểu tượng Emoji & Màu sắc Space
              </div>
              <MosChatSpaceEmojiColorPicker
                selectedEmoji={newRoomEmoji}
                selectedColor={newRoomColor}
                spaceName={newRoomName}
                onEmojiChange={setNewRoomEmoji}
                onColorChange={setNewRoomColor}
                size="large"
              />
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">Tên Không gian (Space) *</div>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="VD: ke-hoach-tuan-moi, chien-dich-tet"
              />
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 mb-1">Mục đích hoạt động (Tùy chọn)</div>
              <Input
                value={newRoomSubtitle}
                onChange={(e) => setNewRoomSubtitle(e.target.value)}
                placeholder="VD: Không gian trao đổi ban quản trị và trưởng bộ phận"
              />
            </div>

            {/* ================= 1-CLICK DEPARTMENT & TEAM / GROUP SELECTOR ================= */}
            <div
              className="p-2.5 rounded-xl space-y-2"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={13} />
                  <span>Chọn nhanh theo Bộ phận (Department) & Nhóm</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMemberIds(staffDirectory.map((s) => s.id))}
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 cursor-pointer"
                  >
                    Chọn tất cả ({staffDirectory.length})
                  </button>
                  {selectedMemberIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const myId = Number(currentUser?.id);
                        setSelectedMemberIds(myId ? [myId] : []);
                      }}
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  )}
                </div>
              </div>

              {/* Row 1: 4 Core Departments */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1">Bộ phận (Department):</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'department').map((dept) => {
                    const deptMembers = staffDirectory.filter((m) => matchesStaffGroup(m, dept.key));
                    const total = deptMembers.length;
                    const selectedCount = deptMembers.filter((m) => selectedMemberIds.includes(m.id)).length;
                    const isAllSelected = total > 0 && selectedCount === total;
                    const isPartial = selectedCount > 0 && selectedCount < total;

                    return (
                      <button
                        key={dept.key}
                        type="button"
                        onClick={() => handleToggleDepartmentOrTeam(dept)}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left cursor-pointer transition-all"
                        style={{
                          background: isAllSelected ? `${dept.color}24` : isPartial ? `${dept.color}12` : canvasBg,
                          border: `1px solid ${isAllSelected || isPartial ? dept.color : borderColor}`,
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-white"
                            style={{
                              background: isAllSelected || isPartial ? dept.color : 'transparent',
                              border: `1px solid ${isAllSelected || isPartial ? dept.color : '#64748b'}`,
                            }}
                          >
                            {isAllSelected ? (
                              <Check size={10} strokeWidth={3} />
                            ) : isPartial ? (
                              <Minus size={10} strokeWidth={3} />
                            ) : null}
                          </span>
                          <span className="text-[11.5px] font-bold truncate" style={{ color: token.colorText }}>
                            {dept.label}
                          </span>
                        </div>
                        <span
                          className="text-[10.5px] font-extrabold tabular-nums ml-1.5 shrink-0"
                          style={{ color: isAllSelected || isPartial ? dept.color : token.colorTextSecondary }}
                        >
                          {selectedCount}/{total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: 8 Specialized Teams / Role Groups */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 mb-1">Nhóm chuyên môn (Team / Chức danh):</div>
                <div className="flex flex-wrap gap-1.5">
                  {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'team').map((team) => {
                    const teamMembers = staffDirectory.filter((m) => matchesStaffGroup(m, team.key));
                    const total = teamMembers.length;
                    const selectedCount = teamMembers.filter((m) => selectedMemberIds.includes(m.id)).length;
                    const isAllSelected = total > 0 && selectedCount === total;
                    const isPartial = selectedCount > 0 && selectedCount < total;

                    return (
                      <button
                        key={team.key}
                        type="button"
                        onClick={() => handleToggleDepartmentOrTeam(team)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-left cursor-pointer transition-all"
                        style={{
                          background: isAllSelected ? `${team.color}24` : isPartial ? `${team.color}12` : canvasBg,
                          border: `1px solid ${isAllSelected || isPartial ? team.color : borderColor}`,
                        }}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex items-center justify-center shrink-0 text-white"
                          style={{
                            background: isAllSelected || isPartial ? team.color : 'transparent',
                            border: `1px solid ${isAllSelected || isPartial ? team.color : '#64748b'}`,
                          }}
                        >
                          {isAllSelected ? (
                            <Check size={8} strokeWidth={3} />
                          ) : isPartial ? (
                            <Minus size={8} strokeWidth={3} />
                          ) : null}
                        </span>
                        <span className="text-[10.5px] font-bold whitespace-nowrap" style={{ color: token.colorText }}>
                          {team.label}
                        </span>
                        <span
                          className="text-[9.5px] font-extrabold tabular-nums opacity-85"
                          style={{ color: isAllSelected || isPartial ? team.color : token.colorTextSecondary }}
                        >
                          ({selectedCount}/{total})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Individual Member Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Chọn thành viên tham gia nhóm
                </span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {selectedMemberIds.length}/{staffDirectory.length} người
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <Input
                  prefix={<Search size={13} className="text-slate-400 mr-1" />}
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  placeholder="Tìm thành viên..."
                  size="small"
                  className="flex-1"
                  allowClear
                />
                <Select
                  size="small"
                  value={roomGroupFilter}
                  onChange={setRoomGroupFilter}
                  className="w-44"
                  options={[
                    { value: 'ALL', label: `Tất cả bộ phận (${staffDirectory.length})` },
                    ...SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => ({
                      value: g.key,
                      label: `${g.label} (${staffDirectory.filter((m) => matchesStaffGroup(m, g.key)).length})`,
                    })),
                  ]}
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {staffDirectory
                  .filter((m) => {
                    if (roomGroupFilter !== 'ALL' && !matchesStaffGroup(m, roomGroupFilter)) return false;
                    if (!roomSearchQuery.trim()) return true;
                    const q = removeVietnameseTones(roomSearchQuery.trim().toLowerCase());
                    const name = removeVietnameseTones((m.displayName || '').toLowerCase());
                    const user = removeVietnameseTones((m.username || '').toLowerCase());
                    const role = removeVietnameseTones((m.role || '').toLowerCase());
                    return name.includes(q) || user.includes(q) || role.includes(q);
                  })
                  .map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    const isMe = Number(m.id) === Number(currentUser?.id);
                    const isAdm = m.role?.toLowerCase().includes('admin');
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          if (isMe) return;
                          setSelectedMemberIds((prev) =>
                            prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors border ${
                          isSelected ? 'border-blue-500/50 bg-blue-500/10' : 'border-transparent hover:bg-slate-500/10'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-white shrink-0 ${
                            isSelected || isMe ? 'bg-blue-500 border-blue-500' : 'border-slate-400'
                          }`}
                        >
                          {(isSelected || isMe) && <Check size={11} strokeWidth={3} />}
                        </div>
                        {renderUserAvatarNode({
                          name: m.displayName || m.username,
                          avatarUrl: m.avatarUrl,
                          staffId: m.id,
                          sizeClass: 'w-6 h-6',
                          textClass: 'text-[10px]',
                          bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                          onlineDot: Boolean(m.isOnline),
                        })}
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <span className="text-xs font-semibold truncate">
                            {m.displayName || m.username} {isMe && '(Bạn - Trưởng nhóm)'}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1 shrink-0">{m.role}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: SPACE MEMBERS MANAGEMENT (GOOGLE CHAT WORKSPACE STYLE) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={spaceMembersModalOpen}
        zIndex={1350}
        onCancel={() => setSpaceMembersModalOpen(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            <span className="text-[15px] font-extrabold">Thành viên Không gian · #{activeConversation?.name}</span>
          </div>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 520}
      >
        <div className="space-y-4 py-2">
          {/* Add member section */}
          <div className="p-3 rounded-xl border space-y-2.5" style={{ background: surfaceRaised, borderColor }}>
            <div className="text-[11.5px] font-bold text-slate-300 flex items-center gap-1.5">
              <UserPlus size={14} className="text-emerald-500" />
              <span>Thêm thành viên hoặc cả Bộ phận / Nhóm vào Không gian</span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                showSearch
                className="flex-1"
                placeholder="Chọn đồng nghiệp để thêm..."
                value={addMemberSelectedStaffId}
                onChange={setAddMemberSelectedStaffId}
                filterOption={(input, option) => {
                  const normInput = removeVietnameseTones(input.trim().toLowerCase());
                  if (!normInput) return true;
                  const normLabel = removeVietnameseTones(String(option?.label || '').toLowerCase());
                  return normLabel.includes(normInput);
                }}
                options={staffDirectory
                  .filter((s) => !activeConversation?.memberIds?.includes(s.id))
                  .map((s) => ({
                    value: s.id,
                    label: `${s.displayName || s.username} (${s.role || 'NV'})`,
                  }))}
              />
              <button
                type="button"
                disabled={!addMemberSelectedStaffId}
                onClick={async () => {
                  if (addMemberSelectedStaffId) {
                    await handleAddMemberToSpace(addMemberSelectedStaffId);
                    setAddMemberSelectedStaffId(null);
                  }
                }}
                className="h-8 px-3 rounded-lg text-xs font-bold text-white transition-opacity disabled:opacity-40 cursor-pointer"
                style={{ background: '#10b981' }}
              >
                Thêm
              </button>
            </div>

            {/* 1-Click Add Entire Department / Team into Existing Space */}
            <div className="pt-1 border-t" style={{ borderColor }}>
              <div className="text-[10.5px] font-bold text-slate-400 mb-1.5">
                Thêm nhanh cả Bộ phận (Department) / Nhóm:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((grp) => {
                  const existingSet = new Set(activeConversation?.memberIds || []);
                  const missingCount = staffDirectory.filter(
                    (m) => matchesStaffGroup(m, grp.key) && !existingSet.has(m.id)
                  ).length;
                  if (missingCount === 0) return null;
                  return (
                    <button
                      key={grp.key}
                      type="button"
                      onClick={() => handleBulkAddGroupToSpace(grp)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-bold cursor-pointer transition-all hover:opacity-90"
                      style={{
                        background: `${grp.color}18`,
                        border: `1px solid ${grp.color}66`,
                        color: grp.color,
                      }}
                    >
                      <Plus size={11} />
                      <span>{grp.label}</span>
                      <span className="tabular-nums opacity-85">(+{missingCount})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Current members list */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Danh sách thành viên hiện tại</span>
              <span className="text-emerald-400 font-extrabold tabular-nums">
                {activeConversation?.memberCount || activeConversation?.memberIds?.length || 1} người
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {staffDirectory
                .filter((s) => activeConversation?.memberIds?.includes(s.id))
                .map((m) => {
                  const isMe = Number(m.id) === Number(currentUser?.id);
                  const isAdm = m.role?.toLowerCase().includes('admin');
                  const nick = activeConversation?.memberNicknames?.[String(m.id)];
                  const canEditNick = isMe || isStrictDannySuperAdmin;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg border gap-2"
                      style={{ background: surfaceRaised, borderColor }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {renderUserAvatarNode({
                          name: m.displayName || m.username,
                          avatarUrl: m.avatarUrl,
                          staffId: m.id,
                          sizeClass: 'w-8 h-8',
                          textClass: 'text-xs',
                          bgStyle: isAdm ? '#a855f7' : '#3b82f6',
                          onlineDot: Boolean(m.isOnline),
                        })}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {nick ? (
                              <>
                                <span className="font-extrabold text-[12.5px] text-emerald-400 truncate">{nick}</span>
                                <span className="text-[11px] text-slate-400 truncate font-normal">
                                  ({m.displayName || m.username})
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-[12.5px] truncate">{m.displayName || m.username}</span>
                            )}
                            {isMe && (
                              <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <span>{m.role || 'Nhân sự'}</span>
                            {nick && <span className="text-emerald-500/80 font-medium">· Đã đặt biệt danh</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {canEditNick && (
                          <Tooltip
                            title={
                              isMe
                                ? 'Đổi biệt danh của bạn trong Không gian này'
                                : `Đổi biệt danh cho ${m.displayName || m.username}`
                            }
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenNicknameModal(m.id)}
                              className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/10 cursor-pointer transition-colors"
                            >
                              <Pencil size={11} />
                              <span>{nick ? 'Sửa biệt danh' : 'Đặt biệt danh'}</span>
                            </button>
                          </Tooltip>
                        )}

                        {/* Remove button */}
                        {!isMe && (
                          <Popconfirm
                            title="Xóa thành viên"
                            description={`Bạn có chắc muốn xóa ${m.displayName || m.username} khỏi Không gian này?`}
                            onConfirm={() => handleRemoveMemberFromSpace(m.id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <button
                              type="button"
                              aria-label={`Xóa ${m.displayName || m.username} khỏi nhóm`}
                              className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                            >
                              <UserMinus size={13} />
                              <span>Xóa</span>
                            </button>
                          </Popconfirm>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: SPACE CONFIGURATION & EMOJI SELECTION (MOS-BUG-140) ================= */}
      <MosChatSpaceConfigModal
        open={spaceConfigModalOpen}
        conversation={activeConversation}
        onClose={() => setSpaceConfigModalOpen(false)}
        onUpdated={(updatedConv: SafeAny) => {
          setConversations((prev) => prev.map((c) => (c.id === updatedConv.id ? { ...c, ...updatedConv } : c)));
          notifyLivePeers();
        }}
        onOpenMembersModal={() => setSpaceMembersModalOpen(true)}
      />

      {/* ================= MODAL: EDIT MEMBER NICKNAME IN GROUP (PER-SPACE NICKNAMES) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={Boolean(editingNicknameTarget)}
        zIndex={1400}
        onCancel={() => {
          if (!isUpdatingNickname) {
            setEditingNicknameTarget(null);
            setNicknameInputVal('');
          }
        }}
        footer={null}
        width={420}
        title={
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-amber-500" />
            <span className="text-[14.5px] font-extrabold">
              {editingNicknameTarget?.isMe
                ? 'Đổi biệt danh của bạn'
                : `Đổi biệt danh cho ${editingNicknameTarget?.displayName || 'thành viên'}`}
            </span>
          </div>
        }
      >
        <div className="py-2 space-y-3">
          <div className="text-[12px] text-slate-400">
            Biệt danh này chỉ áp dụng riêng cho Không gian{' '}
            <strong className="text-amber-500 font-bold">#{activeConversation?.name}</strong>. Mọi người trong nhóm sẽ
            thấy tên này và có thể tag bạn bằng biệt danh này.
          </div>

          <div className="space-y-1">
            <label className="text-[11.5px] font-bold text-slate-300">Biệt danh trong nhóm:</label>
            <Input
              autoFocus
              placeholder="Nhập biệt danh (VD: Danny Cực Chill, Bé Hoa Lash...)"
              value={nicknameInputVal}
              maxLength={40}
              onChange={(e) => setNicknameInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveNickname();
                }
              }}
              disabled={isUpdatingNickname}
            />
            <div className="text-[10.5px] text-slate-500 flex justify-between pt-0.5">
              <span>Để trống và bấm Lưu nếu muốn quay lại tên thật ban đầu.</span>
              <span className="tabular-nums">{nicknameInputVal.length}/40</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor }}>
            {editingNicknameTarget?.currentNickname && (
              <button
                type="button"
                disabled={isUpdatingNickname}
                onClick={() => handleSaveNickname('')}
                className="h-8 px-3 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors mr-auto"
              >
                Gỡ biệt danh
              </button>
            )}
            <button
              type="button"
              disabled={isUpdatingNickname}
              onClick={() => {
                setEditingNicknameTarget(null);
                setNicknameInputVal('');
              }}
              className="h-8 px-3 rounded-lg text-xs font-bold text-slate-400 hover:bg-white/5 cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isUpdatingNickname}
              onClick={() => handleSaveNickname(nicknameInputVal)}
              className="h-8 px-4 rounded-lg text-xs font-bold text-black transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
              style={{ background: '#d4a84b' }}
            >
              {isUpdatingNickname ? 'Đang lưu...' : 'Lưu biệt danh'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: ATTACH IMAGE FROM GOOGLE DRIVE / LOCAL DRIVE ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={driveLinkModalOpen}
        zIndex={1350}
        onCancel={() => setDriveLinkModalOpen(false)}
        onOk={handleConfirmDriveLink}
        okText="Đính kèm hình Drive"
        cancelText="Đóng"
        title={
          <span className="flex items-center gap-2 text-[14px] font-bold">
            <HardDrive size={16} className="text-amber-500" />
            <span>Tải hình từ Google Drive / Ổ đĩa</span>
          </span>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 430}
      >
        <div className="space-y-3 py-1">
          <div>
            <div className="text-[11px] font-bold text-slate-400 mb-1">
              Cách 1: Dán đường dẫn hình ảnh trên Google Drive
            </div>
            <Input
              value={driveLinkInput}
              onChange={(e) => setDriveLinkInput(e.target.value)}
              onPressEnter={handleConfirmDriveLink}
              placeholder="https://drive.google.com/file/d/..."
            />
          </div>

          <div className="pt-1">
            <div className="text-[11px] font-bold text-slate-400 mb-1.5">
              Cách 2: Chọn tệp hình từ Google Drive Desktop / Máy tính
            </div>
            <button
              type="button"
              onClick={() => {
                setDriveLinkModalOpen(false);
                const target = uploadTargetRef.current;
                triggerFilePicker(target.scope, target.convId);
              }}
              className="w-full h-9 rounded-lg inline-flex items-center justify-center gap-2 text-[12px] font-bold cursor-pointer"
              style={{
                background: surfaceRaised,
                border: `1px dashed ${borderStrong}`,
                color: '#d4a84b',
              }}
            >
              <ImagePlus size={15} />
              <span>Chọn tệp ảnh từ Ổ đĩa / Google Drive...</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= MOS CHAT & MAI COPILOT ACCESS CONTROL MODAL (DEPARTMENT / TEAM / INDIVIDUAL) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={accessConfigModalOpen}
        zIndex={1350}
        onCancel={() => setAccessConfigModalOpen(false)}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 680}
        destroyOnClose
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2 text-[14px] font-extrabold">
              <ShieldCheck size={17} className="text-violet-400" />
              <span>Phân quyền truy cập mOS Chat & mOS AI (MAI)</span>
            </div>
            {savingAccessConfig && (
              <span className="text-[11px] font-bold text-amber-400 animate-pulse">Đang lưu cấu hình...</span>
            )}
          </div>
        }
      >
        {(() => {
          const isChatTab = accessConfigTab === 'chat';
          const activeGroupKeys = isChatTab
            ? accessConfig.allowedGroupKeys || []
            : accessConfig.aiCopilotAllowedGroupKeys || [];
          const activeStaffIds = isChatTab
            ? accessConfig.allowedStaffIds || []
            : accessConfig.aiCopilotAllowedStaffIds || [];

          const toggleGroupKey = (groupKey: string) => {
            const exists = activeGroupKeys.includes(groupKey);
            const nextGroups = exists
              ? activeGroupKeys.filter((k: string) => k !== groupKey)
              : [...activeGroupKeys, groupKey];
            if (isChatTab) {
              void persistAccessConfig(
                {
                  ...accessConfig,
                  allowAllStaff: false,
                  allowedGroupKeys: nextGroups,
                },
                true
              );
            } else {
              void persistAccessConfig(
                {
                  ...accessConfig,
                  aiCopilotAllowedGroupKeys: nextGroups,
                },
                true
              );
            }
          };

          const toggleIndividualStaff = (staffId: number) => {
            if (!staffId || staffId <= 0) return;
            const exists = activeStaffIds.includes(staffId);
            const nextStaffIds = exists
              ? activeStaffIds.filter((id: number) => id !== staffId)
              : [...activeStaffIds, staffId];
            if (isChatTab) {
              void persistAccessConfig(
                {
                  ...accessConfig,
                  allowedStaffIds: nextStaffIds,
                },
                true
              );
            } else {
              void persistAccessConfig(
                {
                  ...accessConfig,
                  aiCopilotAllowedStaffIds: nextStaffIds,
                },
                true
              );
            }
          };

          const totalAllowedCount = staffDirectory.filter((m) =>
            isChatTab
              ? isStaffMemberAllowedInChat(m, accessConfig).allowed
              : isStaffMemberAllowedInAi(m, accessConfig).allowed
          ).length;

          const q = removeVietnameseTones(accessStaffSearch.trim().toLowerCase());
          const filteredStaffForAccess = staffDirectory.filter((m) => {
            if (accessGroupFilter === 'ALLOWED_ONLY') {
              const allowed = isChatTab
                ? isStaffMemberAllowedInChat(m, accessConfig).allowed
                : isStaffMemberAllowedInAi(m, accessConfig).allowed;
              if (!allowed) return false;
            } else if (accessGroupFilter === 'INDIVIDUAL_ONLY') {
              if (!activeStaffIds.includes(m.id)) return false;
            } else if (accessGroupFilter !== 'ALL') {
              if (!matchesStaffGroup(m, accessGroupFilter)) return false;
            }
            if (!q) return true;
            const hay = removeVietnameseTones(`${m.displayName} ${m.username} ${m.role}`.toLowerCase());
            return hay.includes(q);
          });

          return (
            <div className="space-y-3.5 pt-2">
              {/* Top Mode Switcher: mOS Chat Access vs mOS AI (MAI) Access */}
              <div
                className="grid grid-cols-2 gap-2 p-1 rounded-xl"
                style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
              >
                <button
                  type="button"
                  onClick={() => setAccessConfigTab('chat')}
                  className="h-9 rounded-lg px-3 flex items-center justify-center gap-2 text-[12px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background: isChatTab ? 'linear-gradient(135deg, #d4a84b, #b8860b)' : 'transparent',
                    color: isChatTab ? '#090d16' : token.colorTextSecondary,
                  }}
                >
                  <MessageSquare size={14} />
                  <span>
                    Quyền vào mOS Chat (
                    {staffDirectory.filter((m) => isStaffMemberAllowedInChat(m, accessConfig).allowed).length}/
                    {staffDirectory.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccessConfigTab('ai')}
                  className="h-9 rounded-lg px-3 flex items-center justify-center gap-2 text-[12px] font-extrabold cursor-pointer transition-all"
                  style={{
                    background: !isChatTab ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'transparent',
                    color: !isChatTab ? '#ffffff' : token.colorTextSecondary,
                  }}
                >
                  <Bot size={15} />
                  <span>
                    Quyền dùng mOS AI (MAI) (
                    {staffDirectory.filter((m) => isStaffMemberAllowedInAi(m, accessConfig).allowed).length}/
                    {staffDirectory.length})
                  </span>
                </button>
              </div>

              {/* Quick Presets Bar */}
              <div
                className="p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2"
                style={{
                  background: isChatTab ? 'rgba(212, 168, 75, 0.08)' : 'rgba(139, 92, 246, 0.08)',
                  border: isChatTab ? '1px solid rgba(212, 168, 75, 0.28)' : '1px solid rgba(139, 92, 246, 0.28)',
                }}
              >
                <div className="text-[11.5px] leading-relaxed" style={{ color: token.colorText }}>
                  {isChatTab ? (
                    <>
                      Chọn <b>Bộ phận / Đội nhóm</b> hoặc <b>Cá nhân</b> được phép nhìn thấy biểu tượng và truy cập{' '}
                      <b>mOS Chat</b>. (Admin & Danny luôn có toàn quyền).
                    </>
                  ) : (
                    <>
                      Chọn <b>Bộ phận / Đội nhóm</b> hoặc <b>Cá nhân</b> được phép chat 1-1 với <b>🤖 MAI</b> và gọi{' '}
                      <code>@MAI</code> trong nhóm Space.
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {isChatTab ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              allowAllStaff: false,
                              allowedGroupKeys: [],
                              allowedStaffIds: [],
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            !accessConfig.allowAllStaff &&
                            accessConfig.allowedGroupKeys.length === 0 &&
                            accessConfig.allowedStaffIds.length === 0
                              ? '#d4a84b'
                              : surfaceBg,
                          color:
                            !accessConfig.allowAllStaff &&
                            accessConfig.allowedGroupKeys.length === 0 &&
                            accessConfig.allowedStaffIds.length === 0
                              ? '#090d16'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        👑 Chỉ Admin / Danny
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              allowAllStaff: false,
                              allowedGroupKeys: ['TEAM_ADMIN_MANAGER'],
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            !accessConfig.allowAllStaff &&
                            accessConfig.allowedGroupKeys.length === 1 &&
                            accessConfig.allowedGroupKeys[0] === 'TEAM_ADMIN_MANAGER'
                              ? '#f59e0b'
                              : surfaceBg,
                          color:
                            !accessConfig.allowAllStaff &&
                            accessConfig.allowedGroupKeys.length === 1 &&
                            accessConfig.allowedGroupKeys[0] === 'TEAM_ADMIN_MANAGER'
                              ? '#090d16'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        🛡️ Ban Quản Trị & Manager
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              allowAllStaff: !accessConfig.allowAllStaff,
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background: accessConfig.allowAllStaff ? '#10b981' : surfaceBg,
                          color: accessConfig.allowAllStaff ? '#052e16' : token.colorTextSecondary,
                          border: `1px solid ${accessConfig.allowAllStaff ? '#10b981' : borderStrong}`,
                        }}
                      >
                        🌐 {accessConfig.allowAllStaff ? 'Đang mở Toàn hệ thống (ON)' : 'Mở Toàn hệ thống'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              aiCopilotAllowedGroupKeys: [],
                              aiCopilotAllowedStaffIds: [],
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length === 0 &&
                            (accessConfig.aiCopilotAllowedStaffIds || []).length === 0
                              ? '#8b5cf6'
                              : surfaceBg,
                          color:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length === 0 &&
                            (accessConfig.aiCopilotAllowedStaffIds || []).length === 0
                              ? '#ffffff'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        👑 Chỉ Admin / Danny
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              aiCopilotAllowedGroupKeys: ['TEAM_ADMIN_MANAGER'],
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length === 1 &&
                            accessConfig.aiCopilotAllowedGroupKeys?.[0] === 'TEAM_ADMIN_MANAGER'
                              ? '#a855f7'
                              : surfaceBg,
                          color:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length === 1 &&
                            accessConfig.aiCopilotAllowedGroupKeys?.[0] === 'TEAM_ADMIN_MANAGER'
                              ? '#ffffff'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        🛡️ Ban Quản Trị & Manager
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void persistAccessConfig(
                            {
                              ...accessConfig,
                              aiCopilotAllowedGroupKeys: SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => g.key),
                            },
                            true
                          )
                        }
                        className="h-7 px-2.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-all"
                        style={{
                          background:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length ===
                            SPACE_DEPARTMENT_AND_TEAM_GROUPS.length
                              ? '#10b981'
                              : surfaceBg,
                          color:
                            (accessConfig.aiCopilotAllowedGroupKeys || []).length ===
                            SPACE_DEPARTMENT_AND_TEAM_GROUPS.length
                              ? '#052e16'
                              : token.colorTextSecondary,
                          border: `1px solid ${borderStrong}`,
                        }}
                      >
                        🌐 Mở Cho Tất Cả Bộ Phận
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* SECTION 1: DEPARTMENT & TEAM GROUPS SELECTOR */}
              <div
                className="p-3 rounded-xl space-y-2.5"
                style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                    1. Phân quyền theo Bộ phận (Department) & Đội nhóm
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    Bấm để Bật / Tắt quyền truy cập cho toàn bộ nhân sự trong nhóm
                  </span>
                </div>

                {/* Core Departments */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Bộ phận chủ quản (Departments)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'department').map((group) => {
                      const count = staffDirectory.filter((m) => matchesStaffGroup(m, group.key)).length;
                      const isEnabled =
                        (isChatTab && accessConfig.allowAllStaff) || activeGroupKeys.includes(group.key);
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => toggleGroupKey(group.key)}
                          className="px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer transition-all"
                          style={{
                            background: isEnabled ? `${group.color}1f` : surfaceBg,
                            border: isEnabled ? `1.5px solid ${group.color}` : `1px solid ${borderStrong}`,
                          }}
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: group.color }} />
                            <div className="min-w-0">
                              <div
                                className="text-[11.5px] font-extrabold truncate"
                                style={{ color: isEnabled ? group.color : token.colorText }}
                              >
                                {group.label}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">{group.defaultSubtitle}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-extrabold tabular-nums"
                              style={{
                                background: isEnabled ? group.color : 'rgba(148,163,184,0.16)',
                                color: isEnabled ? '#090d16' : token.colorTextSecondary,
                              }}
                            >
                              {count} người
                            </span>
                            {isEnabled && <Check size={14} style={{ color: group.color }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Specialized Teams */}
                <div className="pt-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Đội chuyên môn (Specialized Teams)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SPACE_DEPARTMENT_AND_TEAM_GROUPS.filter((g) => g.category === 'team').map((group) => {
                      const count = staffDirectory.filter((m) => matchesStaffGroup(m, group.key)).length;
                      const isEnabled =
                        (isChatTab && accessConfig.allowAllStaff) || activeGroupKeys.includes(group.key);
                      return (
                        <button
                          key={group.key}
                          type="button"
                          onClick={() => toggleGroupKey(group.key)}
                          className="px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer transition-all"
                          style={{
                            background: isEnabled ? `${group.color}1f` : surfaceBg,
                            border: isEnabled ? `1.5px solid ${group.color}` : `1px solid ${borderStrong}`,
                          }}
                        >
                          <div className="min-w-0 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
                            <span
                              className="text-[11px] font-bold truncate"
                              style={{ color: isEnabled ? group.color : token.colorText }}
                            >
                              {group.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold tabular-nums"
                              style={{
                                background: isEnabled ? group.color : 'rgba(148,163,184,0.16)',
                                color: isEnabled ? '#090d16' : token.colorTextSecondary,
                              }}
                            >
                              {count}
                            </span>
                            {isEnabled && <Check size={13} style={{ color: group.color }} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 2: INDIVIDUAL STAFF OVERRIDE & LIVE ACCESS STATUS */}
              <div
                className="p-3 rounded-xl space-y-2.5"
                style={{ background: surfaceRaised, border: `1px solid ${borderStrong}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-400">
                    2. Phân quyền Đặc cách theo Cá Nhân ({activeStaffIds.length} cá nhân đặc cách · Tổng{' '}
                    {totalAllowedCount}/{staffDirectory.length} nhân sự được mở)
                  </span>
                  {activeStaffIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isChatTab) {
                          void persistAccessConfig({ ...accessConfig, allowedStaffIds: [] }, true);
                        } else {
                          void persistAccessConfig({ ...accessConfig, aiCopilotAllowedStaffIds: [] }, true);
                        }
                      }}
                      className="text-[10.5px] font-bold text-rose-400 hover:underline cursor-pointer shrink-0"
                    >
                      Xóa chọn cá nhân ({activeStaffIds.length})
                    </button>
                  )}
                </div>

                {/* Search + Filter Pills */}
                <div className="flex flex-col gap-2">
                  <Input
                    value={accessStaffSearch}
                    onChange={(e) => setAccessStaffSearch(e.target.value)}
                    placeholder="Tìm cá nhân theo tên, username hoặc chức danh..."
                    prefix={<Search size={13} className="text-slate-400" />}
                    allowClear
                  />
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {[
                      { key: 'ALL', label: `Tất cả (${staffDirectory.length})` },
                      { key: 'ALLOWED_ONLY', label: `Đang có quyền (${totalAllowedCount})` },
                      { key: 'INDIVIDUAL_ONLY', label: `Đặc cách cá nhân (${activeStaffIds.length})` },
                      ...SPACE_DEPARTMENT_AND_TEAM_GROUPS.map((g) => ({
                        key: g.key,
                        label: g.shortLabel,
                      })),
                    ].map((pill) => {
                      const active = accessGroupFilter === pill.key;
                      return (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => setAccessGroupFilter(pill.key)}
                          className="h-6 px-2 rounded-full text-[10px] font-extrabold whitespace-nowrap cursor-pointer shrink-0 transition-all"
                          style={{
                            background: active ? '#d4a84b' : surfaceBg,
                            color: active ? '#090d16' : token.colorTextSecondary,
                            border: `1px solid ${active ? '#d4a84b' : borderStrong}`,
                          }}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Staff Member Rows */}
                <div
                  className="max-h-[230px] overflow-y-auto rounded-lg divide-y"
                  style={{
                    background: surfaceBg,
                    border: `1px solid ${borderStrong}`,
                    borderColor: borderStrong,
                  }}
                >
                  {filteredStaffForAccess.length === 0 ? (
                    <div className="py-6 text-center text-[11.5px] text-slate-400">
                      Không tìm thấy nhân sự phù hợp với bộ lọc.
                    </div>
                  ) : (
                    filteredStaffForAccess.map((member) => {
                      const status = isChatTab
                        ? isStaffMemberAllowedInChat(member, accessConfig)
                        : isStaffMemberAllowedInAi(member, accessConfig);
                      const isIndividualSelected = activeStaffIds.includes(member.id);

                      return (
                        <div key={member.id} className="p-2 flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {renderUserAvatarNode({
                              staffId: member.id,
                              name: member.displayName || member.username,
                              rawAvatar: member.avatarUrl,
                              sizeClass: 'w-7 h-7',
                              roundedClass: 'rounded-full',
                            })}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[12px] font-bold truncate" style={{ color: token.colorText }}>
                                  {member.displayName || member.username}
                                </span>
                                <span className="text-[10.5px] text-slate-400 truncate">@{member.username}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span>{member.role}</span>
                                <span>·</span>
                                <span
                                  className="font-bold tabular-nums"
                                  style={{ color: status.allowed ? '#10b981' : '#f43f5e' }}
                                >
                                  {status.allowed
                                    ? status.reason === 'admin'
                                      ? '👑 Admin (Mặc định)'
                                      : status.reason === 'all'
                                        ? '🌐 Mở toàn hệ thống'
                                        : status.reason === 'individual'
                                          ? '⭐ Đặc cách cá nhân'
                                          : `👥 Thuộc nhóm (${status.matchedGroups.map((g) => g.shortLabel).join(', ')})`
                                    : '🔒 Đang bị chặn'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {status.reason === 'admin' ? (
                              <span
                                className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[10.5px] font-extrabold"
                                style={{
                                  background: 'rgba(212, 168, 75, 0.16)',
                                  color: '#d4a84b',
                                  border: '1px solid rgba(212, 168, 75, 0.35)',
                                }}
                              >
                                <Check size={12} /> Mặc định
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleIndividualStaff(member.id)}
                                className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-extrabold cursor-pointer transition-all"
                                style={{
                                  background: isIndividualSelected
                                    ? 'linear-gradient(135deg, #8b5cf6, #6366f1)'
                                    : status.allowed
                                      ? 'rgba(16, 185, 129, 0.14)'
                                      : surfaceRaised,
                                  color: isIndividualSelected
                                    ? '#ffffff'
                                    : status.allowed
                                      ? '#10b981'
                                      : token.colorTextSecondary,
                                  border: isIndividualSelected
                                    ? '1px solid #8b5cf6'
                                    : status.allowed
                                      ? '1px solid rgba(16, 185, 129, 0.35)'
                                      : `1px solid ${borderStrong}`,
                                }}
                              >
                                {isIndividualSelected ? (
                                  <>
                                    <Check size={12} />
                                    <span>Đã cấp cá nhân</span>
                                  </>
                                ) : status.allowed ? (
                                  <>
                                    <Check size={12} />
                                    <span>Đã mở theo Đội (+ Cá nhân)</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus size={12} />
                                    <span>+ Cấp quyền cá nhân</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer Summary */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-400">
                  Mọi thay đổi được lưu tự động lên máy chủ và đồng bộ tức thì cho các thành viên.
                </div>
                <button
                  type="button"
                  onClick={() => setAccessConfigModalOpen(false)}
                  className="h-8 px-4 rounded-lg text-[12px] font-extrabold cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #d4a84b, #b8860b)',
                    color: '#090d16',
                  }}
                >
                  Hoàn tất
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ================= FULL-SCREEN HIGH-RES IMAGE LIGHTBOX ZOOM VIEWER ================= */}
      {lightboxImage &&
        (() => {
          const totalItems = lightboxImage.items.length;
          const currentItem = lightboxImage.items[lightboxImage.currentIndex] || lightboxImage.items[0];
          if (!currentItem) return null;

          const goPrev = () => {
            setLightboxImage((prev: SafeAny) =>
              prev
                ? {
                    ...prev,
                    currentIndex: (prev.currentIndex - 1 + prev.items.length) % prev.items.length,
                    zoom: 1,
                    rotate: 0,
                  }
                : null
            );
          };

          const goNext = () => {
            setLightboxImage((prev: SafeAny) =>
              prev
                ? {
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.items.length,
                    zoom: 1,
                    rotate: 0,
                  }
                : null
            );
          };

          return (
            <div
              role="dialog"
              aria-label="Xem phóng to hình ảnh"
              data-no-chat-autofocus="true"
              onClick={() => setLightboxImage(null)}
              onWheel={(e) => {
                e.preventDefault();
                const delta = e.deltaY < 0 ? 0.25 : -0.25;
                setLightboxImage((prev: SafeAny) =>
                  prev
                    ? {
                        ...prev,
                        zoom: Math.min(4, Math.max(0.5, Number((prev.zoom + delta).toFixed(2)))),
                      }
                    : null
                );
              }}
              className="fixed inset-0 z-[2200] flex flex-col items-center justify-center select-none"
              style={{
                background: 'rgba(2, 6, 23, 0.92)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Top Floating Lightbox Toolbar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[2210] flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-2xl"
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  color: '#f8fafc',
                }}
              >
                {totalItems > 1 && (
                  <div className="flex items-center gap-1 pr-2 border-r border-white/15">
                    <Tooltip title="Hình trước (Phím ←)">
                      <button
                        type="button"
                        aria-label="Hình trước"
                        onClick={goPrev}
                        className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                      >
                        <ChevronLeft size={15} />
                      </button>
                    </Tooltip>
                    <span className="px-1.5 text-[11.5px] font-extrabold tabular-nums" style={{ color: '#fbbf24' }}>
                      {lightboxImage.currentIndex + 1} / {totalItems}
                    </span>
                    <Tooltip title="Hình tiếp theo (Phím →)">
                      <button
                        type="button"
                        aria-label="Hình tiếp theo"
                        onClick={goNext}
                        className="w-6 h-6 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </Tooltip>
                  </div>
                )}

                <span className="text-[12px] font-bold max-w-[200px] truncate pr-2 border-r border-white/15">
                  {currentItem.name}
                </span>

                <Tooltip title="Thu nhỏ (-)">
                  <button
                    type="button"
                    aria-label="Thu nhỏ"
                    onClick={() =>
                      setLightboxImage((prev: SafeAny) =>
                        prev ? { ...prev, zoom: Math.max(0.5, Number((prev.zoom - 0.25).toFixed(2))) } : null
                      )
                    }
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                  >
                    <ZoomOut size={15} />
                  </button>
                </Tooltip>

                <Tooltip title="Nhấn để đưa về 100%">
                  <button
                    type="button"
                    onClick={() => setLightboxImage((prev: SafeAny) => (prev ? { ...prev, zoom: 1, rotate: 0 } : null))}
                    className="px-2 h-6 rounded-md text-[11.5px] font-extrabold tabular-nums hover:bg-white/15 cursor-pointer"
                    style={{ color: '#fbbf24' }}
                  >
                    {Math.round(lightboxImage.zoom * 100)}%
                  </button>
                </Tooltip>

                <Tooltip title="Phóng to (+ hoặc lăn chuột)">
                  <button
                    type="button"
                    aria-label="Phóng to"
                    onClick={() =>
                      setLightboxImage((prev: SafeAny) =>
                        prev ? { ...prev, zoom: Math.min(4, Number((prev.zoom + 0.25).toFixed(2))) } : null
                      )
                    }
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                  >
                    <ZoomIn size={15} />
                  </button>
                </Tooltip>

                <Tooltip title="Xoay ảnh 90° (R)">
                  <button
                    type="button"
                    aria-label="Xoay ảnh 90°"
                    onClick={() =>
                      setLightboxImage((prev: SafeAny) => (prev ? { ...prev, rotate: (prev.rotate + 90) % 360 } : null))
                    }
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                  >
                    <RotateCw size={14} />
                  </button>
                </Tooltip>

                <Tooltip title="Tải hình về máy">
                  <a
                    href={currentItem.url}
                    download={currentItem.name}
                    target="_blank"
                    rel="noreferrer"
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-white/15 cursor-pointer text-white"
                  >
                    <Download size={14} />
                  </a>
                </Tooltip>

                <Tooltip title="Đóng (Esc)">
                  <button
                    type="button"
                    aria-label="Đóng xem ảnh"
                    onClick={() => setLightboxImage(null)}
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-rose-500/80 cursor-pointer text-white ml-1"
                  >
                    <X size={15} />
                  </button>
                </Tooltip>
              </div>

              {/* Prev Button */}
              {totalItems > 1 && (
                <button
                  type="button"
                  aria-label="Hình trước"
                  title={`Hình trước (${((lightboxImage.currentIndex - 1 + totalItems) % totalItems) + 1}/${totalItems}) · Phím ←`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev();
                  }}
                  className="fixed left-5 top-1/2 -translate-y-1/2 z-[2210] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-transform hover:scale-110 active:scale-95 text-white"
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Next Button */}
              {totalItems > 1 && (
                <button
                  type="button"
                  aria-label="Hình tiếp theo"
                  title={`Hình tiếp theo (${((lightboxImage.currentIndex + 1) % totalItems) + 1}/${totalItems}) · Phím →`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goNext();
                  }}
                  className="fixed right-5 top-1/2 -translate-y-1/2 z-[2210] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-transform hover:scale-110 active:scale-95 text-white"
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* Main Image Stage */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="max-w-[90vw] max-h-[80vh] flex items-center justify-center overflow-hidden transition-all duration-150"
              >
                { }
                <img
                  src={currentItem.url}
                  alt={currentItem.name}
                  onClick={() =>
                    setLightboxImage((prev: SafeAny) => (prev ? { ...prev, zoom: prev.zoom > 1 ? 1 : 2 } : null))
                  }
                  className={`max-w-[90vw] max-h-[80vh] object-contain transition-transform duration-200 select-none ${
                    lightboxImage.zoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  style={{
                    transform: `scale(${lightboxImage.zoom}) rotate(${lightboxImage.rotate}deg)`,
                    transformOrigin: 'center center',
                  }}
                  draggable={false}
                />
              </div>

              {/* Bottom Thumbnail Strip */}
              {totalItems > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[2210] flex items-center gap-2 px-3 py-2 rounded-2xl max-w-[85vw] overflow-x-auto shadow-2xl"
                  style={{
                    background: 'rgba(15, 23, 42, 0.88)',
                    border: '1px solid rgba(255, 255, 255, 0.16)',
                  }}
                >
                  {lightboxImage.items.map((item, idx) => {
                    const isActive = idx === lightboxImage.currentIndex;
                    return (
                      <button
                        key={item.url || idx}
                        type="button"
                        aria-label={`Xem ảnh ${idx + 1}`}
                        onClick={() =>
                          setLightboxImage((prev: SafeAny) =>
                            prev ? { ...prev, currentIndex: idx, zoom: 1, rotate: 0 } : null
                          )
                        }
                        className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                          isActive
                            ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/30'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        { }
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

      {/* ================= QUICK CREATE CUSTOM SECTION MODAL ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={quickCreateSectionModalOpen}
        onCancel={() => {
          setQuickCreateSectionModalOpen(false);
          setQuickCreateSectionTargetConvId(null);
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 420}
        centered
        zIndex={1350}
        title={
          <div className="flex items-center gap-2">
            <FolderPlus size={16} className="text-sky-400" />
            <span className="font-extrabold text-[14px]">Tạo mục tuỳ chỉnh mới (Google Chat Section)</span>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          <div className="text-[12px] text-slate-400">
            Tạo mục riêng để nhóm các cuộc trò chuyện 1-1 hoặc #Spaces quan trọng theo ý của bạn (ví dụ:{' '}
            <span className="font-semibold text-amber-400">⭐ Ưu tiên</span>,{' '}
            <span className="font-semibold text-amber-400">📌 Ca hôm nay</span>,{' '}
            <span className="font-semibold text-amber-400">Khách VIP</span>).
          </div>
          <Input
            value={quickCreateSectionName}
            onChange={(e) => setQuickCreateSectionName(e.target.value)}
            placeholder="Nhập tên mục tuỳ chỉnh..."
            maxLength={40}
            autoFocus
            onPressEnter={(e) => {
              e.preventDefault();
              const name = quickCreateSectionName.trim();
              if (!name) return;
              setQuickCreateSectionName('');
              setQuickCreateSectionModalOpen(false);
              const target = quickCreateSectionTargetConvId;
              setQuickCreateSectionTargetConvId(null);
              handleCreateCustomSection(name, target);
            }}
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setQuickCreateSectionModalOpen(false);
                setQuickCreateSectionTargetConvId(null);
                setQuickCreateSectionName('');
              }}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer"
              style={{
                background: surfaceRaised,
                border: `1px solid ${borderColor}`,
                color: token.colorTextSecondary,
              }}
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const name = quickCreateSectionName.trim();
                if (!name) return;
                setQuickCreateSectionName('');
                setQuickCreateSectionModalOpen(false);
                const target = quickCreateSectionTargetConvId;
                setQuickCreateSectionTargetConvId(null);
                handleCreateCustomSection(name, target);
              }}
              className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              Tạo mục
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= PERSONAL SIDEBAR CUSTOMIZATION MODAL (GOOGLE CHAT WORKSPACE) ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={sidebarCustomizeModalOpen}
        onCancel={() => {
          setSidebarCustomizeModalOpen(false);
          setEditingSectionId(null);
        }}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 680}
        centered
        zIndex={1350}
        title={
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <FolderKanban size={17} style={{ color: '#d4a84b' }} />
              <span className="font-extrabold text-[14.5px]">Tuỳ chỉnh Danh sách Cá nhân (Google Chat Workspace)</span>
            </div>
            <span className="inline-flex items-center justify-center leading-none py-1 px-2.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-400">
              Lưu riêng cho {currentUser?.displayName || currentUser?.username || 'bạn'}
            </span>
          </div>
        }
      >
        <div className="space-y-3 pt-2">
          {/* Sub-navigation Tabs */}
          <div className="flex items-center justify-between gap-2">
            <div
              className="inline-flex p-1 rounded-xl gap-1"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <button
                type="button"
                onClick={() => setSidebarCustomizeTab('sections')}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                style={{
                  background: sidebarCustomizeTab === 'sections' ? surfaceBg : 'transparent',
                  color: sidebarCustomizeTab === 'sections' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <FolderKanban size={14} />
                <span>1. Quản lý Mục & Thứ tự ({sidebarSections.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarCustomizeTab('conversations')}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                style={{
                  background: sidebarCustomizeTab === 'conversations' ? surfaceBg : 'transparent',
                  color: sidebarCustomizeTab === 'conversations' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <Sliders size={14} />
                <span>
                  2. Quản lý DIRECT MESSAGES & SPACES ({allUserConversations.length})
                  {(userPrefs.hiddenIds?.length || 0) > 0 ? ` · ${userPrefs.hiddenIds.length} đang ẩn` : ''}
                </span>
              </button>
            </div>

            <Popconfirm
              title="Khôi phục bố cục danh sách về mặc định?"
              description="Các mục tuỳ chỉnh, ghim và danh sách ẩn của bạn sẽ được đặt lại."
              onConfirm={handleResetSidebarPrefs}
              okText="Đặt lại"
              cancelText="Huỷ"
            >
              <button
                type="button"
                className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:bg-rose-500/10 text-rose-400"
                style={{ border: `1px solid ${borderColor}` }}
              >
                <RotateCcw size={12} />
                <span>Đặt lại mặc định</span>
              </button>
            </Popconfirm>
          </div>

          {sidebarCustomizeTab === 'sections' ? (
            <div className="space-y-3">
              {/* Create new Custom Section Bar */}
              <div
                className="p-3 rounded-xl space-y-2"
                style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
              >
                <div className="text-[12px] font-bold flex items-center gap-1.5">
                  <FolderPlus size={14} className="text-sky-400" />
                  <span>Tạo mục tuỳ chỉnh mới (Giống Custom Sections trên Google Chat)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={newSectionNameInput}
                    onChange={(e) => setNewSectionNameInput(e.target.value)}
                    placeholder="Ví dụ: ⭐ Quan trọng, 📌 Ca làm việc hôm nay, Dự án VIP..."
                    maxLength={40}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      const name = newSectionNameInput.trim();
                      if (!name) return;
                      setNewSectionNameInput('');
                      handleCreateCustomSection(name);
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const name = newSectionNameInput.trim();
                      if (!name) return;
                      setNewSectionNameInput('');
                      handleCreateCustomSection(name);
                    }}
                    className="px-3.5 h-8 rounded-lg text-[12px] font-bold cursor-pointer bg-amber-500 text-slate-950 hover:bg-amber-400 shrink-0 inline-flex items-center gap-1"
                  >
                    <Plus size={14} />
                    <span>Thêm mục</span>
                  </button>
                </div>
              </div>

              {/* Ordered Sections List */}
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                {sidebarSections.map((sec, idx) => {
                  const isEditing = editingSectionId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2"
                      style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[11px] font-extrabold text-slate-400 tabular-nums shrink-0 w-4">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                size="small"
                                value={editingSectionNameInput}
                                onChange={(e) => setEditingSectionNameInput(e.target.value)}
                                onPressEnter={() => {
                                  const name = editingSectionNameInput.trim();
                                  if (name) {
                                    handleRenameCustomSection(sec.id, name);
                                    setEditingSectionId(null);
                                  }
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const name = editingSectionNameInput.trim();
                                  if (name) {
                                    handleRenameCustomSection(sec.id, name);
                                    setEditingSectionId(null);
                                  }
                                }}
                                className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500 text-slate-950"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSectionId(null)}
                                className="px-2 py-1 rounded text-xs text-slate-400"
                              >
                                Huỷ
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-[13px]">{sec.name}</span>
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0"
                                style={{
                                  background: sec.isSystem ? 'rgba(59, 130, 246, 0.15)' : 'rgba(212, 168, 75, 0.15)',
                                  color: sec.isSystem ? '#60a5fa' : '#d4a84b',
                                }}
                              >
                                {sec.isSystem ? 'Hệ thống' : 'Tuỳ chỉnh cá nhân'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSectionOrder(sec.id, 'up')}
                          className="w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-white/10"
                          title="Di chuyển lên trên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === sidebarSections.length - 1}
                          onClick={() => handleMoveSectionOrder(sec.id, 'down')}
                          className="w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer disabled:opacity-30 hover:bg-white/10"
                          title="Di chuyển xuống dưới"
                        >
                          ↓
                        </button>
                        {!sec.isSystem && !isEditing && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSectionId(sec.id);
                                setEditingSectionNameInput(sec.name);
                              }}
                              className="w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer hover:bg-white/10 text-amber-400"
                              title="Đổi tên mục"
                            >
                              <Pencil size={12} />
                            </button>
                            <Popconfirm
                              title="Xoá mục tuỳ chỉnh này?"
                              description="Các cuộc trò chuyện trong mục sẽ được chuyển về vị trí mặc định."
                              onConfirm={() => handleDeleteCustomSection(sec.id)}
                              okText="Xoá"
                              cancelText="Huỷ"
                            >
                              <button
                                type="button"
                                className="w-7 h-7 rounded inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 text-rose-400"
                                title="Xoá mục"
                              >
                                <X size={13} />
                              </button>
                            </Popconfirm>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CONVERSATIONS TAB */
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {allUserConversations.map((conv) => {
                const isPinned = (userPrefs.pinnedIds || []).includes(conv.id);
                const isMuted = (userPrefs.mutedIds || []).includes(conv.id);
                const isHidden = (userPrefs.hiddenIds || []).includes(conv.id);
                const isAiConv = conv.id === 'ai-copilot-dm';

                return (
                  <div
                    key={conv.id}
                    className="px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-colors"
                    style={{
                      background: surfaceRaised,
                      border: `1px solid ${borderColor}`,
                      opacity: isHidden ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {conv.type === 'dm' ? (
                        renderUserAvatarNode({
                          staffId: conv.participantStaffId,
                          name: conv.name,
                          avatarUrl: conv.avatar,
                          sizeClass: 'w-7 h-7',
                          textClass: 'text-[10px]',
                        })
                      ) : (
                        <Hash size={15} style={{ color: conv.color || '#10b981' }} className="shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[12.5px] truncate">{conv.name}</span>
                          {isHidden && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 font-bold shrink-0">
                              Đang ẩn
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-400 truncate">
                          {conv.type === 'dm' ? 'Cuộc trò chuyện 1-1' : `Không gian #${conv.name}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip title={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu mục'}>
                        <button
                          type="button"
                          onClick={() => togglePinConversation(conv.id)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                          style={{
                            background: isPinned ? 'rgba(212, 168, 75, 0.2)' : surfaceBg,
                            border: `1px solid ${isPinned ? '#d4a84b' : borderColor}`,
                            color: isPinned ? '#d4a84b' : token.colorTextSecondary,
                          }}
                        >
                          <Pin size={13} />
                        </button>
                      </Tooltip>

                      <Tooltip title={isMuted ? 'Bật thông báo' : 'Tắt thông báo'}>
                        <button
                          type="button"
                          onClick={() => toggleMuteConversation(conv.id)}
                          className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
                          style={{
                            background: isMuted ? 'rgba(239, 68, 68, 0.16)' : surfaceBg,
                            border: `1px solid ${isMuted ? 'rgba(239, 68, 68, 0.4)' : borderColor}`,
                            color: isMuted ? '#f87171' : token.colorTextSecondary,
                          }}
                        >
                          {isMuted ? <BellOff size={13} /> : <Bell size={13} />}
                        </button>
                      </Tooltip>

                      {!isAiConv && (
                        <Tooltip title={isHidden ? 'Hiện lại trên danh sách' : 'Ẩn khỏi danh sách'}>
                          <button
                            type="button"
                            onClick={() => toggleHideConversation(conv)}
                            className="px-2 h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-semibold cursor-pointer"
                            style={{
                              background: isHidden ? 'rgba(16, 185, 129, 0.16)' : surfaceBg,
                              border: `1px solid ${isHidden ? 'rgba(16, 185, 129, 0.4)' : borderColor}`,
                              color: isHidden ? '#34d399' : token.colorTextSecondary,
                            }}
                          >
                            {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                            <span>{isHidden ? 'Hiện lại' : 'Ẩn'}</span>
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ================= MESSAGE AUDIT & EDIT/DELETE HISTORY MODAL ================= */}
      <Modal
        className="mos-chat-theme-scope"
        open={historyModalOpen}
        onCancel={() => {
          setHistoryModalOpen(false);
          setHistoryModalMessage(null);
        }}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-[14px] font-extrabold" style={{ color: '#d4a84b' }}>
            <History size={16} />
            <span>Lịch sử chỉnh sửa & xoá tin nhắn</span>
          </div>
        }
        width={isMobile ? 'calc(100vw - 24px)' : 560}
        centered
        zIndex={1350}
        destroyOnClose
      >
        {historyModalMessage &&
          (() => {
            const isHistoryMsgMine = isMessageFromCurrentUser(historyModalMessage);
            const canManage = isHistoryMsgMine || isDannyAccount;
            return (
              <div className="py-2 space-y-4">
                {/* Message Metadata Header */}
                <div
                  className="p-3 rounded-xl flex items-center justify-between gap-2"
                  style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderUserAvatarNode({
                      staffId: historyModalMessage.senderId,
                      name: historyModalMessage.senderName,
                      rawAvatar: historyModalMessage.senderAvatar,
                      sizeClass: 'w-8 h-8',
                      roundedClass: 'rounded-full',
                    })}
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate" style={{ color: token.colorText }}>
                        {historyModalMessage.senderName}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Gửi ban đầu lúc{' '}
                        {historyModalMessage.createdAt
                          ? dayjs(historyModalMessage.createdAt).format('HH:mm:ss · DD/MM/YYYY')
                          : historyModalMessage.timeLabel}
                      </div>
                    </div>
                  </div>

                  {historyModalMessage.isDeleted && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      Đã xoá (Soft-deleted)
                    </span>
                  )}
                </div>

                {/* Edit History Versions */}
                <div className="space-y-2">
                  <div className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Các phiên bản chỉnh sửa ({historyModalMessage.editHistory?.length || 0})</span>
                    {canManage && historyModalMessage.isDeleted && (
                      <button
                        type="button"
                        onClick={async () => {
                          await handleRestoreMessage(historyModalMessage.id);
                          setHistoryModalOpen(false);
                          setHistoryModalMessage(null);
                        }}
                        className="text-[11px] font-bold text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Khôi phục tin nhắn</span>
                      </button>
                    )}
                  </div>

                  {/* Current Active Text */}
                  <div
                    className="p-3 rounded-xl space-y-1"
                    style={{
                      background: surfaceRaised,
                      border: `1.5px solid ${historyModalMessage.isDeleted ? '#f43f5e' : '#10b981'}`,
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className="font-extrabold"
                        style={{ color: historyModalMessage.isDeleted ? '#f43f5e' : '#10b981' }}
                      >
                        {historyModalMessage.isDeleted ? 'Phiên bản khi bị xoá:' : 'Phiên bản hiển thị hiện tại:'}
                      </span>
                      <span className="text-slate-400 tabular-nums">
                        {historyModalMessage.editedAt
                          ? dayjs(historyModalMessage.editedAt).format('HH:mm:ss · DD/MM/YYYY')
                          : historyModalMessage.createdAt
                            ? dayjs(historyModalMessage.createdAt).format('HH:mm:ss · DD/MM/YYYY')
                            : ''}
                      </span>
                    </div>
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                      {historyModalMessage.text || '(Tin nhắn không có văn bản)'}
                    </div>
                  </div>

                  {/* Older Versions List */}
                  {historyModalMessage.editHistory && historyModalMessage.editHistory.length > 0 ? (
                    <div className="space-y-2 pt-1 max-h-60 overflow-y-auto pr-1">
                      {historyModalMessage.editHistory
                        .slice()
                        .reverse()
                        .map((ver: SafeAny, idx: number) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border space-y-1 text-slate-400"
                            style={{ background: surfaceBg, borderColor }}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-300">
                                Sửa bởi {ver.editedByName || 'Thành viên'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums">
                                  {dayjs(ver.editedAt).format('HH:mm:ss · DD/MM/YYYY')}
                                </span>
                                {canManage && !historyModalMessage.isDeleted && (
                                  <Popconfirm
                                    title="Khôi phục về phiên bản này?"
                                    description="Nội dung tin nhắn sẽ được quay về phiên bản được chọn."
                                    onConfirm={async () => {
                                      await handleRestoreVersion(historyModalMessage.id, ver.previousText);
                                      setHistoryModalOpen(false);
                                      setHistoryModalMessage(null);
                                    }}
                                    okText="Khôi phục"
                                    cancelText="Huỷ"
                                  >
                                    <button
                                      type="button"
                                      className="text-[10.5px] font-bold text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <RotateCcw size={11} />
                                      <span>Quay về bản này</span>
                                    </button>
                                  </Popconfirm>
                                )}
                              </div>
                            </div>
                            <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words text-slate-300">
                              {ver.previousText}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Tin nhắn này chưa từng qua chỉnh sửa nội dung.
                    </div>
                  )}

                  {/* Original text before any edit */}
                  {historyModalMessage.originalText &&
                    historyModalMessage.originalText !== historyModalMessage.text && (
                      <div
                        className="p-2.5 rounded-lg border space-y-1 opacity-70"
                        style={{ background: surfaceBg, borderColor }}
                      >
                        <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                          <span className="font-bold">Bản gốc đầu tiên:</span>
                          <span className="tabular-nums">
                            {historyModalMessage.createdAt
                              ? dayjs(historyModalMessage.createdAt).format('HH:mm:ss · DD/MM/YYYY')
                              : ''}
                          </span>
                        </div>
                        <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap break-words text-slate-300">
                          {historyModalMessage.originalText}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          })()}
      </Modal>

      {/* ================= SUPER ADMIN DYNAMIC WORKFLOW ENGINE MODALS ================= */}
      {isStrictDannySuperAdmin && activeConversation && (
        <>
          <MosChatTriggerWorkflowModal
            open={triggerWorkflowModalOpen}
            isDark={isDark}
            conversationId={activeConversation.id}
            templates={workflowTemplates}
            staffDirectory={staffDirectory}
            initialTemplateCode={initialWorkflowCode}
            onClose={() => setTriggerWorkflowModalOpen(false)}
            onCreated={(res: SafeAny) => {
              if (res?.workflow) {
                setWorkflowInstances((prev) => [res.workflow, ...prev]);
              }
              if (res?.conversation) {
                setConversations((prev) => prev.map((c) => (c.id === res.conversation.id ? res.conversation : c)));
              }
              if (res?.task) {
                setTasks((prev) => [res.task!, ...prev]);
              }
              antdMessage.success(`Đã phát thẻ quy trình: ${res.workflow.title}`);
              notifyLivePeers();
            }}
          />

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
        </>
      )}

      {/* MOS-FEAT-138: CKEditor Rich Editor Modal */}
      <MosChatRichEditorModal
        open={richEditorModalState.open}
        onClose={() => setRichEditorModalState((prev) => ({ ...prev, open: false }))}
        initialValue={richEditorModalState.scope === 'main' ? composerText : threadInput}
        initialMode={richEditorModalState.initialMode}
        onApply={(newText: string) => {
          if (richEditorModalState.scope === 'main') {
            setComposerText(newText);
            setTimeout(() => {
              if (composerInputRef.current) {
                composerInputRef.current.style.height = 'auto';
                composerInputRef.current.style.height = `${Math.min(composerInputRef.current.scrollHeight, 180)}px`;
                composerInputRef.current.focus();
              }
            }, 50);
          } else {
            setThreadInput(newText);
            setTimeout(() => {
              if (threadInputRef.current) {
                threadInputRef.current.style.height = 'auto';
                threadInputRef.current.style.height = `${Math.min(threadInputRef.current.scrollHeight, 180)}px`;
                threadInputRef.current.focus();
              }
            }, 50);
          }
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
          } else {
            if (activeConversation && activeThreadMsgId) {
              const attachmentsToSend = threadAttachments;
              setThreadInput('');
              setThreadAttachments([]);
              if (threadInputRef.current) {
                threadInputRef.current.value = '';
                threadInputRef.current.style.height = 'auto';
              }
              const senderName = currentUser?.displayName || 'Danny Do';
              const newReply = {
                id: `th-${Date.now()}`,
                senderId: currentUser?.id || 'me',
                senderName,
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
          }
        }}
        title={richEditorModalState.title}
        isDark={isDark}
        canUseAiCopilot={canUseAiCopilot}
      />

      {/* ================= MODAL: ATTACH CUSTOMER / BOOKING ================= */}
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
