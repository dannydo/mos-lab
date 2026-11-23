'use client';

import { Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, Eye } from 'lucide-react';
import {
  DEFAULT_BK_REV_BONUS_TIERS,
  getRevCommissionRate,
  type BkRevenueLeaderboardEntry,
  type BkRevenueRecord,
} from '@mos-lab/shared';
import { TableIndexHeader } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import BkAvatar from '../BkAvatar';

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'HQ';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('HQ') || s.includes('HEAD')) return 'HQ';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

export const formatBkRevenueCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

interface BuildBkRevenueLeaderboardColumnsParams {
  selectedBookerId: string | null;
  ratio: number;
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  onSelectBooker: (bookerId: string, bookerName?: string) => void;
}

export function buildBkRevenueLeaderboardColumns({
  selectedBookerId,
  ratio,
  isDayMode,
  isPastPeriod,
  periodNoun,
  onSelectBooker,
}: BuildBkRevenueLeaderboardColumnsParams): ColumnsType<BkRevenueLeaderboardEntry> {
  return [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span className="text-lg">🥇</span>;
        if (rank === 2) return <span className="text-lg">🥈</span>;
        if (rank === 3) return <span className="text-lg">🥉</span>;
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: 'Booker',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: BkRevenueLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            size={8}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBooker(String(record.bookerId), name);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onSelectBooker(String(record.bookerId), name);
              }
            }}
          >
            <BkAvatar name={name} src={record.avatar} size={32} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'text-amber-400 underline underline-offset-2'
                      : 'text-slate-900 dark:text-slate-100 hover:text-amber-400'
                  }`}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  · {formatStoreCode(record.store)}
                </span>
                {isSelected && (
                  <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3" />
                    Đang lọc
                  </span>
                )}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Done',
      dataIndex: 'completedOrdersCount',
      key: 'completedOrdersCount',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-sky-400">{val}</span>,
    },
    {
      title: 'Doanh Thu (Lẻ / Combo)',
      key: 'revenueBreakdown',
      align: 'center' as const,
      render: (_: any, r: BkRevenueLeaderboardEntry) => {
        const singleRev = r.singleRevenue || 0;
        const comboRev = r.comboRevenue || 0;
        return (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <Tooltip title={`Doanh thu dịch vụ lẻ: ${formatBkRevenueCurrency(singleRev)}`}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 tabular-nums">
                <span className="text-[10px] uppercase font-semibold opacity-75">Lẻ</span>
                {formatBkRevenueCurrency(singleRev)}
              </span>
            </Tooltip>
            {comboRev > 0 && (
              <Tooltip title={`Doanh thu bán gói combo: ${formatBkRevenueCurrency(comboRev)}`}>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 tabular-nums">
                  <span className="text-[10px] uppercase font-semibold opacity-75">Combo</span>
                  {formatBkRevenueCurrency(comboRev)}
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: '∑ Doanh Thu Net',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right' as const,
      render: (val: number) => {
        const projRev = Math.round((val || 0) / (ratio || 1));
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-xs text-indigo-400">{formatBkRevenueCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && projRev > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-indigo-400/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(projRev)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '% Bonus',
      dataIndex: 'commissionRate',
      key: 'commissionRate',
      align: 'center' as const,
      render: (val: number, r: BkRevenueLeaderboardEntry) => {
        const projRev = Math.round((r.totalRevenue || 0) / (ratio || 1));
        const projRate = getRevCommissionRate(projRev, DEFAULT_BK_REV_BONUS_TIERS);
        return (
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              {val}%
            </span>
            {!isDayMode && !isPastPeriod && (
              <span className="text-[10px] text-purple-400/80 font-medium tabular-nums mt-0.5">🔮 {projRate}%</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Bonus Doanh Thu',
      dataIndex: 'totalCommissionBonus',
      key: 'totalCommissionBonus',
      align: 'right' as const,
      render: (val: number, r: BkRevenueLeaderboardEntry) => {
        const projRev = Math.round((r.totalRevenue || 0) / (ratio || 1));
        const projRate = getRevCommissionRate(projRev, DEFAULT_BK_REV_BONUS_TIERS);
        const projBonus = Math.round((projRev * projRate) / 100);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-sm text-purple-400">{formatBkRevenueCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && (
              <Tooltip
                title={
                  projBonus > 0
                    ? `Dự đoán doanh thu ~${formatBkRevenueCurrency(projRev)} (${projRate}%) → Thưởng: ~${formatBkRevenueCurrency(projBonus)}`
                    : `Dự đoán doanh thu ~${formatBkRevenueCurrency(projRev)} (chưa đạt mốc 50M → thưởng ~0 đ)`
                }
              >
                <div className="flex items-center gap-1 text-[11px] text-purple-400/80 font-medium tabular-nums cursor-help">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(projBonus)}</span>
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Chi tiết',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: BkRevenueLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Button
            type="default"
            size="small"
            icon={<Eye className="w-3.5 h-3.5 text-amber-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBooker(String(record.bookerId), record.displayName);
            }}
          >
            {isSelected ? 'Bỏ lọc' : 'Chi tiết'}
          </Button>
        );
      },
    },
  ];
}

export function buildBkRevenueDetailColumns(): ColumnsType<BkRevenueRecord> {
  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums text-xs text-slate-500 font-medium">{index + 1}</span>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (name: string, record: BkRevenueRecord) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <BkAvatar name={name || 'Khách hàng'} src={record.clientAvatar} size={28} />
          <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">{name || 'Khách hàng'}</span>
        </div>
      ),
    },
    {
      title: 'Thời Gian',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (dateStr: string) => (
        <span className="tabular-nums text-xs text-slate-400 font-medium whitespace-nowrap">
          {dateStr ? dateStr.replace('T', ' ').substring(0, 16) : '-'}
        </span>
      ),
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store',
      key: 'store',
      align: 'center' as const,
      render: (val: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {formatStoreCode(val)}</span>
      ),
    },
    {
      title: 'Loại Đơn',
      dataIndex: 'orderCategory',
      key: 'orderCategory',
      align: 'center' as const,
      render: (cat: string, r: BkRevenueRecord) => {
        const isCombo = r.isCombo || cat === 'COMBO';
        return isCombo ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 tabular-nums">
            Combo
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 tabular-nums">
            Lẻ
          </span>
        );
      },
    },
    {
      title: 'Doanh Thu Net',
      dataIndex: 'totalOrderPrice',
      key: 'totalOrderPrice',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-slate-600 dark:text-slate-300">
          {formatBkRevenueCurrency(val)}
        </span>
      ),
    },
  ];
}
