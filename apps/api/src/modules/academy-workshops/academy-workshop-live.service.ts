import type { FastifyInstance } from 'fastify';
import {
  calculateAcademyWorkshopQuestionScore,
  getAcademyWorkshopQuizProgress,
  removeVietnameseTones,
  selectAcademyWorkshopRewardParticipantIds,
  type CloneAcademyWorkshopQuizRequest,
  type AcademyWorkshopAnswerReceipt,
  type AcademyWorkshopGameCommandRequest,
  type AcademyWorkshopGameLeaderboardEntry,
  type AcademyWorkshopLiveState,
  type AcademyWorkshopRealtimeEvent,
  type ListAcademyWorkshopQuizTemplatesParams,
  type SafeAny,
  type UpdateAcademyWorkshopDisplaySettingsRequest,
  type UpsertAcademyWorkshopQuestionRequest,
  type UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import { AcademySalesError, type AcademyActor } from '../academy-sales/academy-sales.service.js';
import {
  AcademyWorkshopService,
  toAcademyWorkshopAgendaItem,
  toAcademyWorkshopQuiz,
} from './academy-workshop.service.js';

type RealtimeAudience = 'STAFF' | 'DISPLAY' | 'PARTICIPANT';
type SocketLike = { readyState: number; send(payload: string): void; close(): void };
type Connection = { socket: SocketLike; audience: RealtimeAudience; participantId?: number };

export class WorkshopRealtimeHub {
  private readonly workshops = new Map<number, Set<Connection>>();

  add(workshopId: number, connection: Connection) {
    const connections = this.workshops.get(workshopId) || new Set<Connection>();
    connections.add(connection);
    this.workshops.set(workshopId, connections);
    return () => {
      connections.delete(connection);
      if (!connections.size) this.workshops.delete(workshopId);
    };
  }

  connectedParticipants(workshopId: number) {
    return new Set(
      [...(this.workshops.get(workshopId) || [])]
        .filter((connection) => connection.audience === 'PARTICIPANT' && connection.participantId)
        .map((connection) => connection.participantId!)
    ).size;
  }

  broadcast(workshopId: number, event: AcademyWorkshopRealtimeEvent) {
    const payload = JSON.stringify(event);
    for (const connection of this.workshops.get(workshopId) || []) {
      if (connection.socket.readyState !== 1) continue;
      try {
        connection.socket.send(payload);
      } catch {
        connection.socket.close();
      }
    }
  }
}

export const academyWorkshopRealtimeHub = new WorkshopRealtimeHub();

const INTERNAL_ACTOR: AcademyActor = { id: 0, role: 'super_admin', academyAccess: true };
const QUIZ_INCLUDE = {
  questions: { include: { options: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } },
} as const;

export function buildAcademyWorkshopQuestionWindow(question: { id: number; durationSeconds: number }, openedAt: Date) {
  return {
    status: 'QUESTION_OPEN' as const,
    activeQuestionId: question.id,
    questionOpenedAt: openedAt,
    questionClosesAt: new Date(openedAt.getTime() + question.durationSeconds * 1000),
  };
}

function positiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError(`${label} không hợp lệ.`);
  return id;
}

export function normalizeAcademyWorkshopQuestionInput(input: UpsertAcademyWorkshopQuestionRequest) {
  const prompt = String(input.prompt || '').trim();
  const durationSeconds = Math.round(Number(input.durationSeconds));
  if (!prompt || durationSeconds < 5 || durationSeconds > 120) {
    throw new AcademySalesError('Câu hỏi hoặc thời gian 5–120 giây không hợp lệ.');
  }
  if (!['SINGLE_CHOICE', 'TRUE_FALSE'].includes(input.type)) throw new AcademySalesError('Loại câu hỏi không hợp lệ.');
  if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 6) {
    throw new AcademySalesError('Mỗi câu cần từ 2 đến 6 lựa chọn.');
  }
  if (input.type === 'TRUE_FALSE' && input.options.length !== 2) {
    throw new AcademySalesError('Câu Đúng/Sai phải có đúng 2 lựa chọn.');
  }
  const optionLabels = input.options.map((option) => String(option.label || '').trim());
  if (optionLabels.some((label) => !label)) throw new AcademySalesError('Nội dung lựa chọn không được để trống.');
  if (input.options.filter((option) => option.isCorrect).length !== 1) {
    throw new AcademySalesError('Mỗi câu phải có đúng một đáp án đúng.');
  }
  return {
    questionData: {
      type: input.type,
      prompt,
      imageUrl: String(input.imageUrl || '').trim() || null,
      durationSeconds,
      sortOrder: Math.max(0, Math.round(Number(input.sortOrder) || 0)),
      rewardRule: input.rewardRule || 'NONE',
      fastestCount: Math.min(100, Math.max(1, Math.round(Number(input.fastestCount) || 1))),
      rewardLabel: String(input.rewardLabel || '').trim() || null,
      rewardQuantity: Math.max(1, Math.round(Number(input.rewardQuantity) || 1)),
    },
    options: input.options.map((option, index) => ({
      label: optionLabels[index],
      color: String(option.color || '').trim() || null,
      isCorrect: Boolean(option.isCorrect),
      sortOrder: option.sortOrder === undefined ? index + 1 : Math.max(0, Math.round(option.sortOrder)),
    })),
  };
}

