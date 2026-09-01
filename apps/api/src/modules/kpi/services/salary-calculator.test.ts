import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { getSalaryConfig, setCachedSalaryConfig } from './salary-calculator.js';

test('an updated Booker salary config replaces the warmed calculator cache immediately', async () => {
  let databaseReads = 0;
  const persistedConfig = { baseSalary: 5_500_000, tipsPercent: 7 };
  const updatedConfig = { baseSalary: 6_000_000, tipsPercent: 8 };
  const fastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => {
            databaseReads += 1;
            return { value: JSON.stringify(persistedConfig) };
          },
        },
      },
    },
    log: { error: () => undefined },
  } as unknown as FastifyInstance;

  setCachedSalaryConfig(null);
  try {
    assert.deepEqual(await getSalaryConfig(fastify), persistedConfig);
    assert.equal(databaseReads, 1);

    setCachedSalaryConfig(updatedConfig);

    assert.deepEqual(await getSalaryConfig(fastify), updatedConfig);
    assert.equal(databaseReads, 1);
  } finally {
    setCachedSalaryConfig(null);
  }
});
