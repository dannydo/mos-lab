'use client';

import React from 'react';
import { Select, Space } from 'antd';
import type { AcademyLeadStatus, AcademyStaffOption } from '@mos-lab/shared';
import { type CampaignLeadQuery, LEAD_STATUS_LABELS } from '../academy-campaign-detail.helpers';

export interface CampaignLeadToolbarFiltersProps {
  status: CampaignLeadQuery['status'];
  ownerStaffId: CampaignLeadQuery['ownerStaffId'];
  staff: AcademyStaffOption[];
  onStatusChange: (status: CampaignLeadQuery['status']) => void;
  onOwnerStaffChange: (ownerStaffId: CampaignLeadQuery['ownerStaffId']) => void;
}

export function CampaignLeadToolbarFilters({
  status,
  ownerStaffId,
  staff,
  onStatusChange,
  onOwnerStaffChange,
}: CampaignLeadToolbarFiltersProps) {
  const statusOptions: Array<{ value: CampaignLeadQuery['status']; label: string }> = [
    { value: 'ALL', label: 'Mọi pipeline' },
    ...(Object.entries(LEAD_STATUS_LABELS) as Array<[AcademyLeadStatus, string]>).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  const ownerOptions: Array<{ value: CampaignLeadQuery['ownerStaffId']; label: string }> = [
    { value: 'ALL', label: 'Mọi phụ trách' },
    { value: 'UNASSIGNED', label: 'Chưa giao' },
    ...staff.map((item) => ({ value: item.id, label: item.displayName })),
  ];

  return (
    <Space wrap>
      <Select<CampaignLeadQuery['status']>
        value={status}
        aria-label="Lọc pipeline chiến dịch"
        className="w-[150px]"
        options={statusOptions}
        onChange={onStatusChange}
      />
      <Select<CampaignLeadQuery['ownerStaffId']>
        value={ownerStaffId}
        aria-label="Lọc phụ trách chiến dịch"
        className="w-[165px]"
        options={ownerOptions}
        onChange={onOwnerStaffChange}
      />
    </Space>
  );
}
