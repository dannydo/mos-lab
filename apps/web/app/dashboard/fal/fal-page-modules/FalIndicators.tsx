'use client';

import React from 'react';
import { Avatar, Space, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Clock, Eye, HelpCircle, XCircle } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { ledgerEligibilityMeta, toWingsAvatarUrl } from './falPageHelpers';
import type { FalCase, TraceService } from './falPageTypes';

const { Text } = Typography;

export function CompactDateTime({ value }: { value?: string | null }) {
  if (!value) return <Text type="secondary">-</Text>;
  const date = dayjs(value);
  return (
    <div className="leading-tight tabular-nums">
      <div className="text-xs">{date.isValid() ? date.format('DD/MM/YY') : value.slice(0, 10)}</div>
      <Text type="secondary" className="text-[11px]">
        {date.isValid() ? date.format('HH:mm') : value.slice(11, 16)}
      </Text>
    </div>
  );
}

export function CompactPerson({
  name,
  avatar,
  secondary,
  onClick,
}: {
  name?: string | null;
  avatar?: string | null;
  secondary?: string | null;
  onClick?: () => void;
}) {
  const displayName = name || '-';
  const content = (
    <Space size={6} align={secondary ? 'start' : 'center'} className="max-w-full">
      <Avatar size={26} src={toWingsAvatarUrl(avatar)}>
        {displayName.slice(0, 1).toUpperCase() || '?'}
      </Avatar>
      <div className="min-w-0 leading-tight">
        <Tooltip title={displayName}>
          <div className="truncate text-xs font-medium">{displayName}</div>
        </Tooltip>
        {secondary ? (
          <Tooltip title={secondary}>
            <Text type="secondary" className="block truncate text-[10px] leading-4">
              {secondary}
            </Text>
          </Tooltip>
        ) : null}
      </div>
    </Space>
  );
  if (!onClick) return content;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mở hồ sơ khách ${displayName}`}
      className="group block max-w-full rounded-md border-0 bg-transparent p-0 text-left transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
    >
      {content}
    </button>
  );
}

export function CompactOrigin({ service, onClick }: { service: TraceService | null; onClick?: () => void }) {
  if (!service) {
    return (
      <Text type="secondary" className="text-xs">
        Chưa liên kết
      </Text>
    );
  }
  const displayName = service.cvName || 'Chưa gán CV';
  const meta = `${service.checkin ? dayjs(service.checkin).format('DD/MM HH:mm') : '-'} · ${service.serviceName || '-'}`;
  const content = (
    <Space size={6} align="center" className="max-w-full">
      <Avatar size={26} src={toWingsAvatarUrl(service.cvAvatar)}>
        {displayName.slice(0, 1).toUpperCase() || '?'}
      </Avatar>
      <div className="min-w-0 leading-tight">
        <Tooltip title={displayName}>
          <div className="truncate text-xs font-medium">{displayName}</div>
        </Tooltip>
        <Tooltip title={meta}>
          <Text type="secondary" className="block truncate text-[10px] leading-4">
            {meta}
          </Text>
        </Tooltip>
      </div>
    </Space>
  );
  if (!onClick) return content;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Mở Trace FAL cho ca gốc của ${displayName}`}
      className="block max-w-full rounded-md border-0 bg-transparent p-0 text-left transition-colors hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
    >
      {content}
    </button>
  );
}

export function CompactConsultant({
  inName,
  outName,
  inAvatar,
  outAvatar,
}: {
  inName?: string | null;
  outName?: string | null;
  inAvatar?: string | null;
  outAvatar?: string | null;
}) {
  const sameConsultant = inName === outName;
  const displayName = sameConsultant ? inName || '-' : `${inName || '-'} / ${outName || '-'}`;
  return (
    <Space size={6} align="center" className="max-w-full">
      {sameConsultant ? (
        <Avatar size={26} src={toWingsAvatarUrl(inAvatar)}>
          {displayName.slice(0, 1).toUpperCase() || '?'}
        </Avatar>
      ) : (
        <Avatar.Group size={22} max={{ count: 2 }}>
          <Avatar src={toWingsAvatarUrl(inAvatar)}>{inName?.slice(0, 1).toUpperCase() || '?'}</Avatar>
          <Avatar src={toWingsAvatarUrl(outAvatar)}>{outName?.slice(0, 1).toUpperCase() || '?'}</Avatar>
        </Avatar.Group>
      )}
      <Tooltip title={displayName}>
        <Text className="block truncate text-xs">{displayName}</Text>
      </Tooltip>
    </Space>
  );
}

export function TraceStaff({ name, avatar }: { name?: string | null; avatar?: string | null }) {
  const displayName = name || '-';
  return (
    <Space size={6} className="min-w-0">
      <Avatar size="small" src={toWingsAvatarUrl(avatar)}>
        {displayName.slice(0, 1).toUpperCase() || '?'}
      </Avatar>
      <Tooltip title={displayName}>
        <Text className="truncate">{displayName}</Text>
      </Tooltip>
    </Space>
  );
}

