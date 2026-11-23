import type { FastifyInstance } from 'fastify';
import {
  ACADEMY_TALENT_PAYMENT_MODES,
  type AcademyTalentAssessment,
  type AcademyTalentAssessmentQuote,
  type AcademyTalentInstructorSnapshot,
  type AcademyTalentInvoiceSnapshot,
  type AcademyTalentPaymentManagementRow,
  type AcademyTalentPaymentManagementStatus,
  type AcademyTalentPaymentManagementSummary,
  type AcademyTalentPaymentRecord,
  type AcademyTalentPaymentSummary,
  type AcademyTalentPaymentTrace,
  type AcademyTalentPaymentTraceActor,
  type AcademyTalentPaymentTraceActorRole,
  type AcademyTalentPaymentTraceEvent,
  type AcademyTalentPaymentTraceEventType,
  type AcademyTalentPaymentTraceResponse,
  type AcademyTalentTier,
  type ListAcademyTalentPaymentManagementParams,
  type ListAcademyTalentPaymentManagementResponse,
  type SafeAny,
  removeVietnameseTones,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  AcademySalesService,
  canManageAcademySales,
  getAcademyIctMonthBounds,
  type AcademyActor,
} from '../academy-sales.service.js';
import {
  ASSESSMENT_RELATION_INCLUDE,
  buildAcademyTalentQuote,
  calculateAcademyTalentPaymentStatus,
  describeCourses,
  iso,
  normalizeAddOnCourseIds,
  normalizeCourseIds,
  normalizePaymentMethod,
  normalizePaymentMode,
  normalizeSnapshotBases,
  parseInstructorIdsByCourse,
  parseJson,
  toNonNegativeInteger,
  toScores,
  toStaff,
} from './talent-assessment-quote-and-validators.js';

export function toPaymentSummary(row: SafeAny, quote: AcademyTalentAssessmentQuote): AcademyTalentPaymentSummary {
  const payments = Array.isArray(row.payments) ? row.payments : [];
  const paymentRecords: AcademyTalentPaymentRecord[] = payments
    .map((payment: SafeAny) => ({
      id: Math.max(0, Math.round(Number(payment.id) || 0)),
      amountVnd: Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
      method: normalizePaymentMethod(payment.paymentMethod),
      receivedAt: new Date(payment.receivedAt).toISOString(),
      reference: payment.reference?.trim() || null,
      note: payment.note?.trim() || null,
      confirmedBy: toStaff(payment.confirmedBy),
      createdAt: new Date(payment.createdAt).toISOString(),
    }))
    .filter(
      (payment: AcademyTalentPaymentRecord) => payment.id > 0 && Number.isFinite(new Date(payment.receivedAt).getTime())
    )
    .sort((left: AcademyTalentPaymentRecord, right: AcademyTalentPaymentRecord) =>
      right.receivedAt.localeCompare(left.receivedAt)
    );
  const totalPaidVnd = paymentRecords.reduce((sum, payment) => sum + payment.amountVnd, 0);
  const finalPriceVnd = Math.max(0, Math.round(Number(quote.finalPriceVnd) || 0));
  const remainingVnd = Math.max(0, finalPriceVnd - totalPaidVnd);
  const paymentMode = normalizePaymentMode(row.paymentMode, 'THINKING');
  const requiredDepositVnd = Math.max(0, Math.round(Number(row.depositVnd) || quote.suggestedDepositVnd || 0));
  const status = calculateAcademyTalentPaymentStatus(paymentMode, totalPaidVnd, finalPriceVnd, requiredDepositVnd);
  return { status, totalPaidVnd, remainingVnd, payments: paymentRecords };
}

