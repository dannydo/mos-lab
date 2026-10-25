import React from 'react';
import { BellRing, X, Check, Clock, ExternalLink } from 'lucide-react';
import { Tooltip } from 'antd';
import type { MosChatTaskItem } from '@mos-lab/shared';

export interface MosChatReminderAlertProps {
  activeAlertTask: MosChatTaskItem | null;
  setActiveAlertTask: (task: MosChatTaskItem | null) => void;
  handleToggleTaskDone: (taskId: string) => void;
  handleSnoozeTask: (taskId: string, seconds: number) => void;
  selectConversation: (convId: string) => void;
  surfaceRaised: string;
  accentColor: string;
  borderColor: string;
  token: any;
}

export const MosChatReminderAlert: React.FC<MosChatReminderAlertProps> = ({
  activeAlertTask,
  setActiveAlertTask,
  handleToggleTaskDone,
  handleSnoozeTask,
  selectConversation,
  surfaceRaised,
  accentColor,
  borderColor,
  token,
}) => {
  if (!activeAlertTask) return null;

  return (
    <div
      role="alert"
      className="mos-chat-theme-scope fixed top-16 right-5 w-[356px] rounded-xl p-3.5 shadow-2xl z-[1100]"
      style={{
        background: surfaceRaised,
        border: `1.5px solid ${accentColor}`,
        color: token.colorText,
        boxShadow: 'var(--mos-shadow)',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1.5 text-[12px] font-extrabold" style={{ color: accentColor }}>
          <BellRing size={14} />
          <span>NHẮC HẸN CÔNG VIỆC</span>
        </span>
        <Tooltip title="Đóng">
          <button
            type="button"
            onClick={() => setActiveAlertTask(null)}
            className="w-6 h-6 rounded inline-flex items-center justify-center cursor-pointer"
            style={{ color: token.colorTextSecondary }}
          >
            <X size={14} />
          </button>
        </Tooltip>
      </div>
      <div className="text-[13px] font-bold mb-1">{activeAlertTask.title}</div>
      <div className="text-[11px] text-slate-400 mb-2.5">
        {activeAlertTask.assigneeName} · #{activeAlertTask.conversationName}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleToggleTaskDone(activeAlertTask.id)}
          className="flex-1 h-8 rounded-lg bg-emerald-500 text-black font-extrabold text-[12px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Check size={14} />
          <span>Hoàn thành</span>
        </button>
        <Tooltip title="Nhắc lại sau 10 phút (Snooze)">
          <button
            type="button"
            onClick={() => handleSnoozeTask(activeAlertTask.id, 600)}
            className="w-8 h-8 rounded-lg inline-flex items-center justify-center cursor-pointer"
            style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
          >
            <Clock size={14} />
          </button>
        </Tooltip>
        <Tooltip title="Mở cuộc trò chuyện">
          <button
            type="button"
            onClick={() => {
              selectConversation(activeAlertTask.conversationId);
              setActiveAlertTask(null);
            }}
            className="w-8 h-8 rounded-lg inline-flex items-center justify-center cursor-pointer"
            style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
          >
            <ExternalLink size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
