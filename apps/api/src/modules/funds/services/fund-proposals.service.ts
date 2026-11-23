import { Prisma } from '../../../generated/crm-client/index.js';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import type {
  ApproveProposalRequest,
  CreateProposalRequest,
  FundApprovalWorkflowConfig,
  FundProposal,
  ProposalStatus,
  SafeAny,
} from '@mos-lab/shared';
import { FundError, type FundActor } from './fund-types.js';

/**
 * Tạo Đề xuất Bổ sung Quỹ (Replenishment Proposal)
 */
export async function createProposal(
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
    proposalType: created.proposalType as SafeAny,
    title: created.title,
    description: created.description,
    requestedAmount: Number(created.requestedAmount),
    approvedAmount: created.approvedAmount ? Number(created.approvedAmount) : null,
    actualDisbursedAmount: null,
    status: created.status as SafeAny,
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
export async function approveProposal(
  crm: CrmPrismaClient,
  proposalId: string,
  input: ApproveProposalRequest,
  actor: FundActor
): Promise<FundProposal> {
  const proposal = await crm.crmFundProposal.findUnique({
    where: { id: proposalId },
    include: { fund: true },
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
      proposalType: updated.proposalType as SafeAny,
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

  // Kiểm tra quy trình duyệt động (FundApprovalWorkflowConfig)
  let nextStatus: ProposalStatus = 'APPROVED';
  let nextLevel = proposal.currentApprovalLevel;

  if (proposal.fund?.approvalConfigJson) {
    try {
      const config: FundApprovalWorkflowConfig = JSON.parse(proposal.fund.approvalConfigJson);
      if (config.enabled && Array.isArray(config.steps) && config.steps.length > 0) {
        const currentStepIdx = config.steps.findIndex((s) => s.level === proposal.currentApprovalLevel);
        let foundNextStep = false;
        for (let i = currentStepIdx + 1; i < config.steps.length; i++) {
          const step = config.steps[i];
          if (!step.requiredAmountAbove || approvedAmount >= step.requiredAmountAbove) {
            nextStatus = 'PENDING_APPROVAL';
            nextLevel = step.level;
            foundNextStep = true;
            break;
          }
        }
        if (!foundNextStep) {
          nextStatus = 'APPROVED';
        }
      }
    } catch {
      nextStatus = 'APPROVED';
    }
  }

  // Cập nhật trạng thái phiếu sau khi duyệt
  const updated = await crm.crmFundProposal.update({
    where: { id: proposalId },
    data: {
      status: nextStatus,
      currentApprovalLevel: nextLevel,
      approvedAmount: new Prisma.Decimal(approvedAmount),
      approvalsJson: JSON.stringify(existingApprovals),
      reapprovalReason: null, // Xóa lý do duyệt lại cũ nếu có
    },
  });

  return {
    id: updated.id,
    fundId: updated.fundId,
    proposalType: updated.proposalType as SafeAny,
    title: updated.title,
    description: updated.description,
    requestedAmount: Number(updated.requestedAmount),
    approvedAmount: Number(updated.approvedAmount),
    actualDisbursedAmount: updated.actualDisbursedAmount ? Number(updated.actualDisbursedAmount) : null,
    status: updated.status as SafeAny,
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
