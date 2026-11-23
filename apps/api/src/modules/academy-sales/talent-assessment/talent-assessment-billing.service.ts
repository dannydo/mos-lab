import type { FastifyInstance } from 'fastify';
import type {
  AcademyTalentAssessmentActionResponse,
  AcademyTalentAssessmentQuote,
  AcademyTalentInstructorSnapshot,
  AcademyTalentInvoiceSnapshot,
  RecordAcademyTalentPaymentRequest,
} from '@mos-lab/shared';
import { AcademyWorkshopBonusService } from '../../academy-workshops/academy-workshop-bonus.service.js';
import { AcademySalesError, type AcademyActor } from '../academy-sales.service.js';
import { AcademyTalentLadderConfigurationService } from '../academy-talent-ladder-configuration.service.js';
import { resolveInstructorSelections } from './talent-assessment-instructors.service.js';
import { isFullyPaid, toAssessment, toPaymentSummary } from './talent-assessment-payment-audit.service.js';
import {
  ASSESSMENT_RELATION_INCLUDE,
  assertDepositIsValid,
  buildAcademyTalentQuote,
  calculateAcademyTalentPaymentStatus,
  describeCourses,
  formatIctDate,
  normalizeAddOnCourseIds,
  normalizeCourseIds,
  normalizePaymentMethod,
  normalizePaymentMode,
  normalizeSnapshotBases,
  parseInstructorIdsByCourse,
  parseJson,
  toScores,
} from './talent-assessment-quote-and-validators.js';
import { readAccessibleAssessment, resolveAcademyTalentRecommendation } from './talent-assessment-workflow.service.js';

