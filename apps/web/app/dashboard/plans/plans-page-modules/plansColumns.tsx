'use client';

import React from 'react';
import { Badge, Button, Checkbox, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Phone, Plus } from 'lucide-react';
import type { BucketType, CustomerWeeklyProgress } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton, StatusTag } from '~/components/ui';
import { WEEKDAY_NAMES, formatShortDate, isTodayDate, resolveCustomerDelayStatus } from './plansPageUtils';

const { Text } = Typography;

export interface BuildPlansColumnsParams {
  weekDays: Date[];
  openCallLog: (record: CustomerWeeklyProgress, dayDate: Date) => void;
  handleConfirmToggle: (planId: number, checked: boolean) => void | Promise<void>;
}

function renderBucketStatusTag(bucket: BucketType): React.ReactNode {
  if (bucket === 'COMBO_LIVE') {
    return <StatusTag status="success" label="LIVE" className="text-[10px]" />;
  }
  if (bucket === 'COMBO_DEAD') {
    return <StatusTag status="error" label="DEAD" className="text-[10px]" />;
  }
  return <StatusTag status="warning" label="SINGLE" className="text-[10px]" />;
}

function renderDaysSinceLastVisitCell(days: number | null, record: CustomerWeeklyProgress): React.ReactNode {
  const daysDisplay = (
    <span className="tabular-nums font-semibold">
      {days !== null && days !== undefined ? (
        `${days} ngày`
      ) : (
        <Text className="text-slate-500 dark:text-slate-400">Chưa từng đến</Text>
      )}
    </span>
  );

  const delayStatus = resolveCustomerDelayStatus(record.customer, days);

  if (delayStatus.kind === 'callback') {
    return (
      <div className="flex flex-col">
        {daysDisplay}
        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-300 tabular-nums">
          🕒 Hẹn gọi lại: {delayStatus.formattedDate}
        </span>
      </div>
    );
  }

  if (delayStatus.kind === 'booked') {
    return (
      <div className="flex flex-col">
        {daysDisplay}
        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
          📅 Booked: {delayStatus.formattedDate}
        </span>
      </div>
    );
  }

  if (delayStatus.kind === 'missed') {
    return (
      <div className="flex flex-col">
        {daysDisplay}
        <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 tabular-nums">
          ⚠️ Missed: {delayStatus.missedDays} ngày
        </span>
      </div>
    );
  }

  return daysDisplay;
}

export function buildPlansColumns({
  weekDays,
  openCallLog,
  handleConfirmToggle,
}: BuildPlansColumnsParams): ColumnsType<CustomerWeeklyProgress> {
  return [
    {
      title: 'Mã KH',
      dataIndex: ['customer', 'id'],
      key: 'id',
      width: 70,
      fixed: 'left' as const,
      render: (id: number) => <span className="tabular-nums text-[var(--mos-text-secondary)]">{id}</span>,
    },
    {
      title: 'Khách Hàng',
      dataIndex: ['customer', 'name'],
      key: 'name',
      width: 140,
      fixed: 'left' as const,
      render: (text: string, record: CustomerWeeklyProgress) => (
        <div>
          <div className="font-semibold text-[var(--mos-text)]">{text}</div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--mos-text-secondary)] tabular-nums">
            <span>{record.customer.phone}</span>
            {record.customer.phone && <CopyPhoneButton phone={record.customer.phone} size="xs" />}
          </div>
        </div>
      ),
    },
    {
      title: 'Nhóm',
      dataIndex: ['customer', 'bucket'],
      key: 'bucket',
      width: 100,
      render: (bucket: BucketType) => renderBucketStatusTag(bucket),
    },
    {
      title: 'Chưa tới tiệm (Ngày)',
      dataIndex: ['customer', 'daysSinceLastVisit'],
      key: 'daysSince',
      width: 180,
      render: (days: number | null, record: CustomerWeeklyProgress) => renderDaysSinceLastVisitCell(days, record),
    },
    ...weekDays.map((date, idx) => {
      const headerText = `${WEEKDAY_NAMES[idx]} (${formatShortDate(date)})`;
      const isTodayColumn = isTodayDate(date);

      return {
        title: (
          <span className={isTodayColumn ? 'font-semibold text-[var(--color-gold)]' : ''}>
            {headerText} {isTodayColumn && <Badge status="processing" />}
          </span>
        ),
        key: `day_${idx}`,
        width: 100,
        align: 'center' as const,
        className: isTodayColumn ? 'bg-today-column' : '',
        render: (_: unknown, record: CustomerWeeklyProgress) => {
          const activity = record.dailyActivities[idx];

          if (!activity) return null;

          return (
            <Space direction="vertical" size={2}>
              {activity.hasCheckin && (
                <Tooltip title={`Đã đến tiệm (Đơn #${activity.orderId})`}>
                  <StatusTag status="success" label="CK" className="m-0 px-2 font-bold" />
                </Tooltip>
              )}

              {activity.hasCall ? (
                <Tooltip
                  title={
                    <div>
                      <div>
                        <b>Kết quả:</b> {activity.callResult === 'ANSWERED' ? 'Có bắt máy' : 'Gọi nhỡ'}
                      </div>
                      {activity.callOutcome && (
                        <div>
                          <b>Chi tiết:</b> {activity.callOutcome}
                        </div>
                      )}
                      {activity.note && (
                        <div>
                          <b>Ghi chú:</b> {activity.note}
                        </div>
                      )}
                    </div>
                  }
                >
                  <Button
                    type="text"
                    shape="circle"
                    aria-label="Xem hoặc cập nhật lịch sử cuộc gọi"
                    icon={<AppIcon icon={Phone} size={14} />}
                    className={
                      activity.callResult === 'ANSWERED'
                        ? 'bg-slate-100 text-emerald-600 hover:text-emerald-500 dark:bg-slate-800 dark:text-emerald-400 dark:hover:text-emerald-300'
                        : 'bg-slate-100 text-rose-600 hover:text-rose-500 dark:bg-slate-800 dark:text-rose-400 dark:hover:text-rose-300'
                    }
                    onClick={() => openCallLog(record, date)}
                  />
                </Tooltip>
              ) : (
                isTodayColumn &&
                !record.isConfirmed && (
                  <Button
                    type="dashed"
                    shape="circle"
                    size="small"
                    aria-label="Ghi nhận cuộc gọi"
                    icon={<AppIcon icon={Plus} size={12} />}
                    onClick={() => openCallLog(record, date)}
                    className="border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                  />
                )
              )}
            </Space>
          );
        },
      };
    }),
    {
      title: 'Confirm',
      key: 'confirm',
      width: 80,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: unknown, record: CustomerWeeklyProgress) => {
        if (!record.planId) return null;
        return (
          <Tooltip
            title={
              record.isConfirmed
                ? `Đã chốt hẹn lúc ${new Date(record.confirmTime || '').toLocaleTimeString()}`
                : 'Chốt lịch hẹn'
            }
          >
            <Checkbox
              checked={record.isConfirmed}
              onChange={(e) => handleConfirmToggle(record.planId!, e.target.checked)}
              className="custom-gold-checkbox"
            />
          </Tooltip>
        );
      },
    },
  ];
}
