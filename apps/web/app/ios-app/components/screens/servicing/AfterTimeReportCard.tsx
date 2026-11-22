'use client';

import React, { useMemo } from 'react';
import { Check, Clock } from 'lucide-react';

interface AfterTimeReportCardProps {
  isDark: boolean;
  targetMinutes: number;
  actualMinutes: number;
}

export function AfterTimeReportCard({ isDark, targetMinutes, actualMinutes }: AfterTimeReportCardProps) {
  const diffMinutes = actualMinutes - targetMinutes;

  // Báo cáo thời gian ca làm & Khích lệ tinh thần (không thưởng thêm điểm)
  const performanceMeta = useMemo(() => {
    if (diffMinutes <= -5) {
      return {
        statusLabel: 'XUẤT SẮC',
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        diffText: `⚡ Nhanh hơn ${Math.abs(diffMinutes)} phút`,
        boxBg: 'bg-emerald-50/70 border-emerald-200',
        diffTextColor: 'text-emerald-700',
        praiseIcon: '🌟',
        praiseTitle: 'Biểu dương tốc độ & tay nghề tinh hoa!',
        praiseMessage: 'Chuyên Viên hoàn thành rất nhanh nhưng vẫn đảm bảo trọn vẹn độ tơi mướt và chuẩn mực mi Wings!',
        praiseBg: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200',
        praiseTitleColor: 'text-emerald-950',
        praiseDescColor: 'text-emerald-800',
      };
    }
    if (diffMinutes <= 5) {
      return {
        statusLabel: 'CHUẨN TIẾN ĐỘ',
        badgeStyle: 'bg-blue-50 text-blue-700 border-blue-300',
        diffText: '✓ Đúng khung giờ chuẩn',
        boxBg: 'bg-blue-50/70 border-blue-200',
        diffTextColor: 'text-blue-700',
        praiseIcon: '👏',
        praiseTitle: 'Kiểm soát thời gian ca làm rất tốt!',
        praiseMessage:
          'Tuyệt vời! Ca làm diễn ra đúng nhịp độ, đem lại trải nghiệm êm ái và thư giãn tối đa cho khách hàng.',
        praiseBg: 'bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200',
        praiseTitleColor: 'text-blue-950',
        praiseDescColor: 'text-blue-800',
      };
    }
    return {
      statusLabel: 'CHẬM TIẾN ĐỘ',
      badgeStyle: 'bg-amber-50 text-amber-700 border-amber-300',
      diffText: `⏱ Trễ hơn +${diffMinutes} phút`,
      boxBg: 'bg-amber-50/70 border-amber-200',
      diffTextColor: 'text-amber-700',
      praiseIcon: '💪',
      praiseTitle: 'Khích lệ tinh thần tỉ mỉ chăm sóc!',
      praiseMessage:
        'Cảm ơn bạn đã dồn hết sự cẩn trọng cho bộ mi của khách. Ca sau hãy tiếp tục phát huy tay nghề và tối ưu nhịp độ hơn nhé!',
      praiseBg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200',
      praiseTitleColor: 'text-amber-950',
      praiseDescColor: 'text-amber-800',
    };
  }, [diffMinutes]);

  return (
    <div
      className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3.5 shadow-sm border space-y-2.5`}
    >
      {/* Header Báo Cáo Thời Gian */}
      <div className={`flex items-center justify-between pb-1 border-b border-[var(--mos-surface-border)]`}>
        <div className="flex items-center gap-1.5">
          <Clock className={`w-4 h-4 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`} />
          <span
            className={`text-[11px] font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-700'} uppercase tracking-wider`}
          >
            BÁO CÁO THỜI GIAN CA LÀM
          </span>
        </div>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${performanceMeta.badgeStyle}`}>
          {performanceMeta.statusLabel}
        </span>
      </div>

      {/* 2 Cột: Cam Kết Định Mức vs Hoàn Tất Thực Tế */}
      <div className="grid grid-cols-2 gap-2">
        {/* Cột 1: Thời gian cam kết */}
        <div
          className={`${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-50 border-neutral-200/70'} rounded-xl p-2.5 border`}
        >
          <div className={`text-[10px] font-semibold text-[var(--mos-text-muted)] uppercase tracking-tight`}>
            Cam kết định mức
          </div>
          <div className={`text-[17px] font-black ${isDark ? 'text-white' : 'text-neutral-800'} tabular-nums mt-0.5`}>
            {targetMinutes} <span className={`text-[11px] font-bold text-[var(--mos-text-muted)]`}>phút</span>
          </div>
          <div className={`text-[10px] ${isDark ? 'text-neutral-400' : 'text-neutral-400'} mt-0.5`}>
            Tiêu chuẩn dịch vụ
          </div>
        </div>

        {/* Cột 2: Hoàn tất thực tế */}
        <div
          className={`rounded-xl p-2.5 border ${isDark ? 'bg-neutral-900 border-neutral-800' : performanceMeta.boxBg}`}
        >
          <div
            className={`text-[10px] font-semibold ${isDark ? 'text-neutral-300' : 'text-neutral-600'} uppercase tracking-tight`}
          >
            Hoàn tất thực tế
          </div>
          <div className={`text-[17px] font-black text-[var(--mos-text)] tabular-nums mt-0.5`}>
            {actualMinutes} <span className={`text-[11px] font-bold text-[var(--mos-text-muted)]`}>phút</span>
          </div>
          <div className={`text-[10.5px] font-extrabold mt-0.5 tabular-nums ${performanceMeta.diffTextColor}`}>
            {performanceMeta.diffText}
          </div>
        </div>
      </div>

      {/* Banner Khen Ngợi & Khích Lệ Tinh Thần */}
      <div
        className={`rounded-xl p-2.5 border ${isDark ? 'bg-neutral-900 border-neutral-800' : performanceMeta.praiseBg}`}
      >
        <div className="flex items-start gap-2">
          <span className="text-base select-none leading-none pt-0.5">{performanceMeta.praiseIcon}</span>
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className={`text-[12px] font-black ${isDark ? 'text-white' : performanceMeta.praiseTitleColor}`}>
              {performanceMeta.praiseTitle}
            </div>
            <div
              className={`text-[11px] leading-relaxed font-medium ${isDark ? 'text-neutral-300' : performanceMeta.praiseDescColor}`}
            >
              {performanceMeta.praiseMessage}
            </div>
          </div>
        </div>
      </div>

      {/* Dòng nghiệm thu kỹ thuật rút gọn tinh tế */}
      <div
        className={`pt-0.5 flex items-center justify-center gap-1.5 text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold`}
      >
        <Check className="w-3.5 h-3.5 shrink-0" />
        <span>Chuẩn kỹ thuật Wings · Mi tơi mướt · Không dính chân · Không cay mắt</span>
      </div>
    </div>
  );
}
