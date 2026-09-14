import type {
  NativeCcPilotDashboardResponse,
  OpenNativeCcPilotPeriodResponse,
  PayrollAdjustmentLabApprovalCheckRequest,
  PayrollAdjustmentLabApprovalCheckResponse,
  PayrollAdjustmentLabApproverGroupResponse,
  PayrollAdjustmentLabCaseListResponse,
  PayrollAdjustmentLabCaseResponse,
  PayrollAdjustmentLabDecisionRequest,
  PayrollAdjustmentLabDraftRequest,
  PayrollAdjustmentLabHrCustomDraftRequest,
  PayrollAdjustmentLabHrCustomRequest,
  PayrollAdjustmentLabHrCustomResponse,
  PayrollAdjustmentLabSettlementLockRequest,
  PayrollAdjustmentLabSettlementLockResponse,
  PayrollAdjustmentLabSettlementReviewResponse,
  PayrollAdjustmentLabShadowRequest,
  PayrollAdjustmentLabShadowResponse,
} from '@mos-lab/shared';

import { api } from './base';

export const payrollApi = {
  payrollLedger: {
    ccPilotDashboard: async (params?: { periodKey?: string }): Promise<NativeCcPilotDashboardResponse> => {
      const response = await api.get<NativeCcPilotDashboardResponse>('/payroll-ledger/cc-pilot-dashboard', { params });
      return response.data;
    },
    openCurrentCcPilotPeriod: async (): Promise<OpenNativeCcPilotPeriodResponse> => {
      const response = await api.post<OpenNativeCcPilotPeriodResponse>(
        '/payroll-ledger/cc-pilot-periods/open-current-month'
      );
      return response.data;
    },
  },
  safeDevPayrollAdjustmentLab: {
    settlementReview: async (): Promise<PayrollAdjustmentLabSettlementReviewResponse> => {
      const response = await api.get<PayrollAdjustmentLabSettlementReviewResponse>(
        '/safe-dev/payroll-adjustment-lab/settlement-review'
      );
      return response.data;
    },
    lockSettlementReview: async (
      payload: PayrollAdjustmentLabSettlementLockRequest
    ): Promise<PayrollAdjustmentLabSettlementLockResponse> => {
      const response = await api.post<PayrollAdjustmentLabSettlementLockResponse>(
        '/safe-dev/payroll-adjustment-lab/settlement-review/lock',
        payload
      );
      return response.data;
    },
    approverGroup: async (): Promise<PayrollAdjustmentLabApproverGroupResponse> => {
      const response = await api.get<PayrollAdjustmentLabApproverGroupResponse>(
        '/safe-dev/payroll-adjustment-lab/approvers'
      );
      return response.data;
    },
    checkApproval: async (
      payload: PayrollAdjustmentLabApprovalCheckRequest
    ): Promise<PayrollAdjustmentLabApprovalCheckResponse> => {
      const response = await api.post<PayrollAdjustmentLabApprovalCheckResponse>(
        '/safe-dev/payroll-adjustment-lab/approval-check',
        payload
      );
      return response.data;
    },
    getCase: async (): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.get<PayrollAdjustmentLabCaseResponse>('/safe-dev/payroll-adjustment-lab/case');
      return response.data;
    },
    listCases: async (): Promise<PayrollAdjustmentLabCaseListResponse> => {
      const response = await api.get<PayrollAdjustmentLabCaseListResponse>('/safe-dev/payroll-adjustment-lab/cases');
      return response.data;
    },
    createDraft: async (payload: PayrollAdjustmentLabDraftRequest): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.post<PayrollAdjustmentLabCaseResponse>(
        '/safe-dev/payroll-adjustment-lab/case/draft',
        payload
      );
      return response.data;
    },
    decideCase: async (payload: PayrollAdjustmentLabDecisionRequest): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.post<PayrollAdjustmentLabCaseResponse>(
        '/safe-dev/payroll-adjustment-lab/case/decision',
        payload
      );
      return response.data;
    },
    getEligibleCase: async (): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.get<PayrollAdjustmentLabCaseResponse>(
        '/safe-dev/payroll-adjustment-lab/case/eligible'
      );
      return response.data;
    },
    createEligibleDraft: async (
      payload: PayrollAdjustmentLabDraftRequest
    ): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.post<PayrollAdjustmentLabCaseResponse>(
        '/safe-dev/payroll-adjustment-lab/case/eligible/draft',
        payload
      );
      return response.data;
    },
    decideEligibleCase: async (
      payload: PayrollAdjustmentLabDecisionRequest
    ): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.post<PayrollAdjustmentLabCaseResponse>(
        '/safe-dev/payroll-adjustment-lab/case/eligible/decision',
        payload
      );
      return response.data;
    },
    getHrCustomCase: async (): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.get<PayrollAdjustmentLabCaseResponse>(
        '/safe-dev/payroll-adjustment-lab/case/hr-custom'
      );
      return response.data;
    },
    createHrCustomDraft: async (
      payload: PayrollAdjustmentLabHrCustomDraftRequest
    ): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.post<PayrollAdjustmentLabCaseResponse>(
        '/safe-dev/payroll-adjustment-lab/case/hr-custom/draft',
        payload
      );
      return response.data;
    },
    decideHrCustomCase: async (
      payload: PayrollAdjustmentLabDecisionRequest
    ): Promise<PayrollAdjustmentLabCaseResponse> => {
      const response = await api.post<PayrollAdjustmentLabCaseResponse>(
        '/safe-dev/payroll-adjustment-lab/case/hr-custom/decision',
        payload
      );
      return response.data;
    },
    calculateShadow: async (
      payload: PayrollAdjustmentLabShadowRequest
    ): Promise<PayrollAdjustmentLabShadowResponse> => {
      const response = await api.post<PayrollAdjustmentLabShadowResponse>(
        '/safe-dev/payroll-adjustment-lab/shadow',
        payload
      );
      return response.data;
    },
    validateHrCustom: async (
      payload: PayrollAdjustmentLabHrCustomRequest
    ): Promise<PayrollAdjustmentLabHrCustomResponse> => {
      const response = await api.post<PayrollAdjustmentLabHrCustomResponse>(
        '/safe-dev/payroll-adjustment-lab/hr-custom',
        payload
      );
      return response.data;
    },
  },
  safeDevNativeCcPayroll: {
    run: async (): Promise<import('@mos-lab/shared').NativeCcPayrollLocalRunResponse> => {
      const response = await api.get<import('@mos-lab/shared').NativeCcPayrollLocalRunResponse>(
        '/safe-dev/payroll-native-cc-run'
      );
      return response.data;
    },
  },
  safeDevLegacyCcComparison: {
    run: async (): Promise<import('@mos-lab/shared').LegacyCcComparisonResponse> => {
      const response = await api.get<import('@mos-lab/shared').LegacyCcComparisonResponse>(
        '/safe-dev/legacy-cc-comparison'
      );
      return response.data;
    },
  },
  safeDevLegacyCcParityReplay: {
    run: async (): Promise<import('@mos-lab/shared').LegacyCcParityReplayResponse> => {
      const response = await api.get<import('@mos-lab/shared').LegacyCcParityReplayResponse>(
        '/safe-dev/legacy-cc-parity-replay'
      );
      return response.data;
    },
  },
  safeDevLegacyCcCohortAudit: {
    run: async (): Promise<import('@mos-lab/shared').LegacyCcCohortAuditResponse> => {
      const response = await api.get<import('@mos-lab/shared').LegacyCcCohortAuditResponse>(
        '/safe-dev/legacy-cc-cohort-audit'
      );
      return response.data;
    },
  },
};
