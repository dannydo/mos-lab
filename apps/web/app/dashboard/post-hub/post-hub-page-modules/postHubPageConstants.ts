import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type {
  CreateSocialPostSubmissionDto,
  ReviewSocialPostDto,
  SocialPostLeaderboardPeriod,
  SocialPostPlatformFilter,
  SocialPostReviewStatus,
  SocialPostRewardConfig,
  SocialPostSummary,
} from '@mos-lab/shared';
import type { ReportPeriodMode } from '~/components/ui';
import { REVIEW_STATUS_META } from '../components/PostHubPresentation';

dayjs.extend(isoWeek);

export type WorkflowStage = 0 | 1 | 2;
export type ReviewFormValues = ReviewSocialPostDto;
export type RewardConfigFormValues = SocialPostRewardConfig;
export type CreateSubmissionFormValues = Omit<CreateSocialPostSubmissionDto, 'postedAt'> & { postedAt: Dayjs };

export const DEFAULT_POST_HUB_ANCHOR_DATE = '2026-08-17';

export const API_PERIOD_BY_REPORT_MODE: Record<ReportPeriodMode, SocialPostLeaderboardPeriod> = {
  day: 'DAY',
  week: 'WEEK',
  month: 'MONTH',
};

export const NATIVE_CHANNEL_OPTIONS = [
  { value: 'Đăng trên hội nhóm', label: 'Facebook · Đăng trên hội nhóm' },
  { value: 'Đăng trên trang cá nhân', label: 'Facebook · Đăng trên trang cá nhân' },
  { value: 'Comment bài viết', label: 'Facebook · Comment bài viết' },
  { value: 'Facebook Reel', label: 'Facebook · Reel' },
  { value: 'Facebook Story', label: 'Facebook · Story' },
  { value: 'Video TikTok', label: 'TikTok · Video' },
];

export const EMPTY_POST_HUB_SUMMARY: SocialPostSummary = {
  submitted: 0,
  approved: 0,
  approvedVideo: 0,
  approvedRecruitment: 0,
  needsReview: 0,
  rejected: 0,
};

export interface PostHubPreferences {
  page: number;
  pageSize: number;
  approvalPage: number;
  approvalPageSize: number;
  selectedDate: Dayjs;
  activeStage: WorkflowStage;
  reportPeriodMode: ReportPeriodMode;
  query: string;
  statusFilter: 'ALL' | SocialPostReviewStatus;
  dataAuthorStaffId?: number;
  dataSourcePlatform: 'ALL' | SocialPostPlatformFilter;
  approvalAuthorStaffId?: number;
}

const VALID_PAGE_SIZES = [10, 20, 50, 100];

export function readPostHubPreferences(): Partial<PostHubPreferences> {
  const result: Partial<PostHubPreferences> = {};
  const savedPage = Number(window.localStorage.getItem('post_hub_data_page'));
  const savedPageSize = Number(window.localStorage.getItem('post_hub_data_page_size'));
  const savedApprovalPage = Number(window.localStorage.getItem('post_hub_approve_page'));
  const savedApprovalPageSize = Number(window.localStorage.getItem('post_hub_approve_page_size'));
  const savedDate = window.localStorage.getItem('post_hub_selected_date');
  const savedStage = Number(window.localStorage.getItem('post_hub_active_stage'));
  const savedReportPeriodMode = window.localStorage.getItem('post_hub_report_period_mode');
  const savedQuery = window.localStorage.getItem('post_hub_search_query');
  const savedStatusFilter = window.localStorage.getItem('post_hub_status_filter');
  const savedDataAuthorStaffId = Number(window.localStorage.getItem('post_hub_data_author_staff_id'));
  const savedDataSourcePlatform = window.localStorage.getItem('post_hub_data_source_platform');
  const savedApprovalAuthorStaffId = Number(window.localStorage.getItem('post_hub_approve_author_staff_id'));
  const legacyLeaderboardRangeMode = window.localStorage.getItem('post_hub_leaderboard_range_mode');

  if (savedPage > 0) result.page = savedPage;
  if (VALID_PAGE_SIZES.includes(savedPageSize)) result.pageSize = savedPageSize;
  if (savedApprovalPage > 0) result.approvalPage = savedApprovalPage;
  if (VALID_PAGE_SIZES.includes(savedApprovalPageSize)) result.approvalPageSize = savedApprovalPageSize;
  if (savedDate && dayjs(savedDate).isValid()) result.selectedDate = dayjs(savedDate);
  if ([0, 1, 2].includes(savedStage)) result.activeStage = savedStage as WorkflowStage;
  if (savedQuery !== null) result.query = savedQuery;
  if (Number.isInteger(savedDataAuthorStaffId) && savedDataAuthorStaffId > 0) {
    result.dataAuthorStaffId = savedDataAuthorStaffId;
  }
  if (savedDataSourcePlatform === 'FACEBOOK' || savedDataSourcePlatform === 'TIKTOK') {
    result.dataSourcePlatform = savedDataSourcePlatform;
  }
  if (Number.isInteger(savedApprovalAuthorStaffId) && savedApprovalAuthorStaffId > 0) {
    result.approvalAuthorStaffId = savedApprovalAuthorStaffId;
  }
  if (
    savedStatusFilter === 'ALL' ||
    (savedStatusFilter && Object.prototype.hasOwnProperty.call(REVIEW_STATUS_META, savedStatusFilter))
  ) {
    result.statusFilter = savedStatusFilter as 'ALL' | SocialPostReviewStatus;
  }
  if (savedReportPeriodMode === 'day' || savedReportPeriodMode === 'week' || savedReportPeriodMode === 'month') {
    result.reportPeriodMode = savedReportPeriodMode;
  } else if (
    legacyLeaderboardRangeMode === 'DAY' ||
    legacyLeaderboardRangeMode === 'WEEK' ||
    legacyLeaderboardRangeMode === 'MONTH'
  ) {
    result.reportPeriodMode = legacyLeaderboardRangeMode.toLowerCase() as ReportPeriodMode;
  }

  return result;
}

export function writePostHubPreferences(preferences: PostHubPreferences): void {
  window.localStorage.setItem('post_hub_data_page', String(preferences.page));
  window.localStorage.setItem('post_hub_data_page_size', String(preferences.pageSize));
  window.localStorage.setItem('post_hub_approve_page', String(preferences.approvalPage));
  window.localStorage.setItem('post_hub_approve_page_size', String(preferences.approvalPageSize));
  window.localStorage.setItem('post_hub_selected_date', preferences.selectedDate.format('YYYY-MM-DD'));
  window.localStorage.setItem('post_hub_active_stage', String(preferences.activeStage));
  window.localStorage.setItem('post_hub_report_period_mode', preferences.reportPeriodMode);
  window.localStorage.setItem('post_hub_search_query', preferences.query);
  window.localStorage.setItem('post_hub_status_filter', preferences.statusFilter);
  if (preferences.dataAuthorStaffId) {
    window.localStorage.setItem('post_hub_data_author_staff_id', String(preferences.dataAuthorStaffId));
  } else {
    window.localStorage.removeItem('post_hub_data_author_staff_id');
  }
  window.localStorage.setItem('post_hub_data_source_platform', preferences.dataSourcePlatform);
  if (preferences.approvalAuthorStaffId) {
    window.localStorage.setItem('post_hub_approve_author_staff_id', String(preferences.approvalAuthorStaffId));
  } else {
    window.localStorage.removeItem('post_hub_approve_author_staff_id');
  }
}
