import { api, ApiRequestOptions } from './base';
import type {
  FmBranchCode,
  FmQuestsOverviewResponse,
  FmTeamDinnerRecord,
  FmWeeklyQuestLedgerEntry,
  FmWeeklyQuestsConfig,
  ReviewFmTeamDinnerRequest,
  SaveFmQuestsConfigRequest,
  SettleFmWeeklyQuestRequest,
  SubmitFmQuestProofRequest,
  SubmitFmTeamDinnerRequest,
} from '@mos-lab/shared';

export const fmQuestsApi = {
  fmQuests: {
    async getOverview(
      params: { branch: FmBranchCode; weekKey?: string; monthKey?: string },
      options?: ApiRequestOptions
    ): Promise<FmQuestsOverviewResponse> {
      const res = await api.get<{ success: boolean; data: FmQuestsOverviewResponse }>('/fm-quests/overview', {
        params,
        signal: options?.signal,
        priority: options?.priority,
        timeout: options?.timeout,
      });
      return res.data.data;
    },

    async saveConfig(payload: SaveFmQuestsConfigRequest): Promise<FmWeeklyQuestsConfig> {
      const res = await api.put<{ success: boolean; data: FmWeeklyQuestsConfig }>('/fm-quests/config', payload);
      return res.data.data;
    },

    async submitProof(payload: SubmitFmQuestProofRequest): Promise<FmWeeklyQuestLedgerEntry> {
      const res = await api.post<{ success: boolean; data: FmWeeklyQuestLedgerEntry }>('/fm-quests/proof', payload);
      return res.data.data;
    },

    async settleQuest(
      payload: SettleFmWeeklyQuestRequest
    ): Promise<{ entry: FmWeeklyQuestLedgerEntry; newBalanceVnd: number }> {
      const res = await api.post<{
        success: boolean;
        data: { entry: FmWeeklyQuestLedgerEntry; newBalanceVnd: number };
      }>('/fm-quests/settle', payload);
      return res.data.data;
    },

    async submitDinner(payload: SubmitFmTeamDinnerRequest): Promise<FmTeamDinnerRecord> {
      const res = await api.post<{ success: boolean; data: FmTeamDinnerRecord }>('/fm-quests/dinners', payload);
      return res.data.data;
    },

    async reviewDinner(dinnerId: string, payload: ReviewFmTeamDinnerRequest): Promise<FmTeamDinnerRecord> {
      const res = await api.post<{ success: boolean; data: FmTeamDinnerRecord }>(
        `/fm-quests/dinners/${encodeURIComponent(dinnerId)}/review`,
        payload
      );
      return res.data.data;
    },
  },
};
