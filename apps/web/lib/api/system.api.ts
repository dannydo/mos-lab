import type {
  ColumnConfig,
  PinnedLinkItem,
  CreateUiExperienceRequest,
  ExperienceJournalFingerprint,
  ExperienceJournalListQuery,
  ExperienceJournalListResponse,
  FalLogExplanationRecord,
  LoginRequest,
  LoginResponse,
  MenuAccessConfigurationResponse,
  MenuAccessInspectorResponse,
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
  UpdateRoleGroupMatrixRequest,
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
  FrontendIssueSyncResponse,
  UpdateFrontendIssueStatusRequest,
} from '@mos-lab/shared';

import { api, dedupeApiGet, dedupeInFlightApiGet, invalidateApiGetCache, ApiRequestOptions } from './base';

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
    syncStatus: async (): Promise<FrontendIssueSyncResponse> => {
      const response = await api.post<{ data: FrontendIssueSyncResponse }>('/telemetry/frontend-issues/sync');
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
      return dedupeApiGet<UiExperienceResolveResponse>(
        '/ui-experiences/resolve',
        params as unknown as Record<string, unknown>,
        15_000
      );
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
      invalidateApiGetCache(['/ui-experiences/']);
      return response.data.data;
    },
    revise: async (id: number, payload: ReviseUiExperienceRequest): Promise<UiExperienceActivation> => {
      const response = await api.put<{ data: UiExperienceActivation }>(`/ui-experiences/${id}/revisions`, payload);
      invalidateApiGetCache(['/ui-experiences/']);
      return response.data.data;
    },
    setLifecycle: async (id: number, payload: SetUiExperienceLifecycleRequest): Promise<UiExperienceActivation> => {
      const response = await api.post<{ data: UiExperienceActivation }>(`/ui-experiences/${id}/lifecycle`, payload);
      invalidateApiGetCache(['/ui-experiences/']);
      return response.data.data;
    },
    rollback: async (id: number, payload: RollbackUiExperienceRequest): Promise<UiExperienceActivation> => {
      const response = await api.post<{ data: UiExperienceActivation }>(`/ui-experiences/${id}/rollback`, payload);
      invalidateApiGetCache(['/ui-experiences/']);
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
    get: async (options?: ApiRequestOptions): Promise<{ deployedAt: string | null; commitSha: string | null }> => {
      return dedupeApiGet<{ deployedAt: string | null; commitSha: string | null }>(
        '/release',
        undefined,
        10_000,
        options
      );
    },
  },
  auth: {
    login: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await api.post('/auth/login', data);
      invalidateApiGetCache(['/auth/me', '/menu-access/sidebar', '/user-preferences/pinned-links', '/notifications']);
      return response.data;
    },
    google: async (data: {
      credential?: string;
      isMock?: boolean;
      email?: string;
      name?: string;
    }): Promise<LoginResponse> => {
      const response = await api.post('/auth/google', data);
      invalidateApiGetCache(['/auth/me', '/menu-access/sidebar', '/user-preferences/pinned-links', '/notifications']);
      return response.data;
    },
    me: async (): Promise<Staff> => {
      const payload = await dedupeApiGet<{ user?: Staff } & Staff>('/auth/me', undefined, 10_000);
      return payload?.user || payload;
    },
    impersonate: async (userId: number): Promise<LoginResponse> => {
      const response = await api.post('/auth/impersonate', { userId });
      invalidateApiGetCache(['/auth/me', '/menu-access/sidebar', '/user-preferences/pinned-links', '/notifications']);
      return response.data;
    },
    endImpersonation: async (auditId: number): Promise<{ success: boolean }> => {
      const response = await api.post('/auth/impersonate/exit', { auditId });
      invalidateApiGetCache(['/auth/me', '/menu-access/sidebar', '/user-preferences/pinned-links', '/notifications']);
      return response.data;
    },
    getDevDirectory: async (): Promise<{
      staffs: Array<{
        id: number;
        username: string;
        displayName: string;
        role: string;
        email?: string | null;
        avatarUrl?: string | null;
      }>;
    }> => {
      const response = await api.get('/auth/dev-directory');
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
    getSidebarVisibility: async (options?: { force?: boolean }): Promise<MenuAccessSidebarResponse> => {
      if (options?.force) {
        invalidateApiGetCache(['/menu-access/sidebar']);
      }
      return dedupeApiGet<MenuAccessSidebarResponse>('/menu-access/sidebar', undefined, 30_000);
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
      invalidateApiGetCache(['/menu-access/sidebar']);
      return response.data;
    },
    updateRoleGroupMatrix: async (
      roleGroupId: number,
      data: UpdateRoleGroupMatrixRequest
    ): Promise<{ success: boolean; roleGroupId: number; allowedMenuKeys: string[] }> => {
      const response = await api.put(`/menu-access/role-groups/${roleGroupId}`, data);
      invalidateApiGetCache(['/menu-access/sidebar']);
      return response.data;
    },
    inspectPermissions: async (params: {
      staffId?: number;
      roleGroupId?: number;
      at?: string;
    }): Promise<MenuAccessInspectorResponse> => {
      const response = await api.get<MenuAccessInspectorResponse>('/menu-access/inspect', { params });
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
  userPreferences: {
    getPinnedLinks: async (): Promise<PinnedLinkItem[]> => {
      const data = await dedupeApiGet<{ success: boolean; data: PinnedLinkItem[] }>(
        '/user-preferences/pinned-links',
        undefined,
        15_000
      );
      return data.data || [];
    },
    savePinnedLinks: async (items: PinnedLinkItem[]): Promise<PinnedLinkItem[]> => {
      const response = await api.put<{ success: boolean; data: PinnedLinkItem[] }>('/user-preferences/pinned-links', {
        items,
      });
      invalidateApiGetCache(['/user-preferences/pinned-links']);
      return response.data.data || [];
    },
    addPinnedLink: async (payload: {
      title: string;
      url: string;
      icon?: string;
      isExternal?: boolean;
      menuKey?: string;
    }): Promise<PinnedLinkItem[]> => {
      const response = await api.post<{ success: boolean; data: PinnedLinkItem[] }>(
        '/user-preferences/pinned-links',
        payload
      );
      invalidateApiGetCache(['/user-preferences/pinned-links']);
      return response.data.data || [];
    },
    removePinnedLink: async (id: string): Promise<PinnedLinkItem[]> => {
      const response = await api.delete<{ success: boolean; data: PinnedLinkItem[] }>(
        `/user-preferences/pinned-links/${encodeURIComponent(id)}`
      );
      invalidateApiGetCache(['/user-preferences/pinned-links']);
      return response.data.data || [];
    },
  },
};
