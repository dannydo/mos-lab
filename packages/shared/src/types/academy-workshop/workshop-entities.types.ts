import type { AcademyLeadStatus } from '../academy-sales.js';
import type { AcademyTalentInstructor } from '../academy-talent-assessment.js';
import type {
  AcademyWorkshopDesignItem,
  AcademyWorkshopDesignTemplate,
  AcademyWorkshopParticipantDesignSelection,
} from '../academy-workshop-designs.js';

export const ACADEMY_CAMPAIGN_KINDS = ['CAMPAIGN', 'WORKSHOP'] as const;
export type AcademyCampaignKind = (typeof ACADEMY_CAMPAIGN_KINDS)[number];

export const ACADEMY_WORKSHOP_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'CHECKIN_OPEN',
  'LIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED',
] as const;
export type AcademyWorkshopStatus = (typeof ACADEMY_WORKSHOP_STATUSES)[number];

export const ACADEMY_WORKSHOP_ATTENDANCE_STATUSES = ['PENDING', 'CONFIRMED', 'DECLINED'] as const;
export type AcademyWorkshopAttendanceStatus = (typeof ACADEMY_WORKSHOP_ATTENDANCE_STATUSES)[number];

export const ACADEMY_WORKSHOP_FEE_STATUSES = ['FREE', 'UNPAID', 'PARTIAL', 'PAID', 'WAIVED'] as const;
export type AcademyWorkshopFeeStatus = (typeof ACADEMY_WORKSHOP_FEE_STATUSES)[number];

export const ACADEMY_WORKSHOP_FEE_METHODS = ['BANK_TRANSFER', 'CASH', 'ADJUSTMENT'] as const;
export type AcademyWorkshopFeeMethod = (typeof ACADEMY_WORKSHOP_FEE_METHODS)[number];

export const ACADEMY_WORKSHOP_AGENDA_KINDS = [
  'CONTENT',
  'THEORY',
  'PRACTICE',
  'OBSERVATION',
  'NETWORKING',
  'TALENT_TEST',
  'GAME',
  'BREAK',
  'SALES',
  'OTHER',
] as const;
export type AcademyWorkshopAgendaKind = (typeof ACADEMY_WORKSHOP_AGENDA_KINDS)[number];

export const ACADEMY_WORKSHOP_AGENDA_KIND_LABELS: Record<AcademyWorkshopAgendaKind, string> = {
  CONTENT: 'Nội dung',
  THEORY: 'Lý thuyết',
  PRACTICE: 'Thực hành',
  OBSERVATION: 'Quan sát',
  NETWORKING: 'Kết nối',
  TALENT_TEST: 'Tố chất',
  GAME: 'Game',
  BREAK: 'Giải lao',
  SALES: 'Tư vấn',
  OTHER: 'Khác',
};

