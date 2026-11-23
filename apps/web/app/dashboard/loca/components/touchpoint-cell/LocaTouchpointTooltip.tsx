'use client';

import dayjs from 'dayjs';
import type { LocaTouchpointState } from '@mos-lab/shared';
import type { LocaTouchpointDisplayStatus } from './loca-touchpoint-utils';

export interface LocaTouchpointTooltipProps {
  displayStatus: LocaTouchpointDisplayStatus;
  label: string;
  days: number | null | undefined;
  staffName: string;
  formattedDate: string | null;
  currentNote: string;
  callbackDateText: string;
  tpState?: LocaTouchpointState;
}

export function LocaTouchpointTooltip({
  displayStatus,
  label,
  days,
  staffName,
  formattedDate,
  currentNote,
  callbackDateText,
  tpState,
}: LocaTouchpointTooltipProps) {
  if (displayStatus === 'DONE') {
    return (
      <div className="text-xs">
        <div className="font-bold text-emerald-400">✅ Khách hàng đã hoàn tất dịch vụ</div>
        <div className="opacity-90 mt-0.5">Khách đã đến tiệm làm mi thành công sau {label}</div>
        {tpState?.conversionDetails?.convertedAt && (
          <div className="text-[11px] opacity-80">
            Lúc: {dayjs(tpState.conversionDetails.convertedAt).format('DD/MM/YYYY HH:mm')}
          </div>
        )}
      </div>
    );
  }
  if (displayStatus === 'BOOKED') {
    return (
      <div className="text-xs">
        <div className="font-bold text-indigo-400">📅 Đã chuyển đổi Book (Tự động)</div>
        <div className="opacity-90 mt-0.5">Khách đã đặt lịch thành công sau {label}</div>
        {tpState?.conversionDetails?.convertedAt && (
          <div className="text-[11px] opacity-80">
            Lúc: {dayjs(tpState.conversionDetails.convertedAt).format('DD/MM/YYYY HH:mm')}
          </div>
        )}
      </div>
    );
  }
  if (displayStatus === 'SUCCESS') {
    return (
      <div className="text-xs">
        <div className="font-bold text-emerald-400">📞✓ Cuộc gọi thành công (Bởi {staffName})</div>
        {formattedDate && <div className="opacity-85">Thực hiện lúc: {formattedDate}</div>}
        {currentNote ? (
          <div className="mt-1 italic border-t border-dashed border-white/25 pt-1">📝 Note: {currentNote}</div>
        ) : (
          <div className="mt-0.5 opacity-75">(Bấm để thay đổi trạng thái/ghi chú)</div>
        )}
      </div>
    );
  }
  if (displayStatus === 'MESSAGED') {
    return (
      <div className="text-xs">
        <div className="font-bold text-cyan-400">💬✓ Nhắn tin thành công (Bởi {staffName})</div>
        {formattedDate && <div className="opacity-85">Thực hiện lúc: {formattedDate}</div>}
        {currentNote ? (
          <div className="mt-1 italic border-t border-dashed border-white/25 pt-1">📝 Note: {currentNote}</div>
        ) : (
          <div className="mt-0.5 opacity-75">(Bấm để thay đổi trạng thái/ghi chú)</div>
        )}
      </div>
    );
  }
  if (displayStatus === 'FAILED') {
    return (
      <div className="text-xs">
        <div className="font-bold text-red-400">📞❌ Cuộc gọi thất bại / không liên lạc được</div>
        {formattedDate && (
          <div className="opacity-85">
            Bởi: {staffName} ({formattedDate})
          </div>
        )}
        {currentNote && <div className="mt-1 italic">📝 Note: {currentNote}</div>}
      </div>
    );
  }
  if (displayStatus === 'CALLBACK') {
    return (
      <div className="text-xs">
        <div className="font-bold text-purple-400">🕒 Hẹn gọi lại: {callbackDateText} (Daily Plan)</div>
        {formattedDate && (
          <div className="opacity-85">
            Bởi {staffName} ({formattedDate})
          </div>
        )}
        {currentNote ? (
          <div className="mt-1 italic border-t border-dashed border-white/25 pt-1">📝 Note: {currentNote}</div>
        ) : (
          <div className="mt-0.5 opacity-75">(Bấm để thay đổi trạng thái/ngày hẹn)</div>
        )}
      </div>
    );
  }
  if (displayStatus === 'LOST') {
    return (
      <div className="text-xs">
        <div className="font-bold text-rose-500">💔 Không thuộc về nhau (Khách từ chối/hủy)</div>
        {formattedDate && (
          <div className="opacity-85">
            Bởi: {staffName} ({formattedDate})
          </div>
        )}
        {currentNote && <div className="mt-1 italic">📝 Note: {currentNote}</div>}
      </div>
    );
  }
  if (displayStatus === 'DUE_TODAY') {
    return <span className="text-amber-400">🔔 Đến hạn Chạm hôm nay ({days} ngày - Bấm để chọn trạng thái)</span>;
  }
  if (displayStatus === 'PENDING') {
    return <span className="text-slate-400">⏳ Đang chờ (Touchpoint {label} chưa tới ngày)</span>;
  }
  if (displayStatus === 'OVERDUE') {
    return <span className="text-red-400">Trễ chạm ({days} ngày chưa tới - Bấm để chọn)</span>;
  }
  return <span>Bấm để cập nhật trạng thái {label}</span>;
}
