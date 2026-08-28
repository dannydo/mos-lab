'use client';

import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Alert, Card, Space, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { AnnualHolidayCalendarResponse, HolidayCalendarDay, HolidayCalendarOccasion } from '@mos-lab/shared';
import { DataSection, DataTable, MetricGrid } from '~/components/ui';

const { Text, Paragraph, Link } = Typography;

const statusMeta: Record<HolidayCalendarOccasion['status'], { label: string; color: string }> = {
  PAST: { label: 'Đã qua', color: 'default' },
  ONGOING: { label: 'Đang diễn ra', color: 'green' },
  UPCOMING: { label: 'Sắp tới', color: 'blue' },
};

const dayKindMeta: Record<HolidayCalendarDay['kind'], { label: string; color: string }> = {
  PAID_HOLIDAY: { label: 'Hưởng lương', color: 'red' },
  WEEKLY_REST: { label: 'Nghỉ tuần', color: 'default' },
  COMPENSATORY_REST: { label: 'Nghỉ bù', color: 'cyan' },
  SWAPPED_REST: { label: 'Hoán đổi', color: 'gold' },
};

const companyStatusMeta = {
  DRAFT: { label: 'HR đang chuẩn bị', color: 'gold' },
  PUBLISHED: { label: 'Roster đã công bố', color: 'blue' },
  PAYROLL_LOCKED: { label: 'Đã chốt kỳ', color: 'green' },
} as const;

const weekdays = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const fullDate = (value: string) => {
  const date = dayjs(value);
  return `${weekdays[date.day()]}, ${date.format('DD/MM/YYYY')}`;
};
const shortDate = (value: string) => dayjs(value).format('DD/MM');
const dateSpan = (row: HolidayCalendarOccasion) =>
  row.breakStartDate === row.breakEndDate
    ? fullDate(row.breakStartDate)
    : `${shortDate(row.breakStartDate)} – ${dayjs(row.breakEndDate).format('DD/MM/YYYY')}`;

function StatusTag({ row }: { row: HolidayCalendarOccasion }) {
  const meta = statusMeta[row.status];
  const label =
    row.status === 'UPCOMING' && row.daysUntil !== null
      ? row.daysUntil === 0
        ? 'Bắt đầu hôm nay'
        : `Còn ${row.daysUntil} ngày`
      : meta.label;
  return <Tag color={meta.color}>{label}</Tag>;
}

