'use client';

import React from 'react';
import { ImagePlus, HardDrive, CheckSquare, Zap, Smile, Mic, Bot, X, Paperclip } from 'lucide-react';

export interface MosChatMobileActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSelectFile?: () => void;
  onSelectDrive: () => void;
  onSelectTask: () => void;
  onSelectWorkflow: () => void;
  onSelectSticker: () => void;
  onSelectVoice: () => void;
  onSelectAiCopilot?: () => void;
}

export const MosChatMobileActionSheet: React.FC<MosChatMobileActionSheetProps> = ({
  open,
  onClose,
  onSelectImage,
  onSelectFile,
  onSelectDrive,
  onSelectTask,
  onSelectWorkflow,
  onSelectSticker,
  onSelectVoice,
  onSelectAiCopilot,
}) => {
  if (!open) return null;

  const actions = [
    {
      id: 'file',
      label: 'Đính kèm tệp / PDF',
      icon: <Paperclip className="w-6 h-6 text-sky-400" />,
      bg: 'bg-sky-500/15 border-sky-500/30',
      onClick: () => {
        onClose();
        if (onSelectFile) onSelectFile();
        else onSelectImage();
      },
    },
    {
      id: 'image',
      label: 'Gửi hình ảnh',
      icon: <ImagePlus className="w-6 h-6 text-emerald-400" />,
      bg: 'bg-emerald-500/15 border-emerald-500/30',
      onClick: () => {
        onClose();
        onSelectImage();
      },
    },
    {
      id: 'task',
      label: 'Giao việc & Hạn chót',
      icon: <CheckSquare className="w-6 h-6 text-amber-400" />,
      bg: 'bg-amber-500/15 border-amber-500/30',
      onClick: () => {
        onClose();
        onSelectTask();
      },
    },
    {
      id: 'workflow',
      label: 'Quy trình công việc',
      icon: <Zap className="w-6 h-6 text-indigo-400" />,
      bg: 'bg-indigo-500/15 border-indigo-500/30',
      onClick: () => {
        onClose();
        onSelectWorkflow();
      },
    },
    {
      id: 'sticker',
      label: 'Nhãn dán Wings',
      icon: <Smile className="w-6 h-6 text-pink-400" />,
      bg: 'bg-pink-500/15 border-pink-500/30',
      onClick: () => {
        onClose();
        onSelectSticker();
      },
    },
    {
      id: 'drive',
      label: 'Google Drive',
      icon: <HardDrive className="w-6 h-6 text-blue-400" />,
      bg: 'bg-blue-500/15 border-blue-500/30',
      onClick: () => {
        onClose();
        onSelectDrive();
      },
    },
    {
      id: 'voice',
      label: 'Tin nhắn thoại',
      icon: <Mic className="w-6 h-6 text-rose-400" />,
      bg: 'bg-rose-500/15 border-rose-500/30',
      onClick: () => {
        onClose();
        onSelectVoice();
      },
    },
    {
      id: 'ai',
      label: 'Trợ lý Wings AI',
      icon: <Bot className="w-6 h-6 text-violet-400" />,
      bg: 'bg-violet-500/15 border-violet-500/30',
      onClick: () => {
        onClose();
        onSelectAiCopilot?.();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Slide-up Sheet */}
      <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-bold text-white tracking-tight">Tác vụ đính kèm & Tiện ích</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-3 py-1">
          {actions.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              className="flex flex-col items-center text-center gap-1.5 active:scale-95 transition-transform"
            >
              <div className={`w-13 h-13 rounded-2xl border flex items-center justify-center shadow-sm ${act.bg}`}>
                {act.icon}
              </div>
              <span className="text-[11px] font-medium text-slate-300 leading-tight">{act.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
