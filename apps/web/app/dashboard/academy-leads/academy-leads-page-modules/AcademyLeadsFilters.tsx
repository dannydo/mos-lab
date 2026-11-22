'use client';

import { Select, Space } from 'antd';
import { ACADEMY_LEAD_STATUSES, type AcademyLeadStatus, type AcademyStaffOption } from '@mos-lab/shared';
import type { AcademyWorkspaceTab } from '../hooks/useAcademySalesWorkspace';
import { STATUS_LABELS } from './academy-leads-utils';

export type AcademyHotViewFilter = 'PRIORITY' | 'HOT' | 'WARM' | 'WON_TODAY';
export type AcademyFollowUpBucketFilter = 'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'UNDATED';

export interface AcademyLeadsFiltersProps {
  activeTab: AcademyWorkspaceTab;
  status: AcademyLeadStatus | 'ALL';
  ownerStaffId: number | 'ALL' | 'UNASSIGNED';
  hotView: AcademyHotViewFilter;
  followUpBucket: AcademyFollowUpBucketFilter;
  staff: AcademyStaffOption[];
  onStatusChange: (next: AcademyLeadStatus | 'ALL') => void;
  onOwnerStaffIdChange: (next: number | 'ALL' | 'UNASSIGNED') => void;
  onHotViewChange: (next: AcademyHotViewFilter) => void;
  onFollowUpBucketChange: (next: AcademyFollowUpBucketFilter) => void;
}

export function AcademyLeadsFilters({
  activeTab,
  status,
  ownerStaffId,
  hotView,
  followUpBucket,
  staff,
  onStatusChange,
  onOwnerStaffIdChange,
  onHotViewChange,
  onFollowUpBucketChange,
}: AcademyLeadsFiltersProps) {
  const isFollowUps = activeTab === 'FOLLOW_UPS';

  return (
    <Space wrap>
      {!isFollowUps && (
        <>
          <Select
            value={status}
            onChange={onStatusChange}
            className="min-w-[152px]"
            options={[
              { value: 'ALL', label: 'Mọi trạng thái' },
              ...ACADEMY_LEAD_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
            ]}
          />
          <Select
            value={ownerStaffId}
            onChange={onOwnerStaffIdChange}
            className="min-w-[168px]"
            options={[
              { value: 'ALL', label: 'Mọi phụ trách' },
              { value: 'UNASSIGNED', label: 'Chưa giao' },
              ...staff.map((item) => ({ value: item.id, label: item.displayName })),
            ]}
          />
        </>
      )}
      {activeTab === 'HOT' && (
        <Select
          value={hotView}
          onChange={onHotViewChange}
          className="min-w-[150px]"
          options={[
            { value: 'PRIORITY', label: 'Tất cả ưu tiên' },
            { value: 'HOT', label: 'Hot < 72 giờ' },
            { value: 'WARM', label: 'Warm 72–168 giờ' },
            { value: 'WON_TODAY', label: 'Chốt hôm nay' },
          ]}
        />
      )}
      {isFollowUps && (
        <Select
          value={followUpBucket}
          onChange={onFollowUpBucketChange}
          className="min-w-[160px]"
          options={[
            { value: 'ALL', label: 'Mọi follow-up' },
            { value: 'OVERDUE', label: 'Quá hạn' },
            { value: 'TODAY', label: 'Hôm nay' },
            { value: 'UPCOMING', label: 'Sắp tới' },
            { value: 'UNDATED', label: 'Chưa có hạn' },
          ]}
        />
      )}
    </Space>
  );
}
