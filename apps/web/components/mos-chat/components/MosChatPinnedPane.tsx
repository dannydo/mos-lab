import React from 'react';
import { Pin, CornerDownRight, MessageSquare, PinOff } from 'lucide-react';
import { Tooltip } from 'antd';
import type { MosChatConversation, MosChatMessage } from '@mos-lab/shared';

export interface MosChatPinnedPaneProps {
  pinnedMessages: MosChatMessage[];
  activeConversation: MosChatConversation | null;
  setActiveSubtab: (tab: 'chat' | 'tasks' | 'pinned') => void;
  surfaceBg: string;
  borderColor: string;
  borderStrong: string;
  navigateToMessage: (convId: string, msgId: string) => void;
  handleTogglePin: (msgId: string) => void;
  renderMessageAttachments: (attachments?: any[], compact?: boolean) => React.ReactNode;
}

export const MosChatPinnedPane: React.FC<MosChatPinnedPaneProps> = ({
  pinnedMessages,
  activeConversation,
  setActiveSubtab,
  surfaceBg,
  borderColor,
  borderStrong,
  navigateToMessage,
  handleTogglePin,
  renderMessageAttachments,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[13.5px] font-extrabold flex items-center gap-2">
          <Pin size={15} className="text-amber-500 fill-amber-400" />
          <span>Tin nhắn đã ghim</span>
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-bold tabular-nums"
            style={{ background: 'rgba(212, 168, 75, 0.16)', color: '#d4a84b' }}
          >
            {pinnedMessages.length}
          </span>
        </div>
        {pinnedMessages.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveSubtab('chat')}
            className="text-[12px] font-semibold text-amber-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Quay lại trò chuyện</span>
            <CornerDownRight size={13} />
          </button>
        )}
      </div>

      {pinnedMessages.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center p-8 rounded-xl text-center space-y-2 mt-4"
          style={{
            background: surfaceBg,
            border: `1px dashed ${borderColor}`,
          }}
        >
          <Pin size={32} className="text-slate-400/60 mb-1" />
          <div className="text-[13px] font-bold text-slate-400">
            Chưa có tin nhắn nào được ghim trong cuộc trò chuyện này
          </div>
          <div className="text-[11.5px] text-slate-500 max-w-sm">
            Rê chuột vào bất kỳ tin nhắn nào trong luồng trò chuyện và nhấn biểu tượng Ghim (Pin) để lưu nhanh tại đây.
          </div>
          <button
            type="button"
            onClick={() => setActiveSubtab('chat')}
            className="mt-2 h-7 px-3 rounded-md text-[11.5px] font-bold text-amber-500 hover:bg-amber-400/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            style={{ border: '1px solid rgba(212, 168, 75, 0.3)' }}
          >
            <MessageSquare size={13} />
            <span>Quay lại cuộc trò chuyện</span>
          </button>
        </div>
      ) : (
        pinnedMessages.map((m) => (
          <div
            key={m.id}
            onClick={() => {
              if (activeConversation) {
                navigateToMessage(activeConversation.id, m.id);
              }
            }}
            className="p-3 rounded-lg text-[12.5px] transition-all hover:shadow-md cursor-pointer group relative"
            style={{
              background: surfaceBg,
              border: `1px solid ${borderStrong}`,
              borderLeft: '4px solid #d4a84b',
            }}
          >
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <div className="text-[11.5px] font-bold flex items-center gap-1.5 truncate">
                <span className="text-amber-500 font-extrabold">{m.senderName}</span>
                <span className="text-slate-400 font-normal">·</span>
                <span className="text-slate-400 tabular-nums font-normal">{m.timeLabel}</span>
                {m.thread && m.thread.length > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-sky-500 tabular-nums"
                    style={{ background: 'rgba(14, 165, 233, 0.12)' }}
                  >
                    {m.thread.length} phản hồi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Nút bấm dẫn đến tin nhắn */}
                <Tooltip title="Đi đến tin nhắn này trong cuộc trò chuyện">
                  <button
                    type="button"
                    aria-label="Đi đến tin nhắn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeConversation) {
                        navigateToMessage(activeConversation.id, m.id);
                      }
                    }}
                    className="h-6 px-2 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                    style={{
                      background: 'rgba(212, 168, 75, 0.16)',
                      color: '#d4a84b',
                      border: '1px solid rgba(212, 168, 75, 0.3)',
                    }}
                  >
                    <CornerDownRight size={12} />
                    <span>Đi đến tin nhắn</span>
                  </button>
                </Tooltip>

                {/* Nút bỏ ghim */}
                <Tooltip title="Bỏ ghim tin nhắn này">
                  <button
                    type="button"
                    aria-label="Bỏ ghim tin nhắn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(m.id);
                    }}
                    className="w-6 h-6 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                  >
                    <PinOff size={13} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {m.text && <div className="text-slate-700 dark:text-slate-200 line-clamp-3 mb-1 break-words">{m.text}</div>}
            {renderMessageAttachments(m.attachments, true)}
          </div>
        ))
      )}
    </div>
  );
};
