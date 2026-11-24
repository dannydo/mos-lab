import axios from 'axios';
import type { FastifyInstance } from 'fastify';
import { getAnalyzerGeminiModels } from './happy-call-evaluator.js';
import type { OmicallViewerScope } from './omicall-logs-query.service.js';

export interface PendingSelfAssessmentEntry {
  staffId: number;
  phoneSuffix: string;
  callUuid: string | null;
  score: number;
  note: string | null;
  ratedAt: number;
}

const SELF_ASSESSMENT_TTL_MS = 15 * 60 * 1000;
const pendingSelfAssessments: PendingSelfAssessmentEntry[] = [];

function normalizePhoneSuffix(phone: string | null | undefined): string {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length > 9 ? digits.slice(-9) : digits;
}

function pruneExpiredSelfAssessments(now = Date.now()): void {
  for (let i = pendingSelfAssessments.length - 1; i >= 0; i--) {
    if (now - pendingSelfAssessments[i].ratedAt > SELF_ASSESSMENT_TTL_MS) {
      pendingSelfAssessments.splice(i, 1);
    }
  }
}

export function clearPendingSelfAssessments(): void {
  pendingSelfAssessments.length = 0;
}

/**
 * Buffers a caller's post-call self-assessment in memory for 15 minutes when the
 * OmiCall CDR webhook has not persisted the call log yet.
 */
export function recordPendingSelfAssessment(input: {
  staffId: number;
  phone?: string | null;
  callUuid?: string | null;
  score: number;
  note?: string | null;
}): void {
  const now = Date.now();
  pruneExpiredSelfAssessments(now);

  const phoneSuffix = normalizePhoneSuffix(input.phone);
  const callUuid = input.callUuid?.trim() || null;
  if (!phoneSuffix && !callUuid) return;

  pendingSelfAssessments.push({
    staffId: input.staffId,
    phoneSuffix,
    callUuid,
    score: input.score,
    note: input.note?.trim() || null,
    ratedAt: now,
  });
}

/**
 * Pops and returns the latest matching pre-CDR self-assessment within TTL.
 */
export function consumePendingSelfAssessment(query: {
  staffId?: number | null;
  customerPhone?: string | null;
  callUuid?: string | null;
}): PendingSelfAssessmentEntry | null {
  const now = Date.now();
  pruneExpiredSelfAssessments(now);

  const uuid = query.callUuid?.trim() || null;
  const suffix = normalizePhoneSuffix(query.customerPhone);

  for (let i = pendingSelfAssessments.length - 1; i >= 0; i--) {
    const entry = pendingSelfAssessments[i];
    if (query.staffId && entry.staffId !== query.staffId) continue;

    const uuidMatches = Boolean(uuid && entry.callUuid && entry.callUuid === uuid);
    const phoneMatches = Boolean(suffix && entry.phoneSuffix && entry.phoneSuffix === suffix);
    if (uuidMatches || phoneMatches) {
      pendingSelfAssessments.splice(i, 1);
      return entry;
    }
  }

  return null;
}

export function isRetryableGeminiModelError(status: number, bodyData: SafeAny): boolean {
  if (status === 429 || status === 503 || status === 404) return true;
  const errStatus = String(bodyData?.error?.status || '').toUpperCase();
  const errMsg = String(bodyData?.error?.message || '').toUpperCase();
  return (
    errStatus === 'RESOURCE_EXHAUSTED' ||
    errStatus === 'NOT_FOUND' ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('NO LONGER AVAILABLE') ||
    errMsg.includes('NOT FOUND')
  );
}

/**
 * Shared Gemini generateContent executor with HTTP status + request timeout fallback.
 */
export async function requestGeminiWithFallback(
  fastify: FastifyInstance,
  geminiApiKey: string,
  requestBody: Record<string, unknown>,
  timeoutMs = 45_000
): Promise<SafeAny> {
  const models = getAnalyzerGeminiModels();

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
    let res: SafeAny;
    try {
      res = await axios.post(geminiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: timeoutMs,
        validateStatus: () => true,
      });
    } catch (reqErr: SafeAny) {
      const errMsg = `Gemini (${model}) request error (${reqErr?.message || String(reqErr)})`;
      if (i < models.length - 1) {
        fastify.log.warn(`[Analyzer] ${errMsg}; retrying fallback model ${models[i + 1]}`);
        continue;
      }
      throw new Error(errMsg, { cause: reqErr });
    }

    if (res.status >= 200 && res.status < 300) {
      return res.data;
    }

    const bodyMsg = res.data?.error?.message || `HTTP ${res.status}`;
    const errMsg = `Gemini (${model}): ${bodyMsg}`;
    if (isRetryableGeminiModelError(res.status, res.data) && i < models.length - 1) {
      fastify.log.warn(`[Analyzer] ${errMsg}; retrying fallback model ${models[i + 1]}`);
      continue;
    }
    throw new Error(errMsg);
  }

  throw new Error('No Gemini models configured');
}

