import type { ActionResponse, PageQuery, PageResponse } from './api.js';
import type { AcademyLeadStatus, AcademyStaffOption } from './academy-sales.js';
import type { AcademyTalentInstructor } from './academy-talent-assessment.js';

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

export const ACADEMY_WORKSHOP_AGENDA_KINDS = ['CONTENT', 'TALENT_TEST', 'GAME', 'BREAK', 'SALES', 'OTHER'] as const;
export type AcademyWorkshopAgendaKind = (typeof ACADEMY_WORKSHOP_AGENDA_KINDS)[number];

export const ACADEMY_WORKSHOP_AGENDA_STATUSES = ['PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'SKIPPED'] as const;
export type AcademyWorkshopAgendaStatus = (typeof ACADEMY_WORKSHOP_AGENDA_STATUSES)[number];

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
  startsAt: string;
  endsAt: string;
  location: string;
  capacity: number;
  feeVnd: number;
  feeDueAt: string | null;
  status: AcademyWorkshopStatus;
  assignedStaffIds: number[];
  participantCount: number;
  checkedInCount: number;
  liveAgendaItemId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyWorkshopDetail extends AcademyWorkshopListItem {
  showInSidebar: boolean;
  displayCode: string;
  /** Stable workshop-wide QR target for participant self-selection. */
  sharedJoinUrl: string;
  summary: AcademyWorkshopSummary;
  agenda: AcademyWorkshopAgendaItem[];
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
  talent: AcademyWorkshopTalentSnapshot | null;
  gameScore: number;
  gameResponseTimeMs: number;
  pendingRewardCount: number;
  instructorBonusVnd: number;
  instructorBonusStatus: AcademyInstructorBonusStatus | null;
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

export interface AcademyWorkshopGameLeaderboardEntry {
  rank: number;
  participantId: number;
  name: string;
  avatarUrl: string | null;
  score: number;
  responseTimeMs: number;
  correctAnswers: number;
  rewardLabels: string[];
}

export interface AcademyWorkshopTalentLeaderboardEntry {
  rank: number;
  participantId: number;
  name: string;
  avatarUrl: string | null;
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
  completedAt: string;
}

export interface AcademyWorkshopReward {
  id: number;
  workshopId: number;
  participantId: number;
  quizId: number | null;
  questionId: number | null;
  sourceType: 'QUESTION' | 'PODIUM' | 'MANUAL';
  sourceKey: string;
  label: string;
  quantity: number;
  status: AcademyWorkshopRewardStatus;
  promisedAt: string;
  fulfilledAt: string | null;
  fulfilledBy: AcademyWorkshopStaffRef | null;
  note: string | null;
}

export interface AcademyInstructorBonus {
  id: number;
  workshopId: number;
  participantId: number;
  assessmentId: number;
  courseId: number;
  courseName: string;
  instructor: AcademyTalentInstructor;
  amountVnd: number;
  status: AcademyInstructorBonusStatus;
  earnedAt: string;
  paidAt: string | null;
  paidBy: AcademyWorkshopStaffRef | null;
  note: string | null;
}

export interface AcademyWorkshopLiveState {
  serverNow: string;
  workshop: Pick<
    AcademyWorkshopDetail,
    'id' | 'name' | 'slug' | 'startsAt' | 'endsAt' | 'location' | 'status' | 'sharedJoinUrl'
  >;
  participantCount: number;
  connectedParticipantCount: number;
  activeAgendaItem: AcademyWorkshopAgendaItem | null;
  activeQuiz: AcademyWorkshopQuiz | null;
  activeQuestion: AcademyWorkshopQuizQuestion | null;
  gameLeaderboard: AcademyWorkshopGameLeaderboardEntry[];
  talentLeaderboard: AcademyWorkshopTalentLeaderboardEntry[];
}

export interface AcademyWorkshopPublicSession {
  token: string;
  expiresAt: string;
  participant: {
    id: number;
    lead: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
    checkedInAt: string | null;
    gameScore: number;
  };
  workshop: Pick<AcademyWorkshopDetail, 'id' | 'name' | 'slug' | 'startsAt' | 'endsAt' | 'location' | 'status'>;
}

export interface AcademyWorkshopSharedJoinParticipant {
  id: number;
  name: string;
  avatarUrl: string | null;
  requiresPhone: boolean;
}

export interface AcademyWorkshopSharedJoinInfo {
  workshop: Pick<AcademyWorkshopDetail, 'id' | 'name' | 'slug' | 'startsAt' | 'endsAt' | 'location' | 'status'>;
  participants: AcademyWorkshopSharedJoinParticipant[];
}

export type AcademyWorkshopRealtimeEvent =
  | { type: 'STATE_SNAPSHOT'; data: AcademyWorkshopLiveState }
  | { type: 'LOBBY_UPDATED'; data: { participantCount: number; connectedParticipantCount: number } }
  | { type: 'AGENDA_UPDATED'; data: AcademyWorkshopAgendaItem | null }
  | { type: 'QUESTION_OPENED'; data: AcademyWorkshopQuizQuestion }
  | { type: 'QUESTION_CLOSED'; data: { questionId: number } }
  | { type: 'QUESTION_REVEALED'; data: AcademyWorkshopQuizQuestion }
  | { type: 'LEADERBOARD_UPDATED'; data: AcademyWorkshopGameLeaderboardEntry[] }
  | { type: 'GAME_ENDED'; data: AcademyWorkshopGameLeaderboardEntry[] }
  | { type: 'ERROR'; data: { code: string; message: string } };

export interface CreateAcademyWorkshopRequest {
  name: string;
  slug?: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  location: string;
  capacity?: number;
  feeVnd?: number;
  feeDueAt?: string | null;
  assignedStaffIds?: number[];
  showInSidebar?: boolean;
  agenda?: UpsertAcademyWorkshopAgendaItemRequest[];
}

export interface UpdateAcademyWorkshopRequest extends Partial<CreateAcademyWorkshopRequest> {
  status?: AcademyWorkshopStatus;
}

export interface ListAcademyWorkshopsParams extends PageQuery {
  search?: string;
  status?: AcademyWorkshopStatus | 'ALL';
}

export interface ListAcademyWorkshopParticipantsParams extends PageQuery {
  search?: string;
  attendanceStatus?: AcademyWorkshopAttendanceStatus | 'ALL';
  feeStatus?: AcademyWorkshopFeeStatus | 'ALL';
  checkedIn?: boolean | 'ALL';
}

export interface ListAcademyWorkshopQuizTemplatesParams extends PageQuery {
  search?: string;
}

export interface AddAcademyWorkshopParticipantsRequest {
  leadIds: number[];
}

export interface CreateAcademyWorkshopWalkInRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string;
  primaryInstructorId?: number | null;
}

export interface UpdateAcademyWorkshopCareRequest {
  infoSent?: boolean;
  attendanceStatus?: AcademyWorkshopAttendanceStatus;
  note?: string | null;
}

export interface CheckInAcademyWorkshopParticipantRequest {
  checkedIn?: boolean;
  qrToken?: string;
}

export interface SetAcademyWorkshopPhotoConsentRequest {
  consent: boolean;
  policyVersion?: string;
}

export interface AssignAcademyWorkshopInstructorRequest {
  instructorId: number | null;
}

export interface RecordAcademyWorkshopFeeRequest {
  amountVnd: number;
  method: AcademyWorkshopFeeMethod;
  reference?: string | null;
  note?: string | null;
  receivedAt?: string;
}

export interface WaiveAcademyWorkshopFeeRequest {
  waived: boolean;
  reason: string;
}

export interface CreateAcademyWorkshopPhotoUploadRequest {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
}

export interface AcademyWorkshopPhotoUploadIntent {
  storagePath: string;
  signedUrl: string;
  token: string;
  expiresAt: string;
}

export interface ConfirmAcademyWorkshopPhotoRequest {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  caption?: string | null;
  capturedAt?: string;
}

export interface UpsertAcademyWorkshopAgendaItemRequest {
  id?: number;
  title: string;
  description?: string | null;
  kind: AcademyWorkshopAgendaKind;
  plannedDurationSeconds: number;
  sortOrder?: number;
}

export interface AcademyWorkshopAgendaCommandRequest {
  action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'SKIP';
}

export interface UpsertAcademyWorkshopQuizRequest {
  title: string;
  description?: string | null;
  isTemplate?: boolean;
  podiumRewards?: Record<string, string>;
}

export interface CloneAcademyWorkshopQuizRequest {
  title?: string;
}

export interface UpsertAcademyWorkshopQuestionRequest {
  type: AcademyWorkshopQuestionType;
  prompt: string;
  imageUrl?: string | null;
  durationSeconds: number;
  sortOrder?: number;
  rewardRule?: AcademyWorkshopRewardRule;
  fastestCount?: number;
  rewardLabel?: string | null;
  rewardQuantity?: number;
  options: Array<{ id?: number; label: string; color?: string | null; isCorrect: boolean; sortOrder?: number }>;
}

export interface AcademyWorkshopGameCommandRequest {
  action:
    | 'OPEN_LOBBY'
    | 'OPEN_QUESTION'
    | 'REOPEN_QUESTION'
    | 'CLOSE_QUESTION'
    | 'REVEAL_QUESTION'
    | 'NEXT_QUESTION'
    | 'END_GAME';
  questionId?: number;
}

export interface RedeemAcademyWorkshopQrRequest {
  qrToken: string;
}

export interface SelectAcademyWorkshopParticipantRequest {
  displayCode: string;
  participantId: number;
  phone?: string;
}

export interface RedeemAcademyWorkshopDisplayRequest {
  displayCode: string;
}

export interface SubmitAcademyWorkshopAnswerRequest {
  questionId: number;
  optionId: number;
  idempotencyKey: string;
}

export interface AcademyWorkshopAnswerReceipt {
  answerId: number;
  questionId: number;
  selectedOptionId: number;
  acceptedAt: string;
  isCorrect: boolean;
  score: number;
  totalScore: number;
  timedOut: boolean;
}

export interface UpdateAcademyWorkshopRewardRequest {
  status: Exclude<AcademyWorkshopRewardStatus, 'PROMISED'>;
  note?: string | null;
}

export interface UpdateAcademyInstructorBonusRequest {
  status: Exclude<AcademyInstructorBonusStatus, 'EARNED' | 'MISSING_CONFIG'>;
  note?: string | null;
}

export type ListAcademyWorkshopsResponse = PageResponse<AcademyWorkshopListItem, AcademyWorkshopSummary>;
export type ListAcademyWorkshopParticipantsResponse = PageResponse<AcademyWorkshopParticipant, AcademyWorkshopSummary>;
export type ListAcademyWorkshopQuizTemplatesResponse = PageResponse<AcademyWorkshopQuiz>;
export type AcademyWorkshopActionResponse = ActionResponse<AcademyWorkshopDetail>;
export type AcademyWorkshopParticipantActionResponse = ActionResponse<AcademyWorkshopParticipant>;
export type AcademyWorkshopAgendaActionResponse = ActionResponse<AcademyWorkshopAgendaItem>;
export type AcademyWorkshopQuizActionResponse = ActionResponse<AcademyWorkshopQuiz>;
export type AcademyWorkshopRewardActionResponse = ActionResponse<AcademyWorkshopReward>;
export type AcademyInstructorBonusActionResponse = ActionResponse<AcademyInstructorBonus>;

export interface AcademyWorkshopResourcesResponse {
  staff: AcademyStaffOption[];
  instructors: AcademyTalentInstructor[];
}

export function getAcademyWorkshopQuizProgress<T extends { id: number }>(
  questions: readonly T[],
  activeQuestionId: number | null
) {
  const activeIndex =
    activeQuestionId === null ? -1 : questions.findIndex((question) => question.id === activeQuestionId);
  const nextQuestion = activeIndex >= 0 ? questions[activeIndex + 1] || null : null;

  return {
    activeIndex,
    currentQuestionNumber: activeIndex >= 0 ? activeIndex + 1 : 0,
    totalQuestions: questions.length,
    hasNextQuestion: nextQuestion !== null,
    isLastQuestion: activeIndex >= 0 && nextQuestion === null,
    nextQuestion,
  };
}

export function calculateAcademyWorkshopFeeStatus(
  feeVnd: number,
  totalPaidVnd: number,
  waived: boolean
): AcademyWorkshopFeeStatus {
  const fee = Math.max(0, Math.round(Number(feeVnd) || 0));
  const paid = Math.max(0, Math.round(Number(totalPaidVnd) || 0));
  if (fee === 0) return 'FREE';
  if (waived) return 'WAIVED';
  if (paid <= 0) return 'UNPAID';
  return paid >= fee ? 'PAID' : 'PARTIAL';
}

export function calculateAcademyWorkshopQuestionScore(
  durationMs: number,
  elapsedMs: number,
  isCorrect: boolean
): number {
  if (!isCorrect) return 0;
  const duration = Math.max(1, Math.round(Number(durationMs) || 0));
  const elapsed = Math.max(0, Math.round(Number(elapsedMs) || 0));
  if (elapsed > duration) return 0;
  const remainingRatio = Math.max(0, Math.min(1, (duration - elapsed) / duration));
  return Math.max(500, Math.min(1000, 500 + Math.round(500 * remainingRatio)));
}

export function calculateAcademyWorkshopAgendaRemainingSeconds(
  plannedDurationSeconds: number,
  startedAt: string | Date | null,
  pausedAt: string | Date | null,
  pausedSeconds: number,
  now: string | Date = new Date()
): number {
  if (!startedAt) return Math.max(0, Math.round(Number(plannedDurationSeconds) || 0));
  const startMs = new Date(startedAt).getTime();
  const effectiveNowMs = pausedAt ? new Date(pausedAt).getTime() : new Date(now).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(effectiveNowMs)) return 0;
  const elapsedSeconds = Math.max(0, Math.floor((effectiveNowMs - startMs) / 1000) - Math.max(0, pausedSeconds));
  return Math.round(Number(plannedDurationSeconds) || 0) - elapsedSeconds;
}

