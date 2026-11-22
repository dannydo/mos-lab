import type { BookerSalary, KPISummary, OutcomeBreakdown } from '@mos-lab/shared';
import { getPercent } from '~/lib/format-utils';

export type KpiRole = 'telesales' | 'oc';
export type KpiOverviewTone = 'neutral' | 'blue' | 'green' | 'primary' | 'purple';

export interface KpiOverviewCardItem {
  key: string;
  label: string;
  value: string | number | undefined;
  percent: number;
  subtitle: string;
  tone: KpiOverviewTone;
  showDollarIcon?: boolean;
  highlighted?: boolean;
  tabularNums?: boolean;
}

export interface CallOutcomeItem {
  key: keyof OutcomeBreakdown;
  label: string;
  value: number;
  dotClass: string;
  fillClass: string;
}

export interface CallOutcomeSegment extends CallOutcomeItem {
  x: number;
  width: number;
  percent: number;
}

export interface CallOutcomeBreakdownView {
  totalLogs: number;
  items: CallOutcomeItem[];
  segments: CallOutcomeSegment[];
}

export interface SalaryBreakdownRow {
  label: string;
  value: string;
  tone: 'default' | 'positive' | 'negative';
}

export interface SalaryBreakdownColumn {
  key: string;
  title: string;
  rows: SalaryBreakdownRow[];
}

const CALL_OUTCOME_META: ReadonlyArray<{
  key: keyof OutcomeBreakdown;
  label: string;
  dotClass: string;
  fillClass: string;
}> = [
  { key: 'BOOKED', label: 'Đặt Lịch (Booked)', dotClass: 'bg-emerald-500', fillClass: 'fill-emerald-500' },
  { key: 'CALL_BACK', label: 'Hẹn Gọi Lại', dotClass: 'bg-amber-400', fillClass: 'fill-amber-400' },
  { key: 'NO_ANSWER', label: 'Không Nhấc Máy', dotClass: 'bg-red-500', fillClass: 'fill-red-500' },
  { key: 'BUSY', label: 'Máy Bận', dotClass: 'bg-cyan-500', fillClass: 'fill-cyan-500' },
  { key: 'WRONG_NUMBER', label: 'Sai Số', dotClass: 'bg-rose-600', fillClass: 'fill-rose-600' },
  {
    key: 'OTHERS',
    label: 'Khác',
    dotClass: 'bg-neutral-400 dark:bg-neutral-500',
    fillClass: 'fill-neutral-400 dark:fill-neutral-500',
  },
];

export function formatKpiVnd(value?: number | null): string {
  return `${(value || 0).toLocaleString('vi-VN')}\u00A0đ`;
}

export function buildKpiOverviewCards(summary: KPISummary | null): KpiOverviewCardItem[] {
  const calledPercent = getPercent(summary?.totalCalled || 0, summary?.totalPlanned || 0);
  const answeredPercent = getPercent(summary?.totalAnswered || 0, summary?.totalCalled || 0);
  const bookedPercent = getPercent(summary?.totalBooked || 0, summary?.totalAnswered || 0);
  const checkinPercent = getPercent(summary?.totalCheckin || 0, summary?.totalBooked || 0);

  return [
    {
      key: 'planned',
      label: '∑ KẾ HOẠCH',
      value: summary?.totalPlanned,
      percent: 100,
      subtitle: 'Kế hoạch đã lên',
      tone: 'neutral',
    },
    {
      key: 'called',
      label: 'ĐÃ THỰC HIỆN',
      value: summary?.totalCalled,
      percent: calledPercent,
      subtitle: `Đạt: ${calledPercent}% kế hoạch`,
      tone: 'blue',
    },
    {
      key: 'answered',
      label: 'BẮT MÁY',
      value: `${answeredPercent}%`,
      percent: answeredPercent,
      subtitle: `${summary?.totalAnswered} cuộc bắt máy`,
      tone: 'green',
    },
    {
      key: 'booked',
      label: 'ĐẶT LỊCH (BOOKED)',
      value: `${bookedPercent}%`,
      percent: bookedPercent,
      subtitle: `${summary?.totalBooked} lịch hẹn thành công`,
      tone: 'primary',
    },
    {
      key: 'checkin',
      label: 'ĐẾN TIỆM (CHECKIN)',
      value: `${checkinPercent}%`,
      percent: checkinPercent,
      subtitle: `${summary?.totalCheckin} khách ghé tiệm`,
      tone: 'purple',
    },
    {
      key: 'earnings',
      label: 'THU NHẬP LIVE',
      value: formatKpiVnd(summary?.totalEarnings),
      percent: 100,
      subtitle: '∑ Thu nhập',
      tone: 'primary',
      showDollarIcon: true,
      highlighted: true,
      tabularNums: true,
    },
  ];
}

