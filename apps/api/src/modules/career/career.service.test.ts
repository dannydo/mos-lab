import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CAREER_PROGRESSION_CONFIG } from '@mos-lab/shared';
import { CareerProgressionService } from './career.service.js';

test('CareerProgressionService: fallback to DEFAULT_CAREER_PROGRESSION_CONFIG when DB is empty', async () => {
  const mockFastify: any = {
    log: { warn: () => {}, error: () => {} },
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => null,
        },
      },
    },
  };

  const config = await CareerProgressionService.getConfig(mockFastify);
  assert.equal(config.version, DEFAULT_CAREER_PROGRESSION_CONFIG.version);
  assert.equal(config.cvToCc.minOrders, 300);
  assert.equal(config.cvToCc.minSelfComboRate, 0.2);
  assert.equal(config.rewardRates.bananaPerFALShort, 15);
});

test('CareerProgressionService: updateConfig merges partial values and updates cache immediately', async () => {
  let storedRecord: any = null;

  const mockFastify: any = {
    log: { warn: () => {}, error: () => {} },
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => storedRecord,
          upsert: async ({ create, update }: any) => {
            storedRecord = { key: 'CAREER_PROGRESSION_RULES', value: create?.value || update?.value };
            return storedRecord;
          },
        },
      },
    },
  };

  // Update minOrders to 250 and minSelfComboRate to 0.18
  const updated = await CareerProgressionService.updateConfig(
    mockFastify,
    {
      cvToCc: {
        ...DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCc,
        minOrders: 250,
        minSelfComboRate: 0.18,
      },
    },
    'Danny Do'
  );

  assert.equal(updated.cvToCc.minOrders, 250);
  assert.equal(updated.cvToCc.minSelfComboRate, 0.18);
  assert.equal(updated.updatedBy, 'Danny Do');

  // Verify next getConfig returns cached updated config
  const cached = await CareerProgressionService.getConfig(mockFastify);
  assert.equal(cached.cvToCc.minOrders, 250);
  assert.equal(cached.cvToCc.minSelfComboRate, 0.18);
});
