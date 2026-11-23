'use client';

import React from 'react';
import dayjs from 'dayjs';
import type { TouchpointDisplayStatus } from './touchpoint-cell-types';

export interface TouchpointTooltipContentProps {
  displayStatus: TouchpointDisplayStatus;
  labelText: string;
  staffName: string;
  formattedDate: string | null;
  currentNote: string;
  days: number;
  convertedAt?: string | null;
  customerCallbackDate?: string | null;
  callbackDate: dayjs.Dayjs;
}

const TooltipNoteBlock: React.FC<{ note: string; fallbackHint?: string }> = ({ note, fallbackHint }) => {
  if (note) {
    return <div className="mt-1 italic border-t border-dashed border-white/25 pt-1">📝 Note: {note}</div>;
  }
  if (fallbackHint) {
    return <div className="mt-0.5 opacity-75">{fallbackHint}</div>;
  }
  return null;
};

const TooltipConversionTime: React.FC<{ convertedAt?: string | null }> = ({ convertedAt }) => {
  if (!convertedAt) return null;
  return (
    <div className="text-[11px] opacity-80 tabular-nums">Lúc: {dayjs(convertedAt).format('DD/MM/YYYY HH:mm')}</div>
  );
};

export const TouchpointTooltipContent: React.FC<TouchpointTooltipContentProps> = ({
  displayStatus,
  labelText,
  staffName,
  formattedDate,
  currentNote,
  days,
  convertedAt,
  customerCallbackDate,
  callbackDate,
}) => {
  if (displayStatus === 'DONE') {
    return (
      <div className="text-xs">
        <div className="font-bold text-emerald-400">✅ Khách hàng đã hoàn tất dịch vụ</div>
        <div className="opacity-90 mt-0.5">Khách đã đến tiệm làm mi thành công sau {labelText}</div>
        <TooltipConversionTime convertedAt={convertedAt} />
      </div>
    );
  }

  if (displayStatus === 'BOOKED') {
    return (
      <div className="text-xs">
        <div className="font-bold text-indigo-400">📅 Đã chuyển đổi Book (Tự động)</div>
        <div className="opacity-90 mt-0.5">Khách đã đặt lịch thành công sau {labelText}</div>
        <TooltipConversionTime convertedAt={convertedAt} />
      </div>
    );
  }

  if (displayStatus === 'SUCCESS') {
    return (
      <div className="text-xs">
        <div className="font-bold text-emerald-400">📞✓ Cuộc gọi thành công (Bởi {staffName})</div>
        {formattedDate && <div className="opacity-85 tabular-nums">Thực hiện lúc: {formattedDate}</div>}
        <TooltipNoteBlock note={currentNote} fallbackHint="(Bấm để thay đổi trạng thái/ghi chú)" />
      </div>
    );
  }

  if (displayStatus === 'MESSAGED') {
    return (
      <div className="text-xs">
        <div className="font-bold text-cyan-400">💬✓ Nhắn tin thành công (Bởi {staffName})</div>
        {formattedDate && <div className="opacity-85 tabular-nums">Thực hiện lúc: {formattedDate}</div>}
        <TooltipNoteBlock note={currentNote} fallbackHint="(Bấm để thay đổi trạng thái/ghi chú)" />
      </div>
    );
  }

  if (displayStatus === 'CALLBACK') {
    const formattedCbDate = customerCallbackDate
      ? dayjs(customerCallbackDate).format('DD/MM/YYYY')
      : callbackDate.format('DD/MM/YYYY');

    return (
      <div className="text-xs">
        <div className="font-bold text-purple-400 tabular-nums">🕒 Hẹn gọi lại: {formattedCbDate} (Daily Plan)</div>
        {formattedDate && (
          <div className="opacity-85 tabular-nums">
            Bởi {staffName} ({formattedDate})
          </div>
        )}
        <TooltipNoteBlock note={currentNote} fallbackHint="(Bấm để thay đổi trạng thái/ngày hẹn)" />
      </div>
    );
  }

  if (displayStatus === 'FAILED') {
    return (
      <div className="text-xs">
        <div className="font-bold text-red-400">📞❌ Cuộc gọi thất bại / không liên lạc được</div>
        {formattedDate && (
          <div className="opacity-85 tabular-nums">
            Bởi: {staffName} ({formattedDate})
          </div>
        )}
        {currentNote && <div className="mt-1 italic">📝 Note: {currentNote}</div>}
      </div>
    );
  }

  if (displayStatus === 'LOST') {
    return (
      <div className="text-xs">
        <div className="font-bold text-rose-500">💔 Không thuộc về nhau (Khách từ chối/hủy)</div>
        {formattedDate && (
          <div className="opacity-85 tabular-nums">
            Bởi: {staffName} ({formattedDate})
          </div>
        )}
        {currentNote && <div className="mt-1 italic">📝 Note: {currentNote}</div>}
      </div>
    );
  }

  if (displayStatus === 'DUE_TODAY') {
    return <span className="text-amber-400">🔔 Đến hạn Chạm ({days} ngày - Bấm để chọn trạng thái)</span>;
  }

  if (displayStatus === 'PENDING') {
    return <span className="text-slate-400">⏳ Đang chờ (Touchpoint {labelText} chưa tới ngày)</span>;
  }

  if (displayStatus === 'OVERDUE') {
    return <span className="text-red-400">Trễ chạm ({days} ngày chưa tới - Bấm để chọn)</span>;
  }

  return <span>Bấm để cập nhật trạng thái {labelText}</span>;
};
