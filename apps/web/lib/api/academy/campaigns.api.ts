import type {
  AcademyCampaign,
  AcademyCampaignActionResponse,
  AcademyCampaignLeadActionResponse,
  AcademyCampaignStats,
  AcademyCampaignStatus,
  AcademyCampaignTouchpointLogActionResponse,
  AddAcademyCampaignLeadsRequest,
  CreateAcademyCampaignRequest,
  ListAcademyCampaignLeadsParams,
  ListAcademyCampaignLeadsResponse,
  ListAcademyCampaignsParams,
  ListAcademyCampaignsResponse,
  RemoveAcademyCampaignLeadRequest,
  ToggleAcademyCampaignTouchpointLogRequest,
  UpdateAcademyCampaignRequest,
} from '@mos-lab/shared';

import { api, dedupeApiGet, invalidateAcademySalesReadCache } from '../base';

export const academyCampaignsApi = {
  sidebar: async (): Promise<AcademyCampaign[]> => {
    const response = await api.get<{ data: AcademyCampaign[] }>('/academy-sales/campaigns/sidebar');
    return response.data.data;
  },
  list: async (params?: ListAcademyCampaignsParams): Promise<ListAcademyCampaignsResponse> => {
    return dedupeApiGet<ListAcademyCampaignsResponse>(
      '/academy-sales/campaigns',
      params as Record<string, unknown> | undefined,
      800
    );
  },
  getById: async (id: number): Promise<AcademyCampaign> => {
    const response = await api.get<{ data: AcademyCampaign }>(`/academy-sales/campaigns/${id}`);
    return response.data.data;
  },
  getBySlug: async (slug: string): Promise<AcademyCampaign> => {
    const response = await api.get<{ data: AcademyCampaign }>(
      `/academy-sales/campaigns/slug/${encodeURIComponent(slug)}`
    );
    return response.data.data;
  },
  create: async (dto: CreateAcademyCampaignRequest): Promise<AcademyCampaignActionResponse> => {
    const response = await api.post<AcademyCampaignActionResponse>('/academy-sales/campaigns', dto);
    invalidateAcademySalesReadCache();
    return response.data;
  },
  update: async (id: number, dto: UpdateAcademyCampaignRequest): Promise<AcademyCampaignActionResponse> => {
    const response = await api.put<AcademyCampaignActionResponse>(`/academy-sales/campaigns/${id}`, dto);
    invalidateAcademySalesReadCache();
    return response.data;
  },
  setStatus: async (id: number, status: AcademyCampaignStatus): Promise<AcademyCampaignActionResponse> => {
    const response = await api.post<AcademyCampaignActionResponse>(`/academy-sales/campaigns/${id}/status`, {
      status,
    });
    invalidateAcademySalesReadCache();
    return response.data;
  },
  archive: async (id: number): Promise<AcademyCampaignActionResponse> => {
    const response = await api.post<AcademyCampaignActionResponse>(`/academy-sales/campaigns/${id}/archive`);
    invalidateAcademySalesReadCache();
    return response.data;
  },
  clone: async (id: number): Promise<AcademyCampaignActionResponse> => {
    const response = await api.post<AcademyCampaignActionResponse>(`/academy-sales/campaigns/${id}/clone`);
    invalidateAcademySalesReadCache();
    return response.data;
  },
  restore: async (id: number): Promise<AcademyCampaignActionResponse> => {
    const response = await api.post<AcademyCampaignActionResponse>(`/academy-sales/campaigns/${id}/restore`);
    invalidateAcademySalesReadCache();
    return response.data;
  },
  delete: async (id: number): Promise<{ success: true; message: string }> => {
    const response = await api.delete<{ success: true; message: string }>(`/academy-sales/campaigns/${id}`);
    invalidateAcademySalesReadCache();
    return response.data;
  },
  listLeads: async (id: number, params?: ListAcademyCampaignLeadsParams): Promise<ListAcademyCampaignLeadsResponse> => {
    return dedupeApiGet<ListAcademyCampaignLeadsResponse>(
      `/academy-sales/campaigns/${id}/leads`,
      params as Record<string, unknown> | undefined,
      800
    );
  },
  addLeads: async (id: number, dto: AddAcademyCampaignLeadsRequest): Promise<AcademyCampaignLeadActionResponse[]> => {
    const response = await api.post<AcademyCampaignLeadActionResponse[]>(`/academy-sales/campaigns/${id}/leads`, dto);
    invalidateAcademySalesReadCache();
    return response.data;
  },
  removeLead: async (
    id: number,
    leadId: number,
    dto: RemoveAcademyCampaignLeadRequest = {}
  ): Promise<AcademyCampaignLeadActionResponse> => {
    const response = await api.delete<AcademyCampaignLeadActionResponse>(
      `/academy-sales/campaigns/${id}/leads/${leadId}`,
      { data: dto }
    );
    invalidateAcademySalesReadCache();
    return response.data;
  },
  toggleTouchpoint: async (
    id: number,
    leadId: number,
    touchpointId: number,
    dto: ToggleAcademyCampaignTouchpointLogRequest
  ): Promise<AcademyCampaignTouchpointLogActionResponse> => {
    const response = await api.post<AcademyCampaignTouchpointLogActionResponse>(
      `/academy-sales/campaigns/${id}/leads/${leadId}/touchpoints/${touchpointId}`,
      dto
    );
    invalidateAcademySalesReadCache();
    return response.data;
  },
  getStats: async (id: number): Promise<AcademyCampaignStats> => {
    const response = await api.get<{ data: AcademyCampaignStats }>(`/academy-sales/campaigns/${id}/stats`);
    return response.data.data;
  },
};
