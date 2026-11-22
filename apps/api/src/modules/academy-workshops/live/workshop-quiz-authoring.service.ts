import type { FastifyInstance } from 'fastify';
import {
  removeVietnameseTones,
  type CloneAcademyWorkshopQuizRequest,
  type ListAcademyWorkshopQuizTemplatesParams,
  type SafeAny,
  type SetAcademyWorkshopAgendaResourceRequest,
  type UpsertAcademyWorkshopQuestionRequest,
  type UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../../academy-sales/academy-sales.service.js';
import { AcademyWorkshopService, toAcademyWorkshopQuiz } from '../academy-workshop.service.js';
import {
  buildAcademyWorkshopQuizCloneData,
  buildAcademyWorkshopQuizDraftReplacementData,
  normalizeAcademyWorkshopQuestionInput,
  positiveId,
  QUIZ_INCLUDE,
} from './workshop-live-helpers.js';

async function persistQuestion(
  fastify: FastifyInstance,
  quiz: SafeAny,
  questionId: number | null,
  input: UpsertAcademyWorkshopQuestionRequest
) {
  const quizId = Number(quiz.id);
  const { questionData, options } = normalizeAcademyWorkshopQuestionInput(input);
  if (questionId) {
    const existingQuestion = await fastify.prisma.crm.crmAcademyWorkshopQuizQuestion.findFirst({
      where: { id: positiveId(questionId, 'Question ID'), quizId },
    });
    if (!existingQuestion) throw new AcademySalesError('Không tìm thấy câu hỏi trong game.', 404);
  }
  const row = await fastify.prisma.crm.$transaction(async (tx) => {
    const question = questionId
      ? await tx.crmAcademyWorkshopQuizQuestion.update({
          where: { id: positiveId(questionId, 'Question ID') },
          data: questionData,
        })
      : await tx.crmAcademyWorkshopQuizQuestion.create({ data: { quizId, ...questionData } });
    await tx.crmAcademyWorkshopQuizOption.deleteMany({ where: { questionId: question.id } });
    await tx.crmAcademyWorkshopQuizOption.createMany({
      data: options.map((option) => ({
        questionId: question.id,
        ...option,
      })),
    });
    return tx.crmAcademyWorkshopQuizQuestion.findUnique({
      where: { id: question.id },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  });
  if (!row) throw new AcademySalesError('Không thể lưu câu hỏi.', 500);
  return toAcademyWorkshopQuiz({ ...quiz, questions: [row] }, true)!.questions[0];
}

async function deleteQuestionForQuiz(fastify: FastifyInstance, quiz: SafeAny, questionId: number) {
  const question = await fastify.prisma.crm.crmAcademyWorkshopQuizQuestion.findFirst({
    where: { id: positiveId(questionId, 'Question ID'), quizId: quiz.id },
  });
  if (!question) throw new AcademySalesError('Không tìm thấy câu hỏi trong game.', 404);
  await fastify.prisma.crm.crmAcademyWorkshopQuizQuestion.delete({ where: { id: question.id } });
  const updated = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findUnique({
    where: { id: quiz.id },
    include: QUIZ_INCLUDE,
  });
  if (!updated) throw new AcademySalesError('Không thể tải lại game sau khi xóa câu hỏi.', 500);
  return toAcademyWorkshopQuiz(updated, true)!;
}

export async function listWorkshopQuizTemplates(
  fastify: FastifyInstance,
  _actor: AcademyActor,
  params: ListAcademyWorkshopQuizTemplatesParams = {}
) {
  const page = Math.max(1, Math.round(Number(params.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.round(Number(params.limit) || 20)));
  const search = removeVietnameseTones(String(params.search || ''));
  const rows = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findMany({
    where: { isTemplate: true, workshopId: null },
    include: QUIZ_INCLUDE,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
  const filtered = search
    ? rows.filter((row) => removeVietnameseTones(`${row.title} ${row.description || ''}`).includes(search))
    : rows;
  const start = (page - 1) * limit;
  return {
    data: filtered.slice(start, start + limit).map((row) => toAcademyWorkshopQuiz(row, true)!),
    total: filtered.length,
    page,
    limit,
  };
}

export async function upsertWorkshopQuiz(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  quizId: number | null,
  input: UpsertAcademyWorkshopQuizRequest
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const title = String(input.title || '').trim();
  if (!title || title.length > 180) throw new AcademySalesError('Tên game là bắt buộc và tối đa 180 ký tự.');
  const data = {
    workshopId: input.isTemplate ? null : workshopId,
    title,
    description: String(input.description || '').trim() || null,
    isTemplate: Boolean(input.isTemplate),
    podiumRewardsJson: JSON.stringify(input.podiumRewards || {}),
    createdByStaffId: actor.id,
  };
  let row;
  if (quizId) {
    const existing = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
      where: { id: positiveId(quizId, 'Quiz ID'), workshopId },
    });
    if (!existing) throw new AcademySalesError('Không tìm thấy game trong workshop.', 404);
    if (existing.status !== 'DRAFT') throw new AcademySalesError('Chỉ sửa được game khi còn ở bản nháp.', 409);
    row = await fastify.prisma.crm.crmAcademyWorkshopQuiz.update({
      where: { id: existing.id },
      data,
      include: QUIZ_INCLUDE,
    });
  } else {
    const unfinishedQuiz = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
      where: { workshopId, status: { not: 'COMPLETED' } },
      select: { id: true, status: true },
    });
    if (unfinishedQuiz) {
      throw new AcademySalesError(
        unfinishedQuiz.status === 'DRAFT'
          ? 'Workshop đã có một game bản nháp. Hãy tiếp tục chỉnh sửa game đó.'
          : 'Hãy kết thúc game đang chạy trước khi tạo bộ câu hỏi mới.',
        409
      );
    }
    row = await fastify.prisma.crm.crmAcademyWorkshopQuiz.create({ data, include: QUIZ_INCLUDE });
  }
  return toAcademyWorkshopQuiz(row, true)!;
}

export async function setWorkshopQuizAgendaItem(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  quizId: number,
  input: SetAcademyWorkshopAgendaResourceRequest
) {
  const workshop = await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const agendaItemId = input.agendaItemId == null ? null : positiveId(Number(input.agendaItemId), 'Mục agenda');
  if (agendaItemId && !workshop.agendaItems.some((item: SafeAny) => Number(item.id) === agendaItemId)) {
    throw new AcademySalesError('Mục agenda không thuộc workshop này.', 404);
  }
  const quiz = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(quizId, 'Game ID'), workshopId, isTemplate: false },
  });
  if (!quiz) throw new AcademySalesError('Không tìm thấy game trong workshop.', 404);
  const updated = await fastify.prisma.crm.crmAcademyWorkshopQuiz.update({
    where: { id: quiz.id },
    data: { agendaItemId },
    include: QUIZ_INCLUDE,
  });
  return toAcademyWorkshopQuiz(updated, true)!;
}

