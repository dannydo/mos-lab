import { createHash } from 'node:crypto';
import type { PrismaClient } from '../../generated/crm-client/index.js';
import {
  type CreateSocialPostSubmissionDto,
  removeVietnameseTones,
  type ImportSocialPostsDto,
  type ImportSocialPostsResult,
  type ReviewSocialPostDto,
  type SocialPostApprovalRewardPreview,
  type SocialPostAuthorOption,
  type SocialPostContentType,
  type SocialPostLeaderboardEntry,
  type SocialPostLeaderboardQuery,
  type SocialPostLeaderboardResponse,
  type SocialPostListResponse,
  type SocialPostPageQuery,
  type SocialPostPeriodQuery,
  type SocialPostPosterDailyReward,
  type SocialPostPosterDailyRewardQuery,
  type SocialPostPosterDailyRewardResponse,
  type SocialPostRewardConfig,
  type SocialPostReviewStatus,
  type SocialPostSourceContext,
  type SocialPostPlatform,
  type SocialPostPlacement,
  type SocialPostOrigin,
  type SocialPostSubmission,
  type SocialPostSummary,
} from '@mos-lab/shared';

type CrmClient = PrismaClient;

const REVIEW_MARK_TO_STATUS: Record<string, SocialPostReviewStatus> = {
  '✅': 'APPROVED',
  '🔁': 'NEEDS_REVIEW',
  '❌': 'REJECTED',
};

/**
 * The source sheet uses a short display name for this account. This is a
 * deliberate identity map, not a fuzzy fallback: every other author must
 * resolve to one unique mOS staff display name directly.
 */
const SOURCE_ACCOUNT_ALIASES: Record<string, string> = {
  'sinh nguyen': 'bui sinh nguyen',
  'nguyen bui': 'bui sinh nguyen',
};

const POST_HUB_REWARD_CONFIG_KEY = 'POST_HUB_REWARD_CONFIG';
const MOS_NATIVE_SOURCE_ID = 'MOS';

type SocialPostRewardLedgerRow = {
  staffId: number;
  postedAt: Date;
  reviewStatus: string;
  contentType: string;
  staff: { displayName: string; avatarUrl?: string | null };
};

type DailyRewardWithMember = SocialPostPosterDailyReward & {
  staffId: number;
  member: string;
  avatarUrl: string | null;
};

