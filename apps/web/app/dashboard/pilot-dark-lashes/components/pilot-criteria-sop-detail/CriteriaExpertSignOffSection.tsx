'use client';

import React from 'react';
import { Clock, ShieldAlert } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';

const PENDING_APPROVAL_POINTS = [
  {
    title: '1. Chuẩn hóa ngưỡng độ dài mi:',
    detail: 'Xác nhận chính thức ngưỡng tối thiểu 8.0mm hay 7.5mm theo từng dáng mắt mí lót/mí sụp.',
  },
  {
    title: '2. Thời gian an toàn giữa 2 lần uốn:',
    detail: 'Chốt quy định 4 tuần hay 6 tuần để bảo toàn lớp Keratin tự nhiên của khách hàng.',
  },
  {
    title: '3. Ma trận chọn trục silicon:',
    detail: 'Hướng dẫn định lượng chọn form trục S / M / L hoặc trục cá heo R3 theo độ dài mi và dáng mí mắt.',
  },
];

/** Expert technical review status card awaiting sign-off before network rollout. */
export function CriteriaExpertSignOffSection() {
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AppIcon icon={ShieldAlert} size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
              Trạng Thái Thẩm Định Chuyên Môn Trước Khi Ban Hành Toàn Hệ Thống
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Toàn bộ nội dung SOP Hạng mục 1 đang ở trạng thái{' '}
              <strong className="text-amber-600 dark:text-amber-400">CHỜ CÔ GIANG ĐÀM THẨM ĐỊNH</strong>
            </p>
          </div>
        </div>
        <span className="inline-flex items-center justify-center leading-none px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          Chờ Cô Giang Đàm Thẩm Định
        </span>
      </div>

      <div className="pt-2 border-t border-amber-500/20 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
        <div className="font-semibold text-slate-800 dark:text-slate-200">
          3 Điểm kỹ thuật đang chờ Cô Giang Đàm phê duyệt chính thức:
        </div>
        <ul className="m-0 p-0 list-none space-y-1">
          {PENDING_APPROVAL_POINTS.map((item) => (
            <li key={item.title} className="flex items-start gap-1.5">
              <AppIcon icon={Clock} size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <span>
                <strong>{item.title}</strong> {item.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
