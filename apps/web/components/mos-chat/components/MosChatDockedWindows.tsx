import React from 'react';
import {
  Hash,
  Pin,
  Mail,
  MailOpen,
  Maximize2,
  Minus,
  X,
  AlarmClockPlus,
  SmilePlus,
  ImagePlus,
  SendHorizontal,
} from 'lucide-react';
import { Tooltip, Popover } from 'antd';
import type { MosChatConversation, MosChatMessage } from '@mos-lab/shared';

export interface MosChatDockedWindowsProps {
  isMobile: boolean;
  dockedConvIds: string[];
  conversations: MosChatConversation[];
  collapsedDockIds: Record<string, boolean>;
  setCollapsedDockIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  userPrefs: any;
  getEffectiveUnreadCount: (conv: MosChatConversation) => number;
  dockAttachments: Record<string, any[]>;
  setDockAttachments: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  dockInputs: Record<string, string>;
  setDockInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  surfaceBg: string;
  surfaceRaised: string;
  canvasBg: string;
  borderColor: string;
  borderStrong: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  accentContrast: string;
  token: any;
  renderUserAvatarNode: (opts: any) => React.ReactNode;
  isConversationParticipantOnline: (conv: MosChatConversation) => boolean;
  togglePinConversation: (cid: string) => void;
  toggleManualUnreadConversation: (conv: MosChatConversation) => void;
  selectConversation: (cid: string) => void;
  onToggle: () => void;
  setDockedConvIds: React.Dispatch<React.SetStateAction<string[]>>;
  dockMessagesContainerRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  isMessageFromCurrentUser: (m: MosChatMessage) => boolean;
  getMessageReadBreakdown: (conv: MosChatConversation, m: MosChatMessage) => { seenBy: any[]; unseenBy: any[] };
  renderReadStatusCheckmark: (seenBy: any[], unseenBy: any[], opts?: any) => React.ReactNode;
  openTaskModalFromMessage: (m: MosChatMessage | null) => void;
  renderRichTextMessage: (text: string, isMine?: boolean) => React.ReactNode;
  renderMessageAttachments: (atts?: any[], compact?: boolean) => React.ReactNode;
  renderStagedAttachmentsStrip: (attachments: any[], scope: any, convId?: string) => React.ReactNode;
  dockInputRefs: React.MutableRefObject<Record<string, HTMLTextAreaElement | null>>;
  handleClipboardPaste: (e: React.ClipboardEvent<any>, scope?: any, convId?: string) => void;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  handleSendMessage: (convId: string, text: string, quote?: any, atts?: any[]) => void;
  openStickerPopoverKey: string | null;
  setOpenStickerPopoverKey: (key: string | null) => void;
  renderComposerEmojiPickerContent: (opts?: any) => React.ReactNode;
  triggerFilePicker: (scope: 'main' | 'thread' | 'dock', convId?: string) => void;
}