function toPaymentManagementRow(row: SafeAny): AcademyTalentPaymentManagementRow | null {
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(row.invoiceSnapshotJson, null);
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(row.quoteSnapshotJson, null);
  const quote = savedQuote || invoiceSnapshot?.quote;
  const invoiceNumber = String(row.invoiceNumber || invoiceSnapshot?.documentNumber || '').trim();
  if (!quote || !invoiceNumber || Math.round(Number(quote.finalPriceVnd) || 0) <= 0) return null;

  const payment = toPaymentSummary(row, quote);
  const snapshotMode = invoiceSnapshot?.paymentMode;
  const paymentMode: AcademyTalentPaymentManagementRow['paymentMode'] =
    snapshotMode === 'FULL'
      ? 'FULL'
      : snapshotMode === 'DEPOSIT'
        ? 'DEPOSIT'
        : normalizePaymentMode(row.paymentMode, 'DEPOSIT') === 'FULL'
          ? 'FULL'
          : 'DEPOSIT';

  return {
    assessmentId: Math.max(0, Math.round(Number(row.id) || 0)),
    lead: {
      id: Math.max(0, Math.round(Number(row.lead?.id || row.leadId) || 0)),
      name: String(row.lead?.name || 'Học viên Academy').trim() || 'Học viên Academy',
      phone: row.lead?.phone?.trim() || null,
    },
    invoiceNumber,
    issuedAt: iso(row.invoicePrintedAt || invoiceSnapshot?.issuedAt),
    courseLabel: describeCourses(quote) || 'Học phí Academy',
    paymentMode,
    paymentStatus: payment.status,
    tuitionVnd: Math.max(0, Math.round(Number(quote.finalPriceVnd) || 0)),
    requiredDepositVnd: Math.max(0, Math.round(Number(row.depositVnd) || quote.suggestedDepositVnd || 0)),
    totalPaidVnd: payment.totalPaidVnd,
    remainingVnd: payment.remainingVnd,
    paymentCount: payment.payments.length,
    latestPayment: payment.payments[0] || null,
    payments: payment.payments,
  };
}

const TRACE_ACTOR_LABELS: Record<AcademyTalentPaymentTraceActorRole, string> = {
  LEAD_OWNER: 'Phụ trách học viên',
  LEAD_CREATOR: 'Người tạo lead',
  ASSESSMENT_EVALUATOR: 'Người đánh giá Tố Chất',
  PROMOTION_POLICY_EDITOR: 'Người cấu hình chính sách ưu đãi',
  PROMOTION_QUOTE_EDITOR: 'Người điều chỉnh báo giá/ưu đãi',
  INVOICE_ISSUER: 'Người lập hoặc in phiếu',
  PAYMENT_CONFIRMER: 'Người xác nhận khoản thu',
  COURSE_INSTRUCTOR: 'Giảng viên được chỉ định',
};

function addTraceActor(
  actors: AcademyTalentPaymentTraceActor[],
  seen: Set<string>,
  role: AcademyTalentPaymentTraceActorRole,
  staff: AcademyTalentPaymentTraceActor['staff'],
  recordedName: string | null = null
) {
  const normalizedName = recordedName?.trim() || null;
  if (!staff && !normalizedName) return;
  const key = `${role}:${staff?.id || normalizedName || 'unknown'}`;
  if (seen.has(key)) return;
  seen.add(key);
  actors.push({
    role,
    label: TRACE_ACTOR_LABELS[role],
    staff,
    recordedName: normalizedName,
  });
}

function traceEventType(activity: SafeAny): AcademyTalentPaymentTraceEventType {
  const metadata = parseJson<SafeAny>(activity.metadata, {});
  if (activity.activityType === 'INVOICE_PRINTED') {
    return metadata.reprint ? 'INVOICE_REPRINTED' : 'INVOICE_ISSUED';
  }
  if (activity.activityType === 'PAYMENT_RECEIVED') return 'PAYMENT_CONFIRMED';
  return metadata.action === 'created' ? 'ASSESSMENT_CREATED' : 'PROMOTION_QUOTE_UPDATED';
}

function toTraceEvent(activity: SafeAny): AcademyTalentPaymentTraceEvent | null {
  const occurredAt = iso(activity.occurredAt || activity.createdAt);
  if (!occurredAt) return null;
  return {
    id: Math.max(0, Math.round(Number(activity.id) || 0)),
    type: traceEventType(activity),
    occurredAt,
    summary: String(activity.content || 'Cập nhật hồ sơ Academy.').trim(),
    actor: toStaff(activity.actor),
  };
}

/**
 * Read model for finance/audit. It derives review signals only from immutable
 * invoice snapshots and append-only activities; a signal is never an
 * accusation and should be used to choose records for policy review.
 */
