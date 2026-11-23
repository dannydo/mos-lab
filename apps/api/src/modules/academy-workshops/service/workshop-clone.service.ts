import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopClonePreview,
  AcademyWorkshopDetail,
  CloneAcademyWorkshopRequest,
  SafeAny,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  canManageAcademySales,
  type AcademyActor,
} from '../../academy-sales/academy-sales.service.js';
import { displayCode, registrationCode } from './workshop-helpers.js';
import { getWorkshopById, getWorkshopRowById, uniqueSlug } from './workshop-core.service.js';

export function suggestNextWorkshopSeriesNameAndSlug(
  sourceName: string,
  sourceSlug: string
): { baseName: string; nextNumber: number; suggestedName: string; suggestedSlug: string; seriesKey: string } {
  const seriesKey = sourceSlug.replace(/(?:-k\d+|-dot-\d+)$/i, '');

  const nameMatch = sourceName.match(/(?:\s*[([ -]\s*(?:K|Khóa\s*|Đợt\s*)(\d+)[)\]]?)$/i);
  let baseName = sourceName;
  let nextNum = 2;
  if (nameMatch && nameMatch[1]) {
    const currentNum = parseInt(nameMatch[1], 10);
    nextNum = currentNum + 1;
    baseName = sourceName.slice(0, nameMatch.index).trim();
  }
  const kLabel = nextNum < 10 ? `K0${nextNum}` : `K${nextNum}`;
  const suggestedName = `${baseName} (${kLabel})`;
  const suggestedSlug = `${seriesKey}-k${nextNum < 10 ? `0${nextNum}` : nextNum}`;

  return { baseName, nextNumber: nextNum, suggestedName, suggestedSlug, seriesKey };
}

export async function resolveUniqueWorkshopSeriesSlug(
  fastify: FastifyInstance,
  seriesKey: string,
  startNum: number
): Promise<{ slug: string; number: number }> {
  let num = startNum;
  while (true) {
    const candidate = `${seriesKey}-k${num < 10 ? `0${num}` : num}`;
    const existing = await fastify.prisma.crm.crmAcademyCampaign.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return { slug: candidate, number: num };
    }
    num++;
  }
}

