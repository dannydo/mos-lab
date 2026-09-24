import type {
  ApproveBugReportImplementationCommitRequest,
  ApproveBugReportImplementationCommitResponse,
  ApproveBugReportImplementationDeployRequest,
  ApproveBugReportImplementationDeployResponse,
  ApproveBugReportImplementationRequest,
  ApproveBugReportImplementationResponse,
  AuthorizeBugReportBuildLockRecoveryRetryRequest,
  AuthorizeBugReportBuildLockRecoveryRetryResponse,
  AuthorizeBugReportQualityGateRecoveryRetryRequest,
  AuthorizeBugReportQualityGateRecoveryRetryResponse,
  AuthorizeBugReportSchemaRecoveryRetryRequest,
  AuthorizeBugReportSchemaRecoveryRetryResponse,
  AuthorizeBugReportWorkerRecoveryRetryRequest,
  AuthorizeBugReportWorkerRecoveryRetryResponse,
  BugReportDetail,
  BugReportListQuery,
  BugReportListResponse,
  ConfirmCloseBugReportRequest,
  ConfirmCloseBugReportResponse,
  CreateBugReportCommentRequest,
  CreateBugReportCommentResponse,
  CreateBugReportRequest,
  CreateBugReportResponse,
  InboxTicketExecutionTiming,
  InboxExecutionDashboardQuery,
  InboxExecutionDashboardSummary,
  CreateRequestClassificationJobRequest,
  CreateRequestClassificationJobResponse,
  CreateRequestConversationRequest,
  CreateRequestConversationResponse,
  MarkBugReportNotificationsReadRequest,
  MarkBugReportNotificationsReadResponse,
  MyBugReportsResponse,
  RecordInboxIdeImplementationReceiptRequest,
  RecordInboxIdeImplementationReceiptResponse,
  ReleaseBugReportImplementationRequest,
  ReleaseBugReportImplementationResponse,
  ReplyRequestConversationRequest,
  ReplyRequestConversationResponse,
  RequestBugReportImplementationChangesRequest,
  RequestBugReportPlanChangesRequest,
  RequestClassificationJob,
  RequestClassifierWorkerHealth,
  RequestConversation,
  RetryBugReportImplementationRequest,
  RetryBugReportImplementationResponse,
  ReviewBugReportImplementationAcceptanceRequest,
  ReviewBugReportImplementationAcceptanceResponse,
  ReviewBugReportRequest,
  ReviewBugReportResponse,
  TriageBugReportRequest,
  TriageBugReportResponse,
} from '@mos-lab/shared';

import { api, dedupeApiGet, invalidateApiGetCache, type ApiRequestOptions } from './base';

