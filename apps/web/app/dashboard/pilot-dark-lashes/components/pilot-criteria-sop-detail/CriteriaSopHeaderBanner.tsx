'use client';

import React from 'react';
import { Button } from 'antd';
import { ArrowLeft, Award, BookOpen, CheckCircle2, Clock, HelpCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import { TECHNICAL_GLOSSARY } from './sop-criteria-catalog';

interface CriteriaSopHeaderBannerProps {
  onBack?: () => void;
  onOpenCriteriaModal?: () => void;
  onOpenSopModal?: () => void;
  showGlossary: boolean;
  onToggleGlossary: () => void;
  passRate: string;
}

export function CriteriaSopHeaderBanner({
  onBack,
  onOpenCriteriaModal,
  onOpenSopModal,
  showGlossary,
  onToggleGlossary,
  passRate,
}: CriteriaSopHeaderBannerProps) {
  return (
    <>
      {/* BREADCRUMBS & TOP CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {onBack && (
            <Button
              type="text"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 -ml-2 rounded-lg"
              data-testid="sop-detail-back-button"
            >
              <AppIcon icon={ArrowLeft} size={14} />
              <span>Quay lại Khung đào tạo</span>
            </Button>
          )}
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Khung 5 Hạng mục SOP</span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Hạng mục 1: SOP Đánh giá &amp; Phân loại dáng mi
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="small"
            onClick={onToggleGlossary}
            className="inline-flex items-center gap-1.5 text-xs rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10"
            data-testid="toggle-glossary-button"
          >
            <AppIcon icon={HelpCircle} size={13} className="text-amber-500" />
            <span>{showGlossary ? 'Đóng giải thích thuật ngữ' : 'Từ điển thuật ngữ (Dễ hiểu)'}</span>
          </Button>

          {onOpenCriteriaModal && (
            <Button
              size="small"
              onClick={onOpenCriteriaModal}
              className="inline-flex items-center gap-1.5 text-xs rounded-lg border-slate-200 dark:border-slate-700"
            >
              <AppIcon icon={Sparkles} size={13} className="text-violet-500" />
              <span>Danh mục 5 tiêu chí</span>
            </Button>
          )}
          {onOpenSopModal && (
            <Button
              size="small"
              onClick={onOpenSopModal}
              className="inline-flex items-center gap-1.5 text-xs rounded-lg border-slate-200 dark:border-slate-700"
            >
              <AppIcon icon={BookOpen} size={13} className="text-teal-500" />
              <span>Xem trước SOP 7 bước</span>
            </Button>
          )}
        </div>
      </div>

      {/* HEADER BANNER & SCALE APPROVAL STATUS */}
      <div className="rounded-2xl p-5 sm:p-6 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent relative overflow-hidden shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <AppIcon icon={Sparkles} size={13} className="mr-1.5" />
                Hạng mục 1 · SOP Tiêu Chuẩn Kỹ Thuật
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                Phiên bản SOP v1.0
              </span>
              <span
                className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                data-testid="expert-approval-status-badge"
              >
                <AppIcon icon={Clock} size={13} className="mr-1.5 text-amber-500" />
                Chờ Cô Giang Đàm thẩm định chuyên môn
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight m-0">
              SOP Đánh Giá &amp; Phân Loại Dáng Mi Trước Dịch Vụ
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
              Bộ chuẩn mực kỹ thuật thẩm định cấu trúc nang lông mi tự nhiên, độ dài, mật độ và khả năng tạo form dành
              cho <strong className="text-slate-800 dark:text-slate-100">Chuyên Viên Kỹ Thuật</strong> tại Wings. Tài
              liệu được tổng hợp trực tiếp từ dữ liệu thực nghiệm 17 ca Pilot tại chi nhánh Đề Thám, phục vụ công tác
              đào tạo KTV và trình CEO phê duyệt mở rộng quy mô (Scale-up) toàn chuỗi.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shrink-0 space-y-1.5 min-w-[220px]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hồ sơ trình phê duyệt
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Chuyên gia phụ trách:</span>
              <strong className="text-slate-800 dark:text-slate-200">Cô Giang Đàm</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Thực nghiệm Pilot:</span>
              <strong className="text-slate-800 dark:text-slate-200">Cô Đẫm (17 ca)</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Trạng thái phê duyệt:</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Chờ thẩm định</span>
            </div>
          </div>
        </div>

        {/* 3 Trụ cột mục tiêu */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <AppIcon icon={CheckCircle2} size={14} className="text-emerald-500" />
              <span>Đào tạo Chuyên Viên Kỹ Thuật</span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Chuẩn hóa 5 bước quan sát, thẩm định mi bằng kính Macro 15x và cữ thước đo mi tại bàn tư vấn.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <AppIcon icon={ShieldAlert} size={14} className="text-rose-500" />
              <span>Triệt tiêu Rủi ro &amp; Biến chứng</span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Từ chối kiên quyết các trường hợp mi ngắn &lt; 8mm, mi trụi mảng (như ca #10) để bảo vệ uy tín Wings.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
              <AppIcon icon={Award} size={14} className="text-teal-500" />
              <span>Căn cứ Trình CEO Phê Duyệt</span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal tabular-nums">
              Định lượng tỷ lệ PASS/FAIL thực tế ({passRate}% Đạt) và quy trình chuyển đổi dịch vụ linh hoạt.
            </p>
          </div>
        </div>
      </div>

      {/* TỪ ĐIỂN THUẬT NGỮ KỸ THUẬT (DÀNH CHO NGƯỜI MỚI & QUẢN LÝ) */}
      {showGlossary && (
        <div
          className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 space-y-3 transition-all"
          data-testid="sop-glossary-section"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AppIcon icon={BookOpen} size={15} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Từ Điển Thuật Ngữ Kỹ Thuật (Diễn Giải Dễ Hiểu Cho Mọi Người)
              </h3>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Không cần chuyên môn vẫn hiểu rõ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {TECHNICAL_GLOSSARY.map((item) => (
              <div
                key={item.term}
                className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 space-y-1"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AppIcon icon={HelpCircle} size={13} className="text-amber-500" />
                  <span>{item.term}</span>
                </div>
                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 m-0 leading-relaxed">
                  {item.simpleExplain}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
