import { createHash } from 'node:crypto';
import {
  removeVietnameseTones,
  type SocialPostContentType,
  type SocialPostOrigin,
  type SocialPostPlacement,
  type SocialPostPlatform,
  type SocialPostReviewStatus,
  type SocialPostSourceContext,
  type SocialPostSubmission,
} from '@mos-lab/shared';
import { MOS_NATIVE_SOURCE_ID } from './types.js';

export type SocialPostSubmissionDbRow = {
  id: number;
  sourceRecordId: number | null;
  sourceSpreadsheetId: string;
  staffId: number;
  contentType: string;
  channel: string;
  sourceUrl: string;
  postedAt: Date;
  reviewStatus: string;
  reviewerComment: string | null;
  reviewedAt: Date | null;
  sourceReviewerName: string | null;
  staff: { displayName: string; avatarUrl: string | null };
  reviewer: { displayName: string } | null;
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

export function parseNativePostedAt(value: string): Date {
  const postedAt = new Date(value);
  if (!value || !Number.isFinite(postedAt.getTime())) {
    throw new Error('Ngày đăng phải là thời điểm hợp lệ');
  }
  if (postedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new Error('Ngày đăng không thể ở tương lai');
  }
  return postedAt;
}

export function getSubmissionOrigin(sourceSpreadsheetId: string): SocialPostOrigin {
  return sourceSpreadsheetId === MOS_NATIVE_SOURCE_ID ? 'MOS' : 'SHEET_HISTORY';
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

/** Maps a Prisma CrmSocialPostSubmission row into the public SocialPostSubmission DTO. */
export function toSocialPostSubmission(row: SocialPostSubmissionDbRow): SocialPostSubmission {
  return {
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
  };
}