export const ACADEMY_WORKSHOP_AGENDA_STATUSES = ['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'SKIPPED'] as const;
export type AcademyWorkshopAgendaStatus = (typeof ACADEMY_WORKSHOP_AGENDA_STATUSES)[number];

export const ACADEMY_WORKSHOP_MENU_CATEGORIES = ['JUICE', 'MAIN_COURSE', 'DESSERT'] as const;
export type AcademyWorkshopMenuCategory = (typeof ACADEMY_WORKSHOP_MENU_CATEGORIES)[number];

export const ACADEMY_WORKSHOP_MENU_CATEGORY_LABELS: Record<AcademyWorkshopMenuCategory, string> = {
  JUICE: 'Nước ép trái cây',
  MAIN_COURSE: 'Món chính',
  DESSERT: 'Tráng miệng',
};

export const ACADEMY_WORKSHOP_QUESTION_TYPES = ['SINGLE_CHOICE', 'TRUE_FALSE'] as const;
export type AcademyWorkshopQuestionType = (typeof ACADEMY_WORKSHOP_QUESTION_TYPES)[number];

export const ACADEMY_WORKSHOP_REWARD_RULES = ['NONE', 'ALL_CORRECT', 'FASTEST_N'] as const;
export type AcademyWorkshopRewardRule = (typeof ACADEMY_WORKSHOP_REWARD_RULES)[number];

export const ACADEMY_WORKSHOP_REWARD_STATUSES = ['PROMISED', 'FULFILLED', 'VOID'] as const;
export type AcademyWorkshopRewardStatus = (typeof ACADEMY_WORKSHOP_REWARD_STATUSES)[number];

export const ACADEMY_INSTRUCTOR_BONUS_STATUSES = ['EARNED', 'PAID', 'VOID', 'MISSING_CONFIG'] as const;
export type AcademyInstructorBonusStatus = (typeof ACADEMY_INSTRUCTOR_BONUS_STATUSES)[number];

export interface AcademyWorkshopStaffRef {
  id: number;
  displayName: string;
  email?: string | null;
}

export interface AcademyWorkshopSummary {
  total: number;
  infoSent: number;
  confirmed: number;
  feeReady: number;
  checkedIn: number;
  tested: number;
  invoiced: number;
  tuitionPaid: number;
  bonusEarned: number;
  noShow: number;
}

export interface AcademyWorkshopListItem {
  id: number;
  campaignId: number;
  name: string;
  slug: string;
  description: string | null;
  /** Public-facing visual shown on the workshop registration hero. */
  heroImageUrl: string | null;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  feeVnd: number;
  feeDueAt: string | null;
  status: AcademyWorkshopStatus;
  publishedAt?: string | null;
  scheduledPublishAt?: string | null;
  assignedStaffIds: number[];
  participantCount: number;
  checkedInCount: number;
  liveAgendaItemId: number | null;
  parentWorkshopId?: number | null;
  seriesKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyWorkshopDetail extends AcademyWorkshopListItem {
  showInSidebar: boolean;
  displayCode: string;
  parentWorkshop?: { id: number; name: string; slug: string } | null;
  /** Meal selection cutoff; defaults to the workshop start when unset. */
  menuSelectionDeadline: string | null;
  /** Equipment selection cutoff; defaults to the workshop start when unset. */
  equipmentSelectionDeadline: string | null;
  /** Lash design selection cutoff; defaults to the workshop start when unset. */
  designSelectionDeadline: string | null;
  /** Public code is separate from the event-day display/lobby code. */
  registrationCode: string | null;
  registrationOpen: boolean;
  registrationUrl: string | null;
  /** The reusable template that the workshop agenda was copied from. */
  agendaTemplate: AcademyWorkshopAgendaTemplate | null;
  /** The reusable catering template last copied into this workshop. */
  menuTemplate: AcademyWorkshopMenuTemplate | null;
  /** The agenda item at which the workshop menu is served. */
  menuAgendaItemId: number | null;
  /** The agenda item at which practical equipment is used. */
  equipmentAgendaItemId: number | null;
  /** The agenda item at which lash design is practiced. */
  designAgendaItemId: number | null;
  /** The reusable practical-kit template last copied into this workshop. */
  equipmentTemplate: AcademyWorkshopEquipmentTemplate | null;
  /** The reusable lash design template last copied into this workshop. */
  designTemplate: AcademyWorkshopDesignTemplate | null;
  /** Stable workshop-wide QR target for participant self-selection. */
  sharedJoinUrl: string;
  summary: AcademyWorkshopSummary;
  agenda: AcademyWorkshopAgendaItem[];
  menuItems: AcademyWorkshopMenuItem[];
  equipmentPackages: AcademyWorkshopEquipmentPackage[];
  designs: AcademyWorkshopDesignItem[];
  activeQuiz: AcademyWorkshopQuiz | null;
}

export interface AcademyWorkshopPhoto {
  id: number;
  participantId: number;
  storagePath: string;
  signedUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  capturedAt: string;
  capturedBy: AcademyWorkshopStaffRef | null;
}

export interface AcademyWorkshopFeePayment {
  id: number;
  participantId: number;
  amountVnd: number;
  method: AcademyWorkshopFeeMethod;
  reference: string | null;
  note: string | null;
  receivedAt: string;
  confirmedBy: AcademyWorkshopStaffRef | null;
  createdAt: string;
}

export interface AcademyWorkshopTalentSnapshot {
  assessmentId: number;
  status: string;
  qualified: boolean;
  strands5Min: number;
  totalErrors: number;
  eyeScore: number;
  handScore: number;
  rankLabel: string;
  rewardLabel: string;
  scholarshipPercent: number;
  sampleRewardPercent: number;
  kitRewardPercent: number;
  invoiceNumber: string | null;
  finalPriceVnd: number;
  totalPaidVnd: number;
  paymentStatus: string;
  completedAt: string;
}

export interface AcademyWorkshopParticipant {
  id: number;
  campaignLeadId: number;
  workshopId: number;
  addedAt: string;
  lead: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    avatarUrl: string | null;
    facebookChatLink: string | null;
    status: AcademyLeadStatus;
    course: string | null;
    source: string;
  };
  infoSentAt: string | null;
  infoSentBy: AcademyWorkshopStaffRef | null;
  attendanceStatus: AcademyWorkshopAttendanceStatus;
  attendanceConfirmedAt: string | null;
  attendanceConfirmedBy: AcademyWorkshopStaffRef | null;
  feeStatus: AcademyWorkshopFeeStatus;
  feePaidVnd: number;
  feeRemainingVnd: number;
  appliedFeeVnd: number | null;
  discountVnd: number;
  discountReason: string | null;
  feeWaivedAt: string | null;
  feeWaiverReason: string | null;
  checkedInAt: string | null;
  checkedInBy: AcademyWorkshopStaffRef | null;
  photoConsentAt: string | null;
  photoConsentVersion: string | null;
  primaryInstructor: AcademyTalentInstructor | null;
  qrRedeemedAt: string | null;
  tokenVersion: number;
  /** Returned only by create/reissue mutations; never persisted in plaintext. */
  qrToken?: string;
  qrUrl?: string;
  photos: AcademyWorkshopPhoto[];
  feePayments: AcademyWorkshopFeePayment[];
  menuSelections: AcademyWorkshopMenuSelection[];
  equipmentSelection: AcademyWorkshopParticipantEquipmentSelection | null;
  designSelection: AcademyWorkshopParticipantDesignSelection | null;
  talent: AcademyWorkshopTalentSnapshot | null;
  gameScore: number;
  gameResponseTimeMs: number;
  pendingRewardCount: number;
  instructorBonusVnd: number;
  instructorBonusStatus: AcademyInstructorBonusStatus | null;
}

export interface AcademyWorkshopMenuItem {
  id: number;
  workshopId: number;
  category: AcademyWorkshopMenuCategory;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyWorkshopMenuSelection {
  id: number;
  participantId: number;
  menuItemId: number | null;
  category: AcademyWorkshopMenuCategory;
  itemName: string;
  selectedAt: string;
}

/** A reusable catering menu that can be copied into any workshop. */
export interface AcademyWorkshopMenuTemplate {
  id: number;
  title: string;
  description: string | null;
  items: AcademyWorkshopMenuTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

/** A stored menu option snapshot belonging to a reusable catering template. */
export interface AcademyWorkshopMenuTemplateItem {
  id: number;
  templateId: number;
  category: AcademyWorkshopMenuCategory;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isAvailable: boolean;
}

/** Configurable practical-kit option for a workshop. Prices are whole VND. */
export interface AcademyWorkshopEquipmentPackage {
  id: number;
  workshopId: number;
  name: string;
  description: string | null;
  includedItems: string[];
  priceVnd: number;
  sortOrder: number;
  isAvailable: boolean;
  isIncludedInFee: boolean;
  images: AcademyWorkshopEquipmentPackageImage[];
  createdAt: string;
  updatedAt: string;
}

export interface AcademyWorkshopEquipmentPackageImage {
  id: number;
  equipmentPackageId: number;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** A reusable set of practical-kit choices that can be copied into a workshop. */
export interface AcademyWorkshopEquipmentTemplate {
  id: number;
  title: string;
  description: string | null;
  packages: AcademyWorkshopEquipmentTemplatePackage[];
  createdAt: string;
  updatedAt: string;
}

/** A practical-kit package stored inside a reusable workshop equipment template. */
export interface AcademyWorkshopEquipmentTemplatePackage {
  id: number;
  templateId: number;
  name: string;
  description: string | null;
  includedItems: string[];
  priceVnd: number;
  sortOrder: number;
  isAvailable: boolean;
  isIncludedInFee: boolean;
  images: AcademyWorkshopEquipmentTemplatePackageImage[];
}

export interface AcademyWorkshopEquipmentTemplatePackageImage {
  id: number;
  templatePackageId: number;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
}

/** Immutable equipment and price snapshot selected during registration. */
export interface AcademyWorkshopParticipantEquipmentSelection {
  id: number;
  participantId: number;
  equipmentPackageId: number | null;
  packageName: string;
  packageContents: string[];
  priceVnd: number;
  selectedAt: string;
}

export interface AcademyWorkshopAgendaItem {
  id: number;
  workshopId: number;
  title: string;
  description: string | null;
  kind: AcademyWorkshopAgendaKind;
  plannedDurationSeconds: number;
  sortOrder: number;
  status: AcademyWorkshopAgendaStatus;
  startedAt: string | null;
  completedAt: string | null;
  pausedAt: string | null;
  pausedSeconds: number;
  actualDurationSeconds: number | null;
  remainingSeconds: number;
}

export interface AcademyWorkshopAgendaTemplateItem {
  id: number;
  templateId: number;
  title: string;
  description: string | null;
  kind: AcademyWorkshopAgendaKind;
  plannedDurationSeconds: number;
  sortOrder: number;
}

export interface AcademyWorkshopAgendaTemplate {
  id: number;
  title: string;
  description: string | null;
  items: AcademyWorkshopAgendaTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AcademyWorkshopTimelineEvent {
  id: number;
  workshopId: number;
  agendaItemId: number | null;
  eventType: 'STARTED' | 'PAUSED' | 'RESUMED' | 'COMPLETED' | 'SKIPPED' | 'WORKSHOP_STATE';
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  actor: AcademyWorkshopStaffRef | null;
}

export interface AcademyWorkshopTimelineInsight {
  agendaItemId: number;
  title: string;
  plannedSeconds: number;
  actualSeconds: number;
  varianceSeconds: number;
  variancePercent: number;
  suggestion: string | null;
}

export interface AcademyWorkshopQuizOption {
  id: number;
  label: string;
  color: string | null;
  sortOrder: number;
  isCorrect?: boolean;
}

export interface AcademyWorkshopQuizQuestion {
  id: number;
  quizId: number;
  type: AcademyWorkshopQuestionType;
  prompt: string;
  imageUrl: string | null;
  durationSeconds: number;
  sortOrder: number;
  rewardRule: AcademyWorkshopRewardRule;
  fastestCount: number;
  rewardLabel: string | null;
  rewardQuantity: number;
  options: AcademyWorkshopQuizOption[];
}

export interface AcademyWorkshopQuiz {
  id: number;
  workshopId: number | null;
  /** The reusable template this workshop game was copied from, when applicable. */
  sourceTemplateId?: number | null;
  sourceTemplateTitle?: string | null;
  /** The agenda item at which this game is run. */
  agendaItemId?: number | null;
  title: string;
  description: string | null;
  isTemplate: boolean;
  status: 'DRAFT' | 'LOBBY' | 'QUESTION_OPEN' | 'QUESTION_CLOSED' | 'REVEALED' | 'COMPLETED';
  activeQuestionId: number | null;
  questionOpenedAt: string | null;
  questionClosesAt: string | null;
  podiumRewards: Record<string, string>;
  questions: AcademyWorkshopQuizQuestion[];
}
