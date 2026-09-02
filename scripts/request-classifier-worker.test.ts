import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseCodexClassification,
  parseCodexConversation,
  parseCodexInboxFollowUp,
} from './request-classifier-worker.js';

test('accepts Codex structured JSON and rejects unsafe output', () => {
  assert.deepEqual(
    parseCodexClassification(
      '{"requestType":"BUG","confidence":0.91,"rationale":"A save action should already work.","clarificationQuestion":null}'
    ),
    {
      requestType: 'BUG',
      confidence: 0.91,
      rationale: 'A save action should already work.',
      clarificationQuestion: null,
    }
  );
  assert.throws(() => parseCodexClassification('{"requestType":"SYSTEM","confidence":1}'));
});

test('accepts only safe inbox follow-up actions', () => {
  assert.deepEqual(
    parseCodexInboxFollowUp('{"action":"NO_OP","note":"Đã đủ thông tin, không cần hỏi lại.","question":null}'),
    { action: 'NO_OP', note: 'Đã đủ thông tin, không cần hỏi lại.', question: null }
  );
  assert.throws(() => parseCodexInboxFollowUp('{"action":"ASK_REPORTER","note":"Thiếu chi tiết","question":null}'));
});

test('accepts one-question guided intake output', () => {
  const result = parseCodexConversation(
    JSON.stringify({
      requestType: 'BUG',
      summary: {
        requestType: 'BUG',
        whereItHappened: 'Trang khách',
        userAction: 'Bấm Lưu',
        observedResult: null,
        expectedResult: null,
        impact: null,
        userOrAudience: null,
        problem: null,
        desiredOutcome: null,
        currentWorkaround: null,
        priorityOrImpact: null,
        constraints: null,
      },
      nextQuestion: 'Sau khi bấm Lưu, điều gì xảy ra?',
      readyToSubmit: false,
    })
  );
  assert.equal(result.nextQuestion, 'Sau khi bấm Lưu, điều gì xảy ra?');
  assert.throws(() => parseCodexConversation('{"requestType":"BUG","readyToSubmit":false}'));
});
