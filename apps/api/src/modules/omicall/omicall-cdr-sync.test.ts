import assert from 'node:assert/strict';
import test from 'node:test';
import { FastifyInstance } from 'fastify';
import { upsertOmicallCdrBatch } from './omicall-cdr-sync.service.js';

test('upsertOmicallCdrBatch restores answered CDRs with recordingUrl without burning Gemini quota when autoAnalyze is false', async () => {
  const store = new Map<string, SafeAny>();
  let nextId = 100;

  const mockFastify = {
    log: { error: () => {} },
    prisma: {
      crm: {
        crmOmicallConfig: {
          findMany: async ({ where }: SafeAny) =>
            where.extension === '110' ? [{ staffId: 4 }, { staffId: 12 }, { staffId: 1 }] : [],
        },
        crmCallLog: {
          findFirst: async () => ({ id: 55, staffId: 1 }),
          update: async () => ({}),
        },
        crmOmicallLog: {
          findUnique: async ({ where }: SafeAny) => store.get(where.callUuid) || null,
          upsert: async ({ where, create, update }: SafeAny) => {
            const existing = store.get(where.callUuid);
            const row = existing ? { ...existing, ...update } : { id: nextId++, ...create };
            store.set(where.callUuid, row);
            return row;
          },
        },
      },
      legacy: {
        user_contact: {
          findFirst: async () => ({ user_id: 43554 }),
        },
      },
    },
  } as unknown as FastifyInstance;

  const summary = await upsertOmicallCdrBatch(
    mockFastify,
    [
      {
        transaction_id: '1cdb95e1-f45a-42d7-8d4d-97bab32e9cd7',
        direction: 'outbound',
        disposition: 'answered',
        sip_user: '110',
        source_number: '02866810755',
        destination_number: '0989062401',
        duration: 46,
        bill_sec: 34,
        answer_sec: 34,
        recording_file_url: 'https://public-v1-stg.omicrm.com/third_party/recording/uc?id=test123',
        created_date: 1795524937,
      },
    ],
    { autoAnalyze: false, preserveTimestampOnCreate: true }
  );

  assert.equal(summary.imported, 1);
  assert.equal(summary.updated, 0);
  assert.equal(summary.withRecording, 1);
  assert.equal(summary.skippedInvalid, 0);

  const saved = store.get('1cdb95e1-f45a-42d7-8d4d-97bab32e9cd7');
  assert.equal(saved.status, 'ANSWER');
  assert.equal(saved.billSec, 34);
  assert.equal(saved.staffId, 1);
  assert.equal(saved.legacyUserId, 43554);
  assert.equal(saved.analysisStatus, 'SKIPPED');
  assert.equal(saved.createdAt.getUTCFullYear(), 2026);
});
