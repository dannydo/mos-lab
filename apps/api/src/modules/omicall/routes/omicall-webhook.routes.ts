import type { FastifyInstance } from 'fastify';
import { triggerImmediateAnalysis } from '../analyzer.js';
import { isRealtimeCallEvent, parseOmicallWebhookPayload } from '../webhook-parser.js';

export function registerOmicallWebhookRoutes(fastify: FastifyInstance): void {
  // POST /api/omicall/webhook
  // Webhook receiver for OmiCall hangup events
  fastify.post('/omicall/webhook', async (request, reply) => {
    // 1. Verify webhook secret
    const webhookSecret = process.env.OMICALL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const secretHeader = request.headers['x-webhook-secret'] || request.headers['X-Webhook-Secret'];
      if (secretHeader !== webhookSecret) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid webhook secret' });
      }
    }

    const body = request.body as SafeAny;
    if (!body) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Empty body' });
    }

    // Ignore mid-call `call_event` notifications (ringing/answered/hangup leg events)
    // so only final CDR payloads create or finalize call analysis records.
    if (isRealtimeCallEvent(body)) {
      return {
        success: true,
        ignored: true,
        reason: 'realtime_call_event',
        state: body.state ?? null,
      };
    }

    // 2. Parse payload (supports both real OmiCall CDR schema and internal test payloads)
    const {
      callUuid,
      direction,
      status,
      sourceNumber,
      destinationNumber,
      extensionToMatch,
      customerPhone,
      duration,
      billSec,
      recordingUrl,
      timeStartCall,
      timeEndCall,
    } = parseOmicallWebhookPayload(body);

    if (!callUuid) {
      return reply.status(400).send({ error: 'Bad Request', message: 'callUuid/call_uuid is required' });
    }

    try {
      // 3. Match extension to staffId & customer phone suffix concurrently
      const cleanPhone = customerPhone.replace(/\D/g, '');
      const phoneSuffix = cleanPhone.length > 9 ? cleanPhone.substring(cleanPhone.length - 9) : cleanPhone;

      // These lookups are independent. Keeping them concurrent shortens the
      // webhook critical path while retaining the same matching precedence.
      const [config, contact, existingCallLog, existingOmicallLog] = await Promise.all([
        extensionToMatch
          ? fastify.prisma.crm.crmOmicallConfig.findFirst({
              where: { extension: extensionToMatch },
              select: { staffId: true },
            })
          : Promise.resolve(null),
        phoneSuffix
          ? fastify.prisma.legacy.user_contact.findFirst({
              where: {
                phone_number: { endsWith: phoneSuffix },
                is_disabled: false,
              },
              select: { user_id: true },
            })
          : Promise.resolve(null),
        fastify.prisma.crm.crmCallLog.findFirst({
          where: { callUuid },
          select: { id: true },
        }),
        fastify.prisma.crm.crmOmicallLog.findUnique({
          where: { callUuid },
          select: { id: true, analysisStatus: true, recordingUrl: true },
        }),
      ]);
      const staffId = config?.staffId ?? null;
      const legacyUserId = contact?.user_id ?? null;

      // 5. Determine initial / upgraded analysis status
      let analysisStatus = 'PENDING';
      if (status !== 'ANSWER') {
        analysisStatus = 'SKIPPED';
      } else if (!recordingUrl) {
        analysisStatus = 'WAITING_RECORDING';
      }

      const effectiveRecordingUrl = recordingUrl || existingOmicallLog?.recordingUrl || null;
      let updateAnalysisFields: { analysisStatus?: string; analysisRetryCount?: number } = {};
      if (
        existingOmicallLog &&
        existingOmicallLog.analysisStatus !== 'PROCESSING' &&
        existingOmicallLog.analysisStatus !== 'DONE'
      ) {
        if (
          (existingOmicallLog.analysisStatus === 'WAITING_RECORDING' ||
            existingOmicallLog.analysisStatus === 'SKIPPED') &&
          status === 'ANSWER' &&
          effectiveRecordingUrl
        ) {
          updateAnalysisFields = { analysisStatus: 'PENDING', analysisRetryCount: 0 };
        } else if (existingOmicallLog.analysisStatus === 'SKIPPED' && status === 'ANSWER' && !effectiveRecordingUrl) {
          updateAnalysisFields = { analysisStatus: 'WAITING_RECORDING' };
        }
      }

      // Check if call log was already created in parallel
      let callLogId: number | null = null;
      if (existingCallLog) {
        callLogId = existingCallLog.id;
      } else if (legacyUserId && staffId) {
        // So khớp thông minh thời gian thực (Real-time Smart Match):
        // Tìm cuộc gọi Telesales gần nhất (tạo trong khoảng +/- 10 phút so với cuộc gọi OmiCall)
        // của khách hàng này và booker này mà chưa có durationSec
        const callTime = timeStartCall || new Date();
        const tenMinutesAgo = new Date(callTime.getTime() - 10 * 60 * 1000);
        const tenMinutesAfter = new Date(callTime.getTime() + 10 * 60 * 1000);

        const matchedCallLog = await fastify.prisma.crm.crmCallLog.findFirst({
          where: {
            legacyUserId,
            staffId,
            durationSec: null,
            createdAt: {
              gte: tenMinutesAgo,
              lte: tenMinutesAfter,
            },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        if (matchedCallLog) {
          callLogId = matchedCallLog.id;
        }
      }

      // 6. Save OmiCall Log
      const log = await fastify.prisma.crm.crmOmicallLog.upsert({
        where: { callUuid },
        update: {
          direction,
          status,
          sourceNumber,
          destinationNumber,
          duration,
          billSec,
          timeStartCall,
          timeEndCall,
          staffId,
          legacyUserId,
          callLogId,
          ...updateAnalysisFields,
          ...(recordingUrl ? { recordingUrl } : {}),
        },
        create: {
          callUuid,
          direction,
          status,
          sourceNumber,
          destinationNumber,
          duration,
          billSec,
          recordingUrl,
          timeStartCall,
          timeEndCall,
          staffId,
          legacyUserId,
          callLogId,
          analysisStatus,
        },
        select: { id: true, callLogId: true, analysisStatus: true },
      });

      // Sync durationSec to crmCallLog if linked
      if (log.callLogId) {
        await fastify.prisma.crm.crmCallLog
          .update({
            where: { id: log.callLogId },
            data: {
              durationSec: duration,
              callUuid: callUuid,
            },
          })
          .catch((err) => {
            fastify.log.error(err, `Failed to update durationSec for CallLog ${log.callLogId}`);
          });
      }

      // Trigger immediate analysis if pending and answer
      if (log.analysisStatus === 'PENDING') {
        triggerImmediateAnalysis(fastify, log.id);
      }

      return { success: true, logId: log.id, analysisStatus: log.analysisStatus };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'OmiCall webhook error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });
}