export const MosChatDockedWindows: React.FC<MosChatDockedWindowsProps> = ({
  isMobile,
  dockedConvIds,
  conversations,
  collapsedDockIds,
  setCollapsedDockIds,
  userPrefs,
  getEffectiveUnreadCount,
  dockAttachments,
  setDockAttachments,
  dockInputs,
  setDockInputs,
  surfaceBg,
  surfaceRaised,
  canvasBg,
  borderColor,
  borderStrong,
  accentColor,
  accentSoftBg,
  accentBorder,
  accentContrast,
  token,
  renderUserAvatarNode,
  isConversationParticipantOnline,
  togglePinConversation,
  toggleManualUnreadConversation,
  selectConversation,
  onToggle,
  setDockedConvIds,
  dockMessagesContainerRefs,
  isMessageFromCurrentUser,
  getMessageReadBreakdown,
  renderReadStatusCheckmark,
  openTaskModalFromMessage,
  renderRichTextMessage,
  renderMessageAttachments,
  renderStagedAttachmentsStrip,
  dockInputRefs,
  handleClipboardPaste,
  isComposingRef,
  lastCompositionEndMsRef,
  handleSendMessage,
  openStickerPopoverKey,
  setOpenStickerPopoverKey,
  renderComposerEmojiPickerContent,
  triggerFilePicker,
}) => {
  if (isMobile || dockedConvIds.length === 0) return null;

  return (
    <div
      className="mos-chat-theme-scope fixed bottom-0 right-5 flex items-end gap-2.5 z-[990]"
      style={{ pointerEvents: 'none', color: token.colorText }}
    >
      {dockedConvIds.map((cid) => {
        const conv = conversations.find((c) => c.id === cid);
        if (!conv) return null;
        const isCollapsed = Boolean(collapsedDockIds[cid]);
        const isDockPinned = (userPrefs.pinnedIds || []).includes(cid);
        const isDockManualUnread = (userPrefs.manualUnreadIds || []).includes(cid);
        const dockUnread = getEffectiveUnreadCount(conv);
        const recentMsgs = conv.messages.slice(-4);
        const dockStaged = dockAttachments[cid] || [];
        return (
          <div
            key={cid}
            data-dock-conv-id={cid}
            className="w-[312px] rounded-t-xl overflow-hidden flex flex-col shadow-2xl"
            style={{
              background: surfaceBg,
              border: `1px solid ${borderStrong}`,
              borderBottom: 'none',
              pointerEvents: 'auto',
            }}
          >
            <div
              data-no-chat-autofocus="true"
              onClick={() => setCollapsedDockIds((p) => ({ ...p, [cid]: !p[cid] }))}
              className="h-9 px-2.5 flex items-center justify-between cursor-pointer"
              style={{ background: surfaceRaised, borderBottom: `1px solid ${borderColor}` }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {conv.type === 'dm' ? (
                  renderUserAvatarNode({
                    staffId: conv.participantStaffId,
                    name: conv.name,
                    avatarUrl: conv.avatar,
                    sizeClass: 'w-5 h-5',
                    textClass: 'text-[9px]',
                    isOnline: isConversationParticipantOnline(conv),
                  })
                ) : (
                  <Hash size={13} className="shrink-0" style={{ color: conv.color || '#10b981' }} />
                )}
                <span className="text-[12px] font-extrabold truncate">{conv.name}</span>
                {isDockPinned && (
                  <Tooltip title="Đã ghim (Pinned)">
                    <Pin size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                  </Tooltip>
                )}
                {(dockUnread > 0 || isDockManualUnread) && (
                  <span className="inline-flex items-center justify-center px-1.5 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold tabular-nums shrink-0">
                    {dockUnread > 0 ? dockUnread : 1}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <Tooltip title={isDockPinned ? 'Bỏ ghim box chat' : 'Ghim box chat lên đầu mục (Pin)'}>
                  <button
                    type="button"
                    aria-label={isDockPinned ? 'Bỏ ghim box chat' : 'Ghim box chat'}
                    onClick={() => togglePinConversation(cid)}
                    className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                    style={{ color: isDockPinned ? '#d4a84b' : token.colorTextSecondary }}
                  >
                    <Pin size={12} className={isDockPinned ? 'fill-amber-400' : ''} />
                  </button>
                </Tooltip>
                <Tooltip
                  title={
                    dockUnread > 0 || isDockManualUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc (Mark as unread)'
                  }
                >
                  <button
                    type="button"
                    aria-label={dockUnread > 0 || isDockManualUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                    onClick={() => toggleManualUnreadConversation(conv)}
                    className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                    style={{
                      color: dockUnread > 0 || isDockManualUnread ? '#f43f5e' : token.colorTextSecondary,
                    }}
                  >
                    {dockUnread > 0 || isDockManualUnread ? <MailOpen size={12} /> : <Mail size={12} />}
                  </button>
                </Tooltip>
                <Tooltip title="Mở rộng vào Bảng Chat">
                  <button
                    type="button"
                    onClick={() => {
                      selectConversation(cid);
                      onToggle();
                    }}
                    className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <Maximize2 size={12} />
                  </button>
                </Tooltip>
                <Tooltip title={isCollapsed ? 'Mở rộng box chat' : 'Thu gọn box chat'}>
                  <button
                    type="button"
                    onClick={() => setCollapsedDockIds((p) => ({ ...p, [cid]: !p[cid] }))}
                    className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <Minus size={12} />
                  </button>
                </Tooltip>
                <Tooltip title="Đóng box chat">
                  <button
                    type="button"
                    onClick={() => setDockedConvIds((prev) => prev.filter((id) => id !== cid))}
                    className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 hover:text-rose-400"
                    style={{ color: token.colorTextSecondary }}
                  >
                    <X size={12} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {!isCollapsed && (
              <div className="h-[280px] flex flex-col" style={{ background: canvasBg }}>
                <div
                  ref={(el) => {
                    dockMessagesContainerRefs.current[cid] = el;
                  }}
                  className="flex-1 overflow-y-auto p-2.5 space-y-2"
                >
                  {recentMsgs.map((m) => {
                    const isDockMine = isMessageFromCurrentUser(m);
                    const dockBreakdown = isDockMine ? getMessageReadBreakdown(conv, m) : { seenBy: [], unseenBy: [] };
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-1.5 items-start ${isDockMine ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {renderUserAvatarNode({
                          name: m.senderName,
                          avatarUrl: m.senderAvatar,
                          sizeClass: 'w-6 h-6 mt-0.5',
                          textClass: 'text-[9.5px]',
                          bgStyle: isDockMine ? 'linear-gradient(135deg, #d4a84b 0%, #b45309 100%)' : '#2563eb',
                          textColor: isDockMine ? '#000' : '#fff',
                        })}
                        <div
                          className={`max-w-[82%] p-2 rounded-xl text-[12px] ${
                            isDockMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                          }`}
                          style={{
                            background: isDockMine ? accentSoftBg : surfaceBg,
                            border: `1px solid ${isDockMine ? accentBorder : borderColor}`,
                          }}
                        >
                          <div
                            className={`flex items-center justify-between gap-2 mb-0.5 ${
                              isDockMine ? 'flex-row-reverse' : 'flex-row'
                            }`}
                          >
                            <span
                              className="text-[10.5px] font-bold inline-flex items-center gap-1"
                              style={{ color: accentColor }}
                            >
                              <span>{m.senderName}</span>
                              <span>·</span>
                              <span className="tabular-nums">{m.timeLabel}</span>
                              {isDockMine &&
                                !m.isDeleted &&
                                renderReadStatusCheckmark(dockBreakdown.seenBy, dockBreakdown.unseenBy, {
                                  compact: true,
                                  scopeLabel: 'Trạng thái đọc tin nhắn',
                                })}
                            </span>
                            <Tooltip title="Tạo Task & Nhắc hẹn">
                              <button
                                type="button"
                                onClick={() => openTaskModalFromMessage(m)}
                                className="w-5 h-5 rounded inline-flex items-center justify-center cursor-pointer"
                                style={{ color: accentColor }}
                              >
                                <AlarmClockPlus size={12} />
                              </button>
                            </Tooltip>
                          </div>
                          {m.text && (
                            <div className="break-words leading-relaxed text-[12px]">
                              {renderRichTextMessage(m.text, isDockMine)}
                            </div>
                          )}
                          {renderMessageAttachments(m.attachments, true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-2" style={{ background: surfaceBg, borderTop: `1px solid ${borderColor}` }}>
                  {renderStagedAttachmentsStrip(dockStaged, 'dock', cid)}
                  <div className="flex items-center gap-1">
                    <textarea
                      ref={(el) => {
                        dockInputRefs.current[cid] = el;
                      }}
                      rows={1}
                      value={dockInputs[cid] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDockInputs((p) => ({ ...p, [cid]: val }));
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 80)}px`;
                      }}
                      onPaste={(e) => handleClipboardPaste(e, 'dock', cid)}
                      onCompositionStart={() => {
                        isComposingRef.current = true;
                      }}
                      onCompositionEnd={() => {
                        lastCompositionEndMsRef.current = Date.now();
                        setTimeout(() => {
                          isComposingRef.current = false;
                        }, 50);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          if (
                            e.nativeEvent.isComposing ||
                            isComposingRef.current ||
                            e.keyCode === 229 ||
                            Date.now() - lastCompositionEndMsRef.current < 60
                          ) {
                            return;
                          }
                          e.preventDefault();
                          const val = dockInputs[cid] || '';
                          const atts = dockAttachments[cid] || [];
                          setDockInputs((p) => ({ ...p, [cid]: '' }));
                          setDockAttachments((p) => ({ ...p, [cid]: [] }));
                          if (dockInputRefs.current[cid]) {
                            dockInputRefs.current[cid]!.style.height = 'auto';
                          }
                          handleSendMessage(cid, val, null, atts);
                        }
                      }}
                      placeholder="Nhắn nhanh... (Shift+Enter xuống dòng)"
                      className="flex-1 min-h-[28px] max-h-[80px] rounded-xl px-2.5 py-1 text-[12px] outline-none resize-none leading-relaxed"
                      style={{
                        background: surfaceRaised,
                        border: `1px solid ${borderColor}`,
                        color: token.colorText,
                      }}
                    />
                    <Popover
                      trigger="click"
                      placement="topRight"
                      open={openStickerPopoverKey === `composer:dock:${cid}`}
                      onOpenChange={(vis) => setOpenStickerPopoverKey(vis ? `composer:dock:${cid}` : null)}
                      content={renderComposerEmojiPickerContent({ dockConvId: cid })}
                    >
                      <Tooltip title="Gửi Sticker động / Emoji">
                        <button
                          type="button"
                          aria-label="Gửi Sticker động hoặc Emoji"
                          className="w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                          style={{ color: token.colorTextSecondary }}
                        >
                          <SmilePlus size={13} />
                        </button>
                      </Tooltip>
                    </Popover>
                    <Tooltip title="Tải hình lên">
                      <button
                        type="button"
                        onClick={() => triggerFilePicker('dock', cid)}
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
                        style={{ color: token.colorTextSecondary }}
                      >
                        <ImagePlus size={13} />
                      </button>
                    </Tooltip>
                    <button
                      type="button"
                      onClick={() => {
                        const val = dockInputs[cid] || '';
                        const atts = dockAttachments[cid] || [];
                        setDockInputs((p) => ({ ...p, [cid]: '' }));
                        setDockAttachments((p) => ({ ...p, [cid]: [] }));
                        handleSendMessage(cid, val, null, atts);
                      }}
                      className="w-7 h-7 rounded-full inline-flex items-center justify-center cursor-pointer"
                      style={{ background: accentColor, color: accentContrast }}
                    >
                      <SendHorizontal size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
