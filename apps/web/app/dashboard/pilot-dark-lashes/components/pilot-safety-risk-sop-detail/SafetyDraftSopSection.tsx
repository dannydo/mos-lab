'use client';

import React from 'react';
import { Button } from 'antd';
import { AlertTriangle, Printer } from 'lucide-react';
import { AppIcon } from '~/components/ui';

interface SafetyDraftSopSectionProps {
  isExpertApproved: boolean;
  expertNote: string;
  onPrintSop: () => void;
  onConfirmApproval: () => void;
}

export function SafetyDraftSopSection({
  isExpertApproved,
  expertNote,
  onPrintSop,
  onConfirmApproval,
}: SafetyDraftSopSectionProps) {
  return (
    <section className="space-y-4 pt-2" data-testid="safety-draft-sop-section">
      <div className="p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-500/5 to-transparent space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-500/20">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Tài liệu pháp quy nội bộ · Bản dự thảo
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 m-0">
              Dự Thảo SOP Hạng Mục 4 – Quản Trị An Toàn, Rủi Ro &amp; Xử Lý Sự Cố
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold border m-0 ${
                isExpertApproved
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}
            >
              {isExpertApproved ? 'ĐÃ THẨM ĐỊNH CHUYÊN MÔN' : 'CHỜ THẨM ĐỊNH'}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <p className="m-0">
            <strong>1. Căn cứ ban hành:</strong> Căn cứ dữ liệu thực nghiệm 17 ca Pilot Uốn Mi Bóng Tối tại chi nhánh Đề
            Thám (chuyên viên Cô Đẫm thực hiện), không phát sinh bất kỳ ca kích ứng hay rủi ro giác mạc nào.
          </p>
          <p className="m-0">
            <strong>2. Chuyên môn y tế:</strong> Nội dung bảo vệ niêm mạc mắt và hướng dẫn xử lý phản ứng nhạy cảm do{' '}
            <strong>Cô Giang Đàm</strong> trực tiếp biên soạn và xác nhận tính an toàn sinh học.
          </p>
          <p className="m-0">
            <strong>3. Quy chế phê duyệt:</strong> Bản dự thảo này được tổng hợp để Project Owner và Cô Giang Đàm thẩm
            định chuyên môn trước khi trình CEO Wings phê duyệt mở rộng quy mô (Scale-up) toàn chuỗi.
          </p>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold text-xs flex items-center gap-2">
            <AppIcon icon={AlertTriangle} size={15} className="text-amber-600 shrink-0" />
            <span>Tuyệt đối không tự động ban hành SOP ra toàn hệ thống khi chưa có chữ ký phê duyệt của CEO.</span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-500 block">Ý kiến thẩm định của Cô Giang Đàm:</span>
            <p className="text-slate-800 dark:text-slate-200 font-medium m-0 italic">&ldquo;{expertNote}&rdquo;</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="small" onClick={onPrintSop} icon={<AppIcon icon={Printer} size={13} />}>
              In tài liệu
            </Button>
            <Button type="primary" size="small" onClick={onConfirmApproval} disabled={isExpertApproved}>
              {isExpertApproved ? 'Đã hoàn tất thẩm định' : 'Thẩm định & Ký số'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
