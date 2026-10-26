import React from 'react';
import {
  ListTodo,
  Hash,
  MessageSquare,
  BellRing,
  Plus,
  Search,
  X,
  Users,
  FolderKanban,
  ChevronRight,
  ChevronDown,
  AlarmClock,
} from 'lucide-react';
import { Tooltip } from 'antd';
import type { MosChatConversation, MosChatMessage, MosChatTaskItem } from '@mos-lab/shared';

export interface MosChatTasksPaneProps {
  activeConversation: MosChatConversation | null;
  isDark: boolean;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  token: any;
  uniqueTasks: MosChatTaskItem[];
  taskCounts: {
    mine: number;
    space: number;
    active: number;
    overdue: number;
    done: number;
    archived: number;
    total: number;
  };
  taskSearchQuery: string;
  setTaskSearchQuery: (query: string) => void;
  taskScopeFilter: 'ALL' | 'MINE' | 'SPACE';
  setTaskScopeFilter: (scope: 'ALL' | 'MINE' | 'SPACE') => void;
  taskFilter: 'ACTIVE' | 'MINE' | 'OVERDUE' | 'DONE' | 'ARCHIVED' | 'ALL';
  setTaskFilter: (filter: 'ACTIVE' | 'MINE' | 'OVERDUE' | 'DONE' | 'ARCHIVED' | 'ALL') => void;
  currentSpaceTasks: MosChatTaskItem[];
  otherSpaceTasks: MosChatTaskItem[];
  filteredTasks: MosChatTaskItem[];
  conversations: MosChatConversation[];
  collapseOtherSpaces: boolean;
  setCollapseOtherSpaces: React.Dispatch<React.SetStateAction<boolean>>;
  triggerTaskReminderAlert: (task: MosChatTaskItem) => void;
  openTaskModalFromMessage: (msg: MosChatMessage | null) => void;
  renderTaskCard: (
    t: MosChatTaskItem,
    sourceMsg: MosChatMessage | null,
    mode: 'inline' | 'list' | 'thread'
  ) => React.ReactNode;
  renderLiveMissionCard: (mission: any, sourceMsg?: MosChatMessage | null, mode?: any) => React.ReactNode;
}