export function selectAcademyWorkshopRewardParticipantIds(
  rule: AcademyWorkshopRewardRule,
  answers: Array<{ participantId: number; isCorrect: boolean; responseTimeMs: number }>,
  fastestCount = 1,
  maxResponseTimeMs = Number.POSITIVE_INFINITY
): number[] {
  if (rule === 'NONE') return [];
  const correct = answers
    .filter((answer) => answer.isCorrect && answer.responseTimeMs <= maxResponseTimeMs)
    .sort((left, right) => left.responseTimeMs - right.responseTimeMs || left.participantId - right.participantId);
  const uniqueCorrect = Array.from(
    correct
      .reduce((rows, answer) => {
        if (!rows.has(answer.participantId)) rows.set(answer.participantId, answer);
        return rows;
      }, new Map<number, (typeof correct)[number]>())
      .values()
  );
  const selected =
    rule === 'ALL_CORRECT' ? uniqueCorrect : uniqueCorrect.slice(0, Math.max(1, Math.round(fastestCount)));
  return selected.map((answer) => answer.participantId);
}

export function sortAcademyWorkshopTalentLeaderboard<
  T extends {
    qualified: boolean;
    strands5Min: number;
    totalErrors: number;
    eyeScore: number;
    handScore: number;
    completedAt: string;
  },
>(rows: readonly T[]): T[] {
  return [...rows].sort(
    (left, right) =>
      Number(right.qualified) - Number(left.qualified) ||
      right.strands5Min - left.strands5Min ||
      left.totalErrors - right.totalErrors ||
      right.eyeScore + right.handScore - (left.eyeScore + left.handScore) ||
      new Date(left.completedAt).getTime() - new Date(right.completedAt).getTime()
  );
}
