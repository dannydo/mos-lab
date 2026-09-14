import type {
  AddCampaignCustomersDto,
  AddCampaignCustomersResponse,
  BatchRemoveCampaignCustomersDto,
  BookingConfirmationTemplate,
  CampaignCustomersQueryParams,
  CloneCampaignDto,
  CreateCampaignDto,
  CreateCampaignPromotionDto,
  CreateSocialPostSubmissionDto,
  CreateSocialPostSubmissionResponse,
  CustomerCampaignPromotionInfo,
  CustomerSmsHistoryItem,
  ListCampaignsParams,
  RemoveCampaignCustomerDto,
  ReopenCampaignDto,
  ReviewSocialPostDto,
  SaveSmsTemplateInput,
  SendSmsRequest,
  SendSmsResponse,
  SmsTemplate,
  SocialPostApprovalRewardPreview,
  SocialPostLeaderboardQuery,
  SocialPostLeaderboardResponse,
  SocialPostListResponse,
  SocialPostPageQuery,
  SocialPostPosterDailyRewardQuery,
  SocialPostPosterDailyRewardResponse,
  SocialPostRewardConfig,
  ToggleCampaignTouchpointLogDto,
  TransferCampaignCustomersDto,
  UpdateCampaignDto,
} from '@mos-lab/shared';

import { api, dedupeApiGet } from './base';

