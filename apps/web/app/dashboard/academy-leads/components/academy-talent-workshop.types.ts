import type {
  AcademyCourse,
  AcademyLead,
  AcademyTalentAssessmentQuote,
  AcademyTalentInstructor,
  AcademyTalentLadderConfiguration,
  AcademyTalentPaymentSummary,
  RecordAcademyTalentPaymentRequest,
  UpsertAcademyCourseRequest,
  UpdateAcademyTalentLadderConfigurationRequest,
} from '@mos-lab/shared';

/**
 * Presentation contract for the Academy "Tố Chất" workshop.
 *
 * Calculation, scholarship eligibility and invoice amounts intentionally come
 * from the Fastify service.  These types live beside the UI so the screen can
 * be integrated while the shared API contract is being finalised; the parent
 * page maps the typed SDK response into this shape.
 */
export type AcademyTalentPaymentMode = 'DEPOSIT' | 'FULL' | 'THINKING';

export type AcademyTalentErrorKey = 'skin' | 'root' | 'stickies' | 'direction';

export interface AcademyTalentErrorCounts {
  skin: number;
  root: number;
  stickies: number;
  direction: number;
}

export interface AcademyTalentDraft {
  eyeScore: number;
  handScore: number;
  strands5Min: number;
  errors: AcademyTalentErrorCounts;
  selectedCourseIds: number[];
  /** Optional model packages, always a subset of selectedCourseIds. */
  selectedSampleCourseIds: number[];
  /** Optional kit packages, always a subset of selectedCourseIds. */
  selectedKitCourseIds: number[];
  /** Per-course Academy instructor ID; omitted means automatic allocation. */
  selectedInstructorIdsByCourse: Record<string, number>;
  /** The only primary training course in a multi-course recommendation. */
  primaryCourseId: number | null;
  paymentMode: AcademyTalentPaymentMode;
  depositVnd: number | null;
  note: string | null;
}

export interface AcademyTalentMilestone {
  key: string;
  title: string;
  strands: number;
  scholarshipPct: number;
  sampleRewardPct?: number;
  kitRewardPct?: number;
  /** Global desktop placement managed by Academy admins. */
  bubbleHeightPercent?: number;
  /** Optional server-selected styling hint; it never changes calculation. */
  tone?: 'slate' | 'orange' | 'indigo' | 'emerald' | 'gold' | 'violet';
}

export interface AcademyTalentResult {
  /** An immutable server ranking key, for example level5. */
  rankKey: string | null;
  rankLabel: string;
  resultTitle: string;
  resultSummary: string | null;
  eligibleForScholarship: boolean;
  scholarshipPct: number;
  totalErrors: number;
  levels: AcademyTalentMilestone[];
  recommendedCourseIds: number[];
  /** Optional descriptive labels from the assessment policy. */
  eyeScoreLabel?: string | null;
  handScoreLabel?: string | null;
}

export interface AcademyTalentPricingLine {
  courseId: number;
  name: string;
  listPriceVnd: number;
  promoPriceVnd: number;
  scholarshipVnd: number;
  finalPriceVnd: number;
  instructor: AcademyTalentInstructor;
  instructorSurchargeVnd: number;
}

export interface AcademyTalentPricingAddOn {
  kind: 'SAMPLE' | 'KIT';
  courseId: number;
  courseName: string;
  label: string;
  listPriceVnd: number;
  scholarshipVnd: number;
  finalPriceVnd: number;
}

export interface AcademyTalentPricing {
  currency: 'VND';
  /** Server-issued scholarship expiry, retained on the printed invoice snapshot. */
  expiresAt: string;
  lineItems: AcademyTalentPricingLine[];
  addOnItems: AcademyTalentPricingAddOn[];
  listTotalVnd: number;
  promoTotalVnd: number;
  /** Tổng giá trị ưu đãi của học phí, mẫu và đồ nghề (Fastify tính). */
  scholarshipVnd: number;
  /** Giá trị ưu đãi riêng theo từng hạng mục, không phải số tiền còn phải trả. */
  courseScholarshipVnd: number;
  sampleScholarshipVnd: number;
  kitScholarshipVnd: number;
  /** Largest optional-package reward, retained for legacy quote snapshots. */
  materialRewardPct: number;
  sampleRewardPct: number;
  kitRewardPct: number;
  finalTotalVnd: number;
  courseFinalTotalVnd: number;
  sampleFinalTotalVnd: number;
  kitFinalTotalVnd: number;
  teacherSurchargeVnd: number;
  /** The server's current suggested retention deposit, if one is permitted. */
  suggestedDepositVnd: number | null;
  dueNowVnd: number | null;
}

