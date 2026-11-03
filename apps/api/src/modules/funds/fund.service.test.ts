import assert from 'node:assert/strict';
import test from 'node:test';
import { FundError, FundService } from './fund.service.js';

test('FundService - recordExpense decreases balance and enforces anti-negative balance', async () => {
  let currentBalance = 1000000;
  const transactions: any[] = [];

  const mockCrm: any = {
    crmFund: {
      findUnique: async () => ({
        id: 'fund-telesale-card',
        name: 'Quỹ Nạp Card Telesale',
        currentBalance,
        maxQuota: 1000000,
        unitQuota: 30000,
        alertThresholdPercent: 80,
        toleranceMode: 'STRICT',
        toleranceAmount: 20000,
        status: 'ACTIVE',
      }),
      update: async ({ data }: any) => {
        currentBalance = Number(data.currentBalance);
        return { id: 'fund-telesale-card', currentBalance };
      },
    },
    crmFundPeriod: {
      findFirst: async () => ({ id: 'period-1', status: 'OPEN' }),
      update: async () => ({}),
    },
    crmFundTransaction: {
      create: async ({ data }: any) => {
        transactions.push(data);
        return {
          ...data,
          createdAt: new Date(),
        };
      },
    },
    $transaction: async (fn: any) => fn(mockCrm),
  };

  const actor = { id: 2, name: 'Bích Phượng' };

  // 1. Chi tiêu 30.000đ thành công
  const res = await FundService.recordExpense(
    mockCrm,
    'fund-telesale-card',
    {
      amount: 30000,
      description: 'Nạp cước Viettel 30k cho Telesale Nguyễn Văn A',
      beneficiaryStaffId: 10,
      beneficiaryStaffName: 'Nguyễn Văn A',
      beneficiaryPhone: '0987654321',
      telco: 'VIETTEL',
    },
    actor
  );

  assert.equal(res.transaction.amount, 30000);
  assert.equal(res.transaction.balanceBefore, 1000000);
  assert.equal(res.transaction.balanceAfter, 970000);
  assert.equal(currentBalance, 970000);
  assert.equal(res.isLowBalance, false);

  // 2. Chống số dư âm (Chi vượt số dư còn lại)
  await assert.rejects(
    async () => {
      await FundService.recordExpense(
        mockCrm,
        'fund-telesale-card',
        {
          amount: 1500000,
          description: 'Chi vượt quá số dư',
        },
        actor
      );
    },
    (err: any) => err instanceof FundError && err.message.includes('không đủ để chi')
  );
});

