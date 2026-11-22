import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  matchesCareerBranchFilter,
  resolveCareerBranchFilterStoreId,
} from '@mos-lab/shared';
import { CareerProgressionService, computeHourlyProductivity } from './career.service.js';

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
  assert.equal(config.cvToCc.minOrders, DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCc.minOrders);
  assert.equal(config.cvToCc.minSelfComboRate, DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCc.minSelfComboRate);
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

test('computeHourlyProductivity calculates SPH and Revenue/Hour accurately from completed lash services and shift hours', () => {
  const result = computeHourlyProductivity({
    fullSetCount: 87,
    comboRetainCount: 29,
    singleRetainCount: 7,
    serviceRevenue: 47_916_599,
    shiftHours: 207.0,
    payrollHours: 235.4,
  });

  assert.equal(result.totalCompletedServices, 123);
  assert.equal(result.fullSetCount, 87);
  assert.equal(result.comboRetainCount, 29);
  assert.equal(result.singleRetainCount, 7);
  assert.equal(result.actualWorkingHours, 207);
  assert.equal(result.servicesPerHour, 0.59);
  assert.equal(result.serviceRevenue, 47_916_599);
  assert.equal(result.revenuePerHour, Math.round(47_916_599 / 207));
  assert.equal(result.workingHoursSource, 'SHIFT');
});

test('computeHourlyProductivity falls back to payroll hours when shift hours are missing and handles zero hours safely', () => {
  const payrollFallback = computeHourlyProductivity({
    fullSetCount: 40,
    comboRetainCount: 20,
    singleRetainCount: 5,
    serviceRevenue: 20_000_000,
    shiftHours: 0,
    payrollHours: 160,
  });
  assert.equal(payrollFallback.totalCompletedServices, 65);
  assert.equal(payrollFallback.actualWorkingHours, 160);
  assert.equal(payrollFallback.servicesPerHour, 0.41);
  assert.equal(payrollFallback.revenuePerHour, 125_000);
  assert.equal(payrollFallback.workingHoursSource, 'PAYROLL');

  const zeroHours = computeHourlyProductivity({
    fullSetCount: 10,
    comboRetainCount: 5,
    singleRetainCount: 2,
    serviceRevenue: 5_000_000,
    shiftHours: 0,
    payrollHours: 0,
  });
  assert.equal(zeroHours.totalCompletedServices, 17);
  assert.equal(zeroHours.actualWorkingHours, 0);
  assert.equal(zeroHours.servicesPerHour, 0);
  assert.equal(zeroHours.revenuePerHour, 0);
  assert.equal(zeroHours.workingHoursSource, 'NONE');
});

test('Career branch filter helpers resolve DE_THAM (6) and ESTELLA (16) accurately', () => {
  assert.equal(resolveCareerBranchFilterStoreId('ALL'), null);
  assert.equal(resolveCareerBranchFilterStoreId('DE_THAM'), 6);
  assert.equal(resolveCareerBranchFilterStoreId('DT'), 6);
  assert.equal(resolveCareerBranchFilterStoreId('ESTELLA'), 16);
  assert.equal(resolveCareerBranchFilterStoreId('EP'), 16);

  const dtStaff = { storeId: 6, branchCode: 'DT', branchName: 'Đề Thám' };
  const epStaff = { storeId: 16, branchCode: 'EP', branchName: 'Estella Place' };

  assert.equal(matchesCareerBranchFilter(dtStaff, 'ALL'), true);
  assert.equal(matchesCareerBranchFilter(dtStaff, 'DE_THAM'), true);
  assert.equal(matchesCareerBranchFilter(dtStaff, 'ESTELLA'), false);
  assert.equal(matchesCareerBranchFilter(epStaff, 'ESTELLA'), true);
  assert.equal(matchesCareerBranchFilter(epStaff, 'DE_THAM'), false);
});