export interface AcademyTalentInvoiceSnapshot {
  invoiceNumber: string;
  issuedAt: string;
  paymentMode: AcademyTalentPaymentMode;
  dueNowVnd: number | null;
  printedAt?: string | null;
  note?: string | null;
}

export interface AcademyTalentAssessmentView {
  id: number;
  sessionNumber: number;
  status: 'DRAFT' | 'ISSUED' | 'COMPLETED' | string;
  draft: AcademyTalentDraft;
  result: AcademyTalentResult;
  pricing: AcademyTalentPricing | null;
  invoice: AcademyTalentInvoiceSnapshot | null;
  payment: AcademyTalentPaymentSummary;
  createdAt: string;
  updatedAt: string;
}

/** Compact history item used by the workshop's "Lần test" switcher. */
export interface AcademyTalentAssessmentSession {
  id: number;
  sessionNumber: number;
  status: string;
  updatedAt: string;
  invoiceNumber?: string | null;
}

export interface AcademyTalentCourseSelectionRule {
  /** A combo replaces all individual selections; individual courses can stack. */
  kind: 'COMBO' | 'COURSE';
}

/**
 * One catalogue row edited from the Workshop's Admin configuration surface.
 * An omitted id represents a newly-created Academy course; persisted courses
 * are archived through `isActive` instead of destructive deletion.
 */
export interface AcademyTalentCourseConfigurationInput {
  id?: number;
  values: UpsertAcademyCourseRequest;
}

export type AcademyTalentLead = Pick<AcademyLead, 'id' | 'name' | 'phone' | 'email' | 'course' | 'owner' | 'avatarUrl'>;

export interface AcademyTalentWorkshopProps {
  open: boolean;
  lead: AcademyTalentLead | null;
  courses: AcademyCourse[];
  instructors?: AcademyTalentInstructor[];
  assessment: AcademyTalentAssessmentView | null;
  /** Sessions are lead-scoped and normally sorted most-recent first by API. */
  sessions?: AcademyTalentAssessmentSession[];
  loading?: boolean;
  saving?: boolean;
  /** Lets the service tell the UI which courses are primary vs optional add-ons. */
  courseSelectionRules?: Record<number, AcademyTalentCourseSelectionRule>;
  /** Global policy used by every Academy workshop, never browser-local state. */
  ladderConfiguration?: AcademyTalentLadderConfiguration | null;
  /** Only admins can enter the global ladder edit mode. */
  canEditLadder?: boolean;
  /** Only admins can configure the global Academy course catalogue in Step 2. */
  canManageCourses?: boolean;
  /** Accounting confirmation is restricted to managers and admins. */
  canConfirmPayment?: boolean;
  /** Opens the payment follow-up panel after an invoice with an outstanding balance is loaded. */
  autoOpenPaymentFollowUp?: boolean;
  onClose: () => void;
  /**
   * Re-evaluates the in-progress score with Fastify without creating an
   * assessment activity or changing the persisted session. This keeps the
   * workshop result honest while an evaluator is moving the slider.
   */
  onPreviewQuote?: (draft: AcademyTalentDraft) => Promise<AcademyTalentAssessmentQuote>;
  /** Persists a draft and returns the latest server-calculated view. */
  onSaveDraft: (draft: AcademyTalentDraft) => Promise<AcademyTalentAssessmentView>;
  /** Creates or updates the immutable server invoice snapshot. */
  onIssueInvoice: (draft: AcademyTalentDraft) => Promise<AcademyTalentAssessmentView>;
  /** Appends a verified bank-transfer entry to the payment follow-up ledger. */
  onRecordPayment?: (
    assessmentId: number,
    input: RecordAcademyTalentPaymentRequest
  ) => Promise<AcademyTalentAssessmentView>;
  /** Audit event immediately before the browser's native print dialog opens. */
  onMarkInvoicePrinted?: (assessmentId: number) => Promise<void>;
  /** Load a prior test session without mutating the active assessment. */
  onSelectSession?: (assessmentId: number) => Promise<AcademyTalentAssessmentView>;
  /**
   * Starts an independent local draft. The next assessment is persisted only
   * when the evaluator explicitly saves it.
   */
  onStartNewSession?: () => void;
  onSaveLadderConfiguration?: (
    input: UpdateAcademyTalentLadderConfigurationRequest
  ) => Promise<AcademyTalentLadderConfiguration>;
  /**
   * Saves the whole editable catalogue back to the Academy source of truth.
   * Parent pages own the typed SDK calls so the card grid rehydrates from the
   * latest persisted configuration immediately after the batch completes.
   */
  onSaveCourseConfiguration?: (input: AcademyTalentCourseConfigurationInput[]) => Promise<AcademyCourse[]>;
  onSaved?: (assessment: AcademyTalentAssessmentView) => void | Promise<void>;
}
