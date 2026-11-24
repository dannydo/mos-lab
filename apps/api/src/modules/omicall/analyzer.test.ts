import assert from 'node:assert/strict';
import test from 'node:test';
import { FastifyInstance } from 'fastify';
import {
  claimPendingAnalysis,
  detectAudioMimeType,
  evaluateHappyCallResult,
  getAnalyzerGeminiModels,
} from './analyzer.js';

interface ClaimArgs {
  where: {
    id: number;
    analysisStatus: string;
    analysisRetryCount: { lt: number };
  };
  data: { analysisStatus: string };
}

test('claimPendingAnalysis lets only one concurrent worker claim a pending log', async () => {
  let analysisStatus = 'PENDING';
  const analysisRetryCount = 0;

  const mockFastify = {
    prisma: {
      crm: {
        crmOmicallLog: {
          updateMany: async ({ where, data }: ClaimArgs) => {
            if (
              where.id === 42 &&
              analysisStatus === where.analysisStatus &&
              analysisRetryCount < where.analysisRetryCount.lt
            ) {
              analysisStatus = data.analysisStatus;
              return { count: 1 };
            }
            return { count: 0 };
          },
        },
      },
    },
  } as unknown as FastifyInstance;

  const claims = await Promise.all([claimPendingAnalysis(mockFastify, 42), claimPendingAnalysis(mockFastify, 42)]);

  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal(analysisStatus, 'PROCESSING');
});

test('detectAudioMimeType inspects magic bytes before content-type or extension', () => {
  const id3Header = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]);
  const riffHeader = Buffer.from('RIFF\x24\x00\x00\x00WAVE', 'ascii');
  const oggHeader = Buffer.from('OggS\x00\x02\x00\x00', 'ascii');

  assert.equal(
    detectAudioMimeType(
      'https://public-v1-stg.omicrm.com/third_party/recording/uc?id=abc&code=123',
      'application/octet-stream',
      id3Header
    ),
    'audio/mp3'
  );
  assert.equal(detectAudioMimeType('http://75.119.148.205:8500/test_double.wav', 'audio/mpeg', id3Header), 'audio/mp3');
  assert.equal(detectAudioMimeType('https://example.com/clip', 'application/octet-stream', riffHeader), 'audio/wav');
  assert.equal(detectAudioMimeType('https://example.com/clip', 'application/octet-stream', oggHeader), 'audio/ogg');
  assert.equal(detectAudioMimeType('https://example.com/clip', 'audio/wav'), 'audio/wav');
  assert.equal(detectAudioMimeType('https://example.com/clip.wav'), 'audio/wav');
  assert.equal(detectAudioMimeType('https://example.com/clip'), 'audio/mp3');
});

test('getAnalyzerGeminiModels provides deduplicated 429 fallback chain', () => {
  const prev = process.env.OMICALL_GEMINI_MODEL;
  try {
    delete process.env.OMICALL_GEMINI_MODEL;
    assert.deepEqual(getAnalyzerGeminiModels(), ['gemini-2.5-flash', 'gemini-2.5-flash-lite']);

    process.env.OMICALL_GEMINI_MODEL = 'gemini-2.5-flash-lite';
    assert.deepEqual(getAnalyzerGeminiModels(), ['gemini-2.5-flash-lite', 'gemini-2.5-flash']);
  } finally {
    if (prev === undefined) delete process.env.OMICALL_GEMINI_MODEL;
    else process.env.OMICALL_GEMINI_MODEL = prev;
  }
});

test('evaluateHappyCallResult applies billSec thresholds, CSKH tags, complaint alerts, and qaVerified guard', () => {
  const baseChecklist = {
    greeting: true,
    needs_discovery: true,
    service_intro: true,
    handling_objections: true,
    closing_deal: false,
    friendly_professional: true,
    polite_ending: true,
    australian_warranty: true,
    diamond_program: false,
  };

  // 1. billSec >= 30 with customer laughter => APPROVED (auto_laughter_30s)
  const approvedLaugh = evaluateHappyCallResult({
    duration: 46,
    billSec: 34,
    aiResult: {
      call_type: 'CSKH',
      has_complaint: false,
      complaint_summary: '',
      laugh_count_customer: 1,
      customer_satisfaction_score: 5,
      satisfaction_analysis: 'Khách vui vẻ hài lòng.',
      suggested_qa_checklist: baseChecklist,
      suggested_qa_tags: ['Xuất sắc'],
    },
    existingQaVerified: false,
  });
  assert.equal(approvedLaugh.happyCallStatus, 'APPROVED');
  assert.equal(approvedLaugh.happyCallReason, 'auto_laughter_30s');
  assert.equal(approvedLaugh.talkSec, 34);
  assert.equal(approvedLaugh.callType, 'CSKH');
  assert.deepEqual(approvedLaugh.qaTags, ['CSKH', 'Xuất sắc']);
  assert.equal(approvedLaugh.qaChecklist.greeting, true);
  assert.equal(approvedLaugh.qaChecklist.closing_deal, false);
  assert.equal(approvedLaugh.suggestedQaScore, 5);
  assert.equal(approvedLaugh.shouldApplyQaSuggestions, true);

  // 2. Ring-inflated duration 40s but billSec 25s + laughter => PENDING_APPROVAL (uses billSec!)
  const shortTalkLaugh = evaluateHappyCallResult({
    duration: 40,
    billSec: 25,
    aiResult: {
      call_type: 'CSKH',
      laugh_count_customer: 2,
      customer_satisfaction_score: 4,
    },
  });
  assert.equal(shortTalkLaugh.happyCallStatus, 'PENDING_APPROVAL');
  assert.equal(shortTalkLaugh.happyCallReason, null);
  assert.equal(shortTalkLaugh.talkSec, 25);

  // 3. billSec >= 180 without laughter => APPROVED (auto_180s)
  const longCall = evaluateHappyCallResult({
    duration: 195,
    billSec: 185,
    aiResult: {
      call_type: 'TELESALES',
      laugh_count_customer: 0,
      customer_satisfaction_score: 4,
    },
  });
  assert.equal(longCall.happyCallStatus, 'APPROVED');
  assert.equal(longCall.happyCallReason, 'auto_180s');
  assert.deepEqual(longCall.qaTags, ['Telesales']);

  // 4. CSKH 45s HAPPY without laughter => NONE for Happy Call KPI, still gets CSKH/complaint QA tags
  const cskhComplaint = evaluateHappyCallResult({
    duration: 50,
    billSec: 45,
    aiResult: {
      call_type: 'CSKH',
      has_complaint: true,
      complaint_summary: 'Khách báo mi bị rụng nhanh sau 4 ngày',
      laugh_count_customer: 0,
      customer_satisfaction_score: 2,
      satisfaction_analysis: 'Khách không hài lòng về độ bền mi.',
      suggested_qa_tags: ['Cần coaching'],
    },
    existingQaVerified: 1,
    existingQaScore: 3,
  });
  assert.equal(cskhComplaint.happyCallStatus, 'NONE');
  assert.equal(cskhComplaint.hasComplaint, true);
  assert.ok(cskhComplaint.qaTags.includes('CSKH'));
  assert.ok(cskhComplaint.qaTags.includes('Khiếu nại'));
  assert.match(cskhComplaint.satisfactionAnalysis, /Khách báo mi bị rụng nhanh sau 4 ngày/);
  assert.equal(cskhComplaint.shouldApplyQaSuggestions, false);
  assert.equal(cskhComplaint.suggestedQaScore, 3);
});
