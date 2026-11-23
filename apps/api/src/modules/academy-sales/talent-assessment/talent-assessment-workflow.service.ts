import type { FastifyInstance } from 'fastify';
import {
  calculateAcademyTalentAssessmentResult,
  type AcademyTalentAssessmentActionResponse,
  type AcademyTalentAssessmentQuote,
  type AcademyTalentAssessmentScores,
  type AcademyTalentPaymentMode,
  type AcademyTalentTier,
  type CreateAcademyTalentAssessmentRequest,
  type ListAcademyTalentAssessmentsResponse,
  type PreviewAcademyTalentAssessmentQuoteRequest,
  type PreviewAcademyTalentAssessmentQuoteResponse,
  type SafeAny,
  type UpdateAcademyTalentAssessmentRequest,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { AcademySalesError, AcademySalesService, type AcademyActor } from '../academy-sales.service.js';
import { AcademyTalentLadderConfigurationService } from '../academy-talent-ladder-configuration.service.js';
import { resolveInstructorSelections } from './talent-assessment-instructors.service.js';
import { isFullyPaid, toAssessment } from './talent-assessment-payment-audit.service.js';
import {
  ASSESSMENT_RELATION_INCLUDE,
  type QuoteOptions,
  type SnapshotBase,
  assertDepositIsValid,
  assertValidAcademyTalentCourseSelection,
  buildAcademyTalentQuote,
  describeCourses,
  normalizeAddOnCourseIds,
  normalizeCourseIds,
  normalizeDeposit,
  normalizeInstructorIdsByCourse,
  normalizePaymentMode,
  normalizePaymentModeForCourses,
  normalizeSnapshotBases,
  offerExpiry,
  parseInstructorIdsByCourse,
  parseJson,
  parseOptionalAssessmentId,
  toScores,
  toSnapshotBase,
} from './talent-assessment-quote-and-validators.js';

async function resolveWorkshopParticipantAttribution(
  fastify: FastifyInstance,
  leadId: number,
  value: unknown
): Promise<number | null> {
  if (value === undefined || value === null) return null;
  const participantId = Number(value);
  if (!Number.isInteger(participantId) || participantId <= 0) {
    throw new AcademySalesError('Workshop participant không hợp lệ.');
  }
  const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, campaignLead: { select: { leadId: true, removedAt: true } } },
  });
  if (!participant || participant.campaignLead.leadId !== leadId || participant.campaignLead.removedAt) {
    throw new AcademySalesError('Workshop participant không khớp với học viên Tố Chất.', 409);
  }
  return participant.id;
}

