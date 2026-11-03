process.env.NODE_ENV = 'test';

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  StaffCareerContextService,
  mapRoleToRespectfulTitle,
  isManagerRole,
  formatDateVN,
} from './staff-career-context.service.js';
import { generateAssistantFallback } from './ai.service.js';
import type { SafeAny } from '@mos-lab/shared';

// Mock DB setup
const mockStaffRecords = [
  {
    id: 1,
    displayName: 'Danny Do',
    role: 'super_admin',
    isActive: true,
    legacyStaffId: null,
    careerProgression: null,
  },
  {
    id: 37,
    displayName: 'Khanh Cao',
    role: 'cv_plus',
    isActive: true,
    legacyStaffId: 13783,
    careerProgression: {
      id: 1,
      staffId: 37,
      currentRole: 'CV_PLUS',
      targetRole: 'CV_PLUS_PLUS',
      status: 'PROMOTED',
      promotedAt: new Date('2026-11-01T13:09:52.000Z'),
      promotedBy: 1,
      metricsSnapshot: JSON.stringify({
        ordersCount: 397,
        periodOrders: 112,
        selfComboCount: 9,
        locaRate: 17.3,
        tipRate: 53.6,
        totalTip: 3802428,
        avgCsat: 58.4,
        fixRate: 0,
        branchName: 'Đề Thám (DT)',
      }),
    },
  },
  {
    id: 55,
    displayName: 'Thảo Ly',
    role: 'cv_plus',
    isActive: true,
    legacyStaffId: 46272,
    careerProgression: {
      id: 2,
      staffId: 55,
      currentRole: 'CV_PLUS',
      targetRole: 'CV_PLUS_PLUS',
      status: 'PROMOTED',
      promotedAt: new Date('2026-11-01T13:09:52.000Z'),
      promotedBy: 1,
      metricsSnapshot: JSON.stringify({
        ordersCount: 386,
        periodOrders: 118,
        selfComboCount: 16,
        locaRate: 47.1,
        tipRate: 59.3,
        totalTip: 5863200,
        avgCsat: 74.8,
        fixRate: 0,
        branchName: 'Đề Thám (DT)',
      }),
    },
  },
  {
    id: 77,
    displayName: 'Ngọc Mai',
    role: 'cv',
    isActive: true,
    legacyStaffId: 48999,
    careerProgression: {
      id: 3,
      staffId: 77,
      currentRole: 'CV',
      targetRole: 'CV_PLUS',
      status: 'IN_PROGRESS',
      promotedAt: null,
      promotedBy: null,
      metricsSnapshot: JSON.stringify({
        ordersCount: 150,
        periodOrders: 60,
        selfComboCount: 2,
        locaRate: 5.5,
        tipRate: 42.0,
        totalTip: 1200000,
        avgCsat: 60.0,
        fixRate: 0,
        branchName: 'Estella Place (EP)',
      }),
    },
  },
];

const mockPrisma = {
  prisma: {
    crm: {
      crmStaff: {
        findMany: async (args?: SafeAny) => {
          if (args?.where?.role === 'cv_plus' || args?.where?.OR) {
            return mockStaffRecords.filter((s) => s.role === 'cv_plus');
          }
          return mockStaffRecords.filter((s) => s.isActive);
        },
        findUnique: async (args: { where: { id: number }; include?: SafeAny }) => {
          return mockStaffRecords.find((s) => s.id === args.where.id) || null;
        },
      },
    },
  },
};

