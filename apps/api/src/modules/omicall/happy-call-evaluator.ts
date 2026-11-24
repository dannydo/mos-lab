export const QA_CHECKLIST_KEYS = [
  'greeting',
  'needs_discovery',
  'service_intro',
  'handling_objections',
  'closing_deal',
  'friendly_professional',
  'polite_ending',
  'australian_warranty',
  'diamond_program',
] as const;

export type QaChecklistKey = (typeof QA_CHECKLIST_KEYS)[number];
export type OmCallType = 'CSKH' | 'TELESALES' | 'OTHER';

export interface EvaluatedHappyCallOutcome {
  talkSec: number;
  happyCallStatus: 'APPROVED' | 'PENDING_APPROVAL' | 'NONE';
  happyCallReason: 'auto_180s' | 'auto_laughter_30s' | null;
  callType: OmCallType;
  hasComplaint: boolean;
  satisfactionAnalysis: string;
  qaTags: string[];
  qaChecklist: Record<QaChecklistKey, boolean>;
  suggestedQaScore: number | null;
  shouldApplyQaSuggestions: boolean;
}

/**
 * Returns the deduplicated Gemini model chain so quota/rate limits (429) on the
 * primary audio analysis model fall back seamlessly to flash-lite.
 */
export function getAnalyzerGeminiModels(): string[] {
  const configured = (process.env.OMICALL_GEMINI_MODEL || '').trim();
  const candidates = [
    configured || 'gemini-2.5-flash',
    'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
  ];
  return Array.from(new Set(candidates.filter(Boolean)));
}

/**
 * Pure business-rule evaluator calculating Happy Call KPI, CSKH/Telesales tags,
 * complaint flags, and QA checklist suggestions from Gemini output + call timing.
 */
export function evaluateHappyCallResult(params: {
  duration?: number | null;
  billSec?: number | null;
  aiResult: SafeAny;
  existingQaVerified?: boolean | number | null;
  existingQaScore?: number | null;
}): EvaluatedHappyCallOutcome {
  const { duration, billSec, aiResult, existingQaVerified, existingQaScore } = params;
  const talkSec = Number(billSec) > 0 ? Number(billSec) : Math.max(0, Number(duration) || 0);
  const customerLaughed = (Number(aiResult?.laugh_count_customer) || 0) > 0;

  let happyCallStatus: 'APPROVED' | 'PENDING_APPROVAL' | 'NONE' = 'NONE';
  let happyCallReason: 'auto_180s' | 'auto_laughter_30s' | null = null;

  if (talkSec >= 180) {
    happyCallStatus = 'APPROVED';
    happyCallReason = 'auto_180s';
  } else if (talkSec >= 30 && customerLaughed) {
    happyCallStatus = 'APPROVED';
    happyCallReason = 'auto_laughter_30s';
  } else if (talkSec < 30 && customerLaughed) {
    happyCallStatus = 'PENDING_APPROVAL';
  }

  const rawCallType = String(aiResult?.call_type || '').toUpperCase();
  const callType: OmCallType = rawCallType === 'CSKH' ? 'CSKH' : rawCallType === 'TELESALES' ? 'TELESALES' : 'OTHER';
  const hasComplaint = Boolean(aiResult?.has_complaint);
  const complaintSummary = typeof aiResult?.complaint_summary === 'string' ? aiResult.complaint_summary.trim() : '';

  let satisfactionAnalysis =
    typeof aiResult?.satisfaction_analysis === 'string' ? aiResult.satisfaction_analysis.trim() : '';
  if (hasComplaint && complaintSummary && !satisfactionAnalysis.includes(complaintSummary)) {
    satisfactionAnalysis = satisfactionAnalysis
      ? `${satisfactionAnalysis}\n⚠️ Phản ánh/khiếu nại: ${complaintSummary}`
      : `⚠️ Phản ánh/khiếu nại: ${complaintSummary}`;
  }

  const tagSet = new Set<string>();
  if (callType === 'CSKH') tagSet.add('CSKH');
  else if (callType === 'TELESALES') tagSet.add('Telesales');
  if (hasComplaint) tagSet.add('Khiếu nại');
  if (Array.isArray(aiResult?.suggested_qa_tags)) {
    for (const tag of aiResult.suggested_qa_tags) {
      const clean = typeof tag === 'string' ? tag.trim() : '';
      if (clean && clean.length <= 40) tagSet.add(clean);
    }
  }

  const rawChecklist =
    aiResult?.suggested_qa_checklist && typeof aiResult.suggested_qa_checklist === 'object'
      ? aiResult.suggested_qa_checklist
      : {};
  const qaChecklist = {} as Record<QaChecklistKey, boolean>;
  for (const key of QA_CHECKLIST_KEYS) {
    qaChecklist[key] = Boolean(rawChecklist[key]);
  }

  const rawScore = Number(aiResult?.customer_satisfaction_score);
  const suggestedQaScore =
    existingQaScore != null
      ? existingQaScore
      : Number.isFinite(rawScore) && rawScore >= 1 && rawScore <= 5
        ? Math.round(rawScore)
        : null;

  return {
    talkSec,
    happyCallStatus,
    happyCallReason,
    callType,
    hasComplaint,
    satisfactionAnalysis,
    qaTags: Array.from(tagSet),
    qaChecklist,
    suggestedQaScore,
    shouldApplyQaSuggestions: !existingQaVerified,
  };
}

