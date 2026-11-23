'use client';

import type React from 'react';
import { Button, DatePicker, Input } from 'antd';
import { CalendarCheck, Clock, HeartOff, MessageSquare, PhoneCall, PhoneOff, RotateCcw } from 'lucide-react';
import dayjs, { type Dayjs } from 'dayjs';
import type { Customer, TouchpointStatus } from '@mos-lab/shared';

const { TextArea } = Input;

export interface LocaTouchpointPopoverContentProps {
  customer: Customer;
  label: string;
  isDark: boolean;
  selectedStatus: TouchpointStatus | null;
  callbackDate: Dayjs;
  hasReferredDiamond: boolean;
  noteInput: string;
  loading: boolean;
  onSelectStatus: (status: TouchpointStatus | null) => void;
  onChangeCallbackDate: (date: Dayjs) => void;
  onToggleDiamond: () => void;
  onChangeNoteInput: (value: string) => void;
  onSave: (statusToSave?: TouchpointStatus | null, e?: React.MouseEvent) => void;
  onReset: (e: React.MouseEvent) => void;
  onOpenBooking?: (customer: Customer) => void;
}

export function LocaTouchpointPopoverContent({
  customer,
  label,
  isDark,
  selectedStatus,
  callbackDate,
  hasReferredDiamond,
  noteInput,
  loading,
  onSelectStatus,
  onChangeCallbackDate,
  onToggleDiamond,
  onChangeNoteInput,
  onSave,
  onReset,
  onOpenBooking,
}: LocaTouchpointPopoverContentProps) {
  const defaultBtnClass = isDark
    ? 'border border-slate-700 bg-slate-800 text-slate-200'
    : 'border border-slate-200 bg-slate-50 text-slate-800';

  return (
    <div className="w-[260px]" onClick={(e) => e.stopPropagation()}>
      <div className={`font-bold mb-2.5 text-[13px] ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
        ✨ Chọn trạng thái {label} ({customer.name})
      </div>

      <div className="flex flex-col gap-1.5 mb-2.5">
        {/* 1. Gọi thành công */}
        <button
          type="button"
          onClick={() => onSelectStatus('SUCCESS')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedStatus === 'SUCCESS'
              ? isDark
                ? 'border-2 border-emerald-500 bg-emerald-950 text-emerald-400'
                : 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700'
              : defaultBtnClass
          }`}
        >
          <PhoneCall size={14} className="text-emerald-500" />
          <span>Gọi thành công</span>
        </button>

        {/* 2. Gọi thất bại */}
        <button
          type="button"
          onClick={() => onSelectStatus('FAILED')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedStatus === 'FAILED'
              ? isDark
                ? 'border-2 border-red-500 bg-red-950 text-red-300'
                : 'border-2 border-red-500 bg-red-50 text-red-700'
              : defaultBtnClass
          }`}
        >
          <PhoneOff size={14} className="text-rose-500" />
          <span>Gọi thất bại</span>
        </button>

        {/* 3. Nhắn tin thành công */}
        <button
          type="button"
          onClick={() => onSelectStatus('MESSAGED')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedStatus === 'MESSAGED'
              ? isDark
                ? 'border-2 border-cyan-500 bg-cyan-950 text-cyan-300'
                : 'border-2 border-cyan-500 bg-cyan-50 text-cyan-600'
              : defaultBtnClass
          }`}
        >
          <MessageSquare size={14} className="text-cyan-500" />
          <span>Nhắn tin thành công</span>
        </button>

        {/* 4. Hẹn gọi lại */}
        <button
          type="button"
          onClick={() => onSelectStatus('CALLBACK')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedStatus === 'CALLBACK'
              ? isDark
                ? 'border-2 border-purple-500 bg-purple-950 text-purple-400'
                : 'border-2 border-purple-500 bg-purple-50 text-purple-700'
              : defaultBtnClass
          }`}
        >
          <Clock size={14} className="text-purple-500" />
          <span>Hẹn gọi lại (Lên lịch gọi)</span>
        </button>

        {/* 5. Đã đặt lịch */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSave('BOOKED', e);
            onOpenBooking?.(customer);
          }}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedStatus === 'BOOKED'
              ? isDark
                ? 'border-2 border-indigo-500 bg-indigo-950 text-indigo-300'
                : 'border-2 border-indigo-500 bg-indigo-50 text-indigo-700'
              : defaultBtnClass
          }`}
        >
          <CalendarCheck size={14} className="text-indigo-500" />
          <span>Đã đặt lịch</span>
        </button>

        {/* 6. Không thuộc về nhau */}
        <button
          type="button"
          onClick={() => onSelectStatus('LOST')}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
            selectedStatus === 'LOST'
              ? isDark
                ? 'border-2 border-rose-500 bg-rose-950 text-rose-300'
                : 'border-2 border-rose-500 bg-rose-50 text-rose-700'
              : defaultBtnClass
          }`}
        >
          <HeartOff size={14} className="text-pink-500" />
          <span>Không thuộc về nhau</span>
        </button>
      </div>

      {/* DatePicker expandable section for CALLBACK status */}
      {selectedStatus === 'CALLBACK' && (
        <div
          className={`p-2 rounded-md mb-2.5 border ${
            isDark ? 'bg-purple-500/12 border-purple-900' : 'bg-purple-50 border-purple-200'
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
            <Button size="small" className="text-[10px] px-1.5 h-[22px]" onClick={() => onChangeCallbackDate(dayjs())}>
              Hôm nay
            </Button>
            <Button
              size="small"
              className="text-[10px] px-1.5 h-[22px]"
              onClick={() => onChangeCallbackDate(dayjs().add(1, 'day'))}
            >
              Ngày mai
            </Button>
            <Button
              size="small"
              className="text-[10px] px-1.5 h-[22px]"
              onClick={() => onChangeCallbackDate(dayjs().add(3, 'day'))}
            >
              3 ngày
            </Button>
            <Button
              size="small"
              className="text-[10px] px-1.5 h-[22px]"
              onClick={() => onChangeCallbackDate(dayjs().add(7, 'day'))}
            >
              7 ngày
            </Button>
          </div>
        </div>
      )}

      {/* Diamond Referral Toggle Button */}
      <div
        onClick={onToggleDiamond}
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all mb-2 select-none hover:opacity-90 ${
          hasReferredDiamond
            ? isDark
              ? 'border border-cyan-500 bg-cyan-500/15 text-cyan-400'
              : 'border border-cyan-500 bg-cyan-50 text-cyan-600'
            : isDark
              ? 'border border-dashed border-slate-700 bg-slate-900 text-slate-400'
              : 'border border-dashed border-slate-300 bg-slate-50 text-slate-500'
        }`}
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

      <TextArea
        rows={2}
        value={noteInput}
        onChange={(e) => onChangeNoteInput(e.target.value)}
        placeholder="Nhập ghi chú (không bắt buộc)..."
        size="small"
        className="mb-2.5"
      />

      <div className="flex justify-between items-center">
        <Button size="small" type="text" danger loading={loading} onClick={onReset} icon={<RotateCcw size={12} />}>
          Trở về mặc định
        </Button>
        <Button
          size="small"
          type="primary"
          loading={loading}
          onClick={(e) => onSave(selectedStatus, e)}
          className="bg-amber-500 border-amber-500 text-black font-semibold hover:bg-amber-400"
        >
          Lưu
        </Button>
      </div>
    </div>
  );
}
