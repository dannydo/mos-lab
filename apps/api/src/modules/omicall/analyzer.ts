import { FastifyInstance } from 'fastify';
import axios from 'axios';
import {
  evaluateHappyCallResult,
  getAnalyzerGeminiModels,
  OMICALL_ANALYSIS_PROMPT,
  OMICALL_ANALYSIS_RESPONSE_SCHEMA,
  QA_CHECKLIST_KEYS,
  type EvaluatedHappyCallOutcome,
  type OmCallType,
  type QaChecklistKey,
} from './happy-call-evaluator.js';
import { generateStaffCoachingFeedback, requestGeminiWithFallback } from './omicall-coaching.service.js';

export {
  evaluateHappyCallResult,
  getAnalyzerGeminiModels,
  QA_CHECKLIST_KEYS,
  type EvaluatedHappyCallOutcome,
  type OmCallType,
  type QaChecklistKey,
};

const MAX_RETRIES = 3;
const _AI_TIMEOUT_MS = 180_000; // 3 minutes
const SEARCH_LOOKBACK_MS = 85 * 24 * 60 * 60 * 1000;
let isProcessing = false; // Simple poller mutex

/**
 * Detects audio MIME type from magic bytes first, then Content-Type, then URL extension.
 */
export function detectAudioMimeType(url: string, contentType?: string | null, audioBuffer?: Buffer): string {
  if (audioBuffer && audioBuffer.length >= 4) {
    const magic = audioBuffer.subarray(0, 4).toString('ascii');
    if (magic === 'RIFF') return 'audio/wav';
    if (magic === 'OggS') return 'audio/ogg';
    if (magic.startsWith('ID3') || (audioBuffer[0] === 0xff && (audioBuffer[1] & 0xe0) === 0xe0)) {
      return 'audio/mp3';
    }
    if (audioBuffer.length >= 8 && audioBuffer.subarray(4, 8).toString('ascii') === 'ftyp') {
      return 'audio/mp4';
    }
  }

  const normalizedCt = (contentType || '').toLowerCase();
  if (normalizedCt.includes('wav')) return 'audio/wav';
  if (normalizedCt.includes('ogg')) return 'audio/ogg';
  if (normalizedCt.includes('mp4') || normalizedCt.includes('m4a')) return 'audio/mp4';
  if (normalizedCt.includes('mpeg') || normalizedCt.includes('mp3')) return 'audio/mp3';

  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.wav')) return 'audio/wav';
  if (cleanUrl.endsWith('.ogg')) return 'audio/ogg';
  if (cleanUrl.endsWith('.m4a') || cleanUrl.endsWith('.mp4')) return 'audio/mp4';
  return 'audio/mp3';
}

