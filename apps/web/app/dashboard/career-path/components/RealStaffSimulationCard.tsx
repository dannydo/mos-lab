'use client';

import React from 'react';
import { Slider, Progress, Tooltip, Avatar } from 'antd';
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Zap,
  Target,
  Flame,
  Award,
} from 'lucide-react';
import { StatusTag } from '../../../../components/ui';
import type { StaffCareerStatus, CareerProgressionConfig } from '@mos-lab/shared';
import { formatCareerRoleName } from '../career-path.constants';

interface RealStaffSimulationCardProps {
  status: StaffCareerStatus | null;
  config: CareerProgressionConfig;
  sliderOrders: number;
  setSliderOrders: (val: number) => void;
  sliderCombo: number;
  setSliderCombo: (val: number) => void;
  onActivateTrial?: () => void;
  onPromote?: () => void;
  onSwitchSpecialist?: () => void;
  loadingAction?: boolean;
}

interface StatRadarChartProps {
  actualScores: number[]; // [orders, fix, tip, qa, hi, banana]
  targetScores: number[]; // [1, 1, 1, 1, 1, 1]
  simulatedScores: number[]; // [simOrders, fix, tip, qa, hi, banana]
  qaLabel?: string;
}

/**
 * Biểu đồ Radar RPG 6 Cánh - Hiển thị 6 chỉ số thăng hạng CV -> CV+ của Kỹ thuật viên
 */
