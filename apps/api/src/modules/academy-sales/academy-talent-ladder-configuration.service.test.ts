import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { ACADEMY_TALENT_TIERS } from '@mos-lab/shared';
import {
  AcademyTalentLadderConfigurationService,
  academyTalentLadderCalculationTiers,
} from './academy-talent-ladder-configuration.service.js';

test('keeps existing global ladder edits while backfilling new sample and kit reward columns', async () => {
  const legacyTiers = ACADEMY_TALENT_TIERS.map((tier, index) => ({
    key: tier.key,
    title: index === 3 ? 'Vượt Trội tùy chỉnh' : tier.title,
    scholarshipPercent: index === 3 ? 20 : tier.scholarshipPercent,
    bubbleHeightPercent: 15 + index * 10,
  }));
  const fastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => ({
            value: JSON.stringify({ tiers: legacyTiers }),
            updatedAt: new Date('2026-08-22T04:00:00.000Z'),
          }),
        },
      },
    },
  } as unknown as FastifyInstance;

  const configuration = await AcademyTalentLadderConfigurationService.get(fastify);
  const customizedTier = configuration.tiers.find((tier) => tier.key === 'level4');
  assert.equal(customizedTier?.title, 'Vượt Trội tùy chỉnh');
  assert.equal(customizedTier?.scholarshipPercent, 20);
  assert.equal(customizedTier?.bubbleHeightPercent, 45);
  assert.equal(customizedTier?.sampleRewardPercent, 20);
  assert.equal(customizedTier?.kitRewardPercent, 20);
});

test('persists created, updated and deleted custom ladder milestones in score order', async () => {
  let value: string | null = null;
  const updatedAt = new Date('2026-08-22T05:00:00.000Z');
  const crm = {
    crmConfig: {
      findUnique: async () => (value ? { value, updatedAt } : null),
      upsert: async ({ update }: { update: { value: string } }) => {
        value = update.value;
        return { value, updatedAt };
      },
    },
    crmAcademyTalentPolicyAudit: {
      create: async () => ({ id: 1 }),
    },
  };
  Object.assign(crm, {
    $transaction: async (callback: (transaction: typeof crm) => unknown) => callback(crm),
  });
  const fastify = {
    prisma: {
      crm,
    },
  } as unknown as FastifyInstance;

  const created = await AcademyTalentLadderConfigurationService.update(
    fastify,
    { id: 82, role: 'admin' },
    {
      tiers: [
        {
          key: 'custom_sprint',
          title: 'Nước rút',
          strands: 8,
          scholarshipPercent: 18,
          sampleRewardPercent: 12,
          kitRewardPercent: 9,
          bubbleHeightPercent: 42,
        },
        {
          key: 'custom_entry',
          title: 'Khởi động',
          strands: 2,
          scholarshipPercent: 4,
          sampleRewardPercent: 3,
          kitRewardPercent: 2,
          bubbleHeightPercent: 24,
        },
      ],
    }
  );
  assert.deepEqual(
    created.tiers.map((tier) => tier.key),
    ['custom_entry', 'custom_sprint']
  );
  assert.equal(academyTalentLadderCalculationTiers(created)[1]?.scholarshipPercent, 18);

  const deleted = await AcademyTalentLadderConfigurationService.update(
    fastify,
    { id: 82, role: 'admin' },
    {
      tiers: [{ ...created.tiers[0], scholarshipPercent: 6 }],
    }
  );
  assert.equal(deleted.tiers.length, 1);
  assert.equal(deleted.tiers[0]?.scholarshipPercent, 6);
  assert.equal((await AcademyTalentLadderConfigurationService.get(fastify)).tiers.length, 1);
});
