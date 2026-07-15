import { FastifyInstance } from 'fastify';
import axios from 'axios';

const MAX_RETRIES = 3;
const AI_TIMEOUT_MS = 180_000; // 3 minutes
let isProcessing = false;      // Simple mutex

async function fetchRecordingUrl(callUuid: string): Promise<string | null> {
  const apiKey = process.env.OMICALL_API_KEY;
  if (!apiKey || (apiKey === 'mock_omicall_api_key_for_dev' && process.env.NODE_ENV !== 'production')) {
    // Return mock wav recording for testing (DEV only)
    console.warn('[DEV MODE] Using mock recording URL for laughter detection testing');
    return `https://github.com/rafaelreis-hotmart/Audio-Sample-files/raw/master/sample.wav`;
  }

  try {
    const response = await fetch(`https://public-v1.omicall.com/api/call/transaction/detail?call_uuid=${callUuid}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as any;
    const recordingUrl = data?.payload?.recording_file_url || data?.payload?.recording_url || data?.recording_file_url || data?.recording_url;
    return recordingUrl || null;
  } catch (error) {
    console.error(`Error fetching OmiCall recording URL for ${callUuid}:`, error);
    return null;
  }
}

async function processNextBatch(fastify: FastifyInstance) {
  if (isProcessing) return; // Skip if previous batch is still running
  isProcessing = true;

  try {
    // 1a. Process WAITING_RECORDING -> fetch recording URLs from OmiCall API
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
              analysisRetryCount: 0 // Reset retry count for AI stage
            },
          });
        } else {
          const nextCount = w.analysisRetryCount + 1;
          await fastify.prisma.crm.crmOmicallLog.update({
            where: { id: w.id },
            data: {
              analysisRetryCount: nextCount,
              ...(nextCount >= MAX_RETRIES ? {
                analysisStatus: 'FAILED',
                analysisError: 'Max retries reached while fetching recording URL from OmiCall'
              } : {})
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
            ...(nextCount >= MAX_RETRIES ? {
              analysisStatus: 'FAILED',
              analysisError: `Error fetching recording URL: ${String(err)}`
            } : {})
          },
        });
      }
    }

    // 1b. Process PENDING -> send to AI Server for laughter detection
    const pending = await fastify.prisma.crm.crmOmicallLog.findMany({
      where: {
        analysisStatus: 'PENDING',
        analysisRetryCount: { lt: MAX_RETRIES },
        status: 'ANSWER',
        recordingUrl: { not: null },
      },
      take: 5,
      orderBy: { createdAt: 'asc' },
    });

    for (const log of pending) {
      if (!log.recordingUrl) continue;

      // 2. Mark PROCESSING
      await fastify.prisma.crm.crmOmicallLog.update({
        where: { id: log.id },
        data: { analysisStatus: 'PROCESSING' },
      });

      try {
        const aiServerUrl = process.env.AI_SERVER_URL || 'http://75.119.148.205:8500';
        const aiServerApiKey = process.env.AI_SERVER_API_KEY;
        if (!aiServerApiKey) {
          throw new Error('AI_SERVER_API_KEY environment variable is required');
        }

        // 3. Call AI Server with API key auth and timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

        const staffExtension = log.direction === 'outbound' ? log.sourceNumber : log.destinationNumber;
        const customerPhone = log.direction === 'outbound' ? log.destinationNumber : log.sourceNumber;

        const response = await axios.post(`${aiServerUrl}/analyze`, {
          audio_url: log.recordingUrl,
          call_uuid: log.callUuid,
          staff_extension: staffExtension,
          customer_phone: customerPhone,
          duration_sec: log.duration,
          time_start_call: log.timeStartCall ? log.timeStartCall.toISOString() : null,
        }, {
          headers: {
            'X-API-Key': aiServerApiKey,
          },
          timeout: 300000, // 5 minutes
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const ai = response.data as {
          laugh_count: number;
          laugh_timestamps: Array<{ start: number; end: number; confidence: number }>;
          transcript?: string;
        };

        // 4. Calculate Happy Call Status according to confirmed business rules
        let happyCallStatus = 'NONE';
        let happyCallReason: string | null = null;

        if (log.duration >= 180) {
          happyCallStatus = 'APPROVED';        // Auto — >= 180s
          happyCallReason = 'auto_180s';
        } else if (log.duration >= 30 && ai.laugh_count > 0) {
          happyCallStatus = 'APPROVED';        // Auto — >= 30s + laugh
          happyCallReason = 'auto_laughter_30s';
        } else if (log.duration < 30 && ai.laugh_count > 0) {
          happyCallStatus = 'PENDING_APPROVAL'; // Requires Manager approval
          happyCallReason = null;
        }

        // 5. Update CrmOmicallLog
        await fastify.prisma.crm.crmOmicallLog.update({
          where: { id: log.id },
          data: {
            laughCount: ai.laugh_count,
            laughTimestamps: JSON.stringify(ai.laugh_timestamps),
            transcript: ai.transcript || null,
            happyCallStatus,
            happyCallReason,
            analysisStatus: 'DONE',
          },
        });
      } catch (err: any) {
        // 6. Handle errors and update status with retry count
        const nextRetryCount = log.analysisRetryCount + 1;
        const finalStatus = nextRetryCount >= MAX_RETRIES ? 'FAILED' : 'PENDING';

        await fastify.prisma.crm.crmOmicallLog.update({
          where: { id: log.id },
          data: {
            analysisStatus: finalStatus,
            analysisRetryCount: nextRetryCount,
            analysisError: err?.message || String(err),
          },
        });
        fastify.log.error(err, `AI analysis failed for ${log.callUuid} (Attempt ${nextRetryCount})`);
      }
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
  
  // Register onClose hook to clean up the interval
  fastify.addHook('onClose', async () => {
    clearInterval(timerId);
    fastify.log.info('Recording analyzer stopped');
  });

  fastify.log.info('Recording analyzer started (polling every 60s)');
}
