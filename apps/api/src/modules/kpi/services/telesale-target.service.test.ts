import assert from 'node:assert/strict';
import test from 'node:test';
import { TelesaleTargetService, DEFAULT_OCTOBER_CONFIG } from './telesale-target.service.js';

test('TelesaleTargetService.cloneConfig validates inputs and clones targets correctly', async () => {
  const store = new Map<string, string>();

  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            const val = store.get(where.key);
            return val ? { key: where.key, value: val } : null;
          },
          findMany: async () => {
            return Array.from(store.keys())
              .filter((k) => k.startsWith('TELESALE_TARGET_CONFIG_'))
              .map((key) => ({ key }));
          },
          upsert: async ({ where, create, update }: any) => {
            const val = update?.value || create?.value;
            store.set(where.key, val);
            return { key: where.key, value: val };
          },
        },
      },
    },
    log: {
      warn: () => {},
      error: () => {},
    },
  };

  // 1. Error on invalid format
  await assert.rejects(
    async () => {
      await TelesaleTargetService.cloneConfig(mockFastify as any, 'invalid', '2026-11');
    },
    { message: /Định dạng tháng không hợp lệ/ }
  );

  // 2. Error on same source and target month
  await assert.rejects(
    async () => {
      await TelesaleTargetService.cloneConfig(mockFastify as any, '2026-10', '2026-10');
    },
    { message: /Tháng đích phải khác tháng nguồn/ }
  );

  // 3. Successful clone from 2026-10 to 2026-11
  const cloned = await TelesaleTargetService.cloneConfig(mockFastify as any, '2026-10', '2026-11', false);
  assert.equal(cloned.month, '2026-11');
  assert.equal(cloned.teamDoneTarget, DEFAULT_OCTOBER_CONFIG.teamDoneTarget);
  assert.equal(cloned.teamBookTarget, DEFAULT_OCTOBER_CONFIG.teamBookTarget);
  assert.equal(cloned.stageTargets['0_30'], 200);

  // 4. Error on duplicate without overwrite
  await assert.rejects(
    async () => {
      await TelesaleTargetService.cloneConfig(mockFastify as any, '2026-10', '2026-11', false);
    },
    { message: /Kế hoạch tháng 2026-11 đã tồn tại/ }
  );

  // 5. Success with overwrite: true
  const overwritten = await TelesaleTargetService.cloneConfig(mockFastify as any, '2026-10', '2026-11', true);
  assert.equal(overwritten.month, '2026-11');

  // 6. Test listConfiguredMonths
  const months = await TelesaleTargetService.listConfiguredMonths(mockFastify as any);
  assert.ok(months.includes('2026-10'));
  assert.ok(months.includes('2026-11'));
});
