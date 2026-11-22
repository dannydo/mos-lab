import { Prisma } from '../../../generated/crm-client/index.js';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import type {
  Fund,
  FundPeriod,
  FundProposal,
  FundRole,
  FundRoleAssignment,
  FundTransaction,
  SafeAny,
} from '@mos-lab/shared';
import { FundError, type FundActor } from './fund-types.js';

/**
 * @deprecated Vô hiệu hóa khởi tạo tự động theo Bước 1 Tái cấu trúc Quản lý Quỹ (MOS-BUG-174).
 * Không tự động tạo Quỹ Nạp Card Telesale giả lập nữa. Quỹ phải do Quản trị viên thiết lập.
 */
export async function ensureDefaultFund(_crm: CrmPrismaClient): Promise<void> {
  // Disabled per MOS-BUG-174: All funds must be explicitly configured.
  return;
}

/**
 * Danh sách toàn bộ quỹ hoạt động nội bộ
 */
export async function listFunds(crm: CrmPrismaClient): Promise<Fund[]> {
  const funds = await crm.crmFund.findMany({
    include: {
      roles: true,
      assignments: true,
      periods: {
        where: { status: 'OPEN' },
        take: 1,
        orderBy: { startDate: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return funds.map((f) => {
    const currentBalance = Number(f.currentBalance);
    const maxQuota = Number(f.maxQuota);
    const unitQuota = Number(f.unitQuota);
    const alertThresholdPercent = f.alertThresholdPercent;
    const usedAmount = Math.max(0, maxQuota - currentBalance);
    const usedPercent = maxQuota > 0 ? Math.min(100, Math.round((usedAmount / maxQuota) * 100)) : 0;
    const isLowBalance =
      usedPercent >= alertThresholdPercent || currentBalance <= (maxQuota * (100 - alertThresholdPercent)) / 100;

    const roles: FundRole[] = f.roles.map((r) => ({
      id: r.id,
      fundId: r.fundId,
      roleKey: r.roleKey,
      roleName: r.roleName,
      permissions: r.permissionsJson ? JSON.parse(r.permissionsJson) : [],
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    const assignments: FundRoleAssignment[] = f.assignments.map((a) => ({
      id: a.id,
      fundId: a.fundId,
      roleKey: a.roleKey,
      staffId: a.staffId,
      staffName: a.staffName,
      assignedByStaffId: a.assignedByStaffId,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    const activePeriod = f.periods[0];
    const currentPeriod: FundPeriod | null = activePeriod
      ? {
          id: activePeriod.id,
          fundId: activePeriod.fundId,
          periodName: activePeriod.periodName,
          startDate: activePeriod.startDate.toISOString(),
          endDate: activePeriod.endDate.toISOString(),
          openingBalance: Number(activePeriod.openingBalance),
          closingBalance: activePeriod.closingBalance ? Number(activePeriod.closingBalance) : null,
          totalIncome: Number(activePeriod.totalIncome),
          totalExpense: Number(activePeriod.totalExpense),
          systemBalance: activePeriod.systemBalance ? Number(activePeriod.systemBalance) : null,
          actualBalance: activePeriod.actualBalance ? Number(activePeriod.actualBalance) : null,
          variance: activePeriod.variance ? Number(activePeriod.variance) : null,
          status: activePeriod.status as SafeAny,
          lockedByStaffId: activePeriod.lockedByStaffId,
          lockedByName: activePeriod.lockedByName,
          lockedAt: activePeriod.lockedAt?.toISOString() || null,
          notes: activePeriod.notes,
          createdAt: activePeriod.createdAt.toISOString(),
          updatedAt: activePeriod.updatedAt.toISOString(),
        }
      : null;

    return {
      id: f.id,
      code: f.code,
      name: f.name,
      description: f.description,
      currentBalance,
      maxQuota,
      unitQuota,
      alertThresholdPercent,
      toleranceMode: f.toleranceMode as SafeAny,
      toleranceAmount: Number(f.toleranceAmount),
      approvalConfig: f.approvalConfigJson ? JSON.parse(f.approvalConfigJson) : null,
      status: f.status as SafeAny,
      isLowBalance,
      usedAmount,
      usedPercent,
      roles,
      assignments,
      currentPeriod,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    };
  });
}

/**
 * Chi tiết & Tổng quan một Quỹ
 */
export async function getFundOverview(
  crm: CrmPrismaClient,
  fundId: string
): Promise<Fund & { recentTransactions: FundTransaction[]; pendingProposals: FundProposal[] }> {
  const f = await crm.crmFund.findUnique({
    where: { id: fundId },
    include: {
      roles: true,
      assignments: true,
      periods: {
        where: { status: 'OPEN' },
        take: 1,
        orderBy: { startDate: 'desc' },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
      proposals: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!f) throw new FundError(`Quỹ không tồn tại (id: ${fundId})`, 404);

  const currentBalance = Number(f.currentBalance);
  const maxQuota = Number(f.maxQuota);
  const unitQuota = Number(f.unitQuota);
  const alertThresholdPercent = f.alertThresholdPercent;
  const usedAmount = Math.max(0, maxQuota - currentBalance);
  const usedPercent = maxQuota > 0 ? Math.min(100, Math.round((usedAmount / maxQuota) * 100)) : 0;
  const isLowBalance =
    usedPercent >= alertThresholdPercent || currentBalance <= (maxQuota * (100 - alertThresholdPercent)) / 100;

  const roles: FundRole[] = f.roles.map((r) => ({
    id: r.id,
    fundId: r.fundId,
    roleKey: r.roleKey,
    roleName: r.roleName,
    permissions: r.permissionsJson ? JSON.parse(r.permissionsJson) : [],
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
  }));

  const assignments: FundRoleAssignment[] = f.assignments.map((a) => ({
    id: a.id,
    fundId: a.fundId,
    roleKey: a.roleKey,
    staffId: a.staffId,
    staffName: a.staffName,
    assignedByStaffId: a.assignedByStaffId,
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : new Date().toISOString(),
  }));

  const activePeriod = f.periods[0];
  const currentPeriod: FundPeriod | null = activePeriod
    ? {
        id: activePeriod.id,
        fundId: activePeriod.fundId,
        periodName: activePeriod.periodName,
        startDate: activePeriod.startDate.toISOString(),
        endDate: activePeriod.endDate.toISOString(),
        openingBalance: Number(activePeriod.openingBalance),
        closingBalance: activePeriod.closingBalance ? Number(activePeriod.closingBalance) : null,
        totalIncome: Number(activePeriod.totalIncome),
        totalExpense: Number(activePeriod.totalExpense),
        systemBalance: activePeriod.systemBalance ? Number(activePeriod.systemBalance) : null,
        actualBalance: activePeriod.actualBalance ? Number(activePeriod.actualBalance) : null,
        variance: activePeriod.variance ? Number(activePeriod.variance) : null,
        status: activePeriod.status as SafeAny,
        lockedByStaffId: activePeriod.lockedByStaffId,
        lockedByName: activePeriod.lockedByName,
        lockedAt: activePeriod.lockedAt?.toISOString() || null,
        notes: activePeriod.notes,
        createdAt: activePeriod.createdAt.toISOString(),
        updatedAt: activePeriod.updatedAt.toISOString(),
      }
    : null;

  const recentTransactions: FundTransaction[] = f.transactions.map((t) => ({
    id: t.id,
    fundId: t.fundId,
    periodId: t.periodId,
    proposalId: t.proposalId,
    type: t.type as SafeAny,
    amount: Number(t.amount),
    balanceBefore: Number(t.balanceBefore),
    balanceAfter: Number(t.balanceAfter),
    description: t.description,
    status: t.status as SafeAny,
    beneficiaryStaffId: t.beneficiaryStaffId,
    beneficiaryStaffName: t.beneficiaryStaffName,
    beneficiaryPhone: t.beneficiaryPhone,
    telco: t.telco,
    receiptUrls: t.receiptUrlsJson ? JSON.parse(t.receiptUrlsJson) : [],
    actorStaffId: t.actorStaffId,
    actorStaffName: t.actorStaffName,
    createdAt: t.createdAt.toISOString(),
  }));

  const pendingProposals: FundProposal[] = f.proposals.map((p) => ({
    id: p.id,
    fundId: p.fundId,
    proposalType: p.proposalType as SafeAny,
    title: p.title,
    description: p.description,
    requestedAmount: Number(p.requestedAmount),
    approvedAmount: p.approvedAmount ? Number(p.approvedAmount) : null,
    actualDisbursedAmount: p.actualDisbursedAmount ? Number(p.actualDisbursedAmount) : null,
    status: p.status as SafeAny,
    currentApprovalLevel: p.currentApprovalLevel,
    approvals: p.approvalsJson ? JSON.parse(p.approvalsJson) : [],
    disbursedByStaffId: p.disbursedByStaffId,
    disbursedByName: p.disbursedByName,
    disbursedAt: p.disbursedAt?.toISOString() || null,
    paymentMethod: p.paymentMethod,
    bankRefCode: p.bankRefCode,
    disbursementReceiptUrls: p.disbursementReceiptUrlsJson ? JSON.parse(p.disbursementReceiptUrlsJson) : [],
    disbursementNote: p.disbursementNote,
    reapprovalReason: p.reapprovalReason,
    createdByStaffId: p.createdByStaffId,
    createdByName: p.createdByName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return {
    id: f.id,
    code: f.code,
    name: f.name,
    description: f.description,
    currentBalance,
    maxQuota,
    unitQuota,
    alertThresholdPercent,
    toleranceMode: f.toleranceMode as SafeAny,
    toleranceAmount: Number(f.toleranceAmount),
    approvalConfig: f.approvalConfigJson ? JSON.parse(f.approvalConfigJson) : null,
    status: f.status as SafeAny,
    isLowBalance,
    usedAmount,
    usedPercent,
    roles,
    assignments,
    currentPeriod,
    createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: f.updatedAt ? new Date(f.updatedAt).toISOString() : new Date().toISOString(),
    recentTransactions,
    pendingProposals,
  };
}

/**
 * Kích hoạt Quỹ từ trạng thái DRAFT / FROZEN -> ACTIVE (Bước 3)
 * - Kiểm tra các điều kiện bắt buộc:
 *   + Hạn mức tối đa > 0.
 *   + Có ít nhất 1 Thủ quỹ / Người giữ quỹ (HOLDER).
 * - Tự động mở kỳ sổ quỹ đầu tiên nếu chưa có kỳ nào mở.
 */
export async function activateFund(
  crm: CrmPrismaClient,
  fundId: string,
  _actor: FundActor
): Promise<Fund & { recentTransactions: FundTransaction[]; pendingProposals: FundProposal[] }> {
  const fund = await crm.crmFund.findUnique({
    where: { id: fundId },
    include: {
      roles: true,
      assignments: true,
    },
  });

  if (!fund) throw new FundError(`Quỹ không tồn tại (id: ${fundId})`, 404);
  if (fund.status === 'ACTIVE') {
    return await getFundOverview(crm, fundId);
  }

  const maxQuota = Number(fund.maxQuota);
  if (maxQuota <= 0) {
    throw new FundError('Hạn mức tối đa của quỹ phải lớn hơn 0 trước khi kích hoạt', 400);
  }

  const hasHolder =
    fund.assignments.some((a) => a.roleKey === 'HOLDER') || fund.roles.some((r) => r.roleKey === 'HOLDER');
  if (!hasHolder) {
    throw new FundError(
      'Quỹ bắt buộc phải được phân công ít nhất 1 Thủ quỹ / Người giữ quỹ (HOLDER) trước khi kích hoạt',
      400
    );
  }

  await crm.$transaction(async (tx) => {
    await tx.crmFund.update({
      where: { id: fundId },
      data: { status: 'ACTIVE' },
    });

    const existingPeriod = await tx.crmFundPeriod.findFirst({
      where: { fundId, status: 'OPEN' },
    });

    if (!existingPeriod) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const startDate = new Date(year, now.getMonth(), 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      const periodName = `Kỳ Tháng ${month}/${year}`;
      const periodId = `${fundId}-period-${year}-${String(month).padStart(2, '0')}`;

      await tx.crmFundPeriod.create({
        data: {
          id: periodId,
          fundId,
          periodName,
          startDate,
          endDate,
          openingBalance: new Prisma.Decimal(fund.currentBalance || 0),
          systemBalance: new Prisma.Decimal(fund.currentBalance || 0),
          totalIncome: new Prisma.Decimal(0),
          totalExpense: new Prisma.Decimal(0),
          status: 'OPEN',
        },
      });
    }
  });

  return await getFundOverview(crm, fundId);
}
