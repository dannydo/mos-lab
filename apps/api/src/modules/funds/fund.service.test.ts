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
      update: async ({ data }: any) => ({
        ...proposal,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
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
