'use client';

import React from 'react';

interface IosActionSheetProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  destructiveLabel?: string;
  onConfirmDestructive: () => void;
  onCancel: () => void;
}

export function IosActionSheet({
  isOpen,
  title = 'Bạn có chắc chắn muốn đăng xuất?',
  message = 'Ca làm việc và dữ liệu của bạn sẽ tiếp tục được lưu an toàn trên máy chủ.',
  destructiveLabel = 'Đăng Xuất',
  onConfirmDestructive,
  onCancel,
}: IosActionSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] select-none">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn"
        onClick={onCancel}
      />

      {/* ActionSheet Container */}
      <div className="w-full max-w-[400px] z-10 flex flex-col gap-2 animate-slideUp">
        {/* Main Group */}
        <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {/* Header */}
          {(title || message) && (
            <div className="px-4 py-3 text-center border-b border-white/10">
              {title && <h3 className="text-xs font-semibold text-white/90">{title}</h3>}
              {message && <p className="text-[11px] text-white/50 mt-1 leading-snug">{message}</p>}
            </div>
          )}

          {/* Destructive Action (Đỏ) */}
          <button
            onClick={onConfirmDestructive}
            className="w-full py-3.5 px-4 text-center text-[#FF3B30] text-base font-semibold active:bg-white/10 transition-colors"
          >
            {destructiveLabel}
          </button>
        </div>

        {/* Cancel Button (Rời, bo tròn) */}
        <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <button
            onClick={onCancel}
            className="w-full py-3.5 px-4 text-center text-[#FFB400] text-base font-bold active:bg-white/10 transition-colors"
          >
            Hủy (Cancel)
          </button>
        </div>
      </div>
    </div>
  );
}
