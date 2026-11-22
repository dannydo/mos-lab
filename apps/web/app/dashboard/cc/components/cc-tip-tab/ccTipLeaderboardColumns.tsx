'use client';

import React from 'react';
import { Progress, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2 } from 'lucide-react';
import type { CcTipLeaderboardEntry } from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import { formatCompactVND, formatStoreCode } from '~/lib/format-utils';
import CcAvatar from '../CcAvatar';
import { formatTipRankBadge, formatTipVnd, projectTipMetric } from './cc-tip-utils';

export interface BuildCcTipLeaderboardColumnsParams {
  selectedCcName: string | null;
  onSelectConsultant: (consultantName: string) => void;
  isDayMode: boolean;
  isPastPeriod: boolean;
  ratio: number;
  colorSuccess: string;
  colorInfo: string;
}

export function buildCcTipLeaderboardColumns({
  selectedCcName,
  onSelectConsultant,
  isDayMode,
  isPastPeriod,
  ratio,
  colorSuccess,
  colorInfo,
}: BuildCcTipLeaderboardColumnsParams): ColumnsType<CcTipLeaderboardEntry> {
  const showForecast = !isDayMode && !isPastPeriod;

  return [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank <= 3) {
          return <span className="text-lg leading-none">{formatTipRankBadge(rank)}</span>;
        }
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">{formatTipRankBadge(rank)}</span>;
      },
    },
    {
      title: 'Tư vấn viên (CC)',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 230,
      render: (name: string, record: CcTipLeaderboardEntry) => {
        const isSelected = selectedCcName === name;
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            onClick={(event) => {
              event.stopPropagation();
              onSelectConsultant(name);
            }}
            size={8}
            align="center"
          >
            <CcAvatar name={name} src={record.avatar} isSelected={isSelected} size={32} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'text-amber-700 dark:text-amber-400 underline underline-offset-2'
                      : 'text-slate-800 dark:text-slate-100 hover:text-amber-700 dark:hover:text-amber-400'
                  }`}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                  · {formatStoreCode(record.store)}
                </span>
                {isSelected && (
                  <StatusTag
                    status="gold"
                    icon={<AppIcon icon={CheckCircle2} size={11} />}
                    label="Đang lọc"
                    className="font-semibold text-[10px] m-0 py-0.5 px-1.5 whitespace-nowrap"
                  />
                )}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Lượt Khách Phục Vụ',
      dataIndex: 'totalVisits',
      key: 'totalVisits',
      width: 140,
      align: 'right' as const,
      render: (val: number) => {
        const projected = projectTipMetric(val, ratio);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-blue-700 dark:text-blue-400 text-xs">👥 {val} lượt</span>
            {showForecast && (
              <span className="tabular-nums text-[10px] text-slate-500 dark:text-slate-400">🔮 ~{projected} lượt</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Lượt Khách Tip & Tỷ Lệ',
      dataIndex: 'tippedVisits',
      key: 'tippedVisits',
      width: 185,
      align: 'right' as const,
      render: (val: number, record: CcTipLeaderboardEntry) => {
        const projected = projectTipMetric(val, ratio);
        return (
          <Tooltip title={`Đã nhận tip từ ${val} / ${record.totalVisits} lượt khách (${record.tipRatePercent}%)`}>
            <div className="w-full text-right">
              <div className="tabular-nums font-semibold text-cyan-700 dark:text-cyan-400 text-xs">
                🟢 {val} lượt tip
              </div>
              {showForecast && (
                <div className="tabular-nums text-[10px] text-cyan-600/80 dark:text-cyan-400/80">
                  🔮 ~{projected} lượt tip
                </div>
              )}
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="tabular-nums text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Tỷ lệ tip:{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">{record.tipRatePercent}%</strong>
                </span>
                <div className="w-10">
                  <Progress
                    percent={record.tipRatePercent}
                    size="small"
                    aria-label={`Tỷ lệ tip ${record.tipRatePercent}%`}
                    strokeColor={record.tipRatePercent >= 40 ? colorSuccess : colorInfo}
                    showInfo={false}
                    className="m-0"
                  />
                </div>
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Tổng Tip Khách Cho (100%)',
      dataIndex: 'totalCustomerTipAmount',
      key: 'totalCustomerTipAmount',
      width: 150,
      align: 'right' as const,
      render: (val: number) => {
        const projected = projectTipMetric(val, ratio);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-sky-700 dark:text-sky-400 text-xs">
              {formatTipVnd(val)}
            </span>
            {showForecast && (
              <span className="tabular-nums text-[10px] text-purple-600/80 dark:text-purple-400/80">
                🔮 ~{formatCompactVND(projected)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng CC Tip (20%)',
      dataIndex: 'totalCcTipBonus',
      key: 'totalCcTipBonus',
      width: 145,
      align: 'right' as const,
      render: (val: number) => {
        const projected = projectTipMetric(val, ratio);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-sm">
              +{formatTipVnd(val)}
            </span>
            {showForecast && (
              <span className="tabular-nums text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                🔮 ~{formatCompactVND(projected)}
              </span>
            )}
          </div>
        );
      },
    },
  ];
}
