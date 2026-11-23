'use client';

import React from 'react';

export interface PaystubFooterNoticeProps {
  congratulationMessage?: string;
}

export function PaystubFooterNotice({ congratulationMessage }: PaystubFooterNoticeProps) {
  return (
    <>
      <div className="p-3 bg-gradient-to-r from-purple-500/10 via-amber-500/5 to-transparent border border-purple-300/40 dark:border-purple-800/30 rounded-lg text-center text-xs font-medium text-purple-800 dark:text-purple-300">
        🌟{' '}
        {congratulationMessage ||
          'Chúc mừng bạn đã hoàn thành xuất sắc ca làm việc! Tiếp tục bùng nổ doanh số và chăm sóc khách hàng chu đáo nhé! 🌟'}{' '}
        💼
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 space-y-1">
        <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
          <span>CÔNG TY TNHH WINGS LASHES</span>
          <span>Tax Number: 0313891996 • Hotline: 1800 8154</span>
        </div>
        <div>• Chi nhánh 1: 159 - 159A Đề Thám, P. Cô Giang, Q. 1, TP. Hồ Chí Minh</div>
        <div>• Chi nhánh 2: L5-08, 09 Estella Place, 88 Song Hành, P. An Phú, TP. Thủ Đức, TP. Hồ Chí Minh</div>
      </div>
    </>
  );
}