function toPaymentTrace(row: SafeAny, activities: SafeAny[]): AcademyTalentPaymentTrace {
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(row.invoiceSnapshotJson, null);
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(row.quoteSnapshotJson, null);
  // A trace must describe the document that was actually issued, even while
  // an unpaid workshop draft is still editable for a possible next revision.
  const quote = invoiceSnapshot?.quote || savedQuote;
  const invoiceNumber = String(row.invoiceNumber || invoiceSnapshot?.documentNumber || '').trim();
  if (!quote || !invoiceNumber) throw new AcademySalesError('Thiếu snapshot phiếu học phí để truy vết.', 409);

  const events = activities
    .map(toTraceEvent)
    .filter((event): event is AcademyTalentPaymentTraceEvent => Boolean(event));
  const actors: AcademyTalentPaymentTraceActor[] = [];
  const seenActors = new Set<string>();
  addTraceActor(actors, seenActors, 'LEAD_OWNER', toStaff(row.lead?.owner));
  addTraceActor(actors, seenActors, 'LEAD_CREATOR', toStaff(row.lead?.createdBy));
  addTraceActor(actors, seenActors, 'ASSESSMENT_EVALUATOR', toStaff(row.evaluator));
  addTraceActor(actors, seenActors, 'PROMOTION_POLICY_EDITOR', toStaff(row.promotionPolicyAudit?.changedBy));
  addTraceActor(actors, seenActors, 'INVOICE_ISSUER', toStaff(row.invoicePrintedBy));
  for (const course of quote.courses || []) {
    addTraceActor(
      actors,
      seenActors,
      'COURSE_INSTRUCTOR',
      course.instructor?.staffId
        ? { id: course.instructor.staffId, displayName: course.instructor.displayName, email: null }
        : null,
      course.instructor?.displayName || null
    );
  }
  for (const payment of toPaymentSummary(row, quote).payments) {
    addTraceActor(actors, seenActors, 'PAYMENT_CONFIRMER', payment.confirmedBy);
  }
  for (const event of events) {
    if (event.type === 'ASSESSMENT_CREATED') {
      addTraceActor(actors, seenActors, 'ASSESSMENT_EVALUATOR', event.actor);
    } else if (event.type === 'PROMOTION_QUOTE_UPDATED') {
      addTraceActor(actors, seenActors, 'PROMOTION_QUOTE_EDITOR', event.actor);
    } else if (event.type === 'INVOICE_ISSUED' || event.type === 'INVOICE_REPRINTED') {
      addTraceActor(actors, seenActors, 'INVOICE_ISSUER', event.actor);
    } else if (event.type === 'PAYMENT_CONFIRMED') {
      addTraceActor(actors, seenActors, 'PAYMENT_CONFIRMER', event.actor);
    }
  }

  const invoiceRevision = Math.max(0, Math.round(Number(row.invoiceRevision) || 0));
  const scholarshipPercent = Math.max(0, Math.round(Number(quote.effectiveScholarshipPercent) || 0));
  const reviewFlags: AcademyTalentPaymentTrace['reviewFlags'] = [];
  if (scholarshipPercent >= 50) {
    reviewFlags.push({
      code: 'HIGH_SCHOLARSHIP',
      message: `Ưu đãi học bổng ${scholarshipPercent}% — nên có bước rà soát chính sách khi phân tích báo cáo.`,
    });
  }
  if (invoiceRevision > 1) {
    reviewFlags.push({
      code: 'INVOICE_REVISED',
      message: `Phiếu đã có ${invoiceRevision} phiên bản; xem timeline trước khi đối chiếu doanh thu hoặc ưu đãi.`,
    });
  }
  const paymentConfirmers = new Set(
    toPaymentSummary(row, quote)
      .payments.map((payment) => payment.confirmedBy?.id)
      .filter((id): id is number => Boolean(id))
  );
  if (paymentConfirmers.size > 1) {
    reviewFlags.push({
      code: 'MULTIPLE_PAYMENT_CONFIRMERS',
      message: 'Có nhiều người xác nhận khoản thu; timeline lưu từng xác nhận để đối soát rõ trách nhiệm.',
    });
  }
  if (quote.isExpired && scholarshipPercent > 0) {
    reviewFlags.push({
      code: 'PROMOTION_AFTER_EXPIRY',
      message: 'Snapshot có ưu đãi sau thời điểm hết hạn; cần kiểm tra lại chính sách trước khi chốt báo cáo.',
    });
  }

  const snapshotMode = invoiceSnapshot?.paymentMode === 'FULL' ? 'FULL' : 'DEPOSIT';
  return {
    assessmentId: Math.max(0, Math.round(Number(row.id) || 0)),
    learner: {
      id: Math.max(0, Math.round(Number(row.lead?.id || row.leadId) || 0)),
      name: String(row.lead?.name || 'Học viên Academy').trim() || 'Học viên Academy',
      phone: row.lead?.phone?.trim() || null,
      email: row.lead?.email?.trim() || null,
      source: row.lead?.source?.trim() || null,
      createdAt: iso(row.lead?.createdAt),
    },
    invoice: {
      documentNumber: invoiceNumber,
      revision: invoiceRevision,
      issuedAt: iso(row.invoicePrintedAt || invoiceSnapshot?.issuedAt),
      paymentMode: snapshotMode,
      totalTuitionVnd: Math.max(0, Math.round(Number(quote.finalPriceVnd) || 0)),
    },
    promotion: {
      tierKey: quote.result.tier?.key || null,
      tierLabel: quote.result.tier?.title || null,
      qualified: Boolean(quote.result.qualified),
      scholarshipPercent,
      scholarshipVnd: Math.max(0, Math.round(Number(quote.scholarshipVnd) || 0)),
      catalogListPriceVnd: Math.max(0, Math.round(Number(quote.listPriceVnd) || 0)),
      catalogPromoPriceVnd: Math.max(0, Math.round(Number(quote.promoPriceVnd) || 0)),
      finalPriceVnd: Math.max(0, Math.round(Number(quote.finalPriceVnd) || 0)),
      offerExpiresAt: iso(quote.expiresAt),
      isExpired: Boolean(quote.isExpired),
      policyAudit: row.promotionPolicyAudit
        ? {
            id: Math.max(0, Math.round(Number(row.promotionPolicyAudit.id) || 0)),
            changedAt: iso(row.promotionPolicyAudit.createdAt) || new Date(0).toISOString(),
            changedBy: toStaff(row.promotionPolicyAudit.changedBy),
          }
        : null,
    },
    actors,
    events,
    reviewFlags,
  };
}

