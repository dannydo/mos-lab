import fetcher from './base';
import type { MosBibleProposal, MosBibleQuizQuestion, MosBibleQuizSubmissionResult } from '@mos-lab/shared';

export const bibleApi = {
  bible: {
    async getProposals(): Promise<{ success: boolean; data: MosBibleProposal[] }> {
      return fetcher.get('/bible/proposals');
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
      return fetcher.post('/bible/proposals', data);
    },

    async approveProposal(id: string): Promise<{ success: boolean; data: MosBibleProposal; message: string }> {
      return fetcher.post(`/bible/proposals/${id}/approve`);
    },

    async rejectProposal(
      id: string,
      note?: string
    ): Promise<{ success: boolean; data: MosBibleProposal; message: string }> {
      return fetcher.post(`/bible/proposals/${id}/reject`, { note });
    },

    async getWeeklyQuiz(): Promise<{ success: boolean; data: MosBibleQuizQuestion[] }> {
      return fetcher.get('/bible/quiz/weekly');
    },

    async submitQuizAnswer(
      questionId: string,
      selectedKey: 'A' | 'B' | 'C' | 'D'
    ): Promise<{ success: boolean; data: MosBibleQuizSubmissionResult; message: string }> {
      return fetcher.post('/bible/quiz/submit', { questionId, selectedKey });
    },
  },
};
