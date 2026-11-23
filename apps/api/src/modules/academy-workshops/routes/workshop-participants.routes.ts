import type { FastifyInstance } from 'fastify';
import type {
  AddAcademyWorkshopParticipantsRequest,
  AssignAcademyWorkshopInstructorRequest,
  CheckInAcademyWorkshopParticipantRequest,
  ConfirmAcademyWorkshopPhotoRequest,
  CreateAcademyWorkshopPhotoUploadRequest,
  CreateAcademyWorkshopWalkInRequest,
  ListAcademyWorkshopParticipantsParams,
  RecordAcademyWorkshopFeeRequest,
  SetAcademyWorkshopPhotoConsentRequest,
  UpdateAcademyWorkshopCareRequest,
  UpdateAcademyWorkshopParticipantPricingRequest,
  UpdateAcademyWorkshopParticipantSelectionsRequest,
  WaiveAcademyWorkshopFeeRequest,
} from '@mos-lab/shared';
import { AcademyWorkshopService } from '../academy-workshop.service.js';
import { actorFrom, parseWorkshopId, sendWorkshopError } from './workshop-route-helpers.js';

export function registerWorkshopParticipantRoutes(fastify: FastifyInstance) {
  fastify.get('/academy-sales/workshops/:workshopId/participants', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      return reply.send(
        await AcademyWorkshopService.listParticipants(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          request.query as ListAcademyWorkshopParticipantsParams
        )
      );
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'List workshop participants');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const { leadIds } = request.body as AddAcademyWorkshopParticipantsRequest;
      const data = await AcademyWorkshopService.addParticipants(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        leadIds || []
      );
      return reply.status(201).send({ success: true, data, message: `Đã thêm ${data.length} học viên.` });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Add workshop participants');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/walk-ins', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const data = await AcademyWorkshopService.addWalkIn(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        request.body as CreateAcademyWorkshopWalkInRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã tạo học viên walk-in và cấp QR.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Create workshop walk-in');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/scan-check-in', async (request, reply) => {
    try {
      const { workshopId } = request.params as { workshopId: string };
      const { qrToken } = request.body as CheckInAcademyWorkshopParticipantRequest;
      const data = await AcademyWorkshopService.checkInByQr(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        String(qrToken || '')
      );
      return reply.send({ success: true, data, message: 'Check-in thành công.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Scan workshop check-in');
    }
  });

  fastify.get('/academy-sales/workshops/:workshopId/participants/:participantId', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      return reply.send({
        data: await AcademyWorkshopService.getParticipant(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(participantId, 'Participant ID')
        ),
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Get workshop participant');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/care', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const data = await AcademyWorkshopService.updateCare(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(participantId, 'Participant ID'),
        request.body as UpdateAcademyWorkshopCareRequest
      );
      return reply.send({ success: true, data, message: 'Đã ghi nhận bước chăm sóc.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update workshop care');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/participants/:participantId/selections', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const data = await AcademyWorkshopService.updateParticipantSelections(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(participantId, 'Participant ID'),
        request.body as UpdateAcademyWorkshopParticipantSelectionsRequest
      );
      return reply.send({ success: true, data, message: 'Đã lưu lựa chọn thực đơn và dụng cụ.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update participant selections');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/check-in', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const body = request.body as CheckInAcademyWorkshopParticipantRequest;
      const data = await AcademyWorkshopService.checkIn(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(participantId, 'Participant ID'),
        body.checkedIn !== false
      );
      return reply.send({
        success: true,
        data,
        message: body.checkedIn === false ? 'Đã hoàn tác check-in.' : 'Check-in thành công.',
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Workshop check-in');
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
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(participantId, 'Participant ID')
        );
        return reply.send({ success: true, data, message: 'Đã thu hồi QR cũ và cấp QR mới.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Reissue QR');
      }
    }
  );

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/fee', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const data = await AcademyWorkshopService.recordFee(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(participantId, 'Participant ID'),
        request.body as RecordAcademyWorkshopFeeRequest
      );
      return reply.status(201).send({ success: true, data, message: 'Đã ghi bút toán phí workshop.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Record workshop fee');
    }
  });

  fastify.delete(
    '/academy-sales/workshops/:workshopId/participants/:participantId/fee/:paymentId',
    async (request, reply) => {
      try {
        const { workshopId, participantId, paymentId } = request.params as {
          workshopId: string;
          participantId: string;
          paymentId: string;
        };
        const data = await AcademyWorkshopService.deleteFeePayment(
          fastify,
          actorFrom(request),
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(participantId, 'Participant ID'),
          parseWorkshopId(paymentId, 'Payment ID')
        );
        return reply.send({ success: true, data, message: 'Đã xóa bút toán phí workshop.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Delete workshop fee payment');
      }
    }
  );

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/waive-fee', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const body = request.body as WaiveAcademyWorkshopFeeRequest;
      const data = await AcademyWorkshopService.waiveFee(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(participantId, 'Participant ID'),
        body.waived,
        body.reason
      );
      return reply.send({ success: true, data, message: body.waived ? 'Đã miễn phí workshop.' : 'Đã hủy miễn phí.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Waive workshop fee');
    }
  });

  fastify.put('/academy-sales/workshops/:workshopId/participants/:participantId/pricing', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const body = request.body as UpdateAcademyWorkshopParticipantPricingRequest;
      const data = await AcademyWorkshopService.updateParticipantPricing(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(participantId, 'Participant ID'),
        body
      );
      return reply.send({ success: true, data, message: 'Đã cập nhật mức học phí áp dụng / ưu đãi.' });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Update participant pricing');
    }
  });

  fastify.post('/academy-sales/workshops/:workshopId/participants/:participantId/consent', async (request, reply) => {
    try {
      const { workshopId, participantId } = request.params as { workshopId: string; participantId: string };
      const body = request.body as SetAcademyWorkshopPhotoConsentRequest;
      const data = await AcademyWorkshopService.setConsent(
        fastify,
        actorFrom(request),
        parseWorkshopId(workshopId, 'Workshop ID'),
        parseWorkshopId(participantId, 'Participant ID'),
        body.consent,
        body.policyVersion
      );
      return reply.send({
        success: true,
        data,
        message: body.consent ? 'Đã ghi nhận consent ảnh.' : 'Đã thu hồi consent ảnh.',
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Workshop photo consent');
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
            parseWorkshopId(workshopId, 'Workshop ID'),
            parseWorkshopId(participantId, 'Participant ID'),
            request.body as CreateAcademyWorkshopPhotoUploadRequest
          ),
        });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Workshop photo upload intent');
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
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(participantId, 'Participant ID'),
          request.body as ConfirmAcademyWorkshopPhotoRequest
        );
        return reply.status(201).send({ success: true, data, message: 'Đã lưu ảnh khoảnh khắc.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Confirm workshop photo');
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
          parseWorkshopId(workshopId, 'Workshop ID'),
          parseWorkshopId(participantId, 'Participant ID'),
          body.instructorId
        );
        return reply.send({ success: true, data, message: 'Đã phân giáo viên chính.' });
      } catch (cause) {
        return sendWorkshopError(fastify, reply, cause, 'Assign workshop instructor');
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
          parseWorkshopId(workshopId, 'Workshop ID')
        ),
      });
    } catch (cause) {
      return sendWorkshopError(fastify, reply, cause, 'Talent leaderboard');
    }
  });
}
