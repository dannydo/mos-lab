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
  ChevronRight,
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
  onExpandStaffSelector?: () => void;
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
  onExpandStaffSelector,
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
  const [isExtraPerksExpanded, setIsExtraPerksExpanded] = React.useState<boolean>(false);

  // Dynamic What-If Slider for Tip Rate
  const [sliderTipRate, setSliderTipRate] = React.useState<number>(48.5);

  // Dữ liệu đối soát thực tế CV+ từ Backend Fastify (Single Source of Truth)
  const [cvPlusSnapshot, setCvPlusSnapshot] = React.useState<CvPlusRewardSnapshot | null>(null);
  const [isLoadingCvPlus, setIsLoadingCvPlus] = React.useState<boolean>(false);
  const [isComboDetailsExpanded, setIsComboDetailsExpanded] = React.useState<boolean>(false);

  // ⚡ 120 FPS High-Performance Slider Buffer
  const [localCombo, setLocalCombo] = React.useState<number>(sliderCombo);
  const [localOrders, setLocalOrders] = React.useState<number>(sliderOrders);

  React.useEffect(() => {
    setLocalCombo(sliderCombo);
  }, [sliderCombo]);

  React.useEffect(() => {
    setLocalOrders(sliderOrders);
  }, [sliderOrders]);

  const handleComboChange = React.useCallback(
    (val: number) => {
      setLocalCombo(val);
      React.startTransition(() => {
        setSliderCombo(val);
      });
    },
    [setSliderCombo]
  );

  const handleOrdersChange = React.useCallback(
    (val: number) => {
      setLocalOrders(val);
      React.startTransition(() => {
        setSliderOrders(val);
      });
    },
    [setSliderOrders]
  );

  const comboTooltipFormatter = React.useCallback((val?: number) => `${val ?? 0}% Combo`, []);
  const serumsTooltipFormatter = React.useCallback(
    (val?: number) => `${val ?? 0} cây/tuần (~${(val ?? 0) * 4} cây/tháng)`,
    []
  );
  const ordersTooltipFormatter = React.useCallback((val?: number) => `${val ?? 0} ca / 3 tháng`, []);
  const tipTooltipFormatter = React.useCallback((val?: number) => `${val ?? 0}% Tip thực tế`, []);

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
      const stTip =
        m.staffTipRate ??
        (m.ordersCount ? Math.min(0.65, Math.max(0.2, ((m.totalTip || 0) / (m.ordersCount * 38000)) * 0.45)) : 0.314);
      setSliderTipRate(Number((stTip * 100).toFixed(1)));
    }
  }, [status?.staffId, status?.metrics?.ordersCount, status?.metrics?.totalTip]);

  if (!status) return null;

  const metrics = status.metrics;

  const targetOrders = targetReq.minOrders ?? (isTargetCvPlusPlus ? 350 : 300);
  const targetMaxFix = targetReq.maxFixRate ?? (isTargetCvPlusPlus ? 0.015 : 0.02);
  const minTipRatioAboveShop = targetReq.minTipRatioAboveShop ?? (isTargetCvPlusPlus ? 0.15 : 0.1);
  const minBananaCount = targetReq.minBananaCount ?? (isTargetCvPlusPlus ? 60 : 45);
  const minHappinessIndex = targetReq.minHappinessIndex ?? (isTargetCvPlusPlus ? 0.8 : 0.7);
  const minSelfComboRate = targetReq.minSelfComboRate ?? (isTargetCvPlusPlus ? 0.3 : 0.2);
  const minSelfComboPercent = Math.round(minSelfComboRate * 100);

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
  const isMasterTech = isOrdersPassed && isFixPassed && isTipPassed && isQaPassed && !status?.qualifiedQuests.allPassed;

  // What-If Dynamic Simulation across active interactive sliders
  const isSimOrdersPassed = localOrders >= targetOrders;
  const isSimTipPassed =
    sliderTipRate / 100 >= targetTipRate ||
    (targetTipRate > 0 && sliderTipRate / 100 >= shopTipRate * (1 + minTipRatioAboveShop));
  const isSimComboPassed = localCombo / 100 >= minSelfComboRate;

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
  const requiredComboCount = Math.round((metrics.ordersCount || 0) * (cvReq.minSelfComboRate ?? minSelfComboRate));
  const currentComboCount = metrics.selfComboCount || 0;
  const comboCountGap = Math.max(0, requiredComboCount - currentComboCount);

  // Fix Shield Safety Ratio (100% when fixRate == 0, drops towards 0 as fixRate hits 4%)
  const safetyShieldPercent = Math.max(0, Math.min(100, Math.round((1 - (metrics.fixRate || 0)) * 100)));

  // Detailed monthly income gains per perk
  const hourlyWageNext = cvReq.hourlyWage || earnings?.details?.hourlyWageNext || (isTargetCvPlusPlus ? 29500 : 27500);
  const hourlyWageCurrent = earnings?.details?.hourlyWageCurrent || config.compensation?.hourlyWages?.cv || 25500;
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
  const notComboLiveCustomers = cvPlusSnapshot?.notComboLiveOrders || Math.max(20, Math.round((localOrders / 3) * 0.4));
  const comboLiveCustomers = cvPlusSnapshot?.comboLiveOrders || Math.round((localOrders / 3) * 0.6);

  // Tỷ lệ chốt combo (%) lấy trực tiếp từ cần gạt sliderCombo
  const simulatedComboPct = localCombo;
  // Số combo bán được tương ứng trên khách Not Combo Live (khách có Combo Live bán được cũng cộng dồn vào)
  const simulatedComboCount = Math.round(notComboLiveCustomers * (localCombo / 100));
  const minComboRequired = Math.ceil(notComboLiveCustomers * (minSelfComboPercent / 100));

  // Điều kiện nhận hết thưởng: Bán tối thiểu minSelfComboPercent% Combo trên khách Not Combo Live
  const isComboTargetHit = simulatedComboPct >= minSelfComboPercent;
  const isPenaltyActive = !isComboTargetHit;

  // Tiền combo cá nhân theo slider / bậc thang
  const simulatedPersonalComboBonus = isPenaltyActive ? 0 : simulatedComboCount * singleComboBonus;
  const baseComboCommission = earnings?.details?.comboCommissionCurrent || 0;
  const comboGain = isPenaltyActive ? 0 : Math.max(0, simulatedPersonalComboBonus - baseComboCommission);

  // 1. Lương giờ tăng thêm (+2k/h): Chỉ nhận khi đạt >= minSelfComboPercent% combo
  const effectiveWageGain = isPenaltyActive ? 0 : wageGain;
  // 2. Thưởng dưỡng mi: Chỉ nhận khi đạt >= minSelfComboPercent% combo
  const effectiveSerumGain = isPenaltyActive ? 0 : monthlySerumBonus;
  // 3. Tiền TIP: CV 1 CÁNH VẪN NHẬN 70% + 20% = 90% TIP KỂ CẢ KHI BÁN KHÔNG ĐƯỢC (< minSelfComboPercent%)!
  const effectiveTipGain = tipGain;

  // Khoản tiền thưởng bị mất trắng / khóa do không đạt tối thiểu minSelfComboPercent% combo:
  const lostBonusAmount = isPenaltyActive
    ? wageGain + Math.round(notComboLiveCustomers * (minSelfComboPercent / 100) * singleComboBonus) + monthlySerumBonus
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
  const currentIncome = earnings?.currentEstimatedIncome || earnings?.details?.currentGrossIncome || 13023340;
  const simulatedNextTierIncome = currentIncome + totalSimulatedGain;

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-100/70 dark:border-slate-800 p-5 shadow-sm mb-6 transition-all duration-200">
      {/* Top Banner: Staff Profile & Simulation Controls */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap sm:flex-nowrap">
        {/* Left Side: Avatar + Staff Name + Status Tag + Journey Route */}
        <div className="flex items-center gap-3.5 min-w-0">
          {onExpandStaffSelector && (
            <Tooltip title="Mở rộng danh sách Chuyên Viên (⮞)">
              <button
                type="button"
                onClick={onExpandStaffSelector}
                className="w-8 h-8 rounded-xl border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-300 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
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
        </div>
      </div>

      {/* 🖥️ DESKTOP FHD PANORAMIC 2-COLUMN COCKPIT (What-If on Left, 6 Ải on Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mt-4 items-start">
        {/* LEFT COLUMN: TÂM ĐIỂM QUYỀN LỢI TÀI CHÍNH & BỘ 4 CẦN GẠT WHAT-IF (xl:col-span-7) */}
        <div className="xl:col-span-7 space-y-4">
          {/* 🔥 THE FINANCIAL SUPER-NOVA JACKPOT CARD: TÂM ĐIỂM QUYỀN LỢI TÀI CHÍNH CV 1 CÁNH */}
          <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-amber-950/90 via-slate-900 to-emerald-950/80 border-2 border-amber-500/80 shadow-2xl shadow-amber-500/20 relative overflow-hidden space-y-4 text-white">
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
                      ⚠️ Bị khóa +{formatVnd(lostBonusAmount)} tiền thưởng combo và lương tăng do chưa đạt tối thiểu{' '}
                      {minSelfComboPercent}% combo!
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
                      “⚠️ <strong className="text-rose-300 font-black">Quy tắc 2 Tháng Liền:</strong> CV 1 cánh bán
                      không được vẫn nhận 90% Tip, nhưng không nhận thêm thưởng nào khác. Nếu 2 tháng liền không đạt{' '}
                      {minSelfComboPercent}% combo thì quay lại CV!”
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 🎛️ BỘ 4 CẦN GẠT WHAT-IF TRỰC TIẾP (UNIFIED WHAT-IF COCKPIT) */}
            <div className="space-y-2.5 relative z-10">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Bộ 4 Cần Gạt What-If Trực Tiếp
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    (Kéo thử nghiệm để ải thăng cấp và tiền thưởng nhảy số tức thì)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSliderOrders(metrics.ordersCount || 0);
                    setSliderCombo(Math.round((metrics.selfComboRate || 0.25) * 100));
                    setSliderSerums(defaultSerums);
                    setSliderTipRate(staffTipRatePercent);
                  }}
                  className="text-[10px] text-amber-300 hover:text-white font-bold px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 transition-all cursor-pointer active:scale-95 shadow-2xs flex items-center gap-1"
                  title="Đặt lại tất cả 4 chỉ số về số liệu thực tế của chuyên viên"
                >
                  <span>↺</span>
                  <span>Đặt lại thực tế</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* CẦN GẠT 1: BÁN COMBO (BẮT BUỘC ≥ 20%) */}
                <div
                  className={`p-3 rounded-2xl bg-slate-950/90 border shadow-lg space-y-2 transition-colors duration-150 ${
                    isComboTargetHit
                      ? 'border-emerald-500/70 shadow-emerald-500/5'
                      : 'border-rose-500/80 shadow-rose-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">💎</span>
                      <span className="text-xs font-bold text-white tracking-wide truncate">1. Bán Combo</span>
                    </div>
                    <Tooltip
                      title={
                        <div className="text-[11px] text-slate-300 leading-relaxed space-y-1 p-0.5 max-w-xs">
                          <div className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                            <span>💎</span> Quy tắc Bán Combo (Bắt buộc)
                          </div>
                          <div>
                            • Tính trên tệp{' '}
                            <strong className="text-white">~{notComboLiveCustomers} khách Not Live</strong>.
                          </div>
                          <div>
                            • Tối thiểu đạt <strong className="text-emerald-400">≥ {minSelfComboPercent}%</strong> để mở
                            khóa trọn bộ thưởng và lương tăng.
                          </div>
                          <div>
                            • Dưới {minSelfComboPercent}%: Vẫn bảo lưu 90% Tip (70+20), cắt các khoản thưởng khác.
                          </div>
                          <div className="text-rose-400 font-semibold">
                            • 2 tháng liền không đạt sẽ quay về CV · Dịu Dàng (Tip tụt về 70%).
                          </div>
                        </div>
                      }
                      placement="topRight"
                    >
                      <button
                        type="button"
                        className="w-5 h-5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-700/80 cursor-help transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
                        aria-label="Xem quy tắc và điều kiện Bán Combo"
                      >
                        i
                      </button>
                    </Tooltip>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        isComboTargetHit
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30 animate-pulse'
                      }`}
                    >
                      Bắt buộc ≥ {minSelfComboPercent}%
                    </span>
                    <div className="text-right">
                      <span
                        className={`text-base font-black font-mono tabular-nums ${
                          isComboTargetHit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {localCombo}%
                      </span>
                      <span className="text-[10px] text-slate-400 pl-1 font-normal">
                        (~{simulatedComboCount} combo)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Slider
                      min={0}
                      max={60}
                      step={1}
                      value={localCombo}
                      onChange={handleComboChange}
                      tooltip={{ formatter: comboTooltipFormatter }}
                      className="my-1"
                    />
                    <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                      <span className="text-rose-400 font-bold">0%</span>
                      <span className="text-amber-300 font-bold">{minSelfComboPercent}% (Bắt buộc)</span>
                      <span className="text-emerald-400 font-bold">40%</span>
                      <span className="text-slate-400 font-bold">60%</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-800/80">
                    {isComboTargetHit ? (
                      <>
                        <span className="text-emerald-400 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs"></span>
                          <span>✓ Đạt chuẩn (≥ {minSelfComboPercent}%)</span>
                        </span>
                        <span className="text-slate-400 font-normal text-[9.5px]">Mở khóa trọn bộ thưởng</span>
                      </>
                    ) : (
                      <>
                        <span className="text-rose-400 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                          <span>✕ Thiếu {Math.max(0, minSelfComboPercent - localCombo)}%</span>
                        </span>
                        <span className="text-rose-400/80 font-normal text-[9.5px]">Bảo lưu 90% Tip · Cắt thưởng</span>
                      </>
                    )}
                  </div>
                </div>

                {/* CẦN GẠT 2: BÁN DƯỠNG MI YEPPEUM (KHUYẾN KHÍCH) */}
                <div
                  className={`p-3 rounded-2xl bg-slate-950/90 border shadow-lg space-y-2 transition-colors duration-150 ${
                    isComboTargetHit ? 'border-teal-500/70 shadow-teal-500/5' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">🌿</span>
                      <span className="text-xs font-bold text-white tracking-wide truncate">2. Dưỡng Mi Yeppeum</span>
                    </div>
                    <Tooltip
                      title={
                        <div className="text-[11px] text-slate-300 leading-relaxed space-y-1 p-0.5 max-w-xs">
                          <div className="text-teal-300 font-bold text-xs flex items-center gap-1.5">
                            <span>🌿</span> Quy tắc Dưỡng Mi Yeppeum
                          </div>
                          <div>
                            • Mục tiêu khuyến khích: <strong className="text-white">≥ 1 cây/tuần</strong> (~4
                            cây/tháng).
                          </div>
                          <div>
                            • Tiền tươi trao tay:{' '}
                            <strong className="text-amber-300">{formatVnd(serumOrigBonus)}/cây</strong> giá gốc (
                            {formatVnd(serumDiscountBonus)}/cây KM).
                          </div>
                          <div>• Bán cây nào đút túi ngay cây đó.</div>
                          <div className="text-amber-300 font-semibold">
                            • Điều kiện: Nhận thưởng khi Combo đạt chuẩn ≥ {minSelfComboPercent}%.
                          </div>
                        </div>
                      }
                      placement="topRight"
                    >
                      <button
                        type="button"
                        className="w-5 h-5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-700/80 cursor-help transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
                        aria-label="Xem quy tắc Dưỡng Mi Yeppeum"
                      >
                        i
                      </button>
                    </Tooltip>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 bg-teal-500/15 text-teal-300 border-teal-500/30">
                      Khuyến khích
                    </span>
                    <div className="text-right">
                      <span className="text-base font-black font-mono tabular-nums text-teal-300">
                        {sliderSerums} cây/tuần
                      </span>
                      <span
                        className={`text-[10px] pl-1 font-bold ${
                          isComboTargetHit ? 'text-emerald-400' : 'text-slate-500 line-through'
                        }`}
                      >
                        ({monthlySerumBonus > 0 ? `+${formatVnd(monthlySerumBonus)}/thg` : '0đ'})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Slider
                      min={0}
                      max={10}
                      step={1}
                      value={sliderSerums}
                      onChange={(val) => setSliderSerums(val)}
                      tooltip={{ formatter: serumsTooltipFormatter }}
                      className="my-1"
                    />
                    <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                      <span className="font-bold">0</span>
                      <span className="text-teal-300 font-bold">1 cây (Chuẩn)</span>
                      <span className="text-teal-400 font-bold">2</span>
                      <span className="text-emerald-400 font-bold">4</span>
                      <span className="text-slate-400 font-bold">10 cây</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-800/80">
                    {isComboTargetHit ? (
                      <>
                        <span className="text-teal-300 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                          <span>✓ +{formatVnd(monthlySerumBonus)}/thg</span>
                        </span>
                        <span className="text-slate-400 font-normal text-[9.5px]">{formatVnd(serumOrigBonus)}/cây</span>
                      </>
                    ) : (
                      <>
                        <span className="text-rose-400/90 inline-flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          <span>✕ Tạm khóa (Cần ≥ {minSelfComboPercent}%)</span>
                        </span>
                        <span className="text-slate-500 line-through font-normal text-[9.5px]">
                          +{formatVnd(monthlySerumBonus)}/thg
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* CẦN GẠT 3: SẢN LƯỢNG MI MÔ PHỎNG */}
                <div
                  className={`p-3 rounded-2xl bg-slate-950/90 border shadow-lg space-y-2 transition-colors duration-150 ${
                    isSimOrdersPassed ? 'border-emerald-500/70 shadow-emerald-500/5' : 'border-amber-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-white tracking-wide truncate">3. Sản lượng mi</span>
                    </div>
                    <Tooltip
                      title={
                        <div className="text-[11px] text-slate-300 leading-relaxed space-y-1 p-0.5 max-w-xs">
                          <div className="text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-emerald-400" /> Quy tắc Sản lượng mi
                          </div>
                          <div>
                            • Định mức ải: <strong className="text-white">≥ {targetOrders} bộ / 3 tháng</strong> (~
                            {Math.round(targetOrders / 3)} bộ/tháng).
                          </div>
                          <div>
                            • Số liệu thực tế của chuyên viên:{' '}
                            <strong className="text-amber-300">{metrics.ordersCount || 0} bộ</strong>.
                          </div>
                          <div>• Kéo thanh trượt để thử nghiệm vượt ải 1 và tăng tiền tip.</div>
                        </div>
                      }
                      placement="topRight"
                    >
                      <button
                        type="button"
                        className="w-5 h-5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-700/80 cursor-help transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
                        aria-label="Xem quy tắc sản lượng mi"
                      >
                        i
                      </button>
                    </Tooltip>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        isSimOrdersPassed
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isSimOrdersPassed ? '✓ Đạt định mức' : `Thiếu ${Math.max(0, targetOrders - localOrders)}`}
                    </span>
                    <div className="text-right">
                      <span className="text-base font-black font-mono tabular-nums text-emerald-400">
                        {localOrders} bộ
                      </span>
                      {localOrders !== (metrics.ordersCount || 0) && (
                        <span className="text-[9px] text-amber-400 pl-1 font-normal">
                          (Thực: {metrics.ordersCount || 0})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Slider
                      min={100}
                      max={500}
                      step={5}
                      value={localOrders}
                      onChange={handleOrdersChange}
                      tooltip={{ formatter: ordersTooltipFormatter }}
                      className="my-1"
                    />
                    <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                      <span>100</span>
                      <span className={`font-bold ${isSimOrdersPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {targetOrders} bộ (Chuẩn)
                      </span>
                      <span>500 bộ</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span
                      className={`inline-flex items-center gap-1.5 ${isSimOrdersPassed ? 'text-emerald-400' : 'text-amber-400'}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isSimOrdersPassed ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      ></span>
                      <span>
                        {isSimOrdersPassed
                          ? '✓ Đạt chuẩn Ải 1'
                          : `⚡ Thiếu ${Math.max(0, targetOrders - localOrders)} bộ`}
                      </span>
                    </span>
                    <span className="text-slate-400 font-normal text-[9.5px]">Định mức 3 tháng</span>
                  </div>
                </div>

                {/* CẦN GẠT 4: TỶ LỆ TIP DỰ PHÓNG */}
                <div
                  className={`p-3 rounded-2xl bg-slate-950/90 border shadow-lg space-y-2 transition-colors duration-150 ${
                    isSimTipPassed ? 'border-indigo-500/70 shadow-indigo-500/5' : 'border-amber-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <HandCoins className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-xs font-bold text-white tracking-wide truncate">4. Tỷ lệ Tip</span>
                    </div>
                    <Tooltip
                      title={
                        <div className="text-[11px] text-slate-300 leading-relaxed space-y-1 p-0.5 max-w-xs">
                          <div className="text-indigo-300 font-bold text-xs flex items-center gap-1.5">
                            <HandCoins className="w-3.5 h-3.5 text-indigo-400" /> Quy tắc Tỷ lệ Tip
                          </div>
                          <div>
                            • Chuẩn chi nhánh: <strong className="text-white">≥ {targetTipRatePercent}%</strong> (Điều
                            răn TIP-001).
                          </div>
                          <div>
                            • Thực tế của chuyên viên:{' '}
                            <strong className="text-indigo-300">{staffTipRatePercent}%</strong>.
                          </div>
                          <div>• Ăn trọn 90% Tip (70% mi + 20% tư vấn) khi lên CV 1 cánh.</div>
                        </div>
                      }
                      placement="topRight"
                    >
                      <button
                        type="button"
                        className="w-5 h-5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-700/80 cursor-help transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
                        aria-label="Xem quy tắc tỷ lệ tip"
                      >
                        i
                      </button>
                    </Tooltip>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${
                        isSimTipPassed
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isSimTipPassed ? '✓ Đạt chuẩn' : '⚡ Chưa đạt'}
                    </span>
                    <div className="text-right">
                      <span className="text-base font-black font-mono tabular-nums text-indigo-400">
                        {sliderTipRate.toFixed(1)}%
                      </span>
                      {Math.abs(sliderTipRate - staffTipRatePercent) > 0.1 && (
                        <span className="text-[9px] text-amber-400 pl-1 font-normal">
                          (Thực: {staffTipRatePercent}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Slider
                      min={10}
                      max={90}
                      step={0.5}
                      value={sliderTipRate}
                      onChange={(val) => setSliderTipRate(Number(val.toFixed(1)))}
                      tooltip={{ formatter: tipTooltipFormatter }}
                      className="my-1"
                    />
                    <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                      <span>10%</span>
                      <span className={`font-bold ${isSimTipPassed ? 'text-indigo-400' : 'text-amber-400'}`}>
                        ≥{targetTipRatePercent}% (Chuẩn)
                      </span>
                      <span>90%</span>
                    </div>
                  </div>

                  <div className="text-[10px] font-bold flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span
                      className={`inline-flex items-center gap-1.5 ${isSimTipPassed ? 'text-indigo-400' : 'text-amber-400'}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isSimTipPassed ? 'bg-indigo-400' : 'bg-amber-400'}`}
                      ></span>
                      <span>{isSimTipPassed ? '✓ Đạt chuẩn Ải 3' : '⚡ Chưa đạt mốc chi nhánh'}</span>
                    </span>
                    <span className="text-slate-400 font-normal text-[9.5px]">Bảo lưu 90% Tip</span>
                  </div>
                </div>
              </div>
            </div>

            {/* HEAD-TO-HEAD BEFORE VS AFTER COMPARISON */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10 text-xs">
              {/* BEFORE: CV Dịu Dàng (Hiện Tại) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 opacity-85">
                {/* ROW 1: Title on left, FIXED (i) at top-right */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-400 flex items-center gap-1.5 text-xs">
                    <span>🛑</span> CV · Dịu Dàng (Hiện Tại - 0 Cánh)
                  </span>
                  <Tooltip
                    title={
                      <div className="text-[11px] text-slate-300 leading-relaxed space-y-1 p-0.5 max-w-xs">
                        <div className="text-slate-200 font-bold text-xs flex items-center gap-1.5">
                          <span>🛑</span> Cấp bậc CV · Dịu Dàng (Hiện Tại)
                        </div>
                        <div>• Tỷ lệ Tip: Nhận 70% Tip do khách cho (bị trừ 30%).</div>
                        <div>• Quyền tư vấn: Phụ thuộc lễ tân/sảnh xếp lịch và tư vấn combo.</div>
                        <div>• Lương giờ: {formatVnd(hourlyWageCurrent)} / giờ.</div>
                      </div>
                    }
                    placement="topRight"
                  >
                    <button
                      type="button"
                      className="w-5 h-5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-700/80 cursor-help transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
                      aria-label="Xem quy tắc CV Dịu Dàng"
                    >
                      i
                    </button>
                  </Tooltip>
                </div>
                {/* ROW 2: Badge on left, Level description on right */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
                    0 Cánh
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Mức cơ bản</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li className="flex justify-between">
                    <span className="text-slate-400">• Tỷ lệ Tip khách cho:</span>
                    <strong className="text-slate-300">
                      70% Tip{' '}
                      {earnings?.details?.actualTipReceived
                        ? `(${formatVnd(earnings.details.actualTipReceived)})`
                        : '(bị trừ 30%)'}
                    </strong>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">• Quyền chốt Combo:</span>
                    <strong className="text-rose-400">Không có (phụ thuộc sảnh)</strong>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">• Lương giờ ca làm:</span>
                    <strong className="text-slate-300">{formatVnd(hourlyWageCurrent)} / giờ</strong>
                  </li>
                </ul>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tổng thu nhập thực tế:</span>
                  <div className="text-right">
                    <strong className="text-slate-200 text-sm font-black tabular-nums">
                      ~{formatVnd(currentIncome)}
                    </strong>
                    {earnings?.details?.currentNetIncome ? (
                      <div className="text-[10px] text-slate-400 font-normal tabular-nums">
                        ({formatVnd(earnings.details.currentNetIncome)} thực lãnh)
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* AFTER: 🪽 CV · Thanh Lịch (Sau Thăng Cấp 1 Cánh) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-950 to-emerald-950/50 border-2 border-emerald-500/80 shadow-lg space-y-2">
                {/* ROW 1: Title on left, FIXED (i) at top-right */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-emerald-300 flex items-center gap-1.5 text-xs">
                    <span>👑</span> <WingRoleLabel text="🪽 CV" /> · Thanh Lịch (1 Cánh Tự Chủ)
                  </span>
                  <Tooltip
                    title={
                      <div className="text-[11px] text-slate-300 leading-relaxed space-y-1 p-0.5 max-w-xs">
                        <div className="text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                          <span>👑</span> Đặc quyền 🪽 CV · Thanh Lịch (1 Cánh Tự Chủ)
                        </div>
                        <div>• Ăn trọn 90% TIP (70% mi + 20% tư vấn).</div>
                        <div>• Độc quyền tự chốt Combo Not Live nhận thưởng bậc thang.</div>
                        <div>• Tăng lương giờ lên 27.500đ / giờ (+2.000đ/h).</div>
                        <div>• Thưởng Dưỡng mi Yeppeum: 100k/cây giá gốc (50k KM).</div>
                      </div>
                    }
                    placement="topRight"
                  >
                    <button
                      type="button"
                      className="w-5 h-5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white inline-flex items-center justify-center text-[10px] font-mono font-bold border border-slate-700/80 cursor-help transition-all hover:scale-110 active:scale-95 shadow-xs shrink-0"
                      aria-label="Xem đặc quyền CV 1 Cánh"
                    >
                      i
                    </button>
                  </Tooltip>
                </div>
                {/* ROW 2: Badge on left, Level reward tag on right */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-emerald-500/30">
                  <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                    1 Cánh Tự Chủ
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
                      <span className="text-rose-400 font-bold">0đ (Khóa do &lt;{minSelfComboPercent}%)</span>
                    )}
                  </li>
                  <li className="flex justify-between">
                    <span className="text-emerald-300/90">• Tăng lương giờ (27.500đ/h):</span>
                    {isComboTargetHit ? (
                      <strong className="text-emerald-300 font-bold tabular-nums">
                        +{formatVnd(effectiveWageGain)} / thg
                      </strong>
                    ) : (
                      <span className="text-rose-400 font-bold">0đ (Khóa do &lt;{minSelfComboPercent}%)</span>
                    )}
                  </li>
                  <li className="flex justify-between">
                    <span className="text-emerald-300/90">• Thưởng Dưỡng mi & Chuối:</span>
                    {isComboTargetHit ? (
                      <strong className="text-emerald-300 font-bold tabular-nums">
                        +{formatVnd(effectiveSerumGain)} / thg
                      </strong>
                    ) : (
                      <span className="text-rose-400 font-bold">0đ (Khóa do &lt;{minSelfComboPercent}%)</span>
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
        </div>

        {/* RIGHT COLUMN: TIẾN TRÌNH 6 ẢI THĂNG CẤP (xl:col-span-5) */}
        <div className="xl:col-span-5 space-y-4">
          {/* HERO GAMIFIED LEVEL XP PROGRESS BAR & 6-QUEST CHECKPOINTS */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/95 dark:bg-slate-950 border border-slate-800 shadow-md relative overflow-hidden text-white">
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
                        <CheckCircle2 className="w-3.5 h-3.5" /> Xuất sắc vượt qua toàn bộ 6 ải! Sẵn sàng duyệt thăng
                        hạng.
                      </span>
                    ) : (
                      <span>
                        Còn thiếu <strong className="text-amber-400 font-bold">{6 - passedQuestsCount} ải</strong> để
                        nhận danh hiệu{' '}
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

            {/* 6 QUESTS PROGRESSION CARDS */}
            <div className="relative z-10 space-y-2.5 mt-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 pb-1">
                <span className="flex items-center gap-1.5">
                  <span>📋 TIẾN TRÌNH 6 ẢI THĂNG CẤP</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-300 font-bold border border-pink-500/25">
                    {passedQuestsCount}/6 ải đạt
                  </span>
                </span>
                <span className="text-[10px] text-pink-400 font-normal">
                  {isTargetCvPlusPlus ? 'Đạt chuẩn CV++' : 'Cần vượt tối thiểu 4 ải cốt lõi'}
                </span>
              </div>
              {/* Card 1: 300 Ca / 3 Tháng */}
              {(gateFilter === 'ALL' ||
                (gateFilter === 'PASSED' && isSimOrdersPassed) ||
                (gateFilter === 'UNPASSED' && !isSimOrdersPassed)) && (
                <div
                  id="gate-card-1"
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                    isSimOrdersPassed
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
                        <Eye
                          className={`w-4 h-4 shrink-0 ${isSimOrdersPassed ? 'text-emerald-400' : 'text-amber-400'}`}
                        />
                        <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                          1. {targetOrders} bộ mi / 3 tháng
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSimOrdersPassed ? (
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
                        {localOrders} <span className="text-xs font-normal text-slate-400">/ {targetOrders} bộ</span>
                        {localOrders !== (metrics.ordersCount || 0) && (
                          <span className="text-[10px] font-normal text-amber-400 ml-1.5">
                            (Thực tế: {metrics.ordersCount || 0} bộ)
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-bold tabular-nums ${
                          isSimOrdersPassed ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {Math.min(100, Math.round((localOrders / targetOrders) * 100))}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <Progress
                      percent={Math.min(100, Math.round((localOrders / targetOrders) * 100))}
                      size="small"
                      showInfo={false}
                      status={isSimOrdersPassed ? 'success' : 'normal'}
                      className="m-0 mt-0.5"
                    />

                    {/* Collapsed quick hint */}
                    {!expandedGates.includes(1) && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                        <span className="truncate">
                          {isSimOrdersPassed
                            ? '✓ Đã đạt định mức'
                            : `⚡ Còn thiếu ${Math.max(0, targetOrders - localOrders)} bộ mi nữa`}
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
                        <span className="tabular-nums font-semibold text-slate-300">
                          {safetyShieldPercent}% an toàn
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card 3: Tip > 10% TB Shop */}
              {(gateFilter === 'ALL' ||
                (gateFilter === 'PASSED' && isSimTipPassed) ||
                (gateFilter === 'UNPASSED' && !isSimTipPassed)) && (
                <div
                  id="gate-card-3"
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                    isSimTipPassed
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
                        <HandCoins
                          className={`w-4 h-4 shrink-0 ${isSimTipPassed ? 'text-emerald-400' : 'text-amber-400'}`}
                        />
                        <span className="font-bold text-xs sm:text-sm text-slate-100 truncate">
                          3. Tip &gt; {(minTipRatioAboveShop * 100).toFixed(0)}% TB {branchName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSimTipPassed ? (
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
                        {sliderTipRate.toFixed(1)}%{' '}
                        <span className="text-xs font-normal text-slate-400">(chuẩn ≥ {targetTipRatePercent}%)</span>
                        {Math.abs(sliderTipRate - staffTipRatePercent) > 0.1 && (
                          <span className="text-[10px] font-normal text-amber-400 ml-1.5">
                            (Thực tế: {staffTipRatePercent}%)
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[11px] font-bold tabular-nums ${
                          isSimTipPassed ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {Math.min(100, Math.round((sliderTipRate / targetTipRatePercent) * 100))}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <Progress
                      percent={Math.min(100, Math.round((sliderTipRate / targetTipRatePercent) * 100))}
                      size="small"
                      showInfo={false}
                      status={isSimTipPassed ? 'success' : 'normal'}
                      className="m-0 mt-0.5"
                    />

                    {/* Collapsed quick hint */}
                    {!expandedGates.includes(3) && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-0.5">
                        <span className="truncate">
                          {isSimTipPassed
                            ? `✓ Đạt chuẩn (Dự phóng: ${sliderTipRate.toFixed(1)}%)`
                            : `⚡ Chưa đạt mốc (Dự phóng: ${sliderTipRate.toFixed(1)}% · Chuẩn: ≥${targetTipRatePercent}%)`}
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
                          <span className="text-emerald-400 font-extrabold tabular-nums">
                            ≥ {targetTipRatePercent}%
                          </span>
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
                          {isTipPassed
                            ? `✓ Vượt chuẩn (+${tipExcessPercent}%)`
                            : `⚡ Thiếu ${tipGapPercent}% để đạt chuẩn`}
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
                        <span className="text-xs font-normal text-slate-400">
                          (chuẩn ≥ {minBananaCount} Chuối / 90N)
                        </span>
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
                          <div className="text-amber-400 font-bold text-xs mt-0.5 tabular-nums">
                            {bananaCount} Chuối
                          </div>
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
                        * Chỉ đếm chuối từ thiên thần khác tặng lúc check-in (loại trừ tự tặng &amp; checkout). Định mức
                        ~15 chuối/tháng.
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span className="truncate">
                          {isBananaPassed
                            ? `✓ Đạt chuẩn ≥ ${minBananaCount} chuối trong tháng hoàn tất`
                            : `⚡ Còn thiếu ${Math.max(0, minBananaCount - bananaCount)} chuối trong tháng hoàn tất`}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-300">
                          1T ≥ {minBananaCount}
                        </span>
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

            {/* INTEGRATED ACTION FOOTER */}
            <div className="relative z-10 pt-3.5 border-t border-slate-800 flex items-center justify-between gap-4 flex-wrap mt-4">
              <div>
                <div className="text-xs sm:text-sm font-black text-white">
                  {status.staffName}: {formatCareerRoleName(status.currentRole)} ➔{' '}
                  {formatCareerRoleName(status.targetRole)}
                </div>
                <div className="text-[10px] text-amber-400 font-mono mt-0.5">
                  {status.qualifiedQuests.allPassed
                    ? `🎉 Đã đạt toàn bộ 6 ải! Sẵn sàng duyệt thăng cấp lên ${formatCareerRoleName(status.targetRole)}.`
                    : isMasterTech
                      ? '⭐ Đề xuất nhánh Master Tech: Đạt 4/4 tiêu chí kỹ thuật tay nghề.'
                      : `Đã đạt ${passedQuestsCount}/6 ải cốt lõi · Cần hoàn thành các ải còn lại để mở khóa duyệt thăng cấp.`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {status.status !== 'TRIAL_GATE' && !status.qualifiedQuests.allPassed && (
                  <Tooltip
                    title={
                      !isQaPassed
                        ? hasFailedQa
                          ? 'Không thể mở ải: Chuyên Viên có bài kiểm tra QA/QC tác phong hoặc phòng mi bị FAILED'
                          : 'Không thể mở ải: Chuyên Viên phải mời QA/QC kiểm tra định kỳ ít nhất 1 lần/tuần'
                        : undefined
                    }
                  >
                    <span>
                      <button
                        type="button"
                        onClick={onActivateTrial}
                        disabled={loadingAction || !isQaPassed}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Mở Ải Trùm Cuối (30 Ngày)
                      </button>
                    </span>
                  </Tooltip>
                )}

                {status.qualifiedQuests.allPassed && (
                  <button
                    type="button"
                    onClick={onPromote}
                    disabled={loadingAction}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-pink-500 via-rose-500 to-emerald-500 text-white shadow-md shadow-pink-500/25 hover:opacity-95 transition-all cursor-pointer animate-pulse"
                  >
                    🎉 Duyệt Thăng Hạng {formatCareerRoleName(status.targetRole)}
                  </button>
                )}

                {isMasterTech && (
                  <button
                    type="button"
                    onClick={onSwitchSpecialist}
                    disabled={loadingAction}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                  >
                    ⭐ Chuyển Nhánh Master Tech
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
