import type {
  ApproveProposalRequest,
  CreateProposalRequest,
  DisburseProposalRequest,
  Fund,
  FundPeriod,
  FundProposal,
  FundTransaction,
  RecordExpenseRequest,
  ReconcileAndLockPeriodRequest,
  UpdateFundConfigRequest,
  CreateFundRequest,
  UpdateFundRequest,
} from '@mos-lab/shared';
import { api } from './base';

export const fundsApi = {
  funds: {
    list: async (): Promise<{ success: boolean; data: Fund[] }> => {
      const response = await api.get('/funds');
      return response.data;
    },

    create: async (data: CreateFundRequest): Promise<{ success: boolean; data: Fund }> => {
      const response = await api.post('/funds', data);
      return response.data;
    },

    update: async (
      fundId: string,
      data: UpdateFundRequest
    ): Promise<{ success: boolean; data: Fund }> => {
      const response = await api.put(`/funds/${encodeURIComponent(fundId)}`, data);
      return response.data;
    },

    getOverview: async (
      fundId: string
    ): Promise<{
      success: boolean;
      data: Fund & {
        recentTransactions: FundTransaction[];
        pendingProposals: FundProposal[];
      };
    }> => {
      const response = await api.get(`/funds/${encodeURIComponent(fundId)}`);
      return response.data;
    },

    recordExpense: async (
      fundId: string,
      data: RecordExpenseRequest
    ): Promise<{
      success: boolean;
      data: {
        transaction: FundTransaction;
        isLowBalance: boolean;
        alertMessage?: string;
      };
    }> => {
      const response = await api.post(`/funds/${encodeURIComponent(fundId)}/expense`, data);
      return response.data;
    },

    createProposal: async (
      fundId: string,
      data: CreateProposalRequest
    ): Promise<{ success: boolean; data: FundProposal }> => {
      const response = await api.post(`/funds/${encodeURIComponent(fundId)}/proposals`, data);
      return response.data;
    },

    approveProposal: async (
      proposalId: string,
      data: ApproveProposalRequest
    ): Promise<{ success: boolean; data: FundProposal }> => {
      const response = await api.post(`/funds/proposals/${encodeURIComponent(proposalId)}/approve`, data);
      return response.data;
    },

    disburseProposal: async (
      proposalId: string,
      data: DisburseProposalRequest
    ): Promise<{
      success: boolean;
      reapprovalRequired?: boolean;
      message?: string;
      data: FundProposal;
    }> => {
      const response = await api.post(`/funds/proposals/${encodeURIComponent(proposalId)}/disburse`, data);
      return response.data;
    },

    reconcileAndLockPeriod: async (
      fundId: string,
      periodId: string,
      data: ReconcileAndLockPeriodRequest
    ): Promise<{
      success: boolean;
      data: {
        closedPeriod: FundPeriod;
        nextPeriod: FundPeriod;
        variance: number;
        adjustmentTransaction?: FundTransaction;
      };
    }> => {
      const response = await api.post(
        `/funds/${encodeURIComponent(fundId)}/periods/${encodeURIComponent(periodId)}/reconcile-lock`,
        data
      );
      return response.data;
    },

    updateConfig: async (
      fundId: string,
      data: UpdateFundConfigRequest
    ): Promise<{ success: boolean; data: Fund }> => {
      const response = await api.patch(`/funds/${encodeURIComponent(fundId)}/config`, data);
      return response.data;
    },
  },
};
