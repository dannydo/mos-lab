import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopGameLeaderboardEntry,
  AcademyWorkshopLiveState,
  SafeAny,
  UpdateAcademyWorkshopDisplaySettingsRequest,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../../academy-sales/academy-sales.service.js';
import {
  AcademyWorkshopService,
  toAcademyWorkshopAgendaItem,
  toAcademyWorkshopQuiz,
} from '../academy-workshop.service.js';
import { academyWorkshopRealtimeHub, type RealtimeAudience } from './workshop-realtime-hub.js';
import { INTERNAL_ACTOR, positiveId, QUIZ_INCLUDE } from './workshop-live-helpers.js';

export async function getWorkshopGameLeaderboard(
  fastify: FastifyInstance,
  workshopId: number
): Promise<AcademyWorkshopGameLeaderboardEntry[]> {
  const participants = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findMany({
    where: { workshopId },
    include: {
      campaignLead: { include: { lead: { select: { name: true, avatarUrl: true } } } },
      answers: { select: { score: true, responseTimeMs: true, isCorrect: true } },
      rewards: { where: { status: { not: 'VOID' } }, select: { label: true } },
    },
  });
  const rows = participants
    .map((participant) => ({
      participantId: participant.id,
      name: participant.campaignLead.lead.name,
      avatarUrl: participant.campaignLead.lead.avatarUrl,
      score: participant.answers.reduce((sum, answer) => sum + answer.score, 0),
      responseTimeMs: participant.answers.reduce((sum, answer) => sum + answer.responseTimeMs, 0),
      correctAnswers: participant.answers.filter((answer) => answer.isCorrect).length,
      rewardLabels: Array.from(new Set(participant.rewards.map((reward) => reward.label))),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.responseTimeMs - right.responseTimeMs ||
        left.name.localeCompare(right.name, 'vi')
    );
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getWorkshopLiveState(
  fastify: FastifyInstance,
  workshopId: number,
  audience: RealtimeAudience = 'DISPLAY'
): Promise<AcademyWorkshopLiveState> {
  const detail = await AcademyWorkshopService.getById(fastify, INTERNAL_ACTOR, workshopId);
  const row = await fastify.prisma.crm.crmAcademyWorkshop.findUnique({
    where: { id: workshopId },
    include: {
      agendaItems: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      quizzes: {
        where: { isTemplate: false },
        include: QUIZ_INCLUDE,
        orderBy: { updatedAt: 'desc' },
      },
    },
  });
  if (!row) throw new AcademySalesError('Không tìm thấy workshop.', 404);
  const quizRow = row.quizzes[0] || null;
  const revealAnswers = audience === 'STAFF' || ['REVEALED', 'COMPLETED'].includes(quizRow?.status || '');
  const activeQuiz = toAcademyWorkshopQuiz(quizRow, revealAnswers);
  const activeQuestion = activeQuiz?.questions.find((question) => question.id === activeQuiz.activeQuestionId) || null;
  return {
    serverNow: new Date().toISOString(),
    workshop: {
      id: detail.id,
      name: detail.name,
      slug: detail.slug,
      startsAt: detail.startsAt,
      endsAt: detail.endsAt,
      location: detail.location,
      status: detail.status,
      sharedJoinUrl: detail.sharedJoinUrl,
    },
    participantCount: detail.participantCount,
    connectedParticipantCount: academyWorkshopRealtimeHub.connectedParticipants(workshopId),
    showJoinQrOnDisplay: Boolean(row.showJoinQrOnDisplay),
    activeAgendaItem:
      row.agendaItems.find((item) => item.id === row.liveAgendaItemId) ||
      row.agendaItems.find((item) => ['RUNNING', 'PAUSED'].includes(item.status))
        ? toAcademyWorkshopAgendaItem(
            row.agendaItems.find((item) => item.id === row.liveAgendaItemId) ||
              row.agendaItems.find((item) => ['RUNNING', 'PAUSED'].includes(item.status))!
          )
        : null,
    agenda: row.agendaItems.map((item: SafeAny) => toAcademyWorkshopAgendaItem(item)),
    activeQuiz,
    activeQuestion,
    gameLeaderboard: await getWorkshopGameLeaderboard(fastify, workshopId),
    talentLeaderboard: await AcademyWorkshopService.talentLeaderboard(fastify, INTERNAL_ACTOR, workshopId),
  };
}

export async function broadcastWorkshopLiveState(fastify: FastifyInstance, workshopId: number) {
  const [displayState, staffState] = await Promise.all([
    getWorkshopLiveState(fastify, workshopId, 'DISPLAY'),
    getWorkshopLiveState(fastify, workshopId, 'STAFF'),
  ]);
  academyWorkshopRealtimeHub.broadcastAudience(workshopId, (audience) => ({
    type: 'STATE_SNAPSHOT',
    data: audience === 'STAFF' ? staffState : displayState,
  }));
}

export async function updateWorkshopDisplaySettings(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  input: UpdateAcademyWorkshopDisplaySettingsRequest
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  await fastify.prisma.crm.crmAcademyWorkshop.update({
    where: { id: workshopId },
    data: { showJoinQrOnDisplay: Boolean(input.showJoinQrOnDisplay) },
  });
  await broadcastWorkshopLiveState(fastify, workshopId);
  return getWorkshopLiveState(fastify, workshopId, 'STAFF');
}

export async function executeWorkshopAgendaCommand(
  fastify: FastifyInstance,
  actor: AcademyActor,
  workshopId: number,
  agendaItemId: number,
  action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'SKIP'
) {
  await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  const item = await fastify.prisma.crm.crmAcademyWorkshopAgendaItem.findFirst({
    where: { id: positiveId(agendaItemId, 'Agenda ID'), workshopId },
  });
  if (!item) throw new AcademySalesError('Không tìm thấy phần agenda.', 404);
  const now = new Date();
  const transitions: Record<string, string[]> = {
    START: ['PENDING'],
    PAUSE: ['RUNNING'],
    RESUME: ['PAUSED'],
    COMPLETE: ['RUNNING', 'PAUSED'],
    SKIP: ['PENDING', 'RUNNING', 'PAUSED'],
  };
  if (!transitions[action]?.includes(item.status)) {
    throw new AcademySalesError(`Không thể ${action.toLowerCase()} phần agenda đang ở trạng thái ${item.status}.`, 409);
  }
  if (action === 'START') {
    const other = await fastify.prisma.crm.crmAcademyWorkshopAgendaItem.findFirst({
      where: { workshopId, status: { in: ['RUNNING', 'PAUSED'] }, NOT: { id: item.id } },
    });
    if (other) throw new AcademySalesError(`Cần hoàn tất "${other.title}" trước khi bắt đầu phần mới.`, 409);
  }
  const pauseDelta =
    item.pausedAt && ['RESUME', 'COMPLETE', 'SKIP'].includes(action)
      ? Math.max(0, Math.floor((now.getTime() - item.pausedAt.getTime()) / 1000))
      : 0;
  const status =
    action === 'START' || action === 'RESUME'
      ? 'RUNNING'
      : action === 'PAUSE'
        ? 'PAUSED'
        : action === 'COMPLETE'
          ? 'COMPLETED'
          : 'SKIPPED';
  const updated = await fastify.prisma.crm.$transaction(async (tx) => {
    const currentWorkshop = await tx.crmAcademyWorkshop.findUnique({
      where: { id: workshopId },
      select: { liveAgendaItemId: true, status: true },
    });
    const isActiveItem = currentWorkshop?.liveAgendaItemId === item.id || ['RUNNING', 'PAUSED'].includes(item.status);

    const next = await tx.crmAcademyWorkshopAgendaItem.update({
      where: { id: item.id },
      data: {
        status,
        startedAt: action === 'START' ? now : item.startedAt || (action === 'COMPLETE' ? now : null),
        pausedAt: action === 'PAUSE' ? now : null,
        pausedSeconds: { increment: pauseDelta },
        completedAt: ['COMPLETE', 'SKIP'].includes(action) ? now : null,
      },
    });

    const nextLiveAgendaItemId =
      action === 'START' || action === 'RESUME'
        ? item.id
        : ['COMPLETE', 'SKIP'].includes(action)
          ? isActiveItem
            ? null
            : (currentWorkshop?.liveAgendaItemId ?? null)
          : (currentWorkshop?.liveAgendaItemId ?? null);

    const nextWorkshopStatus =
      action === 'PAUSE' ? 'PAUSED' : ['START', 'RESUME'].includes(action) ? 'LIVE' : undefined;

    await tx.crmAcademyWorkshop.update({
      where: { id: workshopId },
      data: {
        liveAgendaItemId: nextLiveAgendaItemId,
        ...(nextWorkshopStatus ? { status: nextWorkshopStatus } : {}),
      },
    });
    await tx.crmAcademyWorkshopTimelineEvent.create({
      data: {
        workshopId,
        agendaItemId: item.id,
        eventType:
          action === 'START'
            ? 'STARTED'
            : action === 'PAUSE'
              ? 'PAUSED'
              : action === 'RESUME'
                ? 'RESUMED'
                : action === 'COMPLETE'
                  ? 'COMPLETED'
                  : 'SKIPPED',
        metadataJson: JSON.stringify({ plannedDurationSeconds: item.plannedDurationSeconds, pauseDelta }),
        actorStaffId: actor.id,
        occurredAt: now,
      },
    });
    return next;
  });
  await broadcastWorkshopLiveState(fastify, workshopId);
  return toAcademyWorkshopAgendaItem(updated);
}

export async function getWorkshopTimelineReport(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
  const row = await AcademyWorkshopService.rowById(fastify, actor, workshopId);
  return row.agendaItems
    .filter((item: SafeAny) => item.startedAt && item.completedAt)
    .map((item: SafeAny) => {
      const actualSeconds = Math.max(
        0,
        Math.floor((new Date(item.completedAt).getTime() - new Date(item.startedAt).getTime()) / 1000) -
          item.pausedSeconds
      );
      const varianceSeconds = actualSeconds - item.plannedDurationSeconds;
      const variancePercent = item.plannedDurationSeconds
        ? Math.round((varianceSeconds / item.plannedDurationSeconds) * 1000) / 10
        : 0;
      return {
        agendaItemId: item.id,
        title: item.title,
        plannedSeconds: item.plannedDurationSeconds,
        actualSeconds,
        varianceSeconds,
        variancePercent,
        suggestion:
          variancePercent > 20
            ? 'Phần này vượt giờ trên 20%; nên rút nội dung hoặc tăng thời lượng kế hoạch.'
            : variancePercent < -20
              ? 'Thời lượng thực tế ngắn hơn kế hoạch; cân nhắc bổ sung tương tác.'
              : null,
      };
    });
}

type WorkshopStateBroadcaster = (fastify: FastifyInstance, workshopId: number) => Promise<void>;

/**
 * Pushes a fresh live snapshot only when the saved assessment belongs to a
 * Workshop OS participant. Lead Manager assessments remain isolated from the
 * realtime hub.
 */
export async function broadcastAcademyTalentAssessmentState(
  fastify: FastifyInstance,
  assessmentId: number,
  broadcast: WorkshopStateBroadcaster = broadcastWorkshopLiveState
) {
  const assessment = await fastify.prisma.crm.crmAcademyTalentAssessment.findUnique({
    where: { id: assessmentId },
    select: { workshopParticipant: { select: { workshopId: true } } },
  });
  const workshopId = Number(assessment?.workshopParticipant?.workshopId);
  if (!Number.isInteger(workshopId) || workshopId <= 0) return null;
  await broadcast(fastify, workshopId);
  return workshopId;
}
