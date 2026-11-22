'use client';

import React from 'react';
import { Button, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FileText, Pencil } from 'lucide-react';
import type { Appointment } from '@mos-lab/shared';
import CalendarPlusIcon from '~/components/icons/CalendarPlusIcon';
import { StatusTag } from '~/components/ui';
import {
  APPOINTMENT_ERROR_ACCENT,
  MISSED_FOLLOWUP_MAP,
  MISSED_REASON_MAP,
  MISSED_RESPONSIBILITY_MAP,
} from './constants';
import {
  CustomerDetailActionButton,
  buildAppointmentTimeColumn,
  buildBookerColumn,
  buildCustomerColumn,
  buildIndexColumn,
} from './sharedColumns';
import type { ColumnsOptions } from './types';

const { Text } = Typography;

export const getMissedColumns = ({
  openDetailModal,
  makeCall,
  setBookingInitialCustomer,
  setBookingWizardVisible,
  onOpenMissedReasonModal,
}: ColumnsOptions): ColumnsType<Appointment> => {
  return [
    buildIndexColumn(),
    buildCustomerColumn({
      openDetailModal,
      makeCall,
      accentColor: APPOINTMENT_ERROR_ACCENT,
    }),
    buildAppointmentTimeColumn('Thời Gian Hẹn'),
    {
      title: 'Dịch vụ chính',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (name: string) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{name || 'Khách chưa chọn'}</span>
      ),
    },
    buildBookerColumn(),
    {
      title: 'Lý do Missed & Ghi chú',
      key: 'missedReason',
      render: (record: Appointment) => {
        const log = record.missedLog;
        if (!log || !log.reasonCategory) {
          return (
            <Button
              type="dashed"
              danger
              size="small"
              icon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => onOpenMissedReasonModal && onOpenMissedReasonModal(record)}
            >
              + Ghi lý do
            </Button>
          );
        }

        const reasonInfo = MISSED_REASON_MAP[log.reasonCategory] || {
          label: log.reasonCategory,
          status: 'orange' as const,
        };

        return (
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onOpenMissedReasonModal && onOpenMissedReasonModal(record)}
          >
            <StatusTag status={reasonInfo.status} label={reasonInfo.label} className="font-semibold" />
            {log.note && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[180px] mt-0.5">{log.note}</div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Qui trách nhiệm',
      key: 'responsibility',
      render: (record: Appointment) => {
        const log = record.missedLog;
        if (!log || !log.responsibility) {
          return (
            <Text type="secondary" className="italic text-xs">
              -
            </Text>
          );
        }

        const respInfo = MISSED_RESPONSIBILITY_MAP[log.responsibility] || {
          label: log.responsibility,
          status: 'default' as const,
        };

        return <StatusTag status={respInfo.status} label={respInfo.label} />;
      },
    },
    {
      title: 'Follow-up',
      key: 'followUpStatus',
      render: (record: Appointment) => {
        const log = record.missedLog;
        const statusKey = log?.followUpStatus || 'PENDING';
        const fuInfo = MISSED_FOLLOWUP_MAP[statusKey] || { label: statusKey, status: 'default' as const };

        return <StatusTag status={fuInfo.status} label={fuInfo.label} />;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 170,
      render: (record: Appointment) => (
        <Space size="small">
          <Tooltip title="Ghi Lý do & Qui trách nhiệm">
            <Button
              type="text"
              shape="circle"
              aria-label="Ghi Lý do & Qui trách nhiệm"
              icon={<FileText className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
              onClick={() => onOpenMissedReasonModal && onOpenMissedReasonModal(record)}
            />
          </Tooltip>
          <CustomerDetailActionButton onOpen={() => openDetailModal(record.customerId)} />
          <Tooltip title="Đặt lại lịch mới">
            <Button
              type="primary"
              size="small"
              aria-label="Đặt lại lịch mới"
              icon={<CalendarPlusIcon fontSize={14} />}
              className="rounded-md"
              onClick={() => {
                if (setBookingInitialCustomer) {
                  setBookingInitialCustomer({
                    id: record.customerId,
                    fullName: record.customerName,
                    phoneNumber: record.customerPhone,
                    avatar: record.customerAvatar,
                  });
                }
                if (setBookingWizardVisible) {
                  setBookingWizardVisible(true);
                }
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];
};