async function resolveCourseSnapshots(fastify: FastifyInstance, ids: number[]): Promise<SnapshotBase[]> {
  if (!ids.length) return [];
  const courses = await fastify.prisma.crm.crmAcademyCourse.findMany({
    where: { id: { in: ids }, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  if (courses.length !== ids.length) {
    throw new AcademySalesError('Một hoặc nhiều khóa học đã không còn hoạt động. Vui lòng chọn lại.');
  }
  const byId = new Map(courses.map((course) => [course.id, course]));
  return ids.map((id) => toSnapshotBase(byId.get(id)));
}

/**
 * Keep the recommendation on the server. The legacy workshop chose Combo for
 * tier 3+ and Foundation for the other outcomes; this maps that same policy to
 * the active native course catalogue, with a name fallback for migrated data.
 */
export async function resolveAcademyTalentRecommendation(
  fastify: FastifyInstance,
  scores: AcademyTalentAssessmentScores,
  tiers?: readonly AcademyTalentTier[]
): Promise<Pick<QuoteOptions, 'recommendedCourseIds' | 'recommendation'>> {
  const result = calculateAcademyTalentAssessmentResult(scores, tiers);
  const isHighTier = ['level3', 'level4', 'level5', 'level6'].includes(result.tier?.key || '');
  const expectedCode = isHighTier ? 'combo' : 'basic';
  const courses = await fastify.prisma.crm.crmAcademyCourse.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const fallbackName = isHighTier ? /combo|tron goi|full program/ : /basic|nen tang|foundation/;
  const recommended =
    courses.find((course) => course.code === expectedCode) ||
    courses.find((course) => fallbackName.test(removeVietnameseTones(course.name)));
  const scholarship = result.scholarshipPercent;
  const title = isHighTier
    ? scholarship >= 50
      ? `Học bổng ${scholarship}% · Combo trọn gói phù hợp nhất`
      : `${result.tier?.title || 'Tiềm năng'} · Combo trọn gói phù hợp nhất`
    : 'Khởi đầu vững chắc · Khóa nền tảng phù hợp nhất';
  const summary = isHighTier
    ? 'Kết quả thử thách phù hợp để học theo lộ trình trọn gói; bạn vẫn có thể chọn bất kỳ khóa đang hoạt động nào.'
    : 'Ưu tiên xây nền tảng kỹ thuật trước; bạn vẫn có thể chọn bất kỳ khóa đang hoạt động nào.';
  return { recommendedCourseIds: recommended ? [recommended.id] : [], recommendation: { title, summary } };
}

/**
 * Builds the exact quote shown while an evaluator is still changing a draft.
 * It deliberately shares the persisted workflow's score, catalogue,
 * recommendation, deposit and expiry primitives instead of allowing the web
 * client to infer a reward from an unsaved value.
 */
async function buildLiveAcademyTalentQuote(
  fastify: FastifyInstance,
  input: PreviewAcademyTalentAssessmentQuoteRequest,
  options: {
    source: SafeAny;
    expiresAt: Date | string;
    fallbackSelectedCourseIds: number[];
    fallbackCourseBases: SnapshotBase[];
    fallbackSelectedSampleCourseIds: number[];
    fallbackSelectedKitCourseIds: number[];
    fallbackSelectedInstructorIdsByCourse: Record<string, number>;
    fallbackPaymentMode: AcademyTalentPaymentMode;
    fallbackDepositVnd: number;
    tiers: readonly AcademyTalentTier[];
  },
  now = new Date()
): Promise<AcademyTalentAssessmentQuote> {
  const scores = toScores(options.source, input);
  const selectedCourseIds =
    input.selectedCourseIds === undefined
      ? options.fallbackSelectedCourseIds
      : normalizeCourseIds(input.selectedCourseIds);
  const courseBases =
    input.selectedCourseIds === undefined
      ? options.fallbackCourseBases
      : await resolveCourseSnapshots(fastify, selectedCourseIds);
  const selectedSampleCourseIds =
    input.selectedSampleCourseIds === undefined
      ? normalizeAddOnCourseIds(options.fallbackSelectedSampleCourseIds, selectedCourseIds)
      : normalizeAddOnCourseIds(input.selectedSampleCourseIds, selectedCourseIds);
  const selectedKitCourseIds =
    input.selectedKitCourseIds === undefined
      ? normalizeAddOnCourseIds(options.fallbackSelectedKitCourseIds, selectedCourseIds)
      : normalizeAddOnCourseIds(input.selectedKitCourseIds, selectedCourseIds);
  const selectedInstructorIdsByCourse =
    input.selectedInstructorIdsByCourse === undefined
      ? normalizeInstructorIdsByCourse(options.fallbackSelectedInstructorIdsByCourse, selectedCourseIds)
      : normalizeInstructorIdsByCourse(input.selectedInstructorIdsByCourse, selectedCourseIds);
  const instructorSelections = await resolveInstructorSelections(
    fastify,
    selectedCourseIds,
    selectedInstructorIdsByCourse
  );
  const paymentMode = normalizePaymentModeForCourses(input.paymentMode, options.fallbackPaymentMode, selectedCourseIds);
  assertValidAcademyTalentCourseSelection(scores, courseBases, instructorSelections, options.tiers);
  const recommendation = await resolveAcademyTalentRecommendation(fastify, scores, options.tiers);
  const preliminaryQuote = buildAcademyTalentQuote(scores, options.expiresAt, courseBases, now, {
    ...recommendation,
    paymentMode,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers: options.tiers,
  });
  const fallbackDeposit =
    paymentMode === 'DEPOSIT' && options.fallbackDepositVnd === 0
      ? preliminaryQuote.suggestedDepositVnd
      : options.fallbackDepositVnd;
  const requestedDeposit = paymentMode === 'THINKING' ? 0 : normalizeDeposit(input.depositVnd, fallbackDeposit);
  const depositVnd = paymentMode === 'FULL' ? preliminaryQuote.finalPriceVnd : requestedDeposit;
  const quote = buildAcademyTalentQuote(scores, options.expiresAt, courseBases, now, {
    ...recommendation,
    paymentMode,
    depositVnd,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers: options.tiers,
  });
  assertDepositIsValid(paymentMode, depositVnd, quote);
  return quote;
}

export async function readAccessibleAssessment(fastify: FastifyInstance, actor: AcademyActor, assessmentId: number) {
  const assessment = await fastify.prisma.crm.crmAcademyTalentAssessment.findUnique({
    where: { id: assessmentId },
    include: ASSESSMENT_RELATION_INCLUDE,
  });
  if (!assessment) throw new AcademySalesError('Không tìm thấy phiên Tố Chất.', 404);
  await AcademySalesService.getAccessibleLead(fastify, actor, assessment.leadId);
  return assessment;
}

export async function listAssessmentsForLead(
  fastify: FastifyInstance,
  actor: AcademyActor,
  leadId: number
): Promise<ListAcademyTalentAssessmentsResponse> {
  await AcademySalesService.getAccessibleLead(fastify, actor, leadId);
  const rows = await fastify.prisma.crm.crmAcademyTalentAssessment.findMany({
    where: { leadId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: ASSESSMENT_RELATION_INCLUDE,
  });
  const tiers = await AcademyTalentLadderConfigurationService.getCalculationTiers(fastify);
  const data = rows.map((row) => toAssessment(row, new Date(), tiers));
  return { data, latest: data[0] ?? null };
}

/**
 * Preview an unsaved workshop draft without producing an activity, changing
 * the lead, or replacing a persisted quote. The lead/session scope is still
 * enforced because quote data includes Academy tuition catalogue details.
 */
export async function previewTalentQuote(
  fastify: FastifyInstance,
  actor: AcademyActor,
  leadId: number,
  input: PreviewAcademyTalentAssessmentQuoteRequest = {}
): Promise<PreviewAcademyTalentAssessmentQuoteResponse> {
  const assessmentId = parseOptionalAssessmentId(input.assessmentId);
  const existing = assessmentId === null ? null : await readAccessibleAssessment(fastify, actor, assessmentId);
  if (existing && Number(existing.leadId) !== leadId) {
    throw new AcademySalesError('Phiên Tố Chất không thuộc lead Academy này.', 404);
  }
  if (existing && isFullyPaid(existing)) {
    throw new AcademySalesError('Phiếu học phí đã thanh toán đủ và được khóa để giữ đúng đối soát.', 409);
  }
  if (!existing) await AcademySalesService.getAccessibleLead(fastify, actor, leadId);

  const now = new Date();
  const previousSelectedCourseIds = existing
    ? normalizeCourseIds(parseJson<unknown>(existing.selectedCourseIds, []))
    : [];
  const previousSelectedSampleCourseIds = existing
    ? normalizeAddOnCourseIds(parseJson<unknown>(existing.selectedSampleCourseIds, []), previousSelectedCourseIds)
    : [];
  const previousSelectedKitCourseIds = existing
    ? normalizeAddOnCourseIds(parseJson<unknown>(existing.selectedKitCourseIds, []), previousSelectedCourseIds)
    : [];
  const previousSelectedInstructorIdsByCourse = existing
    ? parseInstructorIdsByCourse(existing.selectedInstructorIdsByCourse, previousSelectedCourseIds)
    : {};
  const tiers = await AcademyTalentLadderConfigurationService.getCalculationTiers(fastify);
  const quote = await buildLiveAcademyTalentQuote(
    fastify,
    input,
    {
      source: existing || {},
      expiresAt: existing?.offerExpiresAt || offerExpiry(now),
      fallbackSelectedCourseIds: previousSelectedCourseIds,
      fallbackCourseBases: existing ? normalizeSnapshotBases(parseJson<unknown>(existing.courseSnapshotJson, [])) : [],
      fallbackSelectedSampleCourseIds: previousSelectedSampleCourseIds,
      fallbackSelectedKitCourseIds: previousSelectedKitCourseIds,
      fallbackSelectedInstructorIdsByCourse: previousSelectedInstructorIdsByCourse,
      fallbackPaymentMode: normalizePaymentMode(existing?.paymentMode, 'THINKING'),
      fallbackDepositVnd: Math.max(0, Math.round(Number(existing?.depositVnd) || 0)),
      tiers,
    },
    now
  );
  return { data: quote };
}

export async function createTalentAssessment(
  fastify: FastifyInstance,
  actor: AcademyActor,
  leadId: number,
  input: CreateAcademyTalentAssessmentRequest = {}
): Promise<AcademyTalentAssessmentActionResponse> {
  await AcademySalesService.getAccessibleLead(fastify, actor, leadId);
  const workshopParticipantId = await resolveWorkshopParticipantAttribution(
    fastify,
    leadId,
    input.workshopParticipantId
  );
  const now = new Date();
  const scores = toScores({}, input);
  const selectedCourseIds = normalizeCourseIds(input.selectedCourseIds);
  const selectedSampleCourseIds = normalizeAddOnCourseIds(input.selectedSampleCourseIds, selectedCourseIds);
  const selectedKitCourseIds = normalizeAddOnCourseIds(input.selectedKitCourseIds, selectedCourseIds);
  const selectedInstructorIdsByCourse = normalizeInstructorIdsByCourse(
    input.selectedInstructorIdsByCourse,
    selectedCourseIds
  );
  const courseBases = await resolveCourseSnapshots(fastify, selectedCourseIds);
  const instructorSelections = await resolveInstructorSelections(
    fastify,
    selectedCourseIds,
    selectedInstructorIdsByCourse
  );
  const paymentMode = normalizePaymentModeForCourses(input.paymentMode, 'THINKING', selectedCourseIds);
  const expiry = offerExpiry(now);
  const promotionPolicy = await AcademyTalentLadderConfigurationService.getCalculationPolicy(fastify);
  const tiers = promotionPolicy.tiers;
  assertValidAcademyTalentCourseSelection(scores, courseBases, instructorSelections, tiers);
  const recommendation = await resolveAcademyTalentRecommendation(fastify, scores, tiers);
  const preliminaryQuote = buildAcademyTalentQuote(scores, expiry, courseBases, now, {
    ...recommendation,
    paymentMode,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers,
  });
  const requestedDeposit =
    paymentMode === 'THINKING'
      ? 0
      : normalizeDeposit(input.depositVnd, paymentMode === 'DEPOSIT' ? preliminaryQuote.suggestedDepositVnd : 0);
  const depositVnd = paymentMode === 'FULL' ? preliminaryQuote.finalPriceVnd : requestedDeposit;
  const quote = buildAcademyTalentQuote(scores, expiry, courseBases, now, {
    ...recommendation,
    paymentMode,
    depositVnd,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers,
  });
  assertDepositIsValid(paymentMode, depositVnd, quote);
  const status = selectedCourseIds.length ? 'QUOTED' : 'DRAFT';

  const row = await fastify.prisma.crm.$transaction(async (tx) => {
    const created = await tx.crmAcademyTalentAssessment.create({
      data: {
        leadId,
        workshopParticipantId,
        evaluatorStaffId: actor.id,
        status,
        ...scores,
        offerExpiresAt: expiry,
        selectedCourseIds: JSON.stringify(selectedCourseIds),
        selectedSampleCourseIds: JSON.stringify(selectedSampleCourseIds),
        selectedKitCourseIds: JSON.stringify(selectedKitCourseIds),
        selectedInstructorIdsByCourse: JSON.stringify(selectedInstructorIdsByCourse),
        courseSnapshotJson: JSON.stringify(courseBases),
        quoteSnapshotJson: JSON.stringify(quote),
        promotionPolicyAuditId: promotionPolicy.auditId,
        paymentMode,
        depositVnd,
        notes: input.notes?.trim() || null,
      },
      include: ASSESSMENT_RELATION_INCLUDE,
    });
    await tx.crmAcademyLeadActivity.create({
      data: {
        leadId,
        activityType: 'TALENT_ASSESSMENT',
        content: 'Tạo phiên đánh giá Tố Chất.',
        metadata: JSON.stringify({
          assessmentId: created.id,
          action: 'created',
          scores,
          selectedCourseIds,
          selectedSampleCourseIds,
          selectedKitCourseIds,
          selectedInstructorIdsByCourse,
          quote,
        }),
        actorStaffId: actor.id,
        occurredAt: now,
      },
    });
    return created;
  });
  return { success: true, data: toAssessment(row, now, tiers), message: 'Đã tạo phiên Tố Chất.' };
}

export async function updateTalentAssessment(
  fastify: FastifyInstance,
  actor: AcademyActor,
  assessmentId: number,
  input: UpdateAcademyTalentAssessmentRequest
): Promise<AcademyTalentAssessmentActionResponse> {
  const existing = await readAccessibleAssessment(fastify, actor, assessmentId);
  if (input.workshopParticipantId !== undefined) {
    const requestedParticipantId = await resolveWorkshopParticipantAttribution(
      fastify,
      existing.leadId,
      input.workshopParticipantId
    );
    if ((existing.workshopParticipantId ?? null) !== requestedParticipantId) {
      throw new AcademySalesError('Không thể đổi workshop attribution của phiên Tố Chất đã tạo.', 409);
    }
  }
  if (isFullyPaid(existing)) {
    throw new AcademySalesError('Phiếu học phí đã thanh toán đủ và được khóa để giữ đúng đối soát.', 409);
  }
  const now = new Date();
  const scores = toScores(existing, input);
  const previousCourseIds = normalizeCourseIds(parseJson<unknown>(existing.selectedCourseIds, []));
  const selectedCourseIds =
    input.selectedCourseIds === undefined ? previousCourseIds : normalizeCourseIds(input.selectedCourseIds);
  const previousSelectedSampleCourseIds = normalizeAddOnCourseIds(
    parseJson<unknown>(existing.selectedSampleCourseIds, []),
    previousCourseIds
  );
  const previousSelectedKitCourseIds = normalizeAddOnCourseIds(
    parseJson<unknown>(existing.selectedKitCourseIds, []),
    previousCourseIds
  );
  const previousSelectedInstructorIdsByCourse = parseInstructorIdsByCourse(
    existing.selectedInstructorIdsByCourse,
    previousCourseIds
  );
  const selectedSampleCourseIds =
    input.selectedSampleCourseIds === undefined
      ? input.selectedCourseIds === undefined
        ? previousSelectedSampleCourseIds
        : []
      : normalizeAddOnCourseIds(input.selectedSampleCourseIds, selectedCourseIds);
  const selectedKitCourseIds =
    input.selectedKitCourseIds === undefined
      ? input.selectedCourseIds === undefined
        ? previousSelectedKitCourseIds
        : []
      : normalizeAddOnCourseIds(input.selectedKitCourseIds, selectedCourseIds);
  const selectedInstructorIdsByCourse =
    input.selectedInstructorIdsByCourse === undefined
      ? input.selectedCourseIds === undefined
        ? normalizeInstructorIdsByCourse(previousSelectedInstructorIdsByCourse, selectedCourseIds)
        : {}
      : normalizeInstructorIdsByCourse(input.selectedInstructorIdsByCourse, selectedCourseIds);
  const courseBases =
    input.selectedCourseIds === undefined
      ? normalizeSnapshotBases(parseJson<unknown>(existing.courseSnapshotJson, []))
      : await resolveCourseSnapshots(fastify, selectedCourseIds);
  const instructorSelections = await resolveInstructorSelections(
    fastify,
    selectedCourseIds,
    selectedInstructorIdsByCourse
  );
  const paymentMode = normalizePaymentModeForCourses(
    input.paymentMode,
    normalizePaymentMode(existing.paymentMode, 'THINKING'),
    selectedCourseIds
  );
  const promotionPolicy = await AcademyTalentLadderConfigurationService.getCalculationPolicy(fastify);
  const tiers = promotionPolicy.tiers;
  assertValidAcademyTalentCourseSelection(scores, courseBases, instructorSelections, tiers);
  const recommendation = await resolveAcademyTalentRecommendation(fastify, scores, tiers);
  const preliminaryQuote = buildAcademyTalentQuote(scores, existing.offerExpiresAt, courseBases, now, {
    ...recommendation,
    paymentMode,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers,
  });
  const existingDeposit = Math.max(0, Math.round(Number(existing.depositVnd) || 0));
  const requestedDeposit =
    paymentMode === 'THINKING'
      ? 0
      : normalizeDeposit(
          input.depositVnd,
          paymentMode === 'DEPOSIT' && existingDeposit === 0 ? preliminaryQuote.suggestedDepositVnd : existingDeposit
        );
  const depositVnd = paymentMode === 'FULL' ? preliminaryQuote.finalPriceVnd : requestedDeposit;
  const quote = buildAcademyTalentQuote(scores, existing.offerExpiresAt, courseBases, now, {
    ...recommendation,
    paymentMode,
    depositVnd,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers,
  });
  assertDepositIsValid(paymentMode, depositVnd, quote);
  const confirmedPaidVnd = (Array.isArray(existing.payments) ? existing.payments : []).reduce(
    (sum: number, payment: SafeAny) => sum + Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
    0
  );
  if (confirmedPaidVnd > quote.finalPriceVnd) {
    throw new AcademySalesError('Không thể điều chỉnh học phí thấp hơn số tiền đã xác nhận nhận được.', 409);
  }
  const notes = input.notes === undefined ? existing.notes : input.notes?.trim() || null;
  const status = selectedCourseIds.length ? 'QUOTED' : 'DRAFT';

  const row = await fastify.prisma.crm.$transaction(async (tx) => {
    const updated = await tx.crmAcademyTalentAssessment.update({
      where: { id: assessmentId },
      data: {
        status,
        ...scores,
        selectedCourseIds: JSON.stringify(selectedCourseIds),
        selectedSampleCourseIds: JSON.stringify(selectedSampleCourseIds),
        selectedKitCourseIds: JSON.stringify(selectedKitCourseIds),
        selectedInstructorIdsByCourse: JSON.stringify(selectedInstructorIdsByCourse),
        courseSnapshotJson: JSON.stringify(courseBases),
        quoteSnapshotJson: JSON.stringify(quote),
        promotionPolicyAuditId: promotionPolicy.auditId,
        paymentMode,
        depositVnd,
        notes,
      },
      include: ASSESSMENT_RELATION_INCLUDE,
    });
    await tx.crmAcademyLeadActivity.create({
      data: {
        leadId: existing.leadId,
        activityType: 'TALENT_ASSESSMENT',
        content:
          selectedCourseIds.join(',') !== previousCourseIds.join(',')
            ? `Cập nhật Tố Chất và chọn khóa: ${describeCourses(quote) || 'chưa chọn'}.`
            : 'Cập nhật điểm đánh giá Tố Chất.',
        metadata: JSON.stringify({
          assessmentId,
          action: 'updated',
          scores,
          previousCourseIds,
          selectedCourseIds,
          selectedSampleCourseIds,
          selectedKitCourseIds,
          selectedInstructorIdsByCourse,
          paymentMode,
          depositVnd,
          quote,
        }),
        actorStaffId: actor.id,
        occurredAt: now,
      },
    });
    return updated;
  });
  return { success: true, data: toAssessment(row, now, tiers), message: 'Đã lưu đánh giá và báo giá Tố Chất.' };
}
