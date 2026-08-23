import React from 'react';
import { Button, Popconfirm, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Trophy } from 'lucide-react';
import type { AcademyCampaignLead, AcademyCampaignTouchpoint } from '@mos-lab/shared';
import { getIconComponent } from '../../../../../components/campaign/TouchpointIconPicker';
import { AppIcon, CustomerIdentityCell, StatusTag, TableIndexHeader } from '../../../../../components/ui';
import AcademyCampaignTouchpointCell from '../components/AcademyCampaignTouchpointCell';
import type { AcademyTalentLead } from '../../components/academy-talent-workshop.types';
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  formatIctDateTime,
  toAcademyTalentLead,
} from './academy-campaign-detail.helpers';

type CampaignLeadColumnsInput = {
  touchpoints: AcademyCampaignTouchpoint[];
  canManageMembership: boolean;
  touchpointWritable: boolean;
  page: number;
  pageSize: number;
  onOpenTalent: (lead: AcademyTalentLead) => void;
  onOpenTouchpoint: (lead: AcademyCampaignLead, touchpoint: AcademyCampaignTouchpoint) => void;
  onRemoveLead: (membership: AcademyCampaignLead) => Promise<void>;
};

export function useCampaignLeadColumns({
  touchpoints,
  canManageMembership,
  touchpointWritable,
  page,
  pageSize,
  onOpenTalent,
  onOpenTouchpoint,
  onRemoveLead,
}: CampaignLeadColumnsInput): ColumnsType<AcademyCampaignLead> {
  return React.useMemo(() => {
    const touchpointColumns: ColumnsType<AcademyCampaignLead> = touchpoints.map((touchpoint) => ({
      key: `touchpoint-${touchpoint.id}`,
      title: (
        <span className="academy-campaign-touchpoint-column-header" aria-label={touchpoint.label}>
          {getIconComponent(touchpoint.icon || undefined)}
          <span className="academy-campaign-touchpoint-column-label">{touchpoint.key.toUpperCase()}</span>
        </span>
      ),
      width: 64,
      align: 'center' as const,
      render: (_value, membership) => (
        <AcademyCampaignTouchpointCell
          membership={membership}
          touchpoint={touchpoint}
          runnable={touchpointWritable}
          onOpen={onOpenTouchpoint}
        />
      ),
    }));

    return [
      {
        key: 'stt',
        title: <TableIndexHeader />,
        width: 52,
        align: 'center',
        render: (_value, _membership, index) => (
          <span className="tabular-nums">{(page - 1) * pageSize + index + 1}</span>
        ),
      },
      {
        key: 'lead',
        title: 'Khách hàng',
        width: 240,
        render: (_value, membership) => (
          <CustomerIdentityCell
            name={membership.lead.name}
            phone={membership.lead.phone}
            avatar={membership.lead.avatarUrl}
          />
        ),
      },
      {
        key: 'status',
        title: 'Pipeline',
        width: 135,
        render: (_value, membership) => (
          <StatusTag
            status={LEAD_STATUS_TONES[membership.lead.status]}
            label={LEAD_STATUS_LABELS[membership.lead.status]}
          />
        ),
      },
      {
        key: 'course',
        title: 'Khóa học',
        width: 185,
        render: (_value, membership) => membership.lead.course || 'Chưa chọn khóa',
      },
      {
        key: 'owner',
        title: 'Phụ trách',
        width: 155,
        render: (_value, membership) => membership.lead.owner?.displayName || 'Chưa giao',
      },
      {
        key: 'scheduledAt',
        title: 'Lịch test',
        width: 160,
        render: (_value, membership) => formatIctDateTime(membership.lead.scheduledAt),
      },
      ...touchpointColumns,
      {
        key: 'addedAt',
        title: 'Vào tệp',
        width: 145,
        render: (_value, membership) => formatIctDateTime(membership.addedAt),
      },
      {
        key: 'actions',
        title: 'Tác vụ',
        width: canManageMembership ? 174 : 102,
        fixed: 'right' as const,
        render: (_value: unknown, membership: AcademyCampaignLead) => (
          <Space size={2}>
            <Button
              size="small"
              icon={<AppIcon icon={Trophy} />}
              onClick={() => void onOpenTalent(toAcademyTalentLead(membership.lead))}
            >
              Tố Chất
            </Button>
            {canManageMembership && (
              <Popconfirm
                title={`Gỡ ${membership.lead.name} khỏi tệp?`}
                description="Lịch sử điểm chạm vẫn được lưu để đối soát."
                okText="Gỡ lead"
                cancelText="Hủy"
                onConfirm={() => void onRemoveLead(membership)}
              >
                <Button size="small" danger type="text">
                  Gỡ
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ];
  }, [
    canManageMembership,
    onOpenTalent,
    onOpenTouchpoint,
    onRemoveLead,
    page,
    pageSize,
    touchpointWritable,
    touchpoints,
  ]);
}
