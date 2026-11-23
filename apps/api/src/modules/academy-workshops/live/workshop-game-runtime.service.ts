import type { FastifyInstance } from 'fastify';
import {
  calculateAcademyWorkshopQuestionScore,
  getAcademyWorkshopQuizProgress,
  selectAcademyWorkshopRewardParticipantIds,
  type AcademyWorkshopAnswerReceipt,
  type AcademyWorkshopGameCommandRequest,
  type SafeAny,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../../academy-sales/academy-sales.service.js';
import { AcademyWorkshopService, toAcademyWorkshopQuiz } from '../academy-workshop.service.js';
import {
  buildAcademyWorkshopQuestionWindow,
  manager,
  parseJson,
  positiveId,
  QUIZ_INCLUDE,
} from './workshop-live-helpers.js';
import { broadcastWorkshopLiveState, getWorkshopGameLeaderboard } from './workshop-live-state.service.js';

async function lockQuestionRewards(fastify: FastifyInstance, workshopId: number, quizId: number, questionId: number) {
  const question = await fastify.prisma.crm.crmAcademyWorkshopQuizQuestion.findUnique({
    where: { id: questionId },
    include: { answers: { select: { participantId: true, isCorrect: true, responseTimeMs: true } } },
  });
  if (!question || question.rewardRule === 'NONE' || !question.rewardLabel) return;
  const winnerIds = selectAcademyWorkshopRewardParticipantIds(
    question.rewardRule as 'NONE' | 'ALL_CORRECT' | 'FASTEST_N',
    question.answers,
    question.fastestCount,
    question.durationSeconds * 1000
  );
  for (const participantId of winnerIds) {
    await fastify.prisma.crm.crmAcademyWorkshopReward.upsert({
      where: {
        participantId_sourceType_sourceKey: {
          participantId,
          sourceType: 'QUESTION',
          sourceKey: `question:${question.id}`,
        },
      },
      create: {
        workshopId,
        participantId,
        quizId,
        questionId: question.id,
        sourceType: 'QUESTION',
        sourceKey: `question:${question.id}`,
        label: question.rewardLabel,
        quantity: question.rewardQuantity,
      },
      update: {},
    });
  }
}

async function lockPodiumRewards(fastify: FastifyInstance, workshopId: number, quiz: SafeAny) {
  const rewards = parseJson<Record<string, string>>(quiz.podiumRewardsJson, {});
  const leaderboard = await getWorkshopGameLeaderboard(fastify, workshopId);
  for (const [rankRaw, labelRaw] of Object.entries(rewards)) {
    const rank = Number(rankRaw);
    const winner = leaderboard.find((entry) => entry.rank === rank);
    const label = String(labelRaw || '').trim();
    if (!winner || !label) continue;
    await fastify.prisma.crm.crmAcademyWorkshopReward.upsert({
      where: {
        participantId_sourceType_sourceKey: {
          participantId: winner.participantId,
          sourceType: 'PODIUM',
          sourceKey: `quiz:${quiz.id}:rank:${rank}`,
        },
      },
      create: {
        workshopId,
        participantId: winner.participantId,
        quizId: quiz.id,
        sourceType: 'PODIUM',
        sourceKey: `quiz:${quiz.id}:rank:${rank}`,
        label,
        quantity: 1,
      },
      update: {},
    });
  }
}

export async function executeWorkshopGameCommand(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  quizId: number,
  action: AcademyWorkshopGameCommandRequest['action'],
  requestedQuestionId?: number
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const quiz = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
    where: { id: quizId, workshopId },
    include: QUIZ_INCLUDE,
  });
  if (!quiz) throw new AcademySalesError('Không tìm thấy game trong workshop.', 404);
  const quizProgress = getAcademyWorkshopQuizProgress(quiz.questions, quiz.activeQuestionId);
  if (action === 'NEXT_QUESTION' && quiz.status !== 'REVEALED') {
    throw new AcademySalesError('Chỉ có thể chuyển câu sau khi đã reveal câu hiện tại.', 409);
  }
  if (action === 'NEXT_QUESTION' && quizProgress.activeIndex < 0) {
    throw new AcademySalesError('Chưa có câu hỏi hiện tại để chuyển tiếp.', 409);
  }
  if (action === 'NEXT_QUESTION' && quizProgress.isLastQuestion) {
    throw new AcademySalesError('Đây là câu cuối. Hãy kết thúc game để mở podium.', 409);
  }
  const question =
    action === 'NEXT_QUESTION'
      ? quizProgress.nextQuestion
      : quiz.questions.find((item) => item.id === requestedQuestionId) ||
        quiz.questions.find((item) => item.id === quiz.activeQuestionId);
  const now = new Date();
  if (['OPEN_QUESTION', 'REOPEN_QUESTION', 'NEXT_QUESTION'].includes(action) && !question) {
    throw new AcademySalesError('Không tìm thấy câu hỏi để mở.', 404);
  }
  if (action === 'REOPEN_QUESTION' && !['QUESTION_OPEN', 'QUESTION_CLOSED'].includes(quiz.status)) {
    throw new AcademySalesError('Chỉ có thể mở lại câu hỏi đang mở hoặc vừa khóa.', 409);
  }
  if (['CLOSE_QUESTION', 'REVEAL_QUESTION'].includes(action) && !quiz.activeQuestionId) {
    throw new AcademySalesError('Chưa có câu hỏi đang hoạt động.', 409);
  }
  if (action === 'REVEAL_QUESTION' || action === 'END_GAME') {
    if (quiz.activeQuestionId) await lockQuestionRewards(fastify, workshopId, quiz.id, quiz.activeQuestionId);
  }
  if (action === 'END_GAME') await lockPodiumRewards(fastify, workshopId, quiz);
  const data: SafeAny = {};
  if (action === 'OPEN_LOBBY')
    Object.assign(data, { status: 'LOBBY', activeQuestionId: null, questionOpenedAt: null, questionClosesAt: null });
  if (action === 'OPEN_QUESTION' || action === 'REOPEN_QUESTION' || action === 'NEXT_QUESTION') {
    Object.assign(data, buildAcademyWorkshopQuestionWindow(question!, now));
  }
  if (action === 'CLOSE_QUESTION') Object.assign(data, { status: 'QUESTION_CLOSED', questionClosesAt: now });
  if (action === 'REVEAL_QUESTION') Object.assign(data, { status: 'REVEALED' });
  if (action === 'END_GAME') Object.assign(data, { status: 'COMPLETED', questionClosesAt: now });
  const updated = await fastify.prisma.crm.crmAcademyWorkshopQuiz.update({
    where: { id: quiz.id },
    data,
    include: QUIZ_INCLUDE,
  });
  await broadcastWorkshopLiveState(fastify, workshopId);
  return toAcademyWorkshopQuiz(updated, true)!;
}

