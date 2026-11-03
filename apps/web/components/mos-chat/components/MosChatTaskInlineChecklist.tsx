import React, { useState, useMemo } from 'react';
import {
  Check,
  Plus,
  Trash2,
  ListTodo,
  Loader2,
  Sparkles,
  Pencil,
  Calendar,
  UserPlus,
  X,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Tooltip, Input, Progress, Popover } from 'antd';
import {
  parseChecklistTitleBadges,
  type MosChatStaffMember,
  type MosChatTaskChecklistItem,
  type MosChatTaskItem,
  type UpdateMosChatTaskRequest,
} from '@mos-lab/shared';

export interface MosChatTaskInlineChecklistProps {
  task: MosChatTaskItem;
  onUpdateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<unknown> | unknown;
  isDark: boolean;
  token?: any;
  staffList?: MosChatStaffMember[];
  onScrollToReply?: (replyId: string) => void;
}

const AVATAR_PALETTE = ['#d97706', '#8b5cf6', '#0ea5e9', '#10b981', '#ec4899', '#f43f5e', '#6366f1'];

export function getStaffInitials(name?: string | null): string {
  const cleaned = (name || '').trim();
  if (!cleaned) return '?';
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
}

export function getStaffAvatarColor(name?: string | null): string {
  const s = (name || 'user').trim();
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function getDomainBadgeStyle(domain: string, isDark: boolean): React.CSSProperties {
  const upper = domain.toUpperCase();
  if (upper === 'CS' || upper === 'CSKH') {
    return {
      background: isDark ? 'rgba(14, 165, 233, 0.18)' : 'rgba(14, 165, 233, 0.12)',
      color: isDark ? '#38bdf8' : '#0284c7',
      border: '1px solid rgba(14, 165, 233, 0.35)',
    };
  }
  if (upper === 'HR' || upper.includes('NHÂN SỰ')) {
    return {
      background: isDark ? 'rgba(217, 70, 239, 0.18)' : 'rgba(217, 70, 239, 0.12)',
      color: isDark ? '#e879f9' : '#c026d3',
      border: '1px solid rgba(217, 70, 239, 0.35)',
    };
  }
  if (upper === 'MKT' || upper.includes('MARKETING')) {
    return {
      background: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.12)',
      color: isDark ? '#818cf8' : '#4f46e5',
      border: '1px solid rgba(99, 102, 241, 0.35)',
    };
  }
  if (upper.includes('VẬN HÀNH') || upper === 'VH') {
    return {
      background: isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)',
      color: isDark ? '#34d399' : '#059669',
      border: '1px solid rgba(16, 185, 129, 0.35)',
    };
  }
  return {
    background: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.12)',
    color: isDark ? '#fbbf24' : '#d97706',
    border: '1px solid rgba(245, 158, 11, 0.35)',
  };
}

export function formatShortDeadlineLabel(deadlineIso?: string | null): {
  label: string;
  fullLabel: string;
  isOverdue: boolean;
  isDueSoon: boolean;
} | null {
  if (!deadlineIso) return null;
  const d = new Date(deadlineIso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const isDueSoon = !isOverdue && diffMs <= 3 * 24 * 3600 * 1000;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return {
    label: `${dd}/${mm}`,
    fullLabel: `${dd}/${mm}/${yyyy}`,
    isOverdue,
    isDueSoon,
  };
}

export function buildQuickDeadlineOptions(): Array<{ label: string; value: string }> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(18, 0, 0, 0);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const endOfWeek = new Date(now);
  const day = endOfWeek.getDay();
  const daysToSat = day === 0 ? 5 : Math.max(1, 6 - day);
  endOfWeek.setDate(endOfWeek.getDate() + daysToSat);
  endOfWeek.setHours(18, 0, 0, 0);

  const week1OfMonth = new Date(now.getFullYear(), now.getMonth(), 7, 18, 0, 0, 0);
  if (week1OfMonth.getTime() < now.getTime() - 24 * 3600 * 1000) {
    week1OfMonth.setMonth(week1OfMonth.getMonth() + 1);
  }

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 18, 0, 0, 0);

  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

  return [
    { label: `Hôm nay (${fmt(today)})`, value: today.toISOString() },
    { label: `Ngày mai (${fmt(tomorrow)})`, value: tomorrow.toISOString() },
    { label: `Tuần này (${fmt(endOfWeek)})`, value: endOfWeek.toISOString() },
    { label: `Tuần 1 (${fmt(week1OfMonth)})`, value: week1OfMonth.toISOString() },
    { label: `Cuối tháng (${fmt(endOfMonth)})`, value: endOfMonth.toISOString() },
  ];
}

