import {
  type CreateSocialPostSubmissionDto,
  removeVietnameseTones,
  type ReviewSocialPostDto,
  type SocialPostAuthorOption,
  type SocialPostListResponse,
  type SocialPostPageQuery,
  type SocialPostSubmission,
  type SocialPostSummary,
} from '@mos-lab/shared';
import { getDateBounds, resolveSocialPostPeriodBounds } from './date-period.js';
import { buildSocialPostDailyRewards, buildSocialPostLeaderboard, getRewardConfig } from './rewards.js';
import {
  getSocialPostSourceContext,
  normalizeNativeSourceUrl,
  parseNativePostedAt,
  toSocialPostSubmission,
} from './source-url.js';
import { type CrmClient, MOS_NATIVE_SOURCE_ID } from './types.js';

/**
 * Native campaign intake. The JWT mOS account is the only permitted author;
 * historical Sheet rows remain untouched and are never reused as intake.
 */
export async function createNativeSubmission(
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

  return toSocialPostSubmission(submission);
}

export async function listSubmissions(prisma: CrmClient, query: SocialPostPageQuery): Promise<SocialPostListResponse> {
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
    data: visibleRows.slice((page - 1) * limit, page * limit).map(toSocialPostSubmission),
    total: visibleRows.length,
    page,
    limit,
    summary,
    leaderboard,
    authorOptions,
    rewardConfig,
  };
}

export async function reviewSubmission(
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