function extractRecordingUrlFromItem(item: SafeAny): string | null {
  if (!item || typeof item !== 'object') return null;
  const candidate = item.recording_file_url || item.recording_file || item.recording_url || item.recordingUrl;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function getOmicallApiConfig(): { apiKey: string | null; apiBaseUrl: string } {
  const apiKey = (process.env.OMICALL_API_KEY || '').trim() || null;
  const apiBaseUrl = (process.env.OMICALL_API_BASE_URL || 'https://public-v1-stg.omicall.com').replace(/\/+$/, '');
  return { apiKey, apiBaseUrl };
}

async function exchangeOmicallAccessToken(
  apiBaseUrl: string,
  apiKey: string
): Promise<{
  accessToken: string | null;
  message?: string;
}> {
  const authRes = await axios.get(`${apiBaseUrl}/api/auth?apiKey=${encodeURIComponent(apiKey)}`, {
    headers: { Accept: 'application/json' },
    timeout: 10_000,
    validateStatus: () => true,
  });
  const accessToken = authRes.data?.payload?.access_token || authRes.data?.access_token || null;
  return {
    accessToken,
    message: authRes.data?.message ? String(authRes.data.message) : undefined,
  };
}

/**
 * Fetches recent OmiCall CDR records via OmiCall v3 / v2 call-transaction APIs.
 */
export async function fetchRecentOmiCallCdrs(params: {
  fromDate: number;
  toDate: number;
  page?: number;
  size?: number;
  transactionIds?: string[];
}): Promise<SafeAny[]> {
  const { apiKey, apiBaseUrl } = getOmicallApiConfig();
  if (!apiKey || apiKey === 'mock_omicall_api_key_for_dev') {
    throw new Error('OMICALL_API_KEY chưa được cấu hình hoặc đang là mock key.');
  }

  const page = params.page ?? 1;
  const size = params.size ?? 50;
  const filter: Record<string, unknown> = {
    fromDate: params.fromDate,
    toDate: params.toDate,
  };
  if (params.transactionIds && params.transactionIds.length > 0) {
    filter.transactionIds = params.transactionIds;
  }

  const v3Res = await axios.post(
    `${apiBaseUrl}/api/v3/call-transaction/search?page=${page}&size=${size}`,
    { filter },
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      timeout: 15_000,
      validateStatus: () => true,
    }
  );

  if (v3Res.status >= 200 && v3Res.status < 300) {
    const items = v3Res.data?.items || v3Res.data?.payload?.items || [];
    return Array.isArray(items) ? items : [];
  }

  const auth = await exchangeOmicallAccessToken(apiBaseUrl, apiKey);
  if (!auth.accessToken) {
    throw new Error(
      `OmiCall API Key hiện không hợp lệ (${auth.message || `HTTP ${v3Res.status}`}). Cần cấp lại API Key mới trên OmiCall Portal.`
    );
  }

  const v2Res = await axios.post(`${apiBaseUrl}/api/v2/callTransaction/search?page=${page}&size=${size}`, filter, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.accessToken}`,
    },
    timeout: 15_000,
    validateStatus: () => true,
  });

  if (v2Res.status >= 200 && v2Res.status < 300) {
    const items = v2Res.data?.payload?.items || v2Res.data?.items || [];
    return Array.isArray(items) ? items : [];
  }

  throw new Error(`Không thể truy vấn CDR từ OmiCall (HTTP ${v2Res.status}).`);
}

export async function fetchRecordingUrl(fastify: FastifyInstance, callUuid: string): Promise<string | null> {
  const { apiKey } = getOmicallApiConfig();
  if (!apiKey || (apiKey === 'mock_omicall_api_key_for_dev' && process.env.NODE_ENV !== 'production')) {
    fastify.log.warn('[DEV MODE] Using mock recording URL for laughter detection testing');
    return `https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.wav`;
  }

  try {
    const now = Date.now();
    const items = await fetchRecentOmiCallCdrs({
      transactionIds: [callUuid],
      fromDate: now - SEARCH_LOOKBACK_MS,
      toDate: now + 60_000,
      page: 1,
      size: 1,
    });
    return items.length > 0 ? extractRecordingUrlFromItem(items[0]) : null;
  } catch (error) {
    fastify.log.error(error, `Error fetching OmiCall recording URL for ${callUuid}`);
    return null;
  }
}

/**
 * Downloads audio recording, calls Gemini API (with 429 model fallback) to extract
 * laughter details, CSAT, CSKH/Telesales QA checklist & complaint alerts, then calculates Happy Call status.
 */
export async function analyzeLogRecord(fastify: FastifyInstance, log: SafeAny) {
  if (!log.recordingUrl) {
    throw new Error('Recording URL is missing');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not defined');
  }

  const response = await axios.get(log.recordingUrl, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  const audioBuffer = Buffer.from(response.data);

  const fileSizeMb = audioBuffer.length / (1024 * 1024);
  if (fileSizeMb > 20) {
    throw new Error(`File size is too large for Gemini API inline data (${fileSizeMb.toFixed(2)}MB). Limit is 20MB.`);
  }

  const base64Audio = audioBuffer.toString('base64');
  const contentType = typeof response.headers?.['content-type'] === 'string' ? response.headers['content-type'] : null;
  const mimeType = detectAudioMimeType(log.recordingUrl, contentType, audioBuffer);

  const requestBody = {
    contents: [
      {
        parts: [
          { text: OMICALL_ANALYSIS_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: OMICALL_ANALYSIS_RESPONSE_SCHEMA,
    },
  };

  const geminiData = await requestGeminiWithFallback(fastify, geminiApiKey, requestBody, 45_000);

  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API returned an empty response');
  }

  const aiResult = JSON.parse(rawText.trim());
  const evaluated = evaluateHappyCallResult({
    duration: log.duration,
    billSec: log.billSec,
    aiResult,
    existingQaVerified: log.qaVerified,
    existingQaScore: log.qaScore,
  });

  const updated = await fastify.prisma.crm.crmOmicallLog.update({
    where: { id: log.id },
    data: {
      laughCount: aiResult.laugh_count,
      laughCountAgent: aiResult.laugh_count_agent,
      laughCountCustomer: aiResult.laugh_count_customer,
      laughTimestamps: JSON.stringify(aiResult.laugh_timestamps || []),
      transcript: aiResult.transcript || null,
      customerSatisfactionScore: aiResult.customer_satisfaction_score,
      customerSentiment: aiResult.customer_sentiment,
      satisfactionAnalysis: evaluated.satisfactionAnalysis || aiResult.satisfaction_analysis,
      happyCallStatus: evaluated.happyCallStatus,
      happyCallReason: evaluated.happyCallReason,
      ...(evaluated.shouldApplyQaSuggestions
        ? {
            qaChecklist: JSON.stringify(evaluated.qaChecklist),
            qaTags: JSON.stringify(evaluated.qaTags),
            ...(evaluated.suggestedQaScore !== null ? { qaScore: evaluated.suggestedQaScore } : {}),
          }
        : {}),
      analysisStatus: 'DONE',
      analysisError: null,
    },
  });

  if (updated?.staffSelfSatisfactionScore && !updated.staffAiCoachingFeedback) {
    void generateStaffCoachingFeedback(fastify, {
      id: updated.id,
      staffSelfSatisfactionScore: updated.staffSelfSatisfactionScore,
      staffSelfNote: updated.staffSelfNote ?? null,
      customerSatisfactionScore: updated.customerSatisfactionScore ?? null,
      customerSentiment: updated.customerSentiment ?? null,
      happyCallStatus: updated.happyCallStatus,
      satisfactionAnalysis: updated.satisfactionAnalysis ?? null,
      transcript: updated.transcript ?? null,
    }).catch((err) => {
      fastify.log.warn(err, `[Coaching] Deferred coaching generation failed for log #${updated.id}`);
    });
  }
}

