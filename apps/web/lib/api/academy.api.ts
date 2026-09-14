import type {
  AcademyCampaign,
  AcademyCampaignActionResponse,
  AcademyCampaignLeadActionResponse,
  AcademyCampaignStats,
  AcademyCampaignStatus,
  AcademyCampaignTouchpointLogActionResponse,
  AcademyCourse,
  AcademyImportReport,
  AcademyInstructorBonus,
  AcademyLeadActionResponse,
  AcademyLeadDetail,
  AcademyPlaybook,
  AcademyStaffOption,
  AcademyTalentAssessmentActionResponse,
  AcademyTalentInstructorActionResponse,
  AcademyTalentLadderConfiguration,
  AcademyTalentLadderConfigurationActionResponse,
  AcademyTalentPaymentTraceResponse,
  AcademyWorkshopAgendaCommandRequest,
  AcademyWorkshopAgendaItem,
  AcademyWorkshopAgendaTemplate,
  AcademyWorkshopAnswerReceipt,
  AcademyWorkshopDetail,
  AcademyWorkshopEquipmentPackage,
  AcademyWorkshopEquipmentPackageImage,
  AcademyWorkshopEquipmentTemplate,
  AcademyWorkshopGameCommandRequest,
  AcademyWorkshopLiveState,
  AcademyWorkshopMenuItem,
  AcademyWorkshopMenuTemplate,
  AcademyWorkshopParticipant,
  AcademyWorkshopPhotoUploadIntent,
  AcademyWorkshopPublicMediaUploadResult,
  AcademyWorkshopPublicRegistrationInfo,
  AcademyWorkshopPublicSession,
  AcademyWorkshopQuiz,
  AcademyWorkshopQuizQuestion,
  AcademyWorkshopResourcesResponse,
  AcademyWorkshopReward,
  AcademyWorkshopSharedJoinInfo,
  AcademyWorkshopTalentLeaderboardEntry,
  AcademyWorkspaceAccessResponse,
  AddAcademyCampaignLeadsRequest,
  AddAcademyWorkshopParticipantsRequest,
  AssignAcademyWorkshopInstructorRequest,
  CheckInAcademyWorkshopParticipantRequest,
  CloneAcademyWorkshopQuizRequest,
  ConfirmAcademyWorkshopPhotoRequest,
  CreateAcademyActivityRequest,
  CreateAcademyCampaignRequest,
  CreateAcademyFollowUpRequest,
  CreateAcademyLeadRequest,
  CreateAcademyTalentAssessmentRequest,
  CreateAcademyWorkshopAgendaItemRequest,
  CreateAcademyWorkshopAgendaTemplateRequest,
  CreateAcademyWorkshopEquipmentPackageImageRequest,
  CreateAcademyWorkshopEquipmentPackageRequest,
  CreateAcademyWorkshopMenuItemRequest,
  CreateAcademyWorkshopPhotoUploadRequest,
  CreateAcademyWorkshopPublicMediaUploadRequest,
  CreateAcademyWorkshopRequest,
  CreateAcademyWorkshopWalkInRequest,
  FindAcademyWorkshopRegistrationWithGoogleRequest,
  FindAcademyWorkshopRegistrationWithZaloRequest,
  JoinAcademyWorkshopWithGoogleRequest,
  ListAcademyCampaignLeadsParams,
  ListAcademyCampaignLeadsResponse,
  ListAcademyCampaignsParams,
  ListAcademyCampaignsResponse,
  ListAcademyFollowUpsParams,
  ListAcademyFollowUpsResponse,
  ListAcademyLeadCalendarParams,
  ListAcademyLeadCalendarResponse,
  ListAcademyLeadsParams,
  ListAcademyLeadsResponse,
  ListAcademyTalentAssessmentsResponse,
  ListAcademyTalentInstructorsResponse,
  ListAcademyTalentPaymentManagementParams,
  ListAcademyTalentPaymentManagementResponse,
  ListAcademyWorkshopAgendaTemplatesParams,
  ListAcademyWorkshopAgendaTemplatesResponse,
  ListAcademyWorkshopEquipmentTemplatesParams,
  ListAcademyWorkshopEquipmentTemplatesResponse,
  ListAcademyWorkshopMenuTemplatesParams,
  ListAcademyWorkshopMenuTemplatesResponse,
  ListAcademyWorkshopParticipantsParams,
  ListAcademyWorkshopParticipantsResponse,
  ListAcademyWorkshopQuizTemplatesParams,
  ListAcademyWorkshopQuizTemplatesResponse,
  ListAcademyWorkshopsParams,
  ListAcademyWorkshopsResponse,
  PreviewAcademyTalentAssessmentQuoteRequest,
  PreviewAcademyTalentAssessmentQuoteResponse,
  RecordAcademyNoShowRequest,
  RecordAcademyTalentPaymentRequest,
  RecordAcademyWorkshopFeeRequest,
  RedeemAcademyWorkshopDisplayRequest,
  RedeemAcademyWorkshopQrRequest,
  RegisterAcademyWorkshopRequest,
  RegisterAcademyWorkshopResponse,
  RegisterAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopWithZaloRequest,
  RemoveAcademyCampaignLeadRequest,
  ReorderAcademyWorkshopAgendaRequest,
  SaveAcademyWorkshopEquipmentTemplateRequest,
  SaveAcademyWorkshopMenuTemplateRequest,
  SelectAcademyWorkshopParticipantRequest,
  SetAcademyWorkshopAgendaResourceRequest,
  SetAcademyWorkshopPhotoConsentRequest,
  SubmitAcademyWorkshopAnswerRequest,
  ToggleAcademyCampaignTouchpointLogRequest,
  UpdateAcademyCampaignRequest,
  UpdateAcademyFollowUpRequest,
  UpdateAcademyInstructorBonusRequest,
  UpdateAcademyLeadRequest,
  UpdateAcademyTalentAssessmentRequest,
  UpdateAcademyTalentLadderConfigurationRequest,
  UpdateAcademyWorkshopAgendaItemRequest,
  UpdateAcademyWorkshopAgendaTemplateRequest,
  UpdateAcademyWorkshopCareRequest,
  UpdateAcademyWorkshopDisplaySettingsRequest,
  UpdateAcademyWorkshopEquipmentPackageImageRequest,
  UpdateAcademyWorkshopEquipmentPackageRequest,
  UpdateAcademyWorkshopEquipmentTemplateRequest,
  UpdateAcademyWorkshopMenuItemRequest,
  UpdateAcademyWorkshopRequest,
  UpdateAcademyWorkshopRewardRequest,
  UpsertAcademyCourseRequest,
  UpsertAcademyPlaybookRequest,
  UpsertAcademyTalentInstructorRequest,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
  WaiveAcademyWorkshopFeeRequest,
} from '@mos-lab/shared';

