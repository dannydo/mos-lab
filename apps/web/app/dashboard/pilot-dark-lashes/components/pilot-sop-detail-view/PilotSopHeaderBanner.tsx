'use client';

import React from 'react';
import { Button } from 'antd';
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Info, Layers, RefreshCw } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';

interface PilotSopHeaderBannerProps {
  showGlossary: boolean;
  loading: boolean;
  onBack?: () => void;
  onToggleGlossary: () => void;
  onOpenSopModal?: () => void;
  onRefresh: () => void;
}

export function PilotSopHeaderBanner({
  showGlossary,
  loading,
  onBack,
  onToggleGlossary,
  onOpenSopModal,
  onRefresh,
}: PilotSopHeaderBannerProps) {
  return (
    <div className="rounded-2xl p-4 sm:p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-900/5 dark:to-slate-900/40 relative overflow-hidden transition-all duration-300 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs cursor-pointer"
              >
                <AppIcon icon={ArrowLeft} size={13} />
                <span>Quay lại Khung Đào Tạo</span>
              </button>
            )}
            <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              <AppIcon icon={Clock} size={12} className="mr-1 text-amber-600 dark:text-amber-400" />
              Bản dự thảo chuyên môn · Chờ Cô Giang Đàm thẩm định
            </span>
            <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <AppIcon icon={CheckCircle2} size={12} className="mr-1 text-emerald-600 dark:text-emerald-400" />
              Đối chiếu 18 ca Pilot thực tế
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight m-0">
            Hạng mục 2: Quy trình Kỹ thuật 7 Bước Uốn Mi Bóng Tối
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl m-0">
            Tài liệu SOP kỹ thuật chuẩn mực phục vụ đào tạo Chuyên Viên Kỹ Thuật tại Wings và trình duyệt CEO trước khi
            triển khai mở rộng (Scale). Thiết kế trực quan, dễ hiểu từng bước; tích hợp mục đích thao tác, danh mục vật
            tư tiêu hao, tiêu chuẩn kiểm soát chất lượng (QC) và thống kê đối chiếu thời gian đo đạc thực tế.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button
            type={showGlossary ? 'primary' : 'default'}
            icon={<AppIcon icon={BookOpen} size={14} />}
            onClick={onToggleGlossary}
            className="rounded-xl text-xs font-semibold"
            data-testid="toggle-glossary-btn"
          >
            {showGlossary ? 'Đóng từ điển thuật ngữ' : 'Từ điển thuật ngữ (Dễ hiểu)'}
          </Button>

          {onOpenSopModal && (
            <Button
              icon={<AppIcon icon={Layers} size={14} />}
              onClick={onOpenSopModal}
              className="rounded-xl text-xs font-medium border-slate-300 dark:border-slate-700"
            >
              Quản lý bước SOP
            </Button>
          )}
          <Button
            icon={<AppIcon icon={RefreshCw} size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={onRefresh}
            loading={loading}
            className="rounded-xl text-xs font-medium"
          >
            Làm mới số liệu
          </Button>
        </div>
      </div>

      {/* Thông báo trạng thái thẩm định chuyên môn */}
      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
        <AppIcon icon={Info} size={15} className="text-amber-500 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-800 dark:text-slate-200">Lưu ý phê duyệt:</strong> Đây là bản dự thảo kỹ thuật
          đang được trình duyệt chuyên môn cùng Cô Giang Đàm và Project Owner. Hệ thống phân định rõ ràng giữa{' '}
          <strong className="text-slate-800 dark:text-slate-200">Thời gian kỹ thuật tiêu chuẩn (target)</strong> và{' '}
          <strong className="text-slate-800 dark:text-slate-200">Thời gian thực tế đo đạc</strong>, tuyệt đối không lấy
          thời gian một ca riêng lẻ làm định mức chung. Các thông số kỹ thuật thiếu căn cứ đều được đánh dấu{' '}
          <em className="text-amber-600 dark:text-amber-400 font-medium">&ldquo;Chờ Cô Giang Đàm xác nhận&rdquo;</em>.
        </span>
      </div>
    </div>
  );
}
