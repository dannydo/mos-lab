export type LashServiceMode = 'normal_clean' | 'normal_removal' | 'retain';
export type SpeedRating = 'fast' | 'normal' | 'slow';
export type ModelLayer = 1 | 2 | 3;
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface CvSpeedProfile {
  id?: number;
  staffId: number;
  staffName?: string | null;
  avatarUrl?: string | null;
  lashStyle: string;
  serviceMode: LashServiceMode | string;
  lashCount: number;
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  totalMinutes: number;
  modelLayer: ModelLayer;
  sampleSize: number;
  confidence: ConfidenceLevel;
  regA?: number | null;
  regB?: number | null;
  regRSquared?: number | null;
  benchmarkTotalMinutes?: number | null;
  speedDeltaPercent?: number | null;
  speedRating: SpeedRating;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CvSpeedMatrixCell {
  totalMinutes: number;
  speedRating: SpeedRating;
  modelLayer: ModelLayer;
  sampleSize: number;
  confidence: ConfidenceLevel;
}

export interface CvSpeedMatrixRow {
  staffId: number;
  staffName: string;
  avatarUrl?: string | null;
  profiles: Record<string, CvSpeedMatrixCell>;
}

export interface CvSpeedMatrix {
  data: CvSpeedMatrixRow[];
  lashStyles: string[];
  lashCounts: number[];
}

export interface CvSpeedRanking {
  rank: number;
  staffId: number;
  staffName: string;
  avatarUrl?: string | null;
  predictedTime: number;
  sampleSize: number;
  confidence: ConfidenceLevel;
  speedRating: SpeedRating;
  trend: 'improving' | 'declining' | 'stable';
}

export interface CvSpeedCaseDetail {
  orderId: number;
  date: string;
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
  cleaningMinutes: number;
  extensionMinutes: number;
  prepQcMinutes: number;
  totalMinutes: number;
}

export interface CvSpeedMonthlyTrend {
  month: string;
  avgTotalMinutes: number;
  benchmarkMinutes: number;
  speedDeltaPercent?: number;
  caseCount?: number;
}

export type CvSpeedTrend = CvSpeedMonthlyTrend;

export interface CvSpeedDetail {
  staffId: number;
  staffName: string;
  avatarUrl?: string | null;
  totalCases: number;
  avgSpeedVsBenchmarkPercent: number;
  overallScore: number;
  phaseBreakdown: {
    cleaning: number;
    extension: number;
    prepQc: number;
  };
  recentCases: CvSpeedCaseDetail[];
  monthlyTrend: CvSpeedMonthlyTrend[];
}

export interface CvSpeedPrediction {
  staffId: number;
  lashStyle: string;
  serviceMode: LashServiceMode;
  lashCount: number;
  predictedMinutes: {
    cleaning: number;
    extension: number;
    prepQc: number;
    total: number;
  };
  modelLayer: ModelLayer;
  sampleSize: number;
  confidence: ConfidenceLevel;
  regA?: number | null;
  regB?: number | null;
  regRSquared?: number | null;
  benchmarkMinutes: number;
  speedDeltaPercent?: number | null;
  speedRating: SpeedRating;
}

export interface CvSpeedSeedResult {
  success: boolean;
  profilesProcessed: number;
  cvsCount: number;
  timestamp: string;
}

export interface CvSpeedSeedStatus {
  totalProfiles: number;
  activeStaffCount: number;
  lastUpdatedAt: string | null;
  isSeeded: boolean;
}

export interface CvSpeedStyles {
  lashStyles: string[];
  lashCounts: number[];
  serviceModes: LashServiceMode[];
  benchmarksCount: number;
}
