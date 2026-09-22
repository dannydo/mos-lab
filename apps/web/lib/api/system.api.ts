import type {
  ColumnConfig,
  CreateUiExperienceRequest,
  ExperienceJournalFingerprint,
  ExperienceJournalListQuery,
  ExperienceJournalListResponse,
  FalLogExplanationRecord,
  LoginRequest,
  LoginResponse,
  MenuAccessConfigurationResponse,
  MenuAccessPolicy,
  MenuAccessSidebarResponse,
  ReviseUiExperienceRequest,
  RollbackUiExperienceRequest,
  SetUiExperienceLifecycleRequest,
  Staff,
  TriageExperienceJournalFingerprintRequest,
  UiExperienceActivation,
  UiExperienceEventRequest,
  UiExperienceEventResponse,
  UiExperienceListResponse,
  UiExperiencePreviewTokenResponse,
  UiExperienceResolveParams,
  UiExperienceResolveResponse,
  UpdateMenuAccessPolicyRequest,
  ConvertFrontendIssueToBugReportResponse,
  FrontendIssueAgAnalysis,
  FrontendIssueAgDispatchResponse,
  FrontendIssueCluster,
  FrontendIssueClusterDispatchResponse,
  FrontendIssueClusterKey,
  FrontendIssueClusterListResponse,
  FrontendIssueListQuery,
  FrontendIssueListResponse,
  FrontendIssueMetrics,
  FrontendIssueRecord,
  UpdateFrontendIssueStatusRequest,
} from '@mos-lab/shared';

import { api, dedupeInFlightApiGet } from './base';

