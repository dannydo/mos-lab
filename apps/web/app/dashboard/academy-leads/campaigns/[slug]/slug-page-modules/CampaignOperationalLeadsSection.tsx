'use client';

import React from 'react';
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AcademyCampaign, AcademyCampaignLead, AcademyCampaignTouchpoint } from '@mos-lab/shared';
import { DataSection, DataTable } from '~/components/ui';
import type { AcademyTalentLead } from '../../../components/academy-talent-workshop.types';
import { campaignLeadMobileCard } from '../academy-campaign-detail.helpers';

export interface CampaignOperationalLeadsSectionProps {
  campaign: AcademyCampaign;
  memberships: AcademyCampaignLead[];
  columns: ColumnsType<AcademyCampaignLead>;
  total: number;
  page: number;
  pageSize: number;
  loadingLeads: boolean;
  error: string | null;
  canManageMembership: boolean;
  isTouchpointWritable: boolean;
  onRetry: () => void;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenTouchpoint: (lead: AcademyCampaignLead, touchpoint: AcademyCampaignTouchpoint) => void;
  onOpenTalent: (lead: AcademyTalentLead) => void;
}

export function CampaignOperationalLeadsSection({
  campaign,
  memberships,
  columns,
  total,
  page,
  pageSize,
  loadingLeads,
  error,
  canManageMembership,
  isTouchpointWritable,
  onRetry,
  onPageChange,
  onOpenTouchpoint,
  onOpenTalent,
}: CampaignOperationalLeadsSectionProps) {
  return (
    <DataSection
      title="Tệp lead vận hành"
      extra={
        <span className="tabular-nums text-xs opacity-70">
          {total.toLocaleString('vi-VN')} lead trong phạm vi quyền xem
        </span>
      }
      bodyPadding={0}
      state={loadingLeads ? 'loading' : error ? 'error' : memberships.length ? undefined : 'empty'}
      stateTitle={error ? 'Không tải được tệp lead' : 'Chưa có lead trong chiến dịch'}
      stateDescription={
        error ||
        (canManageMembership
          ? 'Thêm lead Academy để bắt đầu vận hành chiến dịch.'
          : 'Bạn chưa được giao lead thuộc chiến dịch này.')
      }
      stateExtra={error ? <Button onClick={onRetry}>Thử lại</Button> : undefined}
    >
      <DataTable<AcademyCampaignLead>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={memberships}
        stickyPrimaryColumn
        columnPriority={{
          lead: 'primary',
          status: 'primary',
          course: 'secondary',
          owner: 'secondary',
          scheduledAt: 'secondary',
          addedAt: 'tertiary',
          actions: 'primary',
          ...(campaign.touchpoints || []).reduce<Record<string, 'secondary'>>((result, touchpoint) => {
            result[`touchpoint-${touchpoint.id}`] = 'secondary';
            return result;
          }, {}),
        }}
        mobileRenderer={(membership) =>
          campaignLeadMobileCard(
            membership,
            onOpenTouchpoint,
            onOpenTalent,
            campaign.touchpoints || [],
            isTouchpointWritable
          )
        }
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (count, range) => `Hiển thị ${range[0]}-${range[1]} / ${count.toLocaleString('vi-VN')} lead`,
          onChange: onPageChange,
        }}
      />
    </DataSection>
  );
}
