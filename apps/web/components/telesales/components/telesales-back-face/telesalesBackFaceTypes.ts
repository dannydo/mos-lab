export type TelesalesBackThemeMode = 'light' | 'dark';

export interface TelesalesPoint2D {
  x: number;
  y: number;
}

export interface TelesalesBackFaceProps {
  themeMode: TelesalesBackThemeMode;
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
  podiumOrderBack: SafeAny[];
  remainingBack: SafeAny[];
  isRadialOpen: boolean;
  loading: boolean;
  isAdmin: boolean;
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
  dataPoints: SafeAny[];
  activeMemberTargets: SafeAny;
}
