'use client';

import React from 'react';
import { Button, Calendar, Space, Tooltip, Typography } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import type { AcademyLeadCalendarEvent } from '@mos-lab/shared';
import { AppIcon, StatePanel, StatusTag } from '../../../../components/ui';

const { Text } = Typography;

type CalendarItem = {
  key: string;
  lead: AcademyLeadCalendarEvent;
  date: string;
  kind: 'TEST' | 'FLIGHT';
};

export interface AcademyTestCalendarProps {
  month: string;
  events: AcademyLeadCalendarEvent[];
  loading?: boolean;
  onMonthChange: (month: string) => void;
  onOpenLead: (leadId: number) => void;
}

function statusTone(status: AcademyLeadCalendarEvent['status']) {
  if (status === 'WON') return 'success' as const;
  if (status === 'TESTED') return 'purple' as const;
  if (status === 'SCHEDULED') return 'processing' as const;
  return 'default' as const;
}

function statusLabel(status: AcademyLeadCalendarEvent['status']) {
  return (
    {
      NEW: 'Mới',
      WARM: 'Đang tư vấn',
      SCHEDULED: 'Đã hẹn test',
      TESTED: 'Đã test',
      WON: 'Đã chốt',
      LOST: 'Không phù hợp',
    }[status] || status
  );
}

export function AcademyTestCalendar({ month, events, loading, onMonthChange, onOpenLead }: AcademyTestCalendarProps) {
  const calendarValue = React.useMemo(() => dayjs(`${month}-01`), [month]);
  const itemsByDate = React.useMemo(() => {
    const records = new Map<string, CalendarItem[]>();
    const add = (item: CalendarItem) => records.set(item.date, [...(records.get(item.date) || []), item]);
    events.forEach((lead) => {
      if (lead.scheduledAt) {
        add({
          key: `test-${lead.id}-${lead.scheduledAt}`,
          lead,
          date: dayjs(lead.scheduledAt).format('YYYY-MM-DD'),
          kind: 'TEST',
        });
      }
      if (lead.flightDate) {
        add({
          key: `flight-${lead.id}-${lead.flightDate}`,
          lead,
          date: dayjs(lead.flightDate).format('YYYY-MM-DD'),
          kind: 'FLIGHT',
        });
      }
    });
    return records;
  }, [events]);

  const goToMonth = (offset: number) => onMonthChange(calendarValue.add(offset, 'month').format('YYYY-MM'));
  const goToToday = () => onMonthChange(dayjs().format('YYYY-MM'));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]" aria-busy={loading}>
        <Calendar
          value={calendarValue}
          headerRender={() => (
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <Space size="small">
                <Button aria-label="Tháng trước" icon={<AppIcon icon={ChevronLeft} />} onClick={() => goToMonth(-1)} />
                <Text strong className="tabular-nums">
                  Tháng {calendarValue.format('MM/YYYY')}
                </Text>
                <Button aria-label="Tháng sau" icon={<AppIcon icon={ChevronRight} />} onClick={() => goToMonth(1)} />
              </Space>
              <Button onClick={goToToday}>Hôm nay</Button>
            </div>
          )}
          cellRender={(current, info) => {
            if (info.type !== 'date') return info.originNode;
            const items = itemsByDate.get(current.format('YYYY-MM-DD')) || [];
            return (
              <div className="flex min-h-14 flex-col gap-1 overflow-hidden px-1 pb-1">
                {items.slice(0, 2).map((item) => {
                  const time =
                    item.kind === 'TEST' && item.lead.scheduledAt ? dayjs(item.lead.scheduledAt).format('HH:mm') : '';
                  const label = item.kind === 'FLIGHT' ? `✈ ${item.lead.name}` : `${time} ${item.lead.name}`.trim();
                  const tooltip =
                    item.kind === 'FLIGHT'
                      ? `Lịch bay · ${item.lead.name}`
                      : `Lịch test · ${item.lead.name} · ${statusLabel(item.lead.status)}`;
                  return (
                    <Tooltip key={item.key} title={tooltip}>
                      <button
                        type="button"
                        onClick={() => onOpenLead(item.lead.id)}
                        className="w-full truncate rounded border border-inherit px-1 py-0.5 text-left text-xs hover:opacity-80"
                      >
                        {label}
                      </button>
                    </Tooltip>
                  );
                })}
                {items.length > 2 && (
                  <Text type="secondary" className="px-1 text-xs">
                    +{items.length - 2}
                  </Text>
                )}
              </div>
            );
          }}
        />
      </div>
      {!loading && events.length === 0 && (
        <StatePanel kind="empty" surface={false} title="Không có lịch test hoặc lịch bay trong tháng này" />
      )}
      <Space className="mt-3" size="small" wrap>
        <StatusTag status="processing" label="Lịch test" />
        <StatusTag status="error" label="Lịch bay" />
        <StatusTag status={statusTone('TESTED')} label="Đã test / chốt" />
      </Space>
    </div>
  );
}

export default AcademyTestCalendar;
