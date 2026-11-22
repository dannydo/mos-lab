import { Prisma } from '../../../generated/crm-client/index.js';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import type { ConfirmReceiptRequest, DisburseProposalRequest, FundProposal, SafeAny } from '@mos-lab/shared';
import { FundError, type FundActor } from './fund-types.js';

/**
 * CƠ CHẾ KIỂM SOÁT 2: Thực Thi Giải Ngân Kế Toán & Kiểm Soát Dung Sai (Tolerance Control)
 * - Kế toán (Bùi Tổng) xác nhận tiền đã ra khỏi tài khoản/két: bắt buộc mã GD, bill, kênh chuyển.
 * - Nếu actual > approved + tolerance => Tự động KHÓA và chuyển PENDING_REAPPROVAL.
 * - Chỉ cập nhật số dư khi có cờ autoConfirmReceipt hoặc khi Thủ quỹ xác nhận nhận tiền (Bước 3).
 */
export async function disburseProposal(
  crm: CrmPrismaClient,
  proposalId: string,
  input: DisburseProposalRequest,
  actor: FundActor
): Promise<{ success: boolean; proposal: FundProposal; reapprovalRequired?: boolean; message?: string }> {
  if (!input.actualDisbursedAmount || input.actualDisbursedAmount <= 0) {
    throw new FundError('Số tiền thực chuyển giải ngân phải lớn hơn 0', 400);
  }
  if (!input.bankRefCode || !input.bankRefCode.trim()) {
    throw new FundError('Bắt buộc điền Mã giao dịch ngân hàng / Mã chuẩn chi để lưu vết kiểm toán', 400);
  }
  if (!input.paymentMethod || !input.paymentMethod.trim()) {
    throw new FundError('Bắt buộc chọn Kênh chuyển tiền (VCB, MoMo, Tiền mặt...)', 400);
  }

  const proposal = await crm.crmFundProposal.findUnique({
    where: { id: proposalId },
    include: { fund: true },
  });

  if (!proposal) throw new FundError(`Phiếu đề xuất không tồn tại (id: ${proposalId})`, 404);
  if (proposal.status !== 'APPROVED') {
    throw new FundError(
      `Phiếu đề xuất chưa được duyệt hoặc đang ở trạng thái ${proposal.status}, không thể giải ngân`,
      400
    );
  }

  const approvedAmount = Number(proposal.approvedAmount);
  const toleranceAmount = proposal.fund.toleranceMode === 'TOLERANCE_FIXED' ? Number(proposal.fund.toleranceAmount) : 0;
  const maxAllowedAmount = approvedAmount + toleranceAmount;

  // KIỂM TRA DUNG SAI (Tolerance Invariant)
  if (input.actualDisbursedAmount > maxAllowedAmount) {
    const reason = `Số tiền thực chuyển (${input.actualDisbursedAmount.toLocaleString('vi-VN')}đ) vượt quá Hạn mức duyệt (${approvedAmount.toLocaleString('vi-VN')}đ) + Dung sai cho phép (${toleranceAmount.toLocaleString('vi-VN')}đ). Hệ thống tự động khóa giải ngân và chuyển sang Chờ duyệt lại.`;

    const reapprovalProposal = await crm.crmFundProposal.update({
      where: { id: proposalId },
      data: {
        status: 'PENDING_REAPPROVAL',
        actualDisbursedAmount: new Prisma.Decimal(input.actualDisbursedAmount),
        reapprovalReason: reason,
      },
    });

    return {
      success: false,
      reapprovalRequired: true,
      message: reason,
      proposal: {
        id: reapprovalProposal.id,
        fundId: reapprovalProposal.fundId,
        proposalType: reapprovalProposal.proposalType as SafeAny,
        title: reapprovalProposal.title,
        description: reapprovalProposal.description,
        requestedAmount: Number(reapprovalProposal.requestedAmount),
        approvedAmount: Number(reapprovalProposal.approvedAmount),
        actualDisbursedAmount: Number(reapprovalProposal.actualDisbursedAmount),
        status: 'PENDING_REAPPROVAL',
        currentApprovalLevel: reapprovalProposal.currentApprovalLevel,
        approvals: reapprovalProposal.approvalsJson ? JSON.parse(reapprovalProposal.approvalsJson) : [],
        disbursedByStaffId: null,
        disbursedByName: null,
        disbursedAt: null,
        paymentMethod: input.paymentMethod,
        bankRefCode: input.bankRefCode,
        disbursementReceiptUrls: input.disbursementReceiptUrls || [],
        disbursementNote: input.disbursementNote,
        reapprovalReason: reason,
        createdByStaffId: reapprovalProposal.createdByStaffId,
        createdByName: reapprovalProposal.createdByName,
        createdAt: reapprovalProposal.createdAt.toISOString(),
        updatedAt: reapprovalProposal.updatedAt.toISOString(),
      },
    };
  }

  // Thực thi giải ngân hợp lệ trong dung sai
  return await crm.$transaction(async (tx) => {
    const fund = await tx.crmFund.findUnique({ where: { id: proposal.fundId } });
    if (!fund) throw new FundError('Quỹ không tồn tại', 404);

    const disbursedAt = input.disbursedAt ? new Date(input.disbursedAt) : new Date();

    // 1. Cập nhật phiếu sang DISBURSED
    const updated = await tx.crmFundProposal.update({
      where: { id: proposalId },
      data: {
        status: 'DISBURSED',
        actualDisbursedAmount: new Prisma.Decimal(input.actualDisbursedAmount),
        disbursedAt,
        paymentMethod: input.paymentMethod,
        bankRefCode: input.bankRefCode,
        disbursementReceiptUrlsJson: input.disbursementReceiptUrls
          ? JSON.stringify(input.disbursementReceiptUrls)
          : null,
        disbursementNote: input.disbursementNote || null,
        disbursedByStaffId: actor.id,
        disbursedByName: actor.name,
        reapprovalReason: null,
      },
    });

    let newBalance = Number(fund.currentBalance);

    // Nếu có cờ autoConfirmReceipt: thực hiện cập nhật số dư ngay (cho backward compatibility hoặc auto flow)
    if (input.autoConfirmReceipt) {
      newBalance = Number(fund.currentBalance) + input.actualDisbursedAmount;
      const activePeriod = await tx.crmFundPeriod.findFirst({
        where: { fundId: fund.id, status: 'OPEN' },
        orderBy: { startDate: 'desc' },
      });

      const txId = `tx-topup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await tx.crmFundTransaction.create({
        data: {
          id: txId,
          fundId: fund.id,
          periodId: activePeriod?.id || null,
          proposalId: proposal.id,
          type: 'TOPUP',
          amount: new Prisma.Decimal(input.actualDisbursedAmount),
          balanceBefore: fund.currentBalance,
          balanceAfter: new Prisma.Decimal(newBalance),
          description: `Giải ngân bổ sung vốn theo phiếu: ${proposal.title} (Mã GD: ${input.bankRefCode})`,
          status: 'COMPLETED',
          receiptUrlsJson: input.disbursementReceiptUrls ? JSON.stringify(input.disbursementReceiptUrls) : null,
          actorStaffId: actor.id,
          actorStaffName: actor.name,
        },
      });

      await tx.crmFund.update({
        where: { id: fund.id },
        data: { currentBalance: new Prisma.Decimal(newBalance) },
      });

      if (activePeriod) {
        await tx.crmFundPeriod.update({
          where: { id: activePeriod.id },
          data: {
            totalIncome: { increment: new Prisma.Decimal(input.actualDisbursedAmount) },
            systemBalance: new Prisma.Decimal(newBalance),
          },
        });
      }
    }

    return {
      success: true,
      proposal: {
        id: updated.id,
        fundId: updated.fundId,
        proposalType: updated.proposalType as SafeAny,
        title: updated.title,
        description: updated.description,
        requestedAmount: Number(updated.requestedAmount),
        approvedAmount: Number(updated.approvedAmount),
        actualDisbursedAmount: Number(updated.actualDisbursedAmount),
        status: 'DISBURSED',
        currentApprovalLevel: updated.currentApprovalLevel,
        approvals: updated.approvalsJson ? JSON.parse(updated.approvalsJson) : [],
        disbursedByStaffId: updated.disbursedByStaffId,
        disbursedByName: updated.disbursedByName,
        disbursedAt: updated.disbursedAt?.toISOString() || null,
        paymentMethod: updated.paymentMethod,
        bankRefCode: updated.bankRefCode,
        disbursementReceiptUrls: input.disbursementReceiptUrls || [],
        disbursementNote: updated.disbursementNote,
        reapprovalReason: null,
        createdByStaffId: updated.createdByStaffId,
        createdByName: updated.createdByName,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
      message: input.autoConfirmReceipt
        ? `Giải ngân thành công ${input.actualDisbursedAmount.toLocaleString('vi-VN')}đ vào Quỹ ${fund.name}. Số dư mới: ${newBalance.toLocaleString('vi-VN')}đ.`
        : `Kế toán đã giải ngân ${input.actualDisbursedAmount.toLocaleString('vi-VN')}đ. Đang chờ Thủ quỹ xác nhận thực nhận tiền để ghi tăng số dư.`,
    };
  });
}

/**
 * CƠ CHẾ 2B: Thủ quỹ xác nhận thực nhận tiền (Bước 3)
 * - Chỉ cập nhật số dư thực tế của quỹ KHI VÀ CHỈ KHI Thủ quỹ xác nhận nhận tiền.
 */
export async function confirmProposalReceipt(
  crm: CrmPrismaClient,
  proposalId: string,
  input: ConfirmReceiptRequest,
  actor: FundActor
): Promise<{ success: boolean; proposal: FundProposal; message: string; newBalance: number }> {
  const proposal = await crm.crmFundProposal.findUnique({
    where: { id: proposalId },
    include: { fund: true },
  });

  if (!proposal) throw new FundError(`Phiếu đề xuất không tồn tại (id: ${proposalId})`, 404);
  if (proposal.status !== 'DISBURSED') {
    throw new FundError(
      `Phiếu đề xuất đang ở trạng thái ${proposal.status}, chỉ có thể xác nhận nhận tiền khi phiếu ở trạng thái ĐÃ GIẢI NGÂN (DISBURSED)`,
      400
    );
  }

  const disbursedAmount = Number(proposal.actualDisbursedAmount || proposal.approvedAmount || proposal.requestedAmount);
  if (disbursedAmount <= 0) {
    throw new FundError('Số tiền giải ngân trên phiếu không hợp lệ', 400);
  }

  return await crm.$transaction(async (tx) => {
    const fund = await tx.crmFund.findUnique({ where: { id: proposal.fundId } });
    if (!fund) throw new FundError('Quỹ không tồn tại', 404);

    const currentBalance = Number(fund.currentBalance);
    const newBalance = currentBalance + disbursedAmount;

    let activePeriod = await tx.crmFundPeriod.findFirst({
      where: { fundId: fund.id, status: 'OPEN' },
      orderBy: { startDate: 'desc' },
    });

    if (!activePeriod) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      activePeriod = await tx.crmFundPeriod.create({
        data: {
          id: `${fund.id}-period-${year}-${String(month).padStart(2, '0')}`,
          fundId: fund.id,
          periodName: `Kỳ Tháng ${month}/${year}`,
          startDate: new Date(year, now.getMonth(), 1),
          endDate: new Date(year, month, 0, 23, 59, 59),
          openingBalance: new Prisma.Decimal(currentBalance),
          systemBalance: new Prisma.Decimal(newBalance),
          totalIncome: new Prisma.Decimal(disbursedAmount),
          totalExpense: new Prisma.Decimal(0),
          status: 'OPEN',
        },
      });
    }

    // 1. Tạo giao dịch TOPUP vào sổ quỹ
    const txId = `tx-topup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await tx.crmFundTransaction.create({
      data: {
        id: txId,
        fundId: fund.id,
        periodId: activePeriod?.id || null,
        proposalId: proposal.id,
        type: 'TOPUP',
        amount: new Prisma.Decimal(disbursedAmount),
        balanceBefore: new Prisma.Decimal(currentBalance),
        balanceAfter: new Prisma.Decimal(newBalance),
        description: `Thủ quỹ xác nhận thực nhận vốn bổ sung theo phiếu: ${proposal.title} (Mã GD: ${proposal.bankRefCode || 'N/A'})`,
        status: 'COMPLETED',
        receiptUrlsJson: proposal.disbursementReceiptUrlsJson,
        actorStaffId: actor.id,
        actorStaffName: actor.name,
      },
    });

    // 2. Tăng số dư thực tế của quỹ
    await tx.crmFund.update({
      where: { id: fund.id },
      data: { currentBalance: new Prisma.Decimal(newBalance) },
    });

    // 3. Tăng tổng thu trong kỳ
    if (activePeriod) {
      await tx.crmFundPeriod.update({
        where: { id: activePeriod.id },
        data: {
          totalIncome: { increment: new Prisma.Decimal(disbursedAmount) },
          systemBalance: new Prisma.Decimal(newBalance),
        },
      });
    }

    // 4. Cập nhật phiếu sang COMPLETED
    const existingApprovals = proposal.approvalsJson ? JSON.parse(proposal.approvalsJson) : [];
    existingApprovals.push({
      level: proposal.currentApprovalLevel + 1,
      staffId: actor.id,
      staffName: actor.name,
      status: 'CONFIRMED_RECEIVED',
      note: input.note || 'Thủ quỹ xác nhận đã nhận đủ tiền',
      timestamp: new Date().toISOString(),
    });

    const updated = await tx.crmFundProposal.update({
      where: { id: proposalId },
      data: {
        status: 'COMPLETED',
        approvalsJson: JSON.stringify(existingApprovals),
      },
    });

    return {
      success: true,
      message: `Thủ quỹ đã xác nhận nhận ${disbursedAmount.toLocaleString('vi-VN')}đ. Số dư Quỹ cập nhật thành công: ${newBalance.toLocaleString('vi-VN')}đ.`,
      newBalance,
      proposal: {
        id: updated.id,
        fundId: updated.fundId,
        proposalType: updated.proposalType as SafeAny,
        title: updated.title,
        description: updated.description,
        requestedAmount: Number(updated.requestedAmount),
        approvedAmount: updated.approvedAmount ? Number(updated.approvedAmount) : null,
        actualDisbursedAmount: updated.actualDisbursedAmount ? Number(updated.actualDisbursedAmount) : null,
        status: 'COMPLETED',
        currentApprovalLevel: updated.currentApprovalLevel,
        approvals: existingApprovals,
        disbursedByStaffId: updated.disbursedByStaffId,
        disbursedByName: updated.disbursedByName,
        disbursedAt: updated.disbursedAt?.toISOString() || null,
        paymentMethod: updated.paymentMethod,
        bankRefCode: updated.bankRefCode,
        disbursementReceiptUrls: updated.disbursementReceiptUrlsJson
          ? JSON.parse(updated.disbursementReceiptUrlsJson)
          : [],
        disbursementNote: updated.disbursementNote,
        reapprovalReason: updated.reapprovalReason,
        createdByStaffId: updated.createdByStaffId,
        createdByName: updated.createdByName,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  });
}
