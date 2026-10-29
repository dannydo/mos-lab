export type PilotFollowUpStatus = 'PENDING' | 'DONE' | 'SKIPPED';
export type PilotMaterialItemType = 'CONSUMABLE' | 'TOOL';

export interface PilotMaterial {
  id: number;
  pilotCode: string;
  name: string;
  purchasePrice: number;
  volume: number;
  unit: string;
  costPerUnit: number;
  imageUrl?: string | null;
  itemType?: PilotMaterialItemType;
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
  imageUrl?: string | null;
  itemType?: PilotMaterialItemType;
  isActive?: boolean;
}

export interface UpdatePilotMaterialRequest {
  name?: string;
  purchasePrice?: number;
  volume?: number;
  unit?: string;
  costPerUnit?: number;
  imageUrl?: string | null;
  itemType?: PilotMaterialItemType;
  isActive?: boolean;
}

export interface StockInventoryItem {
  id: number;
  materialId?: number | null;
  materialName: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  warehouse: string;
  updatedAt?: string;
  createdAt?: string;
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
  | 'BOOKED'
  | 'CHECKED_IN'
  | 'ASSESSED'
  | 'BEFORE_PHOTO'
  | 'SERVICE_DONE'
  | 'AFTER_PHOTO'
  | 'FEEDBACK_DONE'
  | 'CHECKED_OUT'
  | 'INELIGIBLE';

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
  assessmentStatus?: 'PASS' | 'FAIL' | null;
  assessmentReason?: string | null;
  assessmentNotes?: string | null;
  assessmentCriteria?: PilotCriterionEvaluation[] | null;
  assessedAt?: string | null; // ISO string
  aiAssessment?: PilotAiAssessment | null;
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
  isStockDeducted?: boolean;
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
  {
    name: 'Kiểm tra & làm sạch mi',
    stepOrder: 1,
    targetMinutes: 5,
    description: 'Soi mi, làm sạch bụi bẩn và dầu thừa trên mi mắt',
  },
  {
    name: 'Làm mềm',
    stepOrder: 2,
    targetMinutes: 12,
    description: 'Thoa thuốc uốn số 1 để mở biểu bì và làm mềm sợi mi',
  },
  {
    name: 'Tạo form độ cong',
    stepOrder: 3,
    targetMinutes: 10,
    description: 'Cố định mi lên trục silicon định hình theo độ cong yêu cầu',
  },
  {
    name: 'Cân bằng pH',
    stepOrder: 4,
    targetMinutes: 5,
    description: 'Kiểm tra và cân bằng độ pH trên mi trước khi sang bước tiếp theo',
  },
  {
    name: 'Màu',
    stepOrder: 5,
    targetMinutes: 15,
    description: 'Phủ thuốc nhuộm mi bóng tối giúp mi đen tuyền và sâu màu',
  },
  {
    name: 'Dưỡng Keratin',
    stepOrder: 6,
    targetMinutes: 5,
    description: 'Thoa serum keratin phục hồi và bảo vệ cấu trúc sợi mi',
  },
  {
    name: 'Vệ sinh & hoàn thiện',
    stepOrder: 7,
    targetMinutes: 5,
    description: 'Vệ sinh sạch mắt, chải đều form mi và hướng dẫn khách chăm sóc',
  },
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

export interface PilotAiAssessmentResponse {
  aiAssessment: PilotAiAssessment;
  session: PilotSession;
}

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

export const DARK_LASHES_SOP_7_STEPS_DETAILED: PilotSopStepDetail[] = [
  {
    stepOrder: 1,
    name: 'Kiểm tra & làm sạch mi',
    targetMinutes: 5,
    purpose:
      'Đánh giá chất mi, độ khỏe nang lông và loại bỏ 100% bã nhờn, dầu thừa, mỹ phẩm dư thừa để hoạt chất uốn thẩm thấu đồng đều tuyệt đối.',
    instructions: [
      'Chuyên Viên Kỹ Thuật soi cấu trúc sợi mi bằng kính lúp/đèn chuyên dụng, xác định độ dày và phân loại (mi mảnh, trung bình, mi sợi dày cứng).',
      'Sử dụng bọt vệ sinh mi chuyên dụng (Lash Foam Cleanser), dùng cọ lông mịn chải nhẹ nhàng theo chiều mọc của sợi mi từ gốc ra ngọn.',
      'Dùng tăm bông ẩm thấm nước muối sinh lý 0.9% rửa sạch bọt xà phòng, dùng khăn bông không bụi dặm khô ráo hoàn toàn.',
      'Dán miếng Eye Pad Gel cách chân mi dưới 0.5 - 1mm để cách ly toàn bộ mi dưới, ngăn thuốc dính vào niêm mạc.',
      'Sử dụng giấy giữ mi con dán cố định các sợi mi con mảnh khó kiểm soát.',
    ],
    materials: [
      { name: 'Dụng cụ vệ sinh mi', unit: 'bộ', estimatedAmount: '1 bộ', purposeNote: 'Cọ bọt và khay đựng dụng cụ vô trùng' },
      { name: 'Eye Pad Gel (Miếng dán mi dưới)', unit: 'cặp', estimatedAmount: '1 cặp', purposeNote: 'Cách ly mi dưới, bảo vệ vùng da mắt', isDisposable: true },
      { name: 'Giấy giữ mi con', unit: 'miếng', estimatedAmount: '2 miếng', purposeNote: 'Cố định mi con khó kiểm soát', isDisposable: true },
      { name: 'Nước muối sinh lý 0.9%', unit: 'chai', estimatedAmount: '5 - 10 ml', purposeNote: 'Lau sạch bọt vệ sinh và làm dịu mắt', isDisposable: true },
    ],
    qualityCheckpoints: [
      'Sợi mi hoàn toàn sạch dầu nhờn, ráo nước, tơi xốp, không bết dính mỹ phẩm.',
      'Miếng dán Eye Pad Gel ôm khít mi dưới, cách bờ mi 0.5 - 1mm, không cấn vào giác mạc khi khách nhắm mắt.',
      'Đã hoàn tất phân loại chất mi để chuẩn bị căn chỉnh thời gian làm mềm ở bước tiếp theo.',
    ],
    commonErrors: [
      {
        error: 'Mi còn đọng dầu hoặc bọt tẩy trang',
        cause: 'Rửa chưa kỹ bằng nước muối sinh lý hoặc chưa lau khô ráo hoàn toàn.',
        remedy: 'Dùng tăm bông ẩm lau lại lần 2 và sấy quạt nhẹ 30 giây cho mi khô ráo tuyệt đối trước khi dán trục.',
      },
      {
        error: 'Dán Eye Pad quá sát bờ mi dưới gây cộm mắt',
        cause: 'Canh chỉnh vị trí miếng dán chưa chuẩn khi khách mở mắt.',
        remedy: 'Tháo nhẹ miếng Eye Pad Gel, dán lùi xuống cách bờ mi dưới 1mm và yêu cầu khách nhắm mở kiểm tra độ êm.',
      },
    ],
    unverifiedNotice: 'Chờ Cô Giang Đàm xác nhận định lượng bọt chuyên dụng và quy chuẩn nồng độ khử dầu tối ưu',
  },
  {
    stepOrder: 2,
    name: 'Làm mềm',
    targetMinutes: 15,
    purpose:
      'Mở biểu bì sợi mi và phá vỡ có kiểm soát các liên kết disunfua (S-S), đưa sợi mi về trạng thái mềm dẻo để sẵn sàng uốn theo đường cong của trục silicon.',
    instructions: [
      'Chọn trục silicon nâng mi phù hợp với độ dài mi của khách (Size S cho mi ngắn 6-7mm, Size M cho mi 8-10mm, Size L cho mi dài >10mm).',
      'Cố định trục silicon sát chân mí trên bằng sáp bắt mi không cồn (Lash Balm Glue).',
      'Dùng cây chải mi kim loại gạt từng sợi mi miết thẳng 90 độ ôm khít vào bề mặt trục silicon, đảm bảo không sợi mi nào bị chéo gốc.',
      'Dùng micro-brush lấy Thuốc uốn số 1 (Perming Cream) quét đều lên 2/3 thân mi, cách chân mi 1 - 1.5mm. TUYỆT ĐỐI không quét vào ngọn mi mỏng.',
      'Phủ màng bọc nilong mỏng cố định nhiệt độ ủ. Bắt đầu bấm đồng hồ đếm ngược.',
      'Kiểm tra độ mềm sợi mi sau mỗi 3 - 5 phút bằng que gạt kiểm tra đàn hồi.',
    ],
    materials: [
      { name: 'Thuốc uốn số 1 (Perming Cream)', unit: 'ml', estimatedAmount: '0.5 - 0.8 ml', purposeNote: 'Phá vỡ liên kết disunfua làm mềm sợi mi' },
      { name: 'Miếng silicon nâng mi (Silicon Pads)', unit: 'cặp', estimatedAmount: '1 cặp', purposeNote: 'Tạo phom nền độ cong chuẩn', isDisposable: false },
      { name: 'Sáp bắt mi không cồn (Lash Balm Glue)', unit: 'g', estimatedAmount: '0.3 - 0.5 g', purposeNote: 'Cố định trục và bắt dính sợi mi lên trục' },
      { name: 'Cây chải mi kim loại', unit: 'cây', estimatedAmount: '1 cây', purposeNote: 'Chải gạt mi thẳng góc 90 độ lên trục', isDisposable: false },
      { name: 'Màng bọc ủ mi chuyên dụng', unit: 'miếng', estimatedAmount: '2 miếng', purposeNote: 'Giữ nhiệt và định hình trong thời gian ủ', isDisposable: true },
    ],
    qualityCheckpoints: [
      '100% sợi mi bám dính thẳng tắp trên trục silicon, không bị chéo gốc hoặc gãy góc.',
      'Thuốc uốn số 1 phủ đều 2/3 thân mi, cách gốc 1mm, không dính vào ngọn mi và không lem vào da mí mắt.',
      'Sợi mi đạt độ mềm dẻo lý tưởng (kiểm tra thấy sợi mi uốn cong nhẹ nhàng theo que gạt không bị kháng lực bật lại).',
    ],
    commonErrors: [
      {
        error: 'Ủ quá thời gian (Over-processing) làm quéo hoặc nhũn ngọn mi',
        cause: 'Không kiểm tra độ mềm định kỳ hoặc áp dụng thời gian mi cứng cho mi mảnh.',
        remedy: 'Lập tức gạt sạch thuốc uốn số 1 bằng tăm bông khô, thoa dung dịch cân bằng pH và serum phục hồi Keratin cấp tốc.',
      },
      {
        error: 'Sợi mi bị bung hoặc chùng khỏi trục trong lúc ủ',
        cause: 'Lượng sáp bắt mi chưa đủ hoặc thao tác miết mi chưa chặt tay.',
        remedy: 'Chải gạt và cố định lại sợi mi ngay trong 2-3 phút đầu của quá trình làm mềm.',
      },
    ],
    unverifiedNotice: 'Thông số thời gian ủ chi tiết theo từng cấp độ chất mi chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 3,
    name: 'Tạo form độ cong',
    targetMinutes: 15,
    purpose:
      'Tái lập và khóa chặt các liên kết disunfua mới quanh bề mặt cong của trục silicon, định hình vĩnh viễn độ cong nảy và sóng mi hoàn hảo.',
    instructions: [
      'Gạt thật sạch lớp Thuốc uốn số 1 bằng tăm bông khô từ chân mi hướng ra ngoài ngọn mi. Đảm bảo không còn tồn dư thuốc số 1.',
      'Kiểm tra lại độ bám dính và hướng sợi mi trên trục silicon, chải miết lại các sợi mi bị xê dịch.',
      'Dùng cọ sạch thoa đều Thuốc định hình số 2 (Setting Cream) lên vị trí tương ứng vừa làm mềm.',
      'Phủ màng bọc giữ ấm và bấm giờ theo dõi thời gian định hình.',
      'Quan sát mắt khách, đảm bảo khách nhắm mắt thư giãn, không cử động mí mắt làm lệch form mi.',
    ],
    materials: [
      { name: 'Thuốc định hình số 2 (Setting Cream)', unit: 'ml', estimatedAmount: '0.5 - 0.8 ml', purposeNote: 'Tái tạo liên kết disunfua khóa độ cong' },
      { name: 'Miếng silicon nâng mi (Silicon Pads)', unit: 'cặp', estimatedAmount: '1 cặp', purposeNote: 'Trục định hình đang sử dụng' },
      { name: 'Cây chải mi kim loại', unit: 'cây', estimatedAmount: '1 cây', purposeNote: 'Căn chỉnh độ căng sợi mi' },
      { name: 'Tăm bông khô chuyên dụng', unit: 'cây', estimatedAmount: '4 - 6 cây', purposeNote: 'Gạt sạch thuốc số 1', isDisposable: true },
    ],
    qualityCheckpoints: [
      'Sợi mi giữ nguyên độ căng và form cong ôm sát bề mặt trục silicon.',
      'Không xảy ra hiện tượng phản ứng chéo giữa thuốc số 1 và thuốc số 2.',
      'Thời gian định hình tuân thủ đúng tỷ lệ quy định so với thời gian làm mềm.',
    ],
    commonErrors: [
      {
        error: 'Độ cong mi nhả sóng hoặc không đều giữa 2 mắt',
        cause: 'Gạt thuốc số 1 chưa sạch hoặc thời gian thuốc số 2 không đủ so với độ dày sợi mi.',
        remedy: 'Đảm bảo lau sạch khô thuốc số 1 và căn chuẩn đồng hồ bấm giờ riêng biệt cho từng bên mắt.',
      },
    ],
    unverifiedNotice: 'Tỷ lệ thời gian chuẩn giữa thuốc số 1 và số 2 chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 4,
    name: 'Cân bằng pH',
    targetMinutes: 2,
    purpose:
      'Trung hòa lượng kiềm dư thừa từ thuốc uốn, đưa nồng độ pH của sợi mi từ môi trường kiềm về ngưỡng sinh lý tự nhiên (pH 5.5 - 6.0), đóng kín lớp biểu bì mi.',
    instructions: [
      'Dùng tăm bông khô gạt sạch toàn bộ Thuốc định hình số 2 trên trục silicon.',
      'Dùng micro-brush thấm đều Dung dịch cân bằng pH chuyên sâu vuốt nhẹ nhàng từ chân đến ngọn sợi mi.',
      'Để dung dịch đệm thẩm thấu và trung hòa trong 1 - 2 phút.',
      'Dùng que thử kềm pH (nếu cần kiểm tra) để xác nhận bề mặt sợi mi đã trở về trạng thái an toàn trước khi phủ màu.',
    ],
    materials: [
      { name: 'Kềm PH (Kiểm tra độ pH)', unit: 'lần', estimatedAmount: '1 lần', purposeNote: 'Kiểm tra độ trung hòa pH trên bề mặt mi' },
      { name: 'Dung dịch cân bằng pH trung hòa', unit: 'ml', estimatedAmount: '1 - 2 ml', purposeNote: 'Đóng biểu bì và đưa mi về pH 5.5 - 6.0' },
      { name: 'Tăm bông micro-applicator', unit: 'cây', estimatedAmount: '2 - 4 cây', purposeNote: 'Thấm dung dịch cân bằng', isDisposable: true },
    ],
    qualityCheckpoints: [
      'Bề mặt sợi mi được trung hòa hoàn toàn kiềm, lớp biểu bì se khít, sợi mi đanh chắc.',
      'Khách hàng hoàn toàn dễ chịu, không cay mắt hoặc ngứa râm ran vùng chân mí.',
    ],
    commonErrors: [
      {
        error: 'Bỏ qua bước cân bằng pH khiến màu nhuộm bước 5 loang lổ',
        cause: 'Môi trường kiềm còn sót lại làm biến tính sắc tố màu nhuộm.',
        remedy: 'Bắt buộc thực hiện đủ bước cân bằng pH tối thiểu 1-2 phút trước khi chuyển sang bước nhuộm màu.',
      },
    ],
    unverifiedNotice: 'Dung tích định mức dung dịch đệm và ngưỡng pH tối ưu chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 5,
    name: 'Màu',
    targetMinutes: 15,
    purpose:
      'Nhuộm phủ sắc tố đen sâu (Deep Black Lash Tint) vào biểu bì sợi mi, tạo hiệu ứng Uốn Mi Bóng Tối đặc trưng: sợi mi đen nhánh, dày dặn, bóng bẩy từ gốc đến ngọn.',
    instructions: [
      'Pha Thuốc nhuộm mi (Lash Tint - Black) cùng dung dịch kích hoạt theo tỷ lệ chuẩn 1:1 trong chén sứ pha màu.',
      'Dùng cọ quét màu chuyên dụng thoa đều hỗn hợp từ gốc mi ra ngọn mi đang nằm trên trục silicon.',
      'Phủ kín 100% diện tích các sợi mi, đặc biệt chú ý ngọn mi nhạt màu để tạo hiệu ứng đen tuyền đồng nhất.',
      'Ủ màu trong thời gian tiêu chuẩn từ 10 - 15 phút, quan sát độ ngấm sắc tố đen bóng.',
      'Sau thời gian ủ, dùng tăm bông ẩm gạt sạch toàn bộ hỗn hợp màu trên mi.',
    ],
    materials: [
      { name: 'Thuốc nhuộm mi (Lash Tint) (Black)', unit: 'ml', estimatedAmount: '0.3 - 0.5 ml', purposeNote: 'Sắc tố đen bóng tạo chiều sâu mi bóng tối' },
      { name: 'Dung dịch kích hoạt màu (Oxidant)', unit: 'ml', estimatedAmount: '0.3 - 0.5 ml', purposeNote: 'Kích hoạt hạt màu bám vào biểu bì mi' },
      { name: 'Chén pha màu & cọ quét chuyên dụng', unit: 'bộ', estimatedAmount: '1 bộ', purposeNote: 'Pha trộn hỗn hợp màu đồng nhất' },
      { name: 'Tăm bông ẩm vệ sinh màu', unit: 'cây', estimatedAmount: '4 - 6 cây', purposeNote: 'Gạt sạch màu sau ủ', isDisposable: true },
    ],
    qualityCheckpoints: [
      'Toàn bộ sợi mi đen tuyền bóng mượt, không còn đoạn mi nâu hoặc ngọn mi vàng nhạt.',
      'Không lem màu ra vùng da mi mắt hoặc mí dưới.',
      'Mắt khách hoàn toàn không bị dính màu vào niêm mạc hay kết mạc.',
    ],
    commonErrors: [
      {
        error: 'Màu nhuộm lem vào da mí mắt hoặc kết mạc gây cay xót',
        cause: 'Quét thuốc nhuộm quá sát chân da hoặc khách cử động mí mắt.',
        remedy: 'Lập tức nhỏ nước muối sinh lý rửa sạch, dùng tăm bông ẩm lau sạch vùng da bị dính màu.',
      },
    ],
    unverifiedNotice: 'Tỷ lệ pha màu kích hoạt và mã màu đen bóng tối chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 6,
    name: 'Dưỡng Keratin',
    targetMinutes: 2,
    purpose:
      'Thấm sâu hoạt chất Keratin thủy phân và collagen vào lõi sợi mi, phục hồi màng bảo vệ, tăng độ dày thân mi và khóa độ bóng mượt lâu dài.',
    instructions: [
      'Sau khi lau sạch màu nhuộm, dùng micro-brush lấy Keratin dưỡng mi / Serum dưỡng bóng mi thoa đều lên toàn bộ chiều dài sợi mi.',
      'Dùng cây chải mi chải nhẹ nhàng từ gốc lên ngọn để dưỡng chất bao phủ kín từng sợi mi.',
      'Giữ nguyên lớp dưỡng trong 2 - 3 phút để dưỡng chất thẩm thấu sâu vào cấu trúc sợi mi vừa mở.',
      'Không rửa lại với nước sau khi dưỡng Keratin.',
    ],
    materials: [
      { name: 'Keratin dưỡng mi', unit: 'ml', estimatedAmount: '0.2 - 0.3 ml', purposeNote: 'Phục hồi cấu trúc lõi mi và khóa dưỡng chất' },
      { name: 'Serum dưỡng bóng mi (Glossy Serum)', unit: 'ml', estimatedAmount: '0.2 ml', purposeNote: 'Tạo lớp màng bóng mượt đặc trưng của mi bóng tối' },
      { name: 'Cây chải mi nhựa', unit: 'cây', estimatedAmount: '1 cây', purposeNote: 'Chải đều serum dưỡng lên sợi mi', isDisposable: true },
    ],
    qualityCheckpoints: [
      'Sợi mi bóng bẩy, óng ả, đàn hồi và dẻo dai rõ rệt.',
      'Sợi mi không bị bết dính thành cụm to mà tơi đều tự nhiên.',
    ],
    commonErrors: [
      {
        error: 'Lấy quá nhiều serum làm mi bết dính vón cục',
        cause: 'Định lượng serum chưa chuẩn.',
        remedy: 'Dùng cây chải mi khô chải tơi sợi mi và dặm nhẹ tăm bông thấm bớt lượng tinh chất dư thừa.',
      },
    ],
    unverifiedNotice: 'Định mức giọt serum và thương hiệu Keratin tiêu chuẩn chờ Cô Giang Đàm xác nhận',
  },
  {
    stepOrder: 7,
    name: 'Vệ sinh & hoàn thiện',
    targetMinutes: 5,
    purpose:
      'Tháo gỡ trục silicon nhẹ nhàng, vệ sinh sạch keo dính và tàn dư thuốc, chải tơi form mi hoàn chỉnh, chụp ảnh After nghiệm thu và tư vấn khách chăm sóc tại nhà.',
    instructions: [
      'Thấm tăm bông ướt làm mềm keo bắt mi, nhẹ nhàng tách trục silicon ra khỏi mi mắt từ ngoài vào trong.',
      'Vệ sinh sạch hoàn toàn keo bắt mi và tàn dư trên da mí mắt và bờ mi.',
      'Nhẹ nhàng tháo miếng dán Eye Pad Gel dưới mi dưới, lau sạch vùng bọng mắt.',
      'Dùng cây chải mi khô chải đều từng chùm mi cong vút tơi xốp.',
      'Chụp ảnh After 3 góc độ (chính diện, nghiêng 45 độ, nhắm mắt) lưu trữ hồ sơ ca dịch vụ.',
      'Mời khách hàng soi gương kiểm tra thành phẩm, hướng dẫn kiêng nước 6-12 tiếng đầu tiên và ghi nhận CSAT.',
    ],
    materials: [
      { name: 'Dụng cụ vệ sinh mi', unit: 'bộ', estimatedAmount: '1 bộ', purposeNote: 'Khăn cotton không bụi và tăm bông mềm' },
      { name: 'Cây chải mi nhựa', unit: 'cây', estimatedAmount: '1 cây', purposeNote: 'Chải tơi mi hoàn thiện tặng khách mang về', isDisposable: true },
      { name: 'Nước muối sinh lý / Nước lau chuyên dụng', unit: 'ml', estimatedAmount: '5 ml', purposeNote: 'Lau sạch keo và tàn dư quanh mắt' },
    ],
    qualityCheckpoints: [
      'Vùng mắt khách hoàn toàn sạch sẽ, không đỏ rát, không đọng keo dính.',
      'Form mi cong đều tơi xốp, màu đen sâu bóng bẩy đồng nhất 2 bên mắt.',
      'Khách hàng hoàn toàn hài lòng (đánh giá CSAT đạt 5/5 sao).',
      'Đã chụp ảnh After rõ nét đủ chuẩn góc chụp lưu trữ hồ sơ mOS.',
    ],
    commonErrors: [
      {
        error: 'Giật tháo trục khi keo chưa tan làm rụng sợi mi của khách',
        cause: 'Thao tác vội vàng, không thấm đủ ẩm để làm mềm lớp sáp dán.',
        remedy: 'Bắt buộc thấm tăm bông ẩm lăn nhẹ nhàng cho keo tự bong trước khi nhấc trục silicon ra.',
      },
    ],
    unverifiedNotice: 'Bộ tài liệu hướng dẫn kiêng cữ sau ca dịch vụ tại nhà chờ Cô Giang Đàm xác nhận',
  },
];


// ═══════════════════════════════════════════
// SOP Preparation - Category 1: Clinical Data Collection & 5 Criteria Evidence (MOS-FEAT-176)
// ═══════════════════════════════════════════

export type SopPrepFileType = 'image' | 'video' | 'document' | 'other';

export interface SopPrepEvidenceFile {
  id: string;
  name: string;
  url: string;
  fileType: SopPrepFileType;
  mimeType: string;
  sizeBytes: number;
  description: string;
  sourceOrigin: string; // Nguồn gốc (e.g. Ca Pilot thực tế, Tài liệu đào tạo...)
  pilotSessionCode?: string; // Mã ca Pilot (e.g. PILOT-001)
  uploadedBy: string;
  uploadedAt: string;
}

export interface SopPrepCriterionData {
  id: number;
  criterionKey: string;
  name: string;
  order: number;
  expertiseKnowledge: string; // A. Kiến thức chuyên môn
  practicalMethod: string;    // B. Phương pháp thực hành
  evaluationGrounds: string;  // C. Căn cứ đánh giá
  status: 'DRAFT_UNVERIFIED' | 'VERIFIED' | 'APPROVED';
  statusLabel: string;
  updatedBy: string;
  updatedAt: string;
  evidenceFiles: SopPrepEvidenceFile[];
}

export interface SopPreparationCategory1Document {
  categoryNumber: 1;
  categoryTitle: string;
  objective: string;
  owner: string;
  status: 'NOT_COLLECTED' | 'COLLECTING' | 'DRAFT_COMPLETED';
  statusLabel: string;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  criteria: SopPrepCriterionData[];
}

export interface SaveSopPrepCategory1Request {
  pilotCode?: string;
  status?: 'NOT_COLLECTED' | 'COLLECTING' | 'DRAFT_COMPLETED';
  statusLabel?: string;
  lastUpdatedBy?: string;
  criteria?: SopPrepCriterionData[];
}

export interface SaveSopPrepCriterionRequest {
  pilotCode?: string;
  expertiseKnowledge?: string;
  practicalMethod?: string;
  evaluationGrounds?: string;
  status?: 'DRAFT_UNVERIFIED' | 'VERIFIED' | 'APPROVED';
  updatedBy?: string;
  evidenceFiles?: SopPrepEvidenceFile[];
}

export interface UploadSopPrepEvidenceRequest {
  fileData: string; // base64
  fileName: string;
  mimeType: string;
  description?: string;
  sourceOrigin?: string;
  pilotSessionCode?: string;
  criterionId: number;
  uploadedBy?: string;
}

export const DEFAULT_SOP_PREPARATION_CATEGORY_1: SopPreparationCategory1Document = {
  categoryNumber: 1,
  categoryTitle: 'Hạng mục 1 – Kiểm tra & Đánh giá tình trạng mi thật',
  objective:
    'Thu thập thông tin về tình trạng mi thật của khách hàng, làm cơ sở xác định khách đủ hay không đủ điều kiện thực hiện dịch vụ Uốn Mi Bóng Tối.',
  owner: 'Cô Giang Phạm',
  status: 'COLLECTING',
  statusLabel: 'Bản nháp – Chưa kiểm chứng',
  lastUpdatedBy: 'Cô Giang Phạm',
  lastUpdatedAt: '2026-10-28T09:00:00.000Z',
  criteria: [
    {
      id: 1,
      criterionKey: 'length',
      name: 'Độ dài mi',
      order: 1,
      expertiseKnowledge:
        'Chiều dài sợi mi quyết định trực tiếp diện tích tiếp xúc với bề mặt trục silicon uốn mi. Cấu trúc sinh học sợi mi phát triển qua 3 chu kỳ: Anagen (tăng trưởng), Catagen (thoái triển) và Telogen (nghỉ). Sợi mi đạt chuẩn uốn bóng tối cần đạt chiều dài tối thiểu để ôm trọn đường cong đỉnh của trục, chịu được lực căng kéo của sáp bắt mi mà không bị tuột sợi hoặc bật ngọn.',
      practicalMethod:
        '1. Đặt cữ thước đo mi chuyên dụng (hoặc cạnh trục silicon uốn cỡ S/M) vuông góc với bờ mi tại điểm trung tâm mắt và hai bên khóe/đuôi mắt.\n2. Quan sát độ vươn của sợi mi: ngọn mi phải vượt qua điểm cong đỉnh của trục uốn tối thiểu 2mm khi miết mi lên trục.\n3. Đánh giá tính đồng đều chiều dài giữa các phân vùng mắt (đầu mắt - thân giữa - đuôi mắt).',
      evaluationGrounds:
        '• ĐẠT (PASS): Chiều dài mi đo được ≥ 8.0mm tại vùng trung tâm mí mắt; sợi mi ôm qua ít nhất 2/3 bề mặt trục silicon cỡ S/M, không bật ngọn.\n• KHÔNG ĐẠT (FAIL): Chiều dài sợi mi < 8.0mm, mi quá ngắn hoặc bị cắt tỉa, chỉ dính được phần chân mi, nguy cơ tuột sợi và lem hóa chất vào giác mạc.',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-length-01',
          name: 'minh-chung-do-dai-mi-pilot-01.jpg',
          url: '/api/pilot/media/ea735600-d100-4749-9db8-54405430e956.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 245120,
          description: 'Ảnh thước đo mi hiển thị sợi mi khách hàng đạt 9.5mm tại ca Pilot 01.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-001',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:15:00.000Z',
        },
      ],
    },
    {
      id: 2,
      criterionKey: 'thickness',
      name: 'Độ dày sợi mi',
      order: 2,
      expertiseKnowledge:
        'Độ dày sợi mi phản ánh mật độ keratin bó sợi và đường kính thân mi (dao động từ 0.05mm đến 0.15mm+). Cấu trúc vỏ sợi mi (Cortex) chứa các bó protein keratin liên kết disunfua; sợi mi càng dày thì lớp biểu bì (Cuticle) càng xếp khít, đòi hỏi thời gian làm mềm bằng Thuốc uốn số 1 dài hơn để hoạt chất thẩm thấu đồng nhất.',
      practicalMethod:
        '1. Soi cấu trúc sợi mi dưới kính lúp chuyên dụng phóng đại ≥ 5x kèm ánh sáng chuẩn trắng.\n2. Dùng nhíp gắp đầu nhọn kẹp nhẹ thân sợi mi, cảm nhận độ cứng vững và độ thô ráp.\n3. Phân loại đường kính vào 3 nhóm chuẩn: Mi mảnh (0.05 - 0.07mm), Mi trung bình (0.10 - 0.12mm), Mi sợi dày cứng/thô (0.15mm+).',
      evaluationGrounds:
        '• ĐẠT (PASS): Sợi mi có đường kính từ 0.07mm trở lên, thân mi cứng cáp đồng đều, lớp biểu bì nguyên vẹn, đáp ứng tốt với phác đồ ủ thuốc 12-16 phút.\n• KHÔNG ĐẠT (FAIL): Mi tơ quá mỏng manh (< 0.05mm) không đủ lực nâng form hoặc sợi mi teo nhỏ bất thường do thiếu dưỡng chất.',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-thickness-01',
          name: 'soi-do-day-soi-mi-pilot-03.jpg',
          url: '/api/pilot/media/1f7ce362-702c-497b-b169-50008332e018.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 312400,
          description: 'Hình ảnh soi sợi mi trung bình 0.10mm có độ đanh chắc lý tưởng.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-003',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:20:00.000Z',
        },
      ],
    },
    {
      id: 3,
      criterionKey: 'density',
      name: 'Mật độ mi',
      order: 3,
      expertiseKnowledge:
        'Mật độ mi là tổng số lượng sợi mi phân bổ trên bờ mi trên (thông thường từ 90 đến 150 sợi phân bổ trên 2-3 tầng mi tự nhiên). Mật độ đồng đều từ khóe mắt đến đuôi mắt là điều kiện tiên quyết để tạo hiệu ứng "bóng tối" sâu thẳm, liền mạch sau khi phủ sắc tố đen tuyền Deep Black Tint.',
      practicalMethod:
        '1. Dùng cọ chải mi tơi xốp, nâng nhẹ mí trên của khách lên góc 15 độ để lộ rõ hàng chân mi.\n2. Rà soát dọc bờ mi theo 3 khu vực: 1/3 đầu mắt, 1/3 giữa mắt, 1/3 đuôi mắt.\n3. Kiểm tra các khoảng hở (gap), sẹo bờ mi hoặc vùng thưa thớt cục bộ.',
      evaluationGrounds:
        '• ĐẠT (PASS): Mật độ phân bổ tương đối đồng đều (≥ 80 sợi trên một mí trên), không có khoảng trống bờ mi lớn hơn 3mm liên tục.\n• KHÔNG ĐẠT (FAIL): Mi quá thưa thớt cục bộ, rụng từng mảng (Alopecia), bờ mi có khoảng trống trơ trụi khiến hiệu ứng uốn không đạt thẩm mỹ.',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-density-01',
          name: 'mat-do-mi-deu-pilot-05.jpg',
          url: '/api/pilot/media/0d7a30c5-22ec-48e2-bafe-10085da19bdb.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 288700,
          description: 'Ảnh chụp cận bờ mi 2 tầng đều đặn, mật độ trên 110 sợi.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-005',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:25:00.000Z',
        },
      ],
    },
    {
      id: 4,
      criterionKey: 'condition',
      name: 'Tình trạng sợi mi',
      order: 4,
      expertiseKnowledge:
        'Tình trạng sợi mi thể hiện sức khỏe sinh học của thân mi và nang lông bờ mi. Sợi mi từng qua nối mi sai kỹ thuật hoặc uốn cháy quéo thường bị tổn thương lớp biểu bì Cuticle, sợi mi bị xốp rỗng, mất độ ẩm và giòn gãy. Việc uốn hóa chất lên sợi mi đang hư tổn nghiêm trọng có thể gây đứt rụng vĩnh viễn.',
      practicalMethod:
        '1. Quan sát ngọn mi dưới đèn kính lúp xem có hiện tượng quéo sun, chẻ đôi, hoặc gãy gập góc hay không.\n2. Dùng que gạt vuốt nhẹ kiểm tra độ bám của chân mi vào nang lông, đảm bảo không rụng bất thường.\n3. Kiểm tra vùng da bờ mi, đảm bảo hoàn toàn sạch sẽ, không viêm đỏ (Blepharitis), không có gàu hay bã nhờn nang mi.',
      evaluationGrounds:
        '• ĐẠT (PASS): Thân mi nguyên bản khỏe mạnh, bóng mượt tự nhiên, ngọn mi nhọn thon, bờ mi sạch khỏe không kích ứng.\n• KHÔNG ĐẠT (FAIL): Mi bị cháy quéo ngọn do uốn sai trước đó, mi khô giòn dễ gãy, hoặc phát hiện dấu hiệu viêm bờ mi, mắt đỏ.',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-condition-01',
          name: 'kiem-tra-tinh-trang-soi-mi-pilot-02.jpg',
          url: '/api/pilot/media/85a596d9-d6ca-426c-8990-131677ddeb09.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 310500,
          description: 'Ảnh chụp sợi mi bóng khỏe tự nhiên, biểu bì khép chặt chưa qua hóa chất.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-002',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:30:00.000Z',
        },
      ],
    },
    {
      id: 5,
      criterionKey: 'form_capability',
      name: 'Khả năng tạo form',
      order: 5,
      expertiseKnowledge:
        'Khả năng tạo form là độ đàn hồi (Elasticity) và sức căng hồi phục của sợi mi khi bị uốn cong theo bề mặt trục silicon. Sợi mi có liên kết disunfua bền vững sẽ ôm sát đường cong trục và giữ nếp sóng nảy bền lâu sau khi được khóa bằng Thuốc định hình số 2 và nuôi dưỡng bằng Keratin thủy phân.',
      practicalMethod:
        '1. Dùng que gạt gạt nhẹ một nhóm sợi mi áp sát vào bề mặt trục silicon cỡ M.\n2. Thả que gạt và quan sát lực nảy đàn hồi tự nhiên của sợi mi xem có ôm giữ đường cong hay bật thẳng ra.\n3. Kiểm tra độ bám dính khi miết nhẹ cùng sáp bắt mi không cồn.',
      evaluationGrounds:
        '• ĐẠT (PASS): Sợi mi có độ đàn hồi cao, ôm khít êm ái vào đường cong trục silicon, không bị bật gốc hay bung ngọn.\n• KHÔNG ĐẠT (FAIL): Sợi mi quá giòn đứt gãy ngay khi miết cong, hoặc sợi mi nhũn nhẽo mất hoàn toàn sức căng nảy (over-processed).',
      status: 'DRAFT_UNVERIFIED',
      statusLabel: 'Bản nháp – Chưa kiểm chứng',
      updatedBy: 'Cô Giang Phạm',
      updatedAt: '2026-10-28T09:00:00.000Z',
      evidenceFiles: [
        {
          id: 'ev-form-01',
          name: 'thu-kha-nang-tao-form-truc-m-pilot-04.jpg',
          url: '/api/pilot/media/32f48e47-b02a-4b0b-9ecc-cc843d018385.jpg',
          fileType: 'image',
          mimeType: 'image/jpeg',
          sizeBytes: 295400,
          description: 'Ảnh miết mi êm ái ôm sát trục silicon uốn mi cỡ M, độ nảy đàn hồi xuất sắc.',
          sourceOrigin: 'Ca Pilot thực tế',
          pilotSessionCode: 'PILOT-004',
          uploadedBy: 'Cô Giang Phạm',
          uploadedAt: '2026-10-28T09:35:00.000Z',
        },
      ],
    },
  ],
};