function CompanyPeriodTag({ row }: { row: HolidayCalendarOccasion }) {
  if (!row.companyPeriod) return <Tag>Chưa có kỳ Wings</Tag>;
  const meta = companyStatusMeta[row.companyPeriod.status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

function PaidDates({ row }: { row: HolidayCalendarOccasion }) {
  return (
    <Space size={[4, 4]} wrap>
      {row.days
        .filter((day) => day.isPaidLeave)
        .map((day) => (
          <Tag key={day.date} color={dayKindMeta[day.kind].color} className="tabular-nums">
            {shortDate(day.date)} · {day.label}
          </Tag>
        ))}
    </Space>
  );
}

function HolidayMobileCard({ row }: { row: HolidayCalendarOccasion }) {
  return (
    <Card size="small" className="w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">{row.name}</div>
          <Text type="secondary" className="text-xs tabular-nums">
            {dateSpan(row)}
          </Text>
        </div>
        <StatusTag row={row} />
      </div>
      <div className="mt-3">
        <PaidDates row={row} />
      </div>
      <div className="mt-3">
        <CompanyPeriodTag row={row} />
      </div>
      <Paragraph type="secondary" className="mb-0 mt-2 text-xs">
        {row.planningNote}
      </Paragraph>
    </Card>
  );
}

export interface HolidayCalendarSectionProps {
  data: AnnualHolidayCalendarResponse | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function HolidayCalendarSection({ data, loading, error, onRetry }: HolidayCalendarSectionProps) {
  const nextHoliday = data?.holidays.find((holiday) => holiday.code === data.nextHolidayCode) || null;
  const metrics = data
    ? [
        {
          key: 'occasions',
          title: 'Dịp nghỉ lễ trong năm',
          value: data.occasionCount,
          format: 'number' as const,
          icon: <CalendarOutlined />,
          subValue: `${data.year}`,
        },
        {
          key: 'paid-days',
          title: 'Ngày nghỉ hưởng lương',
          value: data.officialPaidLeaveDays,
          format: 'number' as const,
          icon: <SafetyCertificateOutlined />,
          subValue: 'Theo quy định năm 2026',
        },
        {
          key: 'remaining',
          title: 'Ngày lễ còn lại',
          value: data.remainingPaidLeaveDays,
          format: 'number' as const,
          icon: <CheckCircleOutlined />,
          subValue: `Tính đến ${dayjs(data.asOfDate).format('DD/MM/YYYY')}`,
        },
        {
          key: 'next',
          title: 'Kỳ gần nhất',
          value:
            nextHoliday?.daysUntil === 0
              ? 'Hôm nay'
              : nextHoliday?.daysUntil
                ? `${nextHoliday.daysUntil} ngày`
                : 'Đã hết',
          icon: <ClockCircleOutlined />,
          subValue: nextHoliday?.shortName || 'Không còn kỳ lễ',
        },
      ]
    : [];

  const columns: ColumnsType<HolidayCalendarOccasion> = [
    {
      title: 'Dịp lễ',
      key: 'holiday',
      width: 250,
      render: (_, row) => (
        <div>
          <div className="font-semibold">{row.name}</div>
          <Space size={4} wrap className="mt-1">
            <StatusTag row={row} />
            <Tag>{row.paidLeaveDays} ngày hưởng lương</Tag>
          </Space>
        </div>
      ),
    },
    {
      title: 'Lịch nghỉ tham chiếu',
      key: 'schedule',
      width: 220,
      render: (_, row) => (
        <div>
          <div className="tabular-nums">{dateSpan(row)}</div>
          {row.makeupWorkDates.length ? (
            <Text type="secondary" className="text-xs tabular-nums">
              Làm bù khối công chức: {row.makeupWorkDates.map(shortDate).join(', ')}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Ngày hưởng nguyên lương',
      key: 'paidDates',
      width: 360,
      render: (_, row) => <PaidDates row={row} />,
    },
    {
      title: 'Kế hoạch Wings',
      key: 'company',
      width: 190,
      render: (_, row) => (
        <div>
          <CompanyPeriodTag row={row} />
          {row.companyPeriod ? (
            <div>
              <Text type="secondary" className="text-xs">
                {row.companyPeriod.name}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Lưu ý để lên kế hoạch',
      dataIndex: 'planningNote',
      key: 'planningNote',
      width: 380,
      render: (value: string) => (
        <Paragraph className="mb-0 text-sm" ellipsis={{ rows: 3, expandable: true }}>
          {value}
        </Paragraph>
      ),
    },
  ];

  let state: 'loading' | 'empty' | 'error' | undefined;
  let stateTitle: string | undefined;
  if (loading && !data) {
    state = 'loading';
    stateTitle = 'Đang tải lịch nghỉ lễ…';
  } else if (error && !data) {
    state = 'error';
    stateTitle = 'Không thể tải lịch nghỉ lễ';
  } else if (!data?.holidays.length) {
    state = 'empty';
    stateTitle = 'Chưa có lịch nghỉ lễ';
  }

  const retry = onRetry ? <Typography.Link onClick={onRetry}>Thử lại</Typography.Link> : undefined;

  return (
    <Space direction="vertical" size={16} className="w-full">
      {data ? <MetricGrid items={metrics} columns={4} className="holiday-work-metric-grid" /> : null}
      {data ? (
        <Alert showIcon type="info" message="Lịch dành cho nhân sự lên kế hoạch" description={data.notice} />
      ) : null}
      <DataSection
        title={data ? `Lịch nghỉ lễ ${data.year}` : 'Lịch nghỉ lễ năm nay'}
        state={state}
        stateTitle={stateTitle}
        stateDescription={error || undefined}
        stateExtra={retry}
        stateMinHeight={260}
      >
        {data ? (
          <Space direction="vertical" size={16} className="w-full">
            <Text type="secondary">
              Các ngày nghỉ hưởng nguyên lương, ngày nghỉ bù và chuỗi nghỉ tham chiếu được tách rõ theo phạm vi áp dụng.
            </Text>
            <DataTable
              rowKey="code"
              columns={columns}
              dataSource={data.holidays}
              pagination={false}
              scroll={{ x: 1300 }}
              columnPriority={{
                holiday: 'primary',
                schedule: 'secondary',
                paidDates: 'secondary',
                company: 'tertiary',
                planningNote: 'tertiary',
              }}
              mobileRenderer={(row) => <HolidayMobileCard row={row} />}
            />
            <div>
              <Text strong>Nguồn chính thức</Text>
              <Space size={[12, 6]} wrap className="mt-2 w-full">
                {data.sources.map((source) => (
                  <Link key={source.id} href={source.url} target="_blank" rel="noreferrer">
                    <LinkOutlined /> {source.title}
                  </Link>
                ))}
              </Space>
            </div>
          </Space>
        ) : null}
      </DataSection>
    </Space>
  );
}

export default HolidayCalendarSection;
