import type { PrismaClient } from '../../../generated/crm-client/index.js';
import type {
  SocialPostContentType,
  SocialPostPosterDailyReward,
  SocialPostRewardConfig,
  SocialPostReviewStatus,
} from '@mos-lab/shared';

export type CrmClient = PrismaClient;

export const REVIEW_MARK_TO_STATUS: Record<string, SocialPostReviewStatus> = {
  '✅': 'APPROVED',
  '🔁': 'NEEDS_REVIEW',
  '❌': 'REJECTED',
};

/**
 * The source sheet uses a short display name for this account. This is a
 * deliberate identity map, not a fuzzy fallback: every other author must
 * resolve to one unique mOS staff display name directly.
 */
export const SOURCE_ACCOUNT_ALIASES: Record<string, string> = {
  'sinh nguyen': 'bui sinh nguyen',
  'nguyen bui': 'bui sinh nguyen',
};

export const POST_HUB_REWARD_CONFIG_KEY = 'POST_HUB_REWARD_CONFIG';
export const MOS_NATIVE_SOURCE_ID = 'MOS';

export type SocialPostRewardLedgerRow = {
  staffId: number;
  postedAt: Date;
  reviewStatus: string;
  contentType: string;
  staff: { displayName: string; avatarUrl?: string | null };
};

export type DailyRewardWithMember = SocialPostPosterDailyReward & {
  staffId: number;
  member: string;
  avatarUrl: string | null;
};

export type PreparedSocialPostImportRow = {
  sourceRecordId: number;
  staffId: number;
  sourceAuthorName: string;
  contentType: SocialPostContentType;
  channel: string;
  sourceUrl: string;
  postedAt: Date;
  reviewStatus: SocialPostReviewStatus;
  reviewerComment: string | null;
  reviewedAt: Date | null;
  reviewedByStaffId: number | null;
  sourceReviewerName: string | null;
};

export type PreparedSocialPostImport = {
  sourceSpreadsheetId: string;
  importRows: PreparedSocialPostImportRow[];
  unmappedAuthors: Array<{ sourceAuthorName: string; count: number }>;
  unmatchedApprovalSourceIds: number[];
};

/** Mirrors the formula in the source Sheet's DASHBOARD DAILY tab. */
export const DEFAULT_SOCIAL_POST_REWARD_CONFIG: SocialPostRewardConfig = {
  videoPoints: 3,
  recruitmentPoints: 1,
  videoCapThreshold: 20,
  videoCapPoints: 60,
  recruitmentCapThreshold: 20,
  recruitmentCapPoints: 20,
  mixedEligibleTotal: 20,
  mixedOverflowPoints: null,
};
