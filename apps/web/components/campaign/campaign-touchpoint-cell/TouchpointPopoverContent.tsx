'use client';

import React from 'react';
import { Button, DatePicker, Input } from 'antd';
import dayjs from 'dayjs';
import { CalendarCheck, Clock, HeartOff, MessageSquare, PhoneCall, PhoneOff, RotateCcw } from 'lucide-react';
import type { TouchpointStatus } from '@mos-lab/shared';
import type { TouchpointActionStatus } from './touchpoint-cell-types';
import {
  CALLBACK_QUICK_PRESETS,
  getTouchpointStatusButtonClassName,
  TOUCHPOINT_STATUS_BUTTONS,
} from './touchpoint-cell-utils';

const { TextArea } = Input;

export interface TouchpointPopoverContentProps {
  labelText: string;
  customerName: string;
  isDark: boolean;
  selectedStatus: TouchpointStatus | null;
  callbackDate: dayjs.Dayjs;
  hasReferredDiamond: boolean;
  noteInput: string;
  loading: boolean;
  onSelectStatus: (status: TouchpointStatus | null) => void;
  onBookedAction: (e: React.MouseEvent) => void;
  onChangeCallbackDate: (date: dayjs.Dayjs) => void;
  onToggleDiamondReferral: () => void;
  onChangeNoteInput: (value: string) => void;
  onReset: (e: React.MouseEvent) => Promise<void>;
  onSave: (statusToSave?: TouchpointStatus | null, e?: React.MouseEvent) => Promise<void>;
}

function renderStatusOptionIcon(status: TouchpointActionStatus, colorClass: string) {
  switch (status) {
    case 'SUCCESS':
      return <PhoneCall size={14} className={colorClass} />;
    case 'FAILED':
      return <PhoneOff size={14} className={colorClass} />;
    case 'MESSAGED':
      return <MessageSquare size={14} className={colorClass} />;
    case 'CALLBACK':
      return <Clock size={14} className={colorClass} />;
    case 'BOOKED':
      return <CalendarCheck size={14} className={colorClass} />;
    case 'LOST':
      return <HeartOff size={14} className={colorClass} />;
  }
}

export const TouchpointPopoverContent: React.FC<TouchpointPopoverContentProps> = ({
  labelText,
  customerName,
  isDark,
  selectedStatus,
  callbackDate,
  hasReferredDiamond,
  noteInput,
  loading,
  onSelectStatus,
  onBookedAction,
  onChangeCallbackDate,
  onToggleDiamondReferral,
  onChangeNoteInput,
  onReset,
  onSave,
}) => {
  const diamondContainerClass = hasReferredDiamond
    ? isDark
      ? 'border-[1.5px] border-solid border-cyan-500 bg-[rgba(6,182,212,0.15)] text-cyan-400'
      : 'border-[1.5px] border-solid border-cyan-500 bg-cyan-50 text-cyan-600'
    : isDark
      ? 'border border-dashed border-slate-700 bg-slate-900 text-slate-400'
      : 'border border-dashed border-slate-300 bg-slate-50 text-slate-500';

  return (
    <div className="w-[260px]" onClick={(e) => e.stopPropagation()}>
      <div className={`font-bold mb-2.5 text-[13px] ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
        ✨ Chọn trạng thái {labelText} ({customerName})
      </div>

      <div className="flex flex-col gap-1.5 mb-2.5">
        {TOUCHPOINT_STATUS_BUTTONS.map((option) => (
          <button
            key={option.status}
            type="button"
            onClick={(e) => {
              if (option.triggersBookingModal) {
                onBookedAction(e);
              } else {
                onSelectStatus(option.status);
              }
            }}
            className={getTouchpointStatusButtonClassName(option, selectedStatus === option.status, isDark)}
          >
            {renderStatusOptionIcon(option.status, option.iconColorClass)}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {/* DatePicker expandable section for CALLBACK status */}
      {selectedStatus === 'CALLBACK' && (
        <div
          className={`p-2 rounded-md mb-2.5 border ${
            isDark ? 'bg-[rgba(168,85,247,0.12)] border-purple-900' : 'bg-purple-50 border-purple-200'
          }`}
        >
          <div className={`text-[11px] font-semibold mb-1.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
            📅 Chọn ngày hẹn gọi lại (Tự lên Daily Plan):
          </div>
          <DatePicker
            value={callbackDate}
            onChange={(date) => date && onChangeCallbackDate(date)}
            format="DD/MM/YYYY"
            className="w-full mb-1.5"
            size="small"
            allowClear={false}
          />
          <div className="flex gap-1 flex-wrap">
            {CALLBACK_QUICK_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                size="small"
                className="text-[10px] px-1.5 py-0 h-[22px]"
                onClick={() =>
                  onChangeCallbackDate(preset.addDays === 0 ? dayjs() : dayjs().add(preset.addDays, 'day'))
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Diamond Referral Toggle Button */}
      <div
        onClick={onToggleDiamondReferral}
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-200 mb-2 select-none hover:opacity-90 ${diamondContainerClass}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[13px]">💎</span>
          <span>Đã tư vấn CT Kim Cương</span>
        </div>
        <input
          type="checkbox"
          checked={hasReferredDiamond}
          onChange={() => {}}
          className="accent-cyan-600 cursor-pointer"
        />
      </div>

      <div className="mb-2.5">
        <TextArea
          rows={2}
          value={noteInput}
          onChange={(e) => onChangeNoteInput(e.target.value)}
          placeholder="Nhập ghi chú (không bắt buộc)..."
          size="small"
        />
      </div>

      <div className="flex justify-between items-center">
        <Button size="small" type="text" danger loading={loading} onClick={onReset} icon={<RotateCcw size={12} />}>
          Trở về mặc định
        </Button>
        <Button
          size="small"
          type="primary"
          loading={loading}
          onClick={(e) => onSave(selectedStatus, e)}
          className="bg-[rgb(212,168,75)] border-[rgb(212,168,75)] text-black font-semibold hover:bg-[rgb(224,182,92)] hover:border-[rgb(224,182,92)]"
        >
          Lưu
        </Button>
      </div>
    </div>
  );
};