export async function getWorkshopClonePreview(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number
): Promise<AcademyWorkshopClonePreview> {
  const row = await getWorkshopRowById(fastify, actor, workshopId);
  const { baseName, nextNumber, seriesKey } = suggestNextWorkshopSeriesNameAndSlug(
    row.campaign.name,
    row.seriesKey || row.campaign.slug
  );
  const { slug: suggestedSlug, number: finalNum } = await resolveUniqueWorkshopSeriesSlug(
    fastify,
    seriesKey,
    nextNumber
  );
  const kLabel = finalNum < 10 ? `K0${finalNum}` : `K${finalNum}`;
  const suggestedName = `${baseName} (${kLabel})`;

  const sourceStart = new Date(row.startsAt);
  const sourceEnd = new Date(row.endsAt);
  const durationMs = Math.max(3600000, sourceEnd.getTime() - sourceStart.getTime());
  const nextStart = new Date(sourceStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nextEnd = new Date(nextStart.getTime() + durationMs);

  const quizQuestionsCount = (row.quizzes || []).reduce(
    (sum: number, q: SafeAny) => sum + (q.questions ? q.questions.length : 0),
    0
  );

  return {
    sourceId: Number(row.id),
    sourceName: String(row.campaign.name),
    sourceSlug: String(row.campaign.slug),
    seriesKey,
    suggestedName,
    suggestedSlug,
    suggestedStartsAt: nextStart.toISOString(),
    suggestedEndsAt: nextEnd.toISOString(),
    location: String(row.location),
    capacity: Number(row.capacity),
    feeVnd: Number(row.feeVnd),
    counts: {
      agendaItems: row.agendaItems?.length || 0,
      menuItems: row.menuItems?.length || 0,
      equipmentPackages: row.equipmentPackages?.length || 0,
      designs: row.designs?.length || 0,
      quizzes: row.quizzes?.length || 0,
      quizQuestions: quizQuestionsCount,
    },
  };
}

export async function cloneWorkshop(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: CloneAcademyWorkshopRequest
): Promise<AcademyWorkshopDetail> {
  if (!canManageAcademySales(actor)) {
    throw new AcademySalesError('Bạn không có quyền nhân bản workshop.', 403);
  }
  const sourceRow = await getWorkshopRowById(fastify, actor, workshopId);

  const name = String(input.name || '').trim();
  if (!name) throw new AcademySalesError('Tên workshop không được để trống.', 400);

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw new AcademySalesError('Khung giờ workshop không hợp lệ.', 400);
  }

  const seriesKey =
    sourceRow.seriesKey ||
    suggestNextWorkshopSeriesNameAndSlug(sourceRow.campaign.name, sourceRow.campaign.slug).seriesKey;
  const desiredSlug = input.slug?.trim() || `${seriesKey}-k02`;
  const finalSlug = await uniqueSlug(fastify, desiredSlug);

  const location = (input.location ?? sourceRow.location).trim();
  const capacity = Math.max(1, Math.round(Number(input.capacity ?? sourceRow.capacity) || 10));
  const feeVnd = Math.max(0, Math.round(Number(input.feeVnd ?? sourceRow.feeVnd) || 0));
  const feeDueAt = input.feeDueAt ? new Date(input.feeDueAt) : null;
  const showInSidebar = input.showInSidebar ?? false;

  const created = await fastify.prisma.crm.$transaction(async (tx: SafeAny) => {
    const campaign = await tx.crmAcademyCampaign.create({
      data: {
        kind: 'WORKSHOP',
        name,
        slug: finalSlug,
        description: sourceRow.campaign.description,
        startDate: startsAt,
        endDate: endsAt,
        status: 'SCHEDULED',
        showInSidebar,
        assignedStaffIds: sourceRow.campaign.assignedStaffIds ?? '[]',
        createdByStaffId: actor.id,
      },
    });

    const workshop = await tx.crmAcademyWorkshop.create({
      data: {
        campaignId: campaign.id,
        startsAt,
        endsAt,
        location,
        capacity,
        feeVnd,
        feeDueAt,
        heroImageUrl: sourceRow.heroImageUrl,
        status: 'DRAFT',
        agendaPresetKey: sourceRow.agendaPresetKey || 'HAPPY_FRIDAY',
        agendaTemplateId: sourceRow.agendaTemplateId,
        menuTemplateId: sourceRow.menuTemplateId,
        equipmentTemplateId: sourceRow.equipmentTemplateId,
        designTemplateId: sourceRow.designTemplateId,
        displayCode: displayCode(),
        registrationCode: registrationCode(),
        registrationOpen: true,
        parentWorkshopId: sourceRow.id,
        seriesKey,
      },
    });

    if (input.includeAgenda !== false && sourceRow.agendaItems?.length) {
      for (const item of sourceRow.agendaItems) {
        await tx.crmAcademyWorkshopAgendaItem.create({
          data: {
            workshopId: workshop.id,
            kind: item.kind,
            title: item.title,
            description: item.description,
            plannedDurationSeconds: item.plannedDurationSeconds,
            sortOrder: item.sortOrder,
            status: 'PENDING',
          },
        });
      }
    }

    if (input.includeMenu !== false && sourceRow.menuItems?.length) {
      for (const item of sourceRow.menuItems) {
        await tx.crmAcademyWorkshopMenuItem.create({
          data: {
            workshopId: workshop.id,
            name: item.name,
            category: item.category,
            description: item.description,
            imageUrl: item.imageUrl,
            sortOrder: item.sortOrder,
            isAvailable: item.isAvailable ?? true,
          },
        });
      }
    }

    if (input.includeEquipment !== false && sourceRow.equipmentPackages?.length) {
      for (const pkg of sourceRow.equipmentPackages) {
        const createdPkg = await tx.crmAcademyWorkshopEquipmentPackage.create({
          data: {
            workshopId: workshop.id,
            name: pkg.name,
            description: pkg.description,
            includedItemsJson: pkg.includedItemsJson,
            priceVnd: pkg.priceVnd,
            sortOrder: pkg.sortOrder,
            isAvailable: pkg.isAvailable ?? true,
            isIncludedInFee: pkg.isIncludedInFee ?? false,
          },
        });
        if (pkg.images?.length) {
          for (const img of pkg.images) {
            await tx.crmAcademyWorkshopEquipmentPackageImage.create({
              data: {
                equipmentPackageId: createdPkg.id,
                imageUrl: img.imageUrl,
                altText: img.altText,
              },
            });
          }
        }
      }
    }

    if (input.includeDesigns !== false && sourceRow.designs?.length) {
      for (const design of sourceRow.designs) {
        const createdDesign = await tx.crmAcademyWorkshopDesignItem.create({
          data: {
            workshopId: workshop.id,
            name: design.name,
            description: design.description,
            difficultyLevel: design.difficultyLevel,
            priceVnd: design.priceVnd,
            sortOrder: design.sortOrder,
            isAvailable: design.isAvailable ?? true,
          },
        });
        if (design.images?.length) {
          for (const img of design.images) {
            await tx.crmAcademyWorkshopDesignItemImage.create({
              data: {
                designItemId: createdDesign.id,
                imageUrl: img.imageUrl,
                altText: img.altText,
              },
            });
          }
        }
      }
    }

    if (input.includeQuizzes !== false && sourceRow.quizzes?.length) {
      for (const quiz of sourceRow.quizzes) {
        const createdQuiz = await tx.crmAcademyWorkshopQuiz.create({
          data: {
            workshopId: workshop.id,
            sourceTemplateId: quiz.sourceTemplateId ?? null,
            title: quiz.title,
            description: quiz.description,
            isTemplate: false,
            status: 'DRAFT',
            podiumRewardsJson: quiz.podiumRewardsJson ?? '{}',
            createdByStaffId: actor.id,
          },
        });
        if (quiz.questions?.length) {
          for (const q of quiz.questions) {
            const createdQ = await tx.crmAcademyWorkshopQuizQuestion.create({
              data: {
                quizId: createdQuiz.id,
                prompt: q.prompt,
                type: q.type,
                imageUrl: q.imageUrl,
                durationSeconds: q.durationSeconds ?? 20,
                sortOrder: q.sortOrder,
                rewardRule: q.rewardRule ?? 'NONE',
                fastestCount: q.fastestCount ?? 1,
                rewardLabel: q.rewardLabel ?? null,
                rewardQuantity: q.rewardQuantity ?? 1,
              },
            });
            if (q.options?.length) {
              for (const opt of q.options) {
                await tx.crmAcademyWorkshopQuizOption.create({
                  data: {
                    questionId: createdQ.id,
                    label: opt.label,
                    color: opt.color ?? null,
                    isCorrect: opt.isCorrect ?? false,
                    sortOrder: opt.sortOrder,
                  },
                });
              }
            }
          }
        }
      }
    }

    return workshop;
  });

  return getWorkshopById(fastify, actor, created.id);
}