type PreparedSocialPostImportRow = {
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

type PreparedSocialPostImport = {
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

export function getSocialPostContentType(channel: string): SocialPostContentType {
  return removeVietnameseTones(channel).includes('video') ? 'VIDEO' : 'RECRUITMENT_POST';
}

function parseSourceUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function normalizeNativeSourceUrl(value: string): { sourceUrl: string; fingerprint: string } {
  const sourceUrl = String(value || '').trim();
  const url = parseSourceUrl(sourceUrl);
  if (!url || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Link bài đăng phải là URL http(s) hợp lệ');
  }
  if (getSourcePlatform(url).platform === 'UNKNOWN') {
    throw new Error('Post Hub hiện chỉ nhận link Facebook hoặc TikTok');
  }

  url.hash = '';
  for (const key of ['fbclid', 'mibextid', 'utm_source', 'utm_medium', 'utm_campaign']) {
    url.searchParams.delete(key);
  }
  return {
    sourceUrl,
    fingerprint: createHash('sha256').update(url.toString()).digest('hex'),
  };
}

function parseNativePostedAt(value: string): Date {
  const postedAt = new Date(value);
  if (!value || !Number.isFinite(postedAt.getTime())) {
    throw new Error('Ngày đăng phải là thời điểm hợp lệ');
  }
  if (postedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new Error('Ngày đăng không thể ở tương lai');
  }
  return postedAt;
}

function getSubmissionOrigin(sourceSpreadsheetId: string): SocialPostOrigin {
  return sourceSpreadsheetId === MOS_NATIVE_SOURCE_ID ? 'MOS' : 'SHEET_HISTORY';
}

function getSourcePlatform(url: URL | null): { platform: SocialPostPlatform; label: string } {
  const hostname = url?.hostname.toLowerCase().replace(/^www\./, '') || '';
  if (
    hostname === 'facebook.com' ||
    hostname.endsWith('.facebook.com') ||
    hostname === 'fb.com' ||
    hostname.endsWith('.fb.com')
  ) {
    return { platform: 'FACEBOOK', label: 'Facebook' };
  }
  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
    return { platform: 'TIKTOK', label: 'TikTok' };
  }
  return { platform: 'UNKNOWN', label: 'Chưa rõ nền tảng' };
}

function getFacebookGroupId(url: URL | null): string | null {
  if (!url || getSourcePlatform(url).platform !== 'FACEBOOK') return null;
  const segments = url.pathname.split('/').filter(Boolean);
  const groupsIndex = segments.findIndex((segment) => segment.toLowerCase() === 'groups');
  const rawGroupId = groupsIndex >= 0 ? segments[groupsIndex + 1] : null;
  if (!rawGroupId) return null;
  try {
    return decodeURIComponent(rawGroupId).trim() || null;
  } catch {
    return rawGroupId.trim() || null;
  }
}

function formatFacebookGroup(groupId: string): string {
  return /^\d+$/.test(groupId) ? `Nhóm Facebook #${groupId}` : `Nhóm Facebook · ${groupId.replace(/[-_]+/g, ' ')}`;
}

/**
 * Preserves what the source link actually tells us. Shortened Facebook share links
 * intentionally remain “chưa có tên nhóm” rather than inventing a destination.
 */
export function getSocialPostSourceContext(channel: string, sourceUrl: string): SocialPostSourceContext {
  const normalizedChannel = removeVietnameseTones(channel || '');
  const url = parseSourceUrl(sourceUrl);
  const { platform, label: platformLabel } = getSourcePlatform(url);
  const groupId = getFacebookGroupId(url);
  const path = url?.pathname.toLowerCase() || '';
  let placement: SocialPostPlacement = 'UNKNOWN';

  if (normalizedChannel.includes('comment')) placement = 'COMMENT';
  else if (normalizedChannel.includes('trang ca nhan')) placement = 'PROFILE';
  else if (normalizedChannel.includes('hoi nhom') || groupId) placement = 'GROUP';
  else if (path.startsWith('/stories/')) placement = 'STORY';
  else if (path.startsWith('/reel/') || path.startsWith('/share/r') || path.startsWith('/share/v')) placement = 'REEL';
  else if (platform === 'TIKTOK' || normalizedChannel.includes('video')) placement = 'VIDEO';

  const placementLabel: Record<SocialPostPlacement, string> = {
    GROUP: 'Nhóm',
    PROFILE: 'Cá nhân',
    COMMENT: 'Bình luận',
    STORY: 'Story',
    REEL: 'Reel',
    VIDEO: 'Video',
    UNKNOWN: 'Chưa rõ vị trí',
  };

  if (placement === 'GROUP') {
    return {
      platform,
      platformLabel,
      placement,
      placementLabel: placementLabel[placement],
      destinationLabel: groupId ? formatFacebookGroup(groupId) : 'Tên nhóm chưa có trong link nguồn',
      destinationId: groupId,
      destinationIdentified: Boolean(groupId),
    };
  }

  if (placement === 'COMMENT') {
    return {
      platform,
      platformLabel,
      placement,
      placementLabel: placementLabel[placement],
      destinationLabel: groupId ? `Bình luận trong ${formatFacebookGroup(groupId)}` : 'Bình luận dưới bài viết',
      destinationId: groupId,
      destinationIdentified: Boolean(groupId),
    };
  }

  const destinationByPlacement: Record<Exclude<SocialPostPlacement, 'GROUP' | 'COMMENT'>, string> = {
    PROFILE: platform === 'FACEBOOK' ? 'Trang cá nhân Facebook' : 'Trang cá nhân',
    STORY: platform === 'FACEBOOK' ? 'Facebook Story' : 'Story',
    REEL: platform === 'FACEBOOK' ? 'Facebook Reel' : 'Reel',
    VIDEO: platform === 'TIKTOK' ? 'Video TikTok' : platform === 'FACEBOOK' ? 'Video Facebook' : 'Video',
    UNKNOWN: 'Chưa xác định nơi đăng',
  };

  return {
    platform,
    platformLabel,
    placement,
    placementLabel: placementLabel[placement],
    destinationLabel: destinationByPlacement[placement],
    destinationId: null,
    destinationIdentified: placement !== 'UNKNOWN',
  };
}

function isSafeRewardValue(value: unknown, allowNull = false): value is number | null {
  return (
    (allowNull && value === null) ||
    (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100_000)
  );
}

/**
 * Applies the Sheet's rule order exactly: video cap, recruitment cap, then
 * the mixed total. The original formula yields FALSE for an over-limit mixed
 * total; null carries that unresolved decision through mOS until configured.
 */
export function calculateSocialPostBananaPoints(
  videoCount: number,
  recruitmentCount: number,
  config: SocialPostRewardConfig
): number | null {
  if (videoCount > config.videoCapThreshold) return config.videoCapPoints;
  if (recruitmentCount > config.recruitmentCapThreshold) return config.recruitmentCapPoints;
  if (videoCount + recruitmentCount <= config.mixedEligibleTotal) {
    return recruitmentCount * config.recruitmentPoints + videoCount * config.videoPoints;
  }
  return config.mixedOverflowPoints;
}

function validateRewardConfig(config: SocialPostRewardConfig): SocialPostRewardConfig {
  const numericKeys = [
    'videoPoints',
    'recruitmentPoints',
    'videoCapThreshold',
    'videoCapPoints',
    'recruitmentCapThreshold',
    'recruitmentCapPoints',
    'mixedEligibleTotal',
  ] as const;

  for (const key of numericKeys) {
    if (!isSafeRewardValue(config[key]) || !Number.isInteger(config[key])) {
      throw new Error(`Cấu hình ${key} phải là số nguyên từ 0 đến 100.000`);
    }
  }
  if (
    !isSafeRewardValue(config.mixedOverflowPoints, true) ||
    (config.mixedOverflowPoints !== null && !Number.isInteger(config.mixedOverflowPoints))
  ) {
    throw new Error('Cấu hình mixedOverflowPoints phải là số nguyên từ 0 đến 100.000 hoặc để trống');
  }
  return config;
}

async function getRewardConfig(prisma: CrmClient): Promise<SocialPostRewardConfig> {
  const stored = await prisma.crmConfig.findUnique({ where: { key: POST_HUB_REWARD_CONFIG_KEY } });
  if (!stored) return { ...DEFAULT_SOCIAL_POST_REWARD_CONFIG };

  try {
    return validateRewardConfig({ ...DEFAULT_SOCIAL_POST_REWARD_CONFIG, ...JSON.parse(stored.value) });
  } catch {
    return { ...DEFAULT_SOCIAL_POST_REWARD_CONFIG };
  }
}

export function parseSocialPostSheetDateTime(value: string, fieldName: string): Date {
  const match = String(value || '')
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);

  if (!match) {
    throw new Error(`${fieldName} must be DD/MM/YYYY HH:mm:ss, received "${value}"`);
  }

  const [, dayValue, monthValue, yearValue, hourValue = '0', minuteValue = '0', secondValue = '0'] = match;
  const day = Number(dayValue);
  const month = Number(monthValue);
  const year = Number(yearValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);
  const localDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  if (
    !Number.isFinite(localDate.getTime()) ||
    day < 1 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    localDate.getUTCFullYear() !== year ||
    localDate.getUTCMonth() !== month - 1 ||
    localDate.getUTCDate() !== day
  ) {
    throw new Error(`${fieldName} is invalid, received "${value}"`);
  }

  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second));
}