/**
 * Atomically claims a pending analysis so concurrent webhook/poller workers cannot
 * submit the same recording to Gemini more than once.
 */
export async function claimPendingAnalysis(fastify: FastifyInstance, logId: number): Promise<boolean> {
  const claim = await fastify.prisma.crm.crmOmicallLog.updateMany({
    where: {
      id: logId,
      analysisStatus: 'PENDING',
      analysisRetryCount: { lt: MAX_RETRIES },
    },
    data: { analysisStatus: 'PROCESSING' },
  });

  return claim.count === 1;
}

/**
 * Instantly triggers the Gemini audio analysis asynchronously in the background.
 */
export function triggerImmediateAnalysis(fastify: FastifyInstance, logId: number) {
  void (async () => {
    let claimed = false;

    try {
      claimed = await claimPendingAnalysis(fastify, logId);
      if (!claimed) {
        fastify.log.debug(`[ImmediateAnalysis] Skipped unclaimable log ID: ${logId}`);
        return;
      }

      fastify.log.info(`[ImmediateAnalysis] Starting background analysis for log ID: ${logId}`);

      const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
        where: { id: logId },
        select: {
          id: true,
          recordingUrl: true,
          duration: true,
          billSec: true,
          qaVerified: true,
          qaScore: true,
        },
      });
      if (!log) {
        throw new Error(`Log record not found for ID: ${logId}`);
      }
      await analyzeLogRecord(fastify, log);
      fastify.log.info(`[ImmediateAnalysis] Completed successfully for log ID: ${logId}`);
    } catch (err: SafeAny) {
      fastify.log.error(err, `[ImmediateAnalysis] Failed for log ID: ${logId}`);

      if (!claimed) return;

      const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
        where: { id: logId },
        select: { analysisRetryCount: true },
      });
      const nextRetryCount = (log?.analysisRetryCount || 0) + 1;
      const finalStatus = nextRetryCount >= MAX_RETRIES ? 'FAILED' : 'PENDING';

      await fastify.prisma.crm.crmOmicallLog.update({
        where: { id: logId },
        data: {
          analysisStatus: finalStatus,
          analysisRetryCount: nextRetryCount,
          analysisError: err?.message || String(err),
        },
      });
    }
  })();
}