export async function printTalentInvoice(
  fastify: FastifyInstance,
  actor: AcademyActor,
  assessmentId: number
): Promise<AcademyTalentAssessmentActionResponse> {
  const existing = await readAccessibleAssessment(fastify, actor, assessmentId);
  const now = new Date();
  const promotionPolicy = await AcademyTalentLadderConfigurationService.getCalculationPolicy(fastify);
  const tiers = promotionPolicy.tiers;
  const previousInvoice = parseJson<AcademyTalentInvoiceSnapshot | null>(existing.invoiceSnapshotJson, null);
  if (isFullyPaid(existing)) {
    if (!previousInvoice) throw new AcademySalesError('Thiếu bản chốt của phiếu đã thanh toán.', 409);
    const row = await fastify.prisma.crm.$transaction(async (tx) => {
      const updated = await tx.crmAcademyTalentAssessment.update({
        where: { id: assessmentId },
        data: {
          invoicePrintedAt: now,
          invoicePrintedByStaffId: actor.id,
          invoicePrintCount: { increment: 1 },
        },
        include: ASSESSMENT_RELATION_INCLUDE,
      });
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId: existing.leadId,
          activityType: 'INVOICE_PRINTED',
          content: `In lại phiếu đã thanh toán ${previousInvoice.documentNumber}.`,
          metadata: JSON.stringify({
            assessmentId,
            documentNumber: previousInvoice.documentNumber,
            reprint: true,
            paymentLocked: true,
          }),
          actorStaffId: actor.id,
          occurredAt: now,
        },
      });
      return updated;
    });
    return { success: true, data: toAssessment(row, now, tiers), message: 'Đã chuẩn bị lại phiếu đã thanh toán.' };
  }

  const courseBases = normalizeSnapshotBases(parseJson<unknown>(existing.courseSnapshotJson, []));
  if (!courseBases.length) throw new AcademySalesError('Vui lòng chọn ít nhất một khóa học trước khi in phiếu.');
  const paymentMode = normalizePaymentMode(existing.paymentMode, 'THINKING');
  if (paymentMode === 'THINKING') {
    throw new AcademySalesError('Vui lòng chọn hình thức thanh toán trước khi in phiếu.');
  }
  const scores = toScores(existing);
  const selectedCourseIds = normalizeCourseIds(parseJson<unknown>(existing.selectedCourseIds, []));
  const selectedSampleCourseIds = normalizeAddOnCourseIds(
    parseJson<unknown>(existing.selectedSampleCourseIds, []),
    selectedCourseIds
  );
  const selectedKitCourseIds = normalizeAddOnCourseIds(
    parseJson<unknown>(existing.selectedKitCourseIds, []),
    selectedCourseIds
  );
  const selectedInstructorIdsByCourse = parseInstructorIdsByCourse(
    existing.selectedInstructorIdsByCourse,
    selectedCourseIds
  );
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(existing.quoteSnapshotJson, null);
  const recommendation = savedQuote?.recommendedCourseIds?.length
    ? { recommendedCourseIds: savedQuote.recommendedCourseIds, recommendation: savedQuote.recommendation }
    : await resolveAcademyTalentRecommendation(fastify, scores, tiers);
  const savedInstructorSelections = Object.fromEntries(
    (savedQuote?.courses || [])
      .filter((course) => course?.instructor && selectedCourseIds.includes(Number(course.courseId)))
      .map((course) => [Number(course.courseId), course.instructor])
  ) as Record<number, AcademyTalentInstructorSnapshot>;
  const instructorSelections = Object.keys(savedInstructorSelections).length
    ? savedInstructorSelections
    : await resolveInstructorSelections(fastify, selectedCourseIds, selectedInstructorIdsByCourse);
  const preliminaryQuote = buildAcademyTalentQuote(scores, existing.offerExpiresAt, courseBases, now, {
    ...recommendation,
    paymentMode,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers,
  });
  const depositVnd =
    paymentMode === 'FULL'
      ? preliminaryQuote.finalPriceVnd
      : Math.max(0, Math.round(Number(existing.depositVnd) || preliminaryQuote.suggestedDepositVnd));
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
  const payment = toPaymentSummary(existing, quote);
  if (payment.totalPaidVnd > quote.finalPriceVnd) {
    throw new AcademySalesError('Không thể in phiếu có học phí thấp hơn số tiền đã xác nhận.', 409);
  }
  const revision = Math.max(0, Math.round(Number(existing.invoiceRevision) || 0)) + 1;
  const documentBase = `WA-${formatIctDate(now)}-${String(assessmentId).padStart(6, '0')}`;
  const documentNumber = revision > 1 ? `${documentBase}-R${revision}` : documentBase;
  const snapshot: AcademyTalentInvoiceSnapshot = {
    documentNumber,
    paymentMode,
    depositVnd,
    quote,
    issuedAt: now.toISOString(),
  };
  const nextStatus = payment.status === 'DEPOSIT_RECEIVED' ? 'DEPOSIT_RECEIVED' : 'PRINTED';
  const row = await fastify.prisma.crm.$transaction(async (tx) => {
    const updated = await tx.crmAcademyTalentAssessment.update({
      where: { id: assessmentId },
      data: {
        status: nextStatus,
        paymentMode,
        depositVnd,
        invoiceNumber: documentNumber,
        invoiceRevision: revision,
        promotionPolicyAuditId: promotionPolicy.auditId,
        invoiceSnapshotJson: JSON.stringify(snapshot),
        invoicePrintedAt: now,
        invoicePrintedByStaffId: actor.id,
        invoicePrintCount: { increment: 1 },
      },
      include: ASSESSMENT_RELATION_INCLUDE,
    });
    // Do not mark a lead WON or write revenue here. A printed document is
    // payment intent; cash only becomes confirmed through recordPayment.
    await tx.crmAcademyLead.update({
      where: { id: existing.leadId },
      data: { course: describeCourses(quote) || null },
    });
    await tx.crmAcademyLeadActivity.create({
      data: {
        leadId: existing.leadId,
        activityType: 'INVOICE_PRINTED',
        content: previousInvoice
          ? `In phiên bản điều chỉnh ${documentNumber} thay cho ${previousInvoice.documentNumber}.`
          : `In phiếu học phí ${documentNumber} — ${describeCourses(quote)}.`,
        metadata: JSON.stringify({
          assessmentId,
          documentNumber,
          revision,
          previousDocumentNumber: previousInvoice?.documentNumber ?? null,
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
  return {
    success: true,
    data: toAssessment(row, now, tiers),
    message: previousInvoice ? 'Đã chuẩn bị phiên bản điều chỉnh của phiếu để in.' : 'Đã chuẩn bị phiếu học phí để in.',
  };
}

export async function recordTalentPayment(
  fastify: FastifyInstance,
  actor: AcademyActor,
  assessmentId: number,
  input: RecordAcademyTalentPaymentRequest
): Promise<AcademyTalentAssessmentActionResponse> {
  const existing = await readAccessibleAssessment(fastify, actor, assessmentId);
  if (!existing.invoiceSnapshotJson) {
    throw new AcademySalesError('Cần in phiếu trước khi xác nhận tiền đã nhận.', 409);
  }
  if (isFullyPaid(existing)) {
    throw new AcademySalesError('Phiếu này đã thanh toán đủ; không thể ghi thêm tiền.', 409);
  }
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(existing.quoteSnapshotJson, null);
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(existing.invoiceSnapshotJson, null);
  const quote = savedQuote || invoiceSnapshot?.quote;
  if (!quote || quote.finalPriceVnd <= 0) throw new AcademySalesError('Không xác định được học phí của phiếu.', 409);
  const amountVnd = Math.round(Number(input.amountVnd));
  if (!Number.isInteger(amountVnd) || amountVnd <= 0) {
    throw new AcademySalesError('Số tiền xác nhận phải là VND nguyên dương.');
  }
  const paymentBefore = toPaymentSummary(existing, quote);
  if (amountVnd > paymentBefore.remainingVnd) {
    throw new AcademySalesError(
      `Số tiền xác nhận vượt quá phần còn lại ${paymentBefore.remainingVnd.toLocaleString('vi-VN')} đ.`,
      409
    );
  }
  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
  if (!Number.isFinite(receivedAt.getTime())) throw new AcademySalesError('Thời điểm nhận tiền không hợp lệ.');
  const reference = input.reference?.trim().slice(0, 160) || null;
  const note = input.note?.trim() || null;
  const method = normalizePaymentMethod(input.method);
  const totalAfterVnd = paymentBefore.totalPaidVnd + amountVnd;
  const paymentMode = normalizePaymentMode(existing.paymentMode, 'THINKING');
  const requiredDepositVnd = Math.max(0, Math.round(Number(existing.depositVnd) || quote.suggestedDepositVnd || 0));
  const paymentStatus = calculateAcademyTalentPaymentStatus(
    paymentMode,
    totalAfterVnd,
    quote.finalPriceVnd,
    requiredDepositVnd
  );
  const nextStatus =
    paymentStatus === 'PAID' ? 'PAID' : paymentStatus === 'DEPOSIT_RECEIVED' ? 'DEPOSIT_RECEIVED' : 'PRINTED';
  const tiers = await AcademyTalentLadderConfigurationService.getCalculationTiers(fastify);
  const row = await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyTalentPayment.create({
      data: {
        assessmentId,
        amountVnd,
        paymentMethod: method,
        reference,
        note,
        receivedAt,
        confirmedByStaffId: actor.id,
      },
    });
    const updated = await tx.crmAcademyTalentAssessment.update({
      where: { id: assessmentId },
      data: { status: nextStatus },
      include: ASSESSMENT_RELATION_INCLUDE,
    });
    await tx.crmAcademyLeadActivity.create({
      data: {
        leadId: existing.leadId,
        activityType: 'PAYMENT_RECEIVED',
        content:
          nextStatus === 'PAID'
            ? `Xác nhận đã thu đủ ${quote.finalPriceVnd.toLocaleString('vi-VN')} đ cho phiếu ${existing.invoiceNumber} qua ${method === 'CASH' ? 'tiền mặt' : 'chuyển khoản'}.`
            : `Xác nhận đã nhận ${amountVnd.toLocaleString('vi-VN')} đ qua ${method === 'CASH' ? 'tiền mặt' : 'chuyển khoản'} cho phiếu ${existing.invoiceNumber}; cần follow-up phần còn lại.`,
        metadata: JSON.stringify({
          assessmentId,
          invoiceNumber: existing.invoiceNumber,
          amountVnd,
          method,
          totalAfterVnd,
          remainingVnd: Math.max(0, quote.finalPriceVnd - totalAfterVnd),
          reference,
          note,
          receivedAt: receivedAt.toISOString(),
        }),
        actorStaffId: actor.id,
        occurredAt: new Date(),
      },
    });
    return updated;
  });
  await AcademyWorkshopBonusService.reconcileForAssessment(fastify, assessmentId);
  return {
    success: true,
    data: toAssessment(row, new Date(), tiers),
    message:
      nextStatus === 'PAID'
        ? 'Đã xác nhận thanh toán đủ; phiếu đã được khóa.'
        : 'Đã xác nhận tiền nhận được. Hãy tiếp tục follow-up phần còn lại.',
  };
}