function getDateBounds(dateFrom?: string, dateTo?: string) {
  const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateFrom && !isDate(dateFrom)) throw new Error('dateFrom must use YYYY-MM-DD');
  if (dateTo && !isDate(dateTo)) throw new Error('dateTo must use YYYY-MM-DD');
  if (dateFrom && dateTo && dateFrom > dateTo) throw new Error('dateFrom cannot be after dateTo');

  return {
    ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00+07:00`) } : {}),
    ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59+07:00`) } : {}),
  };
}

function formatUtcCalendarDate(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
}

function parseCalendarDate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('anchorDate must use YYYY-MM-DD');

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error('anchorDate is invalid');
  }
  return parsed;
}

/** Uses the Monday–Sunday business calendar around an ICT posting-date anchor. */
export function resolveSocialPostPeriodBounds(query: SocialPostPeriodQuery): { dateFrom?: string; dateTo?: string } {
  if (!query.period && !query.anchorDate) return {};
  if (!query.period || !query.anchorDate) throw new Error('period and anchorDate must be provided together');

  const anchor = parseCalendarDate(query.anchorDate);
  if (query.period === 'DAY') {
    return { dateFrom: query.anchorDate, dateTo: query.anchorDate };
  }
  if (query.period === 'WEEK') {
    const daysSinceMonday = (anchor.getUTCDay() + 6) % 7;
    const start = new Date(anchor);
    start.setUTCDate(anchor.getUTCDate() - daysSinceMonday);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);
    return { dateFrom: formatUtcCalendarDate(start), dateTo: formatUtcCalendarDate(end) };
  }
  if (query.period === 'MONTH') {
    const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    return { dateFrom: formatUtcCalendarDate(start), dateTo: formatUtcCalendarDate(end) };
  }
  throw new Error('period must be DAY, WEEK, or MONTH');
}