export const MosChatTasksPane: React.FC<MosChatTasksPaneProps> = ({
  activeConversation,
  isDark,
  surfaceBg,
  surfaceRaised,
  borderColor,
  token,
  uniqueTasks,
  taskCounts,
  taskSearchQuery,
  setTaskSearchQuery,
  taskScopeFilter,
  setTaskScopeFilter,
  taskFilter,
  setTaskFilter,
  currentSpaceTasks,
  otherSpaceTasks,
  filteredTasks,
  conversations,
  collapseOtherSpaces,
  setCollapseOtherSpaces,
  triggerTaskReminderAlert,
  openTaskModalFromMessage,
  renderTaskCard,
  renderLiveMissionCard,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {/* Header: Title + Space Indicator + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-white/5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-extrabold flex items-center gap-1.5">
            <ListTodo size={17} className="text-amber-400" />
            <span>Quản Lý Công Việc & Nhắc Hẹn</span>
          </span>
          {activeConversation && (
            <span
              className="px-2 py-0.5 rounded-full text-[10.5px] font-bold flex items-center gap-1"
              style={{
                background: isDark ? 'rgba(212, 168, 75, 0.15)' : '#fef3c7',
                color: isDark ? '#fbbf24' : '#b45309',
                border: '1px solid rgba(212, 168, 75, 0.3)',
              }}
            >
              {activeConversation.type === 'space' ? <Hash size={11} /> : <MessageSquare size={11} />}
              <span className="truncate max-w-[160px]">{activeConversation.name}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip title="Test nổ chuông nhắc hẹn ngay">
            <button
              type="button"
              aria-label="Test nổ chuông nhắc hẹn ngay"
              onClick={() => {
                const firstOpen = uniqueTasks.find((t) => !t.done) || uniqueTasks[0];
                if (firstOpen) triggerTaskReminderAlert(firstOpen);
              }}
              className="w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer"
              style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
            >
              <BellRing size={14} className="text-amber-400" />
            </button>
          </Tooltip>
          <Tooltip title="Tạo Task mới">
            <button
              type="button"
              aria-label="Tạo Task mới"
              onClick={() => openTaskModalFromMessage(null)}
              className="h-7 px-2.5 rounded-lg inline-flex items-center gap-1 text-[11.5px] font-extrabold cursor-pointer"
              style={{ background: '#d4a84b', color: '#000' }}
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Tạo Task</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Search Bar + Scope Selector + Status Filter */}
      <div className="space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={taskSearchQuery}
            onChange={(e) => setTaskSearchQuery(e.target.value)}
            placeholder="Tìm kiếm công việc (tiêu đề, mã task, người nhận, người tạo)..."
            className="w-full h-8 pl-8 pr-7 rounded-lg text-[12px] transition-all outline-none"
            style={{
              background: surfaceBg,
              border: `1px solid ${taskSearchQuery ? '#d4a84b' : borderColor}`,
              color: token.colorText,
            }}
          />
          {taskSearchQuery && (
            <button
              type="button"
              onClick={() => setTaskSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Scope Filter Buttons: Tất cả task | Task của tôi | Không gian này */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11.5px]">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Phạm vi:</span>
          {[
            {
              key: 'ALL',
              label: `Tất cả task (${uniqueTasks.filter((t) => !t.done && !t.archived).length})`,
            },
            { key: 'MINE', label: `Task của tôi (${taskCounts.mine})` },
            ...(activeConversation
              ? [
                  {
                    key: 'SPACE',
                    label: `Trong ${activeConversation.name} (${taskCounts.space})`,
                  },
                ]
              : []),
          ].map((s) => {
            const isSel = taskScopeFilter === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setTaskScopeFilter(s.key as any)}
                className="px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all whitespace-nowrap text-[11px] flex items-center gap-1"
                style={{
                  background: isSel ? 'rgba(212, 168, 75, 0.2)' : surfaceRaised,
                  color: isSel ? '#fbbf24' : token.colorTextSecondary,
                  border: `1px solid ${isSel ? '#d4a84b' : borderColor}`,
                }}
              >
                {s.key === 'MINE' && <Users size={11} />}
                {s.key === 'SPACE' && <Hash size={11} />}
                {s.key === 'ALL' && <FolderKanban size={11} />}
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Filter Pills: Đang làm | Của tôi | Quá hạn | Đã xong | Lưu trữ | Tất cả */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11.5px]">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Trạng thái:</span>
          {[
            { key: 'ACTIVE', label: `Đang làm (${taskCounts.active})` },
            { key: 'MINE', label: `Của tôi (${taskCounts.mine})` },
            { key: 'OVERDUE', label: `Quá hạn (${taskCounts.overdue})` },
            { key: 'DONE', label: `Đã xong (${taskCounts.done})` },
            { key: 'ARCHIVED', label: `Lưu trữ (${taskCounts.archived})` },
            { key: 'ALL', label: `Tất cả (${taskCounts.total})` },
          ].map((f) => {
            const isSel = taskFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setTaskFilter(f.key as any)}
                className="px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition-all whitespace-nowrap text-[11px]"
                style={{
                  background: isSel ? '#d4a84b' : surfaceRaised,
                  color: isSel ? '#000' : token.colorTextSecondary,
                  border: `1px solid ${isSel ? '#d4a84b' : borderColor}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* IF IN A CONVERSATION/SPACE AND SCOPE IS NOT STRICTLY 'SPACE': PRIORITIZE THIS SPACE FIRST, OTHER TASKS BELOW */}
      {activeConversation && taskScopeFilter !== 'SPACE' ? (
        <div className="space-y-4 pt-1">
          {/* SECTION 1: TRONG KHÔNG GIAN NÀY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-white/5">
              <div className="flex items-center gap-2">
                {activeConversation.type === 'space' ? (
                  <Hash size={15} className="text-amber-400" />
                ) : (
                  <MessageSquare size={15} className="text-indigo-400" />
                )}
                <span className="text-[12.5px] font-black uppercase tracking-wide">
                  Trong không gian này: {activeConversation.name}
                </span>
                <span
                  className="px-2 py-0.2 rounded-full text-[10px] font-bold tabular-nums"
                  style={{
                    background: isDark ? 'rgba(212, 168, 75, 0.2)' : '#fef3c7',
                    color: isDark ? '#fbbf24' : '#b45309',
                  }}
                >
                  {currentSpaceTasks.length} việc
                </span>
                <span className="hidden sm:inline px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Ưu tiên không gian hiện tại
                </span>
              </div>
            </div>

            {currentSpaceTasks.length > 0 ? (
              <div className="space-y-2">
                {currentSpaceTasks.map((t) => {
                  const taskConv = conversations.find((c) => c.id === t.conversationId);
                  const taskSourceMsg =
                    taskConv?.messages.find((m) => m.id === t.sourceMessageId || m.taskId === t.id) || null;
                  return <div key={t.id}>{renderTaskCard(t, taskSourceMsg, 'list')}</div>;
                })}
              </div>
            ) : (
              <div
                className="p-3 rounded-xl text-center text-slate-400 text-[12px] flex items-center justify-between gap-2"
                style={{ background: surfaceRaised, border: `1px dashed ${borderColor}` }}
              >
                <span>Không có công việc nào thuộc không gian này.</span>
                <button
                  type="button"
                  onClick={() => openTaskModalFromMessage(null)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  style={{ background: '#d4a84b', color: '#000' }}
                >
                  <Plus size={12} />
                  <span>Tạo việc trong không gian này</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: CÁC KHÔNG GIAN & HỘI THOẠI KHÁC */}
          {otherSpaceTasks.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <FolderKanban size={15} className="text-slate-400" />
                  <span className="text-[12.5px] font-black uppercase tracking-wide text-slate-300">
                    Các không gian & hội thoại khác
                  </span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold tabular-nums bg-slate-500/20 text-slate-300">
                    {otherSpaceTasks.length} việc
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setCollapseOtherSpaces((prev) => !prev)}
                  className="px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {collapseOtherSpaces ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <span>{collapseOtherSpaces ? 'Mở rộng' : 'Thu gọn'}</span>
                </button>
              </div>

              {!collapseOtherSpaces && (
                <div className="space-y-2">
                  {otherSpaceTasks.map((t) => {
                    const taskConv = conversations.find((c) => c.id === t.conversationId);
                    const taskSourceMsg =
                      taskConv?.messages.find((m) => m.id === t.sourceMessageId || m.taskId === t.id) || null;
                    return <div key={t.id}>{renderTaskCard(t, taskSourceMsg, 'list')}</div>;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* SINGLE LIST (E.G. WHEN NO ACTIVE CONVERSATION OR WHEN FILTERED STRICTLY TO THIS SPACE) */
        <div className="space-y-2 pt-1">
          {filteredTasks.map((t) => {
            const taskConv = conversations.find((c) => c.id === t.conversationId);
            const taskSourceMsg =
              taskConv?.messages.find((m) => m.id === t.sourceMessageId || m.taskId === t.id) || null;
            return <div key={t.id}>{renderTaskCard(t, taskSourceMsg, 'list')}</div>;
          })}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500 mb-3">
            <AlarmClock size={24} />
          </div>
          <div className="text-[13.5px] font-bold text-slate-300 mb-1">
            {taskFilter === 'ARCHIVED'
              ? 'Chưa có công việc nào trong Lưu trữ'
              : taskFilter === 'DONE'
                ? 'Chưa có công việc nào hoàn thành'
                : taskScopeFilter === 'MINE'
                  ? 'Bạn chưa có công việc nào được giao'
                  : taskScopeFilter === 'SPACE'
                    ? `Không có công việc nào trong "${activeConversation?.name || 'không gian này'}"`
                    : 'Chưa có đầu việc hoặc nhắc hẹn nào'}
          </div>
          <div className="text-[12px] max-w-xs mb-4">
            {taskFilter === 'ARCHIVED'
              ? 'Các công việc được lưu trữ sẽ xuất hiện tại đây và có thể khôi phục bất kỳ lúc nào.'
              : 'Bạn có thể tạo đầu việc mới hoặc bấm vào biểu tượng hẹn giờ trên bất kỳ tin nhắn nào.'}
          </div>
          {taskFilter !== 'ARCHIVED' && (
            <button
              type="button"
              onClick={() => openTaskModalFromMessage(null)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              style={{ background: '#d4a84b', color: '#000' }}
            >
              <Plus size={14} />
              <span>Tạo đầu việc mới</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
