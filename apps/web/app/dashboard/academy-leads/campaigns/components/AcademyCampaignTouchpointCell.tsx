'use client';

import React from 'react';
import { Bell, Clock3, TriangleAlert } from 'lucide-react';
import dayjs from 'dayjs';
import type { AcademyCampaignLead, AcademyCampaignTouchpoint, AcademyCampaignTouchpointOutcome } from '@mos-lab/shared';
import { AppIcon } from '../../../../../components/ui';
import { ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_LABELS, getTouchpointOutcomeIcon } from './academy-campaign-utils';

type PendingTouchpointState = 'PENDING' | 'DUE' | 'OVERDUE';
type TouchpointVisualState = AcademyCampaignTouchpointOutcome | PendingTouchpointState;

export interface AcademyCampaignTouchpointCellProps {
  membership: AcademyCampaignLead;
  touchpoint: AcademyCampaignTouchpoint;
  runnable: boolean;
  onOpen: (membership: AcademyCampaignLead, touchpoint: AcademyCampaignTouchpoint) => void;
}

function getPendingState(
  membership: AcademyCampaignLead,
  touchpoint: AcademyCampaignTouchpoint
): {
  state: PendingTouchpointState;
  elapsedDays: number;
} {
  const enrolledAt = dayjs(membership.addedAt).startOf('day');
  const elapsedDays = Math.max(0, dayjs().startOf('day').diff(enrolledAt, 'day'));
  if (elapsedDays < touchpoint.daysMin) return { state: 'PENDING', elapsedDays };
  if (touchpoint.daysMax !== null && elapsedDays > touchpoint.daysMax) return { state: 'OVERDUE', elapsedDays };
  return { state: 'DUE', elapsedDays };
}

function formatIctDateTime(value: string | null | undefined) {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : null;
}

function touchpointWindow(touchpoint: AcademyCampaignTouchpoint) {
  if (touchpoint.daysMax === null) return `Từ D${touchpoint.daysMin}`;
  if (touchpoint.daysMax === touchpoint.daysMin) return `D${touchpoint.daysMin}`;
  return `D${touchpoint.daysMin}–D${touchpoint.daysMax}`;
}

/**
 * Academy-native counterpart of the compact Custom Campaign touchpoint pill.
 * Its table cell has no hover layer: the persistent header identifies the
 * cadence and a click opens the audited Academy drawer for all detail.
 */
export function AcademyCampaignTouchpointCell({
  membership,
  touchpoint,
  runnable,
  onOpen,
}: AcademyCampaignTouchpointCellProps) {
  const log = membership.touchpointLogs.find((item) => item.touchpointId === touchpoint.id) || null;
  const pending = getPendingState(membership, touchpoint);
  const visualState: TouchpointVisualState = log?.status || pending.state;
  const statusLabel = log?.status ? ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOME_LABELS[log.status] : null;
  const window = touchpointWindow(touchpoint);

  const statusDescription = (() => {
    if (log?.status) {
      const completedAt = formatIctDateTime(log.completedAt);
      const actor = log.completedBy?.displayName;
      return [statusLabel, completedAt && `Lúc ${completedAt}`, actor && `bởi ${actor}`].filter(Boolean).join(' · ');
    }
    if (visualState === 'PENDING')
      return `Chưa đến hạn ${window} · còn ${Math.max(0, touchpoint.daysMin - pending.elapsedDays)} ngày`;
    if (visualState === 'OVERDUE') return `Quá hạn ${window} · đã ${pending.elapsedDays} ngày trong chiến dịch`;
    return `Đến hạn ${window} · ${pending.elapsedDays} ngày trong chiến dịch`;
  })();

  const icon = (() => {
    if (log?.status) return getTouchpointOutcomeIcon(log.status);
    if (visualState === 'DUE') return <AppIcon icon={Bell} />;
    if (visualState === 'OVERDUE') return <AppIcon icon={TriangleAlert} />;
    return <AppIcon icon={Clock3} />;
  })();

  return (
    <button
      type="button"
      className={`academy-campaign-touchpoint-cell academy-campaign-touchpoint-cell--${visualState.toLowerCase()}`}
      disabled={!runnable}
      aria-label={`${touchpoint.label} của ${membership.lead.name}: ${statusDescription}${runnable ? '' : '. Chiến dịch đang tạm dừng hoặc đã kết thúc.'}`}
      onClick={() => onOpen(membership, touchpoint)}
    >
      {icon}
    </button>
  );
}

export default AcademyCampaignTouchpointCell;
