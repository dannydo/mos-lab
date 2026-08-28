import type { FastifyInstance } from 'fastify';
import type { AcademyInstructorBonus, AcademyTalentAssessmentQuote, SafeAny } from '@mos-lab/shared';
import { AcademySalesError, canManageAcademySales, type AcademyActor } from '../academy-sales/academy-sales.service.js';

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function instructor(row: SafeAny) {
  return {
    id: Number(row.id),
    code: String(row.code),
    staffId: row.staffId == null ? null : Number(row.staffId),
    displayName: String(row.displayName),
    description: row.description ?? null,
    avatarUrl: row.avatarUrl ?? row.staff?.avatarUrl ?? null,
    surchargePercent: Math.max(0, Math.round(Number(row.surchargePercent) || 0)),
    isActive: Boolean(row.isActive),
    sortOrder: Math.max(0, Math.round(Number(row.sortOrder) || 0)),
  };
}

export function toAcademyInstructorBonus(row: SafeAny): AcademyInstructorBonus {
  return {
    id: Number(row.id),
    workshopId: Number(row.workshopId),
    participantId: Number(row.participantId),
    assessmentId: Number(row.assessmentId),
    courseId: Number(row.courseId),
    courseName: String(row.courseName),
    instructor: instructor(row.instructor),
    amountVnd: Math.max(0, Math.round(Number(row.amountVnd) || 0)),
    status: row.status,
    earnedAt: new Date(row.earnedAt).toISOString(),
    paidAt: row.paidAt ? new Date(row.paidAt).toISOString() : null,
    paidBy: row.paidBy
      ? { id: Number(row.paidBy.id), displayName: String(row.paidBy.displayName), email: row.paidBy.email ?? null }
      : null,
    note: row.note ?? null,
  };
}

const BONUS_INCLUDE = {
  instructor: { include: { staff: { select: { avatarUrl: true } } } },
  paidBy: { select: { id: true, displayName: true, email: true } },
};

/**
 * Reconciles immutable per-course bonus rows after the tuition ledger changes.
 * The workshop's primary instructor owns attribution, regardless of the quote's
 * optional course instructor. The compound unique key makes retries idempotent.
 */
export class AcademyWorkshopBonusService {
  static async reconcileForAssessment(fastify: FastifyInstance, assessmentId: number) {
    const assessment = await fastify.prisma.crm.crmAcademyTalentAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        payments: { select: { amountVnd: true } },
        workshopParticipant: { include: { primaryInstructor: true } },
      },
    });
    const participant = assessment?.workshopParticipant;
    if (!assessment || !participant?.primaryInstructorId) return [];

    const quote = parseJson<AcademyTalentAssessmentQuote | null>(assessment.quoteSnapshotJson, null);
    if (!quote || quote.finalPriceVnd <= 0) return [];
    const paidVnd = assessment.payments.reduce(
      (sum, payment) => sum + Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
      0
    );
    if (paidVnd < quote.finalPriceVnd) return [];

    const courseIds = Array.from(
      new Set(quote.courses.map((course) => Number(course.courseId)).filter((id) => Number.isInteger(id) && id > 0))
    );
    const configured = await fastify.prisma.crm.crmAcademyCourse.findMany({
      where: { id: { in: courseIds } },
      select: { id: true, name: true, teacherBonusVnd: true },
    });
    const configuredById = new Map(configured.map((course) => [course.id, course]));

    await fastify.prisma.crm.$transaction(
      quote.courses.map((snapshot) => {
        const course = configuredById.get(Number(snapshot.courseId));
        const amountVnd = Math.max(0, Math.round(Number(course?.teacherBonusVnd) || 0));
        return fastify.prisma.crm.crmAcademyInstructorBonus.upsert({
          where: {
            participantId_assessmentId_courseId: {
              participantId: participant.id,
              assessmentId: assessment.id,
              courseId: Number(snapshot.courseId),
            },
          },
          create: {
            workshopId: participant.workshopId,
            participantId: participant.id,
            assessmentId: assessment.id,
            courseId: Number(snapshot.courseId),
            courseName: course?.name || snapshot.name,
            instructorId: participant.primaryInstructorId!,
            amountVnd,
            status: amountVnd > 0 ? 'EARNED' : 'MISSING_CONFIG',
          },
          update: {},
        });
      })
    );
    return fastify.prisma.crm.crmAcademyInstructorBonus.findMany({
      where: { assessmentId },
      include: BONUS_INCLUDE,
      orderBy: { id: 'asc' },
    });
  }

  static async list(fastify: FastifyInstance, workshopId: number) {
    return (
      await fastify.prisma.crm.crmAcademyInstructorBonus.findMany({
        where: { workshopId },
        include: BONUS_INCLUDE,
        orderBy: [{ status: 'asc' }, { earnedAt: 'desc' }],
      })
    ).map(toAcademyInstructorBonus);
  }

  static async update(
    fastify: FastifyInstance,
    actor: AcademyActor,
    bonusId: number,
    status: 'PAID' | 'VOID',
    note?: string | null
  ) {
    if (!canManageAcademySales(actor)) {
      throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được chốt thưởng giáo viên.', 403);
    }
    const existing = await fastify.prisma.crm.crmAcademyInstructorBonus.findUnique({ where: { id: bonusId } });
    if (!existing) throw new AcademySalesError('Không tìm thấy thưởng giáo viên.', 404);
    if (!['EARNED', 'MISSING_CONFIG'].includes(existing.status)) {
      throw new AcademySalesError('Khoản thưởng này đã được chốt.', 409);
    }
    if (existing.status === 'MISSING_CONFIG' && status === 'PAID') {
      throw new AcademySalesError('Cần cấu hình mức thưởng khóa học trước khi chi.', 409);
    }
    const row = await fastify.prisma.crm.crmAcademyInstructorBonus.update({
      where: { id: bonusId },
      data: {
        status,
        note: String(note || '').trim() || null,
        paidAt: status === 'PAID' ? new Date() : null,
        paidByStaffId: status === 'PAID' ? actor.id : null,
      },
      include: BONUS_INCLUDE,
    });
    return toAcademyInstructorBonus(row);
  }
}
