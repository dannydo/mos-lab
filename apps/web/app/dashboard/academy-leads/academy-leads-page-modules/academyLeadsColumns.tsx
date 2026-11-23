'use client';

import { Button, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, Flame } from 'lucide-react';
import type { AcademyFollowUpTask, AcademyLead } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton, CustomerIdentityCell, StatusTag } from '~/components/ui';
import { STATUS_LABELS, STATUS_TONES, dateLabel, hotLabel } from './academy-leads-utils';

const { Text } = Typography;

export function leadMobileCard(record: AcademyLead, onOpen: (lead: AcademyLead) => void) {
  const priorityLabel = hotLabel(record);

  return (
    <button
      type="button"
      className="w-full rounded-xl border border-inherit p-3 text-left"
      onClick={() => onOpen(record)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <strong>{record.name}</strong>
          <div className="mt-1 flex items-center gap-1 text-xs opacity-70">
            <span>{record.phone || 'Chưa có SĐT'}</span>
            {record.phone && <CopyPhoneButton phone={record.phone} size="xs" as="span" />}
            <span>· {record.owner?.displayName || 'Chưa giao'}</span>
          </div>
        </div>
        <StatusTag status={STATUS_TONES[record.status]} label={STATUS_LABELS[record.status]} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {record.course && <StatusTag status="purple" label={record.course} />}
        {priorityLabel && <StatusTag status="warning" label={priorityLabel} />}
      </div>
    </button>
  );
}

export function followUpMobileCard(task: AcademyFollowUpTask, onOpenLead: (lead: AcademyLead) => void) {
  return (
    <button
      type="button"
      className="w-full rounded-xl border border-inherit p-3 text-left"
      onClick={() => onOpenLead({ id: task.leadId } as AcademyLead)}
    >
      <div className="flex justify-between gap-2">
        <strong>{task.leadName || `Khách hàng #${task.leadId}`}</strong>
        <StatusTag
          status={task.status === 'DONE' ? 'success' : 'processing'}
          label={task.status === 'DONE' ? 'Xong' : 'Chờ'}
        />
      </div>
      <div className="mt-1 text-sm">{task.content}</div>
      <div className="mt-1 text-xs opacity-70">
        {dateLabel(task.dueAt)} · {task.assignee?.displayName || 'Chưa giao'}
      </div>
    </button>
  );
}

export function buildAcademyLeadColumns(onOpenLead: (lead: AcademyLead) => void): ColumnsType<AcademyLead> {
  return [
    {
      key: 'lead',
      title: 'Khách hàng',
      width: 240,
      render: (_, lead) => (
        <CustomerIdentityCell
          name={lead.name}
          phone={lead.phone}
          avatar={lead.avatarUrl}
          onOpen={() => onOpenLead(lead)}
        />
      ),
    },
    {
      key: 'status',
      title: 'Pipeline',
      width: 140,
      render: (_, lead) => <StatusTag status={STATUS_TONES[lead.status]} label={STATUS_LABELS[lead.status]} />,
    },
    {
      key: 'course',
      title: 'Khóa học / mục tiêu',
      width: 210,
      render: (_, lead) => (
        <div>
          <div>{lead.course || 'Chưa chọn khóa'}</div>
          {lead.goal && (
            <Text type="secondary" className="text-xs">
              {lead.goal}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'owner',
      title: 'Phụ trách',
      width: 150,
      render: (_, lead) => lead.owner?.displayName || lead.legacyOwnerEmail || 'Chưa giao',
    },
    {
      key: 'schedule',
      title: 'Lịch test',
      width: 155,
      render: (_, lead) => dateLabel(lead.scheduledAt),
    },
    {
      key: 'hot',
      title: 'Ưu tiên',
      width: 135,
      render: (_, lead) => {
        const label = hotLabel(lead);
        return label ? <StatusTag status="warning" icon={<AppIcon icon={Flame} size="sm" />} label={label} /> : '—';
      },
    },
    {
      key: 'updatedAt',
      title: 'Cập nhật',
      width: 145,
      render: (_, lead) => dateLabel(lead.updatedAt),
    },
  ];
}

export function buildAcademyFollowUpColumns(
  onCompleteFollowUp: (task: AcademyFollowUpTask) => Promise<void>
): ColumnsType<AcademyFollowUpTask> {
  return [
    {
      key: 'lead',
      title: 'Khách hàng',
      width: 180,
      render: (_, task) => task.leadName || `Khách hàng #${task.leadId}`,
    },
    {
      key: 'content',
      title: 'Việc cần làm',
      render: (_, task) => <Text delete={task.status === 'DONE'}>{task.content}</Text>,
    },
    { key: 'due', title: 'Hạn ICT', width: 155, render: (_, task) => dateLabel(task.dueAt) },
    {
      key: 'assignee',
      title: 'Phụ trách',
      width: 150,
      render: (_, task) => task.assignee?.displayName || 'Chưa giao',
    },
    {
      key: 'status',
      title: 'Trạng thái',
      width: 145,
      render: (_, task) => (
        <StatusTag
          status={task.status === 'DONE' ? 'success' : 'processing'}
          label={task.status === 'DONE' ? 'Hoàn thành' : 'Đang chờ'}
        />
      ),
    },
    {
      key: 'action',
      title: '',
      width: 115,
      render: (_, task) =>
        task.status === 'PENDING' ? (
          <Button type="link" icon={<AppIcon icon={CheckCircle2} />} onClick={() => void onCompleteFollowUp(task)}>
            Xong
          </Button>
        ) : null,
    },
  ];
}
