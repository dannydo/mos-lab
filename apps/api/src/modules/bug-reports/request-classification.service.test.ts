import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestClassificationError, normalizeClassificationResult } from './request-classification.service.js';

test('normalizes only bounded BUG or FEATURE worker recommendations', () => {
  assert.deepEqual(
    normalizeClassificationResult({
      requestType: 'FEATURE',
      confidence: 0.72,
      rationale: 'Đây là nhu cầu cho một luồng mới.',
      clarificationQuestion: 'Ai cần dùng báo cáo này mỗi ngày?',
    }),
    {
      requestType: 'FEATURE',
      confidence: 0.72,
      rationale: 'Đây là nhu cầu cho một luồng mới.',
      clarificationQuestion: 'Ai cần dùng báo cáo này mỗi ngày?',
    }
  );
  assert.throws(
    () => normalizeClassificationResult({ requestType: 'DELETE_DATABASE', confidence: 1, rationale: 'x'.repeat(10) }),
    RequestClassificationError
  );
  assert.throws(
    () => normalizeClassificationResult({ requestType: 'BUG', confidence: 1.01, rationale: 'Không thể lưu.' }),
    RequestClassificationError
  );
  assert.throws(
    () => normalizeClassificationResult({ requestType: 'BUG', confidence: 0.4, rationale: 'Không rõ hành vi mong muốn.' }),
    /câu hỏi làm rõ/
  );
});
