export type PilotFollowUpStatus = 'PENDING' | 'DONE' | 'SKIPPED';

export interface PilotMaterial {
  id: number;
  pilotCode: string;
  name: string;
  purchasePrice: number;
  volume: number;
  unit: string;
  costPerUnit: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePilotMaterialRequest {
  pilotCode?: string;
  name: string;
  purchasePrice: number;
  volume: number;
  unit: string;
  costPerUnit?: number;
  isActive?: boolean;
}

export interface UpdatePilotMaterialRequest {
  name?: string;
  purchasePrice?: number;
  volume?: number;
  unit?: string;
  costPerUnit?: number;
  isActive?: boolean;
}

export interface PilotSessionMaterialItem {
  id?: number;
  sessionId?: number;
  materialId: number;
  materialName?: string;
  unit?: string;
  usageAmount: number;
  costPerUnit?: number;
  calculatedCost?: number;
}

export type DarkLashesSessionStatus =
  'BOOKED' | 'CHECKED_IN' | 'BEFORE_PHOTO' | 'SERVICE_DONE' | 'AFTER_PHOTO' | 'FEEDBACK_DONE' | 'CHECKED_OUT';

export interface PilotSession {
  id: number;
  pilotCode: string;
  branchCode: string;
  customerName: string;
  customerPhone: string;
  sessionDate: string; // YYYY-MM-DD
  bookingTime: string | null; // HH:mm
  bookingNote: string | null;
  technicianName: string | null;
  status: DarkLashesSessionStatus;
  checkInAt: string | null; // ISO string
  beforePhotoUrl: string | null;
  serviceDoneAt: string | null; // ISO string
  afterPhotoUrl: string | null;
  feedbackRating: number | null; // 1 - 5 stars
  feedbackNote: string | null;
  checkOutAt: string | null; // ISO string
  totalDurationMinutes: number | null;
  revenue: number;
  materialCost: number;
  technicianCost: number;
  commissionAmount: number;
  promoAmount: number;
  refundAmount: number;
  totalDirectCost: number;
  contributionMargin: number;
  followUp24hStatus: PilotFollowUpStatus;
  followUp72hStatus: PilotFollowUpStatus;
  csatScore: number | null; // 1 - 5
  issues: string | null;
  notes: string | null;
  source: string | null;
  createdByStaffId: number | null;
  createdAt: string;
  updatedAt: string;
  materials?: PilotSessionMaterialItem[];
  steps?: PilotSessionStep[];
  totalTechnicalDurationSeconds?: number | null;
}

export interface CreatePilotSessionRequest {
  pilotCode?: string;
  branchCode?: string;
  customerName: string;
  customerPhone: string;
  sessionDate: string;
  bookingTime?: string | null;
  bookingNote?: string | null;
  technicianName?: string | null;
  status?: DarkLashesSessionStatus;
  checkInAt?: string | null;
  beforePhotoUrl?: string | null;
  serviceDoneAt?: string | null;
  afterPhotoUrl?: string | null;
  feedbackRating?: number | null;
  feedbackNote?: string | null;
  checkOutAt?: string | null;
  totalDurationMinutes?: number | null;
  revenue?: number;
  materialCost?: number;
  technicianCost?: number;
  commissionAmount?: number;
  promoAmount?: number;
  refundAmount?: number;
  followUp24hStatus?: PilotFollowUpStatus;
  followUp72hStatus?: PilotFollowUpStatus;
  csatScore?: number | null;
  issues?: string | null;
  notes?: string | null;
  source?: string | null;
  materials?: Array<{ materialId: number; usageAmount: number }>;
}

export interface UpdatePilotSessionRequest {
  customerName?: string;
  customerPhone?: string;
  sessionDate?: string;
  bookingTime?: string | null;
  bookingNote?: string | null;
  technicianName?: string | null;
  status?: DarkLashesSessionStatus;
  checkInAt?: string | null;
  beforePhotoUrl?: string | null;
  serviceDoneAt?: string | null;
  afterPhotoUrl?: string | null;
  feedbackRating?: number | null;
  feedbackNote?: string | null;
  checkOutAt?: string | null;
  totalDurationMinutes?: number | null;
  revenue?: number;
  materialCost?: number;
  technicianCost?: number;
  commissionAmount?: number;
  promoAmount?: number;
  refundAmount?: number;
  followUp24hStatus?: PilotFollowUpStatus;
  followUp72hStatus?: PilotFollowUpStatus;
  csatScore?: number | null;
  issues?: string | null;
  notes?: string | null;
  source?: string | null;
  materials?: Array<{ materialId: number; usageAmount: number }>;
}

export interface CheckInPilotSessionRequest {
  checkInAt?: string;
}

export interface BeforePhotoPilotSessionRequest {
  beforePhotoUrl: string;
}

export interface ServiceDonePilotSessionRequest {
  serviceDoneAt?: string;
}

export interface AfterPhotoPilotSessionRequest {
  afterPhotoUrl: string;
}

export interface FeedbackPilotSessionRequest {
  feedbackRating: number;
  feedbackNote?: string;
}

export interface CheckOutPilotSessionRequest {
  checkOutAt?: string;
}

export interface PilotMetricsSummary {
  pilotCode: string;
  targetSessions: number;
  completedSessions: number;
  progressPercent: number;
  totalRevenue: number;
  totalDirectCost: number;
  totalConsumablesCost: number;
  avgConsumablesCostPerSession: number;
  totalContribution: number;
  avgContributionPerSession: number;
  avgContributionMarginPct: number;
  avgCsat: number;
  ratedSessionsCount: number;
  pendingFollowUp24hCount: number;
  pendingFollowUp72hCount: number;
  totalPendingFollowUpCount: number;
}

export interface PilotSessionsListResponse {
  sessions: PilotSession[];
  metrics: PilotMetricsSummary;
}

export interface PilotSessionsQuery {
  pilotCode?: string;
  branchCode?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ═══════════════════════════════════════════
// Pilot SOP Technical Steps & Session Timer
// ═══════════════════════════════════════════

export const DEFAULT_DARK_LASH_SOP_STEPS = [
  { name: 'Kiểm tra & làm sạch mi', stepOrder: 1, targetMinutes: 5, description: 'Soi mi, làm sạch bụi bẩn và dầu thừa trên mi mắt' },
  { name: 'Làm mềm', stepOrder: 2, targetMinutes: 12, description: 'Thoa thuốc uốn số 1 để mở biểu bì và làm mềm sợi mi' },
  { name: 'Tạo form độ cong', stepOrder: 3, targetMinutes: 10, description: 'Cố định mi lên trục silicon định hình theo độ cong yêu cầu' },
  { name: 'Cân bằng pH', stepOrder: 4, targetMinutes: 5, description: 'Kiểm tra và cân bằng độ pH trên mi trước khi sang bước tiếp theo' },
  { name: 'Màu', stepOrder: 5, targetMinutes: 15, description: 'Phủ thuốc nhuộm mi bóng tối giúp mi đen tuyền và sâu màu' },
  { name: 'Dưỡng Keratin', stepOrder: 6, targetMinutes: 5, description: 'Thoa serum keratin phục hồi và bảo vệ cấu trúc sợi mi' },
  { name: 'Vệ sinh & hoàn thiện', stepOrder: 7, targetMinutes: 5, description: 'Vệ sinh sạch mắt, chải đều form mi và hướng dẫn khách chăm sóc' },
];

export interface PilotSopStep {
  id: number;
  pilotCode: string;
  name: string;
  description?: string | null;
  stepOrder: number;
  targetMinutes?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePilotSopStepRequest {
  pilotCode?: string;
  name: string;
  description?: string | null;
  stepOrder?: number;
  targetMinutes?: number | null;
  isActive?: boolean;
}

export interface UpdatePilotSopStepRequest {
  name?: string;
  description?: string | null;
  stepOrder?: number;
  targetMinutes?: number | null;
  isActive?: boolean;
}

export interface ReorderPilotSopStepsRequest {
  pilotCode?: string;
  stepIds: number[];
}

export type PilotSessionStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SKIPPED';

export interface PilotSessionStep {
  id: number;
  sessionId: number;
  stepTemplateId: number | null;
  stepName: string;
  stepOrder: number;
  status: PilotSessionStepStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationSeconds: number | null;
  note: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StartSessionStepRequest {
  startedAt?: string;
}

export interface FinishSessionStepRequest {
  finishedAt?: string;
  note?: string;
}

export interface UpdateSessionStepNoteRequest {
  note: string;
}

