'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Modal, Popconfirm, type GlobalToken } from 'antd';
import { History, RotateCcw } from 'lucide-react';
import type { MosChatMessage, SafeAny } from '@mos-lab/shared';

export interface MosChatMessageAuditModalProps {
  isMobile: boolean;
  token: GlobalToken;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  isDannyAccount: boolean;
  historyModalOpen: boolean;
  setHistoryModalOpen: (open: boolean) => void;
  historyModalMessage: SafeAny;
  setHistoryModalMessage: (msg: SafeAny) => void;
  isMessageFromCurrentUser: (msg: MosChatMessage) => boolean;
  handleRestoreVersion: (msgId: string, versionText: string, replyId?: string) => Promise<void> | void;
  handleRestoreMessage: (msgId: string, replyId?: string) => Promise<void> | void;
}

export const MosChatMessageAuditModal: React.FC<MosChatMessageAuditModalProps> = ({
  isMobile,
  token,
  surfaceBg,
  surfaceRaised,
  borderColor,
  renderUserAvatarNode,
  isDannyAccount,
  historyModalOpen,
  setHistoryModalOpen,
  historyModalMessage,
  setHistoryModalMessage,
  isMessageFromCurrentUser,
  handleRestoreVersion,
  handleRestoreMessage,
}) => {
  return (
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
                            <span className="font-bold text-slate-300">Sửa bởi {ver.editedByName || 'Thành viên'}</span>
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

                {historyModalMessage.originalText && historyModalMessage.originalText !== historyModalMessage.text && (
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
  );
};
