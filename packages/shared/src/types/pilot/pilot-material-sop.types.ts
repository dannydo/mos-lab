// ═══════════════════════════════════════════
// Pilot Material SOP - Hạng mục 3 (MOS-FEAT-164)
// ═══════════════════════════════════════════

export type SopItemReviewStatus = 'PENDING_REVIEW' | 'VERIFIED';
export type SopDraftStatus = 'DRAFT' | 'REVIEWED_BY_EXPERT' | 'APPROVED_SCALE';
export type ToolSanitizationClassification = 'REUSABLE' | 'DISPOSABLE';

// Phần 1: Định mức thuốc uốn & dung dịch phủ bóng
export interface PilotSolutionNormItem {
  id: string;
  materialId?: number | null;
  materialName: string;
  unit: string;
  costPerUnit: number;
  standardDosagePerSession: number;
  costPerSession: number;
  usageInstructions?: string;
  technicalNotes?: string;
  status: SopItemReviewStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

// Phần 2: Quy chuẩn sử dụng keo định hình & trục silicon
export interface PilotGlueRodStandardItem {
  id: string;
  category: 'GLUE' | 'SILICON_ROD' | 'OTHER';
  title: string;
  materialRef?: string;
  selectionCriteria: string;
  standardOperation: string;
  technicalNotes: string;
  commonMistakesToAvoid: string;
  illustrationImageUrl?: string | null;
  status: SopItemReviewStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

// Phần 3: Quy trình khử khuẩn & vệ sinh dụng cụ
export interface PilotSanitizationItem {
  id: string;
  toolName: string;
  classification: ToolSanitizationClassification;
  procedure: string;
  criticalSafetyPoint: string;
  checklistSteps: string[];
  status: SopItemReviewStatus;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
}

// Tổng hợp Hạng mục 3 SOP Document
export interface PilotMaterialSopDocument {
  pilotCode: string;
  overallStatus: SopDraftStatus;
  isPublished: boolean;
  expertReviewer: string;
  projectOwner: string;
  approvalNote?: string;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  updatedAt?: string;

  solutionNorms: PilotSolutionNormItem[];
  glueRodStandards: PilotGlueRodStandardItem[];
  sanitizationProcedures: PilotSanitizationItem[];

  summary: {
    totalNormCostPerSession: number;
    totalItemsCount: number;
    pendingReviewCount: number;
    verifiedCount: number;
  };
}

export interface SavePilotMaterialSopRequest {
  pilotCode?: string;
  overallStatus?: SopDraftStatus;
  isPublished?: boolean;
  expertReviewer?: string;
  projectOwner?: string;
  approvalNote?: string;
  solutionNorms?: PilotSolutionNormItem[];
  glueRodStandards?: PilotGlueRodStandardItem[];
  sanitizationProcedures?: PilotSanitizationItem[];
}

// SOP Technical 7-Step Detailed Model (MOS-FEAT-163)
// ═══════════════════════════════════════════

export interface PilotSopMaterialItem {
  name: string;
  unit: string;
  estimatedAmount?: string;
  purposeNote?: string;
  isDisposable?: boolean;
}

export interface PilotSopCommonError {
  error: string;
  cause?: string;
  remedy: string;
}

export interface PilotSopStepDetail {
  stepOrder: number;
  name: string;
  targetMinutes: number;
  purpose: string;
  instructions: string[];
  materials: PilotSopMaterialItem[];
  qualityCheckpoints: string[];
  commonErrors: PilotSopCommonError[];
  unverifiedNotice?: string | null;
}

export interface PilotStepSampleSession {
  sessionId: number;
  customerName: string;
  technicianName: string;
  sessionDate: string;
  durationSeconds: number;
  status: string;
  note?: string | null;
}

export interface PilotSopStepEmpiricalStat {
  stepOrder: number;
  stepName: string;
  targetMinutes: number;
  totalRecorded: number;
  completedCount: number;
  avgDurationSeconds: number;
  minDurationSeconds: number;
  maxDurationSeconds: number;
  sampleSessions: PilotStepSampleSession[];
}

export interface PilotSopEmpiricalStatsResponse {
  pilotCode: string;
  totalSessionsCount: number;
  stats: PilotSopStepEmpiricalStat[];
}
