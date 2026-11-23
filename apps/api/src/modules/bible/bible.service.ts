import type {
  MosBibleProposal,
  MosBibleProposalTier,
  MosBibleQuizQuestion,
  MosBibleQuizSubmissionResult,
  MosBibleSpeedQuizAnswerItem,
  MosBibleSpeedQuizProfile,
  MosBibleSpeedQuizResult,
} from '@mos-lab/shared';
import type { PrismaClient as CrmPrismaClient } from '../../generated/crm-client/index.js';
import { EXPANDED_BIBLE_QUIZ_POOL, INITIAL_WEEKLY_QUIZ } from './service/bible-quiz-pool.js';
import {
  approveBibleProposal,
  classifyBibleProposalTier,
  createBibleProposal,
  listBibleProposals,
  rejectBibleProposal,
} from './service/bible-proposals.service.js';
import {
  buySpeedQuizAttempt,
  evaluateQuizSubmission,
  getSpeedQuizProfile,
  getSpeedQuizQuestions,
  getTodayDateStr,
  getWeeklyQuiz,
  submitSpeedQuizRun,
} from './service/bible-speed-quiz.service.js';

export { EXPANDED_BIBLE_QUIZ_POOL, INITIAL_WEEKLY_QUIZ };

export class BibleService {
  static classifyTier(
    title: string,
    summary: string,
    commandments: readonly string[],
    tags: readonly string[]
  ): MosBibleProposalTier {
    return classifyBibleProposalTier(title, summary, commandments, tags);
  }

  static async listProposals(crm: CrmPrismaClient): Promise<MosBibleProposal[]> {
    return listBibleProposals(crm);
  }

  static async createProposal(
    crm: CrmPrismaClient,
    input: {
      book: MosBibleProposal['book'];
      title: string;
      summary: string;
      commandments: string[];
      rationale: string;
      examples?: string[];
      tags: string[];
    },
    staff: { id: number; name: string; role: string }
  ): Promise<MosBibleProposal> {
    return createBibleProposal(crm, input, staff);
  }

  static async approveProposal(
    crm: CrmPrismaClient,
    proposalId: string,
    reviewer: { id: number; name: string; role: string }
  ): Promise<{ success: boolean; proposal?: MosBibleProposal; error?: string }> {
    return approveBibleProposal(crm, proposalId, reviewer);
  }

  static async rejectProposal(
    crm: CrmPrismaClient,
    proposalId: string,
    reviewer: { id: number; name: string; role: string },
    note?: string
  ): Promise<{ success: boolean; proposal?: MosBibleProposal; error?: string }> {
    return rejectBibleProposal(crm, proposalId, reviewer, note);
  }

  static getWeeklyQuiz(): readonly MosBibleQuizQuestion[] {
    return getWeeklyQuiz();
  }

  static evaluateQuizSubmission(
    questionId: string,
    selectedKey: 'A' | 'B' | 'C' | 'D'
  ): MosBibleQuizSubmissionResult | null {
    return evaluateQuizSubmission(questionId, selectedKey);
  }

  static getTodayDateStr(): string {
    return getTodayDateStr();
  }

  static async getSpeedQuizProfile(crm: CrmPrismaClient, staffId: number): Promise<MosBibleSpeedQuizProfile> {
    return getSpeedQuizProfile(crm, staffId, () => this.getTodayDateStr());
  }

  static async buySpeedQuizAttempt(
    crm: CrmPrismaClient,
    staffId: number
  ): Promise<{ success: boolean; profile?: MosBibleSpeedQuizProfile; error?: string }> {
    return buySpeedQuizAttempt(crm, staffId, () => this.getTodayDateStr());
  }

  static getSpeedQuizQuestions(count = 5): readonly MosBibleQuizQuestion[] {
    return getSpeedQuizQuestions(count);
  }

  static async submitSpeedQuizRun(
    crm: CrmPrismaClient,
    staffId: number,
    answers: MosBibleSpeedQuizAnswerItem[]
  ): Promise<{ success: boolean; data?: MosBibleSpeedQuizResult; error?: string }> {
    return submitSpeedQuizRun(crm, staffId, answers, () => this.getTodayDateStr());
  }
}
