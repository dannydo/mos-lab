'use client';

import React from 'react';
import { Button } from 'antd';
import { ArrowLeft, Award, GraduationCap, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import type { AssessmentSopTabKey } from './assessment-cert-config';

interface AssessmentSopHeaderAndTabsProps {
  onBack?: () => void;
  activeTab: AssessmentSopTabKey;
  onTabChange: (tab: AssessmentSopTabKey) => void;
  technicianCount: number;
  avgCsatScore: number;
}

export function AssessmentSopHeaderAndTabs({
  onBack,
  activeTab,
  onTabChange,
  technicianCount,
  avgCsatScore,
}: AssessmentSopHeaderAndTabsProps) {
  return (
    <>
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          {onBack && (
            <Button
              type="text"
              size="small"
              onClick={onBack}
              className="text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-0 h-auto flex items-center gap-1 font-medium"
              data-testid="sop-assessment-back-button"
            >
              <AppIcon icon={ArrowLeft} size={14} />
              <span>Quay lại Khung đào tạo</span>
            </Button>
          )}
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Khung 5 Hạng mục SOP</span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
            Hạng mục 5: Đánh giá Năng lực, CSAT &amp; Chứng chỉ Vận hành
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <AppIcon icon={ShieldCheck} size={13} className="mr-1.5" />
            Kiểm soát độc lập 2 vòng
          </span>
          <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
            Phiên bản SOP v1.0
          </span>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-slate-900/5 dark:from-amber-950/30 dark:via-emerald-950/20 dark:to-slate-900/40 border border-amber-500/20 p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <AppIcon icon={Award} size={13} className="mr-1.5" />
                Hạng mục 5 · Sát hạch &amp; Chứng chỉ Vận hành
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Module Pilot Uốn Mi Bóng Tối
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight m-0">
              Sát Hạch Năng Lực Chuyên Môn, Thẩm Định CSAT &amp; Cấp Chứng Chỉ Vận Hành
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
              Bộ tiêu chuẩn kiểm định độc lập năng lực thực hành của <strong>Chuyên Viên Kỹ Thuật</strong>, tổng hợp chỉ
              số hài lòng thực tế <strong>CSAT ≥ 4.8/5 sao</strong> từ khách hàng Pilot, và hoàn thiện hồ sơ chứng chỉ
              chuyên môn trình CEO Danny phê duyệt trước khi nhân rộng quy mô (Scale).
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2 text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Người đào tạo: <strong className="text-slate-800 dark:text-slate-200">Cô Giang Đàm</strong>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Chấm thi &amp; Phê duyệt: <strong className="text-amber-600 dark:text-amber-400">CEO Danny Đỗ</strong>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              <Sparkles size={11} /> Chưa kích hoạt tự động Scale
            </span>
          </div>
        </div>
      </div>

      {/* 3 Main Action Navigation Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => onTabChange('exam')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'exam'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          data-testid="tab-btn-exam"
        >
          <AppIcon icon={GraduationCap} size={15} />
          <span>Phần 1: Sát Hạch Năng Lực ({technicianCount} CV)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('csat')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'csat'
              ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          data-testid="tab-btn-csat"
        >
          <AppIcon icon={Star} size={15} />
          <span>Phần 2: Thẩm Định CSAT ({avgCsatScore}★)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('cert')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'cert'
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          data-testid="tab-btn-cert"
        >
          <AppIcon icon={Award} size={15} />
          <span>Phần 3: Chứng Chỉ Vận Hành</span>
        </button>
      </div>
    </>
  );
}
