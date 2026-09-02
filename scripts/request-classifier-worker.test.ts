import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCodexClassification } from './request-classifier-worker.js';

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
