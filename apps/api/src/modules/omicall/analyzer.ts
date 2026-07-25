import { FastifyInstance } from 'fastify';
import axios from 'axios';

const MAX_RETRIES = 3;
const _AI_TIMEOUT_MS = 180_000; // 3 minutes
let isProcessing = false; // Simple poller mutex

async function fetchRecordingUrl(callUuid: string): Promise<string | null> {
  const apiKey = process.env.OMICALL_API_KEY;
  if (!apiKey || (apiKey === 'mock_omicall_api_key_for_dev' && process.env.NODE_ENV !== 'production')) {
    console.warn('[DEV MODE] Using mock recording URL for laughter detection testing');
    return `https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.wav`;
  }

  try {
    const response = await axios.get(
      `https://public-v1.omicall.com/api/call/transaction/detail?call_uuid=${callUuid}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 10_000,
      }
    );

    const data = response.data;
    const recordingUrl =
      data?.payload?.recording_file_url ||
      data?.payload?.recording_url ||
      data?.recording_file_url ||
      data?.recording_url;
    return recordingUrl || null;
  } catch (error) {
    console.error(`Error fetching OmiCall recording URL for ${callUuid}:`, error);
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
  const mimeType = log.recordingUrl.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mp3';

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
 * Instantly triggers the Gemini audio analysis asynchronously in the background.
 */
export function triggerImmediateAnalysis(fastify: FastifyInstance, logId: number) {
  // Fire-and-forget background task
  (async () => {
    fastify.log.info(`[ImmediateAnalysis] Starting background analysis for log ID: ${logId}`);

    // Mark PROCESSING
    await fastify.prisma.crm.crmOmicallLog.update({
      where: { id: logId },
      data: { analysisStatus: 'PROCESSING' },
    });

    try {
      const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
        where: { id: logId },
      });
      if (!log) {
        throw new Error(`Log record not found for ID: ${logId}`);
      }
      await analyzeLogRecord(fastify, log);
      fastify.log.info(`[ImmediateAnalysis] Completed successfully for log ID: ${logId}`);
    } catch (err: SafeAny) {
      fastify.log.error(err, `[ImmediateAnalysis] Failed for log ID: ${logId}`);

      // Update retry states
      const log = await fastify.prisma.crm.crmOmicallLog.findUnique({
        where: { id: logId },
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
    });

    for (const w of waiting) {
      try {
        const url = await fetchRecordingUrl(w.callUuid);
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
