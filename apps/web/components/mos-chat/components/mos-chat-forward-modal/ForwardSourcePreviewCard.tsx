'use client';

import React from 'react';
import { Switch } from 'antd';
import { MessageSquareReply, Paperclip } from 'lucide-react';
import type { MosChatConversation, MosChatMessage, MosChatThreadReply } from '@mos-lab/shared';

export interface ForwardSourcePreviewCardProps {
  isDark: boolean;
  sourceConversation?: MosChatConversation | null;
  sourceMessage: MosChatMessage;
  sourceReply?: MosChatThreadReply | null;
  activeRepliesCount: number;
  threadParticipantsSummary: string;
  threadAttachmentsCount: number;
  includeThread: boolean;
  onChangeIncludeThread: (checked: boolean) => void;
}

export const ForwardSourcePreviewCard: React.FC<ForwardSourcePreviewCardProps> = ({
  isDark,
  sourceConversation,
  sourceMessage,
  sourceReply,
  activeRepliesCount,
  threadParticipantsSummary,
  threadAttachmentsCount,
  includeThread,
  onChangeIncludeThread,
}) => {
  const previewAuthor = sourceReply ? sourceReply.senderName : sourceMessage.senderName;
  const previewText = sourceReply ? sourceReply.text : sourceMessage.text;
  const previewAttachments = sourceReply ? sourceReply.attachments : sourceMessage.attachments;
  const previewCard = sourceReply ? sourceReply.customerCard : sourceMessage.customerCard;

  return (
    <>
      <div
        className={`rounded-xl p-2.5 border border-l-[3px] ${
          isDark ? 'bg-zinc-900 border-zinc-800 border-l-amber-500' : 'bg-slate-50 border-slate-200 border-l-amber-600'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`text-[11.5px] font-bold truncate ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            {previewAuthor}
          </span>
          {sourceConversation ? (
            <span className={`text-[10.5px] truncate shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {sourceConversation.type === 'space'
                ? `#${sourceConversation.name}`
                : sourceConversation.isSelf
                  ? 'Ghi chú cá nhân'
                  : `DM · ${sourceConversation.name}`}
            </span>
          ) : null}
        </div>
        {previewText ? (
          <p className={`text-[12.5px] line-clamp-2 m-0 break-words ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {previewText}
          </p>
        ) : null}
        {(previewAttachments && previewAttachments.length > 0) || previewCard ? (
          <div
            className={`flex flex-wrap items-center gap-2 mt-1.5 text-[11px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {previewAttachments && previewAttachments.length > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Paperclip size={11} />
                <span>{previewAttachments.length} tệp / hình ảnh</span>
              </span>
            )}
            {previewCard && (
              <span className="inline-flex items-center gap-1">
                <span>👤 Hồ sơ: {previewCard.name}</span>
              </span>
            )}
          </div>
        ) : null}
      </div>

      {!sourceReply && activeRepliesCount > 0 && (
        <div
          className={`rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 border ${
            isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-500/5 border-indigo-500/20'
          }`}
        >
          <div className="min-w-0 flex-1">
            <div
              className={`flex items-center gap-1.5 text-[12.5px] font-bold ${
                isDark ? 'text-indigo-200' : 'text-indigo-800'
              }`}
            >
              <MessageSquareReply size={14} className="shrink-0" />
              <span className="tabular-nums">
                Chuyển tiếp kèm toàn bộ luồng trả lời phụ ({activeRepliesCount} phản hồi)
              </span>
            </div>
            <p className={`text-[11px] m-0 mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {threadParticipantsSummary ? `Gồm: ${threadParticipantsSummary}` : 'Giữ nguyên toàn bộ mạch trao đổi'}
              {threadAttachmentsCount > 0 ? ` · ${threadAttachmentsCount} tệp đính kèm` : ''}
            </p>
          </div>
          <Switch
            aria-label="Chuyển tiếp kèm toàn bộ luồng trả lời phụ"
            checked={includeThread}
            onChange={onChangeIncludeThread}
            size="small"
          />
        </div>
      )}
    </>
  );
};
