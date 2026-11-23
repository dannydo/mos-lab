import type { PilotSession } from '@mos-lab/shared';

export interface PilotSafetyRiskSopDetailProps {
  onBack?: () => void;
  sessions?: PilotSession[];
  onOpenSessionFlow?: (session: PilotSession) => void;
}

export type SafetyRiskTabKey = 'overview' | 'part1' | 'part2' | 'part3' | 'draft';

export type FollowUpMilestone = '24h' | '48h' | '72h';

// -------------------------------------------------------------
// PHẦN 1 DATA TYPES: QUY TẮC BẢO VỆ NIÊM MẠC MẮT
// -------------------------------------------------------------
export interface SafetyStageRule {
  id: string;
  stage: 'BEFORE' | 'DURING' | 'AFTER';
  stageName: string;
  stageTiming: string;
  title: string;
  description: string;
  actions: string[];
  warningNote?: string;
}

export interface SafetyControlPoint {
  id: string;
  code: string;
  name: string;
  standard: string;
  tolerance: string;
  inspectionTool: string;
  checked?: boolean;
}

export interface SafetyAttachment {
  id: string;
  name: string;
  category: string;
  format: string;
  uploadDate: string;
  uploadedBy: string;
  description: string;
  url?: string;
}

// -------------------------------------------------------------
// PHẦN 2 DATA TYPES: NHẬN DIỆN & XỬ LÝ PHẢN ỨNG NHẠY CẢM
// -------------------------------------------------------------
export interface SensitiveReactionCase {
  id: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  severityLabel: string;
  severityColor: string;
  name: string;
  recognitionSigns: string[];
  preventionMeasures: string[];
  clinicalTreatment: string[];
  escalationRequired: boolean;
  expertConfirmed: boolean;
}

// -------------------------------------------------------------
// PHẦN 3 DATA TYPES: BIÊN BẢN SỰ CỐ & CHĂM SÓC BỔ SUNG
// -------------------------------------------------------------
export interface IncidentFollowUpRecord {
  recordedAt: string;
  condition: string;
  note: string;
}

export type IncidentType = 'STINGING_MILD' | 'IRRITATION_MODERATE' | 'ALLERGIC_SEVERE' | 'TECHNICAL_OTHER';

export type IncidentStatus = 'INVESTIGATING' | 'STABILIZED' | 'RESOLVED' | 'TRANSFERRED_MEDICAL';

export interface IncidentReport {
  id: string;
  code: string;
  incidentTime: string;
  sessionId?: number;
  sessionCode?: string;
  customerName: string;
  customerPhone: string;
  technicianName: string;
  incidentType: IncidentType;
  incidentTypeLabel: string;
  description: string;
  immediateAction: string;
  status: IncidentStatus;
  followUp24h?: IncidentFollowUpRecord;
  followUp48h?: IncidentFollowUpRecord;
  followUp72h?: IncidentFollowUpRecord;
  compensationNote?: string;
}

export interface PilotSafetyStats {
  totalPilotSessions: number;
  incidentsCount: number;
  safetyRate: string;
  zeroIncidents: boolean;
}

export interface IncidentFormValues {
  incidentTime: string;
  technicianName: string;
  customerName: string;
  customerPhone?: string;
  incidentType: IncidentType;
  sessionId?: number;
  description: string;
  immediateAction: string;
  status?: IncidentStatus;
  followUp24h?: string;
  compensationNote?: string;
}

export interface AttachmentFormValues {
  name: string;
  category?: string;
  format?: string;
  uploadedBy?: string;
  description?: string;
}

export interface StageRuleFormValues {
  title: string;
  description: string;
  actions: string | string[];
  warningNote?: string;
}

export interface SensitiveCaseFormValues {
  name: string;
  recognitionSigns: string | string[];
  preventionMeasures: string | string[];
  clinicalTreatment: string | string[];
}
