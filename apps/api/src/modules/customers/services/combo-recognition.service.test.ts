import assert from 'node:assert/strict';
import test from 'node:test';
import { ComboRecognitionService, parseComboDateBounds } from './combo-recognition.service.js';

test('pads date-only combo bounds to the full inclusive day', () => {
  assert.deepEqual(parseComboDateBounds('2026-08-01', '2026-08-12'), {
    startStr: '2026-08-01 00:00:00',
    endStr: '2026-08-12 23:59:59',
  });
});

test('recognizes completed combo sales only by actual check-in and an existing customer balance', async () => {
  let capturedSql = '';
  let capturedParams: unknown[] = [];
  const fastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          capturedSql = sql;
          capturedParams = params;
          return [{ user_id: 42 }];
        },
      },
    },
    log: { error: () => undefined },
  };

  const ids = await ComboRecognitionService.getNewLoCaCustomerIds(fastify as never, '2026-08-01', '2026-08-12');

  assert.deepEqual(ids, [42]);
  assert.deepEqual(capturedParams, [
    '2026-08-01 00:00:00',
    '2026-08-12 23:59:59',
    '2026-08-01 00:00:00',
    '2026-08-12 23:59:59',
  ]);
  assert.match(capturedSql, /EXISTS\s*\(\s*SELECT 1\s+FROM user_service_balance usb/);
  assert.match(capturedSql, /usb\.user_id = recognized_combo\.user_id/);
  assert.match(capturedSql, /COALESCE\(ro_nl\.actual_booking_date_start, o_nl\.booking_date_start\)/);
  assert.doesNotMatch(capturedSql, /COALESCE\([^)]*o_nl\.date_created/);
  assert.match(capturedSql, /os_nl\.user_service_type = 'combo' OR os_nl\.service_group = 'combo'/);
});
