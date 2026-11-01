import React, { useState, useMemo } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  ListTodo,
  Pencil,
  Calendar,
  UserPlus,
} from 'lucide-react';
import { Tooltip, Modal, Input, Progress, message, Popover } from 'antd';
import {
  parseChecklistTitleBadges,
  type MosChatTaskItem,
  type MosChatTaskChecklistItem,
  type MosChatMessage,
  type MosChatStaffMember,
  type UpdateMosChatTaskRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import {
  buildQuickDeadlineOptions,
  formatShortDeadlineLabel,
  getDomainBadgeStyle,
  getStaffAvatarColor,
  getStaffInitials,
} from './MosChatTaskInlineChecklist';

export interface MosChatThreadChecklistProps {
  task: MosChatTaskItem;
  activeThreadMessage: MosChatMessage;
  onToggleChecklistItem: (checklistItemId: string) => Promise<void> | void;
  onAddChecklistItem: (title: string, sourceReplyId?: string | null) => Promise<void> | void;
  onDeleteChecklistItem: (checklistItemId: string) => Promise<void> | void;
  onUpdateTask?: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<void> | void;
  onScrollToReply?: (replyId: string) => void;
  staffList?: MosChatStaffMember[];
  isDark: boolean;
  token?: any;
  isMobile?: boolean;
}

export const MosChatThreadChecklist: React.FC<MosChatThreadChecklistProps> = ({
  task,
  activeThreadMessage,
  onToggleChecklistItem,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onUpdateTask,
  onScrollToReply,
  staffList = [],
  isDark,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Expand "Xem thêm / Thu gọn" per item
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  // Inline Edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Popover states for Deadline & Assignee
  const [openDeadlineItemId, setOpenDeadlineItemId] = useState<string | null>(null);
  const [openAssigneeItemId, setOpenAssigneeItemId] = useState<string | null>(null);
  const [staffSearch, setStaffSearch] = useState('');

  // AI Extraction state
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<{
      title: string;
      deadline?: string | null;
      assigneeName?: string;
      sourceReplyId?: string;
      selected: boolean;
    }>
  >([]);

  // Activity Log Modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const checklist = useMemo(() => task.checklist || [], [task.checklist]);
  const activityLog = useMemo(() => task.activityLog || [], [task.activityLog]);

  const totalCount = checklist.length;
  const doneCount = useMemo(() => checklist.filter((c) => c.done).length, [checklist]);
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const quickDeadlines = useMemo(() => buildQuickDeadlineOptions(), []);

  const availableStaff = useMemo(() => {
    const map = new Map<
      string,
      { id: number | string; displayName: string; role?: string; avatarUrl?: string | null }
    >();
    for (const s of staffList) {
      if (s && s.displayName) {
        map.set(s.displayName.trim().toLowerCase(), {
          id: s.id,
          displayName: s.displayName,
          role: s.role,
          avatarUrl: s.avatarUrl,
        });
      }
    }
    const fallbacks = [
      { id: task.assigneeId || 'assignee', displayName: task.assigneeName || 'Bảo Hân', role: 'Phụ trách Task' },
      { id: task.assignerId || 'creator', displayName: task.creatorName || 'Danny Do', role: 'Người giao' },
      { id: 'bao-han', displayName: 'Bảo Hân', role: 'Admin' },
      { id: 'danny-do', displayName: 'Danny Do', role: 'CEO / Founder' },
    ];
    for (const f of fallbacks) {
      const key = f.displayName.trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, f);
      }
    }
    const list = Array.from(map.values());
    const q = staffSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s.displayName.toLowerCase().includes(q) || (s.role && s.role.toLowerCase().includes(q)));
  }, [staffList, task.assigneeId, task.assigneeName, task.assignerId, task.creatorName, staffSearch]);

  const handleQuickAdd = async () => {
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    setIsAdding(true);
    try {
      await onAddChecklistItem(trimmed, null);
      setQuickTitle('');
    } catch (err: any) {
      message.error(err?.message || 'Không thể thêm mục checklist');
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditChecklistItem = async (itemId: string, checklistItemPatch: Partial<MosChatTaskChecklistItem>) => {
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          checklistAction: 'edit',
          checklistItemId: itemId,
          checklistItem: checklistItemPatch,
        });
      } else {
        await apiClient.chat.updateTask(task.id, {
          checklistAction: 'edit',
          checklistItemId: itemId,
          checklistItem: checklistItemPatch,
        });
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể cập nhật mục checklist');
    }
  };

  const handleStartEdit = (item: MosChatTaskChecklistItem) => {
    setEditingItemId(item.id);
    setEditingTitle(item.title);
  };

  const handleSaveEdit = async (itemId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingItemId(null);
      return;
    }
    await handleEditChecklistItem(itemId, { title: trimmed });
    setEditingItemId(null);
  };

  const handleSetDeadline = async (itemId: string, deadlineIso: string | null) => {
    setOpenDeadlineItemId(null);
    await handleEditChecklistItem(itemId, { deadline: deadlineIso });
  };

  const handleSetAssignee = async (
    itemId: string,
    staff: { id: number | string; displayName: string; avatarUrl?: string | null } | null
  ) => {
    setOpenAssigneeItemId(null);
    setStaffSearch('');
    await handleEditChecklistItem(
      itemId,
      staff
        ? {
            assigneeId: staff.id,
            assigneeName: staff.displayName,
            assigneeAvatar: staff.avatarUrl || null,
          }
        : {
            assigneeId: null,
            assigneeName: null,
            assigneeAvatar: null,
          }
    );
  };

  const handleOpenAiExtract = async () => {
    setIsAiExtracting(true);
    try {
      const res = await apiClient.chat.extractChecklist(activeThreadMessage.id, {
        conversationId: activeThreadMessage.conversationId,
        taskId: task.id,
      });
      if (res?.suggestions && res.suggestions.length > 0) {
        setAiSuggestions(
          res.suggestions.map((s) => ({
            title: s.title,
            deadline: s.deadline || null,
            assigneeName: s.assigneeName || task.assigneeName || undefined,
            sourceReplyId: s.sourceReplyId || undefined,
            selected: true,
          }))
        );
        setAiModalOpen(true);
      } else {
        message.info('Không tìm thấy đầu việc mới nào cần trích xuất từ cuộc thảo luận.');
      }
    } catch (err: any) {
      message.error('Không thể trích xuất checklist từ AI: ' + (err?.message || 'Lỗi kết nối'));
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleApplyAiSuggestions = async () => {
    const selected = aiSuggestions.filter((s) => s.selected && s.title.trim());
    if (selected.length === 0) {
      setAiModalOpen(false);
      return;
    }
    if (onUpdateTask) {
      await onUpdateTask(task.id, {
        checklistAction: 'auto_summarize',
      });
    } else {
      for (const item of selected) {
        await onAddChecklistItem(item.title, item.sourceReplyId || null);
      }
    }
    message.success(`Đã thêm ${selected.length} mục vào checklist!`);
    setAiModalOpen(false);
  };

  return (
    <div
      className="rounded-xl border transition-all overflow-hidden mb-3"
      style={{
        background: isDark ? 'rgba(30, 41, 59, 0.45)' : 'rgba(248, 250, 252, 0.95)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header bar */}
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 bg-slate-500/5">
        <div
          className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ListTodo size={14} className="text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">Checklist công việc</span>
          <span className="text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {doneCount}/{totalCount} ({percent}%)
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onUpdateTask && (
            <Tooltip title="Đọc công việc, làm sạch câu chat thừa, tự động tóm tắt, gắn hạn & gán Avatar">
              <button
                type="button"
                onClick={() => onUpdateTask(task.id, { checklistAction: 'auto_summarize' })}
                className="px-2 py-1 rounded-md text-[10.5px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30"
              >
                <Sparkles size={11} />
                <span>Tóm tắt & Chuẩn hóa</span>
              </button>
            </Tooltip>
          )}

          <Tooltip title="✨ AI trích xuất checklist từ thảo luận subthread">
            <button
              type="button"
              disabled={isAiExtracting}
              onClick={handleOpenAiExtract}
              className="px-2 py-1 rounded-md text-[10.5px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/25"
            >
              <Sparkles size={11} className={isAiExtracting ? 'animate-spin' : ''} />
              <span>{isAiExtracting ? 'Đang trích xuất...' : 'AI trích xuất'}</span>
            </button>
          </Tooltip>

          {activityLog.length > 0 && (
            <Tooltip title="Lịch sử thao tác checklist">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(true)}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-white/10"
              >
                <History size={13} />
              </button>
            </Tooltip>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center transition-all cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-white/10"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Executive Summary Banner */}
      {task.summary && !collapsed && (
        <div
          className="mx-3 mt-2 px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed flex items-start gap-1.5"
          style={{
            background: isDark ? 'rgba(139, 92, 246, 0.12)' : 'rgba(139, 92, 246, 0.08)',
            border: isDark ? '1px solid rgba(139, 92, 246, 0.28)' : '1px solid rgba(139, 92, 246, 0.2)',
            color: isDark ? '#e2e8f0' : '#334155',
          }}
        >
          <Sparkles size={12} className="text-purple-500 dark:text-purple-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-purple-600 dark:text-purple-300 mr-1">Tóm tắt:</span>
            <span>{task.summary}</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="px-3 pt-1.5 pb-1">
          <Progress
            percent={percent}
            size="small"
            showInfo={false}
            strokeColor={percent === 100 ? '#10b981' : '#f59e0b'}
            trailColor={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
          />
        </div>
      )}

      {/* Checklist items list */}
      {!collapsed && (
        <div className="p-2 space-y-1.5">
          {checklist.length === 0 ? (
            <div className="py-2.5 text-center text-xs text-slate-400 dark:text-slate-500 italic">
              Chưa có mục checklist nào. Bấm &quot;+ Checklist&quot; từ phản hồi bên dưới hoặc nhập đầu việc mới.
            </div>
          ) : (
            checklist.map((item) => {
              const isEditing = editingItemId === item.id;
              const isExpanded = Boolean(expandedItemIds[item.id]);
              const parsed = parseChecklistTitleBadges(item.title);
              const displayBody = parsed.cleanTitle || item.title;
              const isLongText = displayBody.length > 72 || item.title.length > 85;
              const deadlineMeta = formatShortDeadlineLabel(item.deadline);
              const effectiveAssigneeName = item.assigneeName || task.assigneeName || null;
              const matchedStaff = effectiveAssigneeName
                ? availableStaff.find(
                    (s) => s.displayName.trim().toLowerCase() === effectiveAssigneeName.trim().toLowerCase()
                  )
                : null;
              const avatarUrl = item.assigneeAvatar || matchedStaff?.avatarUrl || null;

              return (
                <div
                  key={item.id}
                  className={`group/item flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-all text-xs ${
                    item.done
                      ? 'bg-emerald-500/5 text-slate-400 dark:text-slate-500'
                      : 'bg-white/40 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                  }`}
                  style={{
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* Circular Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleChecklistItem(item.id)}
                      className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        item.done
                          ? 'bg-emerald-500 text-white'
                          : 'border border-slate-400 dark:border-slate-500 hover:border-emerald-500 text-transparent hover:text-emerald-500'
                      }`}
                    >
                      <Check size={10} strokeWidth={item.done ? 3 : 2} />
                    </button>

                    {isEditing ? (
                      <div className="flex-1 min-w-0 space-y-1">
                        <Input.TextArea
                          autoFocus
                          autoSize={{ minRows: 1, maxRows: 4 }}
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingItemId(null);
                            } else if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(item.id);
                            }
                          }}
                          className="text-xs"
                          style={{
                            borderRadius: '6px',
                            background: isDark ? 'rgba(15, 23, 42, 0.9)' : '#ffffff',
                          }}
                        />
                        <div className="flex items-center justify-end gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="px-2 py-0.5 rounded bg-slate-500/15 hover:bg-slate-500/25 text-slate-400 cursor-pointer"
                          >
                            Huỷ (Esc)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-bold cursor-pointer"
                          >
                            Lưu (Enter)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex-1 min-w-0 select-text cursor-text"
                        onDoubleClick={() => handleStartEdit(item)}
                        title="Nhấp đúp để chỉnh sửa nội dung"
                      >
                        <div
                          className={`font-medium leading-snug break-words ${
                            !isExpanded ? 'line-clamp-2' : ''
                          } ${item.done ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}
                        >
                          {parsed.domainBadge && (
                            <span
                              className="inline-flex items-center justify-center px-1.5 py-0.5 mr-1.5 rounded text-[9.5px] font-extrabold leading-none align-middle"
                              style={getDomainBadgeStyle(parsed.domainBadge, isDark)}
                            >
                              {parsed.domainBadge}
                            </span>
                          )}
                          {parsed.timeframeBadge && (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 mr-1.5 rounded text-[9.5px] font-semibold leading-none align-middle bg-slate-500/15 text-slate-500 dark:text-slate-300 border border-slate-500/20">
                              {parsed.timeframeBadge}
                            </span>
                          )}
                          <span>{displayBody}</span>
                        </div>

                        {isLongText && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedItemIds((prev) => ({
                                ...prev,
                                [item.id]: !prev[item.id],
                              }));
                            }}
                            className="mt-0.5 text-[10px] font-bold text-amber-500 hover:text-amber-400 cursor-pointer underline-offset-2 hover:underline"
                          >
                            {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {/* Per-Item Deadline Picker Popover */}
                      <Popover
                        trigger="click"
                        placement="bottomRight"
                        open={openDeadlineItemId === item.id}
                        onOpenChange={(open) => setOpenDeadlineItemId(open ? item.id : null)}
                        content={
                          <div className="w-52 p-1 space-y-1.5 text-xs">
                            <div className="font-bold text-slate-700 dark:text-slate-200 px-1 py-0.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                              <span>Đặt hạn mục việc</span>
                              {item.deadline && (
                                <button
                                  type="button"
                                  onClick={() => handleSetDeadline(item.id, null)}
                                  className="text-[10px] text-rose-500 hover:underline cursor-pointer font-semibold"
                                >
                                  Xoá hạn
                                </button>
                              )}
                            </div>
                            <div className="space-y-1">
                              {quickDeadlines.map((opt) => (
                                <button
                                  key={opt.label}
                                  type="button"
                                  onClick={() => handleSetDeadline(item.id, opt.value)}
                                  className="w-full text-left px-2 py-1 rounded hover:bg-amber-500/15 hover:text-amber-500 transition-colors cursor-pointer text-[11px] font-medium"
                                >
                                  📅 {opt.label}
                                </button>
                              ))}
                            </div>
                            <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                              <div className="text-[10px] text-slate-400 mb-1 px-1">Hoặc chọn ngày cụ thể:</div>
                              <input
                                type="date"
                                aria-label="Chọn ngày hạn cụ thể"
                                defaultValue={item.deadline ? new Date(item.deadline).toISOString().slice(0, 10) : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const d = new Date(`${e.target.value}T18:00:00`);
                                    if (!isNaN(d.getTime())) {
                                      handleSetDeadline(item.id, d.toISOString());
                                    }
                                  }
                                }}
                                className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-transparent text-[11px]"
                              />
                            </div>
                          </div>
                        }
                      >
                        {deadlineMeta ? (
                          <Tooltip title={`Hạn mục việc: ${deadlineMeta.fullLabel} (Bấm để đổi hạn)`}>
                            <button
                              type="button"
                              aria-label={`Đặt hạn cho mục ${item.title}`}
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold tabular-nums inline-flex items-center gap-0.5 cursor-pointer transition-all border ${
                                item.done
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : deadlineMeta.isOverdue
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                    : deadlineMeta.isDueSoon
                                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                      : 'bg-violet-500/12 text-violet-400 border-violet-500/25'
                              }`}
                            >
                              <Calendar size={9} className="shrink-0" />
                              <span>{deadlineMeta.label}</span>
                            </button>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Đặt hạn chót cho mục này">
                            <button
                              type="button"
                              aria-label={`Đặt hạn cho mục ${item.title}`}
                              className="opacity-0 group-hover/item:opacity-100 p-1 rounded text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 cursor-pointer transition-all"
                            >
                              <Calendar size={11} />
                            </button>
                          </Tooltip>
                        )}
                      </Popover>

                      {/* Avatar-Only Assignee Picker (20px circular avatar) */}
                      <Popover
                        trigger="click"
                        placement="bottomRight"
                        open={openAssigneeItemId === item.id}
                        onOpenChange={(open) => {
                          setOpenAssigneeItemId(open ? item.id : null);
                          if (!open) setStaffSearch('');
                        }}
                        content={
                          <div className="w-52 p-1 space-y-1.5 text-xs">
                            <div className="font-bold text-slate-700 dark:text-slate-200 px-1 py-0.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                              <span>Giao mục việc cho</span>
                              {effectiveAssigneeName && (
                                <button
                                  type="button"
                                  onClick={() => handleSetAssignee(item.id, null)}
                                  className="text-[10px] text-rose-500 hover:underline cursor-pointer font-semibold"
                                >
                                  Bỏ gán
                                </button>
                              )}
                            </div>
                            <Input
                              size="small"
                              placeholder="Tìm nhân sự..."
                              value={staffSearch}
                              onChange={(e) => setStaffSearch(e.target.value)}
                              className="text-[11px]"
                            />
                            <div className="max-h-44 overflow-y-auto space-y-0.5">
                              {availableStaff.map((st) => {
                                const isSelected =
                                  effectiveAssigneeName &&
                                  st.displayName.trim().toLowerCase() === effectiveAssigneeName.trim().toLowerCase();
                                return (
                                  <button
                                    key={`${st.id}-${st.displayName}`}
                                    type="button"
                                    onClick={() => handleSetAssignee(item.id, st)}
                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left cursor-pointer transition-colors ${
                                      isSelected ? 'bg-amber-500/15 text-amber-500 font-bold' : 'hover:bg-slate-500/10'
                                    }`}
                                  >
                                    {st.avatarUrl ? (
                                      <img
                                        src={st.avatarUrl}
                                        alt={st.displayName}
                                        className="w-5 h-5 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <span
                                        className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                        style={{ background: getStaffAvatarColor(st.displayName) }}
                                      >
                                        {getStaffInitials(st.displayName)}
                                      </span>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate text-[11px]">{st.displayName}</div>
                                      {st.role && <div className="truncate text-[9.5px] text-slate-400">{st.role}</div>}
                                    </div>
                                    {isSelected && <Check size={11} className="text-amber-500 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        }
                      >
                        {effectiveAssigneeName ? (
                          <Tooltip title={`Phụ trách: ${effectiveAssigneeName} · Bấm để đổi người`}>
                            <button
                              type="button"
                              aria-label={`Giao người phụ trách mục ${item.title}`}
                              className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[8.5px] font-extrabold text-white shrink-0 cursor-pointer ring-1 ring-white/20 hover:ring-amber-400 transition-all overflow-hidden"
                              style={{ background: getStaffAvatarColor(effectiveAssigneeName) }}
                            >
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={effectiveAssigneeName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getStaffInitials(effectiveAssigneeName)
                              )}
                            </button>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Gán người phụ trách">
                            <button
                              type="button"
                              aria-label={`Giao người phụ trách mục ${item.title}`}
                              className="w-5 h-5 rounded-full border border-dashed border-slate-400/60 hover:border-amber-400 inline-flex items-center justify-center text-slate-400 hover:text-amber-400 cursor-pointer transition-all shrink-0"
                            >
                              <UserPlus size={9} />
                            </button>
                          </Tooltip>
                        )}
                      </Popover>

                      {/* Source reply jump button */}
                      {item.sourceReplyId && (
                        <Tooltip title="Cuộn tới tin nhắn thảo luận gốc trong luồng">
                          <button
                            type="button"
                            aria-label="Cuộn tới tin nhắn thảo luận gốc"
                            onClick={() => onScrollToReply && onScrollToReply(item.sourceReplyId!)}
                            className="p-1 rounded text-amber-500 hover:bg-amber-500/15 cursor-pointer transition-colors"
                          >
                            <MessageSquare size={11} />
                          </button>
                        </Tooltip>
                      )}

                      {/* Edit button */}
                      <Tooltip title="Sửa nội dung mục này">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          aria-label={`Sửa mục ${item.title}`}
                          className="opacity-0 group-hover/item:opacity-100 p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors"
                        >
                          <Pencil size={11} />
                        </button>
                      </Tooltip>

                      {/* Delete button */}
                      <Tooltip title="Xóa mục việc này">
                        <button
                          type="button"
                          onClick={() => onDeleteChecklistItem(item.id)}
                          aria-label={`Xóa mục ${item.title}`}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Inline Quick Add Input */}
          <div className="pt-1 flex items-center gap-1.5">
            <Input
              size="small"
              placeholder="Thêm việc cần làm... (Enter để lưu)"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onPressEnter={handleQuickAdd}
              disabled={isAdding}
              className="text-xs"
              style={{
                borderRadius: '8px',
                background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.12)',
              }}
            />
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={isAdding || !quickTitle.trim()}
              className="px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white cursor-pointer transition-all shrink-0"
            >
              <Plus size={12} />
              <span>Thêm</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Extraction Preview Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
            <Sparkles size={16} />
            <span>AI Trích xuất Checklist từ Luồng Thảo Luận</span>
          </div>
        }
        open={aiModalOpen}
        onCancel={() => setAiModalOpen(false)}
        onOk={handleApplyAiSuggestions}
        okText={`Áp dụng vào Checklist (${aiSuggestions.filter((s) => s.selected).length} việc)`}
        cancelText="Hủy"
        width={520}
        destroyOnHidden
      >
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          AI đã phân tích báo cáo công việc và luồng thảo luận (tự động lọc bỏ các câu chat trao đổi thường), gắn nhãn
          mảng và hạn chót:
        </p>

        <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
          {aiSuggestions.map((sug, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60"
            >
              <input
                type="checkbox"
                checked={sug.selected}
                onChange={(e) => {
                  const updated = [...aiSuggestions];
                  updated[idx].selected = e.target.checked;
                  setAiSuggestions(updated);
                }}
                className="w-4 h-4 rounded cursor-pointer accent-amber-500"
              />
              <Input
                size="small"
                value={sug.title}
                onChange={(e) => {
                  const updated = [...aiSuggestions];
                  updated[idx].title = e.target.value;
                  setAiSuggestions(updated);
                }}
                className="text-xs flex-1"
              />
              {sug.assigneeName && (
                <span
                  className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[8.5px] font-bold text-white shrink-0"
                  style={{ background: getStaffAvatarColor(sug.assigneeName) }}
                  title={sug.assigneeName}
                >
                  {getStaffInitials(sug.assigneeName)}
                </span>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Activity Log Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <History size={16} />
            <span>Lịch sử thao tác Task & Checklist</span>
          </div>
        }
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={null}
        width={480}
      >
        <div className="max-h-[380px] overflow-y-auto space-y-2 pt-2">
          {activityLog.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4">Chưa có lịch sử thao tác.</p>
          ) : (
            activityLog
              .slice()
              .reverse()
              .map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 text-xs"
                >
                  <Clock size={13} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{log.actorName}</span>
                      <span className="text-[10px] tabular-nums text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5 mb-0 text-[11.5px]">{log.description}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </Modal>
    </div>
  );
};