export async function cloneWorkshopQuizToDraft(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  quizId: number,
  input: CloneAcademyWorkshopQuizRequest = {}
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const source = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(quizId, 'Quiz ID'), workshopId },
    include: QUIZ_INCLUDE,
  });
  if (!source) throw new AcademySalesError('Không tìm thấy game trong workshop.', 404);
  if (source.status !== 'COMPLETED') {
    throw new AcademySalesError('Cần chốt game trước khi tạo bản chỉnh sửa.', 409);
  }
  const unfinishedQuiz = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { workshopId, status: { not: 'COMPLETED' } },
    select: { id: true },
  });
  if (unfinishedQuiz) {
    throw new AcademySalesError('Workshop đã có một game bản nháp hoặc đang chạy.', 409);
  }
  const cloned = await fastify.prisma.crm.crmAcademyWorkshopQuiz.create({
    data: buildAcademyWorkshopQuizCloneData(source, workshopId, actor.id, input),
    include: QUIZ_INCLUDE,
  });
  return toAcademyWorkshopQuiz(cloned, true)!;
}

export async function upsertWorkshopQuizTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  templateId: number | null,
  input: UpsertAcademyWorkshopQuizRequest
) {
  const title = String(input.title || '').trim();
  if (!title || title.length > 180) throw new AcademySalesError('Tên mẫu là bắt buộc và tối đa 180 ký tự.');
  const data = {
    workshopId: null,
    title,
    description: String(input.description || '').trim() || null,
    isTemplate: true,
    status: 'DRAFT',
    podiumRewardsJson: JSON.stringify(input.podiumRewards || {}),
    createdByStaffId: actor.id,
  };
  const row = templateId
    ? await (async () => {
        const existing = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
          where: { id: positiveId(templateId, 'Template ID'), isTemplate: true, workshopId: null },
        });
        if (!existing) throw new AcademySalesError('Không tìm thấy mẫu câu hỏi.', 404);
        return fastify.prisma.crm.crmAcademyWorkshopQuiz.update({
          where: { id: existing.id },
          data,
          include: QUIZ_INCLUDE,
        });
      })()
    : await fastify.prisma.crm.crmAcademyWorkshopQuiz.create({ data, include: QUIZ_INCLUDE });
  return toAcademyWorkshopQuiz(row, true)!;
}

