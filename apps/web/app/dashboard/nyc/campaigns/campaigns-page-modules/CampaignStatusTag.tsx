'use client';

import React from 'react';
import { Archive, CircleCheck, Clock3, FileEdit, Flag, PauseCircle, Trash2 } from 'lucide-react';
import type { CampaignStatus } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { CAMPAIGN_STATUS_META_MAP, type CampaignStatusIconName } from './campaignManagementTypes';

function renderStatusIcon(iconName: CampaignStatusIconName): React.ReactNode {
  switch (iconName) {
    case 'draft':
      return <AppIcon icon={FileEdit} size={12} />;
    case 'scheduled':
      return <AppIcon icon={Clock3} size={12} />;
    case 'active':
      return <AppIcon icon={CircleCheck} size={12} />;
    case 'paused':
      return <AppIcon icon={PauseCircle} size={12} />;
    case 'completed':
      return <AppIcon icon={Flag} size={12} />;
    case 'archived':
      return <AppIcon icon={Archive} size={12} />;
    case 'deleted':
      return <AppIcon icon={Trash2} size={12} />;
    default:
      return null;
  }
}

export interface CampaignStatusTagProps {
  status: CampaignStatus;
}

export function CampaignStatusTag({ status }: CampaignStatusTagProps) {
  const meta = CAMPAIGN_STATUS_META_MAP[status];
  if (!meta) {
    return <StatusTag status="default" label={status} />;
  }

  return <StatusTag status={meta.status} icon={renderStatusIcon(meta.iconName)} label={meta.label} />;
}