export function buildCallOutcomeBreakdown(breakdown: OutcomeBreakdown | null): CallOutcomeBreakdownView {
  if (!breakdown) {
    return { totalLogs: 0, items: [], segments: [] };
  }

  const totalLogs = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
  const items: CallOutcomeItem[] = CALL_OUTCOME_META.map((meta) => ({
    ...meta,
    value: breakdown[meta.key],
  }));

  if (totalLogs === 0) {
    return { totalLogs: 0, items, segments: [] };
  }

  let runningX = 0;
  const segments: CallOutcomeSegment[] = items
    .filter((item) => item.value > 0)
    .map((item) => {
      const width = (item.value / totalLogs) * 1000;
      const segment: CallOutcomeSegment = {
        ...item,
        x: runningX,
        width,
        percent: getPercent(item.value, totalLogs),
      };
      runningX += width;
      return segment;
    });

  return { totalLogs, items, segments };
}

export function buildSalaryPaystubColumns(salary: BookerSalary): SalaryBreakdownColumn[] {
  if (salary.role === 'oc') {
    return [
      {
        key: 'oc-base',
        title: 'LƯƠNG CƠ BẢN & CHIẾN DỊCH',
        rows: [
          { label: 'Lương cứng (Wage):', value: formatKpiVnd(salary.baseSalary), tone: 'default' },
          { label: 'Tổng số check-in:', value: `${salary.checkins || 0} khách`, tone: 'default' },
        ],
      },
      {
        key: 'oc-kpi',
        title: 'THƯỞNG DOANH SỐ & PHỤC VỤ',
        rows: [
          { label: 'Thưởng doanh số (Sales KPI):', value: `+${formatKpiVnd(salary.salesReward)}`, tone: 'positive' },
          {
            label: 'Thưởng phục vụ (Servicing KPI):',
            value: `+${formatKpiVnd(salary.servicingReward)}`,
            tone: 'positive',
          },
        ],
      },
      {
        key: 'oc-growth',
        title: 'THƯỞNG TĂNG TRƯỞNG & CỬA HÀNG',
        rows: [
          {
            label: 'Thưởng tăng trưởng (Growth):',
            value: `+${formatKpiVnd(salary.growthReward)}`,
            tone: 'positive',
          },
          {
            label: 'Thưởng phục vụ tiệm (Store):',
            value: `+${formatKpiVnd(salary.storeServicingReward)}`,
            tone: 'positive',
          },
        ],
      },
    ];
  }

  const missedBonus = salary.missedBonus || 0;
  return [
    {
      key: 'booker-base',
      title: 'LƯƠNG CỨNG & HOA HỒNG GỌI',
      rows: [
        { label: 'Lương cứng cơ bản (Based):', value: formatKpiVnd(salary.baseSalary), tone: 'default' },
        { label: 'Thưởng check-in (Client):', value: formatKpiVnd(salary.clientBonus), tone: 'default' },
      ],
    },
    {
      key: 'booker-milestone',
      title: 'THƯỞNG HIỆU SUẤT ĐẠT MỐC',
      rows: [
        {
          label: `Thưởng mốc check-in (${salary.doneCount || 0} khách):`,
          value: `+${formatKpiVnd(salary.doneBonus)}`,
          tone: 'positive',
        },
        {
          label: `Thưởng tỷ lệ lỡ (${Math.round((salary.missedRate || 0) * 100)}%):`,
          value: `${missedBonus >= 0 ? '+' : ''}${formatKpiVnd(missedBonus)}`,
          tone: missedBonus >= 0 ? 'positive' : 'negative',
        },
      ],
    },
    {
      key: 'booker-revenue',
      title: 'HOA HỒNG TIPS & DOANH THU',
      rows: [
        {
          label: `Thưởng Tips (7% trên ${formatKpiVnd(salary.totalTips)}):`,
          value: formatKpiVnd(salary.tipBonus),
          tone: 'default',
        },
        {
          label: `Thưởng doanh thu net (trên ${(salary.totalNetRev || 0).toLocaleString('vi-VN')} đ):`,
          value: formatKpiVnd(salary.revBonus),
          tone: 'default',
        },
      ],
    },
  ];
}
