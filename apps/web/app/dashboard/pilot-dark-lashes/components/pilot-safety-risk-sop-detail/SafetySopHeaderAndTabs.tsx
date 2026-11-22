'use client';

import React from 'react';
import { Button } from 'antd';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { AppIcon } from '~/components/ui';
import type { SafetyRiskTabKey } from './safety-risk-types';

interface SafetySopHeaderAndTabsProps {
  onBack?: () => void;
  activeTab: SafetyRiskTabKey;
  onTabChange: (tab: SafetyRiskTabKey) => void;
  isExpertApproved: boolean;
  onToggleApproval: () => void;
  onPrintSop: () => void;
  totalPilotSessions: number;
}

export function SafetySopHeaderAndTabs({
  onBack,
  activeTab,
  onTabChange,
  isExpertApproved,
  onToggleApproval,
  onPrintSop,
  totalPilotSessions,
}: SafetySopHeaderAndTabsProps) {
  return (
    <>
      {/* Top Breadcrumb & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              data-testid="sop-safety-back-button"
            >
              <AppIcon icon={ArrowLeft} size={14} />
              <span>Quay lại Khung đào tạo</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>SOP &amp; Đào tạo KTV</span>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              Hạng mục 4: Quản trị an toàn &amp; Xử lý sự cố
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="small" icon={<AppIcon icon={Printer} size={13} />} onClick={onPrintSop} className="text-xs">
            In / Xuất Dự Thảo SOP
          </Button>
          <Button
            size="small"
            type={isExpertApproved ? 'default' : 'primary'}
            danger={!isExpertApproved}
            icon={<AppIcon icon={isExpertApproved ? CheckCircle2 : ShieldCheck} size={13} />}
            onClick={onToggleApproval}
            data-testid="toggle-approval-btn"
            className="text-xs font-medium"
          >
            {isExpertApproved ? 'Đã thẩm định chuyên môn' : 'Xác nhận thẩm định chuyên môn'}
          </Button>
        </div>
      </div>

      {/* Header Banner & Scale Approval Status */}
      <div className="rounded-2xl p-5 sm:p-6 border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent relative overflow-hidden shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2 max-w-4xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                <AppIcon icon={ShieldCheck} size={13} className="mr-1.5" />
                Hạng mục 4 · SOP Quản Trị An Toàn, Rủi Ro &amp; Xử Lý Sự Cố
              </span>
              <span className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                Phiên bản SOP v1.0
              </span>
              <span
                className={`inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  isExpertApproved
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
                data-testid="expert-approval-status-badge"
              >
                <AppIcon
                  icon={isExpertApproved ? CheckCircle2 : Clock}
                  size={13}
                  className={`mr-1.5 ${isExpertApproved ? 'text-emerald-500' : 'text-amber-500'}`}
                />
                {isExpertApproved
                  ? 'Đã được Cô Giang Đàm thẩm định chuyên môn'
                  : 'Chờ Cô Giang Đàm thẩm định chuyên môn'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight m-0">
              SOP Quản Trị An Toàn Giác Mạc, Phòng Ngừa Rủi Ro &amp; Xử Lý Sự Cố
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed m-0">
              Hệ thống tiêu chuẩn an toàn y tế nghiêm ngặt dành cho{' '}
              <strong className="text-slate-800 dark:text-slate-100">Chuyên Viên Kỹ Thuật</strong> thực hiện dịch vụ Uốn
              Mi Bóng Tối tại Wings. Quy chuẩn hóa quy tắc bảo vệ niêm mạc mắt trước - trong - sau dịch vụ, nhận diện
              tức thời 3 cấp độ phản ứng nhạy cảm và quy chế lập biên bản xử lý sự cố. Tài liệu tổng hợp thành hồ sơ dự
              thảo để Chuyên gia Cô Giang Đàm thẩm định trước khi trình CEO phê duyệt Scale-up toàn chuỗi.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shrink-0 space-y-1.5 min-w-[240px]">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Hồ sơ thẩm định Scale
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Chuyên gia phê duyệt:</span>
              <strong className="text-slate-800 dark:text-slate-200">Cô Giang Đàm</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Thực nghiệm Pilot:</span>
              <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                Cô Đẫm ({totalPilotSessions} ca - 100% an toàn)
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Trạng thái hồ sơ:</span>
              <span
                className={`font-semibold ${
                  isExpertApproved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {isExpertApproved ? 'Đã thẩm định' : 'Chờ thẩm định'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">Quy chế áp dụng:</span>
              <span className="text-slate-700 dark:text-slate-300 text-[11px]">Không tự ban hành SOP</span>
            </div>
          </div>
        </div>

        {/* 3 Highlight Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div
            onClick={() => onTabChange('part1')}
            className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 cursor-pointer hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <AppIcon icon={Eye} size={14} className="text-emerald-500" />
                <span>Phần 1: Bảo vệ niêm mạc mắt</span>
              </div>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 m-0">
                3 Giai đoạn
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Quy tắc trước - trong - sau dịch vụ, khoảng cách cữ trục ≥ 0.8mm và 6 Điểm kiểm soát an toàn (SCP).
            </p>
          </div>

          <div
            onClick={() => onTabChange('part2')}
            className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 cursor-pointer hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <AppIcon icon={AlertTriangle} size={14} className="text-amber-500" />
                <span>Phần 2: Nhận diện &amp; Xử lý rủi ro</span>
              </div>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 m-0">
                3 Cấp độ
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              Nhận diện sớm cay mắt, kích ứng đỏ bờ mi và quy trình khẩn cấp chuyển tuyến y tế chuyên khoa mắt.
            </p>
          </div>

          <div
            onClick={() => onTabChange('part3')}
            className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5 cursor-pointer hover:border-rose-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <AppIcon icon={ShieldAlert} size={14} className="text-rose-500" />
                <span>Phần 3: Biên bản sự cố &amp; Chăm sóc</span>
              </div>
              <span className="inline-flex items-center justify-center leading-none px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 m-0">
                0 Sự cố Pilot
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 leading-normal">
              17 ca Pilot Đề Thám an toàn 100%. Biểu mẫu ghi nhận sự cố sẵn sàng và lộ trình chăm sóc 24h - 48h - 72h.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-overview"
        >
          Toàn cảnh Hạng mục 4
        </button>

        <button
          type="button"
          onClick={() => onTabChange('part1')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'part1'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-part1"
        >
          <AppIcon icon={Eye} size={13} />
          <span>Phần 1: Bảo vệ niêm mạc mắt</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('part2')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'part2'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-part2"
        >
          <AppIcon icon={AlertTriangle} size={13} />
          <span>Phần 2: Nhận diện &amp; Xử lý rủi ro</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('part3')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'part3'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-part3"
        >
          <AppIcon icon={ShieldAlert} size={13} />
          <span>Phần 3: Biên bản sự cố &amp; Chăm sóc</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('draft')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'draft'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          data-testid="tab-safety-draft"
        >
          <AppIcon icon={BookOpen} size={13} />
          <span>Dự thảo SOP Trình Scale</span>
        </button>
      </div>
    </>
  );
}
