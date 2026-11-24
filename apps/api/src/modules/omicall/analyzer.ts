import { FastifyInstance } from 'fastify';
import axios from 'axios';

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

async function fetchRecordingUrl(fastify: FastifyInstance, callUuid: string): Promise<string | null> {
  const apiKey = process.env.OMICALL_API_KEY;
  if (!apiKey || (apiKey === 'mock_omicall_api_key_for_dev' && process.env.NODE_ENV !== 'production')) {
    fastify.log.warn('[DEV MODE] Using mock recording URL for laughter detection testing');
    return `https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.wav`;
  }

  const apiBaseUrl = (process.env.OMICALL_API_BASE_URL || 'https://public-v1-stg.omicall.com').replace(/\/+$/, '');
  const now = Date.now();
  const fromDate = now - SEARCH_LOOKBACK_MS;
  const toDate = now + 60_000;

  try {
    // 1. Primary: OmiCall v3 call-transaction search with x-api-key
    const v3Res = await axios.post(
      `${apiBaseUrl}/api/v3/call-transaction/search?page=1&size=1`,
      {
        filter: {
          transactionIds: [callUuid],
          fromDate,
          toDate,
        },
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        timeout: 10_000,
        validateStatus: () => true,
      }
    );

    if (v3Res.status >= 200 && v3Res.status < 300) {
      const items = v3Res.data?.items || v3Res.data?.payload?.items || [];
      const recUrl = Array.isArray(items) ? extractRecordingUrlFromItem(items[0]) : null;
      if (recUrl) return recUrl;
    }

    // 2. Fallback: exchange apiKey for Bearer access_token and query v2 search
    const authRes = await axios.get(`${apiBaseUrl}/api/auth?apiKey=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: 'application/json' },
      timeout: 10_000,
      validateStatus: () => true,
    });
    const accessToken = authRes.data?.payload?.access_token || authRes.data?.access_token;
    if (!accessToken) {
      return null;
    }

    const v2Res = await axios.post(
      `${apiBaseUrl}/api/v2/callTransaction/search?page=1&size=1`,
      {
        transactionIds: [callUuid],
        fromDate,
        toDate,
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10_000,
        validateStatus: () => true,
      }
    );

    if (v2Res.status >= 200 && v2Res.status < 300) {
      const items = v2Res.data?.payload?.items || v2Res.data?.items || [];
      return Array.isArray(items) ? extractRecordingUrlFromItem(items[0]) : null;
    }

    return null;
  } catch (error) {
    fastify.log.error(error, `Error fetching OmiCall recording URL for ${callUuid}`);
    return null;
  }
}

/**
 * Downloads audio recording, calls Gemini API to extract laughter details, CSAT,
 * and transcription, then calculates the Happy Call status.
 */
export async function analyzeLogRecord(fastify: FastifyInstance, log: SafeAny) {
  if (!log.recordingUrl) {
    throw new Error('Recording URL is missing');
  }

  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not defined');
  }

  // 1. Download audio file
  const response = await axios.get(log.recordingUrl, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  const audioBuffer = Buffer.from(response.data);

  // Payload check: max 20MB limit for Gemini inlineData
  const fileSizeMb = audioBuffer.length / (1024 * 1024);
  if (fileSizeMb > 20) {
    throw new Error(`File size is too large for Gemini API inline data (${fileSizeMb.toFixed(2)}MB). Limit is 20MB.`);
  }

  const base64Audio = audioBuffer.toString('base64');
  const contentType = typeof response.headers?.['content-type'] === 'string' ? response.headers['content-type'] : null;
  const mimeType = detectAudioMimeType(log.recordingUrl, contentType, audioBuffer);

  // 2. Prepare Gemini Prompt
  const promptText = `Bạn là chuyên gia phân tích cuộc gọi bán hàng và chăm sóc khách hàng (Telesales QA). 
Hãy nghe kỹ file ghi âm cuộc gọi đính kèm và phân tích theo các yêu cầu sau:

1. Phân biệt giọng nói của Nhân viên (NV) và Khách hàng (KH).
   - Thông thường, người chủ động chào hỏi lịch sự và giới thiệu sản phẩm/dịch vụ là Nhân viên (NV).
   - Người nghe máy, đặt câu hỏi hoặc trao đổi tự nhiên là Khách hàng (KH).
2. Đếm số lần cười của Nhân viên (NV) -> laugh_count_agent.
3. Đếm số lần cười của Khách hàng (KH) -> laugh_count_customer.
4. Tổng số lần cười là laugh_count (laugh_count = laugh_count_agent + laugh_count_customer).
5. Ghi lại các mốc thời gian cười (laugh_timestamps) với mỗi phần tử gồm:
   - start (thời điểm bắt đầu cười, tính bằng giây)
   - end (thời điểm kết thúc cười, tính bằng giây)
   - speaker ("agent" hoặc "customer")
   - confidence (độ tin cậy của thuật toán phân tích, giá trị số thực từ 0.0 đến 1.0)
6. Đánh giá Điểm hài lòng của khách hàng (customer_satisfaction_score) từ 1 (rất tệ/tức giận) đến 5 (rất hài lòng/vui vẻ).
7. Xác định Thái độ/Cảm xúc chính của khách hàng (customer_sentiment): 
   - 'HAPPY' (rất vui vẻ)
   - 'SATISFIED' (hài lòng/đồng ý)
   - 'NEUTRAL' (bình thường, trung lập)
   - 'FRUSTRATED' (thất vọng/sốt ruột)
   - 'ANGRY' (tức giận)
8. Nhận xét phân tích hài lòng (satisfaction_analysis): Viết một đoạn nhận xét ngắn bằng tiếng Việt tóm tắt lý do tại sao đánh giá điểm số và cảm xúc đó (dựa trên tông giọng, từ ngữ, tiếng thở dài hoặc cười lớn của khách hàng).
9. Tạo Bản dịch cuộc hội thoại (transcript) từng dòng rõ ràng theo định dạng:
   [MM:SS] NV: [nội dung nhân viên nói]
   [MM:SS] KH: [nội dung khách hàng nói]

Hãy trả về kết quả chính xác theo cấu trúc JSON định nghĩa sẵn.`;

  // 3. Call Gemini REST API
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
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
      responseSchema: {
        type: 'OBJECT',
        properties: {
          laugh_count: { type: 'INTEGER' },
          laugh_count_agent: { type: 'INTEGER' },
          laugh_count_customer: { type: 'INTEGER' },
          laugh_timestamps: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                start: { type: 'NUMBER' },
                end: { type: 'NUMBER' },
                speaker: { type: 'STRING', enum: ['agent', 'customer'] },
                confidence: { type: 'NUMBER' },
              },
              required: ['start', 'end', 'speaker', 'confidence'],
            },
          },
          customer_satisfaction_score: { type: 'INTEGER' },
          customer_sentiment: { type: 'STRING', enum: ['HAPPY', 'SATISFIED', 'NEUTRAL', 'FRUSTRATED', 'ANGRY'] },
          satisfaction_analysis: { type: 'STRING' },
          transcript: { type: 'STRING' },
        },
        required: [
          'laugh_count',
          'laugh_count_agent',
          'laugh_count_customer',
          'laugh_timestamps',
          'customer_satisfaction_score',
          'customer_sentiment',
          'satisfaction_analysis',
          'transcript',
        ],
      },
    },
  };

  const geminiResponse = await axios.post(geminiUrl, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60_000, // 1 minute timeout for API call
  });

  const rawText = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini API returned an empty response');
  }

  const aiResult = JSON.parse(rawText.trim());

  // 4. Calculate Happy Call Status based on updated business rules (Customer Laughter Focus)
  let happyCallStatus = 'NONE';
  let happyCallReason: string | null = null;
  const customerLaughed = (aiResult.laugh_count_customer || 0) > 0;

  if (log.duration >= 180) {
    happyCallStatus = 'APPROVED';
    happyCallReason = 'auto_180s';
  } else if (log.duration >= 30 && customerLaughed) {
    happyCallStatus = 'APPROVED';
    happyCallReason = 'auto_laughter_30s';
  } else if (log.duration < 30 && customerLaughed) {
    happyCallStatus = 'PENDING_APPROVAL';
    happyCallReason = null;
  }

  // 5. Update OmiCall Log in DB
  await fastify.prisma.crm.crmOmicallLog.update({
    where: { id: log.id },
    data: {
      laughCount: aiResult.laugh_count,
      laughCountAgent: aiResult.laugh_count_agent,
      laughCountCustomer: aiResult.laugh_count_customer,
      laughTimestamps: JSON.stringify(aiResult.laugh_timestamps),
      transcript: aiResult.transcript || null,
      customerSatisfactionScore: aiResult.customer_satisfaction_score,
      customerSentiment: aiResult.customer_sentiment,
      satisfactionAnalysis: aiResult.satisfaction_analysis,
      happyCallStatus,
      happyCallReason,
      analysisStatus: 'DONE',
      analysisError: null,
    },
  });
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
  // Fire-and-forget background task
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
        select: { id: true, recordingUrl: true, duration: true },
      });
      if (!log) {
        throw new Error(`Log record not found for ID: ${logId}`);
      }
      await analyzeLogRecord(fastify, log);
      fastify.log.info(`[ImmediateAnalysis] Completed successfully for log ID: ${logId}`);
    } catch (err: SafeAny) {
      fastify.log.error(err, `[ImmediateAnalysis] Failed for log ID: ${logId}`);

      // A failed DB claim never started analysis and must not consume a retry.
      if (!claimed) return;

      // Update retry states
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

/**
 * Poller function to process WAITING_RECORDING and PENDING logs in batches.
 */
async function processNextBatch(fastify: FastifyInstance) {
  if (isProcessing) return;
  isProcessing = true;

  try {
    // 1. Process WAITING_RECORDING -> fetch recording URLs from OmiCall API
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
          // Immediately trigger analysis after finding the URL
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

    // 2. Process PENDING -> retry Gemini analysis (in case background task failed due to API rate limit/network)
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

// Initialize Poller
export function startRecordingAnalyzer(fastify: FastifyInstance) {
  // Polling every 60 seconds
  const timerId = setInterval(() => processNextBatch(fastify), 60_000);

  fastify.addHook('onClose', async () => {
    clearInterval(timerId);
    fastify.log.info('Recording analyzer stopped');
  });

  fastify.log.info('Recording analyzer started (polling every 60s)');
}