export const campaignsApi = {
  nyc: {
    getConfig: async (): Promise<unknown> => {
      const response = await api.get('/nyc/config');
      return response.data;
    },
    updateConfig: async (configs: Record<string, unknown>): Promise<unknown> => {
      const response = await api.put('/nyc/config', configs);
      return response.data;
    },
  },
  loca: {
    getConfig: async (): Promise<unknown> => {
      const response = await api.get('/loca/config');
      return response.data;
    },
    updateConfig: async (configs: Record<string, unknown>): Promise<unknown> => {
      const response = await api.put('/loca/config', configs);
      return response.data;
    },
  },
  sms: {
    getTemplates: async (): Promise<SmsTemplate[]> => {
      const response = await api.get('/sms/templates');
      return response.data;
    },
    getBookingTemplates: async (): Promise<BookingConfirmationTemplate[]> => {
      const response = await api.get('/sms/booking-templates');
      return response.data;
    },
    saveBookingTemplate: async (
      data: BookingConfirmationTemplate
    ): Promise<{
      success: boolean;
      template: BookingConfirmationTemplate;
      templates: BookingConfirmationTemplate[];
    }> => {
      const response = await api.post('/sms/booking-templates', data);
      return response.data;
    },
    deleteBookingTemplate: async (
      id: string
    ): Promise<{ success: boolean; templates: BookingConfirmationTemplate[] }> => {
      const response = await api.delete(`/sms/booking-templates/${id}`);
      return response.data;
    },
    resetBookingTemplates: async (): Promise<{ success: boolean; templates: BookingConfirmationTemplate[] }> => {
      const response = await api.post('/sms/booking-templates/reset');
      return response.data;
    },

    saveTemplate: async (
      data: SaveSmsTemplateInput
    ): Promise<{ success: boolean; template: SmsTemplate; templates: SmsTemplate[] }> => {
      const response = await api.post('/sms/templates', data);
      return response.data;
    },
    deleteTemplate: async (id: string): Promise<{ success: boolean; templates: SmsTemplate[] }> => {
      const response = await api.delete(`/sms/templates/${id}`);
      return response.data;
    },
    getHistory: async (customerId: number): Promise<CustomerSmsHistoryItem[]> => {
      const response = await api.get(`/sms/history/${customerId}`);
      return response.data;
    },
    sendSms: async (data: SendSmsRequest): Promise<SendSmsResponse> => {
      const response = await api.post('/sms/send', data);
      return response.data;
    },
    getUserUrl: async (customerId: number): Promise<{ bookingUrl: string }> => {
      const response = await api.get(`/sms/user-url/${customerId}`);
      return response.data;
    },
  },
  postHub: {
    list: async (params: SocialPostPageQuery): Promise<SocialPostListResponse> => {
      return dedupeApiGet<SocialPostListResponse>('/post-hub/submissions', params as Record<string, unknown>, 1500);
    },
    create: async (dto: CreateSocialPostSubmissionDto): Promise<CreateSocialPostSubmissionResponse> => {
      const response = await api.post('/post-hub/submissions', dto);
      return response.data;
    },
    getLeaderboard: async (params?: SocialPostLeaderboardQuery): Promise<SocialPostLeaderboardResponse> => {
      return dedupeApiGet<SocialPostLeaderboardResponse>(
        '/post-hub/leaderboard',
        params as Record<string, unknown> | undefined,
        1500
      );
    },
    getPosterDailyRewards: async (
      staffId: number,
      params?: SocialPostPosterDailyRewardQuery
    ): Promise<SocialPostPosterDailyRewardResponse> => {
      return dedupeApiGet<SocialPostPosterDailyRewardResponse>(
        `/post-hub/leaderboard/${staffId}/daily`,
        params as Record<string, unknown> | undefined,
        500
      );
    },
    getRewardPreview: async (id: number): Promise<SocialPostApprovalRewardPreview> => {
      return dedupeApiGet<SocialPostApprovalRewardPreview>(
        `/post-hub/submissions/${id}/reward-preview`,
        undefined,
        500
      );
    },
    review: async (id: number, dto: ReviewSocialPostDto): Promise<{ success: true }> => {
      const response = await api.put(`/post-hub/submissions/${id}/review`, dto);
      return response.data;
    },
    getRewardConfig: async (): Promise<SocialPostRewardConfig> => {
      return dedupeApiGet<SocialPostRewardConfig>('/post-hub/reward-config', undefined, 1500);
    },
    updateRewardConfig: async (
      config: SocialPostRewardConfig
    ): Promise<{ success: true; data: SocialPostRewardConfig; message: string }> => {
      const response = await api.put('/post-hub/reward-config', config);
      return response.data;
    },
  },
  campaigns: {
    list: async (params?: ListCampaignsParams) => {
      const data = await dedupeApiGet<unknown[]>('/campaigns', params as Record<string, unknown>, 5000);
      return data;
    },
    getById: async (id: number) => {
      const response = await api.get(`/campaigns/${id}`);
      return response.data;
    },
    getBySlug: async (slug: string) => {
      try {
        const response = await api.get(`/campaigns/slug/${encodeURIComponent(slug)}`);
        return response.data;
      } catch (err: any) {
        if (err?.response?.status === 404 && !isNaN(Number(slug))) {
          const fallback = await api.get(`/campaigns/${slug}`);
          return fallback.data;
        }
        throw err;
      }
    },
    create: async (dto: CreateCampaignDto) => {
      const response = await api.post('/campaigns', dto);
      return response.data;
    },
    update: async (id: number, dto: UpdateCampaignDto) => {
      const response = await api.put(`/campaigns/${id}`, dto);
      return response.data;
    },
    delete: async (id: number) => {
      const response = await api.delete(`/campaigns/${id}`);
      return response.data;
    },
    endCampaign: async (id: number) => {
      const response = await api.post(`/campaigns/${id}/end`);
      return response.data;
    },
    pause: async (id: number) => {
      const response = await api.post(`/campaigns/${id}/pause`);
      return response.data;
    },
    resume: async (id: number) => {
      const response = await api.post(`/campaigns/${id}/resume`);
      return response.data;
    },
    complete: async (id: number) => {
      const response = await api.post(`/campaigns/${id}/complete`);
      return response.data;
    },
    archive: async (id: number) => {
      const response = await api.post(`/campaigns/${id}/archive`);
      return response.data;
    },
    unarchive: async (id: number) => {
      const response = await api.post(`/campaigns/${id}/unarchive`);
      return response.data;
    },
    reopen: async (id: number, dto?: ReopenCampaignDto) => {
      const response = await api.post(`/campaigns/${id}/reopen`, dto);
      return response.data;
    },
    restore: async (id: number) => {
      const response = await api.post(`/campaigns/${id}/restore`);
      return response.data;
    },
    clone: async (id: number, dto?: CloneCampaignDto) => {
      const response = await api.post(`/campaigns/${id}/clone`, dto);
      return response.data;
    },
    getCustomers: async (campaignId: number, params?: CampaignCustomersQueryParams) => {
      const response = await api.get(`/campaigns/${campaignId}/customers`, { params });
      return response.data;
    },
    addCustomers: async (campaignId: number, dto: AddCampaignCustomersDto): Promise<AddCampaignCustomersResponse> => {
      const response = await api.post(`/campaigns/${campaignId}/customers`, dto);
      return response.data;
    },
    transferCustomers: async (campaignId: number, dto: TransferCampaignCustomersDto) => {
      const response = await api.post(`/campaigns/${campaignId}/transfer-customers`, dto);
      return response.data;
    },
    removeCustomer: async (campaignId: number, customerId: number, dto?: RemoveCampaignCustomerDto) => {
      const response = await api.delete(
        `/campaigns/${campaignId}/customers/${customerId}`,
        dto ? { data: dto } : undefined
      );
      return response.data;
    },
    removeCustomersBatch: async (campaignId: number, dto: BatchRemoveCampaignCustomersDto) => {
      const response = await api.post(`/campaigns/${campaignId}/customers/batch-remove`, dto);
      return response.data;
    },
    toggleTouchpointLog: async (
      campaignId: number,
      customerId: number,
      touchpointId: number,
      dto: ToggleCampaignTouchpointLogDto
    ) => {
      const response = await api.post(
        `/campaigns/${campaignId}/customers/${customerId}/touchpoints/${touchpointId}`,
        dto
      );
      return response.data;
    },
    getPromotions: async (campaignId: number) => {
      const response = await api.get(`/campaigns/${campaignId}/promotions`);
      return response.data;
    },
    createPromotion: async (campaignId: number, dto: CreateCampaignPromotionDto) => {
      const response = await api.post(`/campaigns/${campaignId}/promotions`, dto);
      return response.data;
    },
    deletePromotion: async (campaignId: number, promotionId: number) => {
      const response = await api.delete(`/campaigns/${campaignId}/promotions/${promotionId}`);
      return response.data;
    },
    getStats: async (campaignId: number) => {
      const response = await api.get(`/campaigns/${campaignId}/stats`);
      return response.data;
    },
    getCustomerActivePromotions: async (customerId: number): Promise<CustomerCampaignPromotionInfo[]> => {
      const response = await api.get(`/campaigns/customer/${customerId}/active-promotions`);
      return response.data;
    },
  },
};
