import type {
  AcademyCourse,
  AcademyImportReport,
  AcademyLeadActionResponse,
  AcademyLeadDetail,
  AcademyPlaybook,
  AcademyStaffOption,
  AcademyTalentAssessmentActionResponse,
  AcademyTalentInstructorActionResponse,
  AcademyTalentLadderConfiguration,
  AcademyTalentLadderConfigurationActionResponse,
  AcademyTalentPaymentTraceResponse,
  AcademyWorkspaceAccessResponse,
  CreateAcademyActivityRequest,
  CreateAcademyFollowUpRequest,
  CreateAcademyLeadRequest,
  CreateAcademyTalentAssessmentRequest,
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
  PreviewAcademyTalentAssessmentQuoteRequest,
  PreviewAcademyTalentAssessmentQuoteResponse,
  RecordAcademyNoShowRequest,
  RecordAcademyTalentPaymentRequest,
  UpdateAcademyFollowUpRequest,
  UpdateAcademyLeadRequest,
  UpdateAcademyTalentAssessmentRequest,
  UpdateAcademyTalentLadderConfigurationRequest,
  UpsertAcademyCourseRequest,
  UpsertAcademyPlaybookRequest,
  UpsertAcademyTalentInstructorRequest,
} from '@mos-lab/shared';

import { api, dedupeApiGet, invalidateAcademySalesReadCache } from '../base';

export const academySalesCoreApi = {
  getAccess: async (): Promise<AcademyWorkspaceAccessResponse> => {
    return dedupeApiGet<AcademyWorkspaceAccessResponse>('/academy-sales/access', undefined, 30_000);
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
    const response = await api.put<AcademyTalentLadderConfigurationActionResponse>('/academy-sales/talent-ladder', dto);
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
    invalidateAcademySalesReadCache();
    return response.data;
  },
  updateCourse: async (id: number, dto: UpsertAcademyCourseRequest) => {
    const response = await api.put(`/academy-sales/courses/${id}`, dto);
    invalidateAcademySalesReadCache();
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
};
