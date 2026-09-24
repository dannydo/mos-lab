import test from 'node:test';
import assert from 'node:assert/strict';
import type { SafeAny } from '@mos-lab/shared';
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

  const fakeFastify: SafeAny = {
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
  let createdData: SafeAny = null;

  const fakeFastify: SafeAny = {
    prisma: {
      crm: {
        crmPilotSession: {
          create: async ({ data }: SafeAny) => {
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
  let updatedData: SafeAny = null;

  const fakeFastify: SafeAny = {
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
          update: async ({ data }: SafeAny) => {
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

test('PilotService: listMaterials seeds defaults when empty', async () => {
  let seededData: SafeAny[] = [];
  const fakeFastify: SafeAny = {
    prisma: {
      crm: {
        crmPilotMaterial: {
          count: async () => 0,
          createMany: async ({ data }: SafeAny) => {
            seededData = data;
          },
          findMany: async () =>
            seededData.map((d, index) => ({
              id: index + 1,
              ...d,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
        },
      },
    },
  };

  const materials = await PilotService.listMaterials(fakeFastify, 'DARK_LASHES');
  assert.equal(materials.length, 13);
  assert.equal(materials[0].name, 'Thuốc uốn số 1 (Perming Cream)');
  assert.equal(materials[0].costPerUnit, 30000);
  assert.ok(materials.some((m) => m.name === 'Cây chải mi kim loại'));
  assert.ok(materials.some((m) => m.name === 'Keratin dưỡng mi'));
  assert.ok(materials.some((m) => m.name === 'Thuốc nhuộm mi (Lash Tint)'));
});

test('PilotService: seedDefaultMaterials inserts missing defaults without duplicating existing', async () => {
  let createdData: SafeAny[] = [];
  const existingRecords = [
    {
      id: 1,
      pilotCode: 'DARK_LASHES',
      name: 'Thuốc uốn số 1 (Perming Cream)',
      purchasePrice: 450000,
      volume: 15,
      unit: 'ml',
      costPerUnit: 30000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const fakeFastify: SafeAny = {
    prisma: {
      crm: {
        crmPilotMaterial: {
          findMany: async () => [
            ...existingRecords,
            ...createdData.map((d, i) => ({
              id: i + 2,
              ...d,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          ],
          createMany: async ({ data }: SafeAny) => {
            createdData = data;
          },
        },
      },
    },
  };

  const materials = await PilotService.seedDefaultMaterials(fakeFastify, 'DARK_LASHES');
  assert.equal(createdData.length, 12);
  assert.equal(materials.length, 13);
});

test('PilotService: createMaterial calculates costPerUnit accurately', async () => {
  let createdData: SafeAny = null;
  const fakeFastify: SafeAny = {
    prisma: {
      crm: {
        crmPilotMaterial: {
          create: async ({ data }: SafeAny) => {
            createdData = data;
            return {
              id: 99,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
        },
      },
    },
  };

  const mat = await PilotService.createMaterial(fakeFastify, {
    name: 'Dưỡng chất Collagen',
    purchasePrice: 500000,
    volume: 25,
    unit: 'ml',
  });

  assert.equal(mat.name, 'Dưỡng chất Collagen');
  assert.equal(mat.costPerUnit, 20000); // 500k / 25ml = 20k/ml
  assert.equal(createdData.costPerUnit, 20000);
});

test('PilotService: createSession with materials calculates total materialCost and session materials', async () => {
  const materialsCatalog = [
    { id: 1, name: 'Thuốc uốn số 1', costPerUnit: 30000, unit: 'ml' },
    { id: 2, name: 'Serum bóng mi', costPerUnit: 19000, unit: 'ml' },
    { id: 3, name: 'Miếng silicon', costPerUnit: 16000, unit: 'cặp' },
  ];

  let _createdSessionData: SafeAny = null;
  let createdSessionMaterials: SafeAny[] = [];

  const fakeFastify: SafeAny = {
    prisma: {
      crm: {
        crmPilotMaterial: {
          findUnique: async ({ where }: SafeAny) => {
            return materialsCatalog.find((m) => m.id === where.id) || null;
          },
        },
        crmPilotSession: {
          create: async ({ data }: SafeAny) => {
            _createdSessionData = data;
            return {
              id: 101,
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
        },
        crmPilotSessionMaterial: {
          createMany: async ({ data }: SafeAny) => {
            createdSessionMaterials = data;
          },
        },
      },
    },
  };

  const session = await PilotService.createSession(fakeFastify, {
    customerName: 'Hoàng Oanh',
    customerPhone: '0988776655',
    sessionDate: '2026-09-04',
    technicianCost: 150000,
    materials: [
      { materialId: 1, usageAmount: 1 }, // 30k * 1 = 30k
      { materialId: 2, usageAmount: 1 }, // 19k * 1 = 19k
      { materialId: 3, usageAmount: 1 }, // 16k * 1 = 16k
    ],
  });

  // Total material cost: 30k + 19k + 16k = 65,000đ
  assert.equal(session.materialCost, 65000);
  assert.equal(session.totalDirectCost, 215000); // 65k material + 150k technician
  assert.equal(session.contributionMargin, 775000); // 990k - 215k
  assert.equal(createdSessionMaterials.length, 3);
  assert.equal(createdSessionMaterials[0].calculatedCost, 30000);
  assert.equal(createdSessionMaterials[1].calculatedCost, 19000);
  assert.equal(createdSessionMaterials[2].calculatedCost, 16000);
});

test('PilotService: listSessions computes totalConsumablesCost and avgConsumablesCostPerSession', async () => {
  const mockRecords = [
    {
      id: 1,
      pilotCode: 'DARK_LASHES',
      branchCode: 'detham',
      customerName: 'A',
      customerPhone: '0901',
      sessionDate: new Date('2026-09-01'),
      revenue: 990000,
      materialCost: 65000,
      technicianCost: 150000,
      commissionAmount: 0,
      promoAmount: 0,
      refundAmount: 0,
      totalDirectCost: 215000,
      contributionMargin: 775000,
      followUp24hStatus: 'DONE',
      followUp72hStatus: 'DONE',
      csatScore: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      materials: [
        {
          id: 1,
          sessionId: 1,
          materialId: 1,
          materialName: 'Thuốc uốn',
          unit: 'ml',
          usageAmount: 1,
          costPerUnit: 30000,
          calculatedCost: 30000,
        },
      ],
    },
    {
      id: 2,
      pilotCode: 'DARK_LASHES',
      branchCode: 'detham',
      customerName: 'B',
      customerPhone: '0902',
      sessionDate: new Date('2026-09-02'),
      revenue: 990000,
      materialCost: 85000,
      technicianCost: 150000,
      commissionAmount: 0,
      promoAmount: 0,
      refundAmount: 0,
      totalDirectCost: 235000,
      contributionMargin: 755000,
      followUp24hStatus: 'DONE',
      followUp72hStatus: 'DONE',
      csatScore: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
      materials: [],
    },
  ];

  const fakeFastify: SafeAny = {
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
  assert.equal(response.metrics.totalConsumablesCost, 150000); // 65k + 85k = 150,000
  assert.equal(response.metrics.avgConsumablesCostPerSession, 75000); // 150,000 / 2 = 75,000
  assert.equal(response.sessions[0].materials?.length, 1);
  assert.equal(response.sessions[0].materials?.[0].calculatedCost, 30000);
});

test('PilotService: 7-step operational flow transitions and validations', async () => {
  let sessionState: SafeAny = {
    id: 101,
    pilotCode: 'DARK_LASHES',
    branchCode: 'detham',
    customerName: 'Hoàng Yến',
    customerPhone: '0988776655',
    sessionDate: new Date('2026-09-24'),
    bookingTime: '10:00',
    bookingNote: 'Khách muốn mi cong tự nhiên',
    technicianName: 'Cô Đẫm',
    status: 'BOOKED',
    checkInAt: null,
    beforePhotoUrl: null,
    serviceDoneAt: null,
    afterPhotoUrl: null,
    feedbackRating: null,
    feedbackNote: null,
    checkOutAt: null,
    totalDurationMinutes: null,
    revenue: 990000,
    materialCost: 0,
    technicianCost: 0,
    commissionAmount: 0,
    promoAmount: 0,
    refundAmount: 0,
    totalDirectCost: 0,
    contributionMargin: 990000,
    followUp24hStatus: 'PENDING',
    followUp72hStatus: 'PENDING',
    csatScore: null,
    issues: null,
    notes: null,
    source: null,
    createdByStaffId: null,
    createdAt: new Date('2026-09-24T10:00:00.000Z'),
    updatedAt: new Date('2026-09-24T10:00:00.000Z'),
  };

  const fakeFastify: SafeAny = {
    prisma: {
      crm: {
        crmPilotSession: {
          findUnique: async () => sessionState,
          update: async ({ data }: SafeAny) => {
            sessionState = { ...sessionState, ...data };
            return sessionState;
          },
        },
      },
    },
  };

  // Step 2: Check-in
  const checkInRes = await PilotService.checkIn(fakeFastify, 101, '2026-09-24T10:05:00.000Z');
  assert.equal(checkInRes.status, 'CHECKED_IN');
  assert.ok(checkInRes.checkInAt);

  // Step 3 validation: cannot complete service if beforePhoto is missing
  await assert.rejects(
    async () => {
      await PilotService.markServiceDone(fakeFastify, 101);
    },
    {
      name: 'PilotServiceError',
      message: 'Bắt buộc phải chụp/upload ảnh Trước khi làm (Before Photo) trước khi hoàn tất dịch vụ.',
    }
  );

  // Step 3: Before Photo
  const beforePhotoRes = await PilotService.saveBeforePhoto(fakeFastify, 101, 'https://example.com/photos/before.jpg');
  assert.equal(beforePhotoRes.status, 'BEFORE_PHOTO');
  assert.equal(beforePhotoRes.beforePhotoUrl, 'https://example.com/photos/before.jpg');

  // Step 4: Service Done
  const serviceDoneRes = await PilotService.markServiceDone(fakeFastify, 101, '2026-09-24T10:50:00.000Z');
  assert.equal(serviceDoneRes.status, 'SERVICE_DONE');
  assert.ok(serviceDoneRes.serviceDoneAt);

  // Step 5: After Photo
  const afterPhotoRes = await PilotService.saveAfterPhoto(fakeFastify, 101, 'https://example.com/photos/after.jpg');
  assert.equal(afterPhotoRes.status, 'AFTER_PHOTO');
  assert.equal(afterPhotoRes.afterPhotoUrl, 'https://example.com/photos/after.jpg');

  // Check-out must fail if feedback is missing
  await assert.rejects(
    async () => {
      await PilotService.checkOut(fakeFastify, 101, '2026-09-24T11:05:00.000Z');
    },
    {
      name: 'PilotServiceError',
      message: 'Chưa có đánh giá Feedback tại chỗ của khách. Bắt buộc hoàn tất trước khi Check-out.',
    }
  );

  // Feedback validation: rating out of bounds
  await assert.rejects(
    async () => {
      await PilotService.saveFeedback(fakeFastify, 101, 6);
    },
    {
      name: 'PilotServiceError',
      message: 'Đánh giá của khách hàng phải là số từ 1 đến 5 sao.',
    }
  );

  // Step 6: Submit valid feedback
  const feedbackRes = await PilotService.saveFeedback(fakeFastify, 101, 5, 'Dịch vụ rất êm ái, mi đẹp tự nhiên');
  assert.equal(feedbackRes.status, 'FEEDBACK_DONE');
  assert.equal(feedbackRes.feedbackRating, 5);
  assert.equal(feedbackRes.csatScore, 5);
  assert.equal(feedbackRes.feedbackNote, 'Dịch vụ rất êm ái, mi đẹp tự nhiên');

  // Step 7: Check-out and Duration Calculation
  // Check-in was 10:05:00, Check-out is 11:05:00 -> 60 minutes
  const checkOutRes = await PilotService.checkOut(fakeFastify, 101, '2026-09-24T11:05:00.000Z');
  assert.equal(checkOutRes.status, 'CHECKED_OUT');
  assert.ok(checkOutRes.checkOutAt);
  assert.equal(checkOutRes.totalDurationMinutes, 60);
});

test('PilotService: uploadPhoto handles data URIs, raw base64 and external URLs', async () => {
  const fakeFastify: SafeAny = {};

  // Reject empty photo
  await assert.rejects(
    async () => {
      await PilotService.uploadPhoto(fakeFastify, { photoData: '' });
    },
    {
      name: 'PilotServiceError',
      message: 'Dữ liệu ảnh không được để trống.',
    }
  );

  // External URL returned as-is
  const httpRes = await PilotService.uploadPhoto(fakeFastify, {
    photoData: 'https://example.com/avatar.jpg',
  });
  assert.equal(httpRes.photoUrl, 'https://example.com/avatar.jpg');

  // 1x1 transparent png in base64
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  // Upload data URI
  const dataUriRes = await PilotService.uploadPhoto(fakeFastify, {
    photoData: `data:image/png;base64,${pngBase64}`,
  });
  assert.match(dataUriRes.photoUrl, /^\/api\/pilot\/media\/[a-f0-9-]+\.png$/);

  // Upload raw base64
  const rawBase64Res = await PilotService.uploadPhoto(fakeFastify, {
    photoData: pngBase64,
    mimeType: 'image/png',
  });
  assert.match(rawBase64Res.photoUrl, /^\/api\/pilot\/media\/[a-f0-9-]+\.png$/);
});