async function processNextBatch(fastify: FastifyInstance) {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const waiting = await fastify.prisma.crm.crmOmicallLog.findMany({
      where: {
        analysisStatus: 'WAITING_RECORDING',
        analysisRetryCount: { lt: MAX_RETRIES },
      },
      take: 3,
      select: { id: true, callUuid: true, analysisRetryCount: true },
    });

    for (const w of waiting) {
      try {
        const url = await fetchRecordingUrl(fastify, w.callUuid);
        if (url) {
          await fastify.prisma.crm.crmOmicallLog.update({
            where: { id: w.id },
            data: {
              recordingUrl: url,
              analysisStatus: 'PENDING',
              analysisRetryCount: 0,
            },
          });
          triggerImmediateAnalysis(fastify, w.id);
        } else {
          const nextCount = w.analysisRetryCount + 1;
          await fastify.prisma.crm.crmOmicallLog.update({
            where: { id: w.id },
            data: {
              analysisRetryCount: nextCount,
              ...(nextCount >= MAX_RETRIES
                ? {
                    analysisStatus: 'FAILED',
                    analysisError: 'Max retries reached while fetching recording URL from OmiCall',
                  }
                : {}),
            },
          });
        }
      } catch (err) {
        fastify.log.error(err, `Failed to fetch recording url for log ${w.id}`);
        const nextCount = w.analysisRetryCount + 1;
        await fastify.prisma.crm.crmOmicallLog.update({
          where: { id: w.id },
          data: {
            analysisRetryCount: nextCount,
            ...(nextCount >= MAX_RETRIES
              ? {
                  analysisStatus: 'FAILED',
                  analysisError: `Error fetching recording URL: ${String(err)}`,
                }
              : {}),
          },
        });
      }
    }

    const pending = await fastify.prisma.crm.crmOmicallLog.findMany({
      where: {
        analysisStatus: 'PENDING',
        analysisRetryCount: { lt: MAX_RETRIES },
        status: 'ANSWER',
        recordingUrl: { not: null },
      },
      take: 2,
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    for (const log of pending) {
      triggerImmediateAnalysis(fastify, log.id);
    }
  } catch (err) {
    fastify.log.error(err, 'Batch processing error in analyzer');
  } finally {
    isProcessing = false;
  }
}

export function startRecordingAnalyzer(fastify: FastifyInstance) {
  const timerId = setInterval(() => processNextBatch(fastify), 60_000);

  fastify.addHook('onClose', async () => {
    clearInterval(timerId);
    fastify.log.info('Recording analyzer stopped');
  });

  fastify.log.info('Recording analyzer started (polling every 60s)');
}
