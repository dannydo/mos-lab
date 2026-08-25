import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type {
  AcademyWorkshopAgendaCommandRequest,
  AcademyWorkshopGameCommandRequest,
  AddAcademyWorkshopParticipantsRequest,
  AssignAcademyWorkshopInstructorRequest,
  CheckInAcademyWorkshopParticipantRequest,
  CloneAcademyWorkshopQuizRequest,
  ConfirmAcademyWorkshopPhotoRequest,
  CreateAcademyWorkshopPhotoUploadRequest,
  CreateAcademyWorkshopRequest,
  CreateAcademyWorkshopWalkInRequest,
  ListAcademyWorkshopQuizTemplatesParams,
  ListAcademyWorkshopParticipantsParams,
  ListAcademyWorkshopsParams,
  RecordAcademyWorkshopFeeRequest,
  SetAcademyWorkshopPhotoConsentRequest,
  UpdateAcademyInstructorBonusRequest,
  UpdateAcademyWorkshopCareRequest,
  UpdateAcademyWorkshopDisplaySettingsRequest,
  UpdateAcademyWorkshopRequest,
  UpdateAcademyWorkshopRewardRequest,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
  WaiveAcademyWorkshopFeeRequest,
} from '@mos-lab/shared';
import { requireAuth } from '../../middlewares/auth.js';
import {
  AcademySalesError,
  AcademySalesService,
  getAcademyWorkspaceAccess,
  type AcademyActor,
} from '../academy-sales/academy-sales.service.js';
import { AcademyTalentAssessmentService } from '../academy-sales/academy-talent-assessment.service.js';
import { AcademyWorkshopBonusService } from './academy-workshop-bonus.service.js';
import { AcademyWorkshopLiveService } from './academy-workshop-live.service.js';
import { AcademyWorkshopService } from './academy-workshop.service.js';

function actorFrom(request: FastifyRequest): AcademyActor {
  return {
    id: request.user.id,
    role: request.user.role,
    displayName: request.user.displayName,
    email: request.user.email,
    academyAccess: (request as FastifyRequest & { academyAccess?: boolean }).academyAccess,
  };
}

async function requireWorkshopAccess(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;
  const access = await getAcademyWorkspaceAccess(request.server, actorFrom(request));
  if (!access.canAccess) {
    return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền truy cập Academy Workshop.' });
  }
  (request as FastifyRequest & { academyAccess?: boolean }).academyAccess = true;
}

function id(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AcademySalesError(`${label} không hợp lệ.`);
  return parsed;
}

function error(fastify: FastifyInstance, reply: FastifyReply, cause: unknown, context: string) {
  if (cause instanceof AcademySalesError) {
    return reply.status(cause.statusCode).send({ error: cause.name, message: cause.message });
  }
  fastify.log.error(cause, context);
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý Academy Workshop.' });
}