function buildDeterministicCoachingFallback(log: {
  staffSelfSatisfactionScore: number;
  customerSatisfactionScore?: number | null;
  customerSentiment?: string | null;
  satisfactionAnalysis?: string | null;
}): string {
  const aiScore = log.customerSatisfactionScore ?? null;
  const selfScore = log.staffSelfSatisfactionScore;
  const diff = aiScore !== null ? selfScore - aiScore : 0;

  const alignmentLine =
    aiScore === null
      ? `• Bạn tự đánh giá ${selfScore}/5 sao; AI chưa có điểm đối chiếu cho cuộc gọi này.`
      : Math.abs(diff) <= 1
        ? `• Độ khớp cao: Bạn tự đánh giá ${selfScore}/5 sao, sát với đánh giá AI (${aiScore}/5 sao · thái độ ${log.customerSentiment || 'NEUTRAL'}).`
        : diff > 1
          ? `• Lưu ý chênh lệch góc nhìn: Bạn chấm ${selfScore}/5 sao nhưng AI ghi nhận ${aiScore}/5 sao (${log.customerSentiment || 'NEUTRAL'}). Hãy nghe lại đoạn phản hồi cuối của khách hàng để nhận diện tín hiệu chưa hài lòng.`
          : `• Bạn đang đánh giá khắt khe hơn thực tế (${selfScore}/5 so với AI ${aiScore}/5 sao · ${log.customerSentiment || 'NEUTRAL'}) — tín hiệu từ khách hàng tích cực hơn bạn nghĩ.`;

  const summaryLine = log.satisfactionAnalysis
    ? `• Ghi nhận từ AI: ${log.satisfactionAnalysis}`
    : '• Tiếp tục duy trì mở đầu rõ ràng, hỏi thăm nhu cầu và xác nhận lại sự hài lòng trước khi kết thúc cuộc gọi.';

  return [alignmentLine, summaryLine].join('\n');
}

export interface CoachingLogInput {
  id: number;
  staffSelfSatisfactionScore: number | null;
  staffSelfNote: string | null;
  customerSatisfactionScore: number | null;
  customerSentiment: string | null;
  happyCallStatus: string;
  satisfactionAnalysis: string | null;
  transcript: string | null;
}

/**
 * Generates AI Coaching comparison feedback contrasting the staff member's
 * self-rating against the call's real AI analysis, persisting to DB.
 */
export async function generateStaffCoachingFeedback(
  fastify: FastifyInstance,
  log: CoachingLogInput
): Promise<string | null> {
  if (!log.staffSelfSatisfactionScore) return null;

  const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
  let feedbackText = '';

  if (geminiApiKey) {
    try {
      const prompt = [
        'Bạn là chuyên gia Coaching chăm sóc khách hàng & Telesales tại Wings Lashes.',
        'Hãy viết ngắn gọn 3 gạch đầu dòng bằng tiếng Việt (tối đa 120 từ) để đối chiếu giữa CẢM NHẬN TỰ ĐÁNH GIÁ của nhân viên và PHÂN TÍCH THỰC TẾ từ băng ghi âm:',
        `- Nhân viên tự đánh giá mức độ hài lòng của khách hàng: ${log.staffSelfSatisfactionScore}/5 sao.`,
        log.staffSelfNote ? `- Ghi chú cảm nhận của nhân viên: "${log.staffSelfNote}".` : '',
        `- Điểm hài lòng AI đánh giá từ audio: ${log.customerSatisfactionScore ?? 'chưa rõ'}/5 sao (Cảm xúc: ${log.customerSentiment || 'chưa rõ'}, Happy Call: ${log.happyCallStatus}).`,
        log.satisfactionAnalysis ? `- Phân tích AI về cuộc gọi: ${log.satisfactionAnalysis}` : '',
        log.transcript ? `- Trích đoạn hội thoại:\n${String(log.transcript).slice(0, 1200)}` : '',
        'Cấu trúc 3 ý: (1) Mức độ khớp/chênh lệch giữa tự đánh giá và thực tế, (2) Điểm làm tốt cần giữ, (3) Một gợi ý cụ thể cho cuộc gọi sau. Lưu ý dùng từ "Nhân viên" hoặc "Chuyên Viên", tuyệt đối không dùng từ "thợ".',
      ]
        .filter(Boolean)
        .join('\n');

      const data = await requestGeminiWithFallback(
        fastify,
        geminiApiKey,
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        25_000
      );
      const rawText = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
      if (rawText) {
        feedbackText = rawText;
      }
    } catch (err) {
      fastify.log.warn(err, `[Coaching] Gemini coaching fallback for log #${log.id}`);
    }
  }

  if (!feedbackText) {
    feedbackText = buildDeterministicCoachingFallback({
      staffSelfSatisfactionScore: log.staffSelfSatisfactionScore,
      customerSatisfactionScore: log.customerSatisfactionScore,
      customerSentiment: log.customerSentiment,
      satisfactionAnalysis: log.satisfactionAnalysis,
    });
  }

  await fastify.prisma.crm.crmOmicallLog.update({
    where: { id: log.id },
    data: {
      staffAiCoachingFeedback: feedbackText,
      staffAiCoachingAt: new Date(),
    },
  });

  return feedbackText;
}

/**
 * Enforces blind self-assessment gating: regular staff (`!scope.isQaReviewer`)
 * cannot view AI CSAT, sentiment, transcript, Happy Call status, or QA tags until
 * they submit their own 1–5 star self-assessment (`staffSelfSatisfactionScore`).
 */
export function redactLogForViewer<T extends Record<string, SafeAny>>(
  log: T,
  scope: Pick<OmicallViewerScope, 'isQaReviewer'>
): T & { aiLockedUntilSelfRated: boolean } {
  const locked =
    !scope.isQaReviewer && (log.staffSelfSatisfactionScore === null || log.staffSelfSatisfactionScore === undefined);
  if (!locked) {
    return { ...log, aiLockedUntilSelfRated: false };
  }

  return {
    ...log,
    aiLockedUntilSelfRated: true,
    customerSatisfactionScore: null,
    customerSentiment: null,
    satisfactionAnalysis: null,
    transcript: null,
    laughCount: 0,
    laughCountAgent: 0,
    laughCountCustomer: 0,
    laughTimestamps: [],
    qaTags: [],
    qaChecklist: {},
    qaNotes: null,
    qaScore: null,
    happyCallStatus: 'LOCKED',
    happyCallReason: null,
    staffAiCoachingFeedback: null,
    callType: null,
    hasComplaint: false,
  };
}
