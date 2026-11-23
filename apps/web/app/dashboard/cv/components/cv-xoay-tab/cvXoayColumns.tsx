'use client';

import type { TableColumnType } from 'antd';
import { Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CvXoayRecord } from '@mos-lab/shared';
import { StatusTag, type StatusType } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import {
  calculateProjectedCvXoay,
  formatStoreCode,
  isCvLStaff,
  type CvLeaderboardRow,
  type CvXoayForecast,
} from './cvXoayUtils';

export function CvlRoleBadge() {
  return (
    <StatusTag
      status="gold"
      label={<CvFeather1Badge className="text-[10px]" featherClass="w-2.5 h-2.5 text-amber-500" />}
      className="font-bold text-[10px] py-0 px-1 border-amber-400"
    />
  );
}

interface BuildCvXoayLeaderboardColumnsParams {
  searchText: string;
  forecast: CvXoayForecast;
}

export function buildCvXoayLeaderboardColumns({
  searchText,
  forecast,
}: BuildCvXoayLeaderboardColumnsParams): ColumnsType<CvLeaderboardRow> {
  const { isDayMode, isMonthMode, isPastPeriod, ratio } = forecast;

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
      title: 'Chuyên Viên (CV)',
      dataIndex: 'techName',
      key: 'techName',
      render: (name: string, record: CvLeaderboardRow) => {
        const isSelected = searchText.toLowerCase() === name.toLowerCase();
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={8}>
            <CcAvatar name={name} src={record.avatar} size={32} isSelected={isSelected} />
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
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">L{record.techLevel}</span>
                {isCvLStaff(name) && <CvlRoleBadge />}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Bộ Mi',
      dataIndex: 'totalServices',
      key: 'totalServices',
      align: 'right' as const,
      render: (val: number) => {
        const projected = Math.round((val || 0) / (ratio || 1));
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-purple-600 dark:text-purple-400 text-xs">{val} Bộ</span>
            {!isDayMode && !isPastPeriod && (
              <span className="tabular-nums text-[10px] text-slate-500 dark:text-slate-400">🔮 ~{projected} Bộ</span>
            )}
          </div>
        );
      },
    },
    {
      title: '∑ Điểm Xoay',
      dataIndex: 'totalPoints',
      key: 'totalPoints',
      align: 'right' as const,
      render: (val: number) => {
        const projected = Math.round((val || 0) / (ratio || 1));
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400 text-xs">
              +{val.toLocaleString('vi-VN')} pts
            </span>
            {!isDayMode && !isPastPeriod && (
              <span className="tabular-nums text-[10px] text-emerald-600 dark:text-emerald-400/80">
                🔮 ~{projected.toLocaleString('vi-VN')} pts
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng Xoay',
      dataIndex: 'totalBonus',
      key: 'totalBonus',
      align: 'right' as const,
      render: (val: number, record: CvLeaderboardRow) => {
        const projected = isMonthMode ? calculateProjectedCvXoay(record.totalServices || 0, val || 0, ratio) : 0;
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {val.toLocaleString('vi-VN')}đ
            </span>
            {!isDayMode && !isPastPeriod && isMonthMode && projected > 0 && (
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

export function buildCvXoayDetailColumns(): TableColumnType<CvXoayRecord>[] {
  return [
    {
      title: 'Thời Gian Check-in',
      dataIndex: 'checkin',
      key: 'checkin',
      width: 140,
      render: (text: string) => <span className="tabular-nums text-xs text-slate-400 font-medium">{text}</span>,
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'techName',
      key: 'techName',
      width: 160,
      render: (text: string, record: CvXoayRecord) => (
        <Space size={6} className="whitespace-nowrap">
          <CcAvatar name={text} src={record.avatar} size={24} />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {text || 'N/A'}
            </span>
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">· L{record.techLevel}</span>
            {isCvLStaff(text) && <CvlRoleBadge />}
          </div>
        </Space>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 150,
      render: (text: string, record: CvXoayRecord) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          <span className="font-semibold text-xs text-sky-600 dark:text-sky-400">{text || 'Khách Vãng Lai'}</span>
          <span className="text-[11px] font-medium text-slate-500">· {formatStoreCode(record.store)}</span>
        </div>
      ),
    },
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 170,
      render: (text: string) => <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{text}</span>,
    },
    {
      title: 'FAL Rule',
      dataIndex: 'falRule',
      key: 'falRule',
      width: 80,
      render: (rule?: string, record?: CvXoayRecord) => {
        if (!rule) return <span className="text-slate-500 text-xs">-</span>;
        const fal = record?.fal;
        const status: StatusType =
          fal?.compensationMode === 'BLOCKED'
            ? 'default'
            : rule === 'Fix'
              ? 'error'
              : rule === 'Adjust'
                ? 'warning'
                : 'processing';

        return (
          <Tooltip
            title={
              fal
                ? `${fal.caseRole === 'ORIGIN' ? 'Ca gốc' : 'Ca xử lý'} · ${fal.totalMinutes ?? '?'} phút · ${fal.compensationMode}${fal.decisionStatus ? ` · ${fal.decisionStatus}` : ''}`
                : rule
            }
          >
            <StatusTag
              status={status}
              label={`${rule}${fal?.compensationMode === 'BLOCKED' ? ' · Chờ' : ''}`}
              className="font-semibold text-[10px] py-0 px-1"
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Bóc Tách Điểm (Class/Fan/Type/Lash/Design/Color)',
      key: 'pointBreakdown',
      width: 220,
      render: (_: unknown, record: CvXoayRecord) => (
        <div className="text-[10px] space-y-0.5 tabular-nums">
          <div className="flex gap-1 flex-wrap">
            {record.classPts > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded font-mono">
                Class +{record.classPts}
              </span>
            )}
            {record.fanPts > 0 && (
              <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded font-mono">
                Fan +{record.fanPts}
              </span>
            )}
            {record.typePts > 0 && (
              <span className="text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1 py-0.5 rounded font-mono">
                Type +{record.typePts}
              </span>
            )}
            {record.lashPts > 0 && (
              <span className="text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded font-mono">
                Lash +{record.lashPts}
              </span>
            )}
            {record.designPts > 0 && (
              <span className="text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded font-mono">
                Design +{record.designPts}
              </span>
            )}
            {record.colorPts > 0 && (
              <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded font-mono">
                Color +{record.colorPts}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Điểm Xoay',
      dataIndex: 'techPoints',
      key: 'techPoints',
      width: 100,
      align: 'right' as const,
      render: (pts: number) => (
        <span className="tabular-nums font-bold text-xs text-cyan-600 dark:text-cyan-400">
          +{pts.toLocaleString('vi-VN')} pts
        </span>
      ),
    },
    {
      title: '∑ Điểm Xoay',
      dataIndex: 'pointsAccu',
      key: 'pointsAccu',
      width: 110,
      align: 'right' as const,
      render: (accu: number) => (
        <span className="tabular-nums font-semibold text-xs text-blue-600 dark:text-blue-400">
          {accu.toLocaleString('vi-VN')} pts
        </span>
      ),
    },
    {
      title: 'Thưởng Xoay',
      dataIndex: 'techBonus',
      key: 'techBonus',
      width: 110,
      align: 'right' as const,
      render: (bonus: number) => (
        <span className="tabular-nums font-bold text-xs text-emerald-600 dark:text-emerald-400">
          {bonus.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
  ];
}