export const systemApi = {
  frontendTelemetry: {
    list: async (params?: FrontendIssueListQuery): Promise<FrontendIssueListResponse> => {
      const response = await api.get<FrontendIssueListResponse>('/telemetry/frontend-issues', { params });
      return response.data;
    },
    getMetrics: async (): Promise<FrontendIssueMetrics> => {
      const response = await api.get<{ data: FrontendIssueMetrics }>('/telemetry/frontend-issues/metrics');
      return response.data.data;
    },
    updateStatus: async (id: number, payload: UpdateFrontendIssueStatusRequest): Promise<FrontendIssueRecord> => {
      const response = await api.patch<{ data: FrontendIssueRecord }>(
        `/telemetry/frontend-issues/${id}/status`,
        payload
      );
      return response.data.data;
    },
    convertToBugReport: async (id: number): Promise<ConvertFrontendIssueToBugReportResponse> => {
      const response = await api.post<{ data: ConvertFrontendIssueToBugReportResponse }>(
        `/telemetry/frontend-issues/${id}/convert-bug-report`
      );
      return response.data.data;
    },
    agAnalyze: async (id: number): Promise<FrontendIssueAgAnalysis> => {
      const response = await api.post<{ data: FrontendIssueAgAnalysis }>(`/telemetry/frontend-issues/${id}/ag-analyze`);
      return response.data.data;
    },
    agDispatch: async (id: number): Promise<FrontendIssueAgDispatchResponse> => {
      const response = await api.post<{ data: FrontendIssueAgDispatchResponse }>(
        `/telemetry/frontend-issues/${id}/ag-dispatch`
      );
      return response.data.data;
    },
    getClusters: async (): Promise<FrontendIssueClusterListResponse> => {
      const response = await api.get<{ data: FrontendIssueClusterListResponse }>('/telemetry/frontend-issues/clusters');
      return response.data.data;
    },
    dispatchCluster: async (clusterKey: FrontendIssueClusterKey): Promise<FrontendIssueClusterDispatchResponse> => {
      const response = await api.post<{ data: FrontendIssueClusterDispatchResponse }>(
        `/telemetry/frontend-issues/clusters/${clusterKey}/dispatch`
      );
      return response.data.data;
    },
    batchDispatchPriorityClusters: async (): Promise<FrontendIssueClusterDispatchResponse[]> => {
      const response = await api.post<{ data: FrontendIssueClusterDispatchResponse[] }>(
        '/telemetry/frontend-issues/clusters/batch-dispatch-priority'
      );
      return response.data.data;
    },
  },
  experienceJournal: {
    list: async (params?: ExperienceJournalListQuery): Promise<ExperienceJournalListResponse> => {
      const response = await api.get<ExperienceJournalListResponse>('/experience-journal', { params });
      return response.data;
    },
    triage: async (
      fingerprint: string,
      payload: TriageExperienceJournalFingerprintRequest
    ): Promise<ExperienceJournalFingerprint> => {
      const response = await api.patch<{ data: ExperienceJournalFingerprint }>(
        `/experience-journal/${encodeURIComponent(fingerprint)}`,
        payload
      );
      return response.data.data;
    },
  },
  uiExperiences: {
    resolve: async (params: UiExperienceResolveParams): Promise<UiExperienceResolveResponse> => {
      const response = await api.get<UiExperienceResolveResponse>('/ui-experiences/resolve', { params });
      return response.data;
    },
    recordEvent: async (payload: UiExperienceEventRequest): Promise<UiExperienceEventResponse> => {
      const response = await api.post<UiExperienceEventResponse>('/ui-experiences/events', payload);
      return response.data;
    },
    list: async (): Promise<UiExperienceListResponse> => {
      const response = await api.get<UiExperienceListResponse>('/ui-experiences');
      return response.data;
    },
    create: async (payload: CreateUiExperienceRequest): Promise<UiExperienceActivation> => {
      const response = await api.post<{ data: UiExperienceActivation }>('/ui-experiences', payload);
      return response.data.data;
    },
    revise: async (id: number, payload: ReviseUiExperienceRequest): Promise<UiExperienceActivation> => {
      const response = await api.put<{ data: UiExperienceActivation }>(`/ui-experiences/${id}/revisions`, payload);
      return response.data.data;
    },
    setLifecycle: async (id: number, payload: SetUiExperienceLifecycleRequest): Promise<UiExperienceActivation> => {
      const response = await api.post<{ data: UiExperienceActivation }>(`/ui-experiences/${id}/lifecycle`, payload);
      return response.data.data;
    },
    rollback: async (id: number, payload: RollbackUiExperienceRequest): Promise<UiExperienceActivation> => {
      const response = await api.post<{ data: UiExperienceActivation }>(`/ui-experiences/${id}/rollback`, payload);
      return response.data.data;
    },
    createPreviewToken: async (id: number): Promise<UiExperiencePreviewTokenResponse> => {
      const response = await api.post<UiExperiencePreviewTokenResponse>(`/ui-experiences/${id}/preview-token`);
      return response.data;
    },
  },
  fal: {
    listCases: async (params?: {
      rule?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }) => {
      const response = await api.get<{
        data: Array<Record<string, unknown>>;
        total: number;
        page: number;
        limit: number;
      }>('/fal/cases', { params });
      return response.data;
    },
    submitLogExplanation: async (
      orderServiceId: number,
      data: { explanation: string; explanationChannel?: string }
    ) => {
      const response = await api.post<{ success: boolean; data: FalLogExplanationRecord }>(
        `/fal/logs/${orderServiceId}/explanation`,
        data
      );
      return response.data;
    },
    approveLog: async (orderServiceId: number, data: { approved: boolean; rejectionReason?: string }) => {
      const response = await api.post<{ success: boolean; data: FalLogExplanationRecord }>(
        `/fal/logs/${orderServiceId}/approval`,
        data
      );
      return response.data;
    },
  },
  release: {
    get: async (): Promise<{ deployedAt: string | null; commitSha: string | null }> => {
      const response = await api.get('/release');
      return response.data;
    },
  },
  auth: {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    google: async (data: {
      credential?: string;
      isMock?: boolean;
      email?: string;
      name?: string;
    }): Promise<LoginResponse> => {
      const response = await api.post('/auth/google', data);
      return response.data;
    },
    me: async (): Promise<Staff> => {
      const response = await api.get('/auth/me');
      return response.data?.user || response.data;
    },
    impersonate: async (userId: number): Promise<LoginResponse> => {
      const response = await api.post('/auth/impersonate', { userId });
      return response.data;
    },
    endImpersonation: async (auditId: number): Promise<{ success: boolean }> => {
      const response = await api.post('/auth/impersonate/exit', { auditId });
      return response.data;
    },
  },
  roles: {
    list: async (): Promise<unknown[]> => {
      const response = await api.get('/roles');
      return response.data;
    },
    create: async (data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.post('/roles', data);
      return response.data;
    },
    update: async (key: string, data: Record<string, unknown>): Promise<unknown> => {
      const response = await api.put(`/roles/${key}`, data);
      return response.data;
    },
    delete: async (key: string): Promise<{ success: boolean }> => {
      const response = await api.delete(`/roles/${key}`);
      return response.data;
    },
  },
  menuAccess: {
    getSidebarVisibility: async (): Promise<MenuAccessSidebarResponse> => {
      const response = await api.get('/menu-access/sidebar');
      return response.data;
    },
    getConfiguration: async (): Promise<MenuAccessConfigurationResponse> => {
      const response = await api.get('/menu-access/configuration');
      return response.data;
    },
    updatePolicy: async (
      menuKey: string,
      data: UpdateMenuAccessPolicyRequest
    ): Promise<{ success: boolean; policy: MenuAccessPolicy }> => {
      const response = await api.put(`/menu-access/policies/${encodeURIComponent(menuKey)}`, data);
      return response.data;
    },
  },
  tableConfig: (() => {
    const tableCache = new Map<
      string,
      Promise<{ userConfig: ColumnConfig[] | null; defaultConfig: ColumnConfig[] | null }>
    >();
    return {
      get: async (
        tableId: string,
        forceRefresh = true
      ): Promise<{ userConfig: ColumnConfig[] | null; defaultConfig: ColumnConfig[] | null }> => {
        if (!forceRefresh && tableCache.has(tableId)) {
          return tableCache.get(tableId)!;
        }
        const promise = dedupeInFlightApiGet<{
          userConfig: ColumnConfig[] | null;
          defaultConfig: ColumnConfig[] | null;
        }>(`/table-config/${tableId}`).catch((err) => {
          tableCache.delete(tableId);
          throw err;
        });
        tableCache.set(tableId, promise);
        return promise;
      },
      save: async (
        tableId: string,
        columns: ColumnConfig[],
        saveAsDefault?: boolean
      ): Promise<{ success: boolean; message: string }> => {
        tableCache.delete(tableId);
        const response = await api.post(`/table-config/${tableId}`, { columns, saveAsDefault });
        return response.data;
      },
      reset: async (tableId: string): Promise<{ success: boolean; message: string }> => {
        tableCache.delete(tableId);
        const response = await api.post(`/table-config/${tableId}/reset`);
        return response.data;
      },
    };
  })(),
};
