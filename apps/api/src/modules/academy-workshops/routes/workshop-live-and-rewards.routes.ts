import type { FastifyInstance } from 'fastify';
import type {
  AcademyWorkshopAgendaCommandRequest,
  AcademyWorkshopGameCommandRequest,
  CloneAcademyWorkshopQuizRequest,
  CreateAcademyWorkshopAgendaItemRequest,
  ReorderAcademyWorkshopAgendaRequest,
  SetAcademyWorkshopAgendaResourceRequest,
  UpdateAcademyInstructorBonusRequest,
  UpdateAcademyWorkshopAgendaItemRequest,
  UpdateAcademyWorkshopDisplaySettingsRequest,
  UpdateAcademyWorkshopRewardRequest,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
} from '@mos-lab/shared';
import { AcademySalesError } from '../../academy-sales/academy-sales.service.js';
import { AcademyWorkshopBonusService } from '../academy-workshop-bonus.service.js';
import { AcademyWorkshopLiveService } from '../academy-workshop-live.service.js';
import { AcademyWorkshopService } from '../academy-workshop.service.js';
import { actorFrom, parseWorkshopId, sendWorkshopError } from './workshop-route-helpers.js';

export function registerWorkshopLiveAndRewardRoutes(fastify: FastifyInstance) {
  fastify.post('/academy-sales/workshops/:workshopId/agenda/:agendaItemId/command', async (request, reply) => {
    try {
      const { workshopId, agendaItemId } = request.params as { workshopId: string; agendaItemId: string };
      const { action } = request.body as AcademyWorkshopAgendaCommandRequest;
      const data = await AcademyWorkshopLiveService.agendaCommand(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(agendaItemId, 'Agenda ID'),
        action
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật agenda live.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Agenda command');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/agenda', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.createAgendaItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopAgendaItemRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm mục agenda.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop agenda item');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/agenda/reorder', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.reorderAgenda(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as ReorderAcademyWorkshopAgendaRequest
      );
      return reply.send({ success: true, data, message: 'Đã sắp xếp lại agenda.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Reorder workshop agenda');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/agenda/:agendaItemId', async (request, reply) => {
    try {
      const { workshopId, agendaItemId } = request.params as { workshopId: string; agendaItemId: string };
      const data = await AcademyWorkshopService.updateAgendaItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(agendaItemId, 'Agenda ID'),
        request.body as UpdateAcademyWorkshopAgendaItemRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mục agenda.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop agenda item');
    }
  });

  fastify.delete('/academy-sales/workshops/:workshopId/agenda/:agendaItemId', async (request, reply) => {
    try {
      const { workshopId, agendaItemId } = request.params as { workshopId: string; agendaItemId: string };
      await AcademyWorkshopService.deleteAgendaItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(agendaItemId, 'Agenda ID')
      );
      return reply.send({ success: true, message: 'Đã xóa mục agenda.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Delete workshop agenda item');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/timeline-report', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send({
        data: await AcademyWorkshopLiveService.timelineReport(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID')
        ),
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Workshop timeline report');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/live-state', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      await AcademyWorkshopService.rowById(fastify, actorFrom(request), parseWorkshopId(workshopId, 'Workshop ID'));
      return reply.send({
        data: await AcademyWorkshopLiveService.liveState(fastify, parseWorkshopId(workshopId, 'Workshop ID'), 'STAFF'),
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Workshop live state');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/display-settings', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopLiveService.updateDisplaySettings(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as UpdateAcademyWorkshopDisplaySettingsRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật QR trên màn hình Leaderboard.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop display settings');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopLiveService.upsertQuiz(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        null,
        request.body as UpsertAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo game.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop quiz');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/quizzes/:quizId', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.upsertQuiz(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(quizId, 'Quiz ID'),
        request.body as UpsertAcademyWorkshopQuizRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật game.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop quiz');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/quizzes/:quizId/agenda-item', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.setQuizAgendaItem(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(quizId, 'Game ID'),
        request.body as SetAcademyWorkshopAgendaResourceRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mốc chạy game.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Set workshop quiz agenda item');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/:quizId/clone', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.cloneQuizToDraft(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(quizId, 'Quiz ID'),
        (request.body || {}) as CloneAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo bản chỉnh sửa.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Clone workshop quiz');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/:quizId/save-template', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.saveQuizAsTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(quizId, 'Quiz ID'),
        (request.body || {}) as CloneAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã lưu game thành mẫu dùng chung.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Save workshop quiz as template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/:quizId/template/refresh', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.refreshQuizTemplateFromWorkshop(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(quizId, 'Quiz ID')
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mẫu game từ bộ câu hỏi hiện tại.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Refresh workshop quiz template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/from-template/:templateId', async (request, reply) => {
    try {
      const { workshopId, templateId } = request.params as { workshopId: string; templateId: string };
      const data = await AcademyWorkshopLiveService.applyQuizTemplate(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(templateId, 'Template ID'),
        (request.body || {}) as CloneAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo game độc lập từ mẫu.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Apply workshop quiz template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/:quizId/questions', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.upsertQuestion(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(quizId, 'Quiz ID'),
        null,
        request.body as UpsertAcademyWorkshopQuestionRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm câu hỏi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop question');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/quizzes/:quizId/questions/:questionId', async (request, reply) => {
    try {
      const { workshopId, quizId, questionId } = request.params as {
        workshopId: string;
        quizId: string;
        questionId: string;
      };
      const data = await AcademyWorkshopLiveService.upsertQuestion(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(quizId, 'Quiz ID'),
        parseWorkshopId(questionId, 'Question ID'),
        request.body as UpsertAcademyWorkshopQuestionRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật câu hỏi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop question');
    }
  });

  fastify.delete(
    '/academy-sales/workshops/:workshopId/quizzes/:quizId/questions/:questionId',
    async (request, reply) => {
      try {
        const { workshopId, quizId, questionId } = request.params as {
          workshopId: string;
          quizId: string;
          questionId: string;
        };
        const data = await AcademyWorkshopLiveService.deleteQuestion(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(quizId, 'Quiz ID'),
          parseWorkshopId(questionId, 'Question ID')
        );
        return reply.send({ success: true, data, message: 'Đã xóa câu hỏi.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Delete workshop question');
      }
    }
  );

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/:quizId/command', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const body = request.body as AcademyWorkshopGameCommandRequest;
      const data = await AcademyWorkshopLiveService.gameCommand(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(quizId, 'Quiz ID'),
        body.action,
        body.questionId
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật game live.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Workshop game command');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/rewards', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send({
        data: await AcademyWorkshopLiveService.listRewards(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID')
        ),
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop rewards');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/rewards/:rewardId', async (request, reply) => {
    try {
      const { workshopId, rewardId } = request.params as { workshopId: string; rewardId: string };
      const body = request.body as UpdateAcademyWorkshopRewardRequest;
      const data = await AcademyWorkshopLiveService.updateReward(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(rewardId, 'Reward ID'),
        body.status,
        body.note
      );
      return reply.send({ success: true, data, message: 'Đã chốt trạng thái phần thưởng.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop reward');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/bonuses', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      await AcademyWorkshopService.rowById(fastify, actorFrom(request), parseWorkshopId(workshopId, 'Workshop ID'));
      return reply.send({
        data: await AcademyWorkshopBonusService.list(fastify, parseWorkshopId(workshopId, 'Workshop ID')),
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop bonuses');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/bonuses/:bonusId', async (request, reply) => {
    try {
      const { workshopId, bonusId } = request.params as { workshopId: string; bonusId: string };
      await AcademyWorkshopService.rowById(fastify, actorFrom(request), parseWorkshopId(workshopId, 'Workshop ID'));
      const body = request.body as UpdateAcademyInstructorBonusRequest;
      const data = await AcademyWorkshopBonusService.update(
        fastify,
        actorFrom(request),
        parseWorkshopId(bonusId, 'Bonus ID'),
        body.status,
        body.note
      );
      if (data.workshopId !== parseWorkshopId(workshopId, 'Workshop ID')) {
        throw new AcademySalesError('Khoản thưởng không thuộc workshop.', 404);
      }
      return reply.send({ success: true, data, message: 'Đã chốt thưởng giáo viên.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop bonus');
    }
  });
}
