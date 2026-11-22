import type { LucideIcon } from 'lucide-react';

export type TelesalesThemeMode = 'light' | 'dark';

export type TelesalesMetricKey = 'calls' | 'pickups' | 'happy' | 'booked' | 'done';

export interface TelesalesFrontFaceProps {
  themeMode: TelesalesThemeMode;
  currentMemberId: string;
  currentPeriodId: string;
  currentMetricKey: string;
  activeMember: SafeAny;
  activePerformance: SafeAny;
  activePercent: number;
  activeLevelIdx: number;
  activePreset: SafeAny;
  dailyTarget: number;
  weeklyTarget: number;
  monthlyTarget: number;
  podiumOrder: SafeAny[];
  remaining: SafeAny[];
  isRadialOpen: boolean;
  loading: boolean;
  isAdmin: boolean;
  activeValue: number;
  activeTarget: number;
  onClose: () => void;
  setIsFlipped: (flipped: boolean) => void;
  setIsConfigOpen: (open: boolean) => void;
  setIsRadialOpen: (open: boolean) => void;
  setCurrentPeriodId: (periodId: string) => void;
  setCurrentMetricKey: (metricKey: string) => void;
  setCurrentMemberId: (memberId: string) => void;
  handleUpdateLevel: (levelIdx: number) => void;
  getMemberTarget: (memberId: string, periodId: string) => SafeAny;
  periodDataMap: SafeAny;
  activeMemberTargets: SafeAny;
}

export interface TelesalesMetricVisualTheme {
  key: TelesalesMetricKey;
  gradId: string;
  rgb: string;
  gradientStartRgb: string;
  gradientEndRgb: string;
  icon: LucideIcon;
  bgGradient: string;
  textColorClass: string;
  dividerColorClass: string;
  capsuleShadowClass: string;
  ringShadowClass: string;
  cardActiveDarkClass: string;
  cardActiveLightClass: string;
  podiumBarDarkClass: string;
  podiumBarLightClass: string;
  podiumSelectedShadowClass: string;
}
