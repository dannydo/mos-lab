/** A post submitted by a team member to the social-content campaign flow. */
export type SocialPostContentType = 'RECRUITMENT_POST' | 'VIDEO';

/** Distinguishes the retained import ledger from posts created directly in mOS. */
export type SocialPostOrigin = 'MOS' | 'SHEET_HISTORY';

/** The social network inferred from the imported source URL. */
export type SocialPostPlatform = 'FACEBOOK' | 'TIKTOK' | 'UNKNOWN';

/** Platforms available in Post Hub filters; unknown links stay visible only in the unfiltered view. */
export type SocialPostPlatformFilter = Exclude<SocialPostPlatform, 'UNKNOWN'>;

/** The posting surface declared in the source Sheet or encoded in its URL. */
export type SocialPostPlacement = 'GROUP' | 'PROFILE' | 'COMMENT' | 'STORY' | 'REEL' | 'VIDEO' | 'UNKNOWN';

/**
 * Readable source context derived once by the Post Hub service. `destinationLabel`
 * is deliberately explicit when a shortened link does not retain a group name.
 */
export interface SocialPostSourceContext {
  platform: SocialPostPlatform;
  platformLabel: string;
  placement: SocialPostPlacement;
  placementLabel: string;
  destinationLabel: string;
  destinationId?: string | null;
  destinationIdentified: boolean;
}

/** Review states used by the Data → Approve → Daily Dashboard workflow. */
export type SocialPostReviewStatus = 'PENDING' | 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';

export interface SocialPostSubmission {
  id: number;
  sourceRecordId: number;
  origin: SocialPostOrigin;
  staffId: number;
  author: string;
  /** Canonical mOS staff avatar from crm_staff.avatar_url; null falls back to initials. */
  avatarUrl: string | null;
  contentType: SocialPostContentType;
  assetName: string;
  channel: string;
  sourceUrl: string;
  source: SocialPostSourceContext;
  postedAt: string;
  submittedAt: string;
  reviewStatus: SocialPostReviewStatus;
  reviewerComment?: string;
  reviewedAt?: string | null;
  reviewerName?: string | null;
}

/** Native mOS intake. The authenticated mOS account is always the author. */
export interface CreateSocialPostSubmissionDto {
  sourceUrl: string;
  contentType: SocialPostContentType;
  /** Operational declaration such as “Đăng trên hội nhóm” or “Comment bài viết”. */
  channel: string;
  /** ISO-8601 timestamp selected by the poster; reporting uses its ICT calendar day. */
  postedAt: string;
}

export interface CreateSocialPostSubmissionResponse {
  success: true;
  data: SocialPostSubmission;
  message: string;
}

/** Calendar grain used to filter the campaign around an ICT anchor date. */
export type SocialPostLeaderboardPeriod = 'DAY' | 'WEEK' | 'MONTH';

/**
 * Reporting period shared by 1.DATA, 2.APPROVE and the Leaderboard.
 * The backend resolves Monday–Sunday weeks and ICT date bounds once.
 */
export interface SocialPostPeriodQuery {
  /** YYYY-MM-DD in Asia/Ho_Chi_Minh. Required when a period is selected. */
  anchorDate?: string;
  period?: SocialPostLeaderboardPeriod;
}

export type SocialPostLeaderboardQuery = SocialPostPeriodQuery;

/** Period query used by a poster's Daily Bonus drill-down. */
export type SocialPostPosterDailyRewardQuery = SocialPostPeriodQuery;

export interface SocialPostLeaderboardEntry {
  staffId: number;
  rank: number;
  member: string;
  /** Canonical mOS staff avatar from crm_staff.avatar_url; null falls back to initials. */
  avatarUrl: string | null;
  submittedCount: number;
  approvedVideoCount: number;
  approvedRecruitmentCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  /** Null means the mixed-count overflow rule needs a manager decision. */
  bananaPoints: number | null;
}

/** One poster's reconciled reward ledger for a source posting day (ICT). */
export interface SocialPostPosterDailyReward {
  date: string;
  submittedCount: number;
  approvedVideoCount: number;
  approvedRecruitmentCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  /** Null means that day's mixed-overflow reward needs a manager configuration. */
  bananaPoints: number | null;
}

/** Campaign-wide ranking, always aggregated as the sum of each posting day. */
export interface SocialPostLeaderboardResponse {
  data: SocialPostLeaderboardEntry[];
  dateFrom: string | null;
  dateTo: string | null;
  anchorDate?: string | null;
  period?: SocialPostLeaderboardPeriod;
  rewardConfig: SocialPostRewardConfig;
}

