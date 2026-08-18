'use client';

import React from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Avatar, Space, Tooltip, Typography, theme } from 'antd';
import { CircleCheck, CircleX, Clock3, TriangleAlert, type LucideIcon } from 'lucide-react';
import {
  type SocialPostOrigin,
  type SocialPostReviewStatus,
  type SocialPostRewardConfig,
  type SocialPostSourceContext,
} from '@mos-lab/shared';
import { AppIcon, StatusTag, type ReportPeriodMode, type StatusType } from '~/components/ui';

const { Text } = Typography;

const ICT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const ICT_DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: ICT_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export interface PostHubReviewStatusMeta {
  label: string;
  tone: StatusType;
  icon: LucideIcon;
}

export const REVIEW_STATUS_META: Record<SocialPostReviewStatus, PostHubReviewStatusMeta> = {
  PENDING: { label: 'Chờ duyệt', tone: 'processing', icon: Clock3 },
  APPROVED: { label: 'Hợp lệ', tone: 'success', icon: CircleCheck },
  NEEDS_REVIEW: { label: 'Kiểm tra lại', tone: 'warning', icon: TriangleAlert },
  REJECTED: { label: 'Chưa hợp lệ', tone: 'error', icon: CircleX },
};

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Converts historical Wings paths while preserving external or data-image staff avatars. */
export function formatPostHubStaffAvatarUrl(avatarUrl?: string | null): string | undefined {
  if (!avatarUrl || typeof avatarUrl !== 'string' || !avatarUrl.trim()) return undefined;

  let normalized = avatarUrl.trim();
  normalized = normalized.replace(/^(?:https?:)?\/\/(?:s|api|cdn)\.wingslashes\.com\/?/, '');
  if (/^(?:https?:|data:)/i.test(normalized)) return normalized;

  return `https://cdn.wingslashes.com/${normalized.replace(/^\/+/, '')}`;
}

/** Consistent staff identity for every Post Hub stage, with initials if a profile has no usable image. */
export function PostHubStaffAvatar({
  name,
  avatarUrl,
  size = 28,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  const { token } = theme.useToken();
  const src = formatPostHubStaffAvatarUrl(avatarUrl);

  return (
    <Avatar
      src={src}
      alt={`Ảnh đại diện ${name}`}
      size={size}
      style={{
        background: token.colorPrimary,
        color: token.colorTextLightSolid,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </Avatar>
  );
}

export function displaySheetDate(value?: string | null) {
  if (!value) return '—';

  const parts = Object.fromEntries(
    ICT_DATE_FORMATTER.formatToParts(new Date(value)).map(({ type, value: partValue }) => [type, partValue])
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function rewardRuleDescription(config?: SocialPostRewardConfig | null) {
  if (!config) return 'Đang tải quy tắc thưởng…';
  const mixedOverflow =
    config.mixedOverflowPoints === null
      ? `tổng hỗn hợp >${config.mixedEligibleTotal} cần cấu hình`
      : `tổng hỗn hợp >${config.mixedEligibleTotal} = ${config.mixedOverflowPoints} 🍌`;
  return `Video ×${config.videoPoints}; bài khác ×${config.recruitmentPoints}; video >${config.videoCapThreshold} = ${config.videoCapPoints} 🍌; bài khác >${config.recruitmentCapThreshold} = ${config.recruitmentCapPoints} 🍌; ${mixedOverflow}.`;
}

export function formatReportPeriodLabel(mode: ReportPeriodMode, referenceDate: Dayjs) {
  if (mode === 'month') return `Tháng ${referenceDate.format('MM/YYYY')}`;
  if (mode === 'week') {
    return `Tuần ${referenceDate.isoWeek()} (${referenceDate.startOf('isoWeek').format('DD/MM')} - ${referenceDate.endOf('isoWeek').format('DD/MM/YYYY')})`;
  }
  return referenceDate.format('DD/MM/YYYY');
}

export function PostHubReviewStatusTag({ status }: { status: SocialPostReviewStatus }) {
  const meta = REVIEW_STATUS_META[status];
  const isPending = status === 'PENDING';
  return (
    <StatusTag
      status={isPending ? 'cyan' : meta.tone}
      icon={isPending ? undefined : <AppIcon icon={meta.icon} size="sm" />}
      label={meta.label}
      className="py-1 px-2.5"
    />
  );
}

export function PostHubOriginTag({ origin }: { origin: SocialPostOrigin }) {
  return <StatusTag status={origin === 'MOS' ? 'success' : 'default'} label={origin === 'MOS' ? 'mOS' : 'Lịch sử'} />;
}

export function PostHubSourceContext({
  source,
  channel,
  origin,
  compact = false,
}: {
  source: SocialPostSourceContext;
  channel: string;
  origin: SocialPostOrigin;
  compact?: boolean;
}) {
  const platformTone: StatusType =
    source.platform === 'FACEBOOK' ? 'processing' : source.platform === 'TIKTOK' ? 'purple' : 'default';
  const destination = (
    <span className="truncate">
      {source.destinationLabel}
      {source.placement === 'GROUP' && !source.destinationIdentified && (
        <Tooltip title="Link chia sẻ chưa có tên hoặc ID nhóm. mOS không tự đoán tên nhóm.">
          <Text type="secondary" className="ml-1 text-xs">
            (chưa rõ tên)
          </Text>
        </Tooltip>
      )}
    </span>
  );

  if (compact) {
    return (
      <Text type="secondary" className="block text-xs truncate">
        {origin === 'MOS' ? 'mOS' : 'Lịch sử'} · {source.platformLabel} · {source.placementLabel} · {destination}
      </Text>
    );
  }

  return (
    <div className="min-w-0">
      <Space size={[4, 4]} wrap>
        <StatusTag status={platformTone} label={source.platformLabel} />
        <StatusTag status="default" label={source.placementLabel} />
        <PostHubOriginTag origin={origin} />
      </Space>
      <div className="mt-0.5 truncate font-medium">{destination}</div>
      <Text type="secondary" className="block truncate text-xs">
        Khai báo lúc nộp: {channel}
      </Text>
    </div>
  );
}
