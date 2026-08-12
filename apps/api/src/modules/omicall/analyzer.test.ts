import assert from 'node:assert/strict';
import test from 'node:test';
import { FastifyInstance } from 'fastify';
import { claimPendingAnalysis } from './analyzer.js';

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
  const updateMany = async ({ where, data }: ClaimArgs) => {
    if (where.id !== 42 || analysisStatus !== where.analysisStatus) {
      return { count: 0 };
    }

    analysisStatus = data.analysisStatus;
    return { count: 1 };
  };

  const fastify = {
    prisma: {
      crm: {
        crmOmicallLog: { updateMany },
      },
    },
  } as unknown as FastifyInstance;

  const claims = await Promise.all([
    claimPendingAnalysis(fastify, 42),
    claimPendingAnalysis(fastify, 42),
    claimPendingAnalysis(fastify, 42),
  ]);

  assert.equal(claims.filter(Boolean).length, 1);
  assert.equal(analysisStatus, 'PROCESSING');
});
