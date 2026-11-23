import type {
  AcademyWorkshopAnswerReceipt,
  AcademyWorkshopLiveState,
  AcademyWorkshopPublicRegistrationInfo,
  AcademyWorkshopPublicSession,
  AcademyWorkshopSharedJoinInfo,
  FindAcademyWorkshopRegistrationWithGoogleRequest,
  FindAcademyWorkshopRegistrationWithZaloRequest,
  JoinAcademyWorkshopWithGoogleRequest,
  RedeemAcademyWorkshopDisplayRequest,
  RedeemAcademyWorkshopQrRequest,
  RegisterAcademyWorkshopRequest,
  RegisterAcademyWorkshopResponse,
  RegisterAcademyWorkshopWithGoogleRequest,
  RegisterAcademyWorkshopWithZaloRequest,
  SelectAcademyWorkshopParticipantRequest,
  SubmitAcademyWorkshopAnswerRequest,
} from '@mos-lab/shared';

import { api, resolveApiBaseUrl } from '../base';

export const academyWorkshopsPublicApi = {
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
};