/** Poster drill-down used by the Leaderboard → Daily reward ledger drawer. */
export interface SocialPostPosterDailyRewardResponse {
  staffId: number;
  member: string;
  /** Resolved ICT bounds so the drawer can prove it matches the selected leaderboard period. */
  dateFrom: string | null;
  dateTo: string | null;
  anchorDate?: string | null;
  period?: SocialPostLeaderboardPeriod;
  totalBananaPoints: number | null;
  unresolvedDayCount: number;
  daily: SocialPostPosterDailyReward[];
  rewardConfig: SocialPostRewardConfig;
}

/**
 * Campaign reward rules, persisted in CRM under POST_HUB_REWARD_CONFIG.
 * Cap thresholds use a strict greater-than comparison, mirroring the source Sheet.
 */
export interface SocialPostRewardConfig {
  videoPoints: number;
  recruitmentPoints: number;
  videoCapThreshold: number;
  videoCapPoints: number;
  recruitmentCapThreshold: number;
  recruitmentCapPoints: number;
  mixedEligibleTotal: number;
  /** Null preserves the source Sheet's undefined/FALSE result for this case. */
  mixedOverflowPoints: number | null;
}

/** Reward impact returned by the backend before a reviewer confirms approval. */
export interface SocialPostApprovalRewardPreview {
  sourceRecordId: number;
  author: string;
  date: string;
  contentType: SocialPostContentType;
  contentLabel: string;
  basePoints: number;
  currentApprovedVideoCount: number;
  currentApprovedRecruitmentCount: number;
  projectedApprovedVideoCount: number;
  projectedApprovedRecruitmentCount: number;
  projectedDailyPoints: number | null;
  isAlreadyApproved: boolean;
  rewardConfig: SocialPostRewardConfig;
}

export interface SocialPostPageQuery extends SocialPostPeriodQuery {
  dateFrom?: string;
  dateTo?: string;
  reviewStatus?: SocialPostReviewStatus;
  /** Restricts 1.DATA to the platform inferred from each source URL. */
  sourcePlatform?: SocialPostPlatformFilter;
  /** Lists the imported 2.APPROVE ledger; report-period bounds apply when provided. */
  approveLedger?: boolean;
  /** Restricts the ledger to one canonical mOS poster account. */
  authorStaffId?: number;
  search?: string;
  page?: number;
  limit?: number;
}

/** Canonical poster identity offered by the 2.APPROVE ledger filter. */
export interface SocialPostAuthorOption {
  staffId: number;
  displayName: string;
}

export interface SocialPostSummary {
  submitted: number;
  approved: number;
  approvedVideo: number;
  approvedRecruitment: number;
  needsReview: number;
  rejected: number;
}

export interface SocialPostListResponse {
  data: SocialPostSubmission[];
  total: number;
  page: number;
  limit: number;
  summary: SocialPostSummary;
  leaderboard: SocialPostLeaderboardEntry[];
  /** Available posters in the unfiltered ledger for the selected report period. */
  authorOptions: SocialPostAuthorOption[];
  rewardConfig: SocialPostRewardConfig;
}

/** Data captured from the source tabs before it is normalized by the backend. */
export interface ImportSocialPostRow {
  sourceRecordId: number;
  sourceAuthorName: string;
  postedAt: string;
  channel: string;
  sourceUrl: string;
}

/** Decision captured from `2.APPROVE`, keyed by the source record ID. */
export interface ImportSocialPostApproval {
  sourceRecordId: number;
  sourceAuthorName: string;
  reviewMark: '✅' | '🔁' | '❌';
  reviewerComment?: string | null;
  reviewedAt?: string | null;
  sourceReviewerName?: string | null;
}

export interface ImportSocialPostsDto {
  sourceSpreadsheetId: string;
  rows: ImportSocialPostRow[];
  approvals: ImportSocialPostApproval[];
}

export interface ImportSocialPostsResult {
  imported: number;
  updated: number;
  approved: number;
  needsReview: number;
  rejected: number;
  pending: number;
  unmappedAuthors: Array<{ sourceAuthorName: string; count: number }>;
  unmatchedApprovalSourceIds: number[];
}

export interface ReviewSocialPostDto {
  reviewStatus: SocialPostReviewStatus;
  reviewerComment?: string;
}
