'use client';

import React from 'react';
import { Slider, Progress, Tooltip, Avatar, Segmented, ConfigProvider, Popconfirm } from 'antd';
import {
  Sparkles,
  Trophy,
  CheckCircle2,
  Check,
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
  Crown,
  Clock,
  Gem,
  Users,
  ShieldAlert,
  LayoutGrid,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Filter,
  Eye,
  Bug,
  HandCoins,
  Heart,
  ArrowDownCircle,
} from 'lucide-react';
import { StatusTag } from '../../../../components/ui';
import {
  type StaffCareerStatus,
  type CareerProgressionConfig,
  type CvPlusRewardSnapshot,
  type BananaTransactionCategory,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { formatCareerRoleName, calculateComboBonus } from '../career-path.constants';
import { WingRoleLabel } from './IslandGameIcon';

interface RealStaffSimulationCardProps {
  status: StaffCareerStatus | null;
  config: CareerProgressionConfig;
  sliderOrders: number;
  setSliderOrders: (val: number) => void;
  sliderCombo: number;
  setSliderCombo: (val: number) => void;
  onActivateTrial?: () => void;
  onPromote?: () => void;
  onDemote?: () => void;
  onSetRole?: (newRole: 'CV' | 'CV_PLUS' | 'CV_PLUS_PLUS') => void;
  onSwitchSpecialist?: () => void;
  loadingAction?: boolean;
  simulationTarget?: 'CV_PLUS' | 'CV_PLUS_PLUS';
  onSimulationTargetChange?: (target: 'CV_PLUS' | 'CV_PLUS_PLUS') => void;
  onOpenBananaDrawer?: (category: BananaTransactionCategory) => void;
}

interface StatRadarChartProps {
  actualScores: number[]; // [orders, fix, tip, qa, hi, banana]
  targetScores: number[]; // [1, 1, 1, 1, 1, 1]
  simulatedScores: number[]; // [simOrders, fix, tip, qa, hi, banana]
  qaLabel?: string;
  customAxes?: Array<{ label: string; icon: string; name?: string; isPassed?: boolean }>;
  passedAxes?: boolean[];
  activeNodeIndex?: number;
  onSelectNode?: (index: number) => void;
}

/**
 * Render icon đồng bộ cho 6 ải / 6 đỉnh Radar Career Path:
 * 0: Eye (Sản lượng bộ mi)
 * 1: Bug (Tỷ lệ bảo hành / sửa mi)
 * 2: HandCoins (Tỷ lệ tip - bàn tay nâng tiền boa)
 * 3: ShieldCheck (Kiểm định QA/QC)
 * 4: Heart (Teamwork HI Thả tim)
 * 5: 🍌 (Chuối Yêu Thương)
 */
export const renderCareerNodeIcon = (index: number, className = 'w-4 h-4 shrink-0', bananaSizeClass = 'text-xs') => {
  switch (index) {
    case 0:
      return <Eye className={className} />;
    case 1:
      return <Bug className={className} />;
    case 2:
      return <HandCoins className={className} />;
    case 3:
      return <ShieldCheck className={className} />;
    case 4:
      return <Heart className={`${className} fill-current/20`} />;
    case 5:
    default:
      return <span className={`${bananaSizeClass} shrink-0 select-none`}>🍌</span>;
  }
};

const renderRadarAxisIcon = (index: number, isActive: boolean, isPassed: boolean) => {
  const iconColorClass = isActive
    ? 'text-white'
    : isPassed
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-rose-600 dark:text-rose-400';

  switch (index) {
    case 0:
      return <Eye size={12} strokeWidth={2.5} className={iconColorClass} />;
    case 1:
      return <Bug size={12} strokeWidth={2.5} className={iconColorClass} />;
    case 2:
      return <HandCoins size={12} strokeWidth={2.5} className={iconColorClass} />;
    case 3:
      return <ShieldCheck size={12} strokeWidth={2.5} className={iconColorClass} />;
    case 4:
      return <Heart size={12} strokeWidth={2.5} className={`${iconColorClass} fill-current/20`} />;
    case 5:
    default:
      return null;
  }
};

/**
 * Biểu đồ Radar RPG 6 Cánh - Hiển thị 6 chỉ số thăng hạng CV -> CV+ của Kỹ thuật viên
 * Thiết kế vuông vức (aspect-square), full-width trên mobile, hỗ trợ chạm trực tiếp vào từng đỉnh
 */
const StatRadarChart: React.FC<StatRadarChartProps> = ({
  actualScores,
  targetScores,
  simulatedScores,
  qaLabel,
  customAxes,
  passedAxes,
  activeNodeIndex = 0,
  onSelectNode,
}) => {
  const cx = 230;
  const cy = 170;
  const R = 74;
  const defaultAxes: Array<{ label: string; icon: string; name?: string; isPassed?: boolean }> = [
    { label: '300 Ca/3T', icon: '👁️', name: 'Bộ mi' },
    { label: 'Fix < 2%', icon: '🐛', name: 'Bảo hành' },
    { label: 'Tip > 10% Shop', icon: '🪙', name: 'Tỷ lệ Tip' },
    { label: qaLabel || 'QA ≥ 12L/3T', icon: '🛡️', name: 'Kiểm định QA' },
    { label: 'HI > 70%', icon: '💖', name: 'Teamwork HI' },
    { label: 'Chuối ≥ 45/90N', icon: '🍌', name: 'Chuối Yêu Thương' },
  ];
  const axes = customAxes && customAxes.length === 6 ? customAxes : defaultAxes;

  const getPoints = (scores: number[]) => {
    return scores
      .map((score, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
        const r = R * Math.max(0, Math.min(1.18, score));
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
    <div className="relative flex flex-col items-center select-none w-full max-w-[390px] aspect-[460/340] mx-auto">
      <svg viewBox="0 0 460 340" className="w-full h-full overflow-visible touch-manipulation drop-shadow-sm">
        <defs>
          {/* Glow filter for active vertex */}
          <filter id="activeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Grid Polygons */}
        {[0.25, 0.5, 0.75, 1.0].map((level) => (
          <polygon
            key={level}
            points={getGridPoints(level)}
            strokeWidth={level === 1.0 ? '1.5' : '1'}
            strokeDasharray={level === 1.0 ? 'none' : '3,3'}
            className={
              level === 1.0
                ? 'fill-slate-500/5 dark:fill-slate-400/5 stroke-slate-300 dark:stroke-slate-700/80'
                : 'fill-none stroke-slate-200 dark:stroke-slate-800'
            }
          />
        ))}

        {/* 6 Axis Spoke Lines from Center (cx, cy) to Outer Rim */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
          const x = cx + R * Math.cos(angle);
          const y = cy + R * Math.sin(angle);
          const isActive = activeNodeIndex === i;
          const isPassedAxis = axes[i]?.isPassed ?? passedAxes?.[i] ?? false;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              className={
                isActive
                  ? isPassedAxis
                    ? 'stroke-emerald-400 dark:stroke-emerald-400'
                    : 'stroke-rose-400 dark:stroke-rose-400'
                  : 'stroke-slate-300 dark:stroke-slate-700/80'
              }
              strokeWidth={isActive ? '2' : '1'}
              strokeDasharray={isActive ? 'none' : '3,3'}
            />
          );
        })}

        {/* Center Hub / Origin Anchor */}
        <circle
          cx={cx}
          cy={cy}
          r="4"
          className="fill-slate-400 dark:fill-slate-600 stroke-2 stroke-white dark:stroke-slate-900 shadow-sm"
        />

        {/* Target 100% Polygon (Gold Dashed) */}
        <polygon
          points={targetPoints}
          strokeWidth="1.5"
          strokeDasharray="4,4"
          className="fill-none stroke-amber-500/80 dark:stroke-amber-400/80"
        />

        {/* Simulated Polygon (Emerald dashed glow) */}
        <polygon
          points={simulatedPoints}
          strokeWidth="2.5"
          strokeDasharray="5,3"
          className="fill-emerald-500/20 stroke-emerald-500 transition-all duration-300"
        />

        {/* Actual Staff Polygon (Rose/Purple gradient filled) */}
        <polygon
          points={actualPoints}
          strokeWidth="2.5"
          className="fill-rose-500/25 stroke-rose-500 transition-all duration-300 drop-shadow-sm"
        />

        {/* Stat Vertex Dots and Interactive Touch Nodes */}
        {axes.map((axis, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
          const isActive = activeNodeIndex === i;
          const isPassed = axis.isPassed ?? passedAxes?.[i] ?? simulatedScores[i] >= (targetScores[i] || 1.0);

          // Vị trí và kích thước nhãn pill chuẩn xác (Zero Overlay Guarantee & Pixel-Perfect Alignment)
          let pillWidth = 112;
          let pillLeft = 0;
          let ly = cy;

          if (i === 0) {
            // Đỉnh 0: Trên cùng (Bộ mi)
            pillWidth = isPassed ? 106 : 98;
            pillLeft = cx - pillWidth / 2;
            ly = 20;
          } else if (i === 3) {
            // Đỉnh 3: Dưới cùng (QA)
            pillWidth = isPassed ? 112 : 104;
            pillLeft = cx - pillWidth / 2;
            ly = 320;
          } else if (i === 1) {
            // Đỉnh 1: Phía trên bên phải (Fix mi) -> neo lề phải x = 452 (mép trái x = 340, cách đỉnh > 34px)
            pillWidth = 112;
            pillLeft = 452 - pillWidth;
            ly = 110;
          } else if (i === 2) {
            // Đỉnh 2: Phía dưới bên phải (Tip) -> neo lề phải x = 452 (mép trái x = 340, cách đỉnh > 34px)
            pillWidth = 112;
            pillLeft = 452 - pillWidth;
            ly = 230;
          } else if (i === 4) {
            // Đỉnh 4: Phía dưới bên trái (HI) -> neo lề trái x = 8 (mép phải x = 120, cách đỉnh > 34px)
            pillWidth = 112;
            pillLeft = 8;
            ly = 230;
          } else if (i === 5) {
            // Đỉnh 5: Phía trên bên trái (Chuối) -> neo lề trái x = 8 (mép phải x = 120, cách đỉnh > 34px)
            pillWidth = 112;
            pillLeft = 8;
            ly = 110;
          }

          const pillHeight = 22;
          const pillTop = ly - pillHeight / 2;
          const pillRight = pillLeft + pillWidth;

          // Tọa độ đỉnh thực tế & dự phóng (chuẩn tâm cx, cy khi score = 0)
          const actualR = R * Math.max(0, Math.min(1.18, actualScores[i]));
          const adx = cx + actualR * Math.cos(angle);
          const ady = cy + actualR * Math.sin(angle);

          const simR = R * Math.max(0, Math.min(1.18, simulatedScores[i]));
          const sdx = cx + simR * Math.cos(angle);
          const sdy = cy + simR * Math.sin(angle);

          // Tọa độ các thành phần bên trong pill (tách riêng emoji, text, checkmark để không bị lệch)
          const iconX = pillLeft + 13;
          const checkX = pillRight - 11;
          const textCenterX = isPassed ? (pillLeft + 24 + pillRight - 20) / 2 : (pillLeft + 24 + pillRight - 8) / 2;

          return (
            <g
              key={i}
              className="cursor-pointer group select-none transition-transform active:scale-95"
              onClick={() => onSelectNode?.(i)}
            >
              {/* Invisible large touch target area for easy mobile tapping */}
              <circle cx={pillLeft + pillWidth / 2} cy={ly} r="32" className="fill-transparent" />
              <circle cx={cx + R * Math.cos(angle)} cy={cy + R * Math.sin(angle)} r="28" className="fill-transparent" />

              {/* Active vertex glowing beacon */}
              {isActive && (
                <>
                  <circle
                    cx={sdx}
                    cy={sdy}
                    r="12"
                    className="fill-emerald-500/25 stroke-2 stroke-emerald-400 animate-pulse pointer-events-none"
                  />
                  <circle
                    cx={adx}
                    cy={ady}
                    r="10"
                    className={`${
                      isPassed
                        ? 'fill-emerald-500/25 stroke-2 stroke-emerald-400'
                        : 'fill-rose-500/30 stroke-2 stroke-rose-400'
                    } animate-pulse pointer-events-none`}
                  />
                </>
              )}

              {/* Simulated Dot (ẩn khi r = 0 để không đè lên Center Hub) */}
              {simR > 2 && (
                <circle
                  cx={sdx}
                  cy={sdy}
                  r={isActive ? '5' : '3.5'}
                  className="fill-emerald-400 stroke-2 stroke-white dark:stroke-slate-900 transition-all duration-200"
                />
              )}

              {/* Actual Dot (ẩn khi r = 0 để không đè lên Center Hub) */}
              {actualR > 2 && (
                <circle
                  cx={adx}
                  cy={ady}
                  r={isActive ? '5.5' : '4'}
                  className="fill-rose-500 stroke-2 stroke-white dark:stroke-slate-900 drop-shadow transition-all duration-200"
                />
              )}

              {/* Active pill glowing halo */}
              {isActive && (
                <rect
                  x={pillLeft - 2}
                  y={pillTop - 2}
                  width={pillWidth + 4}
                  height={pillHeight + 4}
                  rx="13"
                  className={`fill-none stroke-2 ${
                    isPassed ? 'stroke-emerald-400/70' : 'stroke-rose-400/70'
                  } animate-pulse pointer-events-none`}
                />
              )}

              {/* Label Pill Container */}
              <rect
                x={pillLeft}
                y={pillTop}
                width={pillWidth}
                height={pillHeight}
                rx="11"
                className={`transition-all duration-200 ${
                  isActive
                    ? isPassed
                      ? 'fill-emerald-600 stroke-2 stroke-white dark:stroke-slate-900 shadow-md'
                      : 'fill-rose-600 stroke-2 stroke-white dark:stroke-slate-900 shadow-md'
                    : isPassed
                      ? 'fill-emerald-50/95 dark:fill-emerald-950/60 stroke stroke-emerald-500/50 dark:stroke-emerald-500/40 group-hover:fill-emerald-100/90 dark:group-hover:fill-emerald-900/40 group-hover:stroke-emerald-400'
                      : 'fill-white/95 dark:fill-slate-800/95 stroke stroke-slate-200/90 dark:stroke-slate-700/90 group-hover:fill-rose-50 dark:group-hover:fill-rose-950/40 group-hover:stroke-rose-300'
                }`}
              />

              {/* Icon (Vector Lucide icon cho đỉnh 0..4, 🍌 cho đỉnh 5) */}
              {i === 5 ? (
                <text
                  x={iconX}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[11px] select-none pointer-events-none"
                >
                  🍌
                </text>
              ) : i < 5 ? (
                <g transform={`translate(${iconX - 6}, ${ly - 6})`} className="pointer-events-none select-none">
                  {renderRadarAxisIcon(i, isActive, isPassed)}
                </g>
              ) : (
                <text
                  x={iconX}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[11px] select-none pointer-events-none"
                >
                  {axis.icon}
                </text>
              )}

              {/* Label text (Căn giữa hoàn hảo trong khoảng không gian giữa Icon và Checkmark) */}
              <text
                x={textCenterX}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                className={`text-[9px] font-bold tracking-tight select-none pointer-events-none transition-colors ${
                  isActive
                    ? 'fill-white'
                    : isPassed
                      ? 'fill-emerald-800 dark:fill-emerald-300 group-hover:fill-emerald-600 dark:group-hover:fill-emerald-400'
                      : 'fill-slate-700 dark:fill-slate-200 group-hover:fill-rose-600 dark:group-hover:fill-rose-400'
                }`}
              >
                {axis.label}
              </text>

              {/* Pass Checkmark ✓ (Căn lề phải cố định, cách mép 11px sắc nét) */}
              {isPassed && (
                <text
                  x={checkX}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`text-[10px] font-black select-none pointer-events-none ${
                    isActive ? 'fill-white' : 'fill-emerald-600 dark:fill-emerald-400 group-hover:fill-emerald-500'
                  }`}
                >
                  ✓
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend & Tap hint */}
      <div className="flex items-center justify-between w-full px-1 sm:px-2 mt-1 text-[10px] sm:text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 flex-wrap gap-y-1">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="flex items-center gap-1 text-rose-500 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Thực tế
          </span>
          <span className="flex items-center gap-1 text-amber-500 font-bold">
            <span className="w-2.5 h-0.5 border-b border-amber-500 border-dashed" /> Chuẩn
          </span>
          <span className="flex items-center gap-1 text-emerald-500 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Dự phóng
          </span>
        </div>
        <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold flex items-center gap-0.5">
          <span>👆 Chạm đỉnh để chỉnh</span>
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
  onDemote,
  onSetRole,
  onSwitchSpecialist,
  loadingAction,
  simulationTarget,
  onSimulationTargetChange,
  onOpenBananaDrawer,
}) => {
  const isTargetCvPlusPlus = (simulationTarget || status?.targetRole) === 'CV_PLUS_PLUS';
  const targetReq = isTargetCvPlusPlus
    ? config.cvPlusToCvPlusPlus || {
        minMonthsInCvPlus: 2,
        minOrders: 350,
        maxFixRate: 0.015,
        minTipRatioAboveShop: 0.15,
        minBananaCount: 60,
        minHappinessIndex: 0.8,
        crossConsultCommissionRate: 0.025,
        maxDisciplinaryViolations: 0,
        minWeeklyQaAudits: 1,
        minQaAudits: 12,
        requireZeroFailedAudits: true,
        trialDurationDays: 30,
        allowSelfConsultTrial: true,
        minSelfComboRate: 0.3,
        expectedSerumsPerWeek: 4,
        expectedCombosPerMonth: 10,
        serumOriginalPriceBonus: 100000,
        serumDiscountedPriceBonus: 50000,
        comboUnder2mBonus: 50000,
        comboUnder3mBonus: 100000,
        comboUnder4mBonus: 150000,
        comboStepPerMillionBonus: 50000,
        crossConsultCvShareRate: 0.2,
      }
    : config.cvToCvPlus ||
      config.cvToCc || {
        minOrders: 300,
        minConsecutiveMonths: 3,
        minTipRatioAboveShop: 0.1,
        maxFixRate: 0.02,
        minHappinessIndex: 0.7,
        minBananaCount: 45,
        maxDisciplinaryViolations: 0,
        minWeeklyQaAudits: 1,
        minQaAudits: 12,
        requireZeroFailedAudits: true,
        trialDurationDays: 30,
        minSelfComboRate: 0.2,
        allowSelfConsultTrial: true,
        expectedSerumsPerWeek: 4,
        expectedCombosPerMonth: 6,
        serumOriginalPriceBonus: 100000,
        serumDiscountedPriceBonus: 50000,
        comboUnder2mBonus: 50000,
        comboUnder3mBonus: 100000,
        comboUnder4mBonus: 150000,
        comboStepPerMillionBonus: 50000,
      };

  const cvReq = targetReq;
  const earnings = status?.earningsSimulation;

  // Dự kiến mỗi tuần bán dưỡng mi (Ưu tiên cấu hình Danny từ cvReq hoặc thanh trượt)
  const defaultSerums = cvReq.expectedSerumsPerWeek ?? earnings?.details?.expectedSerumsPerWeek ?? 4;
  const [sliderSerums, setSliderSerums] = React.useState<number>(defaultSerums);

  React.useEffect(() => {
    if (typeof cvReq.expectedSerumsPerWeek === 'number') {
      setSliderSerums(cvReq.expectedSerumsPerWeek);
    } else if (typeof earnings?.details?.expectedSerumsPerWeek === 'number') {
      setSliderSerums(earnings.details.expectedSerumsPerWeek);
    }
  }, [cvReq.expectedSerumsPerWeek, earnings?.details?.expectedSerumsPerWeek]);

  // Dự kiến số combo cá nhân bán mỗi tháng (Ưu tiên cấu hình Danny từ cvReq)
  const defaultCombos =
    cvReq.expectedCombosPerMonth ?? earnings?.details?.expectedCombosPerMonth ?? (isTargetCvPlusPlus ? 10 : 8);
  const [sliderCombos, setSliderCombos] = React.useState<number>(defaultCombos);

  React.useEffect(() => {
    if (typeof cvReq.expectedCombosPerMonth === 'number') {
      setSliderCombos(cvReq.expectedCombosPerMonth);
    } else if (typeof earnings?.details?.expectedCombosPerMonth === 'number') {
      setSliderCombos(earnings.details.expectedCombosPerMonth);
    }
  }, [cvReq.expectedCombosPerMonth, earnings?.details?.expectedCombosPerMonth]);

  // Dự kiến số ca bán chéo / tư vấn chéo (lên đến 300 ca/tháng theo yêu cầu Danny)
  const defaultCrossOrders =
    earnings?.details?.expectedCrossConsultOrdersPerMonth ??
    (targetReq as any).expectedCrossConsultOrdersPerMonth ??
    20;
  const [sliderCrossOrders, setSliderCrossOrders] = React.useState<number>(defaultCrossOrders);
  const [gateViewMode, setGateViewMode] = React.useState<'simple' | 'expanded'>('simple');
  const [expandedGates, setExpandedGates] = React.useState<number[]>([]);
  const [gateFilter, setGateFilter] = React.useState<'ALL' | 'UNPASSED' | 'PASSED'>('ALL');

  // Selected Radar Node for Interactive Slider Editing (0: Orders, 1: Fix, 2: Tip, 3: QA, 4: HI, 5: Banana)
  const [selectedRadarNode, setSelectedRadarNode] = React.useState<number>(0);
  const [isExtraPerksExpanded, setIsExtraPerksExpanded] = React.useState<boolean>(false);

  // Dynamic What-If Sliders for Nodes 1..5 (Declared unconditionally at top of component)
  const [sliderFixRate, setSliderFixRate] = React.useState<number>(1.2);
  const [sliderTipRate, setSliderTipRate] = React.useState<number>(48.5);
  const [sliderQaAudits, setSliderQaAudits] = React.useState<number>(12);
  const [sliderHappinessIndex, setSliderHappinessIndex] = React.useState<number>(85);
  const [sliderBananaCount, setSliderBananaCount] = React.useState<number>(45);

  // Dữ liệu đối soát thực tế CV+ từ Backend Fastify (Single Source of Truth)
  const [cvPlusSnapshot, setCvPlusSnapshot] = React.useState<CvPlusRewardSnapshot | null>(null);
  const [isLoadingCvPlus, setIsLoadingCvPlus] = React.useState<boolean>(false);
  const [isComboDetailsExpanded, setIsComboDetailsExpanded] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!status?.staffId) {
      setCvPlusSnapshot(null);
      return;
    }
    let isCancelled = false;
    setIsLoadingCvPlus(true);
    apiClient.career
      .getCvPlusRewards(status.staffId)
      .then((res) => {
        if (!isCancelled && res) {
          setCvPlusSnapshot(res);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch CV+ snapshot:', err);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingCvPlus(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [status?.staffId]);

  const toggleGate = (idx: number) => {
    setExpandedGates((prev) => {
      const next = prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx];
      if (next.length === 6) setGateViewMode('expanded');
      else if (next.length === 0) setGateViewMode('simple');
      return next;
    });
  };

  const handleSetGateViewMode = (mode: 'simple' | 'expanded') => {
    setGateViewMode(mode);
    if (mode === 'simple') {
      setExpandedGates([]);
    } else {
      setExpandedGates([1, 2, 3, 4, 5, 6]);
    }
  };

  React.useEffect(() => {
    if (typeof earnings?.details?.expectedCrossConsultOrdersPerMonth === 'number') {
      setSliderCrossOrders(earnings.details.expectedCrossConsultOrdersPerMonth);
    } else if (typeof (targetReq as any).expectedCrossConsultOrdersPerMonth === 'number') {
      setSliderCrossOrders((targetReq as any).expectedCrossConsultOrdersPerMonth);
    }
  }, [earnings?.details?.expectedCrossConsultOrdersPerMonth, (targetReq as any)?.expectedCrossConsultOrdersPerMonth]);

  // Synchronize when active staff or metrics change
  React.useEffect(() => {
    if (status?.metrics) {
      const m = status.metrics;
      setSliderFixRate(Number(((m.fixRate || 0) * 100).toFixed(1)));
      const stTip =
        m.staffTipRate ??
        (m.ordersCount ? Math.min(0.65, Math.max(0.2, ((m.totalTip || 0) / (m.ordersCount * 38000)) * 0.45)) : 0.314);
      setSliderTipRate(Number((stTip * 100).toFixed(1)));
      setSliderQaAudits(m.qaAudit?.totalAudits ?? 0);
      setSliderHappinessIndex(Math.round((m.happinessIndex ?? 0.85) * 100));
      setSliderBananaCount(m.bananaCount ?? 45);
    }
  }, [
    status?.staffId,
    status?.metrics?.ordersCount,
    status?.metrics?.fixRate,
    status?.metrics?.totalTip,
    status?.metrics?.happinessIndex,
    status?.metrics?.bananaCount,
  ]);

  if (!status) return null;

  const metrics = status.metrics;

  const targetOrders = targetReq.minOrders ?? (isTargetCvPlusPlus ? 350 : 300);
  const targetMaxFix = targetReq.maxFixRate ?? (isTargetCvPlusPlus ? 0.015 : 0.02);
  const minTipRatioAboveShop = targetReq.minTipRatioAboveShop ?? (isTargetCvPlusPlus ? 0.15 : 0.1);
  const minBananaCount = targetReq.minBananaCount ?? (isTargetCvPlusPlus ? 60 : 45);
  const minHappinessIndex = targetReq.minHappinessIndex ?? (isTargetCvPlusPlus ? 0.8 : 0.7);
  const minSelfComboRate = targetReq.minSelfComboRate ?? (isTargetCvPlusPlus ? 0.3 : 0.2);

  const staffTipRate =
    metrics.staffTipRate ??
    (metrics.ordersCount
      ? Math.min(0.65, Math.max(0.2, ((metrics.totalTip || 0) / (metrics.ordersCount * 38000)) * 0.45))
      : 0.314);
  const branchName = metrics.branchName || 'Chi Nhánh';
  const branchShortName = metrics.branchCode || metrics.branchName || 'CN';
  const shopTipRate = metrics.shopTipRate ?? 0.45; // 45.0%
  const shopBonusPercent = Number((shopTipRate * minTipRatioAboveShop * 100).toFixed(1));
  const targetTipRate = metrics.targetTipRate ?? Number((shopTipRate * (1 + minTipRatioAboveShop)).toFixed(3));

  const staffTipRatePercent = Number((staffTipRate * 100).toFixed(1));
  const shopTipRatePercent = Number((shopTipRate * 100).toFixed(1));
  const targetTipRatePercent = Number((targetTipRate * 100).toFixed(1));

  // 6 Tiêu Chí Nâng Cấp (Theo chuẩn CV+ hoặc CV++):
  // 1. Số ca làm / 3 tháng
  const isOrdersPassed = (metrics.ordersCount || 0) >= targetOrders;
  const ordersGap = Math.max(0, targetOrders - (metrics.ordersCount || 0));
  const ordersProgressPercent = Math.min(100, Math.round(((metrics.ordersCount || 0) / (targetOrders || 300)) * 100));

  // 2. Tỷ lệ fix
  const isFixPassed = (metrics.fixRate || 0) <= targetMaxFix;

  // 3. Tỷ lệ tip
  const isTipPassed = staffTipRate >= targetTipRate || (metrics.tipRatioAboveShop || 0) >= minTipRatioAboveShop;
  const tipGapPercent = Math.max(0, Number((targetTipRatePercent - staffTipRatePercent).toFixed(1)));
  const tipExcessPercent = Math.max(0, Number((staffTipRatePercent - targetTipRatePercent).toFixed(1)));
  const tipProgressPercent = Math.min(100, Math.max(0, Math.round((staffTipRate / targetTipRate) * 100)));

  // 4. QA/QC tối thiểu 4 lần trong tháng hoàn tất gần nhất (1 lần/tuần)
  const qaAudit = metrics.qaAudit;
  const requiredQaAudits =
    targetReq.minQaAudits ?? (targetReq.minWeeklyQaAudits ? Math.round(targetReq.minWeeklyQaAudits * 4) : 4);
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
        : Math.min(100, Math.round((totalQaAudits / (requiredQaAudits || 4)) * 100));

  // 5. HI (Happiness Index)
  const happinessIndex = metrics.happinessIndex ?? 0;
  const isHiPassed = happinessIndex >= minHappinessIndex;
  const hiPercent = Math.round(happinessIndex * 100);
  const hiProgressPercent = Math.min(100, Math.round((happinessIndex / minHappinessIndex) * 100));

  // 6. Chuối Yêu Thương
  const minBananaCountVal = minBananaCount;
  const bananaCount = metrics.bananaCount ?? 0;
  const isBananaPassed = bananaCount >= minBananaCountVal;
  const bananaProgressPercent = Math.min(100, Math.round((bananaCount / minBananaCountVal) * 100));

  // Gamified Quest XP Progress (Tổng 6 ải hoàn thành thực tế)
  const passedQuestsCount =
    Number(isOrdersPassed) +
    Number(isFixPassed) +
    Number(isTipPassed) +
    Number(isQaPassed) +
    Number(isHiPassed) +
    Number(isBananaPassed);
  const xpPercent = Math.round((passedQuestsCount / 6) * 100);

  // What-If Dynamic Simulation across all 6 Nodes
  const isSimOrdersPassed = sliderOrders >= targetOrders;
  const isSimFixPassed = sliderFixRate / 100 <= targetMaxFix;
  const isSimTipPassed =
    sliderTipRate / 100 >= targetTipRate ||
    (targetTipRate > 0 && sliderTipRate / 100 >= shopTipRate * (1 + minTipRatioAboveShop));
  const isSimQaPassed = requiredQaAudits === 0 || (!hasFailedQa && sliderQaAudits >= requiredQaAudits);
  const isSimHiPassed = sliderHappinessIndex / 100 >= minHappinessIndex;
  const isSimBananaPassed = sliderBananaCount >= minBananaCountVal;

  const isSimComboPassed = sliderCombo / 100 >= minSelfComboRate;
  const simPassedCount =
    Number(isSimOrdersPassed) +
    Number(isSimFixPassed) +
    Number(isSimTipPassed) +
    Number(isSimQaPassed) +
    Number(isSimHiPassed) +
    Number(isSimBananaPassed);
  const isSimAllPassed = simPassedCount === 6;

  // Radar Scores (Normalized 6 Cánh)
  const customRadarAxes = [
    { label: `${targetOrders} Ca/3T`, icon: '👁️', name: 'Bộ mi', isPassed: isSimOrdersPassed },
    { label: `Fix < ${(targetMaxFix * 100).toFixed(1)}%`, icon: '🐛', name: 'Bảo hành', isPassed: isSimFixPassed },
    {
      label: `Tip > ${(minTipRatioAboveShop * 100).toFixed(0)}% Shop`,
      icon: '🪙',
      name: 'Tỷ lệ Tip',
      isPassed: isSimTipPassed,
    },
    {
      label: requiredQaAudits > 0 ? `QA ≥ ${requiredQaAudits}L/1T` : 'QA (Miễn)',
      icon: '🛡️',
      name: 'Kiểm định QA',
      isPassed: isSimQaPassed,
    },
    {
      label: `HI > ${(minHappinessIndex * 100).toFixed(0)}%`,
      icon: '💖',
      name: 'Teamwork HI',
      isPassed: isSimHiPassed,
    },
    { label: `Chuối ≥ ${minBananaCountVal}/1T`, icon: '🍌', name: 'Chuối Yêu Thương', isPassed: isSimBananaPassed },
  ];

  const radarActualScores = [
    Math.min(1.2, (metrics.ordersCount || 0) / (targetOrders || 300)),
    (metrics.fixRate || 0) <= targetMaxFix
      ? 1.0 + Math.max(0, 0.2 - (metrics.fixRate || 0) * 10)
      : Math.max(0.2, 1.0 - ((metrics.fixRate || 0) - targetMaxFix) * 25),
    targetTipRate > 0 ? Math.min(1.2, Math.max(0.2, staffTipRate / targetTipRate)) : 0.5,
    requiredQaAudits > 0 ? (hasFailedQa ? 0.2 : Math.min(1.2, totalQaAudits / (requiredQaAudits || 4))) : 1.0,
    happinessIndex >= minHappinessIndex
      ? Math.min(1.2, 1.0 + Math.min(0.2, (happinessIndex - minHappinessIndex) * 2))
      : Math.max(0.2, happinessIndex / minHappinessIndex),
    bananaCount >= minBananaCountVal
      ? Math.min(1.2, 1.0 + Math.min(0.2, (bananaCount - minBananaCountVal) / 100))
      : Math.min(0.9, bananaCount / minBananaCountVal),
  ];

  // Radar Simulated Scores (Phản ánh trực tiếp 6 slider mô phỏng của Danny)
  const radarSimulatedScores = [
    Math.min(1.2, sliderOrders / (targetOrders || 300)),
    sliderFixRate / 100 <= targetMaxFix
      ? 1.0 + Math.max(0, 0.2 - (sliderFixRate / 100) * 10)
      : Math.max(0.2, 1.0 - (sliderFixRate / 100 - targetMaxFix) * 25),
    targetTipRate > 0 ? Math.min(1.2, Math.max(0.2, sliderTipRate / 100 / targetTipRate)) : 0.5,
    requiredQaAudits > 0 ? (hasFailedQa ? 0.2 : Math.min(1.2, sliderQaAudits / (requiredQaAudits || 4))) : 1.0,
    sliderHappinessIndex / 100 >= minHappinessIndex
      ? Math.min(1.2, 1.0 + Math.min(0.2, (sliderHappinessIndex / 100 - minHappinessIndex) * 2))
      : Math.max(0.2, sliderHappinessIndex / 100 / minHappinessIndex),
    sliderBananaCount >= minBananaCountVal
      ? Math.min(1.2, 1.0 + Math.min(0.2, (sliderBananaCount - minBananaCountVal) / 100))
      : Math.min(0.9, sliderBananaCount / minBananaCountVal),
  ];

  const radarTargetScores = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0];

  // 6 Đỉnh Radar Metadata cho Node Controller & Quick Switcher
  const radarNodeMeta = [
    {
      index: 0,
      icon: '👁️',
      shortName: 'Bộ mi',
      title: '1. Sản Lượng Bộ Mi / 3 Tháng',
      currentValText: `${sliderOrders} bộ mi`,
      targetText: `≥ ${targetOrders} bộ / 3 tháng hoàn tất`,
      actualText: `${metrics.ordersCount || 0} bộ`,
      isPassed: isSimOrdersPassed,
      min: 50,
      max: 500,
      step: 5,
      value: sliderOrders,
      onChange: (v: number) => setSliderOrders(v),
      presets: [
        { label: '-25', val: Math.max(50, sliderOrders - 25) },
        { label: '-10', val: Math.max(50, sliderOrders - 10) },
        { label: '+10', val: Math.min(500, sliderOrders + 10) },
        { label: '+25', val: Math.min(500, sliderOrders + 25) },
        { label: `Đạt chuẩn (${targetOrders})`, val: targetOrders },
        { label: 'Về thực tế', val: metrics.ordersCount || 300 },
      ],
      desc: 'Đạt đủ số bộ mi trong 3 tháng hoàn tất gần nhất thể hiện tay nghề nhanh nhẹn, ổn định và năng lực phục vụ khách hàng liên tục.',
    },
    {
      index: 1,
      icon: '🐛',
      shortName: 'Fix mi',
      title: '2. Tỷ Lệ Bảo Hành & Sửa Mi',
      currentValText: `${sliderFixRate.toFixed(1)}% sửa`,
      targetText: `< ${(targetMaxFix * 100).toFixed(1)}% tối đa`,
      actualText: `${((metrics.fixRate || 0) * 100).toFixed(1)}%`,
      isPassed: isSimFixPassed,
      min: 0,
      max: 5,
      step: 0.1,
      value: sliderFixRate,
      onChange: (v: number) => setSliderFixRate(Number(v.toFixed(1))),
      presets: [
        { label: '0.5%', val: 0.5 },
        { label: '1.0%', val: 1.0 },
        { label: '1.5%', val: 1.5 },
        { label: `${(targetMaxFix * 100).toFixed(1)}% (Chuẩn)`, val: Number((targetMaxFix * 100).toFixed(1)) },
        { label: 'Về thực tế', val: Number(((metrics.fixRate || 0) * 100).toFixed(1)) },
      ],
      desc: 'Tỷ lệ khách quay lại sửa mi phải dưới mức an toàn, đảm bảo kỹ thuật gắn mi chuẩn xác và độ bền cao.',
    },
    {
      index: 2,
      icon: '🪙',
      shortName: 'Tỷ lệ Tip',
      title: `3. Tỷ Lệ Khách Tip (Vượt ${branchName})`,
      currentValText: `${sliderTipRate.toFixed(1)}% tip`,
      targetText: `≥ ${targetTipRatePercent}% (vượt ${(minTipRatioAboveShop * 100).toFixed(0)}% TB ${branchName})`,
      actualText: `${staffTipRatePercent}%`,
      isPassed: isSimTipPassed,
      min: 10,
      max: 90,
      step: 0.5,
      value: sliderTipRate,
      onChange: (v: number) => setSliderTipRate(Number(v.toFixed(1))),
      presets: [
        { label: '30%', val: 30 },
        { label: '40%', val: 40 },
        { label: `${targetTipRatePercent}% (Chuẩn)`, val: targetTipRatePercent },
        { label: '60%', val: 60 },
        { label: 'Về thực tế', val: staffTipRatePercent },
      ],
      desc: 'Khách tự nguyện tip tiền (≥ 20K) cho thấy thái độ phục vụ tận tâm, làm khách hài lòng và yêu mến.',
    },
    {
      index: 3,
      icon: '🛡️',
      shortName: 'QA/QC',
      title: '4. Kiểm Định QA/QC Định Kỳ',
      currentValText: `${sliderQaAudits} lần kiểm`,
      targetText: `≥ ${requiredQaAudits} lần / tháng hoàn tất (0 bài Failed)`,
      actualText: `${totalQaAudits} lần`,
      isPassed: isSimQaPassed,
      min: 0,
      max: 24,
      step: 1,
      value: sliderQaAudits,
      onChange: (v: number) => setSliderQaAudits(v),
      presets: [
        { label: '0', val: 0 },
        { label: '6', val: 6 },
        { label: `${requiredQaAudits} (Chuẩn)`, val: requiredQaAudits },
        { label: '18', val: 18 },
        { label: 'Về thực tế', val: totalQaAudits },
      ],
      desc: 'Kỹ thuật viên chủ động mời QA/QC kiểm tra định kỳ mỗi tuần để giữ vững tác phong và vệ sinh phòng mi.',
    },
    {
      index: 4,
      icon: '💖',
      shortName: 'HI Thả tim',
      title: '5. Chỉ Số Teamwork HI Thả Tim',
      currentValText: `${sliderHappinessIndex}% HI`,
      targetText: `> ${((cvReq.minHappinessIndex || minHappinessIndex) * 100).toFixed(0)}% thả tim`,
      actualText: `${hiPercent}%`,
      isPassed: isSimHiPassed,
      min: 30,
      max: 100,
      step: 1,
      value: sliderHappinessIndex,
      onChange: (v: number) => setSliderHappinessIndex(v),
      presets: [
        { label: '50%', val: 50 },
        { label: '70%', val: 70 },
        {
          label: `${((cvReq.minHappinessIndex || minHappinessIndex) * 100).toFixed(0)}% (Chuẩn)`,
          val: Math.round((cvReq.minHappinessIndex || minHappinessIndex) * 100),
        },
        { label: '90%', val: 90 },
        { label: 'Về thực tế', val: hiPercent },
      ],
      desc: 'Đồng đội tự thả tim cho nhau mỗi khi check-in/out ca làm việc để ghi nhận tinh thần tương trợ và gắn kết.',
    },
    {
      index: 5,
      icon: '🍌',
      shortName: 'Chuối',
      title: '6. Chuối Yêu Thương Check-in',
      currentValText: `${sliderBananaCount} 🍌 chuối`,
      targetText: `≥ ${minBananaCountVal} chuối / tháng hoàn tất`,
      actualText: `${bananaCount} chuối`,
      isPassed: isSimBananaPassed,
      min: 0,
      max: 150,
      step: 1,
      value: sliderBananaCount,
      onChange: (v: number) => setSliderBananaCount(v),
      presets: [
        { label: '15', val: 15 },
        { label: '30', val: 30 },
        { label: `${minBananaCountVal} (Chuẩn)`, val: minBananaCountVal },
        { label: '70', val: 70 },
        { label: 'Về thực tế', val: bananaCount },
      ],
      desc: 'Chuối yêu thương được thiên thần khác tặng lúc check-in mỗi ngày, ghi nhận sự quý mến giữa các thành viên.',
    },
  ];

  const formatVnd = (num?: number | null) => {
    if (!num) return '0đ';
    return `${num.toLocaleString('vi-VN')}đ`;
  };

  const getStatusBadge = () => {
    if (hasFailedQa) {
      return (
        <StatusTag
          status="error"
          icon={<AlertCircle className="w-3 h-3" />}
          label="Khóa nâng cấp (Lỗi QA)"
          className="font-bold text-xs"
        />
      );
    }
    if (!isQaPassed && isOrdersPassed && isFixPassed && isTipPassed) {
      return (
        <StatusTag
          status="warning"
          icon={<Clock className="w-3 h-3" />}
          label="Cần kiểm tra QA định kỳ"
          className="font-bold text-xs"
        />
      );
    }
    switch (status.status) {
      case 'QUALIFIED':
        return (
          <StatusTag
            status="success"
            icon={<CheckCircle2 className="w-3 h-3" />}
            label="Đủ điều kiện thăng cấp"
            className="font-bold text-xs animate-pulse"
          />
        );
      case 'TRIAL_GATE':
        return (
          <StatusTag
            status="warning"
            icon={<Flame className="w-3 h-3 text-amber-500" />}
            label="Đang thử thách Ải Trùm"
            className="font-bold text-xs animate-pulse"
          />
        );
      case 'PROMOTED':
        return (
          <StatusTag
            status="purple"
            icon={<Crown className="w-3 h-3" />}
            label="Đã thăng hạng"
            className="font-bold text-xs"
          />
        );
      case 'SPECIALIST_PATH':
        return (
          <StatusTag
            status="cyan"
            icon={<Gem className="w-3 h-3" />}
            label="Nhánh Master Tech"
            className="font-bold text-xs"
          />
        );
      default:
        return (
          <StatusTag
            status="processing"
            icon={<Sparkles className="w-3 h-3 text-blue-500" />}
            label="Đang rèn luyện"
            className="font-bold text-xs"
          />
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
  const hourlyWageNext = cvReq.hourlyWage || earnings?.details?.hourlyWageNext || (isTargetCvPlusPlus ? 29500 : 27500);
  const hourlyWageCurrent = config.compensation?.hourlyWages?.cv || earnings?.details?.hourlyWageCurrent || 25500;
  const actualHours = earnings?.details?.actualWorkingHours || earnings?.details?.monthlyEstimatedHours || 260;
  const wageGain = Math.max(0, (hourlyWageNext - hourlyWageCurrent) * actualHours);

  const targetTipRatio = cvReq.tipShareRatio ?? 0.9;
  const baseTipRatio = config.rewardRates?.tipShareCvRatio ?? 0.7;
  const totalCustomerTip =
    (earnings?.details as any)?.customerTotalTip || (earnings?.details as any)?.totalCustomerTip || 4171200;
  const tipGain = Math.max(0, Math.round(totalCustomerTip * (targetTipRatio - baseTipRatio)));

  // Cấu hình tiền tươi dưỡng mi & combo bậc thang
  const serumOrigBonus = cvReq.serumOriginalPriceBonus ?? 100000;
  const serumDiscountBonus = cvReq.serumDiscountedPriceBonus ?? 50000;
  const weeklySerumBonus = sliderSerums * serumOrigBonus;
  const monthlySerumBonus = weeklySerumBonus * 4;

  const avgComboPrice = earnings?.details?.avgComboPrice || 4500000;
  const singleComboBonus = calculateComboBonus(avgComboPrice, cvReq);

  // Mẫu số: Tệp khách hàng Not Combo Live (chưa có gói combo)
  const notComboLiveCustomers =
    cvPlusSnapshot?.notComboLiveOrders || Math.max(20, Math.round((sliderOrders / 3) * 0.4));
  const comboLiveCustomers = cvPlusSnapshot?.comboLiveOrders || Math.round((sliderOrders / 3) * 0.6);

  // Tỷ lệ chốt combo (%) lấy trực tiếp từ cần gạt sliderCombo
  const simulatedComboPct = sliderCombo;
  // Số combo bán được tương ứng trên khách Not Combo Live (khách có Combo Live bán được cũng cộng dồn vào)
  const simulatedComboCount = Math.round(notComboLiveCustomers * (sliderCombo / 100));
  const minComboRequired = Math.ceil(notComboLiveCustomers * 0.2);

  // Điều kiện nhận hết thưởng: Bán tối thiểu 20% Combo trên khách Not Combo Live
  const isComboTargetHit = simulatedComboPct >= 20;
  const isPenaltyActive = !isComboTargetHit;

  // Tiền combo cá nhân theo slider / bậc thang
  const simulatedPersonalComboBonus = isPenaltyActive ? 0 : simulatedComboCount * singleComboBonus;
  const baseComboCommission = earnings?.details?.comboCommissionCurrent || 0;
  const comboGain = isPenaltyActive ? 0 : Math.max(0, simulatedPersonalComboBonus - baseComboCommission);

  // 1. Lương giờ tăng thêm (+2k/h): Chỉ nhận khi đạt >= 20% combo
  const effectiveWageGain = isPenaltyActive ? 0 : wageGain;
  // 2. Thưởng dưỡng mi: Chỉ nhận khi đạt >= 20% combo
  const effectiveSerumGain = isPenaltyActive ? 0 : monthlySerumBonus;
  // 3. Tiền TIP: CV 1 CÁNH VẪN NHẬN 70% + 20% = 90% TIP KỂ CẢ KHI BÁN KHÔNG ĐƯỢC (< 20%)!
  const effectiveTipGain = tipGain;

  // Khoản tiền thưởng bị mất trắng / khóa do không đạt tối thiểu 20% combo:
  const lostBonusAmount = isPenaltyActive
    ? wageGain + Math.round(notComboLiveCustomers * 0.2 * singleComboBonus) + monthlySerumBonus
    : 0;
  // Cần thiết cho tương thích ngược & các slider nâng cao
  const potentialCustomers = notComboLiveCustomers;
  const effectiveComboGain = comboGain;
  const cvPlusReq = config.cvPlusToCvPlusPlus || {};
  const crossConsultCombos = earnings?.details?.expectedCrossConsultCombosPerMonth ?? 4;
  const crossComboBonusPerItem = calculateComboBonus(avgComboPrice, cvPlusReq);
  const crossConsultComboBonus = isTargetCvPlusPlus ? crossConsultCombos * crossComboBonusPerItem : 0;
  const crossConsultCvShareRate = cvPlusReq.crossConsultCvShareRate ?? 0.2;
  const crossConsultCvSharedAmount = isTargetCvPlusPlus
    ? Math.round(crossConsultComboBonus * crossConsultCvShareRate)
    : 0;

  const crossTipRate = earnings?.details?.crossConsultTipRate ?? 0.2;
  const simulatedCrossTipAmount = isTargetCvPlusPlus ? Math.round(sliderCrossOrders * 40000 * crossTipRate) : 0;
  const baseCrossTipAmount =
    earnings?.details?.crossConsultTipAmount ??
    (isTargetCvPlusPlus ? Math.round(defaultCrossOrders * 40000 * crossTipRate) : 0);
  const dynamicCrossTipDelta = isTargetCvPlusPlus ? simulatedCrossTipAmount - baseCrossTipAmount : 0;

  // Tổng tiền tăng thêm thực nhận mỗi tháng
  const totalSimulatedGain = effectiveWageGain + effectiveTipGain + comboGain + effectiveSerumGain;
  const simulatedNextTierIncome = (earnings?.currentEstimatedIncome || 11800000) + totalSimulatedGain;

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-100/70 dark:border-slate-800 p-5 shadow-sm mb-6 transition-all duration-200">
      {/* Top Banner: Staff Profile & Simulation Controls */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap sm:flex-nowrap">
        {/* Left Side: Avatar + Staff Name + Status Tag + Journey Route */}
        <div className="flex items-center gap-3.5 min-w-0">
          <Avatar
            src={status.avatarUrl || undefined}
            size={48}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 border-2 border-white dark:border-slate-800"
          >
            {status.staffName.slice(0, 1).toUpperCase()}
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 m-0 truncate">
                {status.staffName}
              </h2>
              {getStatusBadge()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <span>Ải hiện tại:</span>
                <strong className="text-slate-700 dark:text-slate-200 font-bold inline-flex items-center">
                  <WingRoleLabel text={formatCareerRoleName(status.currentRole)} />
                </strong>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 mx-0.5" />
              <span className="inline-flex items-center gap-1">
                <span>Ải tiếp theo:</span>
                <strong className="text-rose-600 dark:text-rose-400 font-bold inline-flex items-center">
                  <WingRoleLabel text={formatCareerRoleName(status.targetRole)} />
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Operational Scope Badge - CV 1 Cánh (Đang triển khai) */}
        <div className="flex items-center gap-1.5 p-1 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-indigo-500/10 dark:bg-slate-800/90 rounded-xl border border-amber-500/30 shrink-0 self-start md:self-auto">
          <span className="inline-flex items-center gap-1 font-black text-xs py-1 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs">
            <WingRoleLabel text="🪽 CV" />
            <span>· Thanh Lịch (1 Cánh)</span>
          </span>
          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.5">
            🔥 Đang triển khai
          </span>
          <span className="text-[9px] text-slate-400 font-normal hidden lg:inline pl-1 border-l border-slate-200 dark:border-slate-700">
            CV 2 cánh đang nghiên cứu
          </span>
        </div>
      </div>

      {/* Sub-bar: Quest Milestone & Quick Actions Toolbar */}
      <div className="flex items-center justify-between gap-3 pt-3.5 mt-0 flex-wrap sm:flex-nowrap">
        {/* Left: Quest Milestone Progress Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Tiêu chí đạt chuẩn:{' '}
            <strong className="text-slate-700 dark:text-slate-200 font-bold tabular-nums">
              {passedQuestsCount}/6 ải
            </strong>{' '}
            <span className="tabular-nums">({xpPercent}%)</span>
          </span>
        </div>

        {/* Right: Action Buttons Group */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
          {onSwitchSpecialist && status.status !== 'SPECIALIST_PATH' && (
            <button
              onClick={onSwitchSpecialist}
              disabled={loadingAction}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50"
            >
              Nhánh Master Tech
            </button>
          )}

          {/* Manual Quick Override Promotion / Demotion */}
          {status.currentRole === 'KTV' && onSetRole && (
            <Popconfirm
              title="Đưa nhân sự này lên CV · Dịu Dàng?"
              description={`Xác nhận thăng cấp cho ${status.staffName} lên CV · Dịu Dàng (khi được FM / Đàn Chị bảo trợ & đạt sát hạch).`}
              okText="Lên CV · Dịu Dàng"
              cancelText="Hủy"
              onConfirm={() => onSetRole('CV')}
            >
              <button
                disabled={loadingAction}
                className="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/50 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lên CV · Dịu Dàng</span>
              </button>
            </Popconfirm>
          )}

          {status.currentRole === 'CV' && onSetRole && (
            <Popconfirm
              title="Đưa nhân sự này lên 🪽 CV · Thanh Lịch?"
              description={`Thăng cấp thủ công cho ${status.staffName} lên 🪽 CV · Thanh Lịch ngay lập tức.`}
              okText="Lên 🪽 CV · Thanh Lịch"
              cancelText="Hủy"
              onConfirm={() => onSetRole('CV_PLUS')}
            >
              <button
                disabled={loadingAction}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="inline-flex items-center gap-1">
                  <span>Lên</span>
                  <WingRoleLabel text="🪽 CV" />
                  <span>· Thanh Lịch</span>
                </span>
              </button>
            </Popconfirm>
          )}

          {status.currentRole === 'CV_PLUS' && (
            <>
              {onSetRole && (
                <Popconfirm
                  title="Đưa nhân sự này lên 🪽 CV 🪽 · Quí Phái?"
                  description={`Thăng cấp thủ công cho ${status.staffName} lên 🪽 CV 🪽 · Quí Phái ngay lập tức.`}
                  okText="Lên 🪽 CV 🪽 · Quí Phái"
                  cancelText="Hủy"
                  onConfirm={() => onSetRole('CV_PLUS_PLUS')}
                >
                  <button
                    disabled={loadingAction}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="inline-flex items-center gap-1">
                      <span>Lên</span>
                      <WingRoleLabel text="🪽 CV 🪽" />
                      <span>· Quí Phái</span>
                    </span>
                  </button>
                </Popconfirm>
              )}
              {onDemote && (
                <Popconfirm
                  title="Hạ cấp nhân sự về CV · Dịu Dàng?"
                  description={`Chuyển cấp bậc của ${status.staffName} về CV · Dịu Dàng.`}
                  okText="Hạ về CV · Dịu Dàng"
                  cancelText="Hủy"
                  okType="danger"
                  onConfirm={onDemote}
                >
                  <button
                    disabled={loadingAction}
                    className="px-3 py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>🔻 Hạ về CV · Dịu Dàng</span>
                  </button>
                </Popconfirm>
              )}
            </>
          )}

          {status.currentRole === 'CV_PLUS_PLUS' && onDemote && (
            <Popconfirm
              title="Hạ cấp nhân sự về 🪽 CV · Thanh Lịch?"
              description={`Chuyển cấp bậc của ${status.staffName} về 🪽 CV · Thanh Lịch.`}
              okText="Hạ về 🪽 CV · Thanh Lịch"
              cancelText="Hủy"
              okType="danger"
              onConfirm={onDemote}
            >
              <button
                disabled={loadingAction}
                className="px-3 py-1.5 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 font-bold text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span className="inline-flex items-center gap-1">
                  <span>🔻 Hạ về</span>
                  <WingRoleLabel text="🪽 CV" />
                  <span>· Thanh Lịch</span>
                </span>
              </button>
            </Popconfirm>
          )}

          {/* Primary Action Button: Mở Ải Trùm Cuối hoặc Duyệt Thăng Hạng */}
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
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Mở Ải Trùm Cuối (30 Ngày)</span>
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
                  <span>Duyệt Thăng Hạng</span>
                </button>
              </span>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 🔥 THE FINANCIAL SUPER-NOVA JACKPOT CARD: TÂM ĐIỂM QUYỀN LỢI TÀI CHÍNH CV 1 CÁNH */}
      <div className="mt-4 rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-amber-950/90 via-slate-900 to-emerald-950/80 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/20 relative overflow-hidden space-y-4 text-white">
        {/* Ambient Golden & Emerald Glows */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Slogan */}
        <div className="flex items-center justify-between gap-3 flex-wrap relative z-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md">
              <span>🔥</span> TÂM ĐIỂM QUYỀN LỢI TÀI CHÍNH
            </span>
            <span className="text-xs font-bold text-amber-300">
              Thăng Cấp Lên <WingRoleLabel text="🪽 CV" /> · Thanh Lịch (1 Cánh Tự Chủ)
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1">
            <span>💰</span> TIỀN TƯƠI RÓT VÀO VÍ
          </span>
        </div>

        {/* THE BIG HERO NUMBER DISPLAY */}
        <div className="p-4 rounded-2xl bg-slate-950/85 border border-amber-500/40 flex items-center justify-between gap-4 flex-wrap relative z-10">
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
              <span>💵</span>{' '}
              {isComboTargetHit
                ? 'THU NHẬP RÒNG TĂNG THÊM MỖI THÁNG:'
                : 'THU NHẬP TĂNG THÊM TẠM TÍNH (BỊ KHÓA THƯỞNG):'}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              {isComboTargetHit ? (
                <span className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-400 tabular-nums drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                  +{formatVnd(totalSimulatedGain)}
                </span>
              ) : (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl lg:text-3xl font-black text-emerald-400 tabular-nums">
                    +{formatVnd(effectiveTipGain)}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Bảo lưu 90% Tip (70+20)
                  </span>
                  <span className="text-xs font-bold text-rose-400 line-through">
                    +{formatVnd(lostBonusAmount)} thưởng
                  </span>
                </div>
              )}
              <span className="text-xs font-bold text-slate-400 uppercase">/ Tháng</span>
            </div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
              {isComboTargetHit ? (
                <>
                  <span>🚀</span>
                  <span>
                    Tương đương{' '}
                    <strong className="text-white text-sm font-black tabular-nums">
                      +{formatVnd(totalSimulatedGain * 12)} / Năm
                    </strong>{' '}
                    (Đủ sắm xe tay ga hoặc 7 chỉ vàng 9999!)
                  </span>
                </>
              ) : (
                <span className="text-rose-300">
                  ⚠️ Bị khóa +{formatVnd(lostBonusAmount)} tiền thưởng combo và lương tăng do chưa đạt tối thiểu 20%
                  combo!
                </span>
              )}
            </div>
          </div>

          {/* High-converting Catchphrase Badge */}
          <div className="max-w-xs text-right hidden sm:block">
            <div
              className={`p-2.5 rounded-xl border text-[11px] font-semibold leading-relaxed ${
                isComboTargetHit
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}
            >
              {isComboTargetHit ? (
                <span>
                  “Cùng một ca làm, cùng lượng khách phục vụ — Nhưng đút túi thêm cả chỉ vàng mỗi tháng!{' '}
                  <strong className="text-amber-300 font-black">
                    Chỉ có người thù ghét tiền mới không muốn lên CV 1 cánh!
                  </strong>
                  ”
                </span>
              ) : (
                <span>
                  “⚠️ <strong className="text-rose-300 font-black">Quy tắc 2 Tháng Liền:</strong> CV 1 cánh bán không
                  được vẫn nhận 90% Tip, nhưng không nhận thêm thưởng nào khác. Nếu 2 tháng liền không đạt 20% combo thì
                  quay lại CV!”
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 🎛️ BỘ ĐÔI CẦN GẠT TÀI CHÍNH: 1. COMBO (BẮT BUỘC) & 2. DƯỠNG MI (KHUYẾN KHÍCH) */}
        <div
          className={`p-4 rounded-2xl border-2 relative z-10 space-y-3.5 transition-all duration-300 ${
            isComboTargetHit
              ? 'bg-slate-950/90 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
              : 'bg-rose-950/80 border-rose-500 shadow-xl shadow-rose-500/20'
          }`}
        >
          {/* Header of Console */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-400 to-emerald-400 text-slate-950 flex items-center justify-center font-bold text-xs shadow-xs">
                🎛️
              </span>
              <div>
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  2 CẦN GẠT ĐỘT PHÁ THU NHẬP CV 1 CÁNH
                </span>
                <p className="text-[10px] text-slate-400 m-0">
                  Kéo thử để thấy tiền tươi tăng giảm tức thì. Nhận thưởng combo &amp; dưỡng mi dựa trên điều kiện sống
                  còn!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                  isComboTargetHit ? 'bg-emerald-500 text-slate-950' : 'bg-rose-600 text-white animate-bounce'
                }`}
              >
                {isComboTargetHit ? '✓ ĐỦ ĐIỀU KIỆN NHẬN HẾT THƯỞNG' : '✕ BÁN KHÔNG ĐẠT (< 20%)'}
              </span>
            </div>
          </div>

          {/* 2 SLIDERS GRID: STACKED ON MOBILE, 2-COL ON DESKTOP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
            {/* SLIDER 1: BÁN COMBO (BẮT BUỘC ≥ 20%) */}
            <div
              className={`p-3.5 rounded-xl border relative transition-all ${
                isComboTargetHit ? 'bg-emerald-950/30 border-emerald-500/40' : 'bg-rose-950/40 border-rose-500/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">💎</span>
                  <span className="text-xs font-black text-white">
                    1. BÁN COMBO <span className="text-rose-400 font-black">(BẮT BUỘC)</span>
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-base font-black font-mono tabular-nums ${
                      isComboTargetHit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {sliderCombo}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal pl-1">(~{simulatedComboCount} combo)</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-300 leading-snug mb-2">
                Tính trên <strong className="text-indigo-300">~{notComboLiveCustomers} khách Not Live</strong>. Bán cho
                khách có Live vẫn cộng dồn!
              </div>

              {/* Slider */}
              <Slider
                min={0}
                max={60}
                step={1}
                value={sliderCombo}
                onChange={(val) => setSliderCombo(val)}
                tooltip={{ formatter: (val) => `${val}% Combo` }}
                className="my-1.5"
              />

              {/* Scale Labels */}
              <div className="flex justify-between text-[9px] font-bold text-slate-400 pt-0.5">
                <span className="text-rose-400">0% (Mất hết thưởng)</span>
                <span className="text-amber-300 font-black">Chuẩn: ≥ 20% (Sống còn)</span>
                <span className="text-emerald-400">30%+ (Xuất sắc)</span>
              </div>

              {/* Status Pill */}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Trạng thái:</span>
                {isComboTargetHit ? (
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>✓</span> Đạt chuẩn sống còn (≥ 20%)
                  </span>
                ) : (
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <span>✕</span> Thiếu {Math.max(0, 20 - sliderCombo)}% để nhận thưởng
                  </span>
                )}
              </div>
            </div>

            {/* SLIDER 2: BÁN DƯỠNG MI YEPPEUM (KHUYẾN KHÍCH ≥ 1 CÂY/TUẦN) */}
            <div className="p-3.5 rounded-xl border border-teal-500/40 bg-teal-950/20 relative transition-all">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🌿</span>
                  <span className="text-xs font-black text-white">
                    2. DƯỠNG MI <span className="text-teal-400 font-bold">(KHUYẾN KHÍCH)</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono tabular-nums text-teal-300">
                    {sliderSerums} cây / tuần
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal pl-1">(~{sliderSerums * 4} cây/thg)</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-300 leading-snug mb-2">
                Khuyến khích <strong className="text-teal-300">≥ 1 cây/tuần</strong>. Tiền tươi trao tay:{' '}
                <strong className="text-amber-300">{formatVnd(serumOrigBonus)}/cây</strong> giá gốc!
              </div>

              {/* Slider */}
              <Slider
                min={0}
                max={10}
                step={1}
                value={sliderSerums}
                onChange={(val) => setSliderSerums(val)}
                tooltip={{ formatter: (val) => `${val ?? 0} cây/tuần (~${(val ?? 0) * 4} cây/tháng)` }}
                className="my-1.5"
              />

              {/* Scale Labels */}
              <div className="flex justify-between text-[9px] font-bold text-slate-400 pt-0.5">
                <span>0 cây</span>
                <span className="text-teal-300 font-bold">Chuẩn: ≥ 1 cây/tuần</span>
                <span className="text-teal-400">2 cây/tuần</span>
                <span className="text-emerald-400">4+ cây/tuần</span>
              </div>

              {/* Reward Value Pill */}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Thưởng dưỡng mi:</span>
                {isComboTargetHit ? (
                  <span className="font-bold text-emerald-400 tabular-nums">
                    +{formatVnd(monthlySerumBonus)} / tháng
                  </span>
                ) : (
                  <span
                    className="font-bold text-rose-400 line-through tabular-nums"
                    title="Khóa do chưa đạt 20% combo"
                  >
                    +{formatVnd(monthlySerumBonus)} (Tạm khóa)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* REALTIME DYNAMIC WARNING / REWARD BANNER */}
          <div
            className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
              isComboTargetHit
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/90 border border-rose-500 text-rose-200'
            }`}
          >
            {isComboTargetHit ? (
              <span>
                ✅ <strong>XUẤT SẮC:</strong> Đạt {sliderCombo}% Combo (≥ 20% khách Not Live) và {sliderSerums} cây
                dưỡng mi/tuần! Nhận TRỌN BỘ 4 NGUỒN THU: Lương giờ 27.5k/h (+2k/h), 90% TIP (70% mi + 20% tư vấn),
                Thưởng Combo bậc thang (+{formatVnd(comboGain)}) và Thưởng Dưỡng mi (+{formatVnd(monthlySerumBonus)})!
              </span>
            ) : (
              <span>
                🚨 <strong>BÁN CHƯA ĐẠT 20% COMBO:</strong> CV 1 cánh VẪN NHẬN 90% TIP (70% mi + 20% tư vấn = +
                {formatVnd(effectiveTipGain)}/tháng). Nhưng CẮT TẤT CẢ CÁC LOẠI THƯỞNG KHÁC (mất trắng +
                {formatVnd(lostBonusAmount)} tiền thưởng combo, dưỡng mi và lương tăng)! ⚠️{' '}
                <strong>2 tháng liền không đạt thì quay lại CV · Dịu Dàng</strong> (Tip tụt về 70%, mất quyền tự tư
                vấn)!
              </span>
            )}
          </div>
        </div>

        {/* HEAD-TO-HEAD BEFORE VS AFTER COMPARISON */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10 text-xs">
          {/* BEFORE: CV Dịu Dàng (Hiện Tại) */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 opacity-85">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-400 flex items-center gap-1.5">
                <span>🛑</span> CV · Dịu Dàng (Hiện Tại - 0 Cánh)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Mức cơ bản</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li className="flex justify-between">
                <span className="text-slate-400">• Tỷ lệ Tip khách cho:</span>
                <strong className="text-slate-300">70% Tip (bị trừ 30%)</strong>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">• Quyền chốt Combo:</span>
                <strong className="text-rose-400">Không có (phụ thuộc sảnh)</strong>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-400">• Lương giờ ca làm:</span>
                <strong className="text-slate-300">25.500đ / giờ</strong>
              </li>
            </ul>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Tổng thu nhập ước tính:</span>
              <strong className="text-slate-300 text-sm font-black tabular-nums">~11.800.000đ</strong>
            </div>
          </div>

          {/* AFTER: 🪽 CV · Thanh Lịch (Sau Thăng Cấp 1 Cánh) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-950 to-emerald-950/50 border-2 border-emerald-500/80 shadow-lg space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
              <span className="font-black text-emerald-300 flex items-center gap-1.5">
                <span>👑</span> <WingRoleLabel text="🪽 CV" /> · Thanh Lịch (1 Cánh Tự Chủ)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black uppercase shadow-xs">
                {isComboTargetHit ? '+33% THU NHẬP' : '+90% TIP'}
              </span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-200">
              <li className="flex justify-between">
                <span className="text-emerald-300/90">• Ăn trọn 90% TIP (70+20):</span>
                <strong className="text-emerald-300 font-bold tabular-nums">
                  +{formatVnd(effectiveTipGain)} / thg
                </strong>
              </li>
              <li className="flex justify-between">
                <span className="text-emerald-300/90">• Độc quyền chốt Combo Not Live:</span>
                {isComboTargetHit ? (
                  <strong className="text-emerald-300 font-bold tabular-nums">+{formatVnd(comboGain)} / thg</strong>
                ) : (
                  <span className="text-rose-400 font-bold">0đ (Khóa do &lt;20%)</span>
                )}
              </li>
              <li className="flex justify-between">
                <span className="text-emerald-300/90">• Tăng lương giờ (27.500đ/h):</span>
                {isComboTargetHit ? (
                  <strong className="text-emerald-300 font-bold tabular-nums">
                    +{formatVnd(effectiveWageGain)} / thg
                  </strong>
                ) : (
                  <span className="text-rose-400 font-bold">0đ (Khóa do &lt;20%)</span>
                )}
              </li>
              <li className="flex justify-between">
                <span className="text-emerald-300/90">• Thưởng Dưỡng mi & Chuối:</span>
                {isComboTargetHit ? (
                  <strong className="text-emerald-300 font-bold tabular-nums">
                    +{formatVnd(effectiveSerumGain)} / thg
                  </strong>
                ) : (
                  <span className="text-rose-400 font-bold">0đ (Khóa do &lt;20%)</span>
                )}
              </li>
            </ul>
            <div className="pt-2 border-t border-emerald-500/30 flex justify-between items-center text-xs">
              <span className="text-emerald-300 font-bold">Tổng thu nhập thực nhận:</span>
              <strong className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-300 text-base font-black tabular-nums">
                ~{formatVnd(simulatedNextTierIncome)} / thg
              </strong>
            </div>
          </div>
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

          <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
            {/* Quick Filter chips: All, Unpassed, Passed */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => setGateFilter('ALL')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 ${
                  gateFilter === 'ALL' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Tất cả</span>
                <span className="text-[9px] px-1 rounded-full bg-white/10 tabular-nums">6</span>
              </button>
              <button
                type="button"
                onClick={() => setGateFilter('UNPASSED')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 ${
                  gateFilter === 'UNPASSED'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⚡ Cần vượt</span>
                <span className="text-[9px] px-1 rounded-full bg-amber-400/20 text-amber-300 tabular-nums">
                  {6 - passedQuestsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setGateFilter('PASSED')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1 ${
                  gateFilter === 'PASSED'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>✓ Đã đạt</span>
                <span className="text-[9px] px-1 rounded-full bg-emerald-400/20 text-emerald-300 tabular-nums">
                  {passedQuestsCount}
                </span>
              </button>
            </div>

            {/* Toggle all simple vs expanded */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={() => handleSetGateViewMode('simple')}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  expandedGates.length === 0
                    ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetGateViewMode('expanded')}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  expandedGates.length > 0
                    ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Chi tiết 6 ải</span>
              </button>
            </div>

            {totalSimulatedGain ? (
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <div className="text-left md:text-right">
                  <div className="text-[9px] sm:text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">
                    Thu nhập tạm tính tăng thêm
                  </div>
                  <div className="text-xs sm:text-xs font-black text-emerald-400 tabular-nums">
                    +{formatVnd(totalSimulatedGain)}/tháng
                  </div>
                </div>
              </div>
            ) : null}
          </div>
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

        {/* COMBINED, SIMPLIFIED & EXPANDABLE 6-QUEST CARDS (OPTIMIZED FOR IPHONE 12 & DESKTOP) */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: 300 Ca / 3 Tháng */}
          {(gateFilter === 'ALL' ||
            (gateFilter === 'PASSED' && isOrdersPassed) ||
            (gateFilter === 'UNPASSED' && !isOrdersPassed)) && (
            <div
              id="gate-card-1"
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isOrdersPassed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-300'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGate(1)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleGate(1);
                }}
                className="p-3 sm:p-3.5 cursor-pointer select-none active:scale-[0.99] transition-transform flex flex-col gap-1.5"
              >
                {/* Header row: Title + Status Badge + Chevron */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Eye className={`w-4 h-4 shrink-0 ${isOrdersPassed ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                      1. {targetOrders} bộ mi / 3 tháng
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isOrdersPassed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ĐẠT CHUẨN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> CẦN THÊM
                      </span>
                    )}
                    <div
                      className={`p-1 rounded-lg bg-white/5 transition-transform duration-200 ${
                        expandedGates.includes(1) ? 'rotate-180 text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Metric row */}
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <div className="text-base sm:text-lg font-black text-white tabular-nums">
                    {metrics.ordersCount || 0}{' '}
                    <span className="text-xs font-normal text-slate-400">/ {targetOrders} bộ</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isOrdersPassed ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {ordersProgressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <Progress
                  percent={ordersProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isOrdersPassed ? 'success' : 'normal'}
                  className="m-0 mt-0.5"
                />

                {/* Collapsed quick hint */}
                {!expandedGates.includes(1) && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                    <span className="truncate">
                      {isOrdersPassed ? '✓ Đã đạt định mức' : `⚡ Còn thiếu ${ordersGap} bộ mi nữa`}
                    </span>
                    <span className="text-rose-400/80 hover:text-rose-300 text-[10px] font-semibold shrink-0">
                      Chi tiết ▾
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {expandedGates.includes(1) && (
                <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 border-t border-white/10 text-[11px] space-y-2 pt-2.5">
                  <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <div className="text-slate-400">Đã hoàn thành</div>
                      <div className="text-white font-bold text-xs tabular-nums mt-0.5">
                        {metrics.ordersCount || 0} bộ mi
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Định mức 3 tháng</div>
                      <div className="text-amber-400 font-bold text-xs tabular-nums mt-0.5">
                        {targetOrders} bộ mi (~{Math.round(targetOrders / 3)} bộ/tháng)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>
                      {ordersGap === 0
                        ? '✓ Đã cán mốc tối thiểu 3 tháng hoàn tất'
                        : `⚡ Cần thêm ${ordersGap} bộ mi trong kỳ 3 tháng hoàn tất`}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-300">Mục tiêu: {targetOrders} bộ</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 2: Fix < 2% */}
          {(gateFilter === 'ALL' ||
            (gateFilter === 'PASSED' && isFixPassed) ||
            (gateFilter === 'UNPASSED' && !isFixPassed)) && (
            <div
              id="gate-card-2"
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isFixPassed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGate(2)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleGate(2);
                }}
                className="p-3 sm:p-3.5 cursor-pointer select-none active:scale-[0.99] transition-transform flex flex-col gap-1.5"
              >
                {/* Header row: Title + Status Badge + Chevron */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bug className={`w-4 h-4 shrink-0 ${isFixPassed ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                      2. Tỷ lệ Fix &lt; {(targetMaxFix * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isFixPassed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> XUẤT SẮC
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> VƯỢT MỨC
                      </span>
                    )}
                    <div
                      className={`p-1 rounded-lg bg-white/5 transition-transform duration-200 ${
                        expandedGates.includes(2) ? 'rotate-180 text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Metric row */}
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <div className="text-base sm:text-lg font-black text-white tabular-nums">
                    {((metrics.fixRate || 0) * 100).toFixed(1)}%{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (&lt; {(targetMaxFix * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isFixPassed ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {safetyShieldPercent}% an toàn
                  </span>
                </div>

                {/* Progress bar */}
                <Progress
                  percent={safetyShieldPercent}
                  size="small"
                  showInfo={false}
                  status={isFixPassed ? 'success' : 'exception'}
                  className="m-0 mt-0.5"
                />

                {/* Collapsed quick hint */}
                {!expandedGates.includes(2) && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                    <span className="truncate">
                      {metrics.fixCount || 0} ca sửa / {metrics.ordersCount || 0} bộ mi
                    </span>
                    <span className="text-rose-400/80 hover:text-rose-300 text-[10px] font-semibold shrink-0">
                      Chi tiết ▾
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {expandedGates.includes(2) && (
                <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 border-t border-white/10 text-[11px] space-y-2 pt-2.5">
                  <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <div className="text-slate-400">Ca bảo hành / sửa</div>
                      <div className="text-white font-bold text-xs tabular-nums mt-0.5">
                        {metrics.fixCount || 0} ca / {metrics.ordersCount || 0} bộ
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Ngưỡng tối đa</div>
                      <div className="text-emerald-400 font-bold text-xs tabular-nums mt-0.5">
                        &lt; {(targetMaxFix * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>
                      {isFixPassed
                        ? '✓ Tay nghề vững vàng, bảo hành trong ngưỡng kiểm soát'
                        : '⚡ Tỷ lệ sửa vượt mức an toàn, cần rà soát kỹ thuật nối mi'}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-300">{safetyShieldPercent}% an toàn</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 3: Tip > 10% TB Shop */}
          {(gateFilter === 'ALL' ||
            (gateFilter === 'PASSED' && isTipPassed) ||
            (gateFilter === 'UNPASSED' && !isTipPassed)) && (
            <div
              id="gate-card-3"
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isTipPassed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGate(3)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleGate(3);
                }}
                className="p-3 sm:p-3.5 cursor-pointer select-none active:scale-[0.99] transition-transform flex flex-col gap-1.5"
              >
                {/* Header row: Title + Status Badge + Chevron */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <HandCoins className={`w-4 h-4 shrink-0 ${isTipPassed ? 'text-emerald-400' : 'text-amber-400'}`} />
                    <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                      3. Tip &gt; {(minTipRatioAboveShop * 100).toFixed(0)}% TB {branchName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isTipPassed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ĐẠT CHUẨN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> CẦN THÊM
                      </span>
                    )}
                    <div
                      className={`p-1 rounded-lg bg-white/5 transition-transform duration-200 ${
                        expandedGates.includes(3) ? 'rotate-180 text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Metric row */}
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <div className="text-base sm:text-lg font-black text-white tabular-nums">
                    {staffTipRatePercent}%{' '}
                    <span className="text-xs font-normal text-slate-400">(chuẩn ≥ {targetTipRatePercent}%)</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isTipPassed ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {tipProgressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <Progress
                  percent={tipProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isTipPassed ? 'success' : 'normal'}
                  className="m-0 mt-0.5"
                />

                {/* Collapsed quick hint */}
                {!expandedGates.includes(3) && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                    <span className="truncate">
                      {isTipPassed ? `+${tipExcessPercent}% so với chuẩn` : `Thiếu ${tipGapPercent}%`} (
                      {metrics.tippedOrdersCount || 0}/{metrics.ordersCount || 0} ca)
                    </span>
                    <span className="text-rose-400/80 hover:text-rose-300 text-[10px] font-semibold shrink-0">
                      Chi tiết ▾
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {expandedGates.includes(3) && (
                <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 border-t border-white/10 text-[11px] space-y-2 pt-2.5">
                  {/* Hộp công thức 3 cột tối ưu cho iPhone 12 */}
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[10px] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span className="flex items-center gap-1 text-rose-400">
                        💡 TB {branchName} + 10% của {branchName}
                      </span>
                      <span className="text-emerald-400 font-extrabold tabular-nums">≥ {targetTipRatePercent}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center py-1 border-t border-slate-700/50">
                      <div className="bg-slate-900/60 p-1 rounded-lg">
                        <div className="text-slate-400 text-[9px] truncate">TB {branchShortName}</div>
                        <div className="text-slate-200 font-black tabular-nums">{shopTipRatePercent}%</div>
                      </div>
                      <div className="bg-slate-900/60 p-1 rounded-lg">
                        <div className="text-slate-400 text-[9px] truncate">+10% {branchShortName}</div>
                        <div className="text-amber-400 font-black tabular-nums">+{shopBonusPercent}%</div>
                      </div>
                      <div className="bg-slate-900/60 p-1 rounded-lg border border-emerald-500/30">
                        <div className="text-emerald-400 text-[9px]">Mục tiêu</div>
                        <div className="text-emerald-300 font-black tabular-nums">≥ {targetTipRatePercent}%</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <div className="text-slate-400">Ca nhận tip</div>
                      <div className="text-white font-bold text-xs tabular-nums mt-0.5">
                        {metrics.tippedOrdersCount || Math.round((metrics.ordersCount || 0) * (staffTipRate || 0))}/
                        {metrics.ordersCount || 0} ca
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Tổng tiền tip</div>
                      <div className="text-emerald-400 font-bold text-xs tabular-nums mt-0.5">
                        {formatVnd(metrics.totalTip)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>
                      {isTipPassed ? `✓ Vượt chuẩn (+${tipExcessPercent}%)` : `⚡ Thiếu ${tipGapPercent}% để đạt chuẩn`}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-300">
                      TB {branchName}: {shopTipRatePercent}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 4: QA/QC Định Kỳ */}
          {(gateFilter === 'ALL' ||
            (gateFilter === 'PASSED' && isQaPassed) ||
            (gateFilter === 'UNPASSED' && !isQaPassed)) && (
            <div
              id="gate-card-4"
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                hasFailedQa
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  : !isQaPassed
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGate(4)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleGate(4);
                }}
                className="p-3 sm:p-3.5 cursor-pointer select-none active:scale-[0.99] transition-transform flex flex-col gap-1.5"
              >
                {/* Header row: Title + Status Badge + Chevron */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ShieldCheck
                      className={`w-4 h-4 shrink-0 ${
                        isQaPassed ? 'text-emerald-400' : hasFailedQa ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    />
                    <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                      4. QA/QC ≥ {requiredQaAudits} lần / 3T
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasFailedQa ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                        <XCircle className="w-3 h-3" /> FAILED
                      </span>
                    ) : !isQaPassed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {totalQaAudits === 0 ? 'CHƯA KIỂM ĐỊNH' : 'THIẾU LƯỢT'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ĐẠT CHUẨN
                      </span>
                    )}
                    <div
                      className={`p-1 rounded-lg bg-white/5 transition-transform duration-200 ${
                        expandedGates.includes(4) ? 'rotate-180 text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Metric row */}
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <div className="text-base sm:text-lg font-black text-white tabular-nums">
                    {totalQaAudits}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / {requiredQaAudits} lần (chuẩn ≥ {requiredQaAudits}L/3T)
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isQaPassed ? 'text-emerald-400' : hasFailedQa ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {qaProgressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <Progress
                  percent={qaProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isQaPassed ? 'success' : hasFailedQa ? 'exception' : 'normal'}
                  className="m-0 mt-0.5"
                />

                {/* Collapsed quick hint */}
                {!expandedGates.includes(4) && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                    <span className="truncate">
                      {isQaPassed
                        ? '✓ Đạt định kỳ tác phong & phòng mi'
                        : totalQaAudits === 0
                          ? 'Chưa ghi nhận bài kiểm định (0 lần/tuần)'
                          : `Đã kiểm định ${totalQaAudits}/${requiredQaAudits} lần`}
                    </span>
                    <span className="text-rose-400/80 hover:text-rose-300 text-[10px] font-semibold shrink-0">
                      Chi tiết ▾
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {expandedGates.includes(4) && (
                <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 border-t border-white/10 text-[11px] space-y-2 pt-2.5">
                  <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <div className="text-slate-400">Tác phong 5S</div>
                      <div className="font-bold text-xs mt-0.5">
                        {(qaAudit?.totalAudits || 0) === 0 ? (
                          <span className="text-slate-400">Chưa kiểm định</span>
                        ) : !hasFailedQa ? (
                          <span className="text-emerald-400">✓ Đạt chuẩn 5S</span>
                        ) : (
                          <span className="text-rose-400">Vi phạm</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Vệ sinh phòng mi</div>
                      <div className="font-bold text-xs mt-0.5">
                        {(qaAudit?.totalAudits || 0) === 0 ? (
                          <span className="text-slate-400">Chưa kiểm định</span>
                        ) : !hasFailedQa ? (
                          <span className="text-emerald-400">✓ Sạch sẽ</span>
                        ) : (
                          <span className="text-rose-400">Chưa đạt</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>
                      {hasFailedQa
                        ? 'Bị khóa do có bài FAILED'
                        : isQaPassed
                          ? '✓ Đạt kiểm định định kỳ tác phong & phòng mi'
                          : (qaAudit?.totalAudits || 0) === 0
                            ? 'Hệ thống chưa ghi nhận biên bản QA/QC (Định mức 1 lần/tuần)'
                            : 'Chưa đủ tối thiểu 1 lần/tuần'}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-300">
                      {(qaAudit?.totalAudits || 0) === 0
                        ? '0 bài kiểm định'
                        : `${qaAudit?.failedAudits ?? 0} bài Failed`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 5: Chỉ Số HI (Teamwork) */}
          {(gateFilter === 'ALL' ||
            (gateFilter === 'PASSED' && isHiPassed) ||
            (gateFilter === 'UNPASSED' && !isHiPassed)) && (
            <div
              id="gate-card-5"
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isHiPassed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGate(5)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleGate(5);
                }}
                className="p-3 sm:p-3.5 cursor-pointer select-none active:scale-[0.99] transition-transform flex flex-col gap-1.5"
              >
                {/* Header row: Title + Status Badge + Chevron */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Heart
                      className={`w-4 h-4 shrink-0 ${
                        isHiPassed ? 'text-emerald-400 fill-emerald-400/20' : 'text-amber-400 fill-amber-400/20'
                      }`}
                    />
                    <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                      5. Chỉ số HI &gt; {((cvReq.minHappinessIndex || minHappinessIndex) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isHiPassed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> TIN YÊU
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> CẦN GẮN KẾT
                      </span>
                    )}
                    <div
                      className={`p-1 rounded-lg bg-white/5 transition-transform duration-200 ${
                        expandedGates.includes(5) ? 'rotate-180 text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Metric row */}
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <div className="text-base sm:text-lg font-black text-white tabular-nums">
                    {hiPercent}%{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (chuẩn &gt; {((cvReq.minHappinessIndex || minHappinessIndex) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isHiPassed ? 'text-emerald-400' : 'text-pink-400'
                    }`}
                  >
                    {hiProgressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <Progress
                  percent={hiProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isHiPassed ? 'success' : 'normal'}
                  className="m-0 mt-0.5"
                />

                {/* Collapsed quick hint */}
                {!expandedGates.includes(5) && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                    <span className="truncate">
                      {metrics.totalHi
                        ? `Thả tim: ${metrics.happyCount ?? 0}/${metrics.totalHi} (${hiPercent}%)`
                        : `Chỉ số: ${hiPercent}%`}
                    </span>
                    <span className="text-rose-400/80 hover:text-rose-300 text-[10px] font-semibold shrink-0">
                      Chi tiết ▾
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {expandedGates.includes(5) && (
                <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 border-t border-white/10 text-[11px] space-y-2 pt-2.5">
                  <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <div className="text-slate-400">Teamwork Check-in/out</div>
                      <div className="font-bold text-xs mt-0.5">
                        <span className={isHiPassed ? 'text-emerald-400' : 'text-amber-400'}>
                          {isHiPassed ? '✓ Rất gắn kết' : 'Cần tương trợ'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Đồng đội thả tim</div>
                      <div className="text-pink-400 font-bold text-xs mt-0.5 tabular-nums">
                        {metrics.totalHi
                          ? `${metrics.happyCount ?? 0}/${metrics.totalHi} (${hiPercent}%)`
                          : `${hiPercent}%`}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {isHiPassed
                      ? '✓ Đồng đội yêu quý, tinh thần tương trợ tuyệt vời khi check-in/out.'
                      : '⚡ Nhân viên đồng đội tự thả tim cho nhau mỗi khi check-in/out ca làm việc để ghi nhận tinh thần tương trợ.'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card 6: Chuối Yêu Thương */}
          {(gateFilter === 'ALL' ||
            (gateFilter === 'PASSED' && isBananaPassed) ||
            (gateFilter === 'UNPASSED' && !isBananaPassed)) && (
            <div
              id="gate-card-6"
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isBananaPassed
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              }`}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleGate(6)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleGate(6);
                }}
                className="p-3 sm:p-3.5 cursor-pointer select-none active:scale-[0.99] transition-transform flex flex-col gap-1.5"
              >
                {/* Header row: Title + Status Badge + Chevron */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base shrink-0">🍌</span>
                    <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                      6. Chuối Yêu Thương ≥ {minBananaCount}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isBananaPassed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> ĐẠT CHUẨN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> CHƯA ĐỦ
                      </span>
                    )}
                    <div
                      className={`p-1 rounded-lg bg-white/5 transition-transform duration-200 ${
                        expandedGates.includes(6) ? 'rotate-180 text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Metric row */}
                <div className="flex items-baseline justify-between gap-2 mt-0.5">
                  <div className="text-base sm:text-lg font-black text-amber-400 tabular-nums">
                    {bananaCount} 🍌{' '}
                    <span className="text-xs font-normal text-slate-400">(chuẩn ≥ {minBananaCount} Chuối / 90N)</span>
                  </div>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isBananaPassed ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {bananaProgressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <Progress
                  percent={bananaProgressPercent}
                  size="small"
                  showInfo={false}
                  status={isBananaPassed ? 'success' : 'normal'}
                  className="m-0 mt-0.5"
                />

                {/* Collapsed quick hint */}
                {!expandedGates.includes(6) && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                    <span className="truncate">
                      {isBananaPassed
                        ? '✓ Đạt chuẩn yêu thương'
                        : `⚡ Thiếu ${Math.max(0, minBananaCount - bananaCount)} chuối`}{' '}
                      (~15 chuối/tháng)
                    </span>
                    <span className="text-rose-400/80 hover:text-rose-300 text-[10px] font-semibold shrink-0">
                      Chi tiết ▾
                    </span>
                  </div>
                )}
              </div>

              {/* Expanded details */}
              {expandedGates.includes(6) && (
                <div className="px-3 pb-3 sm:px-3.5 sm:pb-3.5 border-t border-white/10 text-[11px] space-y-2 pt-2.5">
                  <div className="grid grid-cols-2 gap-2 text-[10px] p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <div>
                      <div className="text-slate-400">Thiên thần khác tặng</div>
                      <div className="text-amber-400 font-bold text-xs mt-0.5 tabular-nums">{bananaCount} Chuối</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Đồng đội quý mến</div>
                      <div className="font-bold text-xs mt-0.5">
                        <span className={bananaCount >= minBananaCount ? 'text-emerald-400' : 'text-amber-400'}>
                          {bananaCount >= minBananaCount
                            ? 'Rất cao (≥ 45)'
                            : bananaCount >= 15
                              ? 'Đang tích cực'
                              : 'Cần gắn kết'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 italic">
                    * Chỉ đếm chuối từ thiên thần khác tặng lúc check-in (loại trừ tự tặng &amp; checkout). Định mức ~15
                    chuối/tháng.
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="truncate">
                      {isBananaPassed
                        ? `✓ Đạt chuẩn ≥ ${minBananaCount} chuối trong tháng hoàn tất`
                        : `⚡ Còn thiếu ${Math.max(0, minBananaCount - bananaCount)} chuối trong tháng hoàn tất`}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-300">1T ≥ {minBananaCount}</span>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBananaDrawer?.('CHECKIN');
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                    >
                      <span>⏰</span>
                      <span>Xem danh sách Chuối Check-in tính điểm</span>
                      <span className="text-[10px] text-emerald-300 font-mono">({bananaCount} chuối) ➔</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Square Interactive Radar & Node Controller (7 cols) vs Live Earnings Impact (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Left column (7 cols): Full-width Interactive Radar & Dynamic Node Slider */}
        <div className="lg:col-span-7 bg-white/90 dark:bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shadow-2xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0 leading-tight">
                    Radar Kỹ Năng RPG &amp; Mô Phỏng Thăng Cấp
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Chạm trực tiếp vào các đỉnh radar để kéo slider tinh chỉnh từng tiêu chí
                  </span>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20">
                What-If Live
              </span>
            </div>

            {/* 1. SQUARE RADAR CHART (FULL-WIDTH ON MOBILE IPHONE 12) */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-3 sm:p-4 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center">
              <StatRadarChart
                actualScores={radarActualScores}
                targetScores={radarTargetScores}
                simulatedScores={radarSimulatedScores}
                qaLabel={requiredQaAudits > 0 ? `QA ≥ ${requiredQaAudits}L/3T` : 'QA (Miễn)'}
                customAxes={customRadarAxes}
                passedAxes={[
                  isSimOrdersPassed,
                  isSimFixPassed,
                  isSimTipPassed,
                  isSimQaPassed,
                  isSimHiPassed,
                  isSimBananaPassed,
                ]}
                activeNodeIndex={selectedRadarNode}
                onSelectNode={(idx) => setSelectedRadarNode(idx)}
              />

              {/* QUICK 6-NODE SWITCHER PILLS (Chuyển nhanh đỉnh bằng ngón tay trên mobile) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 w-full mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/60">
                {radarNodeMeta.map((node, idx) => {
                  const isSelected = selectedRadarNode === idx;
                  const isPassed = node.isPassed;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedRadarNode(idx)}
                      className={`px-2 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center gap-1 border select-none active:scale-95 ${
                        isSelected
                          ? isPassed
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                            : 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/25 ring-2 ring-rose-500/30'
                          : isPassed
                            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
                            : 'bg-white/80 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-300'
                      }`}
                    >
                      {renderCareerNodeIcon(
                        idx,
                        `w-3.5 h-3.5 shrink-0 ${
                          isSelected
                            ? 'text-white'
                            : isPassed
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-slate-600 dark:text-slate-300'
                        }`
                      )}
                      <span className="truncate">{node.shortName}</span>
                      {isPassed ? (
                        <Check
                          className={`w-3.5 h-3.5 shrink-0 stroke-[3] ${
                            isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        />
                      ) : (
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isSelected ? 'bg-amber-300' : 'bg-amber-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. DYNAMIC ACTIVE NODE SLIDER CONTROLLER PANEL */}
            {(() => {
              const activeNode = radarNodeMeta[selectedRadarNode] || radarNodeMeta[0];
              const isPassed = activeNode.isPassed;
              return (
                <div
                  className={`mt-3.5 p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-300 shadow-sm ${
                    isPassed
                      ? 'bg-gradient-to-br from-emerald-500/10 via-slate-50/90 to-teal-500/5 dark:from-emerald-950/40 dark:via-slate-800/80 dark:to-slate-900/90 border-emerald-500/60 dark:border-emerald-500/60 shadow-emerald-500/10'
                      : 'bg-gradient-to-br from-rose-500/5 via-slate-50/80 to-purple-500/5 dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/80 border-rose-500/30 dark:border-rose-500/30'
                  }`}
                >
                  {/* Header row: Icon + Title + Target comparison + Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`shrink-0 p-2 rounded-xl shadow-2xs border transition-colors flex items-center justify-center ${
                          isPassed
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-700 text-rose-500 dark:text-rose-400'
                        }`}
                      >
                        {renderCareerNodeIcon(
                          activeNode.index,
                          `w-5 h-5 shrink-0 ${
                            isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          }`,
                          'text-xl'
                        )}
                      </span>
                      <div className="min-w-0">
                        <h5 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 m-0 truncate">
                          {activeNode.title}
                        </h5>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Chuẩn: <strong className="text-slate-700 dark:text-slate-200">{activeNode.targetText}</strong>
                          {' · '}Thực tế:{' '}
                          <span
                            className={`font-bold ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}
                          >
                            {activeNode.actualText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      {isPassed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ĐẠT ẢI
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> CẦN THÊM
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Current Simulation Value Display */}
                  <div className="flex items-baseline justify-between gap-2 mt-2 px-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      Giá trị mô phỏng dự phóng:
                    </span>
                    <span
                      className={`text-base sm:text-lg font-black tabular-nums transition-colors ${
                        isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {activeNode.currentValText}
                    </span>
                  </div>

                  {/* Ant Design Slider Styled Dynamically */}
                  <ConfigProvider
                    theme={{
                      token: {
                        colorPrimary: isPassed ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)',
                        colorPrimaryBorder: isPassed ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)',
                        colorPrimaryBorderHover: isPassed ? 'rgb(5, 150, 105)' : 'rgb(225, 29, 72)',
                      },
                    }}
                  >
                    <div
                      className={`px-1 py-1 transition-all duration-300 ${
                        isPassed
                          ? '[&_.ant-slider-track]:bg-emerald-500 [&_.ant-slider-handle]:border-emerald-500 [&_.ant-slider-handle]:shadow-emerald-500/25'
                          : '[&_.ant-slider-track]:bg-rose-500 [&_.ant-slider-handle]:border-rose-500'
                      }`}
                    >
                      <Slider
                        min={activeNode.min}
                        max={activeNode.max}
                        step={activeNode.step}
                        value={activeNode.value}
                        onChange={activeNode.onChange}
                        className="m-0 my-1"
                      />
                    </div>
                  </ConfigProvider>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">Chỉnh nhanh:</span>
                    {activeNode.presets.map((preset, pIdx) => {
                      const isPresetMatch = preset.val === activeNode.value;
                      return (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => activeNode.onChange(preset.val)}
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border transition-all active:scale-95 shadow-2xs ${
                            isPresetMatch
                              ? isPassed
                                ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20'
                                : 'bg-rose-500 text-white border-rose-600 shadow-rose-500/20'
                              : isPassed
                                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-400 text-slate-700 dark:text-slate-300'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-rose-400 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanatory description */}
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 m-0 mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 leading-relaxed">
                    💡 {activeNode.desc}
                  </p>
                </div>
              );
            })()}

            {/* 3. LIVE WHAT-IF ACHIEVEMENT BANNER */}
            <div
              className={`mt-3.5 p-3 rounded-xl border text-xs transition-all ${
                isSimAllPassed
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold min-w-0">
                  {isSimAllPassed ? (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">🎉 Mục tiêu đạt 6/6 ải: Mở khóa thăng cấp ngay lập tức!</span>
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate">
                        Mục tiêu đạt {simPassedCount}/6 ải (cần thêm {6 - simPassedCount} ải nữa để mở khóa)
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-900/70 border border-current shrink-0">
                  {simPassedCount}/6 ải
                </span>
              </div>
            </div>

            {/* 4. EXTRA REVENUE BOOSTERS (COMBO, DƯỠNG MI YEPPEUM, CHỐT HỘ) IN ACCORDION */}
            <div className="mt-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setIsExtraPerksExpanded(!isExtraPerksExpanded)}
                className="w-full p-2.5 sm:p-3 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0">💎</span>
                  <span className="truncate">Đòn bẩy doanh thu thưởng thêm</span>
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-purple-500/15 text-purple-600 dark:text-purple-300 font-bold shrink-0">
                    {sliderCombos} combo · {sliderSerums} cây/tuần
                  </span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isExtraPerksExpanded ? 'rotate-180 text-rose-500' : ''
                  }`}
                />
              </button>

              {isExtraPerksExpanded && (
                <div className="p-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 bg-slate-50/40 dark:bg-slate-900/40">
                  {/* Slider: Chốt combo */}
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-xs mb-1 gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0">
                        <span>📦</span> Chốt combo nối mi:
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <span className="font-black tabular-nums text-purple-600 dark:text-purple-400 text-xs">
                          {sliderCombos} combo{' '}
                          <span className="font-medium text-[11px] opacity-80">
                            (~{potentialCustomers > 0 ? Math.round((sliderCombos / potentialCustomers) * 100) : 0}%)
                          </span>
                        </span>
                        {sliderCombos >= minComboRequired ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] whitespace-nowrap">
                            ✓ Đạt chuẩn ≥{(minSelfComboRate * 100).toFixed(0)}% ({minComboRequired} combo)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[9px] whitespace-nowrap">
                            Chuẩn: ≥{(minSelfComboRate * 100).toFixed(0)}% (Cần ≥{minComboRequired} combo)
                          </span>
                        )}
                      </div>
                    </div>
                    <Slider
                      min={0}
                      max={30}
                      value={sliderCombos}
                      onChange={(val) => {
                        setSliderCombos(val);
                        if (potentialCustomers > 0) {
                          setSliderCombo(Math.round((val / potentialCustomers) * 100));
                        }
                      }}
                      className="m-0 my-1"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                      <span>
                        Thưởng:{' '}
                        <strong className="text-purple-600 dark:text-purple-400 font-bold">
                          {formatVnd(singleComboBonus)}/combo
                        </strong>{' '}
                        (Gói TB 4.5M)
                      </span>
                      <span>Dự kiến: {cvReq.expectedCombosPerMonth ?? (isTargetCvPlusPlus ? 10 : 8)} combo/tháng</span>
                    </div>
                  </div>

                  {/* Slider: Dưỡng mi Yeppeum */}
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between text-xs mb-1 gap-1.5">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0">
                        <span>🌿</span> Bán dưỡng mi Yeppeum:
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 text-right">
                        <span className="font-black tabular-nums text-emerald-600 dark:text-emerald-400 text-xs">
                          {sliderSerums} cây / tuần
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] whitespace-nowrap">
                          +{formatVnd(monthlySerumBonus)}/th
                        </span>
                      </div>
                    </div>
                    <Slider min={0} max={20} value={sliderSerums} onChange={setSliderSerums} className="m-0 my-1" />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                      <span>
                        Thưởng:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {formatVnd(serumOrigBonus)}/cây
                        </strong>{' '}
                        (giá gốc 1.1M)
                      </span>
                      <span>
                        Dự kiến: {cvReq.expectedSerumsPerWeek ?? 4} cây/tuần (~{sliderSerums * 4} cây/tháng)
                      </span>
                    </div>
                  </div>

                  {/* Slider: Tư vấn chốt hộ CV khác (nếu CV++) */}
                  {isTargetCvPlusPlus && (
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1 gap-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0">
                          <span>🤝</span> Tư vấn chốt hộ CV khác:
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 text-right">
                          <span className="font-black tabular-nums text-amber-600 dark:text-amber-400 text-xs">
                            {sliderCrossOrders} ca / tháng
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[9px] whitespace-nowrap">
                            +{formatVnd(simulatedCrossTipAmount)}
                          </span>
                        </div>
                      </div>
                      <Slider
                        min={0}
                        max={300}
                        step={5}
                        value={sliderCrossOrders}
                        onChange={setSliderCrossOrders}
                        className="m-0 my-1"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                        <span>Được hưởng 20% tip ca tư vấn hộ</span>
                        <span>Mô phỏng tối đa 300 ca/tháng</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column (5 cols): Live Earnings Impact Simulation (Loot & Rewards) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-white via-rose-50/30 to-amber-50/30 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-800/80 rounded-2xl p-4 sm:p-5 border border-rose-100/80 dark:border-slate-800 flex flex-col justify-between shadow-sm">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0 leading-tight">
                    Mô Phỏng Thu Nhập Thực Tế
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Ước tính theo giờ công &amp; doanh số thực
                  </span>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                Tháng này
              </span>
            </div>

            {earnings && (
              <div className="space-y-3.5">
                {/* CV+ REAL SNAPSHOT & OPPORTUNITY SIMULATION CARD (DATA THẬT ĐỐI CHỨNG) */}
                {cvPlusSnapshot && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-emerald-500/5 dark:from-slate-900 dark:via-indigo-950/20 dark:to-emerald-950/20 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                            <span>Đặc Quyền 🪽 CV · Thanh Lịch &amp; Đối Soát Data Thật</span>
                            <span className="text-[10px] text-slate-400 font-normal">({cvPlusSnapshot.month})</span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {cvPlusSnapshot.staffName} · {cvPlusSnapshot.branchName} · {cvPlusSnapshot.workingDays} ca (
                            {cvPlusSnapshot.workingHours}h)
                          </div>
                        </div>
                      </div>

                      {cvPlusSnapshot.isTargetHit ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>ĐẠT CHUẨN XUẤT SẮC ({(cvPlusSnapshot.selfComboRate * 100).toFixed(1)}% ≥ 20%)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black text-[10px]">
                          <ShieldAlert className="w-3 h-3 text-amber-500" />
                          <span>CHẾ TÀI ÁP DỤNG ({(cvPlusSnapshot.selfComboRate * 100).toFixed(1)}% &lt; 20%)</span>
                        </span>
                      )}
                    </div>

                    {/* Customer Segmentation 3-Column Pill Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Tổng Lượt Khách
                        </div>
                        <div className="text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums">
                          {cvPlusSnapshot.totalOrders}
                        </div>
                        <div className="text-[9px] text-slate-400">Hoàn thành</div>
                      </div>

                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                        <div className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Combo Live</div>
                        <div className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums">
                          {cvPlusSnapshot.comboLiveOrders}
                        </div>
                        <div className="text-[9px] text-slate-400">Khách dặm gói</div>
                      </div>

                      <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-indigo-200/80 dark:border-indigo-800/60">
                        <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">
                          Not Combo Live
                        </div>
                        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {cvPlusSnapshot.notComboLiveOrders}
                        </div>
                        <div className="text-[9px] text-indigo-600/80 dark:text-indigo-400/80 font-bold">
                          Chốt {cvPlusSnapshot.comboSoldCount} combo ({(cvPlusSnapshot.selfComboRate * 100).toFixed(1)}
                          %)
                        </div>
                      </div>
                    </div>

                    {/* Opportunity & Motivation Callout */}
                    {cvPlusSnapshot.isPenalized ? (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-200 text-[11px] leading-relaxed">
                        <div className="font-bold flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Đòn bẩy động lực mở khóa thêm thu nhập:</span>
                        </div>
                        <div className="mt-1">
                          Tỷ lệ chốt combo tháng này đạt {(cvPlusSnapshot.selfComboRate * 100).toFixed(1)}% (chưa chạm
                          ngưỡng tối thiểu 20%). Hệ thống giữ nguyên lương giờ CV · Dịu Dàng (25.000đ/h) và tạm khóa
                          thưởng Combo. Nhân viên vẫn nhận đủ 20% Tip tự chủ (90% tip: +
                          {formatVnd(cvPlusSnapshot.deltaGain)}).
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-200 text-[11px] leading-relaxed">
                        <div className="font-bold flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Xuất sắc vượt chuẩn! Đã mở khóa toàn bộ quyền lợi 🪽 CV · Thanh Lịch:</span>
                        </div>
                        <div className="mt-1">
                          Tỷ lệ chốt combo đạt {(cvPlusSnapshot.selfComboRate * 100).toFixed(1)}% (vượt mốc 20%). Nhân
                          viên nhận đủ +2.000đ/h lương giờ, hưởng 90% tip tự chủ và toàn bộ thưởng Combo bậc thang!
                        </div>
                      </div>
                    )}

                    {/* Side-by-side Table of CV vs CV+ */}
                    <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs">
                      <div className="grid grid-cols-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 dark:border-slate-700">
                        <div>Khoản mục</div>
                        <div className="text-right">CV · Dịu Dàng hiện tại</div>
                        <div className="text-right text-emerald-600 dark:text-emerald-400 font-black">
                          🪽 CV · Thanh Lịch thực nhận
                        </div>
                      </div>

                      <div className="grid grid-cols-3 py-1 items-center">
                        <div className="text-slate-600 dark:text-slate-300 font-medium">
                          Lương giờ ({cvPlusSnapshot.workingHours}h)
                        </div>
                        <div className="text-right tabular-nums text-slate-500">
                          {formatVnd(cvPlusSnapshot.baseWageCv)}
                        </div>
                        <div className="text-right tabular-nums font-bold text-slate-800 dark:text-slate-100">
                          {formatVnd(cvPlusSnapshot.baseWageCvPlus)}
                          {!cvPlusSnapshot.isPenalized && (
                            <span className="text-[10px] text-emerald-500 ml-1">(+2k/h)</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 py-1 items-center">
                        <div className="text-slate-600 dark:text-slate-300 font-medium">Tiền Tip (70% vs 90%)</div>
                        <div className="text-right tabular-nums text-slate-500">{formatVnd(cvPlusSnapshot.tipCv)}</div>
                        <div className="text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          {formatVnd(cvPlusSnapshot.tipCvPlus)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 py-1 items-center">
                        <div className="text-slate-600 dark:text-slate-300 font-medium">
                          Thưởng Combo ({cvPlusSnapshot.comboDetails.length} gói)
                        </div>
                        <div className="text-right tabular-nums text-slate-400">0 đ</div>
                        <div className="text-right tabular-nums font-bold text-purple-600 dark:text-purple-400">
                          {formatVnd(cvPlusSnapshot.comboBonusTotal)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 pt-2 mt-1 border-t border-slate-200 dark:border-slate-700 font-black items-center">
                        <div className="text-slate-800 dark:text-slate-100">TỔNG THU NHẬP</div>
                        <div className="text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {formatVnd(cvPlusSnapshot.totalCvIncome)}
                        </div>
                        <div className="text-right tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatVnd(cvPlusSnapshot.totalCvPlusIncome)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <span>Chênh lệch tăng ròng:</span>
                        <span className="tabular-nums">
                          +{formatVnd(cvPlusSnapshot.deltaGain)} (+{(cvPlusSnapshot.deltaPercentage * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Combo Details */}
                    {cvPlusSnapshot.comboDetails && cvPlusSnapshot.comboDetails.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsComboDetailsExpanded(!isComboDetailsExpanded)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <Gem className="w-3 h-3 text-purple-500" />
                            <span>Xem danh sách {cvPlusSnapshot.comboDetails.length} gói Combo chốt trong tháng</span>
                          </span>
                          {isComboDetailsExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isComboDetailsExpanded && (
                          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                            {cvPlusSnapshot.comboDetails.map((c, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-2 rounded-lg bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 text-[11px]"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="font-bold text-slate-700 dark:text-slate-200 truncate">
                                    {c.comboName}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    Đơn #{c.orderId} · {c.customerName || 'Khách'} · {formatVnd(c.price)}
                                  </div>
                                </div>
                                <span className="font-black text-purple-600 dark:text-purple-400 tabular-nums shrink-0">
                                  +{formatVnd(c.bonus)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Visual Comparative Income Hero Card */}
                <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
                  {/* Side-by-side Comparison */}
                  <div className="grid grid-cols-2 gap-2.5 items-stretch">
                    {/* Current Tier */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                        Hiện tại ({formatCareerRoleName(status.currentRole)})
                      </div>
                      <div className="mt-1">
                        <div className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-200 tabular-nums">
                          {formatVnd(earnings.currentEstimatedIncome)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Lương giờ + 70% Tip</div>
                      </div>
                    </div>

                    {/* Promoted Target Tier */}
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-emerald-500/5 dark:from-emerald-950/40 dark:to-slate-800/80 border border-emerald-500/30 flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-500" />
                          <span>Lên {formatCareerRoleName(status.targetRole)}</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-black leading-none">
                          +{Math.round((totalSimulatedGain / (earnings.currentEstimatedIncome || 1)) * 100)}%
                        </span>
                      </div>
                      <div className="mt-1">
                        <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatVnd(simulatedNextTierIncome)}
                        </div>
                        <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-0.5">
                          Trọn vẹn 4 nguồn thu
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delta Callout Banner */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/25">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Tăng thêm thực nhận:</span>
                    </span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      +{formatVnd(totalSimulatedGain)}
                      <span className="text-[10px] font-normal text-slate-400">/tháng</span>
                    </span>
                  </div>
                </div>

                {/* Level Up Perk Tiers - 4 Trụ Cột Thu Nhập Rõ Ràng */}
                <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs shadow-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                      <Award className="w-3.5 h-3.5" /> Chi tiết 4 nguồn thu nhập tăng thêm:
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Nhận thêm mỗi tháng</span>
                  </div>

                  {/* Cảnh báo chế tài nếu dưới tỷ lệ combo chuẩn tối thiểu */}
                  {isPenaltyActive && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <div>
                        <strong>Chế tài Doanh nghiệp đang áp dụng:</strong> Do mục tiêu combo ({simulatedComboCount}{' '}
                        combo ~ {simulatedComboPct}%) chưa đạt mức tối thiểu {(minSelfComboRate * 100).toFixed(0)}% (~
                        {minComboRequired} combo), hệ thống tạm khóa phần lương giờ tăng thêm (+
                        {formatVnd(hourlyWageNext - hourlyWageCurrent)}/h) và thưởng bán hàng. Nhân viên chỉ được giữ
                        20% tip tư vấn!
                      </div>
                    </div>
                  )}

                  {/* 1. Lương theo giờ */}
                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-blue-500/10 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] text-slate-700 dark:text-slate-200 truncate">
                            Lương theo giờ
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {formatVnd(hourlyWageCurrent)} ➔{' '}
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {formatVnd(hourlyWageNext)}
                            </strong>{' '}
                            <span className="text-emerald-600 font-semibold">
                              (+{formatVnd(hourlyWageNext - hourlyWageCurrent)}/h)
                            </span>
                          </div>
                        </div>
                      </div>
                      {isPenaltyActive ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs whitespace-nowrap">
                          0đ (Tạm khóa)
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black tabular-nums text-xs whitespace-nowrap">
                          +{formatVnd(effectiveWageGain)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pl-8">
                      * Dựa trên {earnings.details.actualWorkingHours || earnings.details.monthlyEstimatedHours || 260}h
                      công thực tế tháng qua của {status.staffName}
                    </div>
                  </div>

                  {/* 2. Tiền tip khách */}
                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-amber-500/10 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                          <Gem className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] text-slate-700 dark:text-slate-200 truncate">
                            Chia tiền tip khách
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {isTargetCvPlusPlus ? (
                              <>
                                Hưởng {((cvReq.tipShareRatio ?? 0.9) * 100).toFixed(0)}% tip mình + 20% tip tư vấn hộ CV
                                khác
                              </>
                            ) : (
                              <>
                                70% ➔{' '}
                                <strong className="text-emerald-600 dark:text-emerald-400">
                                  {(targetTipRatio * 100).toFixed(0)}%
                                </strong>{' '}
                                (Hưởng trọn cả mi + tự tư vấn)
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black tabular-nums text-xs whitespace-nowrap">
                        +{formatVnd(effectiveTipGain + dynamicCrossTipDelta)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pl-8">
                      {isTargetCvPlusPlus
                        ? `* Nhận trọn ${((cvReq.tipShareRatio ?? 0.9) * 100).toFixed(0)}% tip khách mình + 20% tip trên ${sliderCrossOrders} ca tư vấn chéo`
                        : `* Nhận thêm +20% trên tổng tip ${formatVnd(
                            earnings.details.customerTotalTip ||
                              Math.round(
                                (earnings.details.actualTipReceived || earnings.details.monthlyTipAvg || 0) / 0.7
                              )
                          )} của khách`}
                    </div>
                  </div>

                  {/* 3. Thưởng bán dưỡng mi Yeppeum */}
                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-teal-500/10 dark:bg-teal-950/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] text-slate-700 dark:text-slate-200 truncate">
                            Thưởng bán dưỡng mi Yeppeum
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            Bán {sliderSerums} cây/tuần ({sliderSerums * 4} cây/tháng) ×{' '}
                            <strong className="text-teal-600 dark:text-teal-400">
                              {formatVnd(serumOrigBonus)}/cây
                            </strong>
                          </div>
                        </div>
                      </div>
                      {isPenaltyActive ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs whitespace-nowrap">
                          0đ (Tạm khóa)
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black tabular-nums text-xs whitespace-nowrap">
                          +{formatVnd(effectiveSerumGain)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pl-8">
                      * Tiền tươi: Giá gốc {formatVnd(serumOrigBonus)} | Khuyến mãi {formatVnd(serumDiscountBonus)} |
                      Quà tặng 0đ
                    </div>
                  </div>

                  {/* 4. Thưởng hoa hồng combo nối mi */}
                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-md bg-purple-500/10 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                          <Target className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] text-slate-700 dark:text-slate-200 truncate">
                            Thưởng hoa hồng combo
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {simulatedComboCount > 0 ? (
                              <>
                                ~{simulatedComboCount} combo/tháng (~{simulatedComboPct}%) ×{' '}
                                <strong className="text-purple-600 dark:text-purple-400">
                                  {formatVnd(singleComboBonus)}/combo
                                </strong>
                              </>
                            ) : (
                              <>0 combo (Kéo thanh trượt để thử)</>
                            )}
                          </div>
                        </div>
                      </div>
                      {isPenaltyActive ? (
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs whitespace-nowrap">
                          0đ (Tạm khóa)
                        </span>
                      ) : (
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black tabular-nums text-xs whitespace-nowrap">
                          +{formatVnd(effectiveComboGain)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pl-8 flex items-center justify-between gap-1 flex-wrap">
                      <span>* Gói TB 4.5M (+50K/1M trên 4M)</span>
                      <span className="text-purple-600 dark:text-purple-400 font-medium whitespace-nowrap">
                        Chuẩn 🪽 CV · Thanh Lịch: ≥{(minSelfComboRate * 100).toFixed(0)}% (~{minComboRequired} combo)
                      </span>
                    </div>
                  </div>

                  {/* 5. Nếu là CV++: Tư vấn combo chốt hộ cho CV khác */}
                  {isTargetCvPlusPlus && (
                    <div className="p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 hover:border-purple-300 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[11px] text-purple-900 dark:text-purple-200 truncate">
                              Chốt combo hộ cho CV khác
                            </div>
                            <div className="text-[10px] text-purple-700 dark:text-purple-300 truncate">
                              Chốt ~{crossConsultCombos} combo hộ/tháng × {formatVnd(crossComboBonusPerItem)}
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-black tabular-nums text-xs whitespace-nowrap">
                          +{formatVnd(crossConsultComboBonus)}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 pl-8">
                        💖 Chuyên Viên làm mi được chia {(crossConsultCvShareRate * 100).toFixed(0)}% (+
                        {formatVnd(crossConsultCvSharedAmount)}) + nhận đủ 70% tip
                      </div>
                    </div>
                  )}

                  {/* Summary Total Gain */}
                  <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-black text-emerald-800 dark:text-emerald-200 uppercase tracking-tight text-[11px]">
                          Tổng cộng nhận thêm:
                        </div>
                        <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                          Khớp trọn vẹn từng nguồn thu nhập
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight">
                        +{formatVnd(totalSimulatedGain)}
                        <span className="text-xs font-semibold">/tháng</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        (+{Math.round((totalSimulatedGain / (earnings.currentEstimatedIncome || 1)) * 100)}% so với hiện
                        tại)
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
