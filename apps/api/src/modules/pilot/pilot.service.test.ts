import test from 'node:test';
import assert from 'node:assert/strict';
import { PilotService } from './pilot.service.js';

test('PilotService: calculateFinancials with defaults', () => {
  const result = PilotService.calculateFinancials({});
  assert.equal(result.revenue, 990000);
  assert.equal(result.materialCost, 0);
  assert.equal(result.technicianCost, 0);
  assert.equal(result.commissionAmount, 0);
  assert.equal(result.promoAmount, 0);
  assert.equal(result.refundAmount, 0);
  assert.equal(result.totalDirectCost, 0);
  assert.equal(result.contributionMargin, 990000);
});

test('PilotService: calculateFinancials with custom direct costs', () => {
  const result = PilotService.calculateFinancials({
    revenue: 990000,
    materialCost: 50000, // Vật tư
    technicianCost: 150000, // Kỹ thuật trực tiếp
    commissionAmount: 100000, // Commission
    promoAmount: 90000, // Voucher/Khuyến mãi
    refundAmount: 0,
  });

  assert.equal(result.revenue, 990000);
  assert.equal(result.totalDirectCost, 390000);
  assert.equal(result.contributionMargin, 600000);
});

test('PilotService: listSessions computes metrics and aggregations accurately', async () => {
  const mockRecords = [
    {
      id: 1,
      pilotCode: 'DARK_LASHES',
      branchCode: 'detham',
      customerName: 'Nguyễn Thị A',
      customerPhone: '0901234567',
      sessionDate: new Date('2026-09-01'),
      technicianName: 'Cô Đẫm',
      revenue: 990000,
      materialCost: 50000,
      technicianCost: 150000,
      commissionAmount: 100000,
      promoAmount: 0,
      refundAmount: 0,
      totalDirectCost: 300000,
      contributionMargin: 690000,
      followUp24hStatus: 'DONE',
      followUp72hStatus: 'PENDING',
      csatScore: 5,
      issues: null,
      notes: 'Khách rất thích',
      source: 'Facebook',
      createdByStaffId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      pilotCode: 'DARK_LASHES',
      branchCode: 'detham',
      customerName: 'Trần Thị B',
      customerPhone: '0907654321',
      sessionDate: new Date('2026-09-02'),
      technicianName: 'Cô Đẫm',
      revenue: 990000,
      materialCost: 50000,
      technicianCost: 150000,
      commissionAmount: 100000,
      promoAmount: 50000,
      refundAmount: 0,
      totalDirectCost: 350000,
      contributionMargin: 640000,
      followUp24hStatus: 'PENDING',
      followUp72hStatus: 'PENDING',
      csatScore: 4,
      issues: 'Mắt hơi cay nhẹ 10p đầu',
      notes: null,
      source: 'Walk-in',
      createdByStaffId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const fakeFastify: any = {
    prisma: {
      crm: {
        crmPilotSession: {
          findMany: async () => mockRecords,
        },
      },
    },
  };

  const response = await PilotService.listSessions(fakeFastify, { pilotCode: 'DARK_LASHES' });

  assert.equal(response.sessions.length, 2);
  assert.equal(response.metrics.targetSessions, 30);
  assert.equal(response.metrics.completedSessions, 2);
  assert.equal(response.metrics.progressPercent, 7); // round((2 / 30) * 100) = 7
  assert.equal(response.metrics.totalRevenue, 1980000);
  assert.equal(response.metrics.totalDirectCost, 650000);
  assert.equal(response.metrics.totalContribution, 1330000);
  assert.equal(response.metrics.avgContributionPerSession, 665000); // 1330000 / 2
  assert.equal(response.metrics.avgContributionMarginPct, 67.2); // (1330000 / 1980000) * 100 = 67.17% -> 67.2%
  assert.equal(response.metrics.avgCsat, 4.5); // (5 + 4) / 2
  assert.equal(response.metrics.ratedSessionsCount, 2);
  assert.equal(response.metrics.pendingFollowUp24hCount, 1);
  assert.equal(response.metrics.pendingFollowUp72hCount, 2);
  assert.equal(response.metrics.totalPendingFollowUpCount, 2);
});

test('PilotService: createSession validates inputs and creates record', async () => {
  let createdData: any = null;

  const fakeFastify: any = {
    prisma: {
      crm: {
        crmPilotSession: {
          create: async ({ data }: any) => {
            createdData = data;
            return {
              id: 10,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
        },
      },
    },
  };

  // Missing customer name throws error
  await assert.rejects(
    async () => {
      await PilotService.createSession(fakeFastify, {
        customerName: '',
        customerPhone: '0901112222',
        sessionDate: '2026-09-03',
      });
    },
    {
      name: 'PilotServiceError',
      message: 'Tên khách hàng không được để trống.',
    }
  );

  // Missing phone throws error
  await assert.rejects(
    async () => {
      await PilotService.createSession(fakeFastify, {
        customerName: 'Lê Thu C',
        customerPhone: '',
        sessionDate: '2026-09-03',
      });
    },
    {
      name: 'PilotServiceError',
      message: 'Số điện thoại khách hàng không được để trống.',
    }
  );

  // Valid creation
  const session = await PilotService.createSession(
    fakeFastify,
    {
      customerName: 'Lê Thu C',
      customerPhone: '0901112222',
      sessionDate: '2026-09-03',
      technicianName: 'Cô Đẫm',
      materialCost: 60000,
      technicianCost: 150000,
    },
    99
  );

  assert.equal(session.customerName, 'Lê Thu C');
  assert.equal(session.revenue, 990000);
  assert.equal(session.totalDirectCost, 210000);
  assert.equal(session.contributionMargin, 780000);
  assert.equal(session.followUp24hStatus, 'PENDING');
  assert.equal(session.followUp72hStatus, 'PENDING');
  assert.equal(createdData.createdByStaffId, 99);
});

test('PilotService: updateSession updates fields and recalculates contribution', async () => {
  let updatedData: any = null;

  const fakeFastify: any = {
    prisma: {
      crm: {
        crmPilotSession: {
          findUnique: async () => ({
            id: 10,
            pilotCode: 'DARK_LASHES',
            branchCode: 'detham',
            customerName: 'Lê Thu C',
            customerPhone: '0901112222',
            sessionDate: new Date('2026-09-03'),
            technicianName: 'Cô Đẫm',
            revenue: 990000,
            materialCost: 60000,
            technicianCost: 150000,
            commissionAmount: 0,
            promoAmount: 0,
            refundAmount: 0,
            totalDirectCost: 210000,
            contributionMargin: 780000,
            followUp24hStatus: 'PENDING',
            followUp72hStatus: 'PENDING',
            csatScore: null,
            issues: null,
            notes: null,
            source: null,
            createdByStaffId: 99,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          update: async ({ data }: any) => {
            updatedData = data;
            return {
              id: 10,
              customerName: 'Lê Thu C',
              customerPhone: '0901112222',
              sessionDate: new Date('2026-09-03'),
              technicianName: 'Cô Đẫm',
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
        },
      },
    },
  };

  const updated = await PilotService.updateSession(fakeFastify, 10, {
    materialCost: 80000,
    commissionAmount: 50000,
    followUp24hStatus: 'DONE',
    csatScore: 5,
  });

  assert.ok(updatedData);
  assert.equal(updated.materialCost, 80000);
  assert.equal(updated.commissionAmount, 50000);
  assert.equal(updated.totalDirectCost, 280000); // 80k + 150k + 50k
  assert.equal(updated.contributionMargin, 710000); // 990k - 280k
  assert.equal(updated.followUp24hStatus, 'DONE');
  assert.equal(updated.csatScore, 5);
});