const StatRadarChart: React.FC<StatRadarChartProps> = ({ actualScores, targetScores, simulatedScores, qaLabel }) => {
  const cx = 110;
  const cy = 100;
  const R = 68;
  const axes = [
    { label: '300 Ca/3T', icon: '🎯' },
    { label: 'Fix < 2%', icon: '🛡️' },
    { label: 'Tip > 10% Shop', icon: '💖' },
    { label: qaLabel || 'QA ≥ 12L/3T', icon: '📋' },
    { label: 'HI > 70%', icon: '😊' },
    { label: 'Chuối ≥ 45/90N', icon: '🍌' },
  ];

  const getPoints = (scores: number[]) => {
    return scores
      .map((score, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
        const r = R * Math.max(0.1, Math.min(1.15, score));
        return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
      })
      .join(' ');
  };

  const getGridPoints = (factor: number) => {
    return [0, 1, 2, 3, 4, 5]
      .map((i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
        const r = R * factor;
        return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
      })
      .join(' ');
  };

  const targetPoints = getPoints(targetScores);
  const actualPoints = getPoints(actualScores);
  const simulatedPoints = getPoints(simulatedScores);

  return (
    <div className="relative flex flex-col items-center select-none py-1">
      <svg width="220" height="200" viewBox="0 0 220 200" className="overflow-visible">
        {/* Background Grid Polygons */}
        {[0.25, 0.5, 0.75, 1.0].map((level) => (
          <polygon
            key={level}
            points={getGridPoints(level)}
            strokeWidth={level === 1.0 ? '1.5' : '1'}
            strokeDasharray={level === 1.0 ? 'none' : '2,2'}
            className={
              level === 1.0
                ? 'fill-rose-500/5 stroke-slate-300 dark:stroke-slate-700/60'
                : 'fill-none stroke-slate-300 dark:stroke-slate-700/60'
            }
          />
        ))}

        {/* Axis lines */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
          const x = cx + R * Math.cos(angle);
          const y = cy + R * Math.sin(angle);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="1"
            />
          );
        })}

        {/* Target 100% Polygon (Gold Dashed) */}
        <polygon
          points={targetPoints}
          strokeWidth="1.5"
          strokeDasharray="3,3"
          className="fill-none stroke-amber-500 opacity-75"
        />

        {/* Simulated Polygon (Emerald dashed glow) */}
        <polygon
          points={simulatedPoints}
          strokeWidth="2"
          strokeDasharray="4,2"
          className="fill-emerald-500/15 stroke-emerald-500 transition-all duration-300"
        />

        {/* Actual Staff Polygon (Rose/Purple gradient filled) */}
        <polygon
          points={actualPoints}
          strokeWidth="2.5"
          className="fill-rose-500/25 stroke-rose-500 transition-all duration-500 drop-shadow-sm"
        />

        {/* Stat Vertex Dots and Labels */}
        {axes.map((axis, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
          const labelDist = R + 18;
          const lx = cx + labelDist * Math.cos(angle);
          const ly = cy + labelDist * Math.sin(angle);

          const actualR = R * Math.max(0.1, Math.min(1.15, actualScores[i]));
          const dx = cx + actualR * Math.cos(angle);
          const dy = cy + actualR * Math.sin(angle);

          return (
            <g key={i}>
              <circle cx={dx} cy={dy} r="3" className="fill-rose-500 drop-shadow" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                className="text-[9px] font-bold fill-slate-600 dark:fill-slate-300"
              >
                {axis.icon} {axis.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] mt-2 font-semibold">
        <span className="flex items-center gap-1 text-rose-500">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Thực tế
        </span>
        <span className="flex items-center gap-1 text-amber-500">
          <span className="w-2 h-0.5 border-b border-amber-500 border-dashed" /> Ải chuẩn
        </span>
        <span className="flex items-center gap-1 text-emerald-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Dự phóng
        </span>
      </div>
    </div>
  );
};

export const RealStaffSimulationCard: React.FC<RealStaffSimulationCardProps> = ({
  status,
  config,
  sliderOrders,
  setSliderOrders,
  sliderCombo,
  setSliderCombo,
  onActivateTrial,
  onPromote,
  onSwitchSpecialist,
  loadingAction,
}) => {
  if (!status) return null;

  const cvReq = config.cvToCvPlus || config.cvToCc;
  const metrics = status.metrics;
  const earnings = status.earningsSimulation;

  const staffTipRate =
    metrics.staffTipRate ??
    (metrics.ordersCount
      ? Math.min(0.65, Math.max(0.2, ((metrics.totalTip || 0) / (metrics.ordersCount * 38000)) * 0.45))
      : 0.314);
  const shopTipRate = metrics.shopTipRate ?? 0.45; // 45.0%
  const minTipRatioAboveShop = cvReq.minTipRatioAboveShop ?? 0.1; // +10% của shop
  const shopBonusPercent = Number((shopTipRate * minTipRatioAboveShop * 100).toFixed(1)); // 4.5%
  const targetTipRate = metrics.targetTipRate ?? Number((shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3)); // 0.495 (49.5%)

  const staffTipRatePercent = Number((staffTipRate * 100).toFixed(1)); // e.g. 31.4%
  const shopTipRatePercent = Number((shopTipRate * 100).toFixed(1)); // 45.0%
  const targetTipRatePercent = Number((targetTipRate * 100).toFixed(1)); // 49.5%

  // 6 Tiêu Chí Nâng Cấp CV lên CV+ (Theo chuẩn Danny):
  // 1. 300 bộ mi / 3 tháng
  const isOrdersPassed = (metrics.ordersCount || 0) >= cvReq.minOrders;
  const ordersGap = Math.max(0, cvReq.minOrders - (metrics.ordersCount || 0));
  const ordersProgressPercent = Math.min(
    100,
    Math.round(((metrics.ordersCount || 0) / (cvReq.minOrders || 300)) * 100)
  );

  // 2. fix < 2%
  const isFixPassed = (metrics.fixRate || 0) <= cvReq.maxFixRate;

  // 3. tip > 10% trung bình của shop (45% + 4.5% = >= 49.5%)
  const isTipPassed = staffTipRate >= targetTipRate || (metrics.tipRatioAboveShop || 0) >= minTipRatioAboveShop;
  const tipGapPercent = Math.max(0, Number((targetTipRatePercent - staffTipRatePercent).toFixed(1)));
  const tipExcessPercent = Math.max(0, Number((staffTipRatePercent - targetTipRatePercent).toFixed(1)));
  const tipProgressPercent = Math.min(100, Math.max(0, Math.round((staffTipRate / targetTipRate) * 100)));

  // 4. QA/QC tối thiểu 12 lần trong 3 tháng qua (cho phép tự chỉnh qua minQaAudits)
  const qaAudit = metrics.qaAudit;
  const requiredQaAudits =
    cvReq.minQaAudits ?? (cvReq.minWeeklyQaAudits ? Math.round(cvReq.minWeeklyQaAudits * 12) : 12);
  const totalQaAudits = qaAudit?.totalAudits ?? 0;
  const isQaPassed =
    requiredQaAudits === 0 ||
    Boolean(qaAudit?.isPassed ?? (totalQaAudits >= requiredQaAudits && !qaAudit?.hasFailedAudit));
  const hasFailedQa = Boolean(qaAudit?.hasFailedAudit);
  const qaProgressPercent =
    requiredQaAudits === 0
      ? 100
      : isQaPassed
        ? 100
        : Math.min(100, Math.round((totalQaAudits / (requiredQaAudits || 12)) * 100));

  // 5. HI > 70% (Happiness Index khách hàng check-in thả tim)
  const happinessIndex = metrics.happinessIndex ?? 0;
  const isHiPassed = happinessIndex >= cvReq.minHappinessIndex;
  const hiPercent = Math.round(happinessIndex * 100);
  const hiProgressPercent = Math.min(100, Math.round((happinessIndex / (cvReq.minHappinessIndex || 0.7)) * 100));

  // 6. Chuối Yêu Thương >= 45 (15 * 3 = 45 chuối trong 90 ngày nhận từ thiên thần khác lúc check-in)
  const minBananaCount = cvReq.minBananaCount ?? 45;
  const bananaCount = metrics.bananaCount ?? 0;
  const isBananaPassed = bananaCount >= minBananaCount;
  const bananaProgressPercent = Math.min(100, Math.round((bananaCount / minBananaCount) * 100));

  // Gamified Quest XP Progress (Tổng 6 ải hoàn thành)
  const passedQuestsCount =
    Number(isOrdersPassed) +
    Number(isFixPassed) +
    Number(isTipPassed) +
    Number(isQaPassed) +
    Number(isHiPassed) +
    Number(isBananaPassed);
  const xpPercent = Math.round((passedQuestsCount / 6) * 100);

  // What-If Dynamic Simulation
  const isSimOrdersPassed = sliderOrders >= cvReq.minOrders;
  const isSimComboPassed = sliderCombo / 100 >= cvReq.minSelfComboRate;
  const simPassedCount =
    Number(isSimOrdersPassed) +
    Number(isFixPassed) +
    Number(isTipPassed) +
    Number(isQaPassed) +
    Number(isHiPassed) +
    Number(isBananaPassed);
  const isSimAllPassed = simPassedCount === 6;

  // Radar Scores (Normalized 6 Cánh)
  const radarActualScores = [
    Math.min(1.2, (metrics.ordersCount || 0) / (cvReq.minOrders || 300)),
    Math.max(
      0,
      Math.min(
        1.2,
        isFixPassed ? 1.0 + Math.max(0, (0.02 - (metrics.fixRate || 0)) * 10) : 1 - (metrics.fixRate || 0) / 0.04
      )
    ),
    Math.min(1.2, staffTipRate / (targetTipRate || 0.495)),
    hasFailedQa ? 0.2 : requiredQaAudits === 0 ? 1.0 : Math.min(1.2, totalQaAudits / (requiredQaAudits || 12)),
    Math.min(1.2, happinessIndex / (cvReq.minHappinessIndex || 0.7)),
    bananaCount >= minBananaCount
      ? Math.min(1.2, 1.0 + Math.min(0.2, (bananaCount - minBananaCount) / 100))
      : Math.min(0.9, bananaCount / minBananaCount),
  ];

  const radarSimulatedScores = [
    Math.min(1.2, sliderOrders / (cvReq.minOrders || 300)),
    radarActualScores[1],
    radarActualScores[2],
    radarActualScores[3],
    radarActualScores[4],
    radarActualScores[5],
  ];

  const radarTargetScores = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

  const formatVnd = (num?: number | null) => {
    if (!num) return '0đ';
    return `${num.toLocaleString('vi-VN')}đ`;
  };

  const getStatusBadge = () => {
    if (hasFailedQa) {
      return (
        <StatusTag status="error" label="Bị Khóa Nâng Cấp (Failed QA/QC)" className="font-bold text-xs uppercase" />
      );
    }
    if (!isQaPassed && isOrdersPassed && isFixPassed && isTipPassed) {
      return <StatusTag status="warning" label="Chưa Đủ Tuần Kiểm Tra QA" className="font-bold text-xs uppercase" />;
    }
    switch (status.status) {
      case 'QUALIFIED':
        return (
          <StatusTag
            status="success"
            label="Đủ điều kiện thăng cấp"
            className="font-bold text-xs uppercase animate-pulse"
          />
        );
      case 'TRIAL_GATE':
        return (
          <StatusTag
            status="warning"
            label="Đang thử thách ải trùm cuối"
            className="font-bold text-xs uppercase animate-pulse"
          />
        );
      case 'PROMOTED':
        return <StatusTag status="purple" label="Đã thăng hạng thành công" className="font-bold text-xs uppercase" />;
      case 'SPECIALIST_PATH':
        return <StatusTag status="cyan" label="Nhánh Chuyên Gia Kỹ Thuật" className="font-bold text-xs uppercase" />;
      default:
        return (
          <StatusTag status="processing" label="Đang rèn luyện (In-Progress)" className="font-bold text-xs uppercase" />
        );
    }
  };

  // Remaining gaps for gamification cues
  const requiredComboCount = Math.round((metrics.ordersCount || 0) * cvReq.minSelfComboRate);
  const currentComboCount = metrics.selfComboCount || 0;
  const comboCountGap = Math.max(0, requiredComboCount - currentComboCount);

  // Fix Shield Safety Ratio (100% when fixRate == 0, drops towards 0 as fixRate hits 4%)
  const safetyShieldPercent = Math.max(0, Math.min(100, Math.round((1 - (metrics.fixRate || 0)) * 100)));

  // Detailed monthly income gains per perk
  const wageGain =
    earnings?.details?.wageGain ??
    Math.max(
      0,
      ((earnings?.details?.hourlyWageNext || 27500) - (earnings?.details?.hourlyWageCurrent || 25500)) *
        (earnings?.details?.actualWorkingHours || earnings?.details?.monthlyEstimatedHours || 260)
    );

  const tipGain =
    earnings?.details?.tipGain ??
    Math.max(0, (earnings?.details?.tipShareNext || 0) - (earnings?.details?.tipShareCurrent || 0));

  const comboGain =
    earnings?.details?.comboGain ??
    Math.max(0, (earnings?.details?.comboCommissionNext || 0) - (earnings?.details?.comboCommissionCurrent || 0));

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-100/70 dark:border-slate-800 p-5 shadow-sm mb-6 transition-all duration-200">
      {/* Top Banner: Staff Profile & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Avatar
            src={status.avatarUrl || undefined}
            size={48}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 border-2 border-white dark:border-slate-800"
          >
            {status.staffName.slice(0, 1).toUpperCase()}
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 m-0">
                {status.staffName}
              </h2>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>
                Ải hiện tại:{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {formatCareerRoleName(status.currentRole)}
                </strong>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span>
                Ải tiếp theo:{' '}
                <strong className="text-rose-600 dark:text-rose-400">{formatCareerRoleName(status.targetRole)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {status.status !== 'TRIAL_GATE' && !status.qualifiedQuests.allPassed && (
            <Tooltip
              title={
                !isQaPassed
                  ? hasFailedQa
                    ? 'Không thể mở ải: Kỹ thuật viên có bài kiểm tra QA/QC tác phong hoặc phòng mi bị FAILED'
                    : 'Không thể mở ải: Kỹ thuật viên phải mời QA/QC kiểm tra định kỳ ít nhất 1 lần/tuần'
                  : undefined
              }
            >
              <span>
                <button
                  onClick={onActivateTrial}
                  disabled={loadingAction || !isQaPassed}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Mở Ải Trùm Cuối (30 Ngày)
                </button>
              </span>
            </Tooltip>
          )}

          {status.qualifiedQuests.allPassed && (
            <Tooltip
              title={!isQaPassed ? 'Bắt buộc đạt chuẩn kiểm định QA/QC định kỳ mới được duyệt thăng hạng' : undefined}
            >
              <span>
                <button
                  onClick={onPromote}
                  disabled={loadingAction || !isQaPassed}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 animate-pulse"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Duyệt Thăng Hạng
                </button>
              </span>
            </Tooltip>
          )}

          {onSwitchSpecialist && status.status !== 'SPECIALIST_PATH' && (
            <button
              onClick={onSwitchSpecialist}
              disabled={loadingAction}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-all"
            >
              Nhánh Master Tech
            </button>
          )}
        </div>
      </div>

      {/* HERO GAMIFIED LEVEL XP PROGRESS BAR & 6-QUEST CHECKPOINTS */}
      <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-900/95 dark:bg-slate-950 border border-slate-800 shadow-md relative overflow-hidden text-white">
        {/* Subtle decorative ambient glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header: Level Target & Remaining Info */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100">
                  Tiến Trình Thăng Cấp: {formatCareerRoleName(status.currentRole)} ➔{' '}
                  {formatCareerRoleName(status.targetRole)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tabular-nums bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  {passedQuestsCount}/6 ải ({xpPercent}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                {passedQuestsCount === 6 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Xuất sắc vượt qua toàn bộ 6 ải! Sẵn sàng duyệt thăng hạng.
                  </span>
                ) : (
                  <span>
                    Còn thiếu <strong className="text-amber-400 font-bold">{6 - passedQuestsCount} ải</strong> để nhận
                    danh hiệu{' '}
                    <strong className="text-white font-bold">{formatCareerRoleName(status.targetRole)}</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          {earnings?.incomeGain ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 self-start md:self-auto shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <div className="text-left md:text-right">
                <div className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">
                  Thu nhập tạm tính tăng thêm
                </div>
                <div className="text-xs font-black text-emerald-400 tabular-nums">
                  +{formatVnd(earnings.incomeGain)}/tháng
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* 6-Segment XP Bar */}
        <div className="relative z-10 pt-3 pb-3">
          <div className="grid grid-cols-6 gap-1.5 h-2.5 rounded-full bg-slate-800/80 p-0.5 border border-white/10">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isPassed = idx < passedQuestsCount;
              return (
                <div
                  key={idx}
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPassed
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                      : 'bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* 6 Clean Quest Status Cards */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Card 1: 300 Ca / 3 Tháng */}
          <div
            className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
              isOrdersPassed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1">
                <span>🎯</span>
                <span className="text-[11px]">Sản Lượng</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">3 Tháng</span>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-black tabular-nums text-white">
                  {metrics.ordersCount || 0} <span className="text-[10px] font-normal text-slate-400">/ 300 ca</span>
                </div>
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    isOrdersPassed ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {ordersProgressPercent}%
                </span>
              </div>
              <Progress
                percent={ordersProgressPercent}
                size="small"
                showInfo={false}
                status={isOrdersPassed ? 'success' : 'normal'}
                className="m-0 mt-1.5"
              />
            </div>
            <div className="text-[10px] font-semibold flex items-center justify-between">
              {isOrdersPassed ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <span>✓</span> Đạt chuẩn
                </span>
              ) : (
                <span className="text-amber-400">Thiếu {ordersGap} ca</span>
              )}
            </div>
          </div>

          {/* Card 2: Fix < 2% */}
          <div
            className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
              isFixPassed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1">
                <span>🛡️</span>
                <span className="text-[11px]">Tỷ Lệ Fix</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">&lt; 2.0%</span>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-black tabular-nums text-white">
                  {Number(((metrics.fixRate || 0) * 100).toFixed(1))}%
                </div>
                <span
                  className={`text-[10px] font-bold tabular-nums ${isFixPassed ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {safetyShieldPercent}% an toàn
                </span>
              </div>
              <Progress
                percent={safetyShieldPercent}
                size="small"
                showInfo={false}
                status={isFixPassed ? 'success' : 'exception'}
                className="m-0 mt-1.5"
              />
            </div>
            <div className="text-[10px] font-semibold flex items-center justify-between">
              {isFixPassed ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <span>✓</span> An toàn
                </span>
              ) : (
                <span className="text-rose-400">Vượt ngưỡng 2%</span>
              )}
            </div>
          </div>

          {/* Card 3: Tip > 10% TB Shop */}
          <Tooltip
            title={`Tỷ lệ Tip: Shop trung bình ${shopTipRatePercent}%. Bạn cần thêm 10% của shop (+${shopBonusPercent}%), tức là cần đạt ≥ ${targetTipRatePercent}% để thăng cấp! Hiện tại: ${staffTipRatePercent}%.`}
          >
            <div
              className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between cursor-help ${
                isTipPassed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1">
                  <span>💖</span>
                  <span className="text-[11px]">Tỷ Lệ Tip</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">≥ {targetTipRatePercent}%</span>
              </div>
              <div className="my-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-black tabular-nums text-white">
                    {staffTipRatePercent}%{' '}
                    <span className="text-[10px] font-normal text-slate-400">
                      (
                      {staffTipRate >= shopTipRate
                        ? `+${Number(((staffTipRate - shopTipRate) * 100).toFixed(1))}%`
                        : `-${Number(((shopTipRate - staffTipRate) * 100).toFixed(1))}%`}{' '}
                      TB)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      isTipPassed ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {tipProgressPercent}%
                  </span>
                </div>
                <Progress
                  percent={tipProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isTipPassed ? 'success' : 'normal'}
                  className="m-0 mt-1.5"
                />
              </div>
              <div className="text-[10px] font-semibold flex items-center justify-between">
                {isTipPassed ? (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <span>✓</span> Đạt chuẩn
                  </span>
                ) : (
                  <span className="text-amber-400">Thiếu {tipGapPercent}%</span>
                )}
              </div>
            </div>
          </Tooltip>

          {/* Card 4: QA/QC Định Kỳ */}
          <div
            className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
              isQaPassed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1">
                <span>📋</span>
                <span className="text-[11px]">Kiểm Định QA</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">≥ {requiredQaAudits}L/3T</span>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-black tabular-nums text-white">
                  {totalQaAudits}{' '}
                  <span className="text-[10px] font-normal text-slate-400">/ {requiredQaAudits} lần (3T)</span>
                </div>
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    isQaPassed ? 'text-emerald-400' : hasFailedQa ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {qaProgressPercent}%
                </span>
              </div>
              <Progress
                percent={qaProgressPercent}
                size="small"
                showInfo={false}
                status={isQaPassed ? 'success' : hasFailedQa ? 'exception' : 'normal'}
                className="m-0 mt-1.5"
              />
            </div>
            <div className="text-[10px] font-semibold flex items-center justify-between">
              {isQaPassed ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <span>✓</span> Đạt chuẩn
                </span>
              ) : hasFailedQa ? (
                <span className="text-rose-400">Có bài Fail</span>
              ) : totalQaAudits === 0 ? (
                <span className="text-amber-400">Chưa kiểm định (0/{requiredQaAudits})</span>
              ) : (
                <span className="text-amber-400">Thiếu {requiredQaAudits - totalQaAudits} lần</span>
              )}
            </div>
          </div>

          {/* Card 5: Chỉ Số Hài Lòng HI */}
          <div
            className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
              isHiPassed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1">
                <span>😊</span>
                <span className="text-[11px]">Chỉ Số HI</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">&gt; 70%</span>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-black tabular-nums text-white">{hiPercent}%</div>
                <span
                  className={`text-[10px] font-bold tabular-nums ${isHiPassed ? 'text-emerald-400' : 'text-slate-400'}`}
                >
                  {hiProgressPercent}%
                </span>
              </div>
              <Progress
                percent={hiProgressPercent}
                size="small"
                showInfo={false}
                status={isHiPassed ? 'success' : 'normal'}
                className="m-0 mt-1.5"
              />
            </div>
            <div className="text-[10px] font-semibold flex items-center justify-between">
              {isHiPassed ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <span>✓</span> Hài lòng cao
                </span>
              ) : (
                <span className="text-amber-400">Thiếu {Math.max(0, 70 - hiPercent)}%</span>
              )}
            </div>
          </div>

          {/* Card 6: Chuối Yêu Thương (Check-in) */}
          <div
            className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
              isBananaPassed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1">
                <span>🍌</span>
                <span className="text-[11px]">Chuối Yêu Thương</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">≥ {minBananaCount}</span>
            </div>
            <div className="my-1.5">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-black tabular-nums text-white">
                  {bananaCount} <span className="text-[10px] font-normal text-slate-400">/ {minBananaCount} chuối</span>
                </div>
                <span
                  className={`text-[10px] font-bold tabular-nums ${
                    isBananaPassed ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {bananaProgressPercent}%
                </span>
              </div>
              <Progress
                percent={bananaProgressPercent}
                size="small"
                showInfo={false}
                status={isBananaPassed ? 'success' : 'normal'}
                className="m-0 mt-1.5"
              />
            </div>
            <div className="text-[10px] font-semibold flex items-center justify-between">
              {isBananaPassed ? (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <span>✓</span> Đã tích lũy
                </span>
              ) : (
                <span className="text-amber-400">Thiếu {Math.max(0, minBananaCount - bananaCount)} chuối</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 5 Gamified Quests + Interactive Radar & Sliders vs Earnings Reward */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Left column (7 cols): Quests & Radar What-If Simulation */}
        <div className="lg:col-span-7 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 m-0 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-rose-500" />
              Chi Tiết 6 Ải Cốt Lõi Nâng Cấp CV ➔ CV+ (90 Ngày)
            </h4>
            <span className="text-[11px] text-slate-400 tabular-nums font-semibold">
              Kèm kiểm định QA/QC &amp; Chuối thưởng
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Quest 1: 300 bộ mi / 3 tháng */}
            <div
              className={`min-w-0 p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isOrdersPassed
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-xs'
                  : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    🎯 1. 300 bộ mi / 3 tháng
                  </span>
                  {isOrdersPassed ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ĐẠT
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> CẦN THÊM
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                    {metrics.ordersCount}{' '}
                    <span className="text-xs font-normal text-slate-400">/ {cvReq.minOrders || 300} ca</span>
                  </div>
                  <span className="text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                    {Math.round(((metrics.ordersCount || 0) / (cvReq.minOrders || 300)) * 100)}%
                  </span>
                </div>

                <Progress
                  percent={Math.min(100, Math.round(((metrics.ordersCount || 0) / (cvReq.minOrders || 300)) * 100))}
                  size="small"
                  showInfo={false}
                  status={isOrdersPassed ? 'success' : 'normal'}
                  className="m-0 mt-1.5"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span>{ordersGap === 0 ? '✓ Đã cán mốc tối thiểu' : `⚡ Còn thiếu ${ordersGap} ca nữa`}</span>
                <span className="tabular-nums">Mục tiêu: {cvReq.minOrders || 300} ca/90 ngày</span>
              </div>
            </div>

            {/* Quest 2: fix < 2% */}
            <div
              className={`min-w-0 p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isFixPassed
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-xs'
                  : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    🛡️ 2. Tỷ lệ Fix &lt; 2%
                  </span>
                  {isFixPassed ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> XUẤT SẮC
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> VƯỢT MỨC
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                    {((metrics.fixRate || 0) * 100).toFixed(1)}%{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (mục tiêu &lt; {((cvReq.maxFixRate || 0.02) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {safetyShieldPercent}% an toàn
                  </span>
                </div>

                <Progress
                  percent={safetyShieldPercent}
                  size="small"
                  showInfo={false}
                  status={isFixPassed ? 'success' : 'exception'}
                  className="m-0 mt-1.5"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span className="tabular-nums">
                  {metrics.fixCount || 0} ca sửa / {metrics.ordersCount || 0} ca mi
                </span>
                <span>Ngưỡng tối đa: &lt; {((cvReq.maxFixRate || 0.02) * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Quest 3: tip > 10% trung bình của shop */}
            <div
              className={`min-w-0 p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isTipPassed
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-xs'
                  : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    💖 3. Tip &gt; 10% TB Shop
                  </span>
                  {isTipPassed ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ĐẠT CHUẨN
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> CẦN THÊM
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                    {staffTipRatePercent}%{' '}
                    <span className="text-xs font-normal text-slate-400">(mục tiêu ≥ {targetTipRatePercent}%)</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                    {metrics.tippedOrdersCount || Math.round((metrics.ordersCount || 0) * (staffTipRate || 0))}/
                    {metrics.ordersCount || 0} ca có tip
                  </span>
                </div>

                <Progress
                  percent={tipProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isTipPassed ? 'success' : 'normal'}
                  className="m-0 mt-1.5"
                />

                {/* HỘP CÔNG THỨC RÕ RÀNG */}
                <div className="mt-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-[10px] leading-tight space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1 text-rose-500">💡 TB Shop + 10% của Shop</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                      ≥ {targetTipRatePercent}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      Shop: <strong className="text-slate-700 dark:text-slate-200">{shopTipRatePercent}%</strong>
                    </span>
                    <span>
                      +10%: <strong className="text-amber-600 dark:text-amber-400">+{shopBonusPercent}%</strong>
                    </span>
                    <span>
                      Chuẩn:{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                        ≥ {targetTipRatePercent}%
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span>
                  {isTipPassed ? `✓ Vượt chuẩn (+${tipExcessPercent}%)` : `⚡ Thiếu ${tipGapPercent}% để đạt chuẩn`}
                </span>
                <span className="tabular-nums">Tổng tip: {formatVnd(metrics.totalTip)}</span>
              </div>
            </div>

            {/* Quest 4: QA AC >= 1 lần/tuần */}
            <div
              className={`min-w-0 p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                hasFailedQa
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 shadow-xs'
                  : !isQaPassed
                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-xs'
                    : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    📋 4. QA/QC ≥ {requiredQaAudits} lần / 3 tháng
                  </span>
                  {hasFailedQa ? (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-black text-[11px] animate-pulse">
                      <XCircle className="w-3.5 h-3.5" /> FAILED
                    </span>
                  ) : !isQaPassed ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> {totalQaAudits === 0 ? 'CHƯA KIỂM ĐỊNH' : 'THIẾU LƯỢT'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ĐẠT CHUẨN
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                    {totalQaAudits}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {requiredQaAudits} lần (chuẩn ≥ {requiredQaAudits} lần/3T)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                    {totalQaAudits}/{requiredQaAudits} bài
                  </span>
                </div>

                <Progress
                  percent={qaProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isQaPassed ? 'success' : 'exception'}
                  className="m-0 mt-1.5"
                />

                <div className="mt-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-[10px] leading-tight space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>
                      Tác phong:{' '}
                      {(qaAudit?.totalAudits || 0) === 0 ? (
                        <strong className="text-slate-400">Chưa kiểm định</strong>
                      ) : !hasFailedQa ? (
                        <strong className="text-emerald-600">✓ Đạt chuẩn 5S</strong>
                      ) : (
                        <strong className="text-rose-500">Vi phạm</strong>
                      )}
                    </span>
                    <span>
                      Phòng mi:{' '}
                      {(qaAudit?.totalAudits || 0) === 0 ? (
                        <strong className="text-slate-400">Chưa kiểm định</strong>
                      ) : !hasFailedQa ? (
                        <strong className="text-emerald-600">✓ Sạch sẽ</strong>
                      ) : (
                        <strong className="text-rose-500">Chưa đạt</strong>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span>
                  {hasFailedQa
                    ? 'Bị khóa do có bài FAILED'
                    : isQaPassed
                      ? '✓ Đạt định kỳ tác phong & phòng mi'
                      : (qaAudit?.totalAudits || 0) === 0
                        ? 'Hệ thống chưa ghi nhận biên bản QA/QC (0 lần/tuần)'
                        : 'Chưa đủ tối thiểu 1 lần/tuần'}
                </span>
                <span>
                  {(qaAudit?.totalAudits || 0) === 0 ? '0 bài kiểm định' : `${qaAudit?.failedAudits ?? 0} bài Failed`}
                </span>
              </div>
            </div>

            {/* Quest 5: HI > 70% */}
            <div
              className={`min-w-0 p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isHiPassed
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-xs'
                  : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    😊 5. Chỉ số HI &gt; 70%
                  </span>
                  {isHiPassed ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> YÊU QUÝ
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> CẦN NÂNG CAO
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                    {hiPercent}%{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (chuẩn &gt; {((cvReq.minHappinessIndex || 0.7) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-pink-500 tabular-nums">Khách thả tim</span>
                </div>

                <Progress
                  percent={Math.min(100, Math.round((happinessIndex / (cvReq.minHappinessIndex || 0.7)) * 100))}
                  size="small"
                  showInfo={false}
                  status={isHiPassed ? 'success' : 'normal'}
                  className="m-0 mt-1.5"
                />

                <div className="mt-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-[10px] leading-tight space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>
                      Đánh giá tại chỗ: <strong className="text-emerald-600 font-bold">Rất hài lòng</strong>
                    </span>
                    <span>
                      Thả tim: <strong className="text-pink-500 font-bold">{hiPercent}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span>
                  {isHiPassed ? '✓ Đạt ngưỡng tín nhiệm yêu quý' : '⚡ Cần chăm sóc trải nghiệm khách kỹ hơn'}
                </span>
                <span>Mục tiêu: &gt; {((cvReq.minHappinessIndex || 0.7) * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* Quest 6: Chuối Yêu Thương (Check-in) >= 45 (15 * 3 = 45 / 90 ngày) */}
            <div
              className={`min-w-0 p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isBananaPassed
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-xs'
                  : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    🍌 6. Chuối Yêu Thương ≥ {minBananaCount}
                  </span>
                  {isBananaPassed ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ĐẠT CHUẨN
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" /> CHƯA ĐỦ CHUỐI
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <div className="text-lg font-black text-amber-500 dark:text-amber-400 tabular-nums">
                    {bananaCount} 🍌{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (chuẩn ≥ {minBananaCount} Chuối / 90 ngày)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    15 Chuối / Tháng
                  </span>
                </div>

                <Progress
                  percent={bananaProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isBananaPassed ? 'success' : 'normal'}
                  className="m-0 mt-1.5"
                />

                <div className="mt-2.5 p-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-[10px] leading-tight space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>
                      Thiên thần khác tặng: <strong className="text-amber-600 font-bold">{bananaCount} Chuối</strong>
                    </span>
                    <span>
                      Đồng đội quý mến:{' '}
                      <strong className="text-emerald-600 font-bold">
                        {bananaCount >= minBananaCount
                          ? 'Rất cao (≥ 45)'
                          : bananaCount >= 15
                            ? 'Đang tích cực'
                            : 'Cần gắn kết'}
                      </strong>
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 italic">
                    * Chỉ đếm chuối từ thiên thần khác tặng lúc check-in (loại trừ tự tặng &amp; checkout)
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                <span className="truncate">
                  {isBananaPassed
                    ? `✓ Đạt chuẩn ≥ ${minBananaCount} chuối trong 90 ngày`
                    : `⚡ Còn thiếu ${Math.max(0, minBananaCount - bananaCount)} chuối trong 90 ngày`}
                </span>
                <span className="shrink-0 font-semibold">90N ≥ {minBananaCount}</span>
              </div>
            </div>
          </div>

          {/* Interactive RPG Stat Radar Chart & What-If Simulation Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Mô Phỏng Tăng Tốc Kéo Số & Radar Kỹ Năng RPG
              </div>
              <span className="text-[10px] text-slate-400 italic">
                Kéo thanh trượt để xem biểu đồ và điều kiện thăng hạng cập nhật tức thì
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              {/* Sliders (7 cols) */}
              <div className="md:col-span-7 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span className="font-medium">Mục tiêu số ca mi:</span>
                    <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400">
                      {sliderOrders} ca mi / 3 tháng{' '}
                      {sliderOrders >= cvReq.minOrders ? (
                        <span className="text-emerald-500 font-bold text-[10px]">(Đủ Ải ✓)</span>
                      ) : (
                        <span className="text-amber-500 font-bold text-[10px]">
                          (Thiếu {cvReq.minOrders - sliderOrders} ca)
                        </span>
                      )}
                    </span>
                  </div>
                  <Slider min={50} max={500} value={sliderOrders} onChange={setSliderOrders} className="m-0" />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                    <span className="font-medium">Mục tiêu chốt combo dưỡng mi:</span>
                    <span className="font-bold tabular-nums text-purple-600 dark:text-purple-400">
                      {sliderCombo}%{' '}
                      {sliderCombo >= cvReq.minSelfComboRate * 100 ? (
                        <span className="text-emerald-500 font-bold text-[10px]">(Đủ Ải ✓)</span>
                      ) : (
                        <span className="text-amber-500 font-bold text-[10px]">
                          (Cần ≥ {(cvReq.minSelfComboRate * 100).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <Slider min={0} max={60} value={sliderCombo} onChange={setSliderCombo} className="m-0" />
                </div>

                {/* Live What-If Achievement Banner */}
                <div
                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                    isSimAllPassed
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    {isSimAllPassed ? (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span>🎉 Mục tiêu đạt 6/6 ải: Mở khóa thăng cấp ngay lập tức!</span>
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 text-amber-500" />
                        <span>
                          Mục tiêu đạt {simPassedCount}/6 ải (cần thêm {6 - simPassedCount} ải nữa để mở khóa)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* RPG Stat Radar Chart (5 cols) */}
              <div className="md:col-span-5 flex justify-center bg-white/70 dark:bg-slate-900/60 rounded-xl p-2 border border-slate-100 dark:border-slate-800/80 shadow-inner">
                <StatRadarChart
                  actualScores={radarActualScores}
                  targetScores={radarTargetScores}
                  simulatedScores={radarSimulatedScores}
                  qaLabel={requiredQaAudits > 0 ? `QA ≥ ${requiredQaAudits}L/3T` : 'QA (Miễn)'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right column (5 cols): Live Earnings Impact Simulation (Loot & Rewards) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-rose-50 to-amber-50/50 dark:from-slate-800/90 dark:to-slate-800/50 rounded-2xl p-4 sm:p-5 border border-rose-100 dark:border-slate-700/60 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 m-0 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Mô Phỏng Thu Nhập Thực Tế
              </h4>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-200/70 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-extrabold shadow-2xs">
                Ước tính hàng tháng
              </span>
            </div>

            {earnings && (
              <div className="space-y-3.5">
                {/* Visual Comparative Income Bars */}
                <div className="space-y-2.5 p-3 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800">
                  {/* Current Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Hiện tại ({formatCareerRoleName(status.currentRole)}):
                      </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
                        {formatVnd(earnings.currentEstimatedIncome)}
                      </span>
                    </div>
                    <Progress
                      percent={Math.min(
                        100,
                        Math.round((earnings.currentEstimatedIncome / (earnings.nextTierEstimatedIncome || 1)) * 100)
                      )}
                      size="small"
                      showInfo={false}
                      status="normal"
                      className="m-0"
                    />
                  </div>

                  {/* Promoted Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Khi thăng cấp ({formatCareerRoleName(status.targetRole)}
                        ):
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                        {formatVnd(earnings.nextTierEstimatedIncome)}
                      </span>
                    </div>
                    <Progress percent={100} size="small" showInfo={false} status="success" className="m-0" />
                  </div>

                  {/* Gain Callout Badge */}
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Tăng thêm thực nhận:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-black tabular-nums">
                      + Thêm {formatVnd(earnings.incomeGain)}/tháng (
                      {Math.round((earnings.incomeGain / (earnings.currentEstimatedIncome || 1)) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Level Up Perk Tiers - Chi tiết số tiền tăng thêm mỗi tháng */}
                <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 space-y-2.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                      <Award className="w-3.5 h-3.5" /> Đặc quyền đãi ngộ khi lên{' '}
                      {formatCareerRoleName(status.targetRole)}:
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Nhận thêm mỗi tháng</span>
                  </div>

                  {/* 1. Lương theo giờ */}
                  <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                        <span>🕒 Lương theo giờ:</span>
                        <span className="font-normal text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatVnd(earnings.details.hourlyWageCurrent)} ➔{' '}
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {formatVnd(earnings.details.hourlyWageNext)}
                          </strong>{' '}
                          <span className="text-[10px] text-emerald-600 font-normal">(+2.000đ/h)</span>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black tabular-nums text-xs">
                        +{formatVnd(wageGain)}/tháng
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      * Dựa trên {earnings.details.actualWorkingHours || earnings.details.monthlyEstimatedHours || 260}h
                      công thực tế tháng qua của {status.staffName} (+2.000đ ×{' '}
                      {earnings.details.actualWorkingHours || earnings.details.monthlyEstimatedHours || 260}h)
                    </div>
                  </div>

                  {/* 2. Tiền tip khách */}
                  <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                        <span>💎 Chia tiền tip khách:</span>
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {status.currentRole === 'CV' ? (
                            <>
                              70% ➔ <strong className="text-emerald-600 dark:text-emerald-400 font-bold">90%</strong>{' '}
                              <span className="text-[10px] text-emerald-600 font-normal">(Hưởng trọn)</span>
                            </>
                          ) : (
                            '90% + Tip tư vấn sảnh'
                          )}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black tabular-nums text-xs">
                        +{formatVnd(tipGain)}/tháng
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      * Hưởng trọn 90% tip (tăng thêm +20% trên tổng tip{' '}
                      {formatVnd(
                        earnings.details.customerTotalTip ||
                          Math.round((earnings.details.actualTipReceived || earnings.details.monthlyTipAvg || 0) / 0.7)
                      )}
                      /tháng của khách)
                    </div>
                  </div>

                  {/* 3. Hoa hồng combo */}
                  <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                        <span>🏹 Hoa hồng combo:</span>
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {status.currentRole === 'CV' ? (
                            <>
                              0% ➔ <strong className="text-emerald-600 dark:text-emerald-400 font-bold">2.5%</strong>{' '}
                              <span className="text-[10px] text-emerald-600 font-normal">(Doanh thu)</span>
                            </>
                          ) : (
                            '2.5% + Thưởng vượt mốc'
                          )}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black tabular-nums text-xs">
                        +{formatVnd(comboGain)}/tháng
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center justify-between">
                      <span>
                        * Dự đoán tự tư vấn ~{earnings.details.predictedComboCount || 6} combo/tháng (~10% số ca) mang
                        về +{formatVnd(comboGain)}/tháng
                      </span>
                      {sliderCombo > 0 && (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          (Kéo test {sliderCombo}% combo: +
                          {formatVnd(Math.round((sliderOrders / 3) * (sliderCombo / 100) * 650000 * 0.025))}/tháng)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary Total Gain */}
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-extrabold text-emerald-800 dark:text-emerald-200 uppercase tracking-tight text-[11px]">
                        Tổng cộng nhận thêm:
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{formatVnd(earnings.incomeGain)}/tháng
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                        (+{Math.round((earnings.incomeGain / (earnings.currentEstimatedIncome || 1)) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-rose-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center justify-between">
            <span>
              * Số liệu tính toán dựa trên giờ công &amp; tip thực tế tháng trước của {status.staffName} tại tiệm.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