export async function submitWorkshopAnswer(
  fastify: FastifyInstance,
  participantId: number,
  input: { questionId: number; optionId: number; idempotencyKey: string }
): Promise<AcademyWorkshopAnswerReceipt> {
  const idempotencyKey = `${participantId}:${String(input.idempotencyKey || '').trim()}`.slice(0, 80);
  if (idempotencyKey.length < 8) throw new AcademySalesError('Idempotency key không hợp lệ.');
  const existing = await fastify.prisma.crm.crmAcademyWorkshopAnswer.findUnique({
    where: { idempotencyKey },
    include: { question: { select: { durationSeconds: true } } },
  });
  if (existing) {
    if (existing.participantId !== participantId || existing.questionId !== input.questionId) {
      throw new AcademySalesError('Idempotency key đã được dùng cho câu trả lời khác.', 409);
    }
    const total = await fastify.prisma.crm.crmAcademyWorkshopAnswer.aggregate({
      where: { participantId },
      _sum: { score: true },
    });
    return {
      answerId: existing.id,
      questionId: existing.questionId,
      selectedOptionId: existing.optionId,
      acceptedAt: existing.submittedAt.toISOString(),
      isCorrect: existing.isCorrect,
      score: existing.score,
      totalScore: total._sum.score || 0,
      timedOut: existing.responseTimeMs > existing.question.durationSeconds * 1000,
    };
  }
  const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findUnique({
    where: { id: participantId },
  });
  if (!participant) throw new AcademySalesError('Participant session không còn hợp lệ.', 401);
  const question = await fastify.prisma.crm.crmAcademyWorkshopQuizQuestion.findUnique({
    where: { id: positiveId(input.questionId, 'Question ID') },
    include: { quiz: true, options: true },
  });
  if (!question || question.quiz.workshopId !== participant.workshopId)
    throw new AcademySalesError('Câu hỏi không thuộc workshop này.', 404);
  const option = question.options.find((item) => item.id === Number(input.optionId));
  if (!option) throw new AcademySalesError('Lựa chọn không thuộc câu hỏi.', 409);
  const now = new Date();
  if (question.quiz.status !== 'QUESTION_OPEN' || question.quiz.activeQuestionId !== question.id) {
    throw new AcademySalesError('Câu hỏi chưa mở hoặc đã đóng.', 409);
  }
  if (!question.quiz.questionOpenedAt || !question.quiz.questionClosesAt)
    throw new AcademySalesError('Cửa sổ trả lời chưa hợp lệ.', 409);
  const responseTimeMs = Math.max(0, now.getTime() - question.quiz.questionOpenedAt.getTime());
  const timedOut = now > question.quiz.questionClosesAt || responseTimeMs > question.durationSeconds * 1000;
  const score = timedOut
    ? 0
    : calculateAcademyWorkshopQuestionScore(question.durationSeconds * 1000, responseTimeMs, option.isCorrect);
  let created: SafeAny;
  try {
    created = await fastify.prisma.crm.crmAcademyWorkshopAnswer.create({
      data: {
        workshopId: participant.workshopId,
        participantId,
        quizId: question.quizId,
        questionId: question.id,
        optionId: option.id,
        idempotencyKey,
        isCorrect: option.isCorrect,
        responseTimeMs,
        score,
        submittedAt: now,
      },
    });
  } catch (error: SafeAny) {
    if (String(error?.code) === 'P2002') throw new AcademySalesError('Câu hỏi này đã được trả lời.', 409);
    throw error;
  }
  const total = await fastify.prisma.crm.crmAcademyWorkshopAnswer.aggregate({
    where: { participantId },
    _sum: { score: true },
  });
  await broadcastWorkshopLiveState(fastify, participant.workshopId);
  return {
    answerId: created.id,
    questionId: created.questionId,
    selectedOptionId: created.optionId,
    acceptedAt: created.submittedAt.toISOString(),
    isCorrect: created.isCorrect,
    score: created.score,
    totalScore: total._sum.score || 0,
    timedOut,
  };
}

