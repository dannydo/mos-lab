import type {
  SocialPostApprovalRewardPreview,
  SocialPostContentType,
  SocialPostLeaderboardEntry,
  SocialPostLeaderboardQuery,
  SocialPostLeaderboardResponse,
  SocialPostPosterDailyRewardQuery,
  SocialPostPosterDailyRewardResponse,
  SocialPostRewardConfig,
} from '@mos-lab/shared';
import { getDateBounds, getIctDateKey, resolveSocialPostPeriodBounds } from './date-period.js';
import {
  type CrmClient,
  type DailyRewardWithMember,
  DEFAULT_SOCIAL_POST_REWARD_CONFIG,
  POST_HUB_REWARD_CONFIG_KEY,
  type SocialPostRewardLedgerRow,
} from './types.js';

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

export function validateRewardConfig(config: SocialPostRewardConfig): SocialPostRewardConfig {
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

export async function getRewardConfig(prisma: CrmClient): Promise<SocialPostRewardConfig> {
  const stored = await prisma.crmConfig.findUnique({ where: { key: POST_HUB_REWARD_CONFIG_KEY } });
  if (!stored) return { ...DEFAULT_SOCIAL_POST_REWARD_CONFIG };

  try {
    return validateRewardConfig({ ...DEFAULT_SOCIAL_POST_REWARD_CONFIG, ...JSON.parse(stored.value) });
  } catch {
    return { ...DEFAULT_SOCIAL_POST_REWARD_CONFIG };
  }
}

export async function updateRewardConfig(
  prisma: CrmClient,
  config: SocialPostRewardConfig
): Promise<SocialPostRewardConfig> {
  const validated = validateRewardConfig(config);
  await prisma.crmConfig.upsert({
    where: { key: POST_HUB_REWARD_CONFIG_KEY },
    update: { value: JSON.stringify(validated) },
    create: { key: POST_HUB_REWARD_CONFIG_KEY, value: JSON.stringify(validated) },
  });
  return validated;
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

export async function getApprovalRewardPreview(
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

export async function getCampaignLeaderboard(
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

export async function getPosterDailyRewards(
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
