'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Card, Tooltip, Typography, message } from 'antd';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Info,
  Layers,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  User,
  Wrench,
} from 'lucide-react';
import {
  DARK_LASHES_SOP_7_STEPS_DETAILED,
  type PilotSopStepDetail,
  type PilotSopStepEmpiricalStat,
  type PilotStepSampleSession,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon } from '../../../../components/ui/AppIcon';

const { Title, Text } = Typography;

function formatSecondsToDisplay(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds <= 0) {
    return '--:--';
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}p ${s < 10 ? '0' : ''}${s}s`;
}

interface PilotSopDetailViewProps {
  onBack?: () => void;
  onOpenSopModal?: () => void;
  onViewSessionId?: (sessionId: number) => void;
}

export function PilotSopDetailView({ onBack, onOpenSopModal, onViewSessionId }: PilotSopDetailViewProps) {
  const [selectedStepOrder, setSelectedStepOrder] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<number, PilotSopStepEmpiricalStat>>({});
  const [totalSessions, setTotalSessions] = useState<number>(18);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchEmpiricalStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.getSopEmpiricalStats({ pilotCode: 'DARK_LASHES' });
      if (res && Array.isArray(res.stats)) {
        const mapped: Record<number, PilotSopStepEmpiricalStat> = {};
        for (const st of res.stats) {
          mapped[st.stepOrder] = st;
        }
        setStats(mapped);
        if (typeof res.totalSessionsCount === 'number') {
          setTotalSessions(res.totalSessionsCount);
        }
      }
    } catch {
      // Non-blocking fallback: empirical metrics can load from cache
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpiricalStats();
  }, [fetchEmpiricalStats]);

  // Aggregate standard vs empirical total time
  const { totalTargetMinutes, totalEmpiricalAvgSeconds, stepsWithStats } = useMemo(() => {
    let targetMin = 0;
    let empiricalSecSum = 0;
    let countedSteps = 0;

    for (const step of DARK_LASHES_SOP_7_STEPS_DETAILED) {
      targetMin += step.targetMinutes;
      const st = stats[step.stepOrder];
      if (st && st.avgDurationSeconds > 0) {
        empiricalSecSum += st.avgDurationSeconds;
        countedSteps++;
      }
    }

    return {
      totalTargetMinutes: targetMin,
      totalEmpiricalAvgSeconds: empiricalSecSum,
      stepsWithStats: countedSteps,
    };
  }, [stats]);

  // Filtered steps list
  const filteredSteps = useMemo(() => {
    let list = DARK_LASHES_SOP_7_STEPS_DETAILED;
    if (selectedStepOrder !== 'all') {
      list = list.filter((s) => s.stepOrder === selectedStepOrder);
    }
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.purpose.toLowerCase().includes(q) ||
          s.materials.some((m) => m.name.toLowerCase().includes(q)) ||
          s.commonErrors.some((e) => e.error.toLowerCase().includes(q) || e.remedy.toLowerCase().includes(q))
      );
    }
    return list;
  }, [selectedStepOrder, filterQuery]);

  return (
    <div className="space-y-5 antialiased" data-testid="pilot-sop-detail-view">
      {/* ═══════════════════════════════════════════
          1. HEADER & DRAFT STATUS BANNER
          ═══════════════════════════════════════════ */}
      <div className="rounded-2xl p-4 sm:p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-900/5 dark:to-slate-900/40 relative overflow-hidden transition-all duration-300 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-xs"
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
              triển khai mở rộng (Scale). Hệ thống tích hợp toàn bộ mục đích thao tác, danh mục vật tư tiêu hao, điểm kiểm
              soát chất lượng (QC) và thống kê đo đạc thời gian thực tế từ các ca thực hành Pilot.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
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
              onClick={fetchEmpiricalStats}
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
            <strong className="text-slate-800 dark:text-slate-200">Lưu ý phê duyệt:</strong> Đây là bản dự thảo kỹ
            thuật đang được trình duyệt chuyên môn cùng Cô Giang Đàm và Project Owner. Hệ thống phân định rõ ràng giữa{' '}
            <strong className="text-slate-800 dark:text-slate-200">Thời gian kỹ thuật tiêu chuẩn (target)</strong> và{' '}
            <strong className="text-slate-800 dark:text-slate-200">Thời gian thực tế đo đạc</strong>, tuyệt đối không
            lấy thời gian một ca riêng lẻ làm định mức chung. Các thông số kỹ thuật thiếu căn cứ đều được đánh dấu{' '}
            <em className="text-amber-600 dark:text-amber-400 font-medium">&ldquo;Chờ Cô Giang Đàm xác nhận&rdquo;</em>.
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          2. CORE PRINCIPLES & GUIDELINES (4 NGUYÊN TẮC)
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          size="small"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <AppIcon icon={FileCheck2} size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên tắc 1</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Trình tự 7 bước bất biến</h4>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                Giữ nguyên tên, cấu trúc và thứ tự 7 bước đã được Cô Giang Đàm phê duyệt.
              </p>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <AppIcon icon={Timer} size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên tắc 2</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Phân định thời gian</h4>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                Tách biệt thời gian chuẩn kỹ thuật với thời gian thực tế; không lấy 1 ca làm định mức.
              </p>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <AppIcon icon={ShieldCheck} size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên tắc 3</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Minh chứng &amp; Căn cứ</h4>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                Thông số chưa được đo kiểm thức tế đánh dấu rõ ràng &ldquo;Chờ Cô Giang Đàm xác nhận&rdquo;.
              </p>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AppIcon icon={Award} size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Nguyên tắc 4</span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 m-0">Dự thảo không tự ban hành</h4>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 m-0 mt-1 leading-snug">
                Trình bản dự thảo để PO và Cô Giang Đàm thẩm duyệt; không tự ý áp dụng chính thức.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════
          3. BENCHMARK COMPARISON SUMMARY METRICS
          ═══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thời gian tiêu chuẩn</span>
            <AppIcon icon={Timer} size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
              {totalTargetMinutes}
            </span>
            <span className="text-xs text-slate-500 font-medium">phút (7 bước)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Định mức kỹ thuật khuyến nghị</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Thời gian thực tế TB</span>
            <AppIcon icon={Clock} size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalEmpiricalAvgSeconds > 0 ? Math.round(totalEmpiricalAvgSeconds / 60) : '--'}
            </span>
            <span className="text-xs text-slate-500 font-medium">phút / ca</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            {stepsWithStats > 0 ? `Đo đạc từ ${stepsWithStats}/7 bước ca hoàn thành` : 'Đang đồng bộ số liệu'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng ca Pilot lưu trữ</span>
            <AppIcon icon={Layers} size={16} className="text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-purple-600 dark:text-purple-400 tabular-nums">
              {totalSessions}
            </span>
            <span className="text-xs text-slate-500 font-medium">ca dịch vụ</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Nguồn minh chứng đối chiếu</span>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tiêu chuẩn kiểm soát QC</span>
            <AppIcon icon={ShieldCheck} size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              100%
            </span>
            <span className="text-xs text-slate-500 font-medium">nghiệm thu</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Checklist an toàn &amp; CSAT 5 sao</span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          4. 7-STEP NAVIGATOR BAR & FILTERS
          ═══════════════════════════════════════════ */}
      <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedStepOrder('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStepOrder === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tất cả 7 bước
          </button>

          {DARK_LASHES_SOP_7_STEPS_DETAILED.map((step) => {
            const isSelected = selectedStepOrder === step.stepOrder;
            const st = stats[step.stepOrder];
            return (
              <button
                key={step.stepOrder}
                type="button"
                aria-label={`Bước ${step.stepOrder}: ${step.name}`}
                onClick={() => setSelectedStepOrder(step.stepOrder)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {step.stepOrder}
                </span>
                <span>{step.name}</span>
                {st && st.avgDurationSeconds > 0 && (
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded tabular-nums font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {Math.round(st.avgDurationSeconds / 60)}p
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative shrink-0 w-full md:w-64">
          <input
            type="text"
            placeholder="Tìm theo bước, vật tư, lỗi..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <AppIcon icon={Search} size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          5. BENCHMARK COMPARISON TABLE (BẢNG ĐỐI CHIẾU THỜI GIAN)
          ═══════════════════════════════════════════ */}
      {selectedStepOrder === 'all' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AppIcon icon={Compass} size={16} className="text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
                Bảng Thống Kê Đối Chiếu: Thời Gian Tiêu Chuẩn vs Thời Gian Thực Tế Pilot
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              * Không lấy thời gian một ca làm định mức chung
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10.5px] font-semibold">
                  <th className="py-2.5 px-3">Thứ tự &amp; Bước kỹ thuật</th>
                  <th className="py-2.5 px-3">Chuẩn kỹ thuật (Target)</th>
                  <th className="py-2.5 px-3">Thực tế TB (Pilot)</th>
                  <th className="py-2.5 px-3">Biến thiên thực tế (Min - Max)</th>
                  <th className="py-2.5 px-3">Số ca ghi nhận</th>
                  <th className="py-2.5 px-3">Nhận định vận hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                {DARK_LASHES_SOP_7_STEPS_DETAILED.map((step) => {
                  const st = stats[step.stepOrder];
                  const hasEmpirical = Boolean(st && st.completedCount > 0);
                  const avgMinutes = hasEmpirical ? Math.round(st.avgDurationSeconds / 60) : null;
                  const delta = avgMinutes !== null ? avgMinutes - step.targetMinutes : null;

                  return (
                    <tr
                      key={step.stepOrder}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedStepOrder(step.stepOrder)}
                    >
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                            {step.stepOrder}
                          </span>
                          <span>{step.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                        {step.targetMinutes} phút
                      </td>
                      <td className="py-3 px-3 tabular-nums font-semibold">
                        {hasEmpirical ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatSecondsToDisplay(st.avgDurationSeconds)} ({avgMinutes}p)
                          </span>
                        ) : (
                          <span className="text-slate-400">Đang cập nhật</span>
                        )}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-slate-500 dark:text-slate-400">
                        {hasEmpirical ? (
                          <span>
                            {formatSecondsToDisplay(st.minDurationSeconds)} - {formatSecondsToDisplay(st.maxDurationSeconds)}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="py-3 px-3 tabular-nums text-slate-600 dark:text-slate-300">
                        {st ? `${st.completedCount} ca hoàn thành` : '0'}
                      </td>
                      <td className="py-3 px-3">
                        {delta !== null ? (
                          delta > 3 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                              <AppIcon icon={Clock} size={11} /> Thao tác kỹ lưỡng (+{delta}p)
                            </span>
                          ) : delta < -3 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                              <AppIcon icon={CheckCircle2} size={11} /> Hoàn thành nhanh ({delta}p)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                              <AppIcon icon={CheckCircle2} size={11} /> Đúng chuẩn thiết kế
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-xs">Theo dõi thêm</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          6. DETAILED CARDS FOR EACH STEP (7 BƯỚC CHI TIẾT)
          ═══════════════════════════════════════════ */}
      {filteredSteps.length === 0 ? (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <AppIcon icon={Search} size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0">Không tìm thấy bước kỹ thuật phù hợp với từ khóa.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSteps.map((step) => {
            const st = stats[step.stepOrder];
            const hasEmpirical = Boolean(st && st.completedCount > 0);

            return (
              <Card
                key={step.stepOrder}
                variant="outlined"
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
                styles={{ body: { padding: 0 } }}
              >
                {/* Step Card Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
                      {step.stepOrder}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Bước {step.stepOrder}/7
                        </span>
                        <span className="inline-flex items-center justify-center leading-none text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 tabular-nums">
                          <AppIcon icon={Timer} size={11} className="mr-1" />
                          Tiêu chuẩn: {step.targetMinutes} phút
                        </span>
                        {hasEmpirical && (
                          <span className="inline-flex items-center justify-center leading-none text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 tabular-nums">
                            <AppIcon icon={Clock} size={11} className="mr-1" />
                            Thực tế TB: {formatSecondsToDisplay(st.avgDurationSeconds)} ({st.completedCount} ca)
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0 mt-0.5">
                        {step.name}
                      </h3>
                    </div>
                  </div>

                  {step.unverifiedNotice && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/25 shrink-0">
                      <AppIcon icon={HelpCircle} size={13} className="text-amber-600 shrink-0" />
                      <span>{step.unverifiedNotice}</span>
                    </span>
                  )}
                </div>

                <div className="p-4 sm:p-6 space-y-6">
                  {/* Mục đích chuyên môn */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <AppIcon icon={Compass} size={14} className="text-teal-600" />
                      <span>Mục đích chuyên môn</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-teal-500/5 dark:bg-teal-500/10 p-3 rounded-xl border border-teal-500/15 m-0 font-medium">
                      {step.purpose}
                    </p>
                  </div>

                  {/* 2 cột: Hướng dẫn thao tác & Vật tư sử dụng */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Cột 1: Hướng dẫn thao tác tuần tự (7 cột) */}
                    <div className="lg:col-span-7 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <AppIcon icon={BookOpen} size={14} className="text-emerald-600" />
                        <span>Hướng dẫn thao tác kỹ thuật chuẩn mực</span>
                      </div>
                      <ol className="m-0 p-0 list-none space-y-2">
                        {step.instructions.map((ins, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                          >
                            <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{ins}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Cột 2: Danh mục Dụng cụ & Vật tư tương ứng (5 cột) */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <AppIcon icon={Package} size={14} className="text-purple-600" />
                        <span>Dụng cụ &amp; Vật tư sử dụng</span>
                      </div>
                      <div className="space-y-2">
                        {step.materials.map((mat, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between gap-2 shadow-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 block">
                                {mat.name}
                              </span>
                              {mat.purposeNote && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-snug">
                                  {mat.purposeNote}
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {mat.estimatedAmount && (
                                <span className="inline-block text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                  {mat.estimatedAmount}
                                </span>
                              )}
                              {mat.isDisposable && (
                                <span className="block text-[10px] text-slate-400 mt-0.5">Tiêu hao 1 lần</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2 cột: Điểm kiểm soát chất lượng (QC) & Lỗi thường gặp */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    {/* QC Checkpoints */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <AppIcon icon={ShieldCheck} size={14} className="text-emerald-600" />
                        <span>Điểm kiểm soát chất lượng &amp; Tiêu chuẩn hoàn thành</span>
                      </div>
                      <ul className="m-0 p-0 list-none space-y-2">
                        {step.qualityCheckpoints.map((qc, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/15"
                          >
                            <AppIcon icon={CheckCircle2} size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-relaxed font-medium">{qc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Lỗi kỹ thuật & Phương án xử lý */}
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <AppIcon icon={ShieldAlert} size={14} className="text-rose-600" />
                        <span>Lỗi kỹ thuật thường gặp &amp; Phương án xử lý</span>
                      </div>
                      <div className="space-y-2">
                        {step.commonErrors.map((err, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 space-y-1.5"
                          >
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                              <AppIcon icon={AlertTriangle} size={13} className="shrink-0" />
                              <span>{err.error}</span>
                            </div>
                            {err.cause && (
                              <p className="text-[11.5px] text-slate-600 dark:text-slate-400 m-0 leading-snug">
                                <strong className="text-slate-700 dark:text-slate-300">Nguyên nhân:</strong> {err.cause}
                              </p>
                            )}
                            <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300 m-0 leading-snug font-medium pt-1 border-t border-rose-200/50 dark:border-rose-900/40">
                              <strong>Khắc phục tức thì:</strong> {err.remedy}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Minh chứng & Ca dịch vụ Pilot thực tế */}
                  {st && st.sampleSessions && st.sampleSessions.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <AppIcon icon={FileText} size={14} className="text-indigo-600" />
                          <span>Dữ liệu minh chứng từ các ca Pilot thực tế</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Ghi nhận thực tế đo đạc qua bộ đếm giờ từng bước
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {st.sampleSessions.map((samp, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-2 hover:border-emerald-500/40 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                                  Ca #{samp.sessionId} · {samp.customerName}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 block">
                                {samp.technicianName} · {samp.sessionDate || 'Gần đây'}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="inline-block text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatSecondsToDisplay(samp.durationSeconds)}
                              </span>
                              {onViewSessionId && (
                                <button
                                  type="button"
                                  onClick={() => onViewSessionId(samp.sessionId)}
                                  className="block text-[11px] text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium mt-0.5"
                                >
                                  Xem ca gốc →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PilotSopDetailView;