test('FundService - Tolerance Control blocks over-disbursement and triggers PENDING_REAPPROVAL', async () => {
  const proposal = {
    id: 'prop-1',
    fundId: 'fund-telesale-card',
    proposalType: 'REPLENISHMENT',
    title: 'Đề xuất cấp bù quỹ',
    requestedAmount: 500000,
    approvedAmount: 500000,
    actualDisbursedAmount: null,
    status: 'APPROVED',
    currentApprovalLevel: 2,
    approvalsJson: null,
    fund: {
      id: 'fund-telesale-card',
      toleranceMode: 'TOLERANCE_FIXED',
      toleranceAmount: 20000, // Dung sai 20k
    },
  };

  let updatedProposalStatus = '';
  let updatedReapprovalReason = '';

  const mockCrm: any = {
    crmFundProposal: {
      findUnique: async () => proposal,
      update: async ({ data }: any) => {
        updatedProposalStatus = data.status;
        updatedReapprovalReason = data.reapprovalReason;
        return {
          ...proposal,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  };

  const actor = { id: 4, name: 'Bùi Sinh Nguyên' };

  // 1. Kế toán giải ngân vượt quá hạn mức duyệt + dung sai (500k + 20k = 520k; thực chuyển 550k)
  const result = await FundService.disburseProposal(
    mockCrm,
    'prop-1',
    {
      actualDisbursedAmount: 550000,
      paymentMethod: 'VCB',
      bankRefCode: 'VCB123456789',
    },
    actor
  );

  assert.equal(result.success, false);
  assert.equal(result.reapprovalRequired, true);
  assert.equal(updatedProposalStatus, 'PENDING_REAPPROVAL');
  assert.match(updatedReapprovalReason, /vượt quá Hạn mức duyệt/);
});

test('FundService - Tolerance Control allows disbursement within tolerance', async () => {
  let currentBalance = 200000;
  const transactions: any[] = [];
  const proposal = {
    id: 'prop-2',
    fundId: 'fund-telesale-card',
    proposalType: 'REPLENISHMENT',
    title: 'Đề xuất cấp bù quỹ',
    requestedAmount: 500000,
    approvedAmount: 500000,
    actualDisbursedAmount: null,
    status: 'APPROVED',
    currentApprovalLevel: 2,
    approvalsJson: null,
    fund: {
      id: 'fund-telesale-card',
      currentBalance,
      toleranceMode: 'TOLERANCE_FIXED',
      toleranceAmount: 20000, // Dung sai 20k
    },
  };

  const mockCrm: any = {
    crmFundProposal: {
      findUnique: async () => proposal,
      update: async ({ data }: any) => {
        Object.assign(proposal, data);
        return {
          ...proposal,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
    crmFund: {
      findUnique: async () => ({ id: 'fund-telesale-card', currentBalance, name: 'Quỹ Nạp Card' }),
      update: async ({ data }: any) => {
        currentBalance = Number(data.currentBalance);
        return { id: 'fund-telesale-card', currentBalance };
      },
    },
    crmFundPeriod: {
      findFirst: async () => ({ id: 'period-1', status: 'OPEN' }),
      update: async () => ({}),
    },
    crmFundTransaction: {
      create: async ({ data }: any) => {
        transactions.push(data);
        return { ...data, createdAt: new Date() };
      },
    },
    $transaction: async (fn: any) => fn(mockCrm),
  };

  const actor = { id: 4, name: 'Bùi Sinh Nguyên' };

  // Thực chuyển 515.000đ (<= 520.000đ cho phép)
  const result = await FundService.disburseProposal(
    mockCrm,
    'prop-2',
    {
      actualDisbursedAmount: 515000,
      paymentMethod: 'VCB',
      bankRefCode: 'VCB998877',
      disbursementReceiptUrls: ['https://example.com/receipt.jpg'],
    },
    actor
  );

  assert.equal(result.success, true);
  assert.equal(result.proposal.status, 'DISBURSED');
  assert.equal(result.proposal.actualDisbursedAmount, 515000);
  // Số dư chưa tăng trước khi Thủ quỹ xác nhận nhận tiền (MOS-FEAT-192 Bước 3 Invariant)
  assert.equal(currentBalance, 200000);

  // Thủ quỹ xác nhận nhận tiền -> lúc này số dư mới tăng
  const confirmResult = await FundService.confirmProposalReceipt(
    mockCrm,
    'prop-2',
    { note: 'Đã nhận đủ tiền' },
    { id: 5, name: 'Thủ quỹ Phạm Thị B' }
  );

  assert.equal(confirmResult.success, true);
  assert.equal(confirmResult.proposal.status, 'COMPLETED');
  assert.equal(currentBalance, 715000); // 200k + 515k
  assert.equal(transactions[0].type, 'TOPUP');
  assert.equal(Number(transactions[0].amount), 515000);
});

test('FundService - Period Reconciliation & Lock detects variance, creates adjustment and locks period', async () => {
  let fundBalance = 900000;
  const transactions: any[] = [];

  const period = {
    id: 'period-oct',
    fundId: 'fund-telesale-card',
    periodName: 'Kỳ Tháng 10/2026',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31T23:59:59'),
    openingBalance: 1000000,
    totalIncome: 0,
    totalExpense: 100000,
    systemBalance: 900000,
    status: 'OPEN',
    fund: {
      id: 'fund-telesale-card',
      currentBalance: fundBalance,
    },
  };

  const mockCrm: any = {
    crmFundPeriod: {
      findUnique: async () => period,
      update: async ({ data }: any) => ({
        ...period,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      create: async ({ data }: any) => ({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    },
    crmFund: {
      update: async ({ data }: any) => {
        fundBalance = Number(data.currentBalance);
        return { id: 'fund-telesale-card', currentBalance: fundBalance };
      },
    },
    crmFundTransaction: {
      create: async ({ data }: any) => {
        transactions.push(data);
        return { ...data, createdAt: new Date() };
      },
      updateMany: async () => ({ count: 1 }),
    },
    $transaction: async (fn: any) => fn(mockCrm),
  };

  const actor = { id: 1, name: 'Danny Do' };

  // Kiểm kê thực tế còn 880.000đ (hụt 20.000đ so với số dư hệ thống 900.000đ)
  const result = await FundService.reconcileAndLockPeriod(
    mockCrm,
    'fund-telesale-card',
    'period-oct',
    {
      actualBalance: 880000,
      notes: 'Hụt 20.000đ phí duy trì thẻ ngân hàng',
    },
    actor
  );

  assert.equal(result.variance, -20000);
  assert.equal(result.closedPeriod.status, 'LOCKED');
  assert.equal(result.closedPeriod.actualBalance, 880000);
  assert.equal(result.closedPeriod.closingBalance, 880000);
  assert.equal(result.nextPeriod.status, 'OPEN');
  assert.equal(result.nextPeriod.openingBalance, 880000); // Kết chuyển số dư đầu kỳ mới
  assert.equal(fundBalance, 880000);
  assert.equal(result.adjustmentTransaction?.type, 'ADJUSTMENT');
  assert.equal(result.adjustmentTransaction?.amount, 20000);
});

test('FundService - listFunds returns empty array and does not auto-seed when no funds exist (MOS-BUG-174)', async () => {
  let createdCount = 0;
  const mockCrm: any = {
    crmFund: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async () => {
        createdCount++;
        return {};
      },
    },
    $transaction: async (fn: any) => fn(mockCrm),
  };

  const funds = await FundService.listFunds(mockCrm);
  assert.deepEqual(funds, []);
  assert.equal(createdCount, 0, 'Must not auto-seed default fund when list is called');
});

test('FundService - createFund creates new fund with 0 balance, DRAFT status, roles and approval config (MOS-FEAT-177 Step 2)', async () => {
  const fundsStore: any[] = [];
  const rolesStore: any[] = [];
  const assignmentsStore: any[] = [];

  const mockCrm: any = {
    crmFund: {
      findUnique: async ({ where }: any) => {
        if (where.code) return fundsStore.find((f) => f.code === where.code) || null;
        if (where.id) return fundsStore.find((f) => f.id === where.id) || null;
        return null;
      },
      create: async ({ data }: any) => {
        const record = {
          ...data,
          currentBalance: Number(data.currentBalance || 0),
          maxQuota: Number(data.maxQuota),
          unitQuota: Number(data.unitQuota),
          toleranceAmount: Number(data.toleranceAmount || 0),
          createdAt: new Date(),
          updatedAt: new Date(),
          roles: [],
          assignments: [],
          periods: [],
          transactions: [],
          proposals: [],
        };
        fundsStore.push(record);
        return record;
      },
      update: async ({ where, data }: any) => {
        const idx = fundsStore.findIndex((f) => f.id === where.id);
        if (idx !== -1) {
          fundsStore[idx] = {
            ...fundsStore[idx],
            ...data,
            maxQuota: data.maxQuota !== undefined ? Number(data.maxQuota) : fundsStore[idx].maxQuota,
            unitQuota: data.unitQuota !== undefined ? Number(data.unitQuota) : fundsStore[idx].unitQuota,
          };
          return fundsStore[idx];
        }
        return null;
      },
    },
    crmStaff: {
      findMany: async ({ where }: any) => [
        { id: 10, displayName: 'Nguyễn Văn A', username: 'nguyenvana' },
        { id: 20, displayName: 'Trần Thị B', username: 'tranthib' },
      ],
    },
    crmFundRole: {
      create: async ({ data }: any) => {
        rolesStore.push(data);
        return data;
      },
    },
    crmFundRoleAssignment: {
      create: async ({ data }: any) => {
        assignmentsStore.push(data);
        return data;
      },
    },
    $transaction: async (fn: any) => fn(mockCrm),
  };

  // Mock getFundOverview dependencies
  mockCrm.crmFund.findUnique = async ({ where }: any) => {
    const f = fundsStore.find((item) => (where.id ? item.id === where.id : item.code === where.code));
    if (!f) return null;
    return {
      ...f,
      roles: rolesStore.filter((r) => r.fundId === f.id).map((r) => ({ ...r, createdAt: new Date(), updatedAt: new Date() })),
      assignments: assignmentsStore.filter((a) => a.fundId === f.id).map((a) => ({ ...a, createdAt: new Date(), updatedAt: new Date() })),
      periods: [],
      transactions: [],
      proposals: [],
    };
  };

  const actor = { id: 1, name: 'Danny Do', role: 'admin' };

  // 1. Tạo Quỹ mới hợp lệ
  const newFund = await FundService.createFund(
    mockCrm,
    {
      name: 'Quỹ Tiếp Thị Kỹ Thuật Số 2026',
      code: 'FUND_DIGITAL_MARKETING',
      description: 'Chi phí quảng cáo Google & Meta',
      maxQuota: 5000000,
      unitQuota: 200000,
      alertThresholdPercent: 85,
      toleranceMode: 'TOLERANCE_FIXED',
      toleranceAmount: 50000,
      status: 'DRAFT',
      roles: [
        {
          roleKey: 'HOLDER',
          roleName: 'Thủ Quỹ Marketing',
          permissions: ['VIEW', 'PROPOSE'],
          assignedStaffIds: [10],
        },
        {
          roleKey: 'APPROVER',
          roleName: 'Trưởng Phòng Marketing',
          permissions: ['VIEW', 'APPROVE'],
          assignedStaffIds: [20],
        },
      ],
      approvalConfig: {
        enabled: true,
        steps: [
          {
            level: 1,
            name: 'Cấp 1 – Trưởng phòng duyệt',
            approverRoleKey: 'APPROVER',
            requiredAmountAbove: 0,
          },
        ],
      },
    },
    actor
  );

  assert.equal(newFund.code, 'FUND_DIGITAL_MARKETING');
  assert.equal(newFund.name, 'Quỹ Tiếp Thị Kỹ Thuật Số 2026');
  assert.equal(newFund.currentBalance, 0, 'Quỹ mới tạo bắt buộc có số dư 0đ');
  assert.equal(newFund.status, 'DRAFT', 'Quỹ mới tạo mặc định trạng thái DRAFT');
  assert.equal(newFund.maxQuota, 5000000);
  assert.equal(newFund.unitQuota, 200000);
  assert.equal(newFund.toleranceMode, 'TOLERANCE_FIXED');
  assert.equal(newFund.toleranceAmount, 50000);
  assert.equal(newFund.approvalConfig?.enabled, true);
  assert.equal(newFund.approvalConfig?.steps.length, 1);
  assert.equal(newFund.roles?.length, 2);
  assert.equal(newFund.assignments?.length, 2);
  assert.equal(newFund.assignments?.[0].staffName, 'Nguyễn Văn A');

  // 2. Chống trùng mã quỹ (Throws 409 Conflict)
  await assert.rejects(
    async () => {
      await FundService.createFund(
        mockCrm,
        {
          name: 'Quỹ Trùng Mã',
          code: 'FUND_DIGITAL_MARKETING',
          maxQuota: 1000000,
          unitQuota: 50000,
        },
        actor
      );
    },
    (err: any) => err instanceof FundError && err.statusCode === 409
  );

  // 3. Validation lỗi mã quỹ không hợp lệ
  await assert.rejects(
    async () => {
      await FundService.createFund(
        mockCrm,
        {
          name: 'Quỹ Tên Sai',
          code: 'FUND INVALID CODE',
          maxQuota: 1000000,
          unitQuota: 50000,
        },
        actor
      );
    },
    (err: any) => err instanceof FundError && err.message.includes('chỉ được chứa ký tự')
  );

  // 4. Update Fund toàn diện
  const updatedFund = await FundService.updateFund(
    mockCrm,
    newFund.id,
    {
      name: 'Quỹ Tiếp Thị Kỹ Thuật Số Đã Cập Nhật',
      maxQuota: 10000000,
      unitQuota: 500000,
      status: 'ACTIVE',
    },
    actor
  );

  assert.equal(updatedFund.name, 'Quỹ Tiếp Thị Kỹ Thuật Số Đã Cập Nhật');
  assert.equal(updatedFund.maxQuota, 10000000);
  assert.equal(updatedFund.unitQuota, 500000);
  assert.equal(updatedFund.status, 'ACTIVE');
});

test('FundService - activateFund validates requirements and transitions DRAFT -> ACTIVE with first OPEN period (MOS-FEAT-192 Step 3)', async () => {
  let fundStatus = 'DRAFT';
  let createdPeriod: any = null;

  const fundData: any = {
    id: 'fund-draft-test',
    code: 'FUND_DRAFT_TEST',
    name: 'Quỹ Dự Thảo Thử Nghiệm',
    maxQuota: 5000000,
    unitQuota: 200000,
    currentBalance: 0,
    alertThresholdPercent: 80,
    status: fundStatus,
    roles: [{ id: 'role-1', roleKey: 'HOLDER', roleName: 'Thủ quỹ', permissionsJson: '[]' }],
    assignments: [{ id: 'assign-1', roleKey: 'HOLDER', staffId: 99, staffName: 'Thủ Quỹ Test' }],
    periods: [],
    transactions: [],
    proposals: [],
  };

  const mockCrm: any = {
    crmFund: {
      findUnique: async () => ({
        ...fundData,
        status: fundStatus,
        roles: fundData.roles,
        assignments: fundData.assignments,
        periods: createdPeriod ? [createdPeriod] : [],
        transactions: [],
        proposals: [],
      }),
      update: async ({ data }: any) => {
        fundStatus = data.status;
        fundData.status = data.status;
        return { ...fundData, status: fundStatus };
      },
    },
    crmFundPeriod: {
      findFirst: async () => createdPeriod,
      create: async ({ data }: any) => {
        createdPeriod = {
          ...data,
          openingBalance: Number(data.openingBalance),
          systemBalance: Number(data.systemBalance),
          totalIncome: Number(data.totalIncome),
          totalExpense: Number(data.totalExpense),
          closingBalance: null,
          variance: null,
          lockedByStaffId: null,
          lockedByName: null,
          lockedAt: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return createdPeriod;
      },
    },
    $transaction: async (fn: any) => fn(mockCrm),
  };

  const actor = { id: 1, name: 'Admin' };

  // 1. Thất bại nếu quỹ chưa có HOLDER
  const fundWithoutHolder = { ...fundData, roles: [], assignments: [] };
  const mockCrmNoHolder: any = {
    crmFund: { findUnique: async () => fundWithoutHolder },
  };
  await assert.rejects(
    async () => {
      await FundService.activateFund(mockCrmNoHolder, 'fund-draft-test', actor);
    },
    (err: any) => err instanceof FundError && err.message.includes('HOLDER')
  );

  // 2. Kích hoạt thành công khi có đủ điều kiện
  const activated = await FundService.activateFund(mockCrm, 'fund-draft-test', actor);
  assert.equal(activated.status, 'ACTIVE');
  assert.ok(createdPeriod);
  assert.equal(createdPeriod.status, 'OPEN');
  assert.equal(createdPeriod.fundId, 'fund-draft-test');
});

test('FundService - Multi-step Dynamic Approval & Replenishment Receipt Confirmation (MOS-FEAT-192 Step 3-5)', async () => {
  let fundBalance = 100000;
  const transactions: any[] = [];

  const approvalConfig = {
    enabled: true,
    steps: [
      { level: 1, name: 'Quản lý duyệt cấp 1', requiredAmountAbove: 0 },
      { level: 2, name: 'Danny duyệt cấp 2', requiredAmountAbove: 1000000 },
    ],
  };

  const proposal: any = {
    id: 'prop-dyn-1',
    fundId: 'fund-dyn',
    proposalType: 'REPLENISHMENT',
    title: 'Bổ sung vốn quỹ 2 triệu',
    description: 'Cần nạp quỹ hoạt động',
    requestedAmount: 2000000,
    approvedAmount: null,
    actualDisbursedAmount: null,
    status: 'PENDING_APPROVAL',
    currentApprovalLevel: 1,
    approvalsJson: null,
    fund: {
      id: 'fund-dyn',
      name: 'Quỹ Động',
      currentBalance: fundBalance,
      toleranceMode: 'STRICT',
      toleranceAmount: 0,
      approvalConfigJson: JSON.stringify(approvalConfig),
    },
  };

  const mockCrm: any = {
    crmFundProposal: {
      findUnique: async () => proposal,
      update: async ({ data }: any) => {
        Object.assign(proposal, data);
        return { ...proposal, createdAt: new Date(), updatedAt: new Date() };
      },
    },
    crmFund: {
      findUnique: async () => ({ id: 'fund-dyn', name: 'Quỹ Động', currentBalance: fundBalance }),
      update: async ({ data }: any) => {
        fundBalance = Number(data.currentBalance);
        return { id: 'fund-dyn', currentBalance: fundBalance };
      },
    },
    crmFundPeriod: {
      findFirst: async () => ({ id: 'period-dyn-1', status: 'OPEN' }),
      update: async () => ({}),
    },
    crmFundTransaction: {
      create: async ({ data }: any) => {
        transactions.push(data);
        return { ...data, createdAt: new Date() };
      },
    },
    $transaction: async (fn: any) => fn(mockCrm),
  };

  // Bước A: Cấp 1 duyệt -> Vì số tiền 2.000.000đ >= 1.000.000đ của cấp 2, chuyển tiếp sang Level 2 chờ duyệt
  const step1 = await FundService.approveProposal(
    mockCrm,
    'prop-dyn-1',
    { approved: true, approvedAmount: 2000000, note: 'Quản lý OK' },
    { id: 2, name: 'Quản Lý Chi Nhánh' }
  );
  assert.equal(step1.status, 'PENDING_APPROVAL');
  assert.equal(step1.currentApprovalLevel, 2);

  // Bước B: Cấp 2 (Danny) duyệt -> Hoàn tất quy trình duyệt -> Chuyển sang APPROVED
  const step2 = await FundService.approveProposal(
    mockCrm,
    'prop-dyn-1',
    { approved: true, approvedAmount: 2000000, note: 'Danny duyệt' },
    { id: 1, name: 'Danny Do' }
  );
  assert.equal(step2.status, 'APPROVED');

  // Bước C: Kế toán giải ngân -> Trạng thái sang DISBURSED nhưng số dư quỹ CHƯA TĂNG (Bước 3 Invariant)
  const disburseRes = await FundService.disburseProposal(
    mockCrm,
    'prop-dyn-1',
    {
      actualDisbursedAmount: 2000000,
      paymentMethod: 'VCB',
      bankRefCode: 'VCB_DYN_888',
    },
    { id: 4, name: 'Kế toán Bùi Tổng' }
  );
  assert.equal(disburseRes.success, true);
  assert.equal(disburseRes.proposal.status, 'DISBURSED');
  assert.equal(fundBalance, 100000); // Vẫn là 100k, chưa được cộng!

  // Bước D: Thủ quỹ xác nhận nhận tiền -> Trạng thái sang COMPLETED, số dư TĂNG lên 2.100.000đ
  const confirmRes = await FundService.confirmProposalReceipt(
    mockCrm,
    'prop-dyn-1',
    { note: 'Đã nhận đủ 2.000.000đ vào két quỹ' },
    { id: 5, name: 'Thủ Quỹ Chi Nhánh' }
  );
  assert.equal(confirmRes.success, true);
  assert.equal(confirmRes.proposal.status, 'COMPLETED');
  assert.equal(fundBalance, 2100000); // 100k + 2000k
  assert.equal(transactions.length, 1);
  assert.equal(transactions[0].type, 'TOPUP');
  assert.equal(Number(transactions[0].amount), 2000000);
});