function getIctDateKey(value: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(value)
      .map(({ type, value: partValue }) => [type, partValue])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * A reward is calculated independently for every poster and every source
 * posting day. This is the source Sheet's DASHBOARD DAILY grain, and it must
 * stay intact before a campaign-wide leaderboard sums those days.
 */
export function buildSocialPostDailyRewards(
  rows: SocialPostRewardLedgerRow[],
  rewardConfig: SocialPostRewardConfig
): DailyRewardWithMember[] {
  const dailyByPoster = new Map<string, Omit<DailyRewardWithMember, 'bananaPoints'>>();

  for (const row of rows) {
    const date = getIctDateKey(row.postedAt);
    const key = `${row.staffId}:${date}`;
    if (!dailyByPoster.has(key)) {
      dailyByPoster.set(key, {
        staffId: row.staffId,
        member: row.staff.displayName,
        avatarUrl: row.staff.avatarUrl || null,
        date,
        submittedCount: 0,
        approvedVideoCount: 0,
        approvedRecruitmentCount: 0,
        needsReviewCount: 0,
        rejectedCount: 0,
      });
    }

    const daily = dailyByPoster.get(key)!;
    daily.submittedCount += 1;
    if (row.reviewStatus === 'APPROVED') {
      if (row.contentType === 'VIDEO') daily.approvedVideoCount += 1;
      else daily.approvedRecruitmentCount += 1;
    } else if (row.reviewStatus === 'REJECTED') {
      daily.rejectedCount += 1;
    } else {
      daily.needsReviewCount += 1;
    }
  }

  return [...dailyByPoster.values()].map((daily) => ({
    ...daily,
    bananaPoints: calculateSocialPostBananaPoints(
      daily.approvedVideoCount,
      daily.approvedRecruitmentCount,
      rewardConfig
    ),
  }));
}

export function buildSocialPostLeaderboard(dailyRewards: DailyRewardWithMember[]): SocialPostLeaderboardEntry[] {
  const leaderboardByStaff = new Map<
    number,
    Omit<SocialPostLeaderboardEntry, 'rank' | 'bananaPoints'> & {
      calculatedBananaPoints: number;
      hasUnresolvedDay: boolean;
    }
  >();

  for (const daily of dailyRewards) {
    if (!leaderboardByStaff.has(daily.staffId)) {
      leaderboardByStaff.set(daily.staffId, {
        staffId: daily.staffId,
        member: daily.member,
        avatarUrl: daily.avatarUrl,
        submittedCount: 0,
        approvedVideoCount: 0,
        approvedRecruitmentCount: 0,
        needsReviewCount: 0,
        rejectedCount: 0,
        calculatedBananaPoints: 0,
        hasUnresolvedDay: false,
      });
    }

    const leader = leaderboardByStaff.get(daily.staffId)!;
    if (!leader.avatarUrl && daily.avatarUrl) leader.avatarUrl = daily.avatarUrl;
    leader.submittedCount += daily.submittedCount;
    leader.approvedVideoCount += daily.approvedVideoCount;
    leader.approvedRecruitmentCount += daily.approvedRecruitmentCount;
    leader.needsReviewCount += daily.needsReviewCount;
    leader.rejectedCount += daily.rejectedCount;
    if (daily.bananaPoints === null) leader.hasUnresolvedDay = true;
    else leader.calculatedBananaPoints += daily.bananaPoints;
  }

  return [...leaderboardByStaff.values()]
    .map(({ calculatedBananaPoints, hasUnresolvedDay, ...row }) => ({
      ...row,
      rank: 0,
      bananaPoints: hasUnresolvedDay ? null : calculatedBananaPoints,
    }))
    .sort(
      (left, right) =>
        (right.bananaPoints ?? -1) - (left.bananaPoints ?? -1) ||
        right.submittedCount - left.submittedCount ||
        left.member.localeCompare(right.member, 'vi')
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function canonicalSourceName(value: string): string {
  const normalized = removeVietnameseTones(value);
  return SOURCE_ACCOUNT_ALIASES[normalized] || normalized;
}

/**
 * Normalizes a source snapshot once for both dry-run and apply. Keeping this
 * preparation inside the service prevents the release importer from getting a
 * different account-mapping or approval-status interpretation than the API.
 */
async function prepareGoogleSheetImport(
  prisma: CrmClient,
  dto: ImportSocialPostsDto
): Promise<PreparedSocialPostImport> {
  const sourceSpreadsheetId = String(dto.sourceSpreadsheetId || '').trim();
  if (!sourceSpreadsheetId) throw new Error('sourceSpreadsheetId is required');

  const rowsBySourceId = new Map<number, (typeof dto.rows)[number]>();
  for (const row of dto.rows) {
    if (!Number.isInteger(row.sourceRecordId) || row.sourceRecordId <= 0) {
      throw new Error(`Invalid sourceRecordId "${row.sourceRecordId}"`);
    }
    if (rowsBySourceId.has(row.sourceRecordId)) {
      throw new Error(`Duplicate sourceRecordId "${row.sourceRecordId}"`);
    }
    if (
      typeof row.sourceAuthorName !== 'string' ||
      typeof row.postedAt !== 'string' ||
      typeof row.channel !== 'string' ||
      typeof row.sourceUrl !== 'string' ||
      !row.sourceAuthorName.trim() ||
      !row.postedAt.trim() ||
      !row.channel.trim()
    ) {
      throw new Error(`Source record ${row.sourceRecordId} is missing a valid author, postedAt, channel, or sourceUrl`);
    }
    if (
      row.sourceAuthorName.trim().length > 100 ||
      row.channel.trim().length > 150 ||
      Buffer.byteLength(row.sourceUrl.trim(), 'utf8') > 65_535
    ) {
      throw new Error(`Source record ${row.sourceRecordId} exceeds a stored field limit`);
    }
    rowsBySourceId.set(row.sourceRecordId, row);
  }

  const approvalsBySourceId = new Map<number, (typeof dto.approvals)[number]>();
  for (const approval of dto.approvals) {
    if (!rowsBySourceId.has(approval.sourceRecordId)) continue;
    if (approvalsBySourceId.has(approval.sourceRecordId)) {
      throw new Error(`Duplicate approval for sourceRecordId "${approval.sourceRecordId}"`);
    }
    if (!REVIEW_MARK_TO_STATUS[approval.reviewMark]) {
      throw new Error(`Unsupported review mark "${approval.reviewMark}" for sourceRecordId ${approval.sourceRecordId}`);
    }
    approvalsBySourceId.set(approval.sourceRecordId, approval);
  }

  const staff = await prisma.crmStaff.findMany({
    select: { id: true, displayName: true },
  });
  const staffByCanonicalName = new Map<string, Array<{ id: number; displayName: string }>>();
  for (const member of staff) {
    const key = removeVietnameseTones(member.displayName);
    const candidates = staffByCanonicalName.get(key) || [];
    candidates.push(member);
    staffByCanonicalName.set(key, candidates);
  }

  const unmappedAuthors = new Map<string, number>();
  const importRows = [...rowsBySourceId.values()]
    .sort((left, right) => left.sourceRecordId - right.sourceRecordId)
    .flatMap((row) => {
      const staffCandidates = staffByCanonicalName.get(canonicalSourceName(row.sourceAuthorName)) || [];
      if (staffCandidates.length !== 1) {
        unmappedAuthors.set(row.sourceAuthorName, (unmappedAuthors.get(row.sourceAuthorName) || 0) + 1);
        return [];
      }
      const staffMember = staffCandidates[0];
      const approval = approvalsBySourceId.get(row.sourceRecordId);
      const reviewerCandidates = approval?.sourceReviewerName
        ? staffByCanonicalName.get(canonicalSourceName(approval.sourceReviewerName)) || []
        : [];
      const reviewer = reviewerCandidates.length === 1 ? reviewerCandidates[0] : undefined;

      return [
        {
          sourceRecordId: row.sourceRecordId,
          staffId: staffMember.id,
          sourceAuthorName: row.sourceAuthorName.trim(),
          contentType: getSocialPostContentType(row.channel),
          channel: row.channel.trim(),
          sourceUrl: row.sourceUrl.trim(),
          postedAt: parseSocialPostSheetDateTime(row.postedAt, `postedAt for source record ${row.sourceRecordId}`),
          reviewStatus: approval ? REVIEW_MARK_TO_STATUS[approval.reviewMark] : 'PENDING',
          reviewerComment: approval?.reviewerComment?.trim() || null,
          reviewedAt: approval?.reviewedAt?.trim()
            ? parseSocialPostSheetDateTime(approval.reviewedAt, `reviewedAt for source record ${row.sourceRecordId}`)
            : null,
          reviewedByStaffId: reviewer?.id || null,
          sourceReviewerName: approval?.sourceReviewerName?.trim() || null,
        },
      ];
    });

  return {
    sourceSpreadsheetId,
    importRows,
    unmappedAuthors: [...unmappedAuthors.entries()].map(([sourceAuthorName, count]) => ({ sourceAuthorName, count })),
    unmatchedApprovalSourceIds: dto.approvals
      .map((approval) => approval.sourceRecordId)
      .filter((sourceRecordId) => !rowsBySourceId.has(sourceRecordId)),
  };
}

async function findExistingSheetSourceIds(prisma: CrmClient, prepared: PreparedSocialPostImport): Promise<Set<number>> {
  if (
    prepared.unmappedAuthors.length > 0 ||
    prepared.unmatchedApprovalSourceIds.length > 0 ||
    prepared.importRows.length === 0
  )
    return new Set();
  const existing = await prisma.crmSocialPostSubmission.findMany({
    where: {
      sourceSpreadsheetId: prepared.sourceSpreadsheetId,
      sourceRecordId: { in: prepared.importRows.map((row) => row.sourceRecordId) },
    },
    select: { sourceRecordId: true },
  });
  return new Set(
    existing
      .map((row) => row.sourceRecordId)
      .filter((sourceRecordId): sourceRecordId is number => sourceRecordId !== null)
  );
}

function toImportResult(prepared: PreparedSocialPostImport, existingSourceIds: Set<number>): ImportSocialPostsResult {
  if (prepared.unmappedAuthors.length > 0 || prepared.unmatchedApprovalSourceIds.length > 0) {
    return {
      imported: 0,
      updated: 0,
      approved: 0,
      needsReview: 0,
      rejected: 0,
      pending: 0,
      unmappedAuthors: prepared.unmappedAuthors,
      unmatchedApprovalSourceIds: prepared.unmatchedApprovalSourceIds,
    };
  }

  const countFor = (status: SocialPostReviewStatus) =>
    prepared.importRows.filter((row) => row.reviewStatus === status).length;
  return {
    imported: prepared.importRows.filter((row) => !existingSourceIds.has(row.sourceRecordId)).length,
    updated: prepared.importRows.filter((row) => existingSourceIds.has(row.sourceRecordId)).length,
    approved: countFor('APPROVED'),
    needsReview: countFor('NEEDS_REVIEW'),
    rejected: countFor('REJECTED'),
    pending: countFor('PENDING'),
    unmappedAuthors: prepared.unmappedAuthors,
    unmatchedApprovalSourceIds: prepared.unmatchedApprovalSourceIds,
  };
}

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
    if (!['VIDEO', 'RECRUITMENT_POST'].includes(dto.contentType)) {
      throw new Error('Loại bài đăng không hợp lệ');
    }
    const channel = String(dto.channel || '').trim();
    if (!channel || channel.length > 150) {
      throw new Error('Kênh / nơi đăng là bắt buộc và tối đa 150 ký tự');
    }

    const { sourceUrl, fingerprint } = normalizeNativeSourceUrl(dto.sourceUrl);
    const postedAt = parseNativePostedAt(dto.postedAt);
    const existing = await prisma.crmSocialPostSubmission.findFirst({
      where: {
        sourceSpreadsheetId: MOS_NATIVE_SOURCE_ID,
        sourceUrlFingerprint: fingerprint,
      },
      select: { id: true },
    });
    if (existing) throw new Error('Link bài đăng này đã được nộp trong mOS');

    const submission = await prisma.$transaction(async (tx) => {
      const staff = await tx.crmStaff.findUnique({
        where: { id: staffId },
        select: { id: true, displayName: true, avatarUrl: true, isActive: true },
      });
      if (!staff?.isActive) throw new Error('Tài khoản mOS của người đăng không còn hoạt động');

      const created = await tx.crmSocialPostSubmission.create({
        data: {
          sourceSpreadsheetId: MOS_NATIVE_SOURCE_ID,
          sourceRecordId: null,
          sourceUrlFingerprint: fingerprint,
          staffId: staff.id,
          sourceAuthorName: staff.displayName,
          contentType: dto.contentType,
          channel,
          sourceUrl,
          postedAt,
          reviewStatus: 'PENDING',
        },
      });

      return tx.crmSocialPostSubmission.update({
        where: { id: created.id },
        data: { sourceRecordId: created.id },
        include: {
          staff: { select: { displayName: true, avatarUrl: true } },
          reviewer: { select: { displayName: true } },
        },
      });
    });

    return {
      id: submission.id,
      sourceRecordId: submission.sourceRecordId ?? submission.id,
      origin: 'MOS',
      staffId: submission.staffId,
      author: submission.staff.displayName,
      avatarUrl: submission.staff.avatarUrl || null,
      contentType: submission.contentType as SocialPostContentType,
      assetName: submission.channel,
      channel: submission.channel,
      sourceUrl: submission.sourceUrl,
      source: getSocialPostSourceContext(submission.channel, submission.sourceUrl),
      postedAt: submission.postedAt.toISOString(),
      submittedAt: submission.postedAt.toISOString(),
      reviewStatus: submission.reviewStatus as SocialPostReviewStatus,
      reviewerComment: submission.reviewerComment || undefined,
      reviewedAt: submission.reviewedAt?.toISOString() || null,
      reviewerName: submission.reviewer?.displayName || submission.sourceReviewerName || null,
    };
  }

  static async updateRewardConfig(prisma: CrmClient, config: SocialPostRewardConfig): Promise<SocialPostRewardConfig> {
    const validated = validateRewardConfig(config);
    await prisma.crmConfig.upsert({
      where: { key: POST_HUB_REWARD_CONFIG_KEY },
      update: { value: JSON.stringify(validated) },
      create: { key: POST_HUB_REWARD_CONFIG_KEY, value: JSON.stringify(validated) },
    });
    return validated;
  }

  static async getApprovalRewardPreview(
    prisma: CrmClient,
    submissionId: number
  ): Promise<SocialPostApprovalRewardPreview> {
    const submission = await prisma.crmSocialPostSubmission.findUnique({
      where: { id: submissionId },
      include: { staff: { select: { displayName: true } } },
    });
    if (!submission) throw new Error('Không tìm thấy bài đăng');

    const date = getIctDateKey(submission.postedAt);
    const [approvedRows, rewardConfig] = await Promise.all([
      prisma.crmSocialPostSubmission.findMany({
        where: {
          staffId: submission.staffId,
          reviewStatus: 'APPROVED',
          postedAt: getDateBounds(date, date),
        },
        select: { contentType: true },
      }),
      getRewardConfig(prisma),
    ]);

    const currentApprovedVideoCount = approvedRows.filter((row) => row.contentType === 'VIDEO').length;
    const currentApprovedRecruitmentCount = approvedRows.length - currentApprovedVideoCount;
    const isAlreadyApproved = submission.reviewStatus === 'APPROVED';
    const projectedApprovedVideoCount =
      currentApprovedVideoCount + (!isAlreadyApproved && submission.contentType === 'VIDEO' ? 1 : 0);
    const projectedApprovedRecruitmentCount =
      currentApprovedRecruitmentCount + (!isAlreadyApproved && submission.contentType !== 'VIDEO' ? 1 : 0);

    return {
      sourceRecordId: submission.sourceRecordId ?? submission.id,
      author: submission.staff.displayName,
      date,
      contentType: submission.contentType as SocialPostContentType,
      contentLabel: submission.contentType === 'VIDEO' ? 'Video hợp lệ' : 'Bài khác hợp lệ',
      basePoints: submission.contentType === 'VIDEO' ? rewardConfig.videoPoints : rewardConfig.recruitmentPoints,
      currentApprovedVideoCount,
      currentApprovedRecruitmentCount,
      projectedApprovedVideoCount,
      projectedApprovedRecruitmentCount,
      projectedDailyPoints: calculateSocialPostBananaPoints(
        projectedApprovedVideoCount,
        projectedApprovedRecruitmentCount,
        rewardConfig
      ),
      isAlreadyApproved,
      rewardConfig,
    };
  }

  static async previewGoogleSheetImport(
    prisma: CrmClient,
    dto: ImportSocialPostsDto
  ): Promise<ImportSocialPostsResult> {
    const prepared = await prepareGoogleSheetImport(prisma, dto);
    const existingSourceIds = await findExistingSheetSourceIds(prisma, prepared);
    return toImportResult(prepared, existingSourceIds);
  }

  static async importFromGoogleSheet(prisma: CrmClient, dto: ImportSocialPostsDto): Promise<ImportSocialPostsResult> {
    const prepared = await prepareGoogleSheetImport(prisma, dto);
    const existingSourceIds = await findExistingSheetSourceIds(prisma, prepared);
    const result = toImportResult(prepared, existingSourceIds);
    if (result.unmappedAuthors.length > 0 || result.unmatchedApprovalSourceIds.length > 0) return result;

    await prisma.$transaction(
      async (tx) => {
        for (const row of prepared.importRows) {
          await tx.crmSocialPostSubmission.upsert({
            where: {
              sourceSpreadsheetId_sourceRecordId: {
                sourceSpreadsheetId: prepared.sourceSpreadsheetId,
                sourceRecordId: row.sourceRecordId,
              },
            },
            create: {
              sourceSpreadsheetId: prepared.sourceSpreadsheetId,
              ...row,
            },
            update: {
              ...row,
              importedAt: new Date(),
            },
          });
        }
      },
      { maxWait: 5_000, timeout: 60_000 }
    );
    return result;
  }

  static async getCampaignLeaderboard(
    prisma: CrmClient,
    query: SocialPostLeaderboardQuery = {}
  ): Promise<SocialPostLeaderboardResponse> {
    const periodBounds = resolveSocialPostPeriodBounds(query);
    const postedAt = getDateBounds(periodBounds.dateFrom, periodBounds.dateTo);
    const [rows, rewardConfig] = await Promise.all([
      prisma.crmSocialPostSubmission.findMany({
        where: Object.keys(postedAt).length ? { postedAt } : undefined,
        include: { staff: { select: { displayName: true, avatarUrl: true } } },
        orderBy: [{ postedAt: 'desc' }, { sourceRecordId: 'desc' }],
      }),
      getRewardConfig(prisma),
    ]);

    const dailyRewards = buildSocialPostDailyRewards(rows, rewardConfig);
    const dates = dailyRewards.map((daily) => daily.date).sort();
    return {
      data: buildSocialPostLeaderboard(dailyRewards),
      dateFrom: periodBounds.dateFrom || dates[0] || null,
      dateTo: periodBounds.dateTo || dates.at(-1) || null,
      anchorDate: query.anchorDate || null,
      period: query.period,
      rewardConfig,
    };
  }

  static async getPosterDailyRewards(
    prisma: CrmClient,
    staffId: number,
    query: SocialPostPosterDailyRewardQuery = {}
  ): Promise<SocialPostPosterDailyRewardResponse> {
    const periodBounds = resolveSocialPostPeriodBounds(query);
    const postedAt = getDateBounds(periodBounds.dateFrom, periodBounds.dateTo);
    const [rows, rewardConfig] = await Promise.all([
      prisma.crmSocialPostSubmission.findMany({
        where: { staffId, ...(Object.keys(postedAt).length ? { postedAt } : {}) },
        include: { staff: { select: { displayName: true, avatarUrl: true } } },
        orderBy: [{ postedAt: 'desc' }, { sourceRecordId: 'desc' }],
      }),
      getRewardConfig(prisma),
    ]);
    if (rows.length === 0) throw new Error('Không tìm thấy ledger đăng bài của poster này');

    const daily = buildSocialPostDailyRewards(rows, rewardConfig).sort((left, right) =>
      right.date.localeCompare(left.date)
    );
    const unresolvedDayCount = daily.filter((row) => row.bananaPoints === null).length;

    return {
      staffId,
      member: rows[0].staff.displayName,
      dateFrom: periodBounds.dateFrom || daily.at(-1)?.date || null,
      dateTo: periodBounds.dateTo || daily[0]?.date || null,
      anchorDate: query.anchorDate || null,
      period: query.period,
      totalBananaPoints: unresolvedDayCount ? null : daily.reduce((total, row) => total + (row.bananaPoints || 0), 0),
      unresolvedDayCount,
      daily: daily.map(({ staffId: _staffId, member: _member, avatarUrl: _avatarUrl, ...row }) => row),
      rewardConfig,
    };
  }

  static async list(prisma: CrmClient, query: SocialPostPageQuery): Promise<SocialPostListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(query.limit) || 20));
    const periodBounds = resolveSocialPostPeriodBounds(query);
    const dateBounds = getDateBounds(periodBounds.dateFrom || query.dateFrom, periodBounds.dateTo || query.dateTo);
    const reviewStatus = query.reviewStatus;
    const sourcePlatform = query.sourcePlatform;
    const approveLedger = query.approveLedger === true || String(query.approveLedger) === 'true';
    const authorStaffId = query.authorStaffId ? Number(query.authorStaffId) : undefined;

    const [rows, rewardConfig] = await Promise.all([
      prisma.crmSocialPostSubmission.findMany({
        where: {
          ...(Object.keys(dateBounds).length ? { postedAt: dateBounds } : {}),
          ...(reviewStatus ? { reviewStatus } : approveLedger ? { reviewStatus: { not: 'PENDING' } } : {}),
        },
        include: {
          staff: { select: { displayName: true, avatarUrl: true } },
          reviewer: { select: { displayName: true } },
        },
        orderBy: [{ postedAt: 'desc' }, { sourceRecordId: 'desc' }],
      }),
      getRewardConfig(prisma),
    ]);

    const rowsForPlatform = sourcePlatform
      ? rows.filter((row) => getSocialPostSourceContext(row.channel, row.sourceUrl).platform === sourcePlatform)
      : rows;
    const authorOptions: SocialPostAuthorOption[] = Array.from(
      new Map(rowsForPlatform.map((row) => [row.staffId, row.staff.displayName])).entries()
    )
      .map(([staffId, displayName]) => ({ staffId, displayName }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName, 'vi'));
    const rowsForAuthor = authorStaffId
      ? rowsForPlatform.filter((row) => row.staffId === authorStaffId)
      : rowsForPlatform;

    const normalizedSearch = removeVietnameseTones(query.search || '');
    const visibleRows = normalizedSearch
      ? rowsForAuthor.filter((row) => {
          const source = getSocialPostSourceContext(row.channel, row.sourceUrl);
          return [
            row.sourceRecordId,
            row.staff.displayName,
            row.sourceAuthorName,
            row.channel,
            row.sourceUrl,
            source.platformLabel,
            source.placementLabel,
            source.destinationLabel,
            source.destinationId || '',
          ]
            .map(removeVietnameseTones)
            .some((value) => value.includes(normalizedSearch));
        })
      : rowsForAuthor;

    const summary: SocialPostSummary = {
      submitted: visibleRows.length,
      approved: 0,
      approvedVideo: 0,
      approvedRecruitment: 0,
      needsReview: 0,
      rejected: 0,
    };

    for (const row of visibleRows) {
      if (row.reviewStatus === 'APPROVED') {
        summary.approved += 1;
        if (row.contentType === 'VIDEO') {
          summary.approvedVideo += 1;
        } else {
          summary.approvedRecruitment += 1;
        }
      } else if (row.reviewStatus === 'NEEDS_REVIEW') {
        summary.needsReview += 1;
      } else if (row.reviewStatus === 'REJECTED') {
        summary.rejected += 1;
      } else {
        summary.needsReview += 1;
      }
    }

    const leaderboard = buildSocialPostLeaderboard(buildSocialPostDailyRewards(visibleRows, rewardConfig));

    return {
      data: visibleRows.slice((page - 1) * limit, page * limit).map((row): SocialPostSubmission => ({
        id: row.id,
        sourceRecordId: row.sourceRecordId ?? row.id,
        origin: getSubmissionOrigin(row.sourceSpreadsheetId),
        staffId: row.staffId,
        author: row.staff.displayName,
        avatarUrl: row.staff.avatarUrl || null,
        contentType: row.contentType as SocialPostContentType,
        assetName: row.channel,
        channel: row.channel,
        sourceUrl: row.sourceUrl,
        source: getSocialPostSourceContext(row.channel, row.sourceUrl),
        postedAt: row.postedAt.toISOString(),
        submittedAt: row.postedAt.toISOString(),
        reviewStatus: row.reviewStatus as SocialPostReviewStatus,
        reviewerComment: row.reviewerComment || undefined,
        reviewedAt: row.reviewedAt?.toISOString() || null,
        reviewerName: row.reviewer?.displayName || row.sourceReviewerName || null,
      })),
      total: visibleRows.length,
      page,
      limit,
      summary,
      leaderboard,
      authorOptions,
      rewardConfig,
    };
  }

  static async review(
    prisma: CrmClient,
    submissionId: number,
    reviewerStaffId: number,
    reviewerName: string,
    dto: ReviewSocialPostDto
  ): Promise<void> {
    await prisma.crmSocialPostSubmission.update({
      where: { id: submissionId },
      data: {
        reviewStatus: dto.reviewStatus,
        reviewerComment: dto.reviewerComment?.trim() || null,
        reviewedAt: new Date(),
        reviewedByStaffId: reviewerStaffId,
        sourceReviewerName: reviewerName,
      },
    });
  }
}
