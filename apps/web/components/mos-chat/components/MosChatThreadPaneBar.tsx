'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { Activity, ChevronLeft, Maximize2, MessageSquareReply, Minimize2, Rocket, X } from 'lucide-react';
import type { MosChatMessage, MosChatTaskItem, SafeAny } from '@mos-lab/shared';

export interface MosChatThreadPaneBarProps {
  activeThreadMessage: MosChatMessage;
  isMobile: boolean;
  token: SafeAny;
  borderColor: string;
  threadWidth: number;
  setThreadWidth: (w: number) => void;
  persistPersonalLayout: (layout: SafeAny) => void;
  setThreadOpen: (open: boolean) => void;
  setMobileActiveView: (v: SafeAny) => void;
  isStrictDannySuperAdmin: boolean;
  openMissionModalFromChat: (m: MosChatMessage, linkedTask?: SafeAny) => void;
  uniqueTasks: MosChatTaskItem[];
  setSaveThreadWorkflowModalOpen: (open: boolean) => void;
}

export const MosChatThreadPaneBar: React.FC<MosChatThreadPaneBarProps> = ({
  activeThreadMessage,
  isMobile,
  token,
  borderColor,
  threadWidth,
  setThreadWidth,
  persistPersonalLayout,
  setThreadOpen,
  setMobileActiveView,
  isStrictDannySuperAdmin,
  openMissionModalFromChat,
  uniqueTasks,
  setSaveThreadWorkflowModalOpen,
}) => {
  return (
    <div
      className="h-[52px] px-3 flex items-center justify-between text-[12.5px] font-extrabold"
      style={{ borderBottom: `1px solid ${borderColor}` }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {isMobile && (
          <button
            type="button"
            aria-label="Quay lại hội thoại"
            onClick={() => {
              setThreadOpen(false);
              setMobileActiveView('conversation');
            }}
            className="w-7 h-7 -ml-1 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 shrink-0"
            style={{ color: token.colorText }}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <span className="flex items-center gap-1.5 truncate">
          <MessageSquareReply size={14} className="shrink-0 text-amber-500" />
          <span>Luồng trả lời</span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        {isStrictDannySuperAdmin && !activeThreadMessage.mission && (
          <Tooltip title="Chuyển vào mOS Mission (Đóng gói trọn luồng & hình ảnh)">
            <button
              type="button"
              aria-label="Chuyển vào mOS Mission"
              onClick={() =>
                openMissionModalFromChat(
                  activeThreadMessage,
                  uniqueTasks.find(
                    (t) => t.id === activeThreadMessage.taskId || t.sourceMessageId === activeThreadMessage.id
                  ) || null
                )
              }
              className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.45)',
                color: '#c4b5fd',
              }}
            >
              <Rocket size={14} />
            </button>
          </Tooltip>
        )}
        {isStrictDannySuperAdmin && (
          <Tooltip title="✨ Chuẩn hóa luồng thảo luận này thành Quy trình (Workflow)">
            <button
              type="button"
              aria-label="Lưu thành Workflow"
              onClick={() => setSaveThreadWorkflowModalOpen(true)}
              className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
              style={{
                background: 'rgba(59, 130, 246, 0.18)',
                border: '1px solid rgba(59, 130, 246, 0.45)',
                color: '#93c5fd',
              }}
            >
              <Activity size={14} />
            </button>
          </Tooltip>
        )}
        {!isMobile && (
          <Tooltip title={threadWidth >= 560 ? 'Thu gọn luồng về 440px' : 'Mở rộng luồng sang 620px (FHD)'}>
            <button
              type="button"
              aria-label="Mở rộng hoặc thu gọn luồng"
              onClick={() => {
                const targetWidth = threadWidth >= 560 ? 440 : 620;
                setThreadWidth(targetWidth);
                persistPersonalLayout({ threadWidth: targetWidth });
              }}
              className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
              style={{ color: token.colorTextSecondary }}
            >
              {threadWidth >= 560 ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </Tooltip>
        )}
        <Tooltip title="Đóng luồng">
          <button
            type="button"
            aria-label="Đóng luồng"
            onClick={() => {
              setThreadOpen(false);
              if (isMobile) setMobileActiveView('conversation');
            }}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
            style={{ color: token.colorTextSecondary }}
          >
            <X size={15} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