export async function deleteWorkshopQuizTemplate(fastify: FastifyInstance, _actor: AcademyActor, templateId: number) {
  const template = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(templateId, 'Template ID'), isTemplate: true, workshopId: null },
  });
  if (!template) throw new AcademySalesError('Không tìm thấy mẫu câu hỏi.', 404);
  await fastify.prisma.crm.crmAcademyWorkshopQuiz.delete({ where: { id: template.id } });
}

export async function saveWorkshopQuizAsTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  quizId: number,
  input: CloneAcademyWorkshopQuizRequest = {}
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const source = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(quizId, 'Quiz ID'), workshopId, isTemplate: false },
    include: QUIZ_INCLUDE,
  });
  if (!source) throw new AcademySalesError('Không tìm thấy game trong workshop.', 404);
  const copyData = buildAcademyWorkshopQuizCloneData(source, workshopId, actor.id, {
    title: String(input.title || '').trim() || source.title,
  });
  const template = await fastify.prisma.crm.crmAcademyWorkshopQuiz.create({
    data: { ...copyData, workshopId: null, sourceTemplateId: null, isTemplate: true },
    include: QUIZ_INCLUDE,
  });
  return toAcademyWorkshopQuiz(template, true)!;
}

export async function refreshWorkshopQuizTemplateFromWorkshop(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  quizId: number
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const source = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(quizId, 'Quiz ID'), workshopId, isTemplate: false },
    include: QUIZ_INCLUDE,
  });
  if (!source) throw new AcademySalesError('Không tìm thấy game trong workshop.', 404);
  if (source.status !== 'DRAFT') {
    throw new AcademySalesError('Chỉ cập nhật mẫu khi game còn ở bản nháp.', 409);
  }
  if (!source.sourceTemplateId) {
    throw new AcademySalesError('Game này chưa được tạo từ một mẫu để cập nhật.', 409);
  }
  const template = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: source.sourceTemplateId, isTemplate: true, workshopId: null },
  });
  if (!template) throw new AcademySalesError('Không tìm thấy mẫu game nguồn.', 404);

  const updated = await fastify.prisma.crm.$transaction(async (tx) => {
    await tx.crmAcademyWorkshopQuizQuestion.deleteMany({ where: { quizId: template.id } });
    return tx.crmAcademyWorkshopQuiz.update({
      where: { id: template.id },
      data: {
        status: 'DRAFT',
        activeQuestionId: null,
        questionOpenedAt: null,
        questionClosesAt: null,
        podiumRewardsJson: source.podiumRewardsJson ?? null,
        questions: {
          create: source.questions.map((question) => ({
            type: question.type,
            prompt: question.prompt,
            imageUrl: question.imageUrl ?? null,
            durationSeconds: question.durationSeconds,
            sortOrder: question.sortOrder,
            rewardRule: question.rewardRule,
            fastestCount: question.fastestCount,
            rewardLabel: question.rewardLabel ?? null,
            rewardQuantity: question.rewardQuantity,
            options: {
              create: question.options.map((option) => ({
                label: option.label,
                color: option.color ?? null,
                isCorrect: option.isCorrect,
                sortOrder: option.sortOrder,
              })),
            },
          })),
        },
      },
      include: QUIZ_INCLUDE,
    });
  });
  return toAcademyWorkshopQuiz(updated, true)!;
}

