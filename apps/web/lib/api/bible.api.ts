import { api } from './base';
import type {
  MosBibleProposal,
  MosBibleQuizQuestion,
  MosBibleQuizSubmissionResult,
  MosBibleSpeedQuizProfile,
  MosBibleSpeedQuizSubmissionRequest,
  MosBibleSpeedQuizResult,
} from '@mos-lab/shared';

export const bibleApi = {
  bible: {
    async getProposals(): Promise<{ success: boolean; data: MosBibleProposal[] }> {
      const res = await api.get('/bible/proposals');
      return res.data;
    },

    async createProposal(data: {
      book: string;
      title: string;
      summary: string;
      commandments: string[];
      rationale: string;
      examples?: string[];
      tags: string[];
    }): Promise<{ success: boolean; data: MosBibleProposal; message: string }> {
      const res = await api.post('/bible/proposals', data);
      return res.data;
    },

    async approveProposal(id: string): Promise<{ success: boolean; data: MosBibleProposal; message: string }> {
      const res = await api.post(`/bible/proposals/${id}/approve`);
      return res.data;
    },

    async rejectProposal(
      id: string,
      note?: string
    ): Promise<{ success: boolean; data: MosBibleProposal; message: string }> {
      const res = await api.post(`/bible/proposals/${id}/reject`, { note });
      return res.data;
    },

    async getWeeklyQuiz(): Promise<{ success: boolean; data: MosBibleQuizQuestion[] }> {
      const res = await api.get('/bible/quiz/weekly');
      return res.data;
    },

    async submitQuizAnswer(
      questionId: string,
      selectedKey: 'A' | 'B' | 'C' | 'D'
    ): Promise<{ success: boolean; data: MosBibleQuizSubmissionResult; message: string }> {
      const res = await api.post('/bible/quiz/submit', { questionId, selectedKey });
      return res.data;
    },

    async getSpeedQuizProfile(): Promise<{ success: boolean; data: MosBibleSpeedQuizProfile }> {
      const res = await api.get('/bible/quiz/speed/profile');
      return res.data;
    },

    async getSpeedQuizQuestions(): Promise<{ success: boolean; data: MosBibleQuizQuestion[] }> {
      const res = await api.get('/bible/quiz/speed/questions');
      return res.data;
    },

    async submitSpeedQuizRun(
      data: MosBibleSpeedQuizSubmissionRequest
    ): Promise<{ success: boolean; data: MosBibleSpeedQuizResult }> {
      const res = await api.post('/bible/quiz/speed/submit', data);
      return res.data;
    },
  },
};
