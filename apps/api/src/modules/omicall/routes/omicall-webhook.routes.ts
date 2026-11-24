import type { FastifyInstance } from 'fastify';
import { upsertOmicallCdrRecord } from '../omicall-cdr-sync.service.js';
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
    const parsed = parseOmicallWebhookPayload(body);
    if (!parsed.callUuid) {
      return reply.status(400).send({ error: 'Bad Request', message: 'callUuid/call_uuid is required' });
    }

    try {
      const result = await upsertOmicallCdrRecord(fastify, parsed, {
        autoAnalyze: true,
        preserveTimestampOnCreate: false,
      });
      return {
        success: true,
        logId: result.logId,
        analysisStatus: result.analysisStatus,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'OmiCall webhook error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: (error as SafeAny).message });
    }
  });
}