export async function academyWorkshopRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireWorkshopAccess);

  fastify.get('/academy-sales/workshop-quiz-templates', async (request, reply) => {
    try {
      return reply.send(
        await AcademyWorkshopLiveService.listQuizTemplates(
          fastify,
          actorFrom(request),
          request.query as ListAcademyWorkshopQuizTemplatesParams
        )
      );
    } catch (cause) {
      return error(fastify, reply, cause, 'List workshop quiz templates');
    }
  });

  fastify.post('/academy-sales/workshop-quiz-templates', async (request, reply) => {
    try {
      const data = await AcademyWorkshopLiveService.upsertQuizTemplate(
        fastify,
        actorFrom(request),
        null,
        request.body as UpsertAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo mẫu câu hỏi.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Create workshop quiz template');
    }
  });

  fastify.put('/academy-sales/workshop-quiz-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      const data = await AcademyWorkshopLiveService.upsertQuizTemplate(
        fastify,
        actorFrom(request),
        id(templateId, 'Template ID'),
        request.body as UpsertAcademyWorkshopQuizRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mẫu câu hỏi.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop quiz template');
    }
  });

  fastify.delete('/academy-sales/workshop-quiz-templates/:templateId', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      await AcademyWorkshopLiveService.deleteQuizTemplate(fastify, actorFrom(request), id(templateId, 'Template ID'));
      return reply.send({ success: true, message: 'Đã xóa mẫu câu hỏi.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Delete workshop quiz template');
    }
  });

  fastify.post('/academy-sales/workshop-quiz-templates/:templateId/questions', async (request, reply) => {
    try {
      const { templateId } = request.params as { templateId: string };
      const data = await AcademyWorkshopLiveService.upsertTemplateQuestion(
        fastify,
        actorFrom(request),
        id(templateId, 'Template ID'),
        null,
        request.body as UpsertAcademyWorkshopQuestionRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm câu hỏi vào mẫu.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Create workshop template question');
    }
  });

  fastify.put('/academy-sales/workshop-quiz-templates/:templateId/questions/:questionId', async (request, reply) => {
    try {
      const { templateId, questionId } = request.params as { templateId: string; questionId: string };
      const data = await AcademyWorkshopLiveService.upsertTemplateQuestion(
        fastify,
        actorFrom(request),
        id(templateId, 'Template ID'),
        id(questionId, 'Question ID'),
        request.body as UpsertAcademyWorkshopQuestionRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật câu hỏi mẫu.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop template question');
    }
  });

  fastify.delete('/academy-sales/workshop-quiz-templates/:templateId/questions/:questionId', async (request, reply) => {
    try {
      const { templateId, questionId } = request.params as { templateId: string; questionId: string };
      const data = await AcademyWorkshopLiveService.deleteTemplateQuestion(
        fastify,
        actorFrom(request),
        id(templateId, 'Template ID'),
        id(questionId, 'Question ID')
      );
      return reply.send({ success: true, data, message: 'Đã xóa câu hỏi mẫu.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Delete workshop template question');
    }
  });

  fastify.get('/academy-sales/workshops', async (request, reply) => {
    try {
      return reply.send(
        await AcademyWorkshopService.list(fastify, actorFrom(request), request.query as ListAcademyWorkshopsParams)
      );
    } catch (cause) {
      return error(fastify, reply, cause, 'List workshops');
    }
  });

  fastify.post('/academy-sales/workshops', async (request, reply) => {
    try {
      const data = await AcademyWorkshopService.create(
        fastify,
        actorFrom(request),
        request.body as CreateAcademyWorkshopRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo workshop.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Create workshop');
    }
  });

  fastify.get('/academy-sales/workshops/resources', async (request, reply) => {
    try {
      const [staff, instructors] = await Promise.all([
        AcademySalesService.listStaffOptions(fastify, actorFrom(request)),
        AcademyTalentAssessmentService.listInstructors(fastify),
      ]);
      return reply.send({ data: { staff, instructors: instructors.data } });
    } catch (cause) {
      return error(fastify, reply, cause, 'Workshop resources');
    }
  });

  fastify.get('/academy-sales/workshops/slug/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      return reply.send({ data: await AcademyWorkshopService.getBySlug(fastify, actorFrom(request), slug) });
    } catch (cause) {
      return error(fastify, reply, cause, 'Get workshop slug');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send({
        data: await AcademyWorkshopService.getById(fastify, actorFrom(request), id(workshopId, 'Workshop ID')),
      });
    } catch (cause) {
      return error(fastify, reply, cause, 'Get workshop');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.update(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        request.body as UpdateAcademyWorkshopRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật workshop.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/participants', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send(
        await AcademyWorkshopService.listParticipants(
          fastify,
          actorFrom(request),
          id(workshopId, 'Workshop ID'),
          request.query as ListAcademyWorkshopParticipantsParams
        )
      );
    } catch (cause) {
      return error(fastify, reply, cause, 'List workshop participants');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const { leadIds } = request.body as AddAcademyWorkshopParticipantsRequest;
      const data = await AcademyWorkshopService.addParticipants(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        leadIds || []
      );
      return reply.status(201).send({ success: true, data, message: `Đã thêm ${data.length} học viên.` });
    } catch (cause) {
      return error(fastify, reply, cause, 'Add workshop participants');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/walk-ins', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.addWalkIn(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopWalkInRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo học viên walk-in và cấp QR.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Create workshop walk-in');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/scan-check-in', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const { qrToken } = request.body as CheckInAcademyWorkshopParticipantRequest;
      const data = await AcademyWorkshopService.checkInByQr(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        String(qrToken || '')
      );
      return reply.send({ success: true, data, message: 'Check-in thành công.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Scan workshop check-in');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/participants/:participantId', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      return reply.send({
        data: await AcademyWorkshopService.getParticipant(
          fastify,
          actorFrom(request),
          id(workshopId, 'Workshop ID'),
          id(participantId, 'Participant ID')
        ),
      });
    } catch (cause) {
      return error(fastify, reply, cause, 'Get workshop participant');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/care', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const data = await AcademyWorkshopService.updateCare(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(participantId, 'Participant ID'),
        request.body as UpdateAcademyWorkshopCareRequest
      );
      return reply.send({ success: true, data, message: 'Đã ghi nhận bước chăm sóc.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop care');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/check-in', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const body = request.body as CheckInAcademyWorkshopParticipantRequest;
      const data = await AcademyWorkshopService.checkIn(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(participantId, 'Participant ID'),
        body.checkedIn !== false
      );
      return reply.send({
        success: true,
        data,
        message: body.checkedIn === false ? 'Đã hoàn tác check-in.' : 'Check-in thành công.',
      });
    } catch (cause) {
      return error(fastify, reply, cause, 'Workshop check-in');
    }
  });

  fastify.post(
    '/academy-sales/workshops/:workshopId/participants/:participantId/reissue-qr',
    async (request, reply) => {
      try {
        const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
        const data = await AcademyWorkshopService.reissueQr(
          fastify,
          actorFrom(request),
          id(workshopId, 'Workshop ID'),
          id(participantId, 'Participant ID')
        );
        return reply.send({ success: true, data, message: 'Đã thu hồi QR cũ và cấp QR mới.' });
      } catch (cause) {
        return error(fastify, reply, cause, 'Reissue QR');
      }
    }
  );

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/fee', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const data = await AcademyWorkshopService.recordFee(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(participantId, 'Participant ID'),
        request.body as RecordAcademyWorkshopFeeRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã ghi bút toán phí workshop.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Record workshop fee');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/waive-fee', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const body = request.body as WaiveAcademyWorkshopFeeRequest;
      const data = await AcademyWorkshopService.waiveFee(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(participantId, 'Participant ID'),
        body.waived,
        body.reason
      );
      return reply.send({ success: true, data, message: body.waived ? 'Đã miễn phí workshop.' : 'Đã hủy miễn phí.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Waive workshop fee');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/consent', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const body = request.body as SetAcademyWorkshopPhotoConsentRequest;
      const data = await AcademyWorkshopService.setConsent(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(participantId, 'Participant ID'),
        body.consent,
        body.policyVersion
      );
      return reply.send({
        success: true,
        data,
        message: body.consent ? 'Đã ghi nhận consent ảnh.' : 'Đã thu hồi consent ảnh.',
      });
    } catch (cause) {
      return error(fastify, reply, cause, 'Workshop photo consent');
    }
  });

  fastify.post(
    '/academy-sales/workshops/:workshopId/participants/:participantId/photos/upload-intent',
    async (request, reply) => {
      try {
        const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
        return reply.send({
          data: await AcademyWorkshopService.createPhotoUploadIntent(
            fastify,
            actorFrom(request),
            id(workshopId, 'Workshop ID'),
            id(participantId, 'Participant ID'),
            request.body as CreateAcademyWorkshopPhotoUploadRequest
          ),
        });
      } catch (cause) {
        return error(fastify, reply, cause, 'Workshop photo upload intent');
      }
    }
  );

  fastify.post(
    '/academy-sales/workshops/:workshopId/participants/:participantId/photos/confirm',
    async (request, reply) => {
      try {
        const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
        const data = await AcademyWorkshopService.confirmPhoto(
          fastify,
          actorFrom(request),
          id(workshopId, 'Workshop ID'),
          id(participantId, 'Participant ID'),
          request.body as ConfirmAcademyWorkshopPhotoRequest
        );
        return reply.status(201).send({ success: true, data, message: 'Đã lưu ảnh khoảnh khắc.' });
      } catch (cause) {
        return error(fastify, reply, cause, 'Confirm workshop photo');
      }
    }
  );

  fastify.post(
    '/academy-sales/workshops/:workshopId/participants/:participantId/instructor',
    async (request, reply) => {
      try {
        const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
        const body = request.body as AssignAcademyWorkshopInstructorRequest;
        const data = await AcademyWorkshopService.assignInstructor(
          fastify,
          actorFrom(request),
          id(workshopId, 'Workshop ID'),
          id(participantId, 'Participant ID'),
          body.instructorId
        );
        return reply.send({ success: true, data, message: 'Đã phân giáo viên chính.' });
      } catch (cause) {
        return error(fastify, reply, cause, 'Assign workshop instructor');
      }
    }
  );

  fastify.get('/academy-sales/workshops/:workshopId/talent-leaderboard', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send({
        data: await AcademyWorkshopService.talentLeaderboard(
          fastify,
          actorFrom(request),
          id(workshopId, 'Workshop ID')
        ),
      });
    } catch (cause) {
      return error(fastify, reply, cause, 'Talent leaderboard');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/agenda/:agendaItemId/command', async (request, reply) => {
    try {
      const { workshopId, agendaItemId } = request.params as { workshopId: string; agendaItemId: string };
      const { action } = request.body as AcademyWorkshopAgendaCommandRequest;
      const data = await AcademyWorkshopLiveService.agendaCommand(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(agendaItemId, 'Agenda ID'),
        action
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật agenda live.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Agenda command');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/timeline-report', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send({
        data: await AcademyWorkshopLiveService.timelineReport(
          fastify,
          actorFrom(request),
          id(workshopId, 'Workshop ID')
        ),
      });
    } catch (cause) {
      return error(fastify, reply, cause, 'Workshop timeline report');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/live-state', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      await AcademyWorkshopService.rowById(fastify, actorFrom(request), id(workshopId, 'Workshop ID'));
      return reply.send({
        data: await AcademyWorkshopLiveService.liveState(fastify, id(workshopId, 'Workshop ID'), 'STAFF'),
      });
    } catch (cause) {
      return error(fastify, reply, cause, 'Workshop live state');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/display-settings', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopLiveService.updateDisplaySettings(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        request.body as UpdateAcademyWorkshopDisplaySettingsRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật QR trên màn hình Leaderboard.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop display settings');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopLiveService.upsertQuiz(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        null,
        request.body as UpsertAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo game.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Create workshop quiz');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/quizzes/:quizId', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.upsertQuiz(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(quizId, 'Quiz ID'),
        request.body as UpsertAcademyWorkshopQuizRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật game.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop quiz');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/:quizId/clone', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.cloneQuizToDraft(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(quizId, 'Quiz ID'),
        (request.body || {}) as CloneAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo bản chỉnh sửa.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Clone workshop quiz');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/:quizId/save-template', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.saveQuizAsTemplate(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(quizId, 'Quiz ID'),
        (request.body || {}) as CloneAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã lưu game thành mẫu dùng chung.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Save workshop quiz as template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/from-template/:templateId', async (request, reply) => {
    try {
      const { workshopId, templateId } = request.params as { workshopId: string; templateId: string };
      const data = await AcademyWorkshopLiveService.applyQuizTemplate(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(templateId, 'Template ID'),
        (request.body || {}) as CloneAcademyWorkshopQuizRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo game độc lập từ mẫu.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Apply workshop quiz template');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/quizzes/:quizId/questions', async (request, reply) => {
    try {
      const { workshopId, quizId } = request.params as { workshopId: string; quizId: string };
      const data = await AcademyWorkshopLiveService.upsertQuestion(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(quizId, 'Quiz ID'),
        null,
        request.body as UpsertAcademyWorkshopQuestionRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã thêm câu hỏi.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Create workshop question');
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
        id(workshopId, 'Workshop ID'),
        id(quizId, 'Quiz ID'),
        id(questionId, 'Question ID'),
        request.body as UpsertAcademyWorkshopQuestionRequest
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật câu hỏi.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop question');
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
          id(workshopId, 'Workshop ID'),
          id(quizId, 'Quiz ID'),
          id(questionId, 'Question ID')
        );
        return reply.send({ success: true, data, message: 'Đã xóa câu hỏi.' });
      } catch (cause) {
        return error(fastify, reply, cause, 'Delete workshop question');
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
        id(workshopId, 'Workshop ID'),
        id(quizId, 'Quiz ID'),
        body.action,
        body.questionId
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật game live.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Workshop game command');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/rewards', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send({
        data: await AcademyWorkshopLiveService.listRewards(fastify, actorFrom(request), id(workshopId, 'Workshop ID')),
      });
    } catch (cause) {
      return error(fastify, reply, cause, 'List workshop rewards');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/rewards/:rewardId', async (request, reply) => {
    try {
      const { workshopId, rewardId } = request.params as { workshopId: string; rewardId: string };
      const body = request.body as UpdateAcademyWorkshopRewardRequest;
      const data = await AcademyWorkshopLiveService.updateReward(
        fastify,
        actorFrom(request),
        id(workshopId, 'Workshop ID'),
        id(rewardId, 'Reward ID'),
        body.status,
        body.note
      );
      return reply.send({ success: true, data, message: 'Đã chốt trạng thái phần thưởng.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop reward');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/bonuses', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      await AcademyWorkshopService.rowById(fastify, actorFrom(request), id(workshopId, 'Workshop ID'));
      return reply.send({ data: await AcademyWorkshopBonusService.list(fastify, id(workshopId, 'Workshop ID')) });
    } catch (cause) {
      return error(fastify, reply, cause, 'List workshop bonuses');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/bonuses/:bonusId', async (request, reply) => {
    try {
      const { workshopId, bonusId } = request.params as { workshopId: string; bonusId: string };
      await AcademyWorkshopService.rowById(fastify, actorFrom(request), id(workshopId, 'Workshop ID'));
      const body = request.body as UpdateAcademyInstructorBonusRequest;
      const data = await AcademyWorkshopBonusService.update(
        fastify,
        actorFrom(request),
        id(bonusId, 'Bonus ID'),
        body.status,
        body.note
      );
      if (data.workshopId !== id(workshopId, 'Workshop ID'))
        throw new AcademySalesError('Khoản thưởng không thuộc workshop.', 404);
      return reply.send({ success: true, data, message: 'Đã chốt thưởng giáo viên.' });
    } catch (cause) {
      return error(fastify, reply, cause, 'Update workshop bonus');
    }
  });
}