export function buildAcademyWorkshopQuizCloneData(
  source: SafeAny,
  workshopId: number,
  actorId: number,
  input: CloneAcademyWorkshopQuizRequest = {}
) {
  const requestedTitle = String(input.title || '').trim();
  const title = requestedTitle || `${String(source.title)} · Bản chỉnh sửa`;
  if (title.length > 180) throw new AcademySalesError('Tên game tối đa 180 ký tự.');
  return {
    workshopId,
    title,
    description: source.description ?? null,
    isTemplate: false,
    status: 'DRAFT',
    podiumRewardsJson: source.podiumRewardsJson ?? null,
    createdByStaffId: actorId,
    questions: {
      create: (source.questions || []).map((question: SafeAny) => ({
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
          create: (question.options || []).map((option: SafeAny) => ({
            label: option.label,
            color: option.color ?? null,
            isCorrect: option.isCorrect,
            sortOrder: option.sortOrder,
          })),
        },
      })),
    },
  };
}

function manager(actor: AcademyActor) {
  return ['admin', 'super_admin', 'manager'].includes(actor.role);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class AcademyWorkshopLiveService {
  static async listQuizTemplates(
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

  static async gameLeaderboard(
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

  static async liveState(
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
    const activeQuestion =
      activeQuiz?.questions.find((question) => question.id === activeQuiz.activeQuestionId) || null;
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
      activeQuiz,
      activeQuestion,
      gameLeaderboard: await this.gameLeaderboard(fastify, workshopId),
      talentLeaderboard: await AcademyWorkshopService.talentLeaderboard(fastify, INTERNAL_ACTOR, workshopId),
    };
  }

  static async broadcastState(fastify: FastifyInstance, workshopId: number) {
    academyWorkshopRealtimeHub.broadcast(workshopId, {
      type: 'STATE_SNAPSHOT',
      data: await this.liveState(fastify, workshopId, 'DISPLAY'),
    });
  }

  static async updateDisplaySettings(
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
    await this.broadcastState(fastify, workshopId);
    return this.liveState(fastify, workshopId, 'STAFF');
  }

  static async agendaCommand(
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
      SKIP: ['PENDING'],
    };
    if (!transitions[action]?.includes(item.status)) {
      throw new AcademySalesError(
        `Không thể ${action.toLowerCase()} phần agenda đang ở trạng thái ${item.status}.`,
        409
      );
    }
    if (action === 'START') {
      const other = await fastify.prisma.crm.crmAcademyWorkshopAgendaItem.findFirst({
        where: { workshopId, status: { in: ['RUNNING', 'PAUSED'] }, NOT: { id: item.id } },
      });
      if (other) throw new AcademySalesError(`Cần hoàn tất "${other.title}" trước khi bắt đầu phần mới.`, 409);
    }
    const pauseDelta =
      item.pausedAt && ['RESUME', 'COMPLETE'].includes(action)
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
      const next = await tx.crmAcademyWorkshopAgendaItem.update({
        where: { id: item.id },
        data: {
          status,
          startedAt: action === 'START' ? now : item.startedAt,
          pausedAt: action === 'PAUSE' ? now : null,
          pausedSeconds: { increment: pauseDelta },
          completedAt: ['COMPLETE', 'SKIP'].includes(action) ? now : null,
        },
      });
      await tx.crmAcademyWorkshop.update({
        where: { id: workshopId },
        data: {
          liveAgendaItemId: ['COMPLETE', 'SKIP'].includes(action) ? null : item.id,
          status: action === 'PAUSE' ? 'PAUSED' : ['START', 'RESUME'].includes(action) ? 'LIVE' : undefined,
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
    await this.broadcastState(fastify, workshopId);
    return toAcademyWorkshopAgendaItem(updated);
  }

  static async timelineReport(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
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

  static async upsertQuiz(
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

  static async cloneQuizToDraft(
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

  static async upsertQuizTemplate(
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

  static async deleteQuizTemplate(fastify: FastifyInstance, _actor: AcademyActor, templateId: number) {
    const template = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
      where: { id: positiveId(templateId, 'Template ID'), isTemplate: true, workshopId: null },
    });
    if (!template) throw new AcademySalesError('Không tìm thấy mẫu câu hỏi.', 404);
    await fastify.prisma.crm.crmAcademyWorkshopQuiz.delete({ where: { id: template.id } });
  }

  static async saveQuizAsTemplate(
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
      data: { ...copyData, workshopId: null, isTemplate: true },
      include: QUIZ_INCLUDE,
    });
    return toAcademyWorkshopQuiz(template, true)!;
  }

  static async applyQuizTemplate(
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
    const unfinishedQuiz = await fastify.prisma.crm.crmAcademyWorkshopQuiz.findFirst({
      where: { workshopId, isTemplate: false, status: { not: 'COMPLETED' } },
      select: { id: true },
    });
    if (unfinishedQuiz)
      throw new AcademySalesError('Hãy chốt hoặc tiếp tục game bản nháp hiện tại trước khi dùng mẫu khác.', 409);
    const game = await fastify.prisma.crm.crmAcademyWorkshopQuiz.create({
      data: buildAcademyWorkshopQuizCloneData(template, workshopId, actor.id, {
        title: String(input.title || '').trim() || template.title,
      }),
      include: QUIZ_INCLUDE,
    });
    return toAcademyWorkshopQuiz(game, true)!;
  }

  static async upsertQuestion(
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
    return this.persistQuestion(fastify, quiz, questionId, input);
  }

  static async upsertTemplateQuestion(
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
    return this.persistQuestion(fastify, template, questionId, input);
  }

  private static async persistQuestion(
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

  static async deleteQuestion(
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
    return this.deleteQuestionForQuiz(fastify, quiz, questionId);
  }

  static async deleteTemplateQuestion(
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
    return this.deleteQuestionForQuiz(fastify, template, questionId);
  }

  private static async deleteQuestionForQuiz(fastify: FastifyInstance, quiz: SafeAny, questionId: number) {
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

  private static async lockQuestionRewards(
    fastify: FastifyInstance,
    workshopId: number,
    quizId: number,
    questionId: number
  ) {
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

  private static async lockPodiumRewards(fastify: FastifyInstance, workshopId: number, quiz: SafeAny) {
    const rewards = parseJson<Record<string, string>>(quiz.podiumRewardsJson, {});
    const leaderboard = await this.gameLeaderboard(fastify, workshopId);
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

  static async gameCommand(
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
      if (quiz.activeQuestionId) await this.lockQuestionRewards(fastify, workshopId, quiz.id, quiz.activeQuestionId);
    }
    if (action === 'END_GAME') await this.lockPodiumRewards(fastify, workshopId, quiz);
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
    await this.broadcastState(fastify, workshopId);
    return toAcademyWorkshopQuiz(updated, true)!;
  }

  static async submitAnswer(
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
    await this.broadcastState(fastify, participant.workshopId);
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

  static async listRewards(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
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

  static async updateReward(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    rewardId: number,
    status: 'FULFILLED' | 'VOID',
    note?: string | null
  ) {
    await AcademyWorkshopService.rowById(fastify, actor, workshopId);
    if (!manager(actor)) throw new AcademySalesError('Chỉ Admin hoặc Quản lý được chốt trao thưởng.', 403);
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
    return (await this.listRewards(fastify, actor, workshopId)).find((reward) => reward.id === rewardId)!;
  }
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
  broadcast: WorkshopStateBroadcaster = (instance, workshopId) =>
    AcademyWorkshopLiveService.broadcastState(instance, workshopId)
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
