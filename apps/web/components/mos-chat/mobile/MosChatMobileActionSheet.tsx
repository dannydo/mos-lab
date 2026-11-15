'use client';

import React from 'react';
import {
  ImagePlus,
  Film,
  HardDrive,
  CheckSquare,
  Zap,
  Smile,
  Mic,
  Bot,
  X,
  Paperclip,
  UserRoundPlus,
  FilePenLine,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export interface MosChatMobileActionSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSelectVideo?: () => void;
  onSelectFile?: () => void;
  onSelectCustomer?: () => void;
  onSelectDrive: () => void;
  onSelectTask: () => void;
  onSelectWorkflow: () => void;
  onSelectSticker: () => void;
  onSelectVoice: () => void;
  onSelectAiCopilot?: () => void;
  onSelectCKEditor?: () => void;
}

export const MosChatMobileActionSheet: React.FC<MosChatMobileActionSheetProps> = ({
  open,
  onClose,
  onSelectImage,
  onSelectVideo,
  onSelectFile,
  onSelectCustomer,
  onSelectDrive,
  onSelectTask,
  onSelectWorkflow,
  onSelectSticker,
  onSelectVoice,
  onSelectAiCopilot,
  onSelectCKEditor,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setShowAdvanced(false);
    }
  }, [open]);

  if (!open) return null;

  const coreActions = [
    {
      id: 'image',
      label: 'Gửi hình ảnh',
      icon: <ImagePlus className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />,
      bg: isDark ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200',
      onClick: () => {
        onClose();
        onSelectImage();
      },
    },
    {
      id: 'video',
      label: 'Gửi video',
      icon: <Film className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />,
      bg: isDark ? 'bg-purple-500/15 border-purple-500/30' : 'bg-purple-50 border-purple-200',
      onClick: () => {
        onClose();
        if (onSelectVideo) onSelectVideo();
        else onSelectImage();
      },
    },
    {
      id: 'file',
      label: 'Đính kèm tệp / PDF',
      icon: <Paperclip className={`w-5 h-5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />,
      bg: isDark ? 'bg-sky-500/15 border-sky-500/30' : 'bg-sky-50 border-sky-200',
      onClick: () => {
        onClose();
        if (onSelectFile) onSelectFile();
        else onSelectImage();
      },
    },
    {
      id: 'customer',
      label: 'Thẻ khách / Booking',
      icon: <UserRoundPlus className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />,
      bg: isDark ? 'bg-amber-500/15 border-amber-500/30' : 'bg-amber-50 border-amber-200',
      onClick: () => {
        onClose();
        onSelectCustomer?.();
      },
    },
  ];

  const advancedActions = [
    {
      id: 'task',
      label: 'Giao việc & Hạn chót',
      icon: <CheckSquare className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />,
      bg: isDark ? 'bg-amber-500/15 border-amber-500/30' : 'bg-amber-50 border-amber-200',
      onClick: () => {
        onClose();
        onSelectTask();
      },
    },
    {
      id: 'ckeditor',
      label: 'Soạn thảo CKEditor',
      icon: <FilePenLine className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />,
      bg: isDark ? 'bg-amber-500/15 border-amber-500/30' : 'bg-amber-50 border-amber-200',
      onClick: () => {
        onClose();
        onSelectCKEditor?.();
      },
    },
    {
      id: 'sticker',
      label: 'Nhãn dán Wings',
      icon: <Smile className={`w-5 h-5 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />,
      bg: isDark ? 'bg-pink-500/15 border-pink-500/30' : 'bg-pink-50 border-pink-200',
      onClick: () => {
        onClose();
        onSelectSticker();
      },
    },
    {
      id: 'voice',
      label: 'Tin nhắn thoại',
      icon: <Mic className={`w-5 h-5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />,
      bg: isDark ? 'bg-rose-500/15 border-rose-500/30' : 'bg-rose-50 border-rose-200',
      onClick: () => {
        onClose();
        onSelectVoice();
      },
    },
    {
      id: 'ai',
      label: 'Trợ lý Wings AI',
      icon: <Bot className={`w-5 h-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />,
      bg: isDark ? 'bg-violet-500/15 border-violet-500/30' : 'bg-violet-50 border-violet-200',
      onClick: () => {
        onClose();
        onSelectAiCopilot?.();
      },
    },
    {
      id: 'drive',
      label: 'Google Drive',
      icon: <HardDrive className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />,
      bg: isDark ? 'bg-blue-500/15 border-blue-500/30' : 'bg-blue-50 border-blue-200',
      onClick: () => {
        onClose();
        onSelectDrive();
      },
    },
    {
      id: 'workflow',
      label: 'Quy trình công việc',
      icon: <Zap className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />,
      bg: isDark ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200',
      onClick: () => {
        onClose();
        onSelectWorkflow();
      },
    },
  ];

  const renderTile = (act: (typeof coreActions)[number]) => (
    <button
      key={act.id}
      type="button"
      onClick={act.onClick}
      aria-label={act.id === 'customer' ? 'Đính kèm khách hàng' : act.label}
      className="flex flex-col items-center text-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-xs ${act.bg}`}>
        {act.icon}
      </div>
      <span className="text-[11px] font-medium text-[var(--mos-text)] leading-tight">{act.label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 backdrop-blur-sm transition-opacity ${isDark ? 'bg-black/60' : 'bg-slate-900/40'}`}
      />

      {/* Slide-up Sheet */}
      <div className="relative bg-[var(--mos-surface-raised)] text-[var(--mos-text)] border-t border-[var(--mos-surface-border)] rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,16px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mb-2.5" />

        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-[var(--mos-text)] tracking-tight">Tác vụ đính kèm & Tiện ích</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tác vụ đính kèm"
            className="p-1.5 rounded-full bg-[var(--mos-surface-muted)] text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary 4 Core Actions */}
        <div className="grid grid-cols-4 gap-3 py-1">{coreActions.map(renderTile)}</div>

        {/* Expandable Secondary Enterprise Tools */}
        <div className="mt-3 pt-2 border-t border-[var(--mos-surface-border)]">
          <button
            type="button"
            data-testid="mobile-action-sheet-advanced-toggle"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="w-full py-2 px-3 rounded-xl bg-[var(--mos-surface-muted)] hover:opacity-90 border border-[var(--mos-surface-border)] inline-flex items-center justify-center gap-1.5 leading-none text-xs font-semibold text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] transition-all active:scale-[0.99] cursor-pointer"
          >
            <span>{showAdvanced ? 'Thu gọn công cụ nâng cao' : 'Công cụ nâng cao'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Advanced Grid (kept mounted with hidden class when collapsed so Safari hides it cleanly and tests stay responsive) */}
        <div
          data-testid="mobile-action-sheet-advanced-grid"
          className={
            showAdvanced ? 'grid grid-cols-4 gap-3 pt-3 mt-2 border-t border-[var(--mos-surface-border)]' : 'hidden'
          }
        >
          {advancedActions.map(renderTile)}
        </div>
      </div>
    </div>
  );
};
