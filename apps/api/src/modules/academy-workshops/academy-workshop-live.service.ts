import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopGameCommandRequest,
  CloneAcademyWorkshopQuizRequest,
  ListAcademyWorkshopQuizTemplatesParams,
  SetAcademyWorkshopAgendaResourceRequest,
  UpdateAcademyWorkshopDisplaySettingsRequest,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import type { AcademyActor } from '../academy-sales/academy-sales.service.js';
import type { RealtimeAudience } from './live/workshop-realtime-hub.js';
import {
  broadcastWorkshopLiveState,
  executeWorkshopAgendaCommand,
  getWorkshopGameLeaderboard,
  getWorkshopLiveState,
  getWorkshopTimelineReport,
  updateWorkshopDisplaySettings,
} from './live/workshop-live-state.service.js';
import {
  applyWorkshopQuizTemplate,
  cloneWorkshopQuizToDraft,
  deleteWorkshopQuestion,
  deleteWorkshopQuizTemplate,
  deleteWorkshopTemplateQuestion,
  listWorkshopQuizTemplates,
  refreshWorkshopQuizTemplateFromWorkshop,
  saveWorkshopQuizAsTemplate,
  setWorkshopQuizAgendaItem,
  upsertWorkshopQuestion,
  upsertWorkshopQuiz,
  upsertWorkshopQuizTemplate,
  upsertWorkshopTemplateQuestion,
} from './live/workshop-quiz-authoring.service.js';
import {
  executeWorkshopGameCommand,
  listWorkshopRewards,
  submitWorkshopAnswer,
  updateWorkshopReward,
} from './live/workshop-game-runtime.service.js';

export { WorkshopRealtimeHub, academyWorkshopRealtimeHub } from './live/workshop-realtime-hub.js';
export {
  buildAcademyWorkshopQuestionWindow,
  buildAcademyWorkshopQuizCloneData,
  buildAcademyWorkshopQuizDraftReplacementData,
  normalizeAcademyWorkshopQuestionInput,
} from './live/workshop-live-helpers.js';
export { broadcastAcademyTalentAssessmentState } from './live/workshop-live-state.service.js';

export class AcademyWorkshopLiveService {
  static listQuizTemplates(
    fastify: FastifyInstance,
    actor: AcademyActor,
    params: ListAcademyWorkshopQuizTemplatesParams = {}
  ) {
    return listWorkshopQuizTemplates(fastify, actor, params);
  }

  static gameLeaderboard(fastify: FastifyInstance, workshopId: number) {
    return getWorkshopGameLeaderboard(fastify, workshopId);
  }

  static liveState(fastify: FastifyInstance, workshopId: number, audience: RealtimeAudience = 'DISPLAY') {
    return getWorkshopLiveState(fastify, workshopId, audience);
  }

  static broadcastState(fastify: FastifyInstance, workshopId: number) {
    return broadcastWorkshopLiveState(fastify, workshopId);
  }

  static updateDisplaySettings(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    input: UpdateAcademyWorkshopDisplaySettingsRequest
  ) {
    return updateWorkshopDisplaySettings(fastify, actor, workshopId, input);
  }

  static agendaCommand(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    agendaItemId: number,
    action: 'START' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'SKIP'
  ) {
    return executeWorkshopAgendaCommand(fastify, actor, workshopId, agendaItemId, action);
  }

  static timelineReport(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
    return getWorkshopTimelineReport(fastify, actor, workshopId);
  }

  static upsertQuiz(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    quizId: number | null,
    input: UpsertAcademyWorkshopQuizRequest
  ) {
    return upsertWorkshopQuiz(fastify, actor, workshopId, quizId, input);
  }

  static setQuizAgendaItem(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    quizId: number,
    input: SetAcademyWorkshopAgendaResourceRequest
  ) {
    return setWorkshopQuizAgendaItem(fastify, actor, workshopId, quizId, input);
  }

  static cloneQuizToDraft(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    quizId: number,
    input: CloneAcademyWorkshopQuizRequest = {}
  ) {
    return cloneWorkshopQuizToDraft(fastify, actor, workshopId, quizId, input);
  }

  static upsertQuizTemplate(
    fastify: FastifyInstance,
    actor: AcademyActor,
    templateId: number | null,
    input: UpsertAcademyWorkshopQuizRequest
  ) {
    return upsertWorkshopQuizTemplate(fastify, actor, templateId, input);
  }

  static deleteQuizTemplate(fastify: FastifyInstance, actor: AcademyActor, templateId: number) {
    return deleteWorkshopQuizTemplate(fastify, actor, templateId);
  }

  static saveQuizAsTemplate(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    quizId: number,
    input: CloneAcademyWorkshopQuizRequest = {}
  ) {
    return saveWorkshopQuizAsTemplate(fastify, actor, workshopId, quizId, input);
  }

  static refreshQuizTemplateFromWorkshop(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    quizId: number
  ) {
    return refreshWorkshopQuizTemplateFromWorkshop(fastify, actor, workshopId, quizId);
  }

  static applyQuizTemplate(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    templateId: number,
    input: CloneAcademyWorkshopQuizRequest = {}
  ) {
    return applyWorkshopQuizTemplate(fastify, actor, workshopId, templateId, input);
  }

  static upsertQuestion(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    quizId: number,
    questionId: number | null,
    input: UpsertAcademyWorkshopQuestionRequest
  ) {
    return upsertWorkshopQuestion(fastify, actor, workshopId, quizId, questionId, input);
  }

  static upsertTemplateQuestion(
    fastify: FastifyInstance,
    actor: AcademyActor,
    templateId: number,
    questionId: number | null,
    input: UpsertAcademyWorkshopQuestionRequest
  ) {
    return upsertWorkshopTemplateQuestion(fastify, actor, templateId, questionId, input);
  }

  static deleteQuestion(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    quizId: number,
    questionId: number
  ) {
    return deleteWorkshopQuestion(fastify, actor, workshopId, quizId, questionId);
  }

  static deleteTemplateQuestion(fastify: FastifyInstance, actor: AcademyActor, templateId: number, questionId: number) {
    return deleteWorkshopTemplateQuestion(fastify, actor, templateId, questionId);
  }

  static gameCommand(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    quizId: number,
    action: AcademyWorkshopGameCommandRequest['action'],
    requestedQuestionId?: number
  ) {
    return executeWorkshopGameCommand(fastify, actor, workshopId, quizId, action, requestedQuestionId);
  }

  static submitAnswer(
    fastify: FastifyInstance,
    participantId: number,
    input: { questionId: number; optionId: number; idempotencyKey: string }
  ) {
    return submitWorkshopAnswer(fastify, participantId, input);
  }

  static listRewards(fastify: FastifyInstance, actor: AcademyActor, workshopId: number) {
    return listWorkshopRewards(fastify, actor, workshopId);
  }

  static updateReward(
    fastify: FastifyInstance,
    actor: AcademyActor,
    workshopId: number,
    rewardId: number,
    status: 'FULFILLED' | 'VOID',
    note?: string | null
  ) {
    return updateWorkshopReward(fastify, actor, workshopId, rewardId, status, note);
  }
}
