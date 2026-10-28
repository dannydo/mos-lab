import { Prisma } from '../../generated/crm-client/index.js';
import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';
import type {
  ApproveProposalRequest,
  CreateProposalRequest,
  DisburseProposalRequest,
  Fund,
  FundPeriod,
  FundProposal,
  FundRole,
  FundRoleAssignment,
  FundTransaction,
  RecordExpenseRequest,
  ReconcileAndLockPeriodRequest,
  UpdateFundConfigRequest,
} from '@mos-lab/shared';

export class FundError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'FundError';
  }
}

export interface FundActor {
  id: number;
  name: string;
  role?: string;
}

export const DEFAULT_TELESALE_FUND_ID = 'fund-telesale-card';

export class FundService {
  /**
   * @deprecated Vô hiệu hóa khởi tạo tự động theo Bước 1 Tái cấu trúc Quản lý Quỹ (MOS-BUG-174).
   * Không tự động tạo Quỹ Nạp Card Telesale giả lập nữa. Quỹ phải do Quản trị viên thiết lập.
   */
  static async ensureDefaultFund(_crm: CrmPrismaClient): Promise<void> {
    // Disabled per MOS-BUG-174: All funds must be explicitly configured.
    return;
  }

  /**
   * Danh sách toàn bộ quỹ hoạt động nội bộ
   */
  static async listFunds(crm: CrmPrismaClient): Promise<Fund[]> {
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
      const isLowBalance = usedPercent >= alertThresholdPercent || currentBalance <= (maxQuota * (100 - alertThresholdPercent)) / 100;

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
            status: activePeriod.status as any,
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
        toleranceMode: f.toleranceMode as any,
        toleranceAmount: Number(f.toleranceAmount),
        status: f.status as any,
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
  static async getFundOverview(crm: CrmPrismaClient, fundId: string): Promise<Fund & { recentTransactions: FundTransaction[]; pendingProposals: FundProposal[] }> {
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
    const isLowBalance = usedPercent >= alertThresholdPercent || currentBalance <= (maxQuota * (100 - alertThresholdPercent)) / 100;

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
          status: activePeriod.status as any,
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
      type: t.type as any,
      amount: Number(t.amount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
      description: t.description,
      status: t.status as any,
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
      proposalType: p.proposalType as any,
      title: p.title,
      description: p.description,
      requestedAmount: Number(p.requestedAmount),
      approvedAmount: p.approvedAmount ? Number(p.approvedAmount) : null,
      actualDisbursedAmount: p.actualDisbursedAmount ? Number(p.actualDisbursedAmount) : null,
      status: p.status as any,
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
      toleranceMode: f.toleranceMode as any,
      toleranceAmount: Number(f.toleranceAmount),
      status: f.status as any,
      isLowBalance,
      usedAmount,
      usedPercent,
      roles,
      assignments,
      currentPeriod,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      recentTransactions,
      pendingProposals,
    };
  }

  /**
   * Nghiệp vụ Ghi nhận Chi tiêu (Nạp Card Telesale)
   * Chuẩn hóa: Bích Phượng nạp card cho Telesale, kiểm tra số dư chống âm quỹ.
   */
  static async recordExpense(
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
        usedPercent >= fund.alertThresholdPercent ||
        newBalance <= (maxQuota * (100 - fund.alertThresholdPercent)) / 100;

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
          type: createdTx.type as any,
          amount: Number(createdTx.amount),
          balanceBefore: Number(createdTx.balanceBefore),
          balanceAfter: Number(createdTx.balanceAfter),
          description: createdTx.description,
          status: createdTx.status as any,
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
   * Tạo Đề xuất Bổ sung Quỹ (Replenishment Proposal)
   */
  static async createProposal(
    crm: CrmPrismaClient,
    fundId: string,
    input: CreateProposalRequest,
    actor: FundActor
  ): Promise<FundProposal> {
    const fund = await crm.crmFund.findUnique({ where: { id: fundId } });
    if (!fund) throw new FundError(`Quỹ không tồn tại (id: ${fundId})`, 404);

    let amount = input.requestedAmount;
    if (!amount || amount <= 0) {
      // Tự động tính số tiền cần bổ sung để đầy hạn mức: maxQuota - currentBalance
      amount = Math.max(0, Number(fund.maxQuota) - Number(fund.currentBalance));
      if (amount <= 0) {
        throw new FundError('Số dư quỹ hiện tại đã đạt hoặc vượt hạn mức tối đa, không cần bổ sung', 400);
      }
    }

    const propId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const created = await crm.crmFundProposal.create({
      data: {
        id: propId,
        fundId,
        proposalType: input.proposalType || 'REPLENISHMENT',
        title: input.title || `Đề nghị bổ sung vốn Quỹ ${fund.name} (${amount.toLocaleString('vi-VN')}đ)`,
        description: input.description,
        requestedAmount: new Prisma.Decimal(amount),
        status: 'PENDING_APPROVAL',
        currentApprovalLevel: 1,
        createdByStaffId: actor.id,
        createdByName: actor.name,
      },
    });

    return {
      id: created.id,
      fundId: created.fundId,
      proposalType: created.proposalType as any,
      title: created.title,
      description: created.description,
      requestedAmount: Number(created.requestedAmount),
      approvedAmount: created.approvedAmount ? Number(created.approvedAmount) : null,
      actualDisbursedAmount: null,
      status: created.status as any,
      currentApprovalLevel: created.currentApprovalLevel,
      approvals: [],
      disbursedByStaffId: null,
      disbursedByName: null,
      disbursedAt: null,
      paymentMethod: null,
      bankRefCode: null,
      disbursementReceiptUrls: [],
      disbursementNote: null,
      reapprovalReason: null,
      createdByStaffId: created.createdByStaffId,
      createdByName: created.createdByName,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * CƠ CHẾ KIỂM SOÁT 1: Phê Duyệt Chủ Trương & Hạn Mức Tối Đa
   * Cấp duyệt (Quản lý & Danny) CHỈ duyệt về mặt chủ trương & số tiền tối đa (approvedAmount).
   */
  static async approveProposal(
    crm: CrmPrismaClient,
    proposalId: string,
    input: ApproveProposalRequest,
    actor: FundActor
  ): Promise<FundProposal> {
    const proposal = await crm.crmFundProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) throw new FundError(`Phiếu đề xuất không tồn tại (id: ${proposalId})`, 404);
    if (!['PENDING_APPROVAL', 'PENDING_REAPPROVAL'].includes(proposal.status)) {
      throw new FundError(`Phiếu đề xuất đang ở trạng thái ${proposal.status}, không thể phê duyệt`, 400);
    }

    if (!input.approved) {
      const updated = await crm.crmFundProposal.update({
        where: { id: proposalId },
        data: {
          status: 'REJECTED',
          reapprovalReason: input.note || 'Bị từ chối bởi cấp quản lý',
        },
      });

      return {
        id: updated.id,
        fundId: updated.fundId,
        proposalType: updated.proposalType as any,
        title: updated.title,
        description: updated.description,
        requestedAmount: Number(updated.requestedAmount),
        approvedAmount: updated.approvedAmount ? Number(updated.approvedAmount) : null,
        actualDisbursedAmount: null,
        status: 'REJECTED',
        currentApprovalLevel: updated.currentApprovalLevel,
        approvals: updated.approvalsJson ? JSON.parse(updated.approvalsJson) : [],
        disbursedByStaffId: null,
        disbursedByName: null,
        disbursedAt: null,
        paymentMethod: null,
        bankRefCode: null,
        disbursementReceiptUrls: [],
        disbursementNote: null,
        reapprovalReason: updated.reapprovalReason,
        createdByStaffId: updated.createdByStaffId,
        createdByName: updated.createdByName,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    const approvedAmount = input.approvedAmount ?? Number(proposal.requestedAmount);
    if (approvedAmount <= 0) throw new FundError('Số tiền duyệt phải lớn hơn 0', 400);

    const existingApprovals = proposal.approvalsJson ? JSON.parse(proposal.approvalsJson) : [];
    existingApprovals.push({
      level: proposal.currentApprovalLevel,
      staffId: actor.id,
      staffName: actor.name,
      status: 'APPROVED',
      note: input.note,
      timestamp: new Date().toISOString(),
    });

    // Duyệt hoàn tất -> Chuyển sang APPROVED (Sẵn sàng giải ngân)
    const updated = await crm.crmFundProposal.update({
      where: { id: proposalId },
      data: {
        status: 'APPROVED',
        approvedAmount: new Prisma.Decimal(approvedAmount),
        approvalsJson: JSON.stringify(existingApprovals),
        reapprovalReason: null, // Xóa lý do duyệt lại cũ nếu có
      },
    });

    return {
      id: updated.id,
      fundId: updated.fundId,
      proposalType: updated.proposalType as any,
      title: updated.title,
      description: updated.description,
      requestedAmount: Number(updated.requestedAmount),
      approvedAmount: Number(updated.approvedAmount),
      actualDisbursedAmount: updated.actualDisbursedAmount ? Number(updated.actualDisbursedAmount) : null,
      status: updated.status as any,
      currentApprovalLevel: updated.currentApprovalLevel,
      approvals: existingApprovals,
      disbursedByStaffId: updated.disbursedByStaffId,
      disbursedByName: updated.disbursedByName,
      disbursedAt: updated.disbursedAt?.toISOString() || null,
      paymentMethod: updated.paymentMethod,
      bankRefCode: updated.bankRefCode,
      disbursementReceiptUrls: updated.disbursementReceiptUrlsJson ? JSON.parse(updated.disbursementReceiptUrlsJson) : [],
      disbursementNote: updated.disbursementNote,
      reapprovalReason: updated.reapprovalReason,
      createdByStaffId: updated.createdByStaffId,
      createdByName: updated.createdByName,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * CƠ CHẾ KIỂM SOÁT 2: Thực Thi Giải Ngân Kế Toán & Kiểm Soát Dung Sai (Tolerance Control)
   * - Kế toán (Bùi Tổng) xác nhận tiền đã ra khỏi tài khoản/két: bắt buộc mã GD, bill, kênh chuyển.
   * - Nếu actual > approved + tolerance => Tự động KHÓA và chuyển PENDING_REAPPROVAL.
   */
  static async disburseProposal(
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
      throw new FundError(`Phiếu đề xuất chưa được duyệt hoặc đang ở trạng thái ${proposal.status}, không thể giải ngân`, 400);
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
          proposalType: reapprovalProposal.proposalType as any,
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
      const currentBalance = Number(fund.currentBalance);
      const newBalance = currentBalance + input.actualDisbursedAmount;

      const activePeriod = await tx.crmFundPeriod.findFirst({
        where: { fundId: fund.id, status: 'OPEN' },
        orderBy: { startDate: 'desc' },
      });

      // 1. Cập nhật phiếu sang DISBURSED
      const updated = await tx.crmFundProposal.update({
        where: { id: proposalId },
        data: {
          status: 'DISBURSED',
          actualDisbursedAmount: new Prisma.Decimal(input.actualDisbursedAmount),
          disbursedAt,
          paymentMethod: input.paymentMethod,
          bankRefCode: input.bankRefCode,
          disbursementReceiptUrlsJson: input.disbursementReceiptUrls ? JSON.stringify(input.disbursementReceiptUrls) : null,
          disbursementNote: input.disbursementNote || null,
          disbursedByStaffId: actor.id,
          disbursedByName: actor.name,
          reapprovalReason: null,
        },
      });

      // 2. Tạo giao dịch TOPUP vào sổ quỹ
      const txId = `tx-topup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await tx.crmFundTransaction.create({
        data: {
          id: txId,
          fundId: fund.id,
          periodId: activePeriod?.id || null,
          proposalId: proposal.id,
          type: 'TOPUP',
          amount: new Prisma.Decimal(input.actualDisbursedAmount),
          balanceBefore: new Prisma.Decimal(currentBalance),
          balanceAfter: new Prisma.Decimal(newBalance),
          description: `Giải ngân bổ sung vốn theo phiếu: ${proposal.title} (Mã GD: ${input.bankRefCode})`,
          status: 'COMPLETED',
          receiptUrlsJson: input.disbursementReceiptUrls ? JSON.stringify(input.disbursementReceiptUrls) : null,
          actorStaffId: actor.id,
          actorStaffName: actor.name,
        },
      });

      // 3. Tăng số dư thực tế của quỹ
      await tx.crmFund.update({
        where: { id: fund.id },
        data: { currentBalance: new Prisma.Decimal(newBalance) },
      });

      // 4. Cập nhật kỳ kế toán
      if (activePeriod) {
        await tx.crmFundPeriod.update({
          where: { id: activePeriod.id },
          data: {
            totalIncome: { increment: new Prisma.Decimal(input.actualDisbursedAmount) },
            systemBalance: new Prisma.Decimal(newBalance),
          },
        });
      }

      return {
        success: true,
        proposal: {
          id: updated.id,
          fundId: updated.fundId,
          proposalType: updated.proposalType as any,
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
        message: `Giải ngân thành công ${input.actualDisbursedAmount.toLocaleString('vi-VN')}đ vào Quỹ ${fund.name}. Số dư mới: ${newBalance.toLocaleString('vi-VN')}đ.`,
      };
    });
  }

  /**
   * CƠ CHẾ KIỂM SOÁT 3: Đối Soát, Xử Lý Chênh Lệch & Chốt Kỳ Sổ Quỹ (Period Lock)
   * - So khớp actualBalance vs systemBalance.
   * - Nếu variance != 0: Bắt buộc lập bút toán điều chỉnh (ADJUSTMENT).
   * - Chốt kỳ -> Khóa cứng toàn bộ giao dịch trong kỳ, chuyển số dư sang kỳ mới.
   */
  static async reconcileAndLockPeriod(
    crm: CrmPrismaClient,
    fundId: string,
    periodId: string,
    input: ReconcileAndLockPeriodRequest,
    actor: FundActor
  ): Promise<{ closedPeriod: FundPeriod; nextPeriod: FundPeriod; variance: number; adjustmentTransaction?: FundTransaction }> {
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

  /**
   * Cập nhật Cấu hình Quỹ (Hạn mức, Dung sai, Ngưỡng cảnh báo)
   */
  static async updateFundConfig(
    crm: CrmPrismaClient,
    fundId: string,
    input: UpdateFundConfigRequest
  ): Promise<Fund> {
    const data: Prisma.CrmFundUpdateInput = {};
    if (input.maxQuota !== undefined) data.maxQuota = new Prisma.Decimal(input.maxQuota);
    if (input.unitQuota !== undefined) data.unitQuota = new Prisma.Decimal(input.unitQuota);
    if (input.alertThresholdPercent !== undefined) data.alertThresholdPercent = input.alertThresholdPercent;
    if (input.toleranceMode !== undefined) data.toleranceMode = input.toleranceMode;
    if (input.toleranceAmount !== undefined) data.toleranceAmount = new Prisma.Decimal(input.toleranceAmount);

    await crm.crmFund.update({
      where: { id: fundId },
      data,
    });

    const overview = await this.getFundOverview(crm, fundId);
    return overview;
  }
}