export async function listWorkshopRewards(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const rows = await fastify.prisma.crm.crmAcademyWorkshopReward.findMany({
    where: { workshopId },
    include: { fulfilledBy: { select: { id: true, displayName: true, email: true } } },
    orderBy: [{ status: 'asc' }, { promisedAt: 'desc' }],
  });
  return rows.map((row) => ({
    id: row.id,
    workshopId: row.workshopId,
    participantId: row.participantId,
    quizId: row.quizId,
    questionId: row.questionId,
    sourceType: row.sourceType as 'QUESTION' | 'PODIUM' | 'MANUAL',
    sourceKey: row.sourceKey,
    label: row.label,
    quantity: row.quantity,
    status: row.status as 'PROMISED' | 'FULFILLED' | 'VOID',
    promisedAt: row.promisedAt.toISOString(),
    fulfilledAt: row.fulfilledAt?.toISOString() || null,
    fulfilledBy: row.fulfilledBy
      ? { id: row.fulfilledBy.id, displayName: row.fulfilledBy.displayName, email: row.fulfilledBy.email }
      : null,
    note: row.note,
  }));
}

export async function updateWorkshopReward(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  rewardId: number,
  status: 'FULFILLED' | 'VOID',
  note?: string | null
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  if (!manager(actor))
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được chốt trao thưởng.', 403);
  const existing = await fastify.prisma.crm.crmAcademyWorkshopReward.findFirst({
    where: { id: rewardId, workshopId },
  });
  if (!existing) throw new AcademySalesError('Không tìm thấy phần thưởng.', 404);
  if (existing.status !== 'PROMISED') throw new AcademySalesError('Phần thưởng này đã được chốt.', 409);
  await fastify.prisma.crm.crmAcademyWorkshopReward.update({
    where: { id: existing.id },
    data: {
      status,
      note: String(note || '').trim() || null,
      fulfilledAt: status === 'FULFILLED' ? new Date() : null,
      fulfilledByStaffId: status === 'FULFILLED' ? actor.id : null,
    },
  });
  return (await listWorkshopRewards(fastify, actor, workshopId)).find((reward) => reward.id === rewardId)!;
}