export async function applyWorkshopQuizTemplate(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  templateId: number,
  input: CloneAcademyWorkshopQuizRequest = {}
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const template = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(templateId, 'Template ID'), isTemplate: true, workshopId: null },
    include: QUIZ_INCLUDE,
  });
  if (!template) throw new AcademySalesError('Không tìm thấy mẫu câu hỏi.', 404);
  const unfinishedQuizzes = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findMany({
    where: { workshopId, isTemplate: false, status: { not: 'COMPLETED' } },
    select: { id: true, status: true },
  });
  const runningQuiz = unfinishedQuizzes.find((quiz) => quiz.status !== 'DRAFT');
  if (runningQuiz) throw new AcademySalesError('Hãy kết thúc game đang chạy trước khi thay bằng mẫu khác.', 409);

  const copyData = buildAcademyWorkshopQuizDraftReplacementData(template, workshopId, actor.id, {
    title: String(input.title || '').trim() || template.title,
  });
  const draftQuiz = unfinishedQuizzes.find((quiz) => quiz.status === 'DRAFT');
  const game = draftQuiz
    ? await fastify.prisma.crm.$transaction(async (tx) => {
        await tx.crmAcademyWorkshopQuizQuestion.deleteMany({ where: { quizId: draftQuiz.id } });
        return tx.crmAcademyWorkshopQuiz.update({
          where: { id: draftQuiz.id },
          data: copyData,
          include: QUIZ_INCLUDE,
        });
      })
    : await fastify.prisma.crm.crmAcademyWorkshopQuiz.create({
        data: copyData,
        include: QUIZ_INCLUDE,
      });
  return toAcademyWorkshopQuiz(game, true)!;
}

export async function upsertWorkshopQuestion(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  quizId: number,
  questionId: number | null,
  input: UpsertAcademyWorkshopQuestionRequest
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const quiz = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({ where: { id: quizId, workshopId } });
  if (!quiz) throw new AcademySalesError('Không tìm thấy game trong workshop.', 404);
  if (quiz.status !== 'DRAFT') throw new AcademySalesError('Chỉ sửa được câu hỏi khi game còn ở bản nháp.', 409);
  return persistQuestion(fastify, quiz, questionId, input);
}

export async function upsertWorkshopTemplateQuestion(
  fastify: FastifyInstance,
  _actor: AcademyActor,
  templateId: number,
  questionId: number | null,
  input: UpsertAcademyWorkshopQuestionRequest
) {
  const template = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(templateId, 'Template ID'), isTemplate: true, workshopId: null },
  });
  if (!template) throw new AcademySalesError('Không tìm thấy mẫu câu hỏi.', 404);
  return persistQuestion(fastify, template, questionId, input);
}

export async function deleteWorkshopQuestion(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  quizId: number,
  questionId: number
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const quiz = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(quizId, 'Quiz ID'), workshopId },
    include: QUIZ_INCLUDE,
  });
  if (!quiz) throw new AcademySalesError('Không tìm thấy game trong workshop.', 404);
  if (quiz.status !== 'DRAFT') throw new AcademySalesError('Chỉ xóa được câu hỏi khi game còn ở bản nháp.', 409);
  return deleteQuestionForQuiz(fastify, quiz, questionId);
}

export async function deleteWorkshopTemplateQuestion(
  fastify: FastifyInstance,
  _actor: AcademyActor,
  templateId: number,
  questionId: number
) {
  const template = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: positiveId(templateId, 'Template ID'), isTemplate: true, workshopId: null },
    include: QUIZ_INCLUDE,
  });
  if (!template) throw new AcademySalesError('Không tìm thấy mẫu câu hỏi.', 404);
  return deleteQuestionForQuiz(fastify, template, questionId);
}
