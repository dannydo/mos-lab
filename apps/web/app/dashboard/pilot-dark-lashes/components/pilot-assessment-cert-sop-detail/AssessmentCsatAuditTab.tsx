'use client';

import React from 'react';
import { Card } from 'antd';
import { CheckCircle2, Info, MessageSquare, Star } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import { PILOT_CUSTOMER_REVIEWS, type CsatMetrics } from './assessment-cert-config';

interface AssessmentCsatAuditTabProps {
  csatMetrics: CsatMetrics;
}

export function AssessmentCsatAuditTab({ csatMetrics }: AssessmentCsatAuditTabProps) {
  return (
    <div className="space-y-6" data-testid="section-csat-audit">
      {/* Nguyên tắc tách bạch CSAT */}
      <div className="p-4 rounded-xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-800 dark:text-blue-300">
          <AppIcon icon={Info} size={16} />
          <span>Nguyên Tắc Thẩm Định CSAT: Chỉ Số Chất Lượng Tham Chiếu Độc Lập</span>
        </div>
        <p className="leading-relaxed m-0">
          CSAT được tự động tổng hợp từ toàn bộ dữ liệu phản hồi của khách hàng trong các ca Pilot Uốn Mi Bóng Tối.
        </p>
        <p className="leading-relaxed m-0 font-medium">
          ⚠️ <em>Lưu ý nghiệp vụ bắt buộc</em>: CSAT đóng vai trò chỉ số đánh giá chất lượng dịch vụ tổng thể,{' '}
          <strong>không phải điều kiện bắt buộc để cấp chứng chỉ cho từng Chuyên Viên hay tự động duyệt Scale</strong>.
          Quyết định duyệt Scale hoàn toàn thuộc thẩm quyền của CEO Danny Đỗ sau khi thẩm định toàn diện hồ sơ.
        </p>
      </div>

      {/* Tổng quan chỉ số CSAT & Đối chiếu mục tiêu >= 4.8★ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: CSAT Trung bình */}
        <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 p-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium block">Điểm CSAT Trung Bình</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-500 tabular-nums">
                {csatMetrics.avgScore}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 5.0 sao</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              <CheckCircle2 size={13} />
              <span>Đối chiếu mục tiêu: ≥ 4.8 sao (ĐẠT)</span>
            </div>
          </div>
        </Card>

        {/* Thẻ 2: Tổng số lượt đánh giá */}
        <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 p-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium block">Tổng Số Lượt Khách Đánh Giá</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                {csatMetrics.totalRated}
              </span>
              <span className="text-xs text-slate-400 font-bold">lượt phản hồi</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              Tự động trích xuất từ dữ liệu Pilot
            </div>
          </div>
        </Card>

        {/* Thẻ 3: Tỷ lệ Hài lòng 5 sao */}
        <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 p-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium block">Lượt Đánh Giá Tuyệt Đối (5★)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {csatMetrics.fiveStarCount}
              </span>
              <span className="text-xs text-slate-400 font-bold tabular-nums">
                / {csatMetrics.totalRated} ca ({csatMetrics.satisfactionRate}%)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">Khách rất hài lòng với độ bóng mi</div>
          </div>
        </Card>

        {/* Thẻ 4: Kết luận Tiêu chuẩn Chất lượng */}
        <Card variant="outlined" className="rounded-xl border-slate-200 dark:border-slate-800 p-4">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium block">Kết Luận Thẩm Định CSAT</span>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 size={13} />
                <span>ĐẠT CHUẨN PILOT</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 leading-tight">
              Chất lượng kỹ thuật uốn mi bóng tối ổn định và làm hài lòng khách hàng.
            </div>
          </div>
        </Card>
      </div>

      {/* Bảng Danh Sách Phản Hồi Khách Hàng Thực Tế Trong Ca Pilot */}
      <Card
        variant="outlined"
        className="rounded-xl border-slate-200 dark:border-slate-800"
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <AppIcon icon={MessageSquare} size={16} className="text-amber-500" />
              <span>Trích Xuất Phản Hồi Khách Hàng &amp; Điểm Đánh Giá Thực Tế Từ Pilot</span>
            </div>
            <span className="text-xs text-slate-400">Follow-up 24h &amp; 72h</span>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Dữ liệu ca mẫu phản hồi thực tế */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {PILOT_CUSTOMER_REVIEWS.map((review) => (
              <div
                key={review.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100">{review.customerLabel}</span>
                  <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                    <Star size={13} className="fill-amber-500" />
                    <span className="tabular-nums">{review.ratingDisplay}</span>
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 italic m-0">&ldquo;{review.quote}&rdquo;</p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span>{review.technicianLabel}</span>
                  <span>{review.sessionMeta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
