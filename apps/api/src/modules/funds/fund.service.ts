import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';
import type {
  ApproveProposalRequest,
  ConfirmReceiptRequest,
  CreateFundRequest,
  CreateProposalRequest,
  DisburseProposalRequest,
  Fund,
  FundPeriod,
  FundProposal,
  FundTransaction,
  ReconcileAndLockPeriodRequest,
  RecordExpenseRequest,
  UpdateFundConfigRequest,
  UpdateFundRequest,
} from '@mos-lab/shared';
import { DEFAULT_TELESALE_FUND_ID, FundError, type FundActor } from './services/fund-types.js';
import {
  activateFund as activateFundOp,
  ensureDefaultFund as ensureDefaultFundOp,
  getFundOverview as getFundOverviewOp,
  listFunds as listFundsOp,
} from './services/fund-queries.service.js';
import {
  approveProposal as approveProposalOp,
  createProposal as createProposalOp,
} from './services/fund-proposals.service.js';
import {
  confirmProposalReceipt as confirmProposalReceiptOp,
  disburseProposal as disburseProposalOp,
} from './services/fund-disbursement.service.js';
import {
  reconcileAndLockPeriod as reconcileAndLockPeriodOp,
  recordExpense as recordExpenseOp,
} from './services/fund-ledger.service.js';
import {
  createFund as createFundOp,
  updateFund as updateFundOp,
  updateFundConfig as updateFundConfigOp,
} from './services/fund-admin.service.js';

export { DEFAULT_TELESALE_FUND_ID, FundError, type FundActor };

export class FundService {
  static async ensureDefaultFund(crm: CrmPrismaClient): Promise<void> {
    return ensureDefaultFundOp(crm);
  }

  static async listFunds(crm: CrmPrismaClient): Promise<Fund[]> {
    return listFundsOp(crm);
  }

  static async activateFund(
    crm: CrmPrismaClient,
    fundId: string,
    actor: FundActor
  ): Promise<Fund & { recentTransactions: FundTransaction[]; pendingProposals: FundProposal[] }> {
    return activateFundOp(crm, fundId, actor);
  }

  static async getFundOverview(
    crm: CrmPrismaClient,
    fundId: string
  ): Promise<Fund & { recentTransactions: FundTransaction[]; pendingProposals: FundProposal[] }> {
    return getFundOverviewOp(crm, fundId);
  }

  static async recordExpense(
    crm: CrmPrismaClient,
    fundId: string,
    input: RecordExpenseRequest,
    actor: FundActor
  ): Promise<{ transaction: FundTransaction; isLowBalance: boolean; alertMessage?: string }> {
    return recordExpenseOp(crm, fundId, input, actor);
  }

  static async createProposal(
    crm: CrmPrismaClient,
    fundId: string,
    input: CreateProposalRequest,
    actor: FundActor
  ): Promise<FundProposal> {
    return createProposalOp(crm, fundId, input, actor);
  }

  static async approveProposal(
    crm: CrmPrismaClient,
    proposalId: string,
    input: ApproveProposalRequest,
    actor: FundActor
  ): Promise<FundProposal> {
    return approveProposalOp(crm, proposalId, input, actor);
  }

  static async disburseProposal(
    crm: CrmPrismaClient,
    proposalId: string,
    input: DisburseProposalRequest,
    actor: FundActor
  ): Promise<{ success: boolean; proposal: FundProposal; reapprovalRequired?: boolean; message?: string }> {
    return disburseProposalOp(crm, proposalId, input, actor);
  }

  static async confirmProposalReceipt(
    crm: CrmPrismaClient,
    proposalId: string,
    input: ConfirmReceiptRequest,
    actor: FundActor
  ): Promise<{ success: boolean; proposal: FundProposal; message: string; newBalance: number }> {
    return confirmProposalReceiptOp(crm, proposalId, input, actor);
  }

  static async reconcileAndLockPeriod(
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
    return reconcileAndLockPeriodOp(crm, fundId, periodId, input, actor);
  }

  static async updateFundConfig(crm: CrmPrismaClient, fundId: string, input: UpdateFundConfigRequest): Promise<Fund> {
    return updateFundConfigOp(crm, fundId, input);
  }

  static async createFund(crm: CrmPrismaClient, input: CreateFundRequest, actor: FundActor): Promise<Fund> {
    return createFundOp(crm, input, actor);
  }

  static async updateFund(
    crm: CrmPrismaClient,
    fundId: string,
    input: UpdateFundRequest,
    actor: FundActor
  ): Promise<Fund> {
    return updateFundOp(crm, fundId, input, actor);
  }
}
