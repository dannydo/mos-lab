'use client';

import React from 'react';
import { Space, Tooltip } from 'antd';
import { Maximize2, MessageSquare, Minimize2, MoveHorizontal, type LucideIcon } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { SMS_MODAL_WIDTH_PRESETS, type SmsModalWidthPreset } from './smsModalTypes';

export interface SmsModalHeaderProps {
  customerName?: string | null;
  modalWidth: number;
  isDark: boolean;
  onWidthChange: (width: number) => void;
}

const PRESET_ICON_MAP: Record<SmsModalWidthPreset, LucideIcon> = {
  740: Minimize2,
  880: MoveHorizontal,
  1050: Maximize2,
};

export const SmsModalHeader: React.FC<SmsModalHeaderProps> = ({ customerName, modalWidth, isDark, onWidthChange }) => (
  <div className="flex justify-between items-center pr-6">
    <Space size="middle">
      <AppIcon icon={MessageSquare} size={18} className="text-amber-500" />
      <span className="font-bold">Gửi tin nhắn SMS — {customerName || 'Khách hàng'}</span>
    </Space>

    <Space size={4} className="ml-auto">
      {SMS_MODAL_WIDTH_PRESETS.map((preset) => {
        const isActive = modalWidth === preset.width;
        const PresetIcon = PRESET_ICON_MAP[preset.width];
        return (
          <Tooltip key={preset.width} title={preset.tooltip}>
            <button
              type="button"
              aria-label={preset.ariaLabel}
              aria-pressed={isActive}
              onClick={() => onWidthChange(preset.width)}
              className={`w-6 h-6 p-0 rounded border inline-flex items-center justify-center transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                  : isDark
                    ? 'bg-transparent border-transparent text-slate-300 hover:bg-white/10'
                    : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AppIcon icon={PresetIcon} size={12} />
            </button>
          </Tooltip>
        );
      })}
    </Space>
  </div>
);
