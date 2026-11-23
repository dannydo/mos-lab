'use client';

import React from 'react';
import { Avatar, Select, Typography } from 'antd';
import dayjs from 'dayjs';
import { User } from 'lucide-react';
import { AppIcon, CopyPhoneButton, StatusTag } from '~/components/ui';
import { normalizeTicketSearchText } from './helpers';
import type { TicketDetailRecord, TicketStaffMember } from './types';

const { Text, Title } = Typography;

export interface TicketCustomerCardProps {
  activeTicket: TicketDetailRecord;
  staffList: TicketStaffMember[];
  changingAssignee: boolean;
  onAssigneeChange: (newStaffId: number) => void;
}

export function TicketCustomerCard({
  activeTicket,
  staffList,
  changingAssignee,
  onAssigneeChange,
}: TicketCustomerCardProps) {
  const phone = activeTicket.customerPhone || activeTicket.phone || '';
  const slaDate = activeTicket.slaDueDate || activeTicket.slaTime;

  return (
    <>
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          <Avatar icon={<AppIcon icon={User} size="sm" />} />
          <div>
            <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">
              {activeTicket.customerName || 'Khách hàng'}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 tabular-nums">
              <span>{phone || '-'}</span>
              {phone && <CopyPhoneButton phone={phone} size="xs" />}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-y-3 text-sm text-slate-700 dark:text-slate-200">
          <div>
            <Text type="secondary">Bộ phận:</Text>{' '}
            <StatusTag status="cyan" label={activeTicket.department || '-'} className="ml-1 font-medium" />
          </div>
          <div className="flex items-center gap-1">
            <Text type="secondary" className="shrink-0">
              Phụ trách:
            </Text>
            <Select
              showSearch
              size="small"
              className="w-[170px]"
              value={activeTicket.assignedCsStaffId ? Number(activeTicket.assignedCsStaffId) : undefined}
              placeholder="Chọn người phụ trách"
              loading={changingAssignee}
              onChange={onAssigneeChange}
              filterOption={(input, option) => {
                const staff = staffList.find((s) => Number(s.id) === Number(option?.value));
                if (!staff) return false;
                const name = staff.displayName || staff.name || '';
                const role = staff.role || '';
                return normalizeTicketSearchText(`${name} ${role} ${staff.id}`).includes(
                  normalizeTicketSearchText(input)
                );
              }}
              options={staffList.map((s) => ({
                value: Number(s.id),
                label: s.displayName || s.name || `NV #${s.id}`,
              }))}
            />
          </div>
          <div className="tabular-nums">
            <Text type="secondary">Ngày tạo:</Text>{' '}
            {activeTicket.createdAt ? dayjs(activeTicket.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
          </div>
          <div className="tabular-nums">
            <Text type="secondary">Hạn SLA:</Text>{' '}
            <span className="text-red-500 dark:text-red-400 font-medium">
              {slaDate ? dayjs(slaDate).format('DD/MM/YYYY HH:mm') : '-'}
            </span>
          </div>
        </div>
      </div>

      <div>
        <Title level={5}>Nội dung</Title>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-slate-900 dark:text-slate-100">
          {activeTicket.description || 'Không có nội dung mô tả.'}
        </div>
      </div>
    </>
  );
}
