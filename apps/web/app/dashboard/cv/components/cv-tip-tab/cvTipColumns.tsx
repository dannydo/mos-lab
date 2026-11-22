'use client';

import dayjs from 'dayjs';
import { Progress, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2 } from 'lucide-react';
import type { CvTipCustomerVisit, CvTipLeaderboardEntry, CvTipRecord } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { formatCompactVND } from '~/lib/format-utils';
import CcAvatar from '~/app/dashboard/cc/components/CcAvatar';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import { formatStoreCode, isCvLStaff, type CvTipForecast } from './cvTipUtils';

export function CvlRoleBadge() {
  return (
    <StatusTag
      status="gold"
      label={<CvFeather1Badge className="text-[10px]" featherClass="w-2.5 h-2.5 text-amber-500" />}
      className="font-bold text-[10px] py-0 px-1 border-amber-400"
    />
  );
}

export function renderRankCell(rank: number) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="tabular-nums font-semibold text-slate-500 dark:text-slate-400 text-xs">#{rank}</span>;
}

interface BuildCvTipLeaderboardColumnsParams {
  selectedCvName: string | null;
  forecast: CvTipForecast;
}

export function buildCvTipLeaderboardColumns({
  selectedCvName,
  forecast,
}: BuildCvTipLeaderboardColumnsParams): ColumnsType<CvTipLeaderboardEntry> {
  const { isDayMode, isPastPeriod, ratio } = forecast;

  return [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => renderRankCell(rank),
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: CvTipLeaderboardEntry) => {
        const isSelected = selectedCvName === name;
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={8}>
            <CcAvatar name={name} src={record.avatar} size={32} isSelected={isSelected} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'text-amber-600 dark:text-amber-400 underline underline-offset-2'
                      : 'text-slate-900 dark:text-slate-100 hover:text-amber-500 dark:hover:text-amber-400'
                  }`}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                  · {formatStoreCode(record.store)}
                </span>
                {isCvLStaff(name) && <CvlRoleBadge />}
                {isSelected && (
                  <StatusTag
                    status="gold"
                    icon={<CheckCircle2 className="w-3 h-3" />}
                    label="Đang lọc"
                    className="font-semibold text-[10px] py-0 px-1 whitespace-nowrap"
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
      align: 'right' as const,
      render: (val: number) => {
        const projected = Math.round((val || 0) / (ratio || 1));
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-blue-600 dark:text-blue-400 text-xs">👥 {val} lượt</span>
            {!isDayMode && !isPastPeriod && (
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
      align: 'right' as const,
      render: (val: number, record: CvTipLeaderboardEntry) => {
        const projected = Math.round((val || 0) / (ratio || 1));
        return (
          <Tooltip title={`Đã nhận tip từ ${val} / ${record.totalVisits} lượt khách (${record.tipRatePercent}%)`}>
            <div className="w-full text-right">
              <div className="tabular-nums font-semibold text-cyan-600 dark:text-cyan-400 text-xs">
                🟢 {val} lượt tip
              </div>
              {!isDayMode && !isPastPeriod && (
                <div className="tabular-nums text-[10px] text-cyan-600/80 dark:text-cyan-400/80">
                  🔮 ~{projected} lượt tip
                </div>
              )}
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="tabular-nums text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Tỷ lệ tip:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">{record.tipRatePercent}%</strong>
                </span>
                <div className="w-10">
                  <Progress
                    percent={record.tipRatePercent}
                    size="small"
                    strokeColor={record.tipRatePercent >= 40 ? 'rgb(82, 196, 26)' : 'rgb(24, 144, 255)'}
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
      align: 'right' as const,
      render: (val: number) => {
        const projected = Math.round((val || 0) / (ratio || 1));
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-purple-600 dark:text-purple-400 text-xs">
              {Math.round(val || 0).toLocaleString('vi-VN')}
              {'\u00a0'}đ
            </span>
            {!isDayMode && !isPastPeriod && (
              <span className="tabular-nums text-[10px] text-purple-600/80 dark:text-purple-400/80">
                🔮 ~{formatCompactVND(projected)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng CV Tip',
      dataIndex: 'totalCvTipBonus',
      key: 'totalCvTipBonus',
      align: 'right' as const,
      render: (val: number) => {
        const projected = Math.round((val || 0) / (ratio || 1));
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              +{Math.round(val || 0).toLocaleString('vi-VN')}
              {'\u00a0'}đ
            </span>
            {!isDayMode && !isPastPeriod && (
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

interface BuildCvTipRecordColumnsParams {
  onOpenCustomerHistory: (record: CvTipRecord) => void;
}

export function buildCvTipRecordColumns({
  onOpenCustomerHistory,
}: BuildCvTipRecordColumnsParams): ColumnsType<CvTipRecord> {
  return [
    {
      title: 'Check-in',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      width: 112,
      render: (val: string) => {
        const checkin = dayjs(val);
        if (!checkin.isValid()) {
          return <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400 font-medium">{val}</span>;
        }

        return (
          <div className="tabular-nums leading-4">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{checkin.format('DD/MM/YYYY')}</div>
            <div className="text-[11px] text-slate-500">{checkin.format('HH:mm')}</div>
          </div>
        );
      },
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'techName',
      key: 'techName',
      width: 148,
      render: (text: string, record: CvTipRecord) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <CcAvatar name={text} src={record.avatar} size={24} />
          <span className="font-semibold text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">{text}</span>
          {isCvLStaff(text) && <CvlRoleBadge />}
        </div>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 158,
      render: (val: string, record: CvTipRecord) => (
        <div className="flex min-w-0 flex-col items-start gap-0.5">
          <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
            <span className="truncate font-semibold text-xs text-sky-600 dark:text-sky-400">
              {val || 'Khách Vãng Lai'}
            </span>
            <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
              · {formatStoreCode(record.store)}
            </span>
          </div>
          {record.clientId > 0 && (
            <button
              type="button"
              onClick={() => onOpenCustomerHistory(record)}
              className="tabular-nums text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-label={`Xem ${record.clientTippedVisits || 0} trên ${record.clientTotalVisits || 0} lượt ghé của ${val || 'khách hàng'}`}
            >
              {record.clientTippedVisits || 0}/{record.clientTotalVisits || 0} lần tip
            </button>
          )}
        </div>
      ),
    },
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 170,
      render: (val: string) => <span className="font-medium text-slate-600 dark:text-slate-300 text-xs">{val}</span>,
    },
    {
      title: '∑ Tip',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      width: 130,
      render: (val: number, record: CvTipRecord) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums font-semibold text-purple-600 dark:text-purple-400 text-xs">
            {val > 0 ? `${val.toLocaleString('vi-VN')}\u00a0đ` : '0 đ'}
          </span>
          {record.tipStatus === 'Small Change' && (
            <StatusTag
              status="orange"
              label="Tiền lẻ < 20K"
              className="text-[10px] scale-90 origin-right py-0 leading-tight"
            />
          )}
          {record.tipStatus === 'Tipped' && (
            <StatusTag
              status="success"
              label="Tip ≥ 20K"
              className="text-[10px] scale-90 origin-right py-0 leading-tight"
            />
          )}
        </div>
      ),
    },
    {
      title: 'CV Share',
      dataIndex: 'cvTipAmount',
      key: 'cvTipAmount',
      align: 'right' as const,
      width: 130,
      render: (val: number) => (
        <span
          className={`tabular-nums font-bold text-xs ${
            val > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
          }`}
        >
          {val > 0 ? `+${val.toLocaleString('vi-VN')}\u00a0đ` : '0 đ'}
        </span>
      ),
    },
  ];
}

export function buildCvTipHistoryModalColumns({
  onOpenCustomerHistory,
}: BuildCvTipRecordColumnsParams): ColumnsType<CvTipRecord> {
  return [
    ...buildCvTipRecordColumns({ onOpenCustomerHistory }),
    {
      title: 'Trạng thái tip',
      dataIndex: 'tipStatus',
      key: 'tipStatus',
      width: 120,
      render: (status: CvTipRecord['tipStatus']) => (
        <StatusTag
          status={status === 'Tipped' ? 'success' : status === 'Small Change' ? 'orange' : 'default'}
          label={status === 'Tipped' ? 'Có tip (≥ 20K)' : status === 'Small Change' ? 'Tiền lẻ (< 20K)' : 'Không tip'}
        />
      ),
    },
  ];
}

export function buildCvTipCustomerHistoryColumns(): ColumnsType<CvTipCustomerVisit> {
  return [
    {
      title: 'Ngày ghé',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      width: 128,
      render: (value: string) => {
        const checkin = dayjs(value);
        return checkin.isValid() ? (
          <div className="tabular-nums leading-4">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{checkin.format('DD/MM/YYYY')}</div>
            <div className="text-[11px] text-slate-500">{checkin.format('HH:mm')}</div>
          </div>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">{value || '-'}</span>
        );
      },
    },
    {
      title: 'Bộ mi',
      dataIndex: 'lashSets',
      key: 'lashSets',
      width: 200,
      render: (value: string) => <span className="text-xs text-amber-600 dark:text-amber-400">{value || '-'}</span>,
    },
    {
      title: 'CV',
      dataIndex: 'cvNames',
      key: 'cvNames',
      width: 150,
      render: (value: string) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{value || '-'}</span>
      ),
    },
    {
      title: 'CC',
      key: 'consultants',
      width: 180,
      render: (_: unknown, record: CvTipCustomerVisit) => {
        const names = [record.ccInName, record.ccOutName].filter(Boolean);
        return (
          <span className="text-xs text-slate-600 dark:text-slate-300">{names.length ? names.join(' / ') : '-'}</span>
        );
      },
    },
    {
      title: 'BK',
      dataIndex: 'bookerName',
      key: 'bookerName',
      width: 150,
      render: (value: string) => <span className="text-xs text-slate-600 dark:text-slate-300">{value || '-'}</span>,
    },
    {
      title: '∑ Tip',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      width: 116,
      render: (value: number) => (
        <span className="tabular-nums text-xs font-semibold text-purple-600 dark:text-purple-400">
          {value > 0 ? `${value.toLocaleString('vi-VN')}\u00a0đ` : '0 đ'}
        </span>
      ),
    },
    {
      title: 'Tip',
      dataIndex: 'tipStatus',
      key: 'tipStatus',
      width: 100,
      render: (status: CvTipCustomerVisit['tipStatus']) => (
        <StatusTag
          status={status === 'Tipped' ? 'success' : status === 'Small Change' ? 'orange' : 'default'}
          label={status === 'Tipped' ? 'Có tip' : status === 'Small Change' ? 'Tiền lẻ' : 'Không tip'}
        />
      ),
    },
  ];
}