export const OMICALL_ANALYSIS_PROMPT = `Bạn là chuyên gia QA phân tích cuộc gọi bán hàng (Telesales) và Chăm sóc khách hàng (CSKH) của hệ thống làm đẹp Wings Lashes.
Lưu ý thuật ngữ: luôn gọi người thực hiện dịch vụ là "Chuyên Viên" hoặc "Nhân viên" (tuyệt đối không dùng từ khác).

Hãy nghe thật kỹ file ghi âm cuộc gọi đính kèm và phân tích chính xác theo từng mục:

1. Phân loại loại cuộc gọi (call_type):
   - "CSKH": cuộc gọi hỏi thăm sau khi làm dịch vụ, kiểm tra độ bền mi/chất lượng trải nghiệm, hướng dẫn chăm sóc, mời dặm/bảo hành hoặc xử lý góp ý/khiếu nại.
   - "TELESALES": cuộc gọi tư vấn dịch vụ mới, chốt lịch hẹn, mời khách qua làm lần đầu hoặc mua combo/gia hạn.
   - "OTHER": gọi nội bộ, xác nhận hành chính ngắn hoặc không thuộc 2 nhóm trên.
2. Phân biệt giọng nói Nhân viên (NV) và Khách hàng (KH).
3. Đếm số lần cười thực sự thành tiếng của NV (laugh_count_agent), của KH (laugh_count_customer), và tổng laugh_count = laugh_count_agent + laugh_count_customer.
4. Ghi lại laugh_timestamps gồm start (giây), end (giây), speaker ("agent"|"customer"), confidence (0.0-1.0).
5. Chấm Điểm hài lòng (customer_satisfaction_score từ 1 đến 5) và Thái độ/Cảm xúc chính (customer_sentiment: HAPPY | SATISFIED | NEUTRAL | FRUSTRATED | ANGRY).
   - Nếu là cuộc gọi CSKH mà khách chia sẻ vui vẻ, hài lòng với trải nghiệm và không phàn nàn, chấm đúng mức 4-5 sao theo thực tế (không trừ điểm vì không chốt sale).
6. Phát hiện phản ánh/khiếu nại (has_complaint: true/false) và tóm tắt ngắn nếu có (complaint_summary, để rỗng "" nếu không có).
7. Đề xuất tick suggested_qa_checklist (boolean cho từng tiêu chí mà nhân viên CÓ thực hiện trong cuộc gọi):
   - greeting: Chào khách & xưng danh/cảm ơn lịch sự
   - needs_discovery: Hỏi thăm tình trạng mi/trải nghiệm (nếu CSKH) hoặc hỏi nhu cầu (nếu Telesales)
   - service_intro: Giải đáp/tư vấn dịch vụ hoặc hướng dẫn chăm sóc rõ ràng
   - handling_objections: Xử lý băn khoăn/phản ánh khéo léo (true nếu xử lý tốt hoặc không phát sinh từ chối)
   - closing_deal: Chốt lịch hẹn / lịch dặm / hướng xử lý tiếp theo rõ ràng
   - friendly_professional: Thái độ ân cần, thân thiện, chuyên nghiệp
   - polite_ending: Chào kết thúc cuộc gọi lịch sự
   - australian_warranty: Có nhắc chính sách bảo hành/dặm mi miễn phí (nếu phù hợp ngữ cảnh)
   - diamond_program: Có nhắc ưu đãi/chương trình khách hàng thân thiết/kim cương (nếu phù hợp)
8. Đề xuất suggested_qa_tags từ ngữ cảnh (ví dụ trong: ["CSKH", "Telesales", "Xuất sắc", "Cần coaching", "Khiếu nại", "Để training"]).
9. Nhận xét phân tích (satisfaction_analysis) bằng tiếng Việt súc tích, nêu rõ đây là cuộc gọi CSKH hay Telesales và lý do chấm điểm.
10. Bản dịch hội thoại (transcript) từng dòng chính xác theo định dạng:
   [MM:SS] NV: [nội dung nhân viên nói]
   [MM:SS] KH: [nội dung khách hàng nói]`;

export const OMICALL_ANALYSIS_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    call_type: { type: 'STRING', enum: ['CSKH', 'TELESALES', 'OTHER'] },
    has_complaint: { type: 'BOOLEAN' },
    complaint_summary: { type: 'STRING' },
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
    suggested_qa_checklist: {
      type: 'OBJECT',
      properties: {
        greeting: { type: 'BOOLEAN' },
        needs_discovery: { type: 'BOOLEAN' },
        service_intro: { type: 'BOOLEAN' },
        handling_objections: { type: 'BOOLEAN' },
        closing_deal: { type: 'BOOLEAN' },
        friendly_professional: { type: 'BOOLEAN' },
        polite_ending: { type: 'BOOLEAN' },
        australian_warranty: { type: 'BOOLEAN' },
        diamond_program: { type: 'BOOLEAN' },
      },
      required: [...QA_CHECKLIST_KEYS],
    },
    suggested_qa_tags: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: [
    'call_type',
    'has_complaint',
    'complaint_summary',
    'laugh_count',
    'laugh_count_agent',
    'laugh_count_customer',
    'laugh_timestamps',
    'customer_satisfaction_score',
    'customer_sentiment',
    'satisfaction_analysis',
    'transcript',
    'suggested_qa_checklist',
    'suggested_qa_tags',
  ],
};
