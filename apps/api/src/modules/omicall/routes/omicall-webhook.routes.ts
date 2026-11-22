import type { FastifyInstance } from 'fastify';
import { triggerImmediateAnalysis } from '../analyzer.js';

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

    // 2. Parse payload
    const callUuid = body.call_uuid || body.callUuid;
    const direction = body.direction; // 'outbound' | 'inbound'
    const status = body.status; // 'ANSWER' | 'NOANSWER' | 'BUSY' | 'CANCEL'
    const sourceNumber = body.source_number || body.sourceNumber;
    const destinationNumber = body.destination_number || body.destinationNumber;
    const duration = body.duration !== undefined ? Number(body.duration) : 0;
    const billSec =
      body.bill_sec !== undefined ? Number(body.bill_sec) : body.billSec !== undefined ? Number(body.billSec) : 0;
    const recordingUrl = body.recording_url || body.recordingUrl || null;
    const timeStartCall =
      body.time_start_call || body.timeStartCall ? new Date(body.time_start_call || body.timeStartCall) : null;
    const timeEndCall =
      body.time_end_call || body.timeEndCall ? new Date(body.time_end_call || body.timeEndCall) : null;

    if (!callUuid) {
      return reply.status(400).send({ error: 'Bad Request', message: 'callUuid/call_uuid is required' });
    }

    try {
      // 3. Match extension to staffId via CrmOmicallConfig
      const extensionToMatch = direction === 'outbound' ? sourceNumber : destinationNumber;
      const customerPhone = direction === 'outbound' ? destinationNumber : sourceNumber;
      const cleanPhone = customerPhone ? String(customerPhone).replace(/\D/g, '') : '';
      const phoneSuffix = cleanPhone.length > 9 ? cleanPhone.substring(cleanPhone.length - 9) : cleanPhone;

      // These lookups are independent. Keeping them concurrent shortens the
      // webhook critical path while retaining the same matching precedence.
      const [config, contact, existingCallLog] = await Promise.all([
        extensionToMatch
          ? fastify.prisma.crm.crmOmicallConfig.findFirst({
              where: { extension: String(extensionToMatch) },
              select: { staffId: true },
            })
          : Promise.resolve(null),
        customerPhone
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
      ]);
      const staffId = config?.staffId ?? null;
      const legacyUserId = contact?.user_id ?? null;

      // 5. Determine initial analysis status
      // If call was not answered, skip AI analysis
      // If answered and recording exists -> PENDING
      // If answered and no recording -> WAITING_RECORDING
      let analysisStatus = 'PENDING';
      if (status !== 'ANSWER') {
        analysisStatus = 'SKIPPED';
      } else if (!recordingUrl) {
        analysisStatus = 'WAITING_RECORDING';
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
          direction: direction || 'outbound',
          status: status || 'NOANSWER',
          sourceNumber: sourceNumber ? String(sourceNumber) : '',
          destinationNumber: destinationNumber ? String(destinationNumber) : '',
          duration,
          billSec,
          recordingUrl,
          timeStartCall,
          timeEndCall,
          staffId,
          legacyUserId,
          callLogId,
          // Do NOT overwrite analysisStatus on update.
          // If OmiCall re-sends webhook for an already-processed record,
          // we keep the existing state (PROCESSING/DONE/FAILED).
          // Only update recordingUrl if we got a new one and record is still waiting.
          ...(recordingUrl && {
            recordingUrl,
          }),
        },
        create: {
          callUuid,
          direction: direction || 'outbound',
          status: status || 'NOANSWER',
          sourceNumber: sourceNumber ? String(sourceNumber) : '',
          destinationNumber: destinationNumber ? String(destinationNumber) : '',
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
