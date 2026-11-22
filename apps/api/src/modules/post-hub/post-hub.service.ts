import type {
  CreateSocialPostSubmissionDto,
  ImportSocialPostsDto,
  ImportSocialPostsResult,
  ReviewSocialPostDto,
  SocialPostApprovalRewardPreview,
  SocialPostLeaderboardQuery,
  SocialPostLeaderboardResponse,
  SocialPostListResponse,
  SocialPostPageQuery,
  SocialPostPosterDailyRewardQuery,
  SocialPostPosterDailyRewardResponse,
  SocialPostRewardConfig,
  SocialPostSubmission,
} from '@mos-lab/shared';
import type { CrmClient } from './post-hub-service/types.js';
import {
  getApprovalRewardPreview,
  getCampaignLeaderboard,
  getPosterDailyRewards,
  getRewardConfig,
  updateRewardConfig,
} from './post-hub-service/rewards.js';
import { importFromGoogleSheet, previewGoogleSheetImport } from './post-hub-service/sheet-import.js';
import { createNativeSubmission, listSubmissions, reviewSubmission } from './post-hub-service/submissions.js';

export {
  DEFAULT_SOCIAL_POST_REWARD_CONFIG,
  type CrmClient,
  type DailyRewardWithMember,
  type SocialPostRewardLedgerRow,
} from './post-hub-service/types.js';
export { parseSocialPostSheetDateTime, resolveSocialPostPeriodBounds } from './post-hub-service/date-period.js';
export {
  getSocialPostContentType,
  getSocialPostSourceContext,
  normalizeNativeSourceUrl,
} from './post-hub-service/source-url.js';
export {
  buildSocialPostDailyRewards,
  buildSocialPostLeaderboard,
  calculateSocialPostBananaPoints,
} from './post-hub-service/rewards.js';

export class PostHubService {
  static async getRewardConfig(prisma: CrmClient): Promise<SocialPostRewardConfig> {
    return getRewardConfig(prisma);
  }

  /**
   * Native campaign intake. The JWT mOS account is the only permitted author;
   * historical Sheet rows remain untouched and are never reused as intake.
   */
  static async createNativeSubmission(
    prisma: CrmClient,
    staffId: number,
    dto: CreateSocialPostSubmissionDto
  ): Promise<SocialPostSubmission> {
    return createNativeSubmission(prisma, staffId, dto);
  }

  static async updateRewardConfig(prisma: CrmClient, config: SocialPostRewardConfig): Promise<SocialPostRewardConfig> {
    return updateRewardConfig(prisma, config);
  }

  static async getApprovalRewardPreview(
    prisma: CrmClient,
    submissionId: number
  ): Promise<SocialPostApprovalRewardPreview> {
    return getApprovalRewardPreview(prisma, submissionId);
  }

  static async previewGoogleSheetImport(
    prisma: CrmClient,
    dto: ImportSocialPostsDto
  ): Promise<ImportSocialPostsResult> {
    return previewGoogleSheetImport(prisma, dto);
  }

  static async importFromGoogleSheet(prisma: CrmClient, dto: ImportSocialPostsDto): Promise<ImportSocialPostsResult> {
    return importFromGoogleSheet(prisma, dto);
  }

  static async getCampaignLeaderboard(
    prisma: CrmClient,
    query: SocialPostLeaderboardQuery = {}
  ): Promise<SocialPostLeaderboardResponse> {
    return getCampaignLeaderboard(prisma, query);
  }

  static async getPosterDailyRewards(
    prisma: CrmClient,
    staffId: number,
    query: SocialPostPosterDailyRewardQuery = {}
  ): Promise<SocialPostPosterDailyRewardResponse> {
    return getPosterDailyRewards(prisma, staffId, query);
  }

  static async list(prisma: CrmClient, query: SocialPostPageQuery): Promise<SocialPostListResponse> {
    return listSubmissions(prisma, query);
  }

  static async review(
    prisma: CrmClient,
    submissionId: number,
    reviewerStaffId: number,
    reviewerName: string,
    dto: ReviewSocialPostDto
  ): Promise<void> {
    return reviewSubmission(prisma, submissionId, reviewerStaffId, reviewerName, dto);
  }
}
