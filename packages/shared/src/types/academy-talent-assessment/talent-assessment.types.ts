import type { AcademyTalentPaymentMethod, AcademyTalentPaymentSummary } from './talent-payment-trace.types.js';
import type {
  AcademyTalentAssessmentResult,
  AcademyTalentAssessmentScores,
  AcademyTalentAssessmentStatus,
  AcademyTalentInstructorSnapshot,
  AcademyTalentPaymentMode,
} from './talent-scoring.types.js';

export interface AcademyTalentCourseSnapshot {
  courseId: number;
  code: string;
  name: string;
  nameEn: string | null;
  listPriceVnd: number;
  promoPriceVnd: number;
  kitName: string | null;
  kitPriceVnd: number;
  samplePriceVnd: number;
  lessonCount: number;
  lashModelCount: number;
  scholarshipPercent: number;
  scholarshipVnd: number;
  finalPriceVnd: number;
  /** Instructor and surcharge chosen for this course at quote time. */
  instructor: AcademyTalentInstructorSnapshot;
  instructorSurchargeVnd: number;
}

export type AcademyTalentAddOnKind = 'SAMPLE' | 'KIT';

/** Immutable optional package line shown in the course picker and invoice. */
export interface AcademyTalentAddOnSnapshot {
  kind: AcademyTalentAddOnKind;
  courseId: number;
  courseName: string;
  label: string;
  listPriceVnd: number;
  scholarshipPercent: number;
  scholarshipVnd: number;
  finalPriceVnd: number;
}

export interface AcademyTalentAssessmentQuote {
  result: AcademyTalentAssessmentResult;
  expiresAt: string;
  isExpired: boolean;
  /** Zero after the assessment offer expires; original tier stays auditable. */
  effectiveScholarshipPercent: number;
  /** Legacy single material reward retained for historical snapshots. */
  materialRewardPercent: number;
  /** Current per-tier reward for optional practice models. */
  sampleRewardPercent: number;
  /** Current per-tier reward for optional kits/tools. */
  kitRewardPercent: number;
  listPriceVnd: number;
  promoPriceVnd: number;
  scholarshipVnd: number;
  finalPriceVnd: number;
  /** Course-only totals; top-level totals include selected kit/sample packages. */
  courseListPriceVnd: number;
  coursePromoPriceVnd: number;
  courseScholarshipVnd: number;
  courseFinalPriceVnd: number;
  sampleListPriceVnd: number;
  sampleScholarshipVnd: number;
  sampleFinalPriceVnd: number;
  kitListPriceVnd: number;
  kitScholarshipVnd: number;
  kitFinalPriceVnd: number;
  /** Sum of selected-instructor surcharges, after tuition scholarship. */
  teacherSurchargeVnd: number;
  /** Server-chosen Academy course IDs; never inferred by the UI. */
  recommendedCourseIds: number[];
  recommendation: {
    title: string;
    summary: string;
  };
  /** Default deposit for the current workshop policy, bounded by the quote. */
  suggestedDepositVnd: number;
  /** Amount due immediately for the currently chosen payment mode. */
  dueNowVnd: number;
  courses: AcademyTalentCourseSnapshot[];
  addOns: AcademyTalentAddOnSnapshot[];
}

export interface AcademyTalentInvoiceSnapshot {
  documentNumber: string;
  paymentMode: Exclude<AcademyTalentPaymentMode, 'THINKING'>;
  depositVnd: number;
  quote: AcademyTalentAssessmentQuote;
  issuedAt: string;
}

export interface AcademyTalentAssessment {
  id: number;
  leadId: number;
  status: AcademyTalentAssessmentStatus;
  scores: AcademyTalentAssessmentScores;
  quote: AcademyTalentAssessmentQuote;
  selectedCourseIds: number[];
  selectedSampleCourseIds: number[];
  selectedKitCourseIds: number[];
  /** Course ID → Academy instructor ID. Missing values resolve to Auto. */
  selectedInstructorIdsByCourse: Record<string, number>;
  paymentMode: AcademyTalentPaymentMode;
  depositVnd: number;
  payment: AcademyTalentPaymentSummary;
  notes: string | null;
  evaluator: { id: number; displayName: string; email?: string | null } | null;
  createdAt: string;
  updatedAt: string;
  invoice: {
    documentNumber: string;
    printedAt: string | null;
    printCount: number;
    printedBy: { id: number; displayName: string; email?: string | null } | null;
    snapshot: AcademyTalentInvoiceSnapshot | null;
  } | null;
}

export interface CreateAcademyTalentAssessmentRequest extends Partial<AcademyTalentAssessmentScores> {
  /** Optional Workshop OS attribution; the lead must match that participant. */
  workshopParticipantId?: number;
  selectedCourseIds?: number[];
  selectedSampleCourseIds?: number[];
  selectedKitCourseIds?: number[];
  selectedInstructorIdsByCourse?: Record<string, number>;
  paymentMode?: AcademyTalentPaymentMode;
  depositVnd?: number;
  notes?: string | null;
}

export interface UpdateAcademyTalentAssessmentRequest extends Partial<AcademyTalentAssessmentScores> {
  /** Existing workshop attribution is immutable; accepted only when it matches. */
  workshopParticipantId?: number;
  selectedCourseIds?: number[];
  selectedSampleCourseIds?: number[];
  selectedKitCourseIds?: number[];
  selectedInstructorIdsByCourse?: Record<string, number>;
  paymentMode?: AcademyTalentPaymentMode;
  depositVnd?: number;
  notes?: string | null;
}

/** Manual accounting confirmation. A bank QR transfer is never treated as paid before this mutation succeeds. */
export interface RecordAcademyTalentPaymentRequest {
  amountVnd: number;
  /** Defaults to bank transfer for older callers while the API is upgraded. */
  method?: AcademyTalentPaymentMethod;
  receivedAt?: string;
  reference?: string | null;
  note?: string | null;
}

/**
 * A non-persistent workshop draft evaluated by Fastify.  Supplying an
 * assessmentId makes the preview retain that session's original offer expiry
 * and chosen-course snapshot, so the on-screen result cannot diverge from the
 * subsequent save.
 */
export interface PreviewAcademyTalentAssessmentQuoteRequest extends Partial<AcademyTalentAssessmentScores> {
  assessmentId?: number;
  selectedCourseIds?: number[];
  selectedSampleCourseIds?: number[];
  selectedKitCourseIds?: number[];
  selectedInstructorIdsByCourse?: Record<string, number>;
  paymentMode?: AcademyTalentPaymentMode;
  depositVnd?: number;
}

export interface PreviewAcademyTalentAssessmentQuoteResponse {
  data: AcademyTalentAssessmentQuote;
}

export interface AcademyTalentAssessmentActionResponse {
  success: true;
  data: AcademyTalentAssessment;
  message: string;
}

export interface ListAcademyTalentAssessmentsResponse {
  data: AcademyTalentAssessment[];
  latest: AcademyTalentAssessment | null;
}
