import { Calendar, CheckCircle2, Headphones, Phone, Smile } from 'lucide-react';
import type { TelesalesMetricKey, TelesalesMetricVisualTheme } from './telesalesFrontFaceTypes';

export const DONUT_RADIUS = 85;
export const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export function getDonutStrokeDashoffset(percent: number): number {
  return DONUT_CIRCUMFERENCE - (percent / 100) * DONUT_CIRCUMFERENCE;
}

export function calculateRatioPercent(value: number, target: number): number {
  return target > 0 ? Math.round((value / target) * 100) : 0;
}

export const METRIC_VISUAL_THEMES: Record<TelesalesMetricKey, TelesalesMetricVisualTheme> = {
  calls: {
    key: 'calls',
    gradId: 'tsCallsGrad',
    rgb: 'rgb(59, 130, 246)',
    gradientStartRgb: 'rgb(59, 130, 246)',
    gradientEndRgb: 'rgb(96, 165, 250)',
    icon: Phone,
    bgGradient: 'from-blue-600 to-cyan-400',
    textColorClass: 'text-[rgb(59,130,246)]',
    dividerColorClass: 'bg-[rgba(59,130,246,0.27)]',
    capsuleShadowClass: 'shadow-[0_0_12px_rgba(59,130,246,0.35)]',
    ringShadowClass: 'shadow-[0_0_15px_rgba(59,130,246,0.21)]',
    cardActiveDarkClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(59,130,246)] bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(255,255,255,0.01))] shadow-[0_10px_25px_-5px_rgba(59,130,246,0.15),0_8px_10px_-6px_rgba(59,130,246,0.15)]',
    cardActiveLightClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(59,130,246)] bg-[linear-gradient(135deg,rgba(59,130,246,0.03),rgb(255,255,255))] shadow-[0_10px_25px_-5px_rgba(59,130,246,0.15),0_8px_10px_-6px_rgba(59,130,246,0.15)]',
    podiumBarDarkClass:
      'bg-[linear-gradient(to_top,rgba(59,130,246,0.08),rgba(59,130,246,0.27))] border-t border-l border-r border-b-0 border-[rgba(59,130,246,0.19)]',
    podiumBarLightClass:
      'bg-[linear-gradient(to_top,rgba(59,130,246,0.03),rgba(59,130,246,0.15))] border-t border-l border-r border-b-0 border-[rgba(59,130,246,0.25)]',
    podiumSelectedShadowClass: 'shadow-[0_-4px_15px_rgba(59,130,246,0.09)]',
  },
  pickups: {
    key: 'pickups',
    gradId: 'tsPickupsGrad',
    rgb: 'rgb(139, 92, 246)',
    gradientStartRgb: 'rgb(139, 92, 246)',
    gradientEndRgb: 'rgb(167, 139, 250)',
    icon: Headphones,
    bgGradient: 'from-purple-600 to-fuchsia-400',
    textColorClass: 'text-[rgb(139,92,246)]',
    dividerColorClass: 'bg-[rgba(139,92,246,0.27)]',
    capsuleShadowClass: 'shadow-[0_0_12px_rgba(139,92,246,0.35)]',
    ringShadowClass: 'shadow-[0_0_15px_rgba(139,92,246,0.21)]',
    cardActiveDarkClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(139,92,246)] bg-[linear-gradient(135deg,rgba(139,92,246,0.08),rgba(255,255,255,0.01))] shadow-[0_10px_25px_-5px_rgba(139,92,246,0.15),0_8px_10px_-6px_rgba(139,92,246,0.15)]',
    cardActiveLightClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(139,92,246)] bg-[linear-gradient(135deg,rgba(139,92,246,0.03),rgb(255,255,255))] shadow-[0_10px_25px_-5px_rgba(139,92,246,0.15),0_8px_10px_-6px_rgba(139,92,246,0.15)]',
    podiumBarDarkClass:
      'bg-[linear-gradient(to_top,rgba(139,92,246,0.08),rgba(139,92,246,0.27))] border-t border-l border-r border-b-0 border-[rgba(139,92,246,0.19)]',
    podiumBarLightClass:
      'bg-[linear-gradient(to_top,rgba(139,92,246,0.03),rgba(139,92,246,0.15))] border-t border-l border-r border-b-0 border-[rgba(139,92,246,0.25)]',
    podiumSelectedShadowClass: 'shadow-[0_-4px_15px_rgba(139,92,246,0.09)]',
  },
  happy: {
    key: 'happy',
    gradId: 'tsHappyGrad',
    rgb: 'rgb(245, 158, 11)',
    gradientStartRgb: 'rgb(245, 158, 11)',
    gradientEndRgb: 'rgb(251, 191, 36)',
    icon: Smile,
    bgGradient: 'from-amber-500 to-orange-400',
    textColorClass: 'text-[rgb(245,158,11)]',
    dividerColorClass: 'bg-[rgba(245,158,11,0.27)]',
    capsuleShadowClass: 'shadow-[0_0_12px_rgba(245,158,11,0.35)]',
    ringShadowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.21)]',
    cardActiveDarkClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(245,158,11)] bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(255,255,255,0.01))] shadow-[0_10px_25px_-5px_rgba(245,158,11,0.15),0_8px_10px_-6px_rgba(245,158,11,0.15)]',
    cardActiveLightClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(245,158,11)] bg-[linear-gradient(135deg,rgba(245,158,11,0.03),rgb(255,255,255))] shadow-[0_10px_25px_-5px_rgba(245,158,11,0.15),0_8px_10px_-6px_rgba(245,158,11,0.15)]',
    podiumBarDarkClass:
      'bg-[linear-gradient(to_top,rgba(245,158,11,0.08),rgba(245,158,11,0.27))] border-t border-l border-r border-b-0 border-[rgba(245,158,11,0.19)]',
    podiumBarLightClass:
      'bg-[linear-gradient(to_top,rgba(245,158,11,0.03),rgba(245,158,11,0.15))] border-t border-l border-r border-b-0 border-[rgba(245,158,11,0.25)]',
    podiumSelectedShadowClass: 'shadow-[0_-4px_15px_rgba(245,158,11,0.09)]',
  },
  booked: {
    key: 'booked',
    gradId: 'tsBookedGrad',
    rgb: 'rgb(249, 115, 22)',
    gradientStartRgb: 'rgb(249, 115, 22)',
    gradientEndRgb: 'rgb(251, 191, 36)',
    icon: Calendar,
    bgGradient: 'from-orange-500 to-amber-500',
    textColorClass: 'text-[rgb(249,115,22)]',
    dividerColorClass: 'bg-[rgba(249,115,22,0.27)]',
    capsuleShadowClass: 'shadow-[0_0_12px_rgba(249,115,22,0.35)]',
    ringShadowClass: 'shadow-[0_0_15px_rgba(249,115,22,0.21)]',
    cardActiveDarkClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(249,115,22)] bg-[linear-gradient(135deg,rgba(249,115,22,0.08),rgba(255,255,255,0.01))] shadow-[0_10px_25px_-5px_rgba(249,115,22,0.15),0_8px_10px_-6px_rgba(249,115,22,0.15)]',
    cardActiveLightClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(249,115,22)] bg-[linear-gradient(135deg,rgba(249,115,22,0.03),rgb(255,255,255))] shadow-[0_10px_25px_-5px_rgba(249,115,22,0.15),0_8px_10px_-6px_rgba(249,115,22,0.15)]',
    podiumBarDarkClass:
      'bg-[linear-gradient(to_top,rgba(249,115,22,0.08),rgba(249,115,22,0.27))] border-t border-l border-r border-b-0 border-[rgba(249,115,22,0.19)]',
    podiumBarLightClass:
      'bg-[linear-gradient(to_top,rgba(249,115,22,0.03),rgba(249,115,22,0.15))] border-t border-l border-r border-b-0 border-[rgba(249,115,22,0.25)]',
    podiumSelectedShadowClass: 'shadow-[0_-4px_15px_rgba(249,115,22,0.09)]',
  },
  done: {
    key: 'done',
    gradId: 'tsDoneGrad',
    rgb: 'rgb(16, 185, 129)',
    gradientStartRgb: 'rgb(16, 185, 129)',
    gradientEndRgb: 'rgb(52, 211, 153)',
    icon: CheckCircle2,
    bgGradient: 'from-emerald-600 to-teal-400',
    textColorClass: 'text-[rgb(16,185,129)]',
    dividerColorClass: 'bg-[rgba(16,185,129,0.27)]',
    capsuleShadowClass: 'shadow-[0_0_12px_rgba(16,185,129,0.35)]',
    ringShadowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.21)]',
    cardActiveDarkClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(16,185,129)] bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.01))] shadow-[0_10px_25px_-5px_rgba(16,185,129,0.15),0_8px_10px_-6px_rgba(16,185,129,0.15)]',
    cardActiveLightClass:
      'border-y-transparent border-r-transparent border-l-[3.5px] border-l-[rgb(16,185,129)] bg-[linear-gradient(135deg,rgba(16,185,129,0.03),rgb(255,255,255))] shadow-[0_10px_25px_-5px_rgba(16,185,129,0.15),0_8px_10px_-6px_rgba(16,185,129,0.15)]',
    podiumBarDarkClass:
      'bg-[linear-gradient(to_top,rgba(16,185,129,0.08),rgba(16,185,129,0.27))] border-t border-l border-r border-b-0 border-[rgba(16,185,129,0.19)]',
    podiumBarLightClass:
      'bg-[linear-gradient(to_top,rgba(16,185,129,0.03),rgba(16,185,129,0.15))] border-t border-l border-r border-b-0 border-[rgba(16,185,129,0.25)]',
    podiumSelectedShadowClass: 'shadow-[0_-4px_15px_rgba(16,185,129,0.09)]',
  },
};