import { api, dedupeApiGet, invalidateAcademySalesReadCache, resolveApiBaseUrl } from './base';

export const academyApi = {
  academySales: {
    getAccess: async (): Promise<AcademyWorkspaceAccessResponse> => {
      return dedupeApiGet<AcademyWorkspaceAccessResponse>('/academy-sales/access', undefined, 1_500);
    },
    listLeads: async (params: ListAcademyLeadsParams): Promise<ListAcademyLeadsResponse> => {
      return dedupeApiGet<ListAcademyLeadsResponse>('/academy-sales/leads', params as Record<string, unknown>, 800);
    },
    listCalendar: async (params: ListAcademyLeadCalendarParams): Promise<ListAcademyLeadCalendarResponse> => {
      return dedupeApiGet<ListAcademyLeadCalendarResponse>(
        '/academy-sales/calendar',
        params as Record<string, unknown>,
        800
      );
    },
    getLead: async (id: number): Promise<AcademyLeadDetail> => {
      const response = await api.get<{ data: AcademyLeadDetail }>(`/academy-sales/leads/${id}`);
      return response.data.data;
    },
    createLead: async (dto: CreateAcademyLeadRequest): Promise<AcademyLeadActionResponse> => {
      const response = await api.post<AcademyLeadActionResponse>('/academy-sales/leads', dto);
      invalidateAcademySalesReadCache();
      return response.data;
    },
    updateLead: async (id: number, dto: UpdateAcademyLeadRequest): Promise<AcademyLeadActionResponse> => {
      const response = await api.put<AcademyLeadActionResponse>(`/academy-sales/leads/${id}`, dto);
      invalidateAcademySalesReadCache();
      return response.data;
    },
    addActivity: async (id: number, dto: CreateAcademyActivityRequest) => {
      const response = await api.post(`/academy-sales/leads/${id}/activities`, dto);
      invalidateAcademySalesReadCache();
      return response.data;
    },
    recordNoShow: async (id: number, dto: RecordAcademyNoShowRequest = {}) => {
      const response = await api.post<AcademyLeadActionResponse>(`/academy-sales/leads/${id}/no-show`, dto);
      invalidateAcademySalesReadCache();
      return response.data;
    },
    listTalentInstructors: async (): Promise<ListAcademyTalentInstructorsResponse> => {
      return dedupeApiGet<ListAcademyTalentInstructorsResponse>('/academy-sales/talent-instructors', undefined, 5_000);
    },
    listTalentInstructorConfigurations: async (): Promise<ListAcademyTalentInstructorsResponse> => {
      return dedupeApiGet<ListAcademyTalentInstructorsResponse>(
        '/academy-sales/talent-instructors/manage',
        undefined,
        500
      );
    },
    createTalentInstructor: async (
      dto: UpsertAcademyTalentInstructorRequest
    ): Promise<AcademyTalentInstructorActionResponse> => {
      const response = await api.post<AcademyTalentInstructorActionResponse>('/academy-sales/talent-instructors', dto);
      invalidateAcademySalesReadCache();
      return response.data;
    },
    updateTalentInstructor: async (
      id: number,
      dto: UpsertAcademyTalentInstructorRequest
    ): Promise<AcademyTalentInstructorActionResponse> => {
      const response = await api.put<AcademyTalentInstructorActionResponse>(
        `/academy-sales/talent-instructors/${id}`,
        dto
      );
      invalidateAcademySalesReadCache();
      return response.data;
    },
    getTalentLadderConfiguration: async (): Promise<AcademyTalentLadderConfiguration> => {
      const response = await api.get<{ data: AcademyTalentLadderConfiguration }>('/academy-sales/talent-ladder');
      return response.data.data;
    },
    updateTalentLadderConfiguration: async (
      dto: UpdateAcademyTalentLadderConfigurationRequest
    ): Promise<AcademyTalentLadderConfigurationActionResponse> => {
      const response = await api.put<AcademyTalentLadderConfigurationActionResponse>(
        '/academy-sales/talent-ladder',
        dto
      );
      invalidateAcademySalesReadCache();
      return response.data;
    },
    listTalentAssessments: async (leadId: number): Promise<ListAcademyTalentAssessmentsResponse> => {
      return dedupeApiGet<ListAcademyTalentAssessmentsResponse>(
        `/academy-sales/leads/${leadId}/talent-assessments`,
        undefined,
        300
      );
    },
    listTalentPaymentManagement: async (
      params: ListAcademyTalentPaymentManagementParams
    ): Promise<ListAcademyTalentPaymentManagementResponse> => {
      return dedupeApiGet<ListAcademyTalentPaymentManagementResponse>(
        '/academy-sales/talent-payments',
        params as Record<string, unknown>,
        800
      );
    },
    getTalentPaymentTrace: async (assessmentId: number): Promise<AcademyTalentPaymentTraceResponse> => {
      return dedupeApiGet<AcademyTalentPaymentTraceResponse>(
        `/academy-sales/talent-payments/${assessmentId}/trace`,
        undefined,
        300
      );
    },
    previewTalentAssessmentQuote: async (
      leadId: number,
      dto: PreviewAcademyTalentAssessmentQuoteRequest
    ): Promise<PreviewAcademyTalentAssessmentQuoteResponse> => {
      const response = await api.post<PreviewAcademyTalentAssessmentQuoteResponse>(
        `/academy-sales/leads/${leadId}/talent-assessments/preview`,
        dto
      );
      return response.data;
    },
    createTalentAssessment: async (
      leadId: number,
      dto: CreateAcademyTalentAssessmentRequest = {}
    ): Promise<AcademyTalentAssessmentActionResponse> => {
      const response = await api.post<AcademyTalentAssessmentActionResponse>(
        `/academy-sales/leads/${leadId}/talent-assessments`,
        dto
      );
      invalidateAcademySalesReadCache();
      return response.data;
    },
    updateTalentAssessment: async (
      assessmentId: number,
      dto: UpdateAcademyTalentAssessmentRequest
    ): Promise<AcademyTalentAssessmentActionResponse> => {
      const response = await api.put<AcademyTalentAssessmentActionResponse>(
        `/academy-sales/talent-assessments/${assessmentId}`,
        dto
      );
      invalidateAcademySalesReadCache();
      return response.data;
    },
    printTalentAssessmentInvoice: async (assessmentId: number): Promise<AcademyTalentAssessmentActionResponse> => {
      const response = await api.post<AcademyTalentAssessmentActionResponse>(
        `/academy-sales/talent-assessments/${assessmentId}/print`
      );
      invalidateAcademySalesReadCache();
      return response.data;
    },
    recordTalentAssessmentPayment: async (
      assessmentId: number,
      dto: RecordAcademyTalentPaymentRequest
    ): Promise<AcademyTalentAssessmentActionResponse> => {
      const response = await api.post<AcademyTalentAssessmentActionResponse>(
        `/academy-sales/talent-assessments/${assessmentId}/payments`,
        dto
      );
      invalidateAcademySalesReadCache();
      return response.data;
    },
    listFollowUps: async (params: ListAcademyFollowUpsParams): Promise<ListAcademyFollowUpsResponse> => {
      return dedupeApiGet<ListAcademyFollowUpsResponse>(
        '/academy-sales/follow-ups',
        params as Record<string, unknown>,
        800
      );
    },
    createFollowUp: async (dto: CreateAcademyFollowUpRequest) => {
      const response = await api.post(`/academy-sales/follow-ups`, dto);
      invalidateAcademySalesReadCache();
      return response.data;
    },
    updateFollowUp: async (id: number, dto: UpdateAcademyFollowUpRequest) => {
      const response = await api.put(`/academy-sales/follow-ups/${id}`, dto);
      invalidateAcademySalesReadCache();
      return response.data;
    },
    listStaff: async (): Promise<AcademyStaffOption[]> => {
      const response = await api.get<{ data: AcademyStaffOption[] }>('/academy-sales/staff');
      return response.data.data;
    },
    listPlaybooks: async (): Promise<AcademyPlaybook[]> => {
      const response = await api.get<{ data: AcademyPlaybook[] }>('/academy-sales/playbooks');
      return response.data.data;
    },
    createPlaybook: async (dto: UpsertAcademyPlaybookRequest) => {
      const response = await api.post('/academy-sales/playbooks', dto);
      return response.data;
    },
    updatePlaybook: async (id: number, dto: UpsertAcademyPlaybookRequest) => {
      const response = await api.put(`/academy-sales/playbooks/${id}`, dto);
      return response.data;
    },
    listCourses: async (): Promise<AcademyCourse[]> => {
      const response = await api.get<{ data: AcademyCourse[] }>('/academy-sales/courses');
      return response.data.data;
    },
    createCourse: async (dto: UpsertAcademyCourseRequest) => {
      const response = await api.post('/academy-sales/courses', dto);
      return response.data;
    },
    updateCourse: async (id: number, dto: UpsertAcademyCourseRequest) => {
      const response = await api.put(`/academy-sales/courses/${id}`, dto);
      return response.data;
    },
    importSupabase: async (dryRun = true): Promise<{ success: true; data: AcademyImportReport; message: string }> => {
      const response = await api.post('/academy-sales/import/supabase', { dryRun });
      if (!dryRun) invalidateAcademySalesReadCache();
      return response.data;
    },
    syncPancake: async () => {
      const response = await api.post('/academy-sales/sync/pancake');
      invalidateAcademySalesReadCache();
      return response.data;
    },
    workshops: {
      listAgendaTemplates: async (
        params: ListAcademyWorkshopAgendaTemplatesParams = {}
      ): Promise<ListAcademyWorkshopAgendaTemplatesResponse> => {
        const response = await api.get<ListAcademyWorkshopAgendaTemplatesResponse>(
          '/academy-sales/workshop-agenda-templates',
          { params }
        );
        return response.data;
      },
      createAgendaTemplate: async (
        dto: CreateAcademyWorkshopAgendaTemplateRequest
      ): Promise<AcademyWorkshopAgendaTemplate> => {
        const response = await api.post<{ data: AcademyWorkshopAgendaTemplate }>(
          '/academy-sales/workshop-agenda-templates',
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      updateAgendaTemplate: async (
        templateId: number,
        dto: UpdateAcademyWorkshopAgendaTemplateRequest
      ): Promise<AcademyWorkshopAgendaTemplate> => {
        const response = await api.put<{ data: AcademyWorkshopAgendaTemplate }>(
          `/academy-sales/workshop-agenda-templates/${templateId}`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      deleteAgendaTemplate: async (templateId: number): Promise<void> => {
        await api.delete(`/academy-sales/workshop-agenda-templates/${templateId}`);
        invalidateAcademySalesReadCache();
      },
      listMenuTemplates: async (
        params: ListAcademyWorkshopMenuTemplatesParams = {}
      ): Promise<ListAcademyWorkshopMenuTemplatesResponse> => {
        const response = await api.get<ListAcademyWorkshopMenuTemplatesResponse>(
          '/academy-sales/workshop-menu-templates',
          { params }
        );
        return response.data;
      },
      deleteMenuTemplate: async (templateId: number): Promise<void> => {
        await api.delete(`/academy-sales/workshop-menu-templates/${templateId}`);
        invalidateAcademySalesReadCache();
      },
      listEquipmentTemplates: async (
        params: ListAcademyWorkshopEquipmentTemplatesParams = {}
      ): Promise<ListAcademyWorkshopEquipmentTemplatesResponse> => {
        const response = await api.get<ListAcademyWorkshopEquipmentTemplatesResponse>(
          '/academy-sales/workshop-equipment-templates',
          { params }
        );
        return response.data;
      },
      updateEquipmentTemplate: async (
        templateId: number,
        dto: UpdateAcademyWorkshopEquipmentTemplateRequest
      ): Promise<AcademyWorkshopEquipmentTemplate> => {
        const response = await api.put<{ data: AcademyWorkshopEquipmentTemplate }>(
          `/academy-sales/workshop-equipment-templates/${templateId}`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      deleteEquipmentTemplate: async (templateId: number): Promise<void> => {
        await api.delete(`/academy-sales/workshop-equipment-templates/${templateId}`);
        invalidateAcademySalesReadCache();
      },
      list: async (params?: ListAcademyWorkshopsParams): Promise<ListAcademyWorkshopsResponse> => {
        return dedupeApiGet<ListAcademyWorkshopsResponse>(
          '/academy-sales/workshops',
          params as Record<string, unknown> | undefined,
          500
        );
      },
      getBySlug: async (slug: string): Promise<AcademyWorkshopDetail> => {
        const response = await api.get<{ data: AcademyWorkshopDetail }>(
          `/academy-sales/workshops/slug/${encodeURIComponent(slug)}`
        );
        return response.data.data;
      },
      create: async (dto: CreateAcademyWorkshopRequest): Promise<AcademyWorkshopDetail> => {
        const response = await api.post<{ data: AcademyWorkshopDetail }>('/academy-sales/workshops', dto);
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      update: async (workshopId: number, dto: UpdateAcademyWorkshopRequest): Promise<AcademyWorkshopDetail> => {
        const response = await api.put<{ data: AcademyWorkshopDetail }>(`/academy-sales/workshops/${workshopId}`, dto);
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      uploadHeroImage: async (
        workshopId: number,
        dto: CreateAcademyWorkshopPublicMediaUploadRequest
      ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
        const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
          `/academy-sales/workshops/${workshopId}/hero-image/upload`,
          dto
        );
        return response.data.data;
      },
      uploadQuizImage: async (
        workshopId: number,
        dto: CreateAcademyWorkshopPublicMediaUploadRequest
      ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
        const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
          `/academy-sales/workshops/${workshopId}/quiz-images/upload`,
          dto
        );
        return response.data.data;
      },
      createMenuItem: async (
        workshopId: number,
        dto: CreateAcademyWorkshopMenuItemRequest
      ): Promise<AcademyWorkshopMenuItem> => {
        const response = await api.post<{ data: AcademyWorkshopMenuItem }>(
          `/academy-sales/workshops/${workshopId}/menu-items`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      uploadMenuImage: async (
        workshopId: number,
        dto: CreateAcademyWorkshopPublicMediaUploadRequest
      ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
        const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
          `/academy-sales/workshops/${workshopId}/menu-items/upload-image`,
          dto
        );
        return response.data.data;
      },
      setMenuAgendaItem: async (
        workshopId: number,
        dto: SetAcademyWorkshopAgendaResourceRequest
      ): Promise<AcademyWorkshopDetail> => {
        const response = await api.put<{ data: AcademyWorkshopDetail }>(
          `/academy-sales/workshops/${workshopId}/menu-service`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      setEquipmentAgendaItem: async (
        workshopId: number,
        dto: SetAcademyWorkshopAgendaResourceRequest
      ): Promise<AcademyWorkshopDetail> => {
        const response = await api.put<{ data: AcademyWorkshopDetail }>(
          `/academy-sales/workshops/${workshopId}/equipment-service`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      updateMenuItem: async (
        workshopId: number,
        menuItemId: number,
        dto: UpdateAcademyWorkshopMenuItemRequest
      ): Promise<AcademyWorkshopMenuItem> => {
        const response = await api.put<{ data: AcademyWorkshopMenuItem }>(
          `/academy-sales/workshops/${workshopId}/menu-items/${menuItemId}`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      deleteMenuItem: async (workshopId: number, menuItemId: number): Promise<void> => {
        await api.delete(`/academy-sales/workshops/${workshopId}/menu-items/${menuItemId}`);
        invalidateAcademySalesReadCache();
      },
      saveMenuAsTemplate: async (
        workshopId: number,
        dto: SaveAcademyWorkshopMenuTemplateRequest
      ): Promise<AcademyWorkshopMenuTemplate> => {
        const response = await api.post<{ data: AcademyWorkshopMenuTemplate }>(
          `/academy-sales/workshops/${workshopId}/menu-templates`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      refreshMenuTemplateFromWorkshop: async (
        workshopId: number,
        templateId: number
      ): Promise<AcademyWorkshopMenuTemplate> => {
        const response = await api.post<{ data: AcademyWorkshopMenuTemplate }>(
          `/academy-sales/workshops/${workshopId}/menu-templates/${templateId}/refresh`
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      applyMenuTemplate: async (workshopId: number, templateId: number): Promise<AcademyWorkshopDetail> => {
        const response = await api.post<{ data: AcademyWorkshopDetail }>(
          `/academy-sales/workshops/${workshopId}/menu-templates/${templateId}/apply`
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      createEquipmentPackage: async (
        workshopId: number,
        dto: CreateAcademyWorkshopEquipmentPackageRequest
      ): Promise<AcademyWorkshopEquipmentPackage> => {
        const response = await api.post<{ data: AcademyWorkshopEquipmentPackage }>(
          `/academy-sales/workshops/${workshopId}/equipment-packages`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      uploadEquipmentImage: async (
        workshopId: number,
        dto: CreateAcademyWorkshopPublicMediaUploadRequest
      ): Promise<AcademyWorkshopPublicMediaUploadResult> => {
        const response = await api.post<{ data: AcademyWorkshopPublicMediaUploadResult }>(
          `/academy-sales/workshops/${workshopId}/equipment-images/upload`,
          dto
        );
        return response.data.data;
      },
      updateEquipmentPackage: async (
        workshopId: number,
        equipmentPackageId: number,
        dto: UpdateAcademyWorkshopEquipmentPackageRequest
      ): Promise<AcademyWorkshopEquipmentPackage> => {
        const response = await api.put<{ data: AcademyWorkshopEquipmentPackage }>(
          `/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      deleteEquipmentPackage: async (workshopId: number, equipmentPackageId: number): Promise<void> => {
        await api.delete(`/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}`);
        invalidateAcademySalesReadCache();
      },
      saveEquipmentAsTemplate: async (
        workshopId: number,
        dto: SaveAcademyWorkshopEquipmentTemplateRequest
      ): Promise<AcademyWorkshopEquipmentTemplate> => {
        const response = await api.post<{ data: AcademyWorkshopEquipmentTemplate }>(
          `/academy-sales/workshops/${workshopId}/equipment-templates`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      refreshEquipmentTemplateFromWorkshop: async (
        workshopId: number,
        templateId: number
      ): Promise<AcademyWorkshopEquipmentTemplate> => {
        const response = await api.post<{ data: AcademyWorkshopEquipmentTemplate }>(
          `/academy-sales/workshops/${workshopId}/equipment-templates/${templateId}/refresh`
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      applyEquipmentTemplate: async (workshopId: number, templateId: number): Promise<AcademyWorkshopDetail> => {
        const response = await api.post<{ data: AcademyWorkshopDetail }>(
          `/academy-sales/workshops/${workshopId}/equipment-templates/${templateId}/apply`
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      createEquipmentPackageImage: async (
        workshopId: number,
        equipmentPackageId: number,
        dto: CreateAcademyWorkshopEquipmentPackageImageRequest
      ): Promise<AcademyWorkshopEquipmentPackageImage> => {
        const response = await api.post<{ data: AcademyWorkshopEquipmentPackageImage }>(
          `/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}/images`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      updateEquipmentPackageImage: async (
        workshopId: number,
        equipmentPackageId: number,
        imageId: number,
        dto: UpdateAcademyWorkshopEquipmentPackageImageRequest
      ): Promise<AcademyWorkshopEquipmentPackageImage> => {
        const response = await api.put<{ data: AcademyWorkshopEquipmentPackageImage }>(
          `/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}/images/${imageId}`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      deleteEquipmentPackageImage: async (
        workshopId: number,
        equipmentPackageId: number,
        imageId: number
      ): Promise<void> => {
        await api.delete(
          `/academy-sales/workshops/${workshopId}/equipment-packages/${equipmentPackageId}/images/${imageId}`
        );
        invalidateAcademySalesReadCache();
      },
      resources: async (): Promise<AcademyWorkshopResourcesResponse> => {
        const response = await api.get<{ data: AcademyWorkshopResourcesResponse }>(
          '/academy-sales/workshops/resources'
        );
        return response.data.data;
      },
      listParticipants: async (
        workshopId: number,
        params?: ListAcademyWorkshopParticipantsParams
      ): Promise<ListAcademyWorkshopParticipantsResponse> => {
        const response = await api.get<ListAcademyWorkshopParticipantsResponse>(
          `/academy-sales/workshops/${workshopId}/participants`,
          { params }
        );
        return response.data;
      },
      addParticipants: async (
        workshopId: number,
        dto: AddAcademyWorkshopParticipantsRequest
      ): Promise<AcademyWorkshopParticipant[]> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant[] }>(
          `/academy-sales/workshops/${workshopId}/participants`,
          dto
        );
        return response.data.data;
      },
      addWalkIn: async (
        workshopId: number,
        dto: CreateAcademyWorkshopWalkInRequest
      ): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/walk-ins`,
          dto
        );
        return response.data.data;
      },
      updateCare: async (
        workshopId: number,
        participantId: number,
        dto: UpdateAcademyWorkshopCareRequest
      ): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/care`,
          dto
        );
        return response.data.data;
      },
      checkIn: async (
        workshopId: number,
        participantId: number,
        dto: CheckInAcademyWorkshopParticipantRequest = {}
      ): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/check-in`,
          dto
        );
        return response.data.data;
      },
      scanCheckIn: async (workshopId: number, qrToken: string): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/scan-check-in`,
          { qrToken }
        );
        return response.data.data;
      },
      reissueQr: async (workshopId: number, participantId: number): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/reissue-qr`
        );
        return response.data.data;
      },
      recordFee: async (
        workshopId: number,
        participantId: number,
        dto: RecordAcademyWorkshopFeeRequest
      ): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/fee`,
          dto
        );
        return response.data.data;
      },
      waiveFee: async (
        workshopId: number,
        participantId: number,
        dto: WaiveAcademyWorkshopFeeRequest
      ): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/waive-fee`,
          dto
        );
        return response.data.data;
      },
      setConsent: async (
        workshopId: number,
        participantId: number,
        dto: SetAcademyWorkshopPhotoConsentRequest
      ): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/consent`,
          dto
        );
        return response.data.data;
      },
      createPhotoUploadIntent: async (
        workshopId: number,
        participantId: number,
        dto: CreateAcademyWorkshopPhotoUploadRequest
      ): Promise<AcademyWorkshopPhotoUploadIntent> => {
        const response = await api.post<{ data: AcademyWorkshopPhotoUploadIntent }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/photos/upload-intent`,
          dto
        );
        return response.data.data;
      },
      confirmPhoto: async (
        workshopId: number,
        participantId: number,
        dto: ConfirmAcademyWorkshopPhotoRequest
      ): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/photos/confirm`,
          dto
        );
        return response.data.data;
      },
      assignInstructor: async (
        workshopId: number,
        participantId: number,
        dto: AssignAcademyWorkshopInstructorRequest
      ): Promise<AcademyWorkshopParticipant> => {
        const response = await api.post<{ data: AcademyWorkshopParticipant }>(
          `/academy-sales/workshops/${workshopId}/participants/${participantId}/instructor`,
          dto
        );
        return response.data.data;
      },
      talentLeaderboard: async (workshopId: number): Promise<AcademyWorkshopTalentLeaderboardEntry[]> => {
        const response = await api.get<{ data: AcademyWorkshopTalentLeaderboardEntry[] }>(
          `/academy-sales/workshops/${workshopId}/talent-leaderboard`
        );
        return response.data.data;
      },
      liveState: async (workshopId: number): Promise<AcademyWorkshopLiveState> => {
        const response = await api.get<{ data: AcademyWorkshopLiveState }>(
          `/academy-sales/workshops/${workshopId}/live-state`
        );
        return response.data.data;
      },
      updateDisplaySettings: async (
        workshopId: number,
        dto: UpdateAcademyWorkshopDisplaySettingsRequest
      ): Promise<AcademyWorkshopLiveState> => {
        const response = await api.put<{ data: AcademyWorkshopLiveState }>(
          `/academy-sales/workshops/${workshopId}/display-settings`,
          dto
        );
        return response.data.data;
      },
      agendaCommand: async (workshopId: number, agendaItemId: number, dto: AcademyWorkshopAgendaCommandRequest) => {
        const response = await api.post(`/academy-sales/workshops/${workshopId}/agenda/${agendaItemId}/command`, dto);
        return response.data;
      },
      createAgendaItem: async (
        workshopId: number,
        dto: CreateAcademyWorkshopAgendaItemRequest
      ): Promise<AcademyWorkshopAgendaItem> => {
        const response = await api.post<{ data: AcademyWorkshopAgendaItem }>(
          `/academy-sales/workshops/${workshopId}/agenda`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      updateAgendaItem: async (
        workshopId: number,
        agendaItemId: number,
        dto: UpdateAcademyWorkshopAgendaItemRequest
      ): Promise<AcademyWorkshopAgendaItem> => {
        const response = await api.put<{ data: AcademyWorkshopAgendaItem }>(
          `/academy-sales/workshops/${workshopId}/agenda/${agendaItemId}`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      deleteAgendaItem: async (workshopId: number, agendaItemId: number): Promise<void> => {
        await api.delete(`/academy-sales/workshops/${workshopId}/agenda/${agendaItemId}`);
        invalidateAcademySalesReadCache();
      },
      reorderAgenda: async (
        workshopId: number,
        dto: ReorderAcademyWorkshopAgendaRequest
      ): Promise<AcademyWorkshopAgendaItem[]> => {
        const response = await api.put<{ data: AcademyWorkshopAgendaItem[] }>(
          `/academy-sales/workshops/${workshopId}/agenda/reorder`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      timelineReport: async (workshopId: number) => {
        const response = await api.get(`/academy-sales/workshops/${workshopId}/timeline-report`);
        return response.data.data;
      },
      createQuiz: async (workshopId: number, dto: UpsertAcademyWorkshopQuizRequest): Promise<AcademyWorkshopQuiz> => {
        const response = await api.post<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes`,
          dto
        );
        return response.data.data;
      },
      updateQuiz: async (
        workshopId: number,
        quizId: number,
        dto: UpsertAcademyWorkshopQuizRequest
      ): Promise<AcademyWorkshopQuiz> => {
        const response = await api.put<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}`,
          dto
        );
        return response.data.data;
      },
      setQuizAgendaItem: async (
        workshopId: number,
        quizId: number,
        dto: SetAcademyWorkshopAgendaResourceRequest
      ): Promise<AcademyWorkshopQuiz> => {
        const response = await api.put<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}/agenda-item`,
          dto
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      cloneQuiz: async (
        workshopId: number,
        quizId: number,
        dto: CloneAcademyWorkshopQuizRequest = {}
      ): Promise<AcademyWorkshopQuiz> => {
        const response = await api.post<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}/clone`,
          dto
        );
        return response.data.data;
      },
      saveQuizAsTemplate: async (
        workshopId: number,
        quizId: number,
        dto: CloneAcademyWorkshopQuizRequest = {}
      ): Promise<AcademyWorkshopQuiz> => {
        const response = await api.post<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}/save-template`,
          dto
        );
        return response.data.data;
      },
      refreshQuizTemplateFromWorkshop: async (workshopId: number, quizId: number): Promise<AcademyWorkshopQuiz> => {
        const response = await api.post<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}/template/refresh`
        );
        invalidateAcademySalesReadCache();
        return response.data.data;
      },
      applyQuizTemplate: async (
        workshopId: number,
        templateId: number,
        dto: CloneAcademyWorkshopQuizRequest = {}
      ): Promise<AcademyWorkshopQuiz> => {
        const response = await api.post<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes/from-template/${templateId}`,
          dto
        );
        return response.data.data;
      },
      listQuizTemplates: async (
        params: ListAcademyWorkshopQuizTemplatesParams = {}
      ): Promise<ListAcademyWorkshopQuizTemplatesResponse> => {
        const response = await api.get<ListAcademyWorkshopQuizTemplatesResponse>(
          '/academy-sales/workshop-quiz-templates',
          { params }
        );
        return response.data;
      },
      createQuizTemplate: async (dto: UpsertAcademyWorkshopQuizRequest): Promise<AcademyWorkshopQuiz> => {
        const response = await api.post<{ data: AcademyWorkshopQuiz }>('/academy-sales/workshop-quiz-templates', dto);
        return response.data.data;
      },
      updateQuizTemplate: async (
        templateId: number,
        dto: UpsertAcademyWorkshopQuizRequest
      ): Promise<AcademyWorkshopQuiz> => {
        const response = await api.put<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshop-quiz-templates/${templateId}`,
          dto
        );
        return response.data.data;
      },
      deleteQuizTemplate: async (templateId: number): Promise<void> => {
        await api.delete(`/academy-sales/workshop-quiz-templates/${templateId}`);
      },
      addTemplateQuestion: async (
        templateId: number,
        dto: UpsertAcademyWorkshopQuestionRequest
      ): Promise<AcademyWorkshopQuizQuestion> => {
        const response = await api.post<{ data: AcademyWorkshopQuizQuestion }>(
          `/academy-sales/workshop-quiz-templates/${templateId}/questions`,
          dto
        );
        return response.data.data;
      },
      updateTemplateQuestion: async (
        templateId: number,
        questionId: number,
        dto: UpsertAcademyWorkshopQuestionRequest
      ): Promise<AcademyWorkshopQuizQuestion> => {
        const response = await api.put<{ data: AcademyWorkshopQuizQuestion }>(
          `/academy-sales/workshop-quiz-templates/${templateId}/questions/${questionId}`,
          dto
        );
        return response.data.data;
      },
      deleteTemplateQuestion: async (templateId: number, questionId: number): Promise<AcademyWorkshopQuiz> => {
        const response = await api.delete<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshop-quiz-templates/${templateId}/questions/${questionId}`
        );
        return response.data.data;
      },
      addQuestion: async (
        workshopId: number,
        quizId: number,
        dto: UpsertAcademyWorkshopQuestionRequest
      ): Promise<AcademyWorkshopQuizQuestion> => {
        const response = await api.post<{ data: AcademyWorkshopQuizQuestion }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}/questions`,
          dto
        );
        return response.data.data;
      },
      updateQuestion: async (
        workshopId: number,
        quizId: number,
        questionId: number,
        dto: UpsertAcademyWorkshopQuestionRequest
      ): Promise<AcademyWorkshopQuizQuestion> => {
        const response = await api.put<{ data: AcademyWorkshopQuizQuestion }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}/questions/${questionId}`,
          dto
        );
        return response.data.data;
      },
      deleteQuestion: async (workshopId: number, quizId: number, questionId: number): Promise<AcademyWorkshopQuiz> => {
        const response = await api.delete<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}/questions/${questionId}`
        );
        return response.data.data;
      },
      gameCommand: async (
        workshopId: number,
        quizId: number,
        dto: AcademyWorkshopGameCommandRequest
      ): Promise<AcademyWorkshopQuiz> => {
        const response = await api.post<{ data: AcademyWorkshopQuiz }>(
          `/academy-sales/workshops/${workshopId}/quizzes/${quizId}/command`,
          dto
        );
        return response.data.data;
      },
      listRewards: async (workshopId: number): Promise<AcademyWorkshopReward[]> => {
        const response = await api.get<{ data: AcademyWorkshopReward[] }>(
          `/academy-sales/workshops/${workshopId}/rewards`
        );
        return response.data.data;
      },
      updateReward: async (
        workshopId: number,
        rewardId: number,
        dto: UpdateAcademyWorkshopRewardRequest
      ): Promise<AcademyWorkshopReward> => {
        const response = await api.post<{ data: AcademyWorkshopReward }>(
          `/academy-sales/workshops/${workshopId}/rewards/${rewardId}`,
          dto
        );
        return response.data.data;
      },
      listBonuses: async (workshopId: number): Promise<AcademyInstructorBonus[]> => {
        const response = await api.get<{ data: AcademyInstructorBonus[] }>(
          `/academy-sales/workshops/${workshopId}/bonuses`
        );
        return response.data.data;
      },
      updateBonus: async (
        workshopId: number,
        bonusId: number,
        dto: UpdateAcademyInstructorBonusRequest
      ): Promise<AcademyInstructorBonus> => {
        const response = await api.post<{ data: AcademyInstructorBonus }>(
          `/academy-sales/workshops/${workshopId}/bonuses/${bonusId}`,
          dto
        );
        return response.data.data;
      },
    },
    campaigns: {
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
      listLeads: async (
        id: number,
        params?: ListAcademyCampaignLeadsParams
      ): Promise<ListAcademyCampaignLeadsResponse> => {
        return dedupeApiGet<ListAcademyCampaignLeadsResponse>(
          `/academy-sales/campaigns/${id}/leads`,
          params as Record<string, unknown> | undefined,
          800
        );
      },
      addLeads: async (
        id: number,
        dto: AddAcademyCampaignLeadsRequest
      ): Promise<AcademyCampaignLeadActionResponse[]> => {
        const response = await api.post<AcademyCampaignLeadActionResponse[]>(
          `/academy-sales/campaigns/${id}/leads`,
          dto
        );
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
    },
  },
  academyWorkshopsPublic: {
    getRegistrationInfo: async (registrationCode: string): Promise<AcademyWorkshopPublicRegistrationInfo> => {
      const response = await api.get<{ data: AcademyWorkshopPublicRegistrationInfo }>(
        `/academy/workshops/registration/${encodeURIComponent(registrationCode)}`,
        { timeout: 15_000 }
      );
      return response.data.data;
    },
    register: async (
      registrationCode: string,
      dto: RegisterAcademyWorkshopRequest
    ): Promise<RegisterAcademyWorkshopResponse> => {
      const response = await api.post<{ data: RegisterAcademyWorkshopResponse }>(
        `/academy/workshops/registration/${encodeURIComponent(registrationCode)}`,
        dto,
        { timeout: 20_000 }
      );
      return response.data.data;
    },
    registerWithGoogle: async (
      registrationCode: string,
      dto: RegisterAcademyWorkshopWithGoogleRequest
    ): Promise<RegisterAcademyWorkshopResponse> => {
      const response = await api.post<{ data: RegisterAcademyWorkshopResponse }>(
        `/academy/workshops/registration/${encodeURIComponent(registrationCode)}/google`,
        dto,
        { timeout: 20_000 }
      );
      return response.data.data;
    },
    findRegistrationWithGoogle: async (
      registrationCode: string,
      dto: FindAcademyWorkshopRegistrationWithGoogleRequest
    ): Promise<RegisterAcademyWorkshopResponse | null> => {
      const response = await api.post<{ data: RegisterAcademyWorkshopResponse | null }>(
        `/academy/workshops/registration/${encodeURIComponent(registrationCode)}/google/status`,
        dto,
        { timeout: 15_000 }
      );
      return response.data.data;
    },
    zaloAuthorizeUrl: (registrationCode: string): string =>
      `${resolveApiBaseUrl()}/academy/workshops/registration/${encodeURIComponent(registrationCode)}/zalo/authorize`,
    registerWithZalo: async (
      registrationCode: string,
      dto: RegisterAcademyWorkshopWithZaloRequest
    ): Promise<RegisterAcademyWorkshopResponse> => {
      const response = await api.post<{ data: RegisterAcademyWorkshopResponse }>(
        `/academy/workshops/registration/${encodeURIComponent(registrationCode)}/zalo`,
        dto,
        { timeout: 20_000 }
      );
      return response.data.data;
    },
    findRegistrationWithZalo: async (
      registrationCode: string,
      dto: FindAcademyWorkshopRegistrationWithZaloRequest
    ): Promise<RegisterAcademyWorkshopResponse | null> => {
      const response = await api.post<{ data: RegisterAcademyWorkshopResponse | null }>(
        `/academy/workshops/registration/${encodeURIComponent(registrationCode)}/zalo/status`,
        dto,
        { timeout: 15_000 }
      );
      return response.data.data;
    },
    getSharedJoinInfo: async (displayCode: string): Promise<AcademyWorkshopSharedJoinInfo> => {
      const response = await api.get<{ data: AcademyWorkshopSharedJoinInfo }>(
        `/academy/workshops/shared/${encodeURIComponent(displayCode)}`,
        { timeout: 15_000 }
      );
      return response.data.data;
    },
    selectParticipant: async (dto: SelectAcademyWorkshopParticipantRequest): Promise<AcademyWorkshopPublicSession> => {
      const response = await api.post<{ data: AcademyWorkshopPublicSession }>(
        '/academy/workshops/select-participant',
        dto,
        { timeout: 15_000 }
      );
      return response.data.data;
    },
    joinWithGoogle: async (dto: JoinAcademyWorkshopWithGoogleRequest): Promise<AcademyWorkshopPublicSession> => {
      const response = await api.post<{ data: AcademyWorkshopPublicSession }>('/academy/workshops/join-google', dto, {
        timeout: 20_000,
      });
      return response.data.data;
    },
    redeemQr: async (dto: RedeemAcademyWorkshopQrRequest): Promise<AcademyWorkshopPublicSession> => {
      const response = await api.post<{ data: AcademyWorkshopPublicSession }>('/academy/workshops/redeem', dto, {
        timeout: 15_000,
      });
      return response.data.data;
    },
    redeemDisplay: async (dto: RedeemAcademyWorkshopDisplayRequest): Promise<{ token: string; expiresAt: string }> => {
      const response = await api.post<{ data: { token: string; expiresAt: string } }>(
        '/academy/workshops/display/redeem',
        dto,
        { timeout: 15_000 }
      );
      return response.data.data;
    },
    getState: async (sessionToken: string): Promise<AcademyWorkshopLiveState> => {
      const response = await api.get<{ data: AcademyWorkshopLiveState }>('/academy/workshops/state', {
        headers: { Authorization: `Bearer ${sessionToken}` },
        timeout: 15_000,
      });
      return response.data.data;
    },
    submitAnswer: async (
      sessionToken: string,
      dto: SubmitAcademyWorkshopAnswerRequest
    ): Promise<AcademyWorkshopAnswerReceipt> => {
      const response = await api.post<{ data: AcademyWorkshopAnswerReceipt }>('/academy/workshops/answer', dto, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        timeout: 15_000,
      });
      return response.data.data;
    },
  },
};