test('StaffCareerContextService - mapRoleToRespectfulTitle respects Wings language invariant', () => {
  assert.equal(mapRoleToRespectfulTitle('cv_plus'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV_PLUS'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CVL'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV Lông'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV 1 lông'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('🪶CV'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV🪶'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV L'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV 1L'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV 𝓁'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV 1𝓁'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV Lờ'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV 1 Lờ'), 'Chuyên Viên Tự Chủ (CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CV_PLUS_PLUS'), 'Chuyên Viên Tự Chủ Cấp Cao (🪶CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('CVLL'), 'Chuyên Viên Tự Chủ Cấp Cao (🪶CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('🪶CV🪶'), 'Chuyên Viên Tự Chủ Cấp Cao (🪶CV🪶)');
  assert.equal(mapRoleToRespectfulTitle('cv'), 'Chuyên Viên (CV)');
  assert.equal(mapRoleToRespectfulTitle('lt'), 'Chuyên Viên Kỹ Thuật');
  assert.equal(mapRoleToRespectfulTitle('artisan'), 'Nghệ Nhân Mi');

  assert.equal(isManagerRole('super_admin'), true);
  assert.equal(isManagerRole('admin'), true);
  assert.equal(isManagerRole('cv'), false);
  assert.equal(isManagerRole(null), false);

  assert.equal(formatDateVN(new Date('2026-11-01T12:00:00Z')), '01/11/2026');
  assert.equal(formatDateVN(null), null);

  // Forbidden words check
  const titles = ['cv_plus', 'CVL', 'CVLL', 'cv', 'lt', 'artisan', 'CV_PLUS_PLUS'].map(mapRoleToRespectfulTitle);
  for (const t of titles) {
    assert.ok(!t.toLowerCase().includes('thợ'), `Title "${t}" must not contain "thợ"`);
    assert.ok(!t.includes('CV+'), `Title "${t}" must not contain retired "CV+"`);
  }
});

test('StaffCareerContextService - isCareerQuery accurately identifies career intents', () => {
  assert.equal(
    StaffCareerContextService.isCareerQuery('Hôm nay Khanh Cao và Thảo Ly đang ở cấp bậc nào trong career path?'),
    true
  );
  assert.equal(StaffCareerContextService.isCareerQuery('Vì sao Khanh Cao được lên CV🪶?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Vì sao Khanh Cao được lên 🪶CV?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CV Lông là gì?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CV 1 lông là gì?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CV L là gì?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CV 1L là gì?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CV 𝓁 là gì?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CV 1𝓁 là gì?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CV Lờ là gì?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CV 1 Lờ là gì?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Điều kiện lên CVL và CVLL?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Lý do Thảo Ly được thăng cấp chuyên viên tự chủ?'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Lộ trình career path của chuyên viên tại Wings'), true);
  assert.equal(StaffCareerContextService.isCareerQuery('Lọc khách NYC 60 có chi tiêu trên 1 triệu'), false);
  assert.equal(StaffCareerContextService.isCareerQuery('Xin chào mOS AI'), false);
});

test('Test Case 1: Super Admin / Manager queries Career Path of Khanh Cao & Thảo Ly by name', async () => {
  StaffCareerContextService.clearCache();

  const query = 'Hôm nay Khanh Cao và Thảo Ly đang ở cấp bậc nào trong career path?';
  const context = await StaffCareerContextService.getStaffCareerContext(mockPrisma as SafeAny, 1, 'super_admin', query);

  assert.ok(context.includes('<LIVE_STAFF_CONTEXT>'));
  assert.ok(context.includes('Khanh Cao'));
  assert.ok(context.includes('Thảo Ly'));
  assert.ok(context.includes('Chuyên Viên Tự Chủ (CV🪶)'));
  assert.ok(context.includes('01/11/2026'));
  assert.ok(context.includes('Danny Do (Super Admin)'));
  assert.ok(context.includes('PROMOTED'));
  assert.ok(context.includes('🪶CV🪶'));

  // Ensure no forbidden terms
  assert.ok(!context.toLowerCase().includes('thợ'));
  assert.ok(!context.includes('CV+'));
});

test('Test Case 2: Analyze promotion reasons with live performance metrics', async () => {
  StaffCareerContextService.clearCache();

  const query = 'Vì sao Khanh Cao và Thảo Ly được lên CV🪶?';
  const context = await StaffCareerContextService.getStaffCareerContext(mockPrisma as SafeAny, 1, 'super_admin', query);

  // Check Khanh Cao metrics
  assert.ok(context.includes('397 lượt'));
  assert.ok(context.includes('17.3%')); // LoCa rate
  assert.ok(context.includes('53.6%')); // Tip rate
  assert.ok(context.includes('0%')); // Fix rate 0%
  assert.ok(context.includes('58.4%')); // CSAT

  // Check Thảo Ly metrics
  assert.ok(context.includes('386 lượt'));
  assert.ok(context.includes('47.1%')); // LoCa rate
  assert.ok(context.includes('59.3%')); // Tip rate
  assert.ok(context.includes('74.8%')); // CSAT
});

test('Test Case 3: Performance test - query context resolves in < 300ms', async () => {
  // Cold run
  StaffCareerContextService.clearCache();
  const startCold = Date.now();
  await StaffCareerContextService.getStaffCareerContext(
    mockPrisma as SafeAny,
    1,
    'super_admin',
    'Khanh Cao career path'
  );
  const coldDuration = Date.now() - startCold;
  assert.ok(coldDuration >= 0);

  // Warm run (cached)
  const startWarm = Date.now();
  const warmContext = await StaffCareerContextService.getStaffCareerContext(
    mockPrisma as SafeAny,
    1,
    'super_admin',
    'Khanh Cao career path'
  );
  const warmDuration = Date.now() - startWarm;

  assert.ok(warmDuration < 300, `Warm cache duration (${warmDuration}ms) must be < 300ms`);
  assert.ok(warmContext.includes('Khanh Cao'));
});

test('Test Case 4: RBAC & Data Governance - non-manager cannot inspect another CV profile', async () => {
  StaffCareerContextService.clearCache();

  // CV Staff 77 (Ngọc Mai) tries to ask about Khanh Cao
  const contextForOther = await StaffCareerContextService.getStaffCareerContext(
    mockPrisma as SafeAny,
    77,
    'cv',
    'Vì sao Khanh Cao được lên CV🪶?'
  );

  // Must NOT leak Khanh Cao's metrics, must return privacy restriction
  assert.ok(!contextForOther.includes('397 lượt'));
  assert.ok(contextForOther.includes('Chính Sách Bảo Mật Hồ Sơ Nhân Sự mOS'));
  assert.ok(
    contextForOther.includes('chỉ được phép truy cập hồ sơ năng lực và lộ trình Career Path của chính bản thân mình')
  );

  // When CV Staff 77 asks about self career path -> allowed
  const contextSelf = await StaffCareerContextService.getStaffCareerContext(
    mockPrisma as SafeAny,
    77,
    'cv',
    'Lộ trình career path của tôi hiện tại'
  );
  assert.ok(contextSelf.includes('Ngọc Mai'));
  assert.ok(contextSelf.includes('150 lượt'));
  assert.ok(contextSelf.includes('Chuyên Viên (CV)'));
});

test('generateAssistantFallback correctly answers Khanh Cao & Thảo Ly career path queries', () => {
  // Query 1: Rank inquiry
  const res1 = generateAssistantFallback('Hôm nay Khanh Cao và Thảo Ly đang ở cấp bậc nào trong career path?');
  assert.ok(res1.thinking && res1.thinking.includes('Career Path'));
  assert.ok(res1.content.includes('Khanh Cao'));
  assert.ok(res1.content.includes('Thảo Ly'));
  assert.ok(res1.content.includes('Chuyên Viên Tự Chủ (CV🪶)'));
  assert.ok(res1.content.includes('01/11/2026'));
  assert.ok(res1.content.includes('Danny Do (Super Admin)'));
  assert.ok(!res1.content.toLowerCase().includes('thợ'));
  assert.ok(!res1.content.includes('CV+'));

  // Query 2: Why promoted inquiry
  const res2 = generateAssistantFallback('Vì sao Khanh Cao và Thảo Ly được lên CV🪶?');
  assert.ok(res2.thinking && res2.thinking.includes('Phân tích cơ sở thực chứng'));
  assert.ok(res2.content.includes('397 lượt phục vụ'));
  assert.ok(res2.content.includes('17.3%'));
  assert.ok(res2.content.includes('53.6%'));
  assert.ok(res2.content.includes('Fix Rate) 0%'));
  assert.ok(res2.content.includes('386 lượt phục vụ'));
  assert.ok(res2.content.includes('47.1%'));
  assert.ok(res2.content.includes('59.3%'));
  assert.ok(res2.content.includes('Danny Do (Super Admin)'));
  assert.ok(!res2.content.toLowerCase().includes('thợ'));
  assert.ok(!res2.content.includes('CV+'));
});
