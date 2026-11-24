import type { FastifyInstance } from 'fastify';
import { triggerImmediateAnalysis } from './analyzer.js';
import { parseOmicallWebhookPayload, type ParsedOmicallWebhookPayload } from './webhook-parser.js';

export interface UpsertOmicallCdrResult {
  logId: number;
  callLogId: number | null;
  analysisStatus: string;
  created: boolean;
}

export interface UpsertOmicallCdrOptions {
  /**
   * When false (e.g. historical backfill / manual sync), answered calls with
   * recordings are saved as `SKIPPED` instead of `PENDING` so batch imports do
   * not burn Gemini quota automatically; operators can click "Phân tích AI"
   * per call instead. Defaults to `true` for live webhooks.
   */
  autoAnalyze?: boolean;
  /**
   * When true, sets initial `createdAt` to `timeStartCall` on record creation
   * so historical backfills sort chronologically alongside live calls.
   */
  preserveTimestampOnCreate?: boolean;
}

/**
 * Resolves and persists a normalized OmiCall CDR payload (used by both live
 * webhook ingestion and historical CDR sync/import).
 */
export async function upsertOmicallCdrRecord(
  fastify: FastifyInstance,
  parsed: ParsedOmicallWebhookPayload,
  options: UpsertOmicallCdrOptions = {}
): Promise<UpsertOmicallCdrResult> {
  const autoAnalyze = options.autoAnalyze !== false;
  const preserveTimestamp = options.preserveTimestampOnCreate === true;

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
  } = parsed;

  const cleanPhone = customerPhone.replace(/\D/g, '');
  const phoneSuffix = cleanPhone.length > 9 ? cleanPhone.substring(cleanPhone.length - 9) : cleanPhone;

  const [extensionConfigs, contact, existingCallLog, existingOmicallLog] = await Promise.all([
    extensionToMatch
      ? fastify.prisma.crm.crmOmicallConfig.findMany({
          where: { extension: extensionToMatch },
          orderBy: { id: 'asc' },
          select: { staffId: true },
        })
      : Promise.resolve([]),
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
      select: { id: true, staffId: true },
    }),
    fastify.prisma.crm.crmOmicallLog.findUnique({
      where: { callUuid },
      select: { id: true, analysisStatus: true, recordingUrl: true, staffId: true },
    }),
  ]);

  const extensionStaffIds = extensionConfigs.map((c) => c.staffId);
  const legacyUserId = contact?.user_id ?? null;

  let callLogId: number | null = existingCallLog?.id ?? null;
  let staffId: number | null = existingCallLog?.staffId ?? existingOmicallLog?.staffId ?? extensionStaffIds[0] ?? null;

  // If no explicit call log matched callUuid yet, try +/- 10 min match on legacyUserId
  // preferring staff IDs mapped to the dialed extension (fixes shared extension 110).
  if (!callLogId && legacyUserId && extensionStaffIds.length > 0) {
    const callTime = timeStartCall || new Date();
    const tenMinutesAgo = new Date(callTime.getTime() - 10 * 60 * 1000);
    const tenMinutesAfter = new Date(callTime.getTime() + 10 * 60 * 1000);

    const matchedCallLog = await fastify.prisma.crm.crmCallLog.findFirst({
      where: {
        legacyUserId,
        staffId: { in: extensionStaffIds },
        durationSec: null,
        createdAt: {
          gte: tenMinutesAgo,
          lte: tenMinutesAfter,
        },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, staffId: true },
    });

    if (matchedCallLog) {
      callLogId = matchedCallLog.id;
      staffId = matchedCallLog.staffId;
    }
  }

  let initialAnalysisStatus = 'SKIPPED';
  if (autoAnalyze) {
    if (status !== 'ANSWER') {
      initialAnalysisStatus = 'SKIPPED';
    } else if (!recordingUrl) {
      initialAnalysisStatus = 'WAITING_RECORDING';
    } else {
      initialAnalysisStatus = 'PENDING';
    }
  }

  const effectiveRecordingUrl = recordingUrl || existingOmicallLog?.recordingUrl || null;
  let updateAnalysisFields: { analysisStatus?: string; analysisRetryCount?: number } = {};
  if (
    autoAnalyze &&
    existingOmicallLog &&
    existingOmicallLog.analysisStatus !== 'PROCESSING' &&
    existingOmicallLog.analysisStatus !== 'DONE'
  ) {
    if (
      (existingOmicallLog.analysisStatus === 'WAITING_RECORDING' || existingOmicallLog.analysisStatus === 'SKIPPED') &&
      status === 'ANSWER' &&
      effectiveRecordingUrl
    ) {
      updateAnalysisFields = { analysisStatus: 'PENDING', analysisRetryCount: 0 };
    } else if (existingOmicallLog.analysisStatus === 'SKIPPED' && status === 'ANSWER' && !effectiveRecordingUrl) {
      updateAnalysisFields = { analysisStatus: 'WAITING_RECORDING' };
    }
  }

  const created = !existingOmicallLog;
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
      ...(staffId ? { staffId } : {}),
      ...(legacyUserId ? { legacyUserId } : {}),
      ...(callLogId ? { callLogId } : {}),
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
      analysisStatus: initialAnalysisStatus,
      ...(preserveTimestamp && timeStartCall && timeStartCall.getUTCFullYear() >= 2020
        ? { createdAt: timeStartCall }
        : {}),
    },
    select: { id: true, callLogId: true, analysisStatus: true },
  });

  if (log.callLogId) {
    const syncSec = billSec > 0 ? billSec : duration;
    await fastify.prisma.crm.crmCallLog
      .update({
        where: { id: log.callLogId },
        data: {
          durationSec: syncSec,
          callUuid,
        },
      })
      .catch((err) => {
        fastify.log.error(err, `Failed to update durationSec for CallLog ${log.callLogId}`);
      });
  }

  if (autoAnalyze && log.analysisStatus === 'PENDING') {
    triggerImmediateAnalysis(fastify, log.id);
  }

  return {
    logId: log.id,
    callLogId: log.callLogId,
    analysisStatus: log.analysisStatus,
    created,
  };
}

/**
 * Batch-upserts raw OmiCall CDR items (from OmiCall API sync or Portal export).
 */
export async function upsertOmicallCdrBatch(
  fastify: FastifyInstance,
  rawItems: SafeAny[],
  options: UpsertOmicallCdrOptions = {}
): Promise<{ imported: number; updated: number; withRecording: number; skippedInvalid: number }> {
  let imported = 0;
  let updated = 0;
  let withRecording = 0;
  let skippedInvalid = 0;

  for (const item of rawItems) {
    const parsed = parseOmicallWebhookPayload(item);
    if (!parsed.callUuid) {
      skippedInvalid++;
      continue;
    }

    const res = await upsertOmicallCdrRecord(fastify, parsed, {
      autoAnalyze: options.autoAnalyze ?? false,
      preserveTimestampOnCreate: options.preserveTimestampOnCreate ?? true,
    });
    if (res.created) imported++;
    else updated++;
    if (parsed.recordingUrl) withRecording++;
  }

  return { imported, updated, withRecording, skippedInvalid };
}