function matchesPaymentManagementStatus(
  row: AcademyTalentPaymentManagementRow,
  status: AcademyTalentPaymentManagementStatus
) {
  if (status === 'ALL') return true;
  if (status === 'FOLLOW_UP') return row.paymentStatus === 'DEPOSIT_RECEIVED' || row.paymentStatus === 'PARTIALLY_PAID';
  return row.paymentStatus === status;
}

function paymentManagementSummary(
  rows: readonly AcademyTalentPaymentManagementRow[],
  month: string,
  start: Date,
  end: Date
): AcademyTalentPaymentManagementSummary {
  let confirmedRevenueVnd = 0;
  let confirmedBankTransferVnd = 0;
  let confirmedCashVnd = 0;
  for (const row of rows) {
    for (const payment of row.payments) {
      const receivedAt = new Date(payment.receivedAt);
      if (!Number.isFinite(receivedAt.getTime()) || receivedAt < start || receivedAt > end) continue;
      confirmedRevenueVnd += payment.amountVnd;
      if (payment.method === 'CASH') confirmedCashVnd += payment.amountVnd;
      else confirmedBankTransferVnd += payment.amountVnd;
    }
  }
  return {
    month,
    confirmedRevenueVnd,
    confirmedBankTransferVnd,
    confirmedCashVnd,
    depositFollowUpVnd: rows
      .filter((row) => row.paymentStatus === 'DEPOSIT_RECEIVED')
      .reduce((sum, row) => sum + row.totalPaidVnd, 0),
    depositFollowUpCount: rows.filter((row) => row.paymentStatus === 'DEPOSIT_RECEIVED').length,
    outstandingFollowUpVnd: rows
      .filter((row) => row.paymentStatus === 'DEPOSIT_RECEIVED' || row.paymentStatus === 'PARTIALLY_PAID')
      .reduce((sum, row) => sum + row.remainingVnd, 0),
    outstandingFollowUpCount: rows.filter(
      (row) => row.paymentStatus === 'DEPOSIT_RECEIVED' || row.paymentStatus === 'PARTIALLY_PAID'
    ).length,
    paidInFullCount: rows.filter((row) => row.paymentStatus === 'PAID').length,
  };
}

