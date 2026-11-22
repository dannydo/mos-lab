'use client';

import React from 'react';
import { Button, Space } from 'antd';
import { ArrowLeft, CirclePause, CirclePlay, Pencil, RefreshCw, UserRoundPlus } from 'lucide-react';
import type { AcademyCampaignStatus } from '@mos-lab/shared';
import { AppIcon, IconButton } from '~/components/ui';

export interface CampaignDetailHeaderActionsProps {
  campaignStatus: AcademyCampaignStatus;
  loadingLeads: boolean;
  canManageMembership: boolean;
  canConfigure: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpenLeadPicker: () => void;
  onUpdateLifecycle: (status: 'ACTIVE' | 'PAUSED') => void;
  onOpenConfig: () => void;
}

export function CampaignDetailHeaderActions({
  campaignStatus,
  loadingLeads,
  canManageMembership,
  canConfigure,
  onBack,
  onRefresh,
  onOpenLeadPicker,
  onUpdateLifecycle,
  onOpenConfig,
}: CampaignDetailHeaderActionsProps) {
  return (
    <Space>
      <IconButton label="Quay lại danh sách chiến dịch" icon={ArrowLeft} onClick={onBack} />
      <IconButton label="Làm mới dữ liệu" icon={RefreshCw} loading={loadingLeads} onClick={onRefresh} />
      {canManageMembership && (
        <Button icon={<AppIcon icon={UserRoundPlus} />} onClick={onOpenLeadPicker}>
          Thêm lead
        </Button>
      )}
      {canConfigure && ['DRAFT', 'SCHEDULED', 'PAUSED'].includes(campaignStatus) && (
        <Button type="primary" icon={<AppIcon icon={CirclePlay} />} onClick={() => onUpdateLifecycle('ACTIVE')}>
          Kích hoạt
        </Button>
      )}
      {canConfigure && campaignStatus === 'ACTIVE' && (
        <Button icon={<AppIcon icon={CirclePause} />} onClick={() => onUpdateLifecycle('PAUSED')}>
          Tạm dừng
        </Button>
      )}
      {canConfigure && (
        <Button icon={<AppIcon icon={Pencil} />} onClick={onOpenConfig}>
          Cấu hình
        </Button>
      )}
    </Space>
  );
}
