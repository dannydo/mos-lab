import type {
  AcademyInstructorBonus,
  AcademyWorkshopAgendaCommandRequest,
  AcademyWorkshopAgendaItem,
  AcademyWorkshopGameCommandRequest,
  AcademyWorkshopLiveState,
  AcademyWorkshopParticipant,
  AcademyWorkshopPhotoUploadIntent,
  AcademyWorkshopQuiz,
  AcademyWorkshopQuizQuestion,
  AcademyWorkshopReward,
  AcademyWorkshopTalentLeaderboardEntry,
  AddAcademyWorkshopParticipantsRequest,
  AssignAcademyWorkshopInstructorRequest,
  CheckInAcademyWorkshopParticipantRequest,
  CloneAcademyWorkshopQuizRequest,
  ConfirmAcademyWorkshopPhotoRequest,
  CreateAcademyWorkshopAgendaItemRequest,
  CreateAcademyWorkshopPhotoUploadRequest,
  CreateAcademyWorkshopWalkInRequest,
  ListAcademyWorkshopParticipantsParams,
  ListAcademyWorkshopParticipantsResponse,
  ListAcademyWorkshopQuizTemplatesParams,
  ListAcademyWorkshopQuizTemplatesResponse,
  RecordAcademyWorkshopFeeRequest,
  ReorderAcademyWorkshopAgendaRequest,
  SetAcademyWorkshopAgendaResourceRequest,
  SetAcademyWorkshopPhotoConsentRequest,
  UpdateAcademyInstructorBonusRequest,
  UpdateAcademyWorkshopAgendaItemRequest,
  UpdateAcademyWorkshopCareRequest,
  UpdateAcademyWorkshopDisplaySettingsRequest,
  UpdateAcademyWorkshopParticipantPricingRequest,
  UpdateAcademyWorkshopParticipantSelectionsRequest,
  UpdateAcademyWorkshopRewardRequest,
  UpsertAcademyWorkshopQuestionRequest,
  UpsertAcademyWorkshopQuizRequest,
  WaiveAcademyWorkshopFeeRequest,
} from '@mos-lab/shared';

import { api, invalidateAcademySalesReadCache } from '../base';

export const academyWorkshopOperationsApi = {
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
  updateSelections: async (
    workshopId: number,
    participantId: number,
    dto: UpdateAcademyWorkshopParticipantSelectionsRequest
  ): Promise<AcademyWorkshopParticipant> => {
    const response = await api.put<{ data: AcademyWorkshopParticipant }>(
      `/academy-sales/workshops/${workshopId}/participants/${participantId}/selections`,
      dto
    );
    invalidateAcademySalesReadCache();
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
  deleteFeePayment: async (
    workshopId: number,
    participantId: number,
    paymentId: number
  ): Promise<AcademyWorkshopParticipant> => {
    const response = await api.delete<{ data: AcademyWorkshopParticipant }>(
      `/academy-sales/workshops/${workshopId}/participants/${participantId}/fee/${paymentId}`
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
  updateParticipantPricing: async (
    workshopId: number,
    participantId: number,
    dto: UpdateAcademyWorkshopParticipantPricingRequest
  ): Promise<AcademyWorkshopParticipant> => {
    const response = await api.put<{ data: AcademyWorkshopParticipant }>(
      `/academy-sales/workshops/${workshopId}/participants/${participantId}/pricing`,
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
    const response = await api.get<ListAcademyWorkshopQuizTemplatesResponse>('/academy-sales/workshop-quiz-templates', {
      params,
    });
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
    const response = await api.get<{ data: AcademyWorkshopReward[] }>(`/academy-sales/workshops/${workshopId}/rewards`);
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
};