export function RotationIndicator({ record }: { record: FalCase }) {
  const priority = record.fal?.rotationPriority;
  if (priority?.status === 'CONSUMED') {
    return (
      <Tooltip title={`Tua đầu đã dùng cho đơn #${priority.consumedOrderId || '-'}`}>
        <span aria-label="Tua đầu đã dùng" className="fal-rotation-icon fal-rotation-consumed">
          <AppIcon icon={CheckCircle2} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (priority?.status === 'EXPIRED') {
    return (
      <Tooltip title="Tua đầu đã hết hiệu lực khi CV checkout hoặc kết thúc ngày vận hành.">
        <span aria-label="Tua đầu đã hết hiệu lực" className="fal-rotation-icon fal-rotation-final">
          <AppIcon icon={Clock} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (priority?.status === 'READY') {
    return (
      <Tooltip title="Tua đầu đã cấp — CV được ưu tiên nhận khách kế tiếp.">
        <span aria-label="Tua đầu đang chờ khách kế tiếp" className="fal-rotation-icon fal-rotation-head">
          <AppIcon icon={ArrowUp} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (record.fal?.rotationMode === 'HEAD') {
    return (
      <Tooltip title="Theo rule: ca 1–25 phút được tua đầu. Không có token lịch sử vì hệ thống không backfill thứ tự phân khách đã xảy ra.">
        <span aria-label="Theo rule là tua đầu" className="fal-rotation-icon fal-rotation-head">
          <AppIcon icon={ArrowUp} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (record.fal?.rotationMode === 'FINAL') {
    return (
      <Tooltip title="Tua cuối: ca trên 25 phút chạy luồng phân khách bình thường.">
        <span aria-label="Tua cuối" className="fal-rotation-icon fal-rotation-final">
          <AppIcon icon={ArrowDown} size={15} />
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title="Thiếu hoặc bằng 0 phút; chưa đủ điều kiện xác định tua CV.">
      <span aria-label="Chưa đủ dữ liệu tua" className="fal-rotation-icon fal-rotation-undetermined">
        <AppIcon icon={AlertCircle} size={15} />
      </span>
    </Tooltip>
  );
}

export function FinancialEligibilityIndicator({ record }: { record: FalCase }) {
  const meta = ledgerEligibilityMeta(record);
  const eligibility = record.fal?.financialEligibility;
  if (eligibility === 'READY' && record.falRule === 'Log' && record.logExplanation?.ledgerStatus !== 'APPLIED') {
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-processing">
          <AppIcon icon={Clock} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (eligibility === 'READY') {
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-ready">
          <AppIcon icon={CheckCircle2} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (eligibility === 'PENDING_LOG_APPROVAL') {
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-pending">
          <AppIcon icon={Clock} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (eligibility === 'REJECTED') {
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-rejected">
          <AppIcon icon={XCircle} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (eligibility === 'INVALID_DURATION') {
    return (
      <Tooltip title={meta.help}>
        <span aria-label={meta.label} className="fal-status-icon fal-status-pending">
          <AppIcon icon={AlertCircle} size={15} />
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip title={meta.help}>
      <span aria-label={meta.label} className="fal-status-icon fal-status-follow">
        <AppIcon icon={HelpCircle} size={15} />
      </span>
    </Tooltip>
  );
}

export function LogDecisionIndicator({ record }: { record: FalCase }) {
  if (record.falRule !== 'Log') {
    return (
      <Tooltip title="Fix/Adjust: theo dõi trách nhiệm FAL, không cần approval Log.">
        <span aria-label="Theo dõi FAL" className="fal-status-icon fal-status-follow">
          <AppIcon icon={Eye} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (record.logExplanation?.decisionStatus === 'APPROVED') {
    return (
      <Tooltip title="Log đã được duyệt giải trình.">
        <span aria-label="Log đã được duyệt" className="fal-status-icon fal-status-ready">
          <AppIcon icon={CheckCircle2} size={15} />
        </span>
      </Tooltip>
    );
  }
  if (record.logExplanation?.decisionStatus === 'REJECTED') {
    return (
      <Tooltip title="Log bị từ chối giải trình; không ghi điểm, tiền hoặc Chuối.">
        <span aria-label="Log bị từ chối" className="fal-status-icon fal-status-rejected">
          <AppIcon icon={XCircle} size={15} />
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip
      title={
        record.logExplanation?.explanation ? 'Đã có giải trình, đang chờ quản lý duyệt.' : 'CC chưa gửi giải trình Log.'
      }
    >
      <span aria-label="Log đang chờ giải trình hoặc duyệt" className="fal-status-icon fal-status-pending">
        <AppIcon icon={Clock} size={15} />
      </span>
    </Tooltip>
  );
}
