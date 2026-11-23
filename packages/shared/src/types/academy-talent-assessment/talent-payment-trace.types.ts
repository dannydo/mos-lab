import type { PageQuery, PageResponse } from '../api.js';
import type { AcademyTalentPaymentMode, AcademyTalentPaymentStatus } from './talent-scoring.types.js';

/** An append-only payment confirmation entered after the bank transfer is verified. */
export const ACADEMY_TALENT_PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH'] as const;
export type AcademyTalentPaymentMethod = (typeof ACADEMY_TALENT_PAYMENT_METHODS)[number];

export interface AcademyTalentPaymentRecord {
  id: number;
  amountVnd: number;
  /** How Academy actually received this confirmed ledger entry. */
  method: AcademyTalentPaymentMethod;
  receivedAt: string;
  reference: string | null;
  note: string | null;
  confirmedBy: { id: number; displayName: string; email?: string | null } | null;
  createdAt: string;
}

/** Server-calculated payment ledger for the invoice follow-up screen. */
export interface AcademyTalentPaymentSummary {
  status: AcademyTalentPaymentStatus;
  totalPaidVnd: number;
  remainingVnd: number;
  payments: AcademyTalentPaymentRecord[];
}

/** Finance queue filter for printed Academy tuition documents. */
export const ACADEMY_TALENT_PAYMENT_MANAGEMENT_STATUSES = [
  'ALL',
  'FOLLOW_UP',
  'UNPAID',
  'PARTIALLY_PAID',
  'DEPOSIT_RECEIVED',
  'PAID',
] as const;
export type AcademyTalentPaymentManagementStatus = (typeof ACADEMY_TALENT_PAYMENT_MANAGEMENT_STATUSES)[number];

export interface AcademyTalentPaymentManagementRow {
  assessmentId: number;
  lead: { id: number; name: string; phone: string | null };
  invoiceNumber: string;
  issuedAt: string | null;
  courseLabel: string;
  paymentMode: Exclude<AcademyTalentPaymentMode, 'THINKING'>;
  paymentStatus: AcademyTalentPaymentStatus;
  tuitionVnd: number;
  requiredDepositVnd: number;
  totalPaidVnd: number;
  remainingVnd: number;
  paymentCount: number;
  latestPayment: AcademyTalentPaymentRecord | null;
  /** Append-only confirmed receipts, newest first, for finance audit. */
  payments: AcademyTalentPaymentRecord[];
}

/** All amounts are VND integers. Revenue means confirmed ledger cash only. */
export interface AcademyTalentPaymentManagementSummary {
  month: string;
  confirmedRevenueVnd: number;
  confirmedBankTransferVnd: number;
  confirmedCashVnd: number;
  depositFollowUpVnd: number;
  depositFollowUpCount: number;
  outstandingFollowUpVnd: number;
  outstandingFollowUpCount: number;
  paidInFullCount: number;
}

export interface ListAcademyTalentPaymentManagementParams extends PageQuery {
  /** Asia/Ho_Chi_Minh calendar month used only for confirmed-income metrics. */
  month?: string;
  search?: string;
  status?: AcademyTalentPaymentManagementStatus;
}

export type ListAcademyTalentPaymentManagementResponse = PageResponse<
  AcademyTalentPaymentManagementRow,
  AcademyTalentPaymentManagementSummary
>;

/** Immutable people and policy evidence attached to an Academy tuition invoice. */
export const ACADEMY_TALENT_PAYMENT_TRACE_ACTOR_ROLES = [
  'LEAD_OWNER',
  'LEAD_CREATOR',
  'ASSESSMENT_EVALUATOR',
  'PROMOTION_POLICY_EDITOR',
  'PROMOTION_QUOTE_EDITOR',
  'INVOICE_ISSUER',
  'PAYMENT_CONFIRMER',
  'COURSE_INSTRUCTOR',
] as const;
export type AcademyTalentPaymentTraceActorRole = (typeof ACADEMY_TALENT_PAYMENT_TRACE_ACTOR_ROLES)[number];

export interface AcademyTalentTraceStaff {
  id: number;
  displayName: string;
  email?: string | null;
}

export interface AcademyTalentPaymentTraceActor {
  role: AcademyTalentPaymentTraceActorRole;
  label: string;
  /** Present when this person has a CRM staff profile. */
  staff: AcademyTalentTraceStaff | null;
  /** Preserves a historical person name when a live staff record is unavailable. */
  recordedName: string | null;
}

export const ACADEMY_TALENT_PAYMENT_TRACE_EVENT_TYPES = [
  'ASSESSMENT_CREATED',
  'PROMOTION_QUOTE_UPDATED',
  'INVOICE_ISSUED',
  'INVOICE_REPRINTED',
  'PAYMENT_CONFIRMED',
] as const;
export type AcademyTalentPaymentTraceEventType = (typeof ACADEMY_TALENT_PAYMENT_TRACE_EVENT_TYPES)[number];

export interface AcademyTalentPaymentTraceEvent {
  id: number;
  type: AcademyTalentPaymentTraceEventType;
  occurredAt: string;
  summary: string;
  actor: AcademyTalentTraceStaff | null;
}

export const ACADEMY_TALENT_PAYMENT_TRACE_FLAG_CODES = [
  'HIGH_SCHOLARSHIP',
  'INVOICE_REVISED',
  'MULTIPLE_PAYMENT_CONFIRMERS',
  'PROMOTION_AFTER_EXPIRY',
] as const;
export type AcademyTalentPaymentTraceFlagCode = (typeof ACADEMY_TALENT_PAYMENT_TRACE_FLAG_CODES)[number];

/** Neutral review signals for audit/report workflows; none implies misconduct. */
export interface AcademyTalentPaymentTraceFlag {
  code: AcademyTalentPaymentTraceFlagCode;
  message: string;
}

export interface AcademyTalentPaymentTrace {
  assessmentId: number;
  learner: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    source: string | null;
    createdAt: string | null;
  };
  invoice: {
    documentNumber: string;
    revision: number;
    issuedAt: string | null;
    paymentMode: Exclude<AcademyTalentPaymentMode, 'THINKING'>;
    totalTuitionVnd: number;
  };
  promotion: {
    tierKey: string | null;
    tierLabel: string | null;
    qualified: boolean;
    scholarshipPercent: number;
    scholarshipVnd: number;
    catalogListPriceVnd: number;
    catalogPromoPriceVnd: number;
    finalPriceVnd: number;
    offerExpiresAt: string | null;
    isExpired: boolean;
    /** The global ladder-policy version used when this invoice snapshot was produced. */
    policyAudit: {
      id: number;
      changedAt: string;
      changedBy: AcademyTalentTraceStaff | null;
    } | null;
  };
  actors: AcademyTalentPaymentTraceActor[];
  events: AcademyTalentPaymentTraceEvent[];
  reviewFlags: AcademyTalentPaymentTraceFlag[];
}

export interface AcademyTalentPaymentTraceResponse {
  data: AcademyTalentPaymentTrace;
}
