import { Prisma } from '../../../generated/crm-client/index.js';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import type {
  FundPeriod,
  FundTransaction,
  ReconcileAndLockPeriodRequest,
  RecordExpenseRequest,
  SafeAny,
} from '@mos-lab/shared';
import { FundError, type FundActor } from './fund-types.js';

/**
 * Nghiệp vụ Ghi nhận Chi tiêu (Nạp Card Telesale)
 * Chuẩn hóa: Bích Phượng nạp card cho Telesale, kiểm tra số dư chống âm quỹ.
 */
export async function recordExpense(
  crm: CrmPrismaClient,
  fundId: string,
  input: RecordExpenseRequest,
  actor: FundActor
): Promise<{ transaction: FundTransaction; isLowBalance: boolean; alertMessage?: string }> {
  if (!input.amount || input.amount <= 0) {
    throw new FundError('Số tiền chi tiêu phải lớn hơn 0', 400);
  }

  return await crm.$transaction(async (tx) => {
    const fund = await tx.crmFund.findUnique({
      where: { id: fundId },
    });

    if (!fund) throw new FundError(`Quỹ không tồn tại (id: ${fundId})`, 404);
    if (fund.status !== 'ACTIVE') {
      throw new FundError(`Quỹ đang ở trạng thái ${fund.status}, không thể phát sinh giao dịch chi`, 400);
    }

    const currentBalance = Number(fund.currentBalance);
    if (currentBalance < input.amount) {
      throw new FundError(
        `Số dư quỹ hiện tại (${currentBalance.toLocaleString('vi-VN')}đ) không đủ để chi ${input.amount.toLocaleString('vi-VN')}đ. Vui lòng bấm tạo phiếu bổ sung quỹ!`,
        400
      );
    }

    const activePeriod = await tx.crmFundPeriod.findFirst({
      where: { fundId, status: 'OPEN' },
      orderBy: { startDate: 'desc' },
    });

    const newBalance = currentBalance - input.amount;
    const txId = `tx-exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const createdTx = await tx.crmFundTransaction.create({
      data: {
        id: txId,
        fundId,
        periodId: activePeriod?.id || null,
        type: 'EXPENSE',
        amount: new Prisma.Decimal(input.amount),
        balanceBefore: new Prisma.Decimal(currentBalance),
        balanceAfter: new Prisma.Decimal(newBalance),
        description: input.description,
        status: 'COMPLETED',
        beneficiaryStaffId: input.beneficiaryStaffId || null,
        beneficiaryStaffName: input.beneficiaryStaffName || null,
        beneficiaryPhone: input.beneficiaryPhone || null,
        telco: input.telco || null,
        receiptUrlsJson: input.receiptUrls ? JSON.stringify(input.receiptUrls) : null,
        actorStaffId: actor.id,
        actorStaffName: actor.name,
      },
    });

    // Cập nhật số dư quỹ
    await tx.crmFund.update({
      where: { id: fundId },
      data: { currentBalance: new Prisma.Decimal(newBalance) },
    });

    // Cập nhật tổng chi trong kỳ
    if (activePeriod) {
      await tx.crmFundPeriod.update({
        where: { id: activePeriod.id },
        data: {
          totalExpense: { increment: new Prisma.Decimal(input.amount) },
          systemBalance: new Prisma.Decimal(newBalance),
        },
      });
    }

    const maxQuota = Number(fund.maxQuota);
    const usedAmount = Math.max(0, maxQuota - newBalance);
    const usedPercent = maxQuota > 0 ? Math.round((usedAmount / maxQuota) * 100) : 0;
    const isLowBalance =
      usedPercent >= fund.alertThresholdPercent || newBalance <= (maxQuota * (100 - fund.alertThresholdPercent)) / 100;

    let alertMessage: string | undefined;
    if (isLowBalance) {
      alertMessage = `Cảnh báo: Số dư Quỹ ${fund.name} còn ${newBalance.toLocaleString('vi-VN')}đ (Đã dùng ${usedPercent}% hạn mức). Đã chạm ngưỡng ${fund.alertThresholdPercent}%, đề nghị tạo phiếu bổ sung quỹ.`;
    }

    return {
      transaction: {
        id: createdTx.id,
        fundId: createdTx.fundId,
        periodId: createdTx.periodId,
        proposalId: createdTx.proposalId,
        type: createdTx.type as SafeAny,
        amount: Number(createdTx.amount),
        balanceBefore: Number(createdTx.balanceBefore),
        balanceAfter: Number(createdTx.balanceAfter),
        description: createdTx.description,
        status: createdTx.status as SafeAny,
        beneficiaryStaffId: createdTx.beneficiaryStaffId,
        beneficiaryStaffName: createdTx.beneficiaryStaffName,
        beneficiaryPhone: createdTx.beneficiaryPhone,
        telco: createdTx.telco,
        receiptUrls: createdTx.receiptUrlsJson ? JSON.parse(createdTx.receiptUrlsJson) : [],
        actorStaffId: createdTx.actorStaffId,
        actorStaffName: createdTx.actorStaffName,
        createdAt: createdTx.createdAt.toISOString(),
      },
      isLowBalance,
      alertMessage,
    };
  });
}

/**
 * CƠ CHẾ KIỂM SOÁT 3: Đối Soát, Xử Lý Chênh Lệch & Chốt Kỳ Sổ Quỹ (Period Lock)
 * - So khớp actualBalance vs systemBalance.
 * - Nếu variance != 0: Bắt buộc lập bút toán điều chỉnh (ADJUSTMENT).
 * - Chốt kỳ -> Khóa cứng toàn bộ giao dịch trong kỳ, chuyển số dư sang kỳ mới.
 */
export async function reconcileAndLockPeriod(
  crm: CrmPrismaClient,
  fundId: string,
  periodId: string,
  input: ReconcileAndLockPeriodRequest,
  actor: FundActor
): Promise<{
  closedPeriod: FundPeriod;
  nextPeriod: FundPeriod;
  variance: number;
  adjustmentTransaction?: FundTransaction;
}> {
  if (input.actualBalance === undefined || input.actualBalance === null || input.actualBalance < 0) {
    throw new FundError('Số dư kiểm kê thực tế không hợp lệ', 400);
  }

  return await crm.$transaction(async (tx) => {
    const period = await tx.crmFundPeriod.findUnique({
      where: { id: periodId },
      include: { fund: true },
    });

    if (!period) throw new FundError(`Kỳ kế toán không tồn tại (id: ${periodId})`, 404);
    if (period.status === 'LOCKED') {
      throw new FundError('Kỳ kế toán này đã được chốt và khóa sổ, bất biến lịch sử', 400);
    }

    const systemBalance = Number(period.fund.currentBalance);
    const actualBalance = Number(input.actualBalance);
    const variance = actualBalance - systemBalance;

    let adjustmentTx: FundTransaction | undefined;

    // 1. Xử lý chênh lệch nếu có (Variance != 0)
    if (variance !== 0) {
      const adjTxId = `tx-adj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const adjDescription = `Bút toán điều chỉnh kiểm kê kỳ ${period.periodName}: ${
        variance > 0 ? 'Thừa' : 'Hụt'
      } ${Math.abs(variance).toLocaleString('vi-VN')}đ. Giải trình: ${input.notes || 'Đối soát cuối kỳ'}`;

      const createdAdj = await tx.crmFundTransaction.create({
        data: {
          id: adjTxId,
          fundId,
          periodId: period.id,
          type: 'ADJUSTMENT',
          amount: new Prisma.Decimal(Math.abs(variance)),
          balanceBefore: new Prisma.Decimal(systemBalance),
          balanceAfter: new Prisma.Decimal(actualBalance),
          description: adjDescription,
          status: 'LOCKED', // Khóa ngay lập tức
          actorStaffId: actor.id,
          actorStaffName: actor.name,
        },
      });

      // Điều chỉnh số dư quỹ khớp với thực tế
      await tx.crmFund.update({
        where: { id: fundId },
        data: { currentBalance: new Prisma.Decimal(actualBalance) },
      });

      adjustmentTx = {
        id: createdAdj.id,
        fundId: createdAdj.fundId,
        periodId: createdAdj.periodId,
        proposalId: createdAdj.proposalId,
        type: 'ADJUSTMENT',
        amount: Number(createdAdj.amount),
        balanceBefore: Number(createdAdj.balanceBefore),
        balanceAfter: Number(createdAdj.balanceAfter),
        description: createdAdj.description,
        status: 'LOCKED',
        beneficiaryStaffId: null,
        beneficiaryStaffName: null,
        beneficiaryPhone: null,
        telco: null,
        receiptUrls: [],
        actorStaffId: createdAdj.actorStaffId,
        actorStaffName: createdAdj.actorStaffName,
        createdAt: createdAdj.createdAt.toISOString(),
      };
    }

    // 2. Khóa tất cả giao dịch trong kỳ hiện tại
    await tx.crmFundTransaction.updateMany({
      where: { periodId: period.id },
      data: { status: 'LOCKED' },
    });

    // 3. Khóa sổ kỳ hiện tại (PERIOD LOCK)
    const now = new Date();
    const updatedPeriod = await tx.crmFundPeriod.update({
      where: { id: periodId },
      data: {
        status: 'LOCKED',
        systemBalance: new Prisma.Decimal(systemBalance),
        actualBalance: new Prisma.Decimal(actualBalance),
        closingBalance: new Prisma.Decimal(actualBalance),
        variance: new Prisma.Decimal(variance),
        lockedByStaffId: actor.id,
        lockedByName: actor.name,
        lockedAt: now,
        notes: input.notes,
      },
    });

    // 4. Tạo Kỳ kế toán tiếp theo và kết chuyển số dư đầu kỳ
    const nextStartDate = new Date(period.endDate.getTime() + 1000);
    const nextMonth = nextStartDate.getMonth() + 1;
    const nextYear = nextStartDate.getFullYear();
    const nextEndDate = new Date(nextYear, nextStartDate.getMonth() + 1, 0, 23, 59, 59);
    const nextPeriodName = `Kỳ Tháng ${nextMonth}/${nextYear}`;
    const nextPeriodId = `${fundId}-period-${nextYear}-${String(nextMonth).padStart(2, '0')}`;

    const createdNextPeriod = await tx.crmFundPeriod.create({
      data: {
        id: nextPeriodId,
        fundId,
        periodName: nextPeriodName,
        startDate: nextStartDate,
        endDate: nextEndDate,
        openingBalance: new Prisma.Decimal(actualBalance),
        totalIncome: new Prisma.Decimal(0),
        totalExpense: new Prisma.Decimal(0),
        systemBalance: new Prisma.Decimal(actualBalance),
        status: 'OPEN',
      },
    });

    return {
      closedPeriod: {
        id: updatedPeriod.id,
        fundId: updatedPeriod.fundId,
        periodName: updatedPeriod.periodName,
        startDate: updatedPeriod.startDate.toISOString(),
        endDate: updatedPeriod.endDate.toISOString(),
        openingBalance: Number(updatedPeriod.openingBalance),
        closingBalance: Number(updatedPeriod.closingBalance),
        totalIncome: Number(updatedPeriod.totalIncome),
        totalExpense: Number(updatedPeriod.totalExpense),
        systemBalance: Number(updatedPeriod.systemBalance),
        actualBalance: Number(updatedPeriod.actualBalance),
        variance: Number(updatedPeriod.variance),
        status: 'LOCKED',
        lockedByStaffId: updatedPeriod.lockedByStaffId,
        lockedByName: updatedPeriod.lockedByName,
        lockedAt: updatedPeriod.lockedAt?.toISOString() || null,
        notes: updatedPeriod.notes,
        createdAt: updatedPeriod.createdAt.toISOString(),
        updatedAt: updatedPeriod.updatedAt.toISOString(),
      },
      nextPeriod: {
        id: createdNextPeriod.id,
        fundId: createdNextPeriod.fundId,
        periodName: createdNextPeriod.periodName,
        startDate: createdNextPeriod.startDate.toISOString(),
        endDate: createdNextPeriod.endDate.toISOString(),
        openingBalance: Number(createdNextPeriod.openingBalance),
        closingBalance: null,
        totalIncome: 0,
        totalExpense: 0,
        systemBalance: Number(createdNextPeriod.systemBalance),
        actualBalance: null,
        variance: null,
        status: 'OPEN',
        lockedByStaffId: null,
        lockedByName: null,
        lockedAt: null,
        notes: null,
        createdAt: createdNextPeriod.createdAt.toISOString(),
        updatedAt: createdNextPeriod.updatedAt.toISOString(),
      },
      variance,
      adjustmentTransaction: adjustmentTx,
    };
  });
}