export function getMetricVisualTheme(metricKey: string): TelesalesMetricVisualTheme {
  if (metricKey in METRIC_VISUAL_THEMES) {
    return METRIC_VISUAL_THEMES[metricKey as TelesalesMetricKey];
  }
  return METRIC_VISUAL_THEMES.calls;
}

export const RADIAL_POSITION_CLASSES: readonly string[] = [
  '[transform:translate(-50%,-50%)_translate(0px,-78px)]',
  '[transform:translate(-50%,-50%)_translate(68px,-39px)]',
  '[transform:translate(-50%,-50%)_translate(68px,39px)]',
  '[transform:translate(-50%,-50%)_translate(0px,78px)]',
  '[transform:translate(-50%,-50%)_translate(-68px,39px)]',
  '[transform:translate(-50%,-50%)_translate(-68px,-39px)]',
];

export const PERIOD_POSITION_CLASSES: Record<string, string> = {
  last_month: 'left-[5%]',
  last_week: 'left-[20%]',
  yesterday: 'left-[35%]',
  today: 'left-[65%]',
  this_week: 'left-[80%]',
  this_month: 'left-[95%]',
};

const PAST_PERIOD_IDS = new Set(['yesterday', 'last_week', 'last_month']);

export interface ResolvePeriodDisplayValueParams {
  periodId: string;
  currentMetricKey: string;
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;
  activeMember: SafeAny;
  periodDataMap: SafeAny;
}

export function resolvePeriodDisplayValue({
  periodId,
  currentMetricKey,
  dailyTarget,
  weeklyTarget,
  monthlyTarget,
  activeMember,
  periodDataMap,
}: ResolvePeriodDisplayValueParams): number {
  let periodTarget = monthlyTarget;
  if (periodId === 'today' || periodId === 'yesterday') {
    periodTarget = dailyTarget;
  } else if (periodId === 'this_week' || periodId === 'last_week') {
    periodTarget = weeklyTarget;
  }

  if (!PAST_PERIOD_IDS.has(periodId)) {
    return periodTarget;
  }

  const periodMembers = periodDataMap?.[periodId] || [];
  const memberInPeriod = periodMembers.find(
    (member: SafeAny) => member.id === activeMember?.id || member.initials === activeMember?.id
  );
  return memberInPeriod?.perf?.[currentMetricKey] || 0;
}