export const bugReportsApi = {
  bugReports: {
    classifyRequest: async (
      data: CreateRequestClassificationJobRequest
    ): Promise<CreateRequestClassificationJobResponse> => {
      const response = await api.post<CreateRequestClassificationJobResponse>('/request-classifications', data);
      return response.data;
    },
    classificationStatus: async (id: string): Promise<RequestClassificationJob> => {
      const response = await api.get<{ data: RequestClassificationJob }>(
        `/request-classifications/${encodeURIComponent(id)}`
      );
      return response.data.data;
    },
    createConversation: async (data: CreateRequestConversationRequest): Promise<CreateRequestConversationResponse> => {
      const response = await api.post<CreateRequestConversationResponse>('/request-conversations', data);
      return response.data;
    },
    conversationStatus: async (id: string): Promise<RequestConversation> => {
      const response = await api.get<{ data: RequestConversation }>(`/request-conversations/${encodeURIComponent(id)}`);
      return response.data.data;
    },
    replyConversation: async (
      id: string,
      data: ReplyRequestConversationRequest
    ): Promise<ReplyRequestConversationResponse> => {
      const response = await api.post<ReplyRequestConversationResponse>(
        `/request-conversations/${encodeURIComponent(id)}/replies`,
        data
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    create: async (data: CreateBugReportRequest): Promise<CreateBugReportResponse> => {
      const response = await api.post<CreateBugReportResponse>('/bug-reports', data);
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    mine: async (): Promise<MyBugReportsResponse> => {
      return dedupeApiGet<MyBugReportsResponse>('/bug-reports/mine', undefined, 30000);
    },
    review: async (id: number, data: ReviewBugReportRequest): Promise<ReviewBugReportResponse> => {
      const response = await api.patch<ReviewBugReportResponse>(`/bug-reports/${id}/review`, data);
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    comment: async (id: number, data: CreateBugReportCommentRequest): Promise<CreateBugReportCommentResponse> => {
      const response = await api.post<CreateBugReportCommentResponse>(`/bug-reports/${id}/comments`, data);
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    markNotificationsRead: async (
      data: MarkBugReportNotificationsReadRequest
    ): Promise<MarkBugReportNotificationsReadResponse> => {
      const response = await api.patch<MarkBugReportNotificationsReadResponse>('/bug-reports/notifications/read', data);
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    list: async (params: BugReportListQuery, options?: ApiRequestOptions): Promise<BugReportListResponse> => {
      return dedupeApiGet<BugReportListResponse>('/bug-reports', params as Record<string, unknown>, 5000, options);
    },
    workerHealth: async (options?: ApiRequestOptions): Promise<RequestClassifierWorkerHealth> => {
      const response = await dedupeApiGet<{ data: RequestClassifierWorkerHealth }>(
        '/bug-reports/worker-health',
        undefined,
        15000,
        options
      );
      return response.data;
    },
    detail: async (id: number, options?: ApiRequestOptions): Promise<BugReportDetail> => {
      const response = await dedupeApiGet<{ data: BugReportDetail }>(`/bug-reports/${id}`, undefined, 15000, options);
      return response.data;
    },
    triage: async (id: number, data: TriageBugReportRequest): Promise<TriageBugReportResponse> => {
      const response = await api.patch<TriageBugReportResponse>(`/bug-reports/${id}/triage`, data);
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    approveImplementation: async (
      id: number,
      data: ApproveBugReportImplementationRequest
    ): Promise<ApproveBugReportImplementationResponse> => {
      const response = await api.post<ApproveBugReportImplementationResponse>(
        `/bug-reports/${id}/implementation-approval`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    recordIdeImplementationReceipt: async (
      id: number,
      data: RecordInboxIdeImplementationReceiptRequest
    ): Promise<RecordInboxIdeImplementationReceiptResponse> => {
      const response = await api.post<RecordInboxIdeImplementationReceiptResponse>(
        `/bug-reports/${id}/ide-implementation-receipt`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    approveImplementationCommit: async (
      id: number,
      data: ApproveBugReportImplementationCommitRequest
    ): Promise<ApproveBugReportImplementationCommitResponse> => {
      const response = await api.post<ApproveBugReportImplementationCommitResponse>(
        `/bug-reports/${id}/implementation-commit-approval`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    approveImplementationDeploy: async (
      id: number,
      data: ApproveBugReportImplementationDeployRequest
    ): Promise<ApproveBugReportImplementationDeployResponse> => {
      const response = await api.post<ApproveBugReportImplementationDeployResponse>(
        `/bug-reports/${id}/implementation-deploy-approval`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    retryImplementation: async (
      id: number,
      data: RetryBugReportImplementationRequest
    ): Promise<RetryBugReportImplementationResponse> => {
      const response = await api.post<RetryBugReportImplementationResponse>(
        `/bug-reports/${id}/implementation-retry`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    authorizeWorkerRecoveryRetry: async (
      id: number,
      data: AuthorizeBugReportWorkerRecoveryRetryRequest
    ): Promise<AuthorizeBugReportWorkerRecoveryRetryResponse> => {
      const response = await api.post<AuthorizeBugReportWorkerRecoveryRetryResponse>(
        `/bug-reports/${id}/implementation-worker-recovery-retry`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    authorizeSchemaRecoveryRetry: async (
      id: number,
      data: AuthorizeBugReportSchemaRecoveryRetryRequest
    ): Promise<AuthorizeBugReportSchemaRecoveryRetryResponse> => {
      const response = await api.post<AuthorizeBugReportSchemaRecoveryRetryResponse>(
        `/bug-reports/${id}/implementation-schema-recovery-retry`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    authorizeQualityGateRecoveryRetry: async (
      id: number,
      data: AuthorizeBugReportQualityGateRecoveryRetryRequest
    ): Promise<AuthorizeBugReportQualityGateRecoveryRetryResponse> => {
      const response = await api.post<AuthorizeBugReportQualityGateRecoveryRetryResponse>(
        `/bug-reports/${id}/implementation-quality-gate-recovery-retry`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    authorizeBuildLockRecoveryRetry: async (
      id: number,
      data: AuthorizeBugReportBuildLockRecoveryRetryRequest
    ): Promise<AuthorizeBugReportBuildLockRecoveryRetryResponse> => {
      const response = await api.post<AuthorizeBugReportBuildLockRecoveryRetryResponse>(
        `/bug-reports/${id}/implementation-build-lock-recovery-retry`,
        data,
        { timeout: 12_000 }
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    requestImplementationChanges: async (
      id: number,
      data: RequestBugReportImplementationChangesRequest
    ): Promise<ReleaseBugReportImplementationResponse> => {
      const response = await api.post(`/bug-reports/${id}/implementation-request-changes`, data);
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    requestPlanChanges: async (
      id: number,
      data: RequestBugReportPlanChangesRequest
    ): Promise<ReleaseBugReportImplementationResponse> => {
      const response = await api.post(`/bug-reports/${id}/plan-request-changes`, data);
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    releaseImplementation: async (
      id: number,
      data: ReleaseBugReportImplementationRequest
    ): Promise<ReleaseBugReportImplementationResponse> => {
      const response = await api.post<ReleaseBugReportImplementationResponse>(
        `/bug-reports/${id}/implementation-release`,
        data
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    reviewImplementationAcceptance: async (
      id: number,
      data: ReviewBugReportImplementationAcceptanceRequest
    ): Promise<ReviewBugReportImplementationAcceptanceResponse> => {
      const response = await api.patch<ReviewBugReportImplementationAcceptanceResponse>(
        `/bug-reports/${id}/implementation-acceptance`,
        data
      );
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    confirmClose: async (id: number, data: ConfirmCloseBugReportRequest): Promise<ConfirmCloseBugReportResponse> => {
      const response = await api.patch<ConfirmCloseBugReportResponse>(`/bug-reports/${id}/confirm-close`, data);
      invalidateApiGetCache(['/bug-reports/mine', '/bug-reports']);
      return response.data;
    },
    attachment: async (reportId: number, attachmentId: number): Promise<Blob> => {
      const response = await api.get<Blob>(`/bug-reports/${reportId}/attachments/${attachmentId}`, {
        responseType: 'blob',
      });
      return response.data;
    },
    timing: async (id: number): Promise<InboxTicketExecutionTiming> => {
      const response = await api.get<{ data: InboxTicketExecutionTiming }>(`/bug-reports/${id}/timing`);
      return response.data.data;
    },
    timingDashboard: async (query: InboxExecutionDashboardQuery = {}): Promise<InboxExecutionDashboardSummary> => {
      const response = await api.get<{ data: InboxExecutionDashboardSummary }>('/bug-reports/timing/dashboard', {
        params: query,
      });
      return response.data.data;
    },
  },
};