export function isFullyPaid(row: SafeAny) {
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(row.invoiceSnapshotJson, null);
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(row.quoteSnapshotJson, null);
  const expectedVnd = Math.max(
    0,
    Math.round(Number(savedQuote?.finalPriceVnd ?? invoiceSnapshot?.quote.finalPriceVnd) || 0)
  );
  const paidVnd = (Array.isArray(row.payments) ? row.payments : []).reduce(
    (sum: number, payment: SafeAny) => sum + Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
    0
  );
  return expectedVnd > 0 && paidVnd >= expectedVnd;
}

export function toAssessment(
  row: SafeAny,
  now = new Date(),
  tiers?: readonly AcademyTalentTier[]
): AcademyTalentAssessment {
  const scores = toScores(row);
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(row.invoiceSnapshotJson, null);
  const courseBases = normalizeSnapshotBases(parseJson<unknown>(row.courseSnapshotJson, []));
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(row.quoteSnapshotJson, null);
  const selectedCourseIds = normalizeCourseIds(parseJson<unknown>(row.selectedCourseIds, []));
  const selectedSampleCourseIds = normalizeAddOnCourseIds(
    parseJson<unknown>(row.selectedSampleCourseIds, []),
    selectedCourseIds
  );
  const selectedKitCourseIds = normalizeAddOnCourseIds(
    parseJson<unknown>(row.selectedKitCourseIds, []),
    selectedCourseIds
  );
  const selectedInstructorIdsByCourse = parseInstructorIdsByCourse(
    row.selectedInstructorIdsByCourse,
    selectedCourseIds
  );
  const instructorSelections = Object.fromEntries(
    (savedQuote?.courses || [])
      .filter((course) => course?.instructor && selectedCourseIds.includes(Number(course.courseId)))
      .map((course) => [Number(course.courseId), course.instructor])
  ) as Record<number, AcademyTalentInstructorSnapshot>;
  const liveQuote =
    savedQuote ||
    buildAcademyTalentQuote(scores, row.offerExpiresAt, courseBases, now, {
      paymentMode: normalizePaymentMode(row.paymentMode, 'THINKING'),
      depositVnd: Number(row.depositVnd) || 0,
      selectedSampleCourseIds,
      selectedKitCourseIds,
      instructorSelections,
      tiers,
    });
  const payment = toPaymentSummary(row, liveQuote);
  // An unpaid print is a provisional quote. It must keep rendering its newest
  // saved quote so a consultant can revise and reprint it. Once paid in full,
  // the immutable snapshot becomes the source of truth for audit and receipt.
  const quote = payment.status === 'PAID' && invoiceSnapshot?.quote ? invoiceSnapshot.quote : liveQuote;
  const invoiceNumber = row.invoiceNumber ? String(row.invoiceNumber) : null;
  const rawStatus = String(row.status || 'DRAFT');
  const status = ['DRAFT', 'QUOTED', 'PRINTED', 'DEPOSIT_RECEIVED', 'PAID', 'INVOICED'].includes(rawStatus)
    ? (rawStatus as AcademyTalentAssessment['status'])
    : 'DRAFT';
  return {
    id: Number(row.id),
    leadId: Number(row.leadId),
    status,
    scores,
    quote,
    selectedCourseIds,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    selectedInstructorIdsByCourse,
    paymentMode: ACADEMY_TALENT_PAYMENT_MODES.includes(row.paymentMode) ? row.paymentMode : 'THINKING',
    depositVnd: Math.max(0, Math.round(Number(row.depositVnd) || 0)),
    payment,
    notes: row.notes ?? null,
    evaluator: toStaff(row.evaluator),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    invoice: invoiceNumber
      ? {
          documentNumber: invoiceNumber,
          printedAt: iso(row.invoicePrintedAt),
          printCount: Math.max(0, Math.round(Number(row.invoicePrintCount) || 0)),
          printedBy: toStaff(row.invoicePrintedBy),
          snapshot: invoiceSnapshot,
        }
      : null,
  };
}

/**
 * Finance-only view over immutable Academy invoices. Confirmed revenue is
 * computed exclusively from the append-only payment ledger, never from an
 * invoice print or a lead's manually editable revenue field.
 */
