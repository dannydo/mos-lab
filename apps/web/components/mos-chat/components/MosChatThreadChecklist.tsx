import React, { useState, useMemo, useCallback } from 'react';
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
  User,
  ListTodo,
} from 'lucide-react';
import { Tooltip, Modal, Input, Progress, message, Badge } from 'antd';
import type { MosChatTaskItem, MosChatTaskChecklistItem, MosChatMessage } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';

export interface MosChatThreadChecklistProps {
  task: MosChatTaskItem;
  activeThreadMessage: MosChatMessage;
  onToggleChecklistItem: (checklistItemId: string) => Promise<void> | void;
  onAddChecklistItem: (title: string, sourceReplyId?: string | null) => Promise<void> | void;
  onDeleteChecklistItem: (checklistItemId: string) => Promise<void> | void;
  onScrollToReply?: (replyId: string) => void;
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
  onScrollToReply,
  isDark,
  token,
  isMobile = false,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // AI Extraction state
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<{ title: string; assigneeName?: string; sourceReplyId?: string; selected: boolean }>
  >([]);

  // Activity Log Modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const checklist = useMemo(() => task.checklist || [], [task.checklist]);
  const activityLog = useMemo(() => task.activityLog || [], [task.activityLog]);

  const totalCount = checklist.length;
  const doneCount = useMemo(() => checklist.filter((c) => c.done).length, [checklist]);
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

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

  const handleOpenAiExtract = async () => {
    setIsAiExtracting(true);
    try {
      const res = await apiClient.chat.extractChecklist(activeThreadMessage.id, {
        conversationId: activeThreadMessage.conversationId,
      });
      if (res?.suggestions && res.suggestions.length > 0) {
        setAiSuggestions(
          res.suggestions.map((s) => ({
            title: s.title,
            assigneeName: s.assigneeName || undefined,
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
    for (const item of selected) {
      await onAddChecklistItem(item.title, item.sourceReplyId || null);
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
            checklist.map((item) => (
              <div
                key={item.id}
                className={`group/item flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-all text-xs ${
                  item.done
                    ? 'bg-emerald-500/5 text-slate-400 dark:text-slate-500'
                    : 'bg-white/40 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
                }`}
                style={{
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.04)',
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Circular Checkbox */}
                  <button
                    type="button"
                    onClick={() => onToggleChecklistItem(item.id)}
                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      item.done
                        ? 'bg-emerald-500 text-white'
                        : 'border border-slate-400 dark:border-slate-500 hover:border-emerald-500 text-transparent hover:text-emerald-500'
                    }`}
                  >
                    <Check size={10} strokeWidth={item.done ? 3 : 2} />
                  </button>

                  {/* Title */}
                  <span
                    className={`truncate font-medium flex-1 ${
                      item.done ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}
                  >
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Assignee pill */}
                  {item.assigneeName && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-500/10 text-slate-500 dark:text-slate-400">
                      <User size={9} />
                      <span className="max-w-[70px] truncate">{item.assigneeName}</span>
                    </span>
                  )}

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

                  {/* Delete button */}
                  <Tooltip title="Xóa mục việc này">
                    <button
                      type="button"
                      onClick={() => onDeleteChecklistItem(item.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))
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
          AI đã phân tích các phản hồi trong luồng và phát hiện các đầu việc sau. Bạn có thể chọn lọc hoặc chỉnh sửa
          tiêu đề trước khi áp dụng:
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
                <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                  {sug.assigneeName}
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
