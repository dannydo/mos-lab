// ═══════════════════════════════════════════
// Pilot Lash Assessment Criteria & Results
// ═══════════════════════════════════════════

export interface PilotAssessmentCriterion {
  id: number;
  pilotCode: string;
  name: string;
  description?: string | null;
  stepOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePilotAssessmentCriterionRequest {
  pilotCode?: string;
  name: string;
  description?: string | null;
  stepOrder?: number;
}

export interface UpdatePilotAssessmentCriterionRequest {
  name?: string;
  description?: string | null;
  stepOrder?: number;
  isActive?: boolean;
}

export interface ReorderPilotAssessmentCriteriaRequest {
  pilotCode?: string;
  criteriaIds: number[];
}

export interface PilotCriterionEvaluation {
  criterionId: number;
  name: string;
  passed: boolean;
  note?: string;
}

export interface SavePilotAssessmentRequest {
  result: 'PASS' | 'FAIL';
  reason?: string | null;
  notes?: string | null;
  criteriaSnapshot?: PilotCriterionEvaluation[];
  aiAssessment?: PilotAiAssessment | null;
}

// ═══════════════════════════════════════════
// AI Lash Assessment Types (MOS-FEAT-66)
// ═══════════════════════════════════════════

export type PilotAiSuitability = 'PASS' | 'CAUTION' | 'NOT_SUITABLE';

export interface PilotLashProfile {
  summary: string;
  estimatedThickness?: string; // e.g. "0.08mm - 0.10mm (Sợi vừa)"
  cuticleCondition?: string; // e.g. "Biểu bì keratin nguyên bản, độ đàn hồi tốt"
  lengthAssessment?: string; // e.g. "7 - 9mm (Đủ chuẩn uốn cong)"
  densityAssessment?: string; // e.g. "Mật độ đều (~85-95 sợi/mắt)"
}

export interface PilotAiAssessmentRecommendation {
  action: string;
  solution1DurationMinutes?: number | null; // Thuốc 1 (Làm mềm): X phút
  solution2DurationMinutes?: number | null; // Thuốc 2 (Tạo form): Y phút
  recommendedRodSize?: string | null; // Size trục uốn: S, M, M1, M2, L
  alternativeCare?: string | null; // Giải pháp thay thế nếu NOT_SUITABLE
}

export interface PilotAiAssessment {
  lashProfile: PilotLashProfile;
  suitability: PilotAiSuitability;
  suitabilityScore?: number; // 0 - 100
  riskAttention: string;
  recommendation: PilotAiAssessmentRecommendation;
  analyzedAt: string;
  photoUrl?: string | null;
  method?: 'MACRO_15X' | 'STANDARD';
  modelUsed?: string;
}

export interface PilotAiAnalyzeRequest {
  photoUrl?: string;
  photoBase64?: string;
  criteriaSnapshot?: PilotCriterionEvaluation[];
  technicianNotes?: string;
  captureMethod?: 'MACRO_15X' | 'STANDARD';
}