export async function listPaymentManagement(
  fastify: FastifyInstance,
  actor: AcademyActor,
  params: ListAcademyTalentPaymentManagementParams
): Promise<ListAcademyTalentPaymentManagementResponse> {
  const canManagePayments = canManageAcademySales(actor);
  const leadScope = canManagePayments ? {} : await AcademySalesService.getLeadAccessWhere(fastify, actor);
  const page = Math.max(1, toNonNegativeInteger(params.page, 1, 100000, 'Trang'));
  const limit = Math.max(1, toNonNegativeInteger(params.limit, 20, 100, 'Số dòng mỗi trang'));
  const selectedStatus = String(params.status || 'ALL')
    .trim()
    .toUpperCase() as AcademyTalentPaymentManagementStatus;
  const acceptedStatuses: readonly AcademyTalentPaymentManagementStatus[] = [
    'ALL',
    'FOLLOW_UP',
    'UNPAID',
    'PARTIALLY_PAID',
    'DEPOSIT_RECEIVED',
    'PAID',
  ];
  if (!acceptedStatuses.includes(selectedStatus)) {
    throw new AcademySalesError('Bộ lọc trạng thái thu học phí không hợp lệ.');
  }
  const { month, start, end } = getAcademyIctMonthBounds(params.month);
  const sourceRows = await fastify.prisma.crm.crmAcademyTalentAssessment.findMany({
    where: { invoiceNumber: { not: null }, lead: leadScope },
    include: {
      lead: { select: { id: true, name: true, phone: true } },
      payments: {
        include: { confirmedBy: { select: { id: true, displayName: true, email: true } } },
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
      },
    },
    orderBy: [{ invoicePrintedAt: 'desc' }, { id: 'desc' }],
  });
  const rows = sourceRows
    .map(toPaymentManagementRow)
    .filter((row): row is AcademyTalentPaymentManagementRow => Boolean(row));
  const normalizedSearch = removeVietnameseTones(String(params.search || ''));
  const filteredRows = rows.filter((row) => {
    if (!matchesPaymentManagementStatus(row, selectedStatus)) return false;
    if (!normalizedSearch) return true;
    return removeVietnameseTones(
      `${row.lead.name} ${row.lead.phone || ''} ${row.invoiceNumber} ${row.courseLabel}`
    ).includes(normalizedSearch);
  });
  const total = filteredRows.length;
  const startIndex = (page - 1) * limit;
  return {
    data: filteredRows.slice(startIndex, startIndex + limit),
    total,
    page,
    limit,
    // KPI remains a month-level accounting view. It must not disappear just
    // because the operator narrows the table to the follow-up queue.
    summary: paymentManagementSummary(rows, month, start, end),
  };
}

/**
 * Returns a single, auditable tuition trail. The list endpoint stays lean;
 * this detail endpoint keeps every learner, actor, promotion snapshot and
 * append-only activity available for finance review and future reporting.
 */
export async function getPaymentTrace(
  fastify: FastifyInstance,
  actor: AcademyActor,
  assessmentId: number
): Promise<AcademyTalentPaymentTraceResponse> {
  const assessment = await fastify.prisma.crm.crmAcademyTalentAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      ...ASSESSMENT_RELATION_INCLUDE,
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          source: true,
          createdAt: true,
          owner: { select: { id: true, displayName: true, email: true } },
          createdBy: { select: { id: true, displayName: true, email: true } },
        },
      },
      promotionPolicyAudit: {
        include: { changedBy: { select: { id: true, displayName: true, email: true } } },
      },
    },
  });
  if (!assessment) throw new AcademySalesError('Không tìm thấy phiếu học phí Academy.', 404);
  await AcademySalesService.getAccessibleLead(fastify, actor, assessment.leadId);
  const activities = await fastify.prisma.crm.crmAcademyLeadActivity.findMany({
    where: {
      leadId: assessment.leadId,
      activityType: { in: ['TALENT_ASSESSMENT', 'INVOICE_PRINTED', 'PAYMENT_RECEIVED'] },
    },
    include: { actor: { select: { id: true, displayName: true, email: true } } },
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
  });
  const assessmentActivities = activities.filter((activity) => {
    const metadata = parseJson<SafeAny>(activity.metadata, {});
    return Math.round(Number(metadata.assessmentId) || 0) === assessmentId;
  });
  return { data: toPaymentTrace(assessment, assessmentActivities) };
}
