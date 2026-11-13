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
        <div
          className="backdrop-blur-xl rounded-2xl overflow-hidden border shadow-2xl"
          style={{
            backgroundColor: 'var(--mos-surface)',
            borderColor: 'var(--mos-surface-border)',
            color: 'var(--mos-text)',
          }}
        >
          {/* Header */}
          {(title || message) && (
            <div className="px-4 py-3 text-center border-b" style={{ borderColor: 'var(--mos-surface-border)' }}>
              {title && (
                <h3 className="text-xs font-semibold" style={{ color: 'var(--mos-text)' }}>
                  {title}
                </h3>
              )}
              {message && (
                <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--mos-text-muted)' }}>
                  {message}
                </p>
              )}
            </div>
          )}

          {/* Destructive Action (Đỏ) */}
          <button
            onClick={onConfirmDestructive}
            className="w-full py-3.5 px-4 text-center text-[#FF3B30] text-base font-semibold active:opacity-75 transition-opacity cursor-pointer"
          >
            {destructiveLabel}
          </button>
        </div>

        {/* Cancel Button (Rời, bo tròn) */}
        <div
          className="backdrop-blur-xl rounded-2xl overflow-hidden border shadow-2xl"
          style={{
            backgroundColor: 'var(--mos-surface)',
            borderColor: 'var(--mos-surface-border)',
          }}
        >
          <button
            onClick={onCancel}
            className="w-full py-3.5 px-4 text-center text-base font-bold active:opacity-75 transition-opacity cursor-pointer"
            style={{ color: 'var(--mos-accent)' }}
          >
            Hủy (Cancel)
          </button>
        </div>
      </div>
    </div>
  );
}