export const MosChatTaskInlineChecklist: React.FC<MosChatTaskInlineChecklistProps> = ({
  task,
  onUpdateTask,
  isDark,
  staffList = [],
  onScrollToReply,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const isAddingRef = React.useRef(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [actingItemId, setActingItemId] = useState<string | null>(null);

  // Expand "More / Less" per item
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  // Inline Edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Popover states for Deadline & Assignee
  const [openDeadlineItemId, setOpenDeadlineItemId] = useState<string | null>(null);
  const [openAssigneeItemId, setOpenAssigneeItemId] = useState<string | null>(null);
  const [staffSearch, setStaffSearch] = useState('');

  const checklist = task.checklist || [];
  const totalCount = checklist.length;
  const doneCount = checklist.filter((c) => c.done).length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Merge staff candidates for quick 1-click avatar assignment
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

  const quickDeadlines = useMemo(() => buildQuickDeadlineOptions(), []);

  const handleAutoSummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'auto_summarize',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleToggle = async (itemId: string) => {
    if (actingItemId) return;
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'toggle',
        checklistItemId: itemId,
      });
    } finally {
      setActingItemId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (actingItemId) return;
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'delete',
        checklistItemId: itemId,
      });
    } finally {
      setActingItemId(null);
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
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'edit',
        checklistItemId: itemId,
        checklistItem: { title: trimmed },
      });
      setEditingItemId(null);
    } finally {
      setActingItemId(null);
    }
  };

  const handleSetDeadline = async (itemId: string, deadlineIso: string | null) => {
    setOpenDeadlineItemId(null);
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'edit',
        checklistItemId: itemId,
        checklistItem: { deadline: deadlineIso },
      });
    } finally {
      setActingItemId(null);
    }
  };

  const handleSetAssignee = async (
    itemId: string,
    staff: { id: number | string; displayName: string; avatarUrl?: string | null } | null
  ) => {
    setOpenAssigneeItemId(null);
    setStaffSearch('');
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'edit',
        checklistItemId: itemId,
        checklistItem: staff
          ? {
              assigneeId: staff.id,
              assigneeName: staff.displayName,
              assigneeAvatar: staff.avatarUrl || null,
            }
          : {
              assigneeId: null,
              assigneeName: null,
              assigneeAvatar: null,
            },
      });
    } finally {
      setActingItemId(null);
    }
  };

  const handleAdd = async () => {
    const trimmed = quickTitle.trim();
    if (!trimmed || isAdding || isAddingRef.current) return;
    isAddingRef.current = true;
    setIsAdding(true);
    setQuickTitle('');
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'add',
        checklistItem: { title: trimmed },
      });
    } catch {
      setQuickTitle(trimmed);
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2 rounded-xl p-2.5 space-y-2 text-left transition-all border"
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(248, 250, 252, 0.95)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-1 border-b border-black/5 dark:border-white/5 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <ListTodo size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200">Checklist đầu việc</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip title="Tóm tắt & chuẩn hóa Checklist từ báo cáo công việc">
            <button
              type="button"
              disabled={isSummarizing}
              onClick={handleAutoSummarize}
              aria-label="Tự động tóm tắt và thêm checklist"
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-all bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 disabled:opacity-50"
            >
              {isSummarizing ? (
                <Loader2 size={12} className="animate-spin shrink-0" />
              ) : (
                <Sparkles size={12} className="shrink-0" />
              )}
            </button>
          </Tooltip>
          <div className="flex items-center gap-1 shrink-0 text-[10.5px] font-bold tabular-nums">
            <span
              className={
                percent === 100 ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'
              }
            >
              {doneCount}/{totalCount}
            </span>
            <span className="text-slate-400 text-[10px]">({percent}%)</span>
          </div>
        </div>
      </div>

      {/* Executive Summary Banner */}
      {task.summary && (
        <div
          className="px-2.5 py-1.5 rounded-lg text-[11px] leading-relaxed flex items-start gap-1.5"
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
        <Progress
          percent={percent}
          size="small"
          showInfo={false}
          strokeColor={percent === 100 ? '#10b981' : '#f59e0b'}
          trailColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
          className="!m-0"
        />
      )}

      {/* Checklist Items */}
      <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-0.5">
        {checklist.length === 0 ? (
          <div className="py-2 text-center space-y-1.5">
            <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Chưa có đầu việc nào. Nhập mục việc bên dưới để bắt đầu.
            </div>
            <div>
              <button
                type="button"
                disabled={isSummarizing}
                onClick={handleAutoSummarize}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 disabled:opacity-50"
              >
                {isSummarizing ? (
                  <Loader2 size={11} className="animate-spin shrink-0" />
                ) : (
                  <Sparkles size={11} className="shrink-0" />
                )}
                <span>✨ Đọc công việc của {task.assigneeName || 'nhân sự'} & Tự động thêm Checklist</span>
              </button>
            </div>
          </div>
        ) : (
          checklist.map((item) => {
            const isItemActing = actingItemId === item.id;
            const isEditing = editingItemId === item.id;
            const isExpanded = Boolean(expandedItemIds[item.id]);
            const parsed = parseChecklistTitleBadges(item.title);
            const displayBody = parsed.cleanTitle || item.title;
            const isLongText = displayBody.length > 52 || item.title.length > 68;
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
                className={`group/chk flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-all text-[11.5px] ${
                  item.done
                    ? 'bg-emerald-500/5 text-slate-400 dark:text-slate-500'
                    : 'bg-white/50 dark:bg-slate-800/50 hover:bg-white/80 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                }`}
                style={{
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.05)',
                }}
              >
                {/* Left: Checkbox + Badges + Multi-line Text / Inline Editor */}
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <button
                    type="button"
                    disabled={isItemActing}
                    onClick={() => handleToggle(item.id)}
                    aria-label={item.done ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'}
                    className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      item.done
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-400 dark:border-slate-500 hover:border-emerald-500 text-transparent hover:text-emerald-500'
                    }`}
                  >
                    {isItemActing ? (
                      <Loader2 size={10} className="animate-spin text-current" />
                    ) : (
                      <Check size={10} strokeWidth={item.done ? 3 : 2} />
                    )}
                  </button>

                  {isEditing ? (
                    <div className="flex-1 min-w-0 flex items-start gap-1">
                      <Input.TextArea
                        autoFocus
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation?.();
                            setEditingItemId(null);
                          } else if (e.key === 'Enter' && !e.shiftKey) {
                            if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;
                            e.preventDefault();
                            e.stopPropagation();
                            handleSaveEdit(item.id);
                          }
                        }}
                        className="text-xs flex-1"
                        style={{
                          borderRadius: '6px',
                          background: isDark ? 'rgba(15, 23, 42, 0.9)' : '#ffffff',
                        }}
                      />
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <Tooltip title="Lưu (Enter)">
                          <button
                            type="button"
                            aria-label="Lưu (Enter)"
                            onClick={() => handleSaveEdit(item.id)}
                            className="w-6 h-6 rounded inline-flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer transition-colors"
                          >
                            <Check size={12} />
                          </button>
                        </Tooltip>
                        <Tooltip title="Huỷ (Esc)">
                          <button
                            type="button"
                            aria-label="Huỷ (Esc)"
                            onClick={() => setEditingItemId(null)}
                            className="w-6 h-6 rounded inline-flex items-center justify-center bg-slate-500/15 hover:bg-slate-500/25 text-slate-400 cursor-pointer transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`flex-1 min-w-0 select-text ${isLongText ? 'cursor-pointer' : 'cursor-text'}`}
                      onClick={() => {
                        if (isLongText) {
                          setExpandedItemIds((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }));
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(item);
                      }}
                      title={
                        isLongText
                          ? isExpanded
                            ? 'Bấm để thu gọn 1 dòng · Nhấp đúp để sửa'
                            : `${displayBody} (Bấm để mở rộng · Nhấp đúp để sửa)`
                          : 'Nhấp đúp để chỉnh sửa nội dung'
                      }
                    >
                      <div
                        className={`font-medium leading-snug ${
                          !isExpanded ? 'truncate' : 'whitespace-normal break-words'
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
                    </div>
                  )}
                </div>

                {/* Right: Expand Symbol + Deadline Pill + Avatar-only Assignee + Edit + Delete */}
                {!isEditing && (
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {isLongText && (
                      <Tooltip title={isExpanded ? 'Thu gọn 1 dòng' : 'Xem toàn bộ nội dung'}>
                        <button
                          type="button"
                          aria-label={isExpanded ? 'Thu gọn' : 'Xem thêm'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedItemIds((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }));
                          }}
                          className={`p-1 rounded cursor-pointer transition-colors shrink-0 ${
                            isExpanded
                              ? 'text-amber-500 bg-amber-500/15 hover:bg-amber-500/25'
                              : 'text-amber-500/80 hover:text-amber-500 hover:bg-amber-500/10'
                          }`}
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </Tooltip>
                    )}
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
                            className="opacity-75 hover:opacity-100 p-1 rounded text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 cursor-pointer transition-all"
                          >
                            <Calendar size={11} />
                          </button>
                        </Tooltip>
                      )}
                    </Popover>

                    {/* Avatar-Only Assignee Picker Popover */}
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
                              <img src={avatarUrl} alt={effectiveAssigneeName} className="w-full h-full object-cover" />
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

                    {/* Source Reply Jump (if in thread) */}
                    {item.sourceReplyId && onScrollToReply && (
                      <Tooltip title="Cuộn tới tin nhắn thảo luận gốc">
                        <button
                          type="button"
                          onClick={() => onScrollToReply(item.sourceReplyId!)}
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
                        disabled={isItemActing}
                        onClick={() => handleStartEdit(item)}
                        aria-label={`Sửa mục ${item.title}`}
                        className="opacity-75 hover:opacity-100 p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-all shrink-0"
                      >
                        <Pencil size={11} />
                      </button>
                    </Tooltip>

                    {/* Delete button */}
                    <Tooltip title="Xoá mục này">
                      <button
                        type="button"
                        disabled={isItemActing}
                        onClick={() => handleDelete(item.id)}
                        aria-label={`Xoá mục ${item.title}`}
                        className="opacity-75 hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-all shrink-0"
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
      </div>

      {/* Quick Add Row */}
      <div
        className="pt-1 flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          size="small"
          placeholder="Thêm đầu việc mới (nhấn Enter)..."
          value={quickTitle}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          onChange={(e) => setQuickTitle(e.target.value)}
          onPressEnter={(e) => {
            if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;
            e.preventDefault();
            e.stopPropagation();
            handleAdd();
          }}
          disabled={isAdding}
          className="text-xs"
          style={{
            borderRadius: '6px',
            background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          }}
        />
        <Tooltip title="Thêm mục việc (Enter)">
          <button
            type="button"
            aria-label="Thêm"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
            disabled={isAdding || !quickTitle.trim()}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white cursor-pointer transition-all shrink-0 shadow-sm"
          >
            {isAdding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
