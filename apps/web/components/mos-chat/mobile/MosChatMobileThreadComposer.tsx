'use client';

import React from 'react';
import {
  Check,
  CheckCircle2,
  CornerDownLeft,
  File,
  FilePenLine,
  FileText,
  Film,
  Loader2,
  MessageSquareReply,
  Play,
  Plus,
  Rocket,
  SendHorizontal,
  Smile,
  X,
} from 'lucide-react';
import { Avatar } from 'antd';
import type {
  MosChatCustomerCard,
  MosChatImageAttachment,
  MosChatMissionActionType,
  MosChatMissionSummary,
  MosChatThreadReply,
  SafeAny,
} from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { getFileExtension, isImageAttachment } from '../utils/chat-helpers';
import { formatVideoDuration, isVideoAttachment } from '../utils/chat-video';
import type { PendingChatUploadItem } from '../shared/hooks/useChatUploadQueue';
import { MaiDebugControlPill } from '../components/MaiDebugControlPill';
import { isStrictSuperAdminClientUser } from '../shared/hooks/useMaiDebugSettings';
import { MosChatMobileMentionAutocomplete } from './MosChatMobileMentionAutocomplete';
import { MosChatMobileUploadStrip } from './MosChatMobileUploadStrip';

export interface MosChatMobileThreadComposerProps {
  isDark: boolean;
  keyboardOffset: number;
  text: string;
  setText: React.Dispatch<React.SetStateAction<string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isSending: boolean;
  isUploadingImages: boolean;
  pendingUploads?: PendingChatUploadItem[];
  onCancelPendingUpload?: (tempId: string) => void;
  onRetryPendingUpload?: (tempId: string) => void;
  onDismissPendingUpload?: (tempId: string) => void;
  attachedImages: MosChatImageAttachment[];
  setAttachedImages: React.Dispatch<React.SetStateAction<MosChatImageAttachment[]>>;
  stagedCustomerCard: MosChatCustomerCard | null;
  setStagedCustomerCard: React.Dispatch<React.SetStateAction<MosChatCustomerCard | null>>;
  replyingToReply: MosChatThreadReply | null;
  setReplyingToReply: React.Dispatch<React.SetStateAction<MosChatThreadReply | null>>;
  hasAnyPendingAction: boolean;
  mission: MosChatMissionSummary | null;
  currentUser?: SafeAny;
  isAiPrivateConv?: boolean;
  isStrictDannySuperAdmin: boolean;
  canApproveImplementation: boolean;
  canSuperAdminApproveCommit: boolean;
  canSuperAdminApproveDeploy: boolean;
  canReporterAccept: boolean;
  actionLoading: string | null;
  handleExecuteMissionAction: (action: MosChatMissionActionType, feedback?: string) => Promise<void>;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleInsertNewline: () => void;
  handleSend: () => Promise<void>;
  setActionSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCkEditorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setStickerPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MosChatMobileThreadComposer: React.FC<MosChatMobileThreadComposerProps> = ({
  isDark,
  keyboardOffset,
  text,
  setText,
  textareaRef,
  isSending,
  isUploadingImages,
  pendingUploads = [],
  onCancelPendingUpload,
  onRetryPendingUpload,
  onDismissPendingUpload,
  attachedImages,
  setAttachedImages,
  stagedCustomerCard,
  setStagedCustomerCard,
  replyingToReply,
  setReplyingToReply,
  hasAnyPendingAction,
  mission,
  currentUser,
  isAiPrivateConv = false,
  isStrictDannySuperAdmin,
  canApproveImplementation,
  canSuperAdminApproveCommit,
  canSuperAdminApproveDeploy,
  canReporterAccept,
  actionLoading,
  handleExecuteMissionAction,
  handleKeyDown,
  handleInsertNewline,
  handleSend,
  setActionSheetOpen,
  setCkEditorOpen,
  setStickerPickerOpen,
}) => {
  return (
    <div
      style={{
        transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : 'none',
        transition: 'transform 0.15s ease-out',
        paddingBottom: keyboardOffset > 50 ? '8px' : 'max(env(safe-area-inset-bottom, 14px), 12px)',
      }}
      className="sticky bottom-0 z-30 bg-[var(--mos-surface)] backdrop-blur-md border-t border-[var(--mos-surface-border)] px-3 pt-2 shadow-lg"
    >
      {hasAnyPendingAction && mission && (
        <div
          className={`mb-2 p-2 rounded-xl border shadow-md backdrop-blur-md ${
            isDark ? 'bg-purple-950/40 border-purple-800/50' : 'bg-purple-500/10 border-purple-500/30'
          }`}
        >
          <div className="flex items-center justify-between gap-1.5 mb-1.5 px-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Rocket className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-[11px] font-bold truncate ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>
                {mission.stageLabel || mission.humanBadge || 'Chờ duyệt'}
              </span>
            </div>
            <span className={`text-[10px] font-semibold truncate ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
              #{mission.missionKey || `MSN-${mission.reportId}`}
            </span>
          </div>

          <div className="space-y-1.5">
            {isStrictDannySuperAdmin && canApproveImplementation && (
              <button
                type="button"
                disabled={actionLoading === 'APPROVE_IMPLEMENTATION'}
                onClick={() => void handleExecuteMissionAction('APPROVE_IMPLEMENTATION')}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/40 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
              >
                {actionLoading === 'APPROVE_IMPLEMENTATION' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                <span>Duyệt nâng cấp tiếp · Cổng 1 (mOS Mission)</span>
              </button>
            )}

            {isStrictDannySuperAdmin && canSuperAdminApproveCommit && (
              <button
                type="button"
                disabled={actionLoading === 'APPROVE_COMMIT'}
                onClick={() => void handleExecuteMissionAction('APPROVE_COMMIT')}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/30 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
              >
                {actionLoading === 'APPROVE_COMMIT' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                )}
                <span>✅ Duyệt Commit (Cổng 2)</span>
              </button>
            )}

            {isStrictDannySuperAdmin && canSuperAdminApproveDeploy && (
              <button
                type="button"
                disabled={actionLoading === 'APPROVE_DEPLOY'}
                onClick={() => void handleExecuteMissionAction('APPROVE_DEPLOY')}
                className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
              >
                {actionLoading === 'APPROVE_DEPLOY' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Rocket className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                )}
                <span>🚀 Duyệt Deploy lên Web (Cổng 3)</span>
              </button>
            )}

            {canReporterAccept && (
              <button
                type="button"
                disabled={actionLoading === 'REPORTER_ACCEPT'}
                onClick={() => void handleExecuteMissionAction('REPORTER_ACCEPT')}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-98 transition-transform disabled:opacity-50 cursor-pointer"
              >
                {actionLoading === 'REPORTER_ACCEPT' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>🎉 Đã đúng ý (Nghiệm thu hoàn tất)</span>
              </button>
            )}
          </div>
        </div>
      )}

      <MosChatMobileMentionAutocomplete
        text={text}
        onSelectMention={(nextText) => setText(nextText)}
        textareaRef={textareaRef}
      />

      {isStrictSuperAdminClientUser(currentUser) && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <MaiDebugControlPill
            isStrictDannySuperAdmin={isStrictSuperAdminClientUser(currentUser)}
            isDark={isDark}
            isAiPrivateConv={isAiPrivateConv}
            compact
            onEnsureMaiMention={() => {
              setText((prev) => (/(?:^|\s)@\s*mai\b/i.test(prev) ? prev : `@MAI ${prev}`));
              textareaRef.current?.focus();
            }}
          />
        </div>
      )}

      {replyingToReply && (
        <div className="flex items-center justify-between bg-[var(--mos-surface-muted)] border border-amber-500/30 rounded-xl px-3 py-1.5 mb-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <MessageSquareReply className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <div className="truncate">
              <span className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                Trả lời {replyingToReply.senderName}:
              </span>{' '}
              <span className="text-[var(--mos-text)] truncate">{replyingToReply.text}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToReply(null)}
            className="p-0.5 text-[var(--mos-text-muted)] hover:text-[var(--mos-text)]"
            aria-label="Hủy trích dẫn"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {attachedImages.length > 0 && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar py-1">
          {attachedImages.map((att, idx) => {
            const isVid = isVideoAttachment(att);
            const isImg = !isVid && isImageAttachment(att);
            const ext = getFileExtension(att.name || att.url);
            const isPdf = ext.toLowerCase() === 'pdf' || att.mimeType === 'application/pdf';

            if (isVid) {
              return (
                <div
                  key={att.id || idx}
                  className="relative w-14 h-14 rounded-xl overflow-hidden border border-purple-500/50 shrink-0 group bg-[var(--mos-surface-raised)] shadow-sm flex items-center justify-center"
                >
                  {att.posterUrl ? (
                    <img src={att.posterUrl} alt={att.name || 'Video'} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className={`w-full h-full bg-[var(--background)] flex items-center justify-center ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
                    >
                      <Film size={22} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center shadow">
                      <Play size={10} className="fill-white translate-x-0.5" />
                    </div>
                  </div>
                  {att.durationSec ? (
                    <span className="absolute bottom-0.5 right-1 px-1 rounded bg-black/75 text-[9px] text-white font-mono leading-tight">
                      {formatVideoDuration(att.durationSec)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setAttachedImages((prev) => prev.filter((img) => img.id !== att.id))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] active:scale-90 shadow"
                    aria-label={`Xóa video ${idx + 1}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            }

            if (isImg) {
              return (
                <div
                  key={att.id || idx}
                  className="relative w-14 h-14 rounded-xl overflow-hidden border border-amber-500/40 shrink-0 bg-[var(--mos-surface-raised)] shadow-sm"
                >
                  <img src={resolveMediaUrl(att.url)} alt={att.name} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAttachedImages((prev) => prev.filter((img) => img.id !== att.id))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px]"
                    aria-label="Xóa ảnh đính kèm"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={att.id || idx}
                className="relative h-14 min-w-[120px] max-w-[170px] px-2.5 rounded-xl border border-amber-500/40 shrink-0 flex items-center gap-2 bg-[var(--mos-surface-raised)] shadow-sm"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-[10px] ${
                    isPdf
                      ? `bg-rose-500/20 border border-rose-500/30 ${isDark ? 'text-rose-400' : 'text-rose-600'}`
                      : `bg-emerald-500/20 border border-emerald-500/30 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`
                  }`}
                >
                  {isPdf ? <FileText size={16} /> : <File size={16} />}
                </div>
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-[11px] font-semibold text-[var(--mos-text)] truncate" title={att.name}>
                    {att.name}
                  </p>
                  <span className="text-[9.5px] text-[var(--mos-text-muted)] uppercase font-extrabold">{ext}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedImages((prev) => prev.filter((img) => img.id !== att.id))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/75 text-white flex items-center justify-center text-[10px] active:scale-90 shadow"
                  aria-label={`Xóa tệp ${idx + 1}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
          {isUploadingImages && (
            <div className="w-14 h-14 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center shrink-0">
              <Loader2 className={`w-4 h-4 animate-spin ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className={`text-[9px] mt-0.5 font-medium ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                Tải...
              </span>
            </div>
          )}
        </div>
      )}

      {isUploadingImages && attachedImages.length === 0 && pendingUploads.length === 0 && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs ${
            isDark ? 'text-amber-300' : 'text-amber-800'
          }`}
        >
          <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span>Đang tải hình ảnh lên...</span>
        </div>
      )}

      {pendingUploads.length > 0 && onCancelPendingUpload && onRetryPendingUpload && onDismissPendingUpload && (
        <MosChatMobileUploadStrip
          items={pendingUploads}
          onCancel={onCancelPendingUpload}
          onRetry={onRetryPendingUpload}
          onDismiss={onDismissPendingUpload}
        />
      )}

      {stagedCustomerCard && (
        <div
          data-testid="mos-chat-mobile-staged-customer-thread"
          className="mb-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-between text-xs animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              size={22}
              src={stagedCustomerCard.avatarUrl || undefined}
              className="shrink-0 font-bold text-[10px] border border-amber-400/40 select-none shadow-sm"
              style={{ backgroundColor: '#d97706', color: '#ffffff' }}
            >
              {(stagedCustomerCard.name || 'KH')
                .trim()
                .split(/\s+/)
                .map((w) => w[0])
                .filter(Boolean)
                .slice(-2)
                .join('')
                .toUpperCase()}
            </Avatar>
            <span className="font-bold text-[var(--mos-text)] truncate">{stagedCustomerCard.name}</span>
            <span className={`font-medium truncate ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              ({stagedCustomerCard.meta})
            </span>
            {stagedCustomerCard.cvName && (
              <span className="text-[var(--mos-text-muted)] truncate hidden sm:inline">
                · {stagedCustomerCard.cvName}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStagedCustomerCard(null)}
            className="text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] p-1 rounded-lg hover:bg-[var(--mos-surface-muted)] active:scale-95 transition-all shrink-0"
            title="Bỏ đính kèm thẻ khách hàng"
            aria-label="Bỏ đính kèm thẻ khách hàng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setActionSheetOpen(true)}
          className="w-9 h-9 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] flex items-center justify-center text-[var(--mos-text)] active:scale-90 transition-transform shrink-0 mb-0.5 cursor-pointer"
          aria-label="Tác vụ đính kèm"
          title="Tác vụ đính kèm & Tiện ích"
        >
          <Plus className="w-5 h-5 text-[var(--mos-accent)]" />
        </button>

        <div className="flex-1 min-w-0 min-h-[38px] max-h-[120px] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] rounded-2xl px-3 py-1.5 flex items-center gap-1.5 focus-within:border-[var(--mos-accent)] transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Trả lời trong luồng..."
            className="flex-1 min-w-0 bg-transparent border-none outline-none focus:outline-none focus-visible:outline-none text-sm text-[var(--mos-text)] placeholder-[var(--mos-text-muted)] resize-none max-h-[100px] py-1 leading-snug"
            style={{ outline: 'none', boxShadow: 'none' }}
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleInsertNewline}
            className="p-1 text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-90 transition-transform shrink-0"
            aria-label="Xuống dòng (Shift+Enter)"
            title="Xuống dòng (Shift+Enter)"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCkEditorOpen(true)}
            className="p-1 text-[var(--mos-text-muted)] hover:text-amber-400 active:scale-90 transition-transform shrink-0 cursor-pointer"
            aria-label="Soạn thảo định dạng (CKEditor)"
            title="Soạn thảo định dạng (CKEditor)"
          >
            <FilePenLine className="w-4 h-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setStickerPickerOpen(true)}
            className="p-1 text-[var(--mos-text-muted)] hover:text-[var(--mos-accent)] active:scale-90 transition-transform shrink-0"
            aria-label="Biểu cảm & Nhãn dán"
            title="Biểu cảm & Nhãn dán"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={
            (!text.trim() && attachedImages.length === 0 && !stagedCustomerCard) || isSending || isUploadingImages
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0 mb-0.5 cursor-pointer ${
            (text.trim() || attachedImages.length > 0 || stagedCustomerCard) && !isSending && !isUploadingImages
              ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)] shadow-md'
              : 'bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] border border-[var(--mos-surface-border)] opacity-40 cursor-not-allowed'
          }`}
          aria-label="Gửi phản hồi luồng"
          title="Gửi phản hồi luồng"
        >
          {isSending || isUploadingImages ? (
            <Loader2 className="w-4 h-4 text-[var(--mos-accent-contrast)] animate-spin" />
          ) : (
            <SendHorizontal
              className={`w-4 h-4 font-bold ${
                text.trim() || attachedImages.length > 0 || stagedCustomerCard
                  ? 'text-[var(--mos-accent-contrast)]'
                  : 'text-[var(--mos-text-muted)]'
              }`}
            />
          )}
        </button>
      </div>
    </div>
  );
};
