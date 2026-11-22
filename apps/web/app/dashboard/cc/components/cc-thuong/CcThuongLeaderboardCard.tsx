import React from 'react';
import { Card, Progress, Space, Tooltip, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, CircleDot, Filter, RefreshCw, Trophy, UsersRound } from 'lucide-react';
import { DailySalesBonusLeaderboardEntry, calculateWheelBonusCap } from '@mos-lab/shared';
import { formatCompactVND, formatStoreCode } from '~/lib/format-utils';
import { AppIcon, DataTable, MobileRecordList, StatusTag } from '~/components/ui';
import CcAvatar from '../CcAvatar';

interface CcThuongLeaderboardCardProps {
  isMobile: boolean;
  loading: boolean;
  leaderboardData: DailySalesBonusLeaderboardEntry[];
  selectedCcName: string | null;
  setSelectedCcName: (name: string | null) => void;
  parentOnSelectConsultant?: (consultantName: string) => void;
  isPastPeriod: boolean;
  isDayMode: boolean;
  periodNoun: string;
  ratio: number;
}

const formatVisitCount = (value: number) =>
  Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: 1,
  });

export const CcThuongLeaderboardCard: React.FC<CcThuongLeaderboardCardProps> = ({
  isMobile,
  loading,
  leaderboardData,
  selectedCcName,
  setSelectedCcName,
  parentOnSelectConsultant,
  isPastPeriod,
  isDayMode,
  periodNoun,
  ratio,
}) => {
  const { token } = theme.useToken();

  const leaderboardColumns: ColumnsType<DailySalesBonusLeaderboardEntry> = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center',
      render: (rank: number) => {
        if (rank === 1) return <span className="text-lg">🥇</span>;
        if (rank === 2) return <span className="text-lg">🥈</span>;
        if (rank === 3) return <span className="text-lg">🥉</span>;
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: 'CC',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: DailySalesBonusLeaderboardEntry) => {
        const isSelected = selectedCcName === name;
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={8}>
            <CcAvatar name={name} src={record.avatar} isSelected={isSelected} size={32} />
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
                  <StatusTag
                    status="gold"
                    icon={<AppIcon icon={CheckCircle2} size={12} aria-hidden />}
                    label="Đang lọc"
                    className="text-[10px] py-0 px-1 whitespace-nowrap"
                  />
                )}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Lượt Khách (Tổng / Vòng Xanh)',
      dataIndex: 'totalVisits',
      key: 'totalVisits',
      width: 170,
      align: 'right',
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Tổng lượt khách đã hoàn tất: ${formatVisitCount(val)} lượt | Vòng Xanh: booking được Legacy đánh dấu cần tư vấn combo: ${formatVisitCount(record.greenVisits)} lượt`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums inline-flex items-center justify-end gap-1 font-semibold text-blue-400 text-xs">
              <AppIcon icon={UsersRound} size="sm" aria-hidden />
              {formatVisitCount(val)} lượt
            </div>
            <div className="tabular-nums inline-flex items-center justify-end gap-1 text-[11px] text-emerald-400 font-medium mt-0.5">
              <AppIcon icon={CircleDot} size="sm" aria-hidden />
              {formatVisitCount(record.greenVisits)} Vòng Xanh
            </div>
            {!isPastPeriod && !isDayMode && ratio > 0 && ratio < 1 && (
              <div
                className="tabular-nums text-[10px] text-slate-400 font-medium mt-0.5"
                title={`Dự kiến cả ${periodNoun}`}
              >
                🔮 ~{formatVisitCount(Math.round(val / ratio))} lượt
              </div>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Combo Bán & Tỷ Lệ (Vòng Xanh)',
      dataIndex: 'comboSalesCount',
      key: 'comboSalesCount',
      width: 180,
      align: 'right',
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Tỷ lệ Combo trên Vòng Xanh: ${formatVisitCount(val)} combo / ${formatVisitCount(record.greenVisits)} lượt Vòng Xanh = ${record.greenComboConversionRate}%. Doanh số combo: ${Math.round(record.comboSales || 0).toLocaleString('vi-VN')} đ`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-blue-600 dark:text-blue-400 text-xs">{val} combo</div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="tabular-nums inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Tỷ lệ
                <Tooltip title="Vòng xanh">
                  <AppIcon
                    icon={RefreshCw}
                    size={12}
                    aria-label="Vòng xanh"
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                </Tooltip>
                : <strong className="text-emerald-600 dark:text-emerald-400">{record.greenComboConversionRate}%</strong>
              </span>
              <div className="w-10">
                <Progress
                  percent={record.greenComboConversionRate}
                  size="small"
                  strokeColor={record.greenComboConversionRate >= 15 ? token.colorSuccess : token.colorPrimary}
                  showInfo={false}
                  className="m-0"
                />
              </div>
            </div>
            {!isPastPeriod && !isDayMode && ratio > 0 && ratio < 1 && (
              <div
                className="tabular-nums text-[10px] text-slate-400 font-medium mt-0.5"
                title={`Dự kiến cả ${periodNoun}`}
              >
                🔮 ~{Math.round(val / ratio)} combo
              </div>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Doanh Thu Combo',
      dataIndex: 'comboSales',
      key: 'comboSales',
      width: 160,
      align: 'right',
      render: (val: number) => (
        <div className="w-full text-right">
          <div className="tabular-nums font-semibold text-sky-600 dark:text-sky-400 text-xs">
            {Math.round(val || 0).toLocaleString('vi-VN')} đ
          </div>
          {!isPastPeriod && !isDayMode && ratio > 0 && ratio < 1 && (
            <div
              className="tabular-nums text-[10px] text-slate-400 font-medium mt-0.5"
              title={`Dự kiến cả ${periodNoun}`}
            >
              🔮 ~{Math.round((val || 0) / ratio).toLocaleString('vi-VN')} đ
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'SP & Single (Tham Khảo)',
      dataIndex: 'productSalesCount',
      key: 'productSalesCount',
      width: 170,
      align: 'right',
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Đã bán ${val} Sản phẩm. Doanh số Single tham khảo: ${Math.round(record.singleSales || 0).toLocaleString('vi-VN')} đ`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-purple-600 dark:text-purple-400 text-xs">{val} SP</div>
            <div className="tabular-nums text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Single: {Math.round(record.singleSales || 0).toLocaleString('vi-VN')} đ
            </div>
            {!isPastPeriod && !isDayMode && ratio > 0 && ratio < 1 && (
              <div
                className="tabular-nums text-[10px] text-slate-400 font-medium mt-0.5"
                title={`Dự kiến cả ${periodNoun}`}
              >
                🔮 ~{Math.round(val / ratio)} SP
              </div>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Tổng Doanh Số Tính Thưởng',
      dataIndex: 'totalSales',
      key: 'totalSales',
      align: 'right',
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={
            record.debtCollected && record.debtCollected > 0
              ? `Combo: ${Math.round(record.comboSales || 0).toLocaleString('vi-VN')} đ • Thu nợ: ${Math.round(record.debtCollected).toLocaleString('vi-VN')} đ • SP: ${Math.round(val - (record.comboSales || 0) - (record.debtCollected || 0)).toLocaleString('vi-VN')} đ`
              : undefined
          }
        >
          <div className="w-full text-right cursor-help">
            <div className="tabular-nums font-bold text-amber-600 dark:text-amber-400 text-xs">
              {Math.round(val || 0).toLocaleString('vi-VN')} đ
            </div>
            {record.debtCollected && record.debtCollected > 0 ? (
              <div className="tabular-nums text-[10px] text-emerald-500 font-medium">
                Thu nợ: +{Math.round(record.debtCollected).toLocaleString('vi-VN')} đ
              </div>
            ) : null}
            {!isPastPeriod && !isDayMode && ratio > 0 && ratio < 1 && (
              <div
                className="tabular-nums text-[10px] text-slate-400 font-medium mt-0.5"
                title={`Dự kiến cả ${periodNoun}`}
              >
                🔮 ~{Math.round((val || 0) / ratio).toLocaleString('vi-VN')} đ
              </div>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng CC Bonus & Tiến Độ',
      dataIndex: 'totalBonus',
      key: 'totalBonus',
      width: 210,
      align: 'right',
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => {
        const capInfo = calculateWheelBonusCap(val, record.monthlyWheelBonus || 0);
        const isHardcapped = capInfo.capStatus === 'HARDCAPPED';
        const isWarning = capInfo.capStatus === 'WARNING';

        return (
          <Tooltip
            title={
              <div>
                <div className="font-bold text-amber-300">📊 TIẾN ĐỘ & HẠN MỨC THƯỞNG</div>
                <div className="text-xs mt-1">
                  • CC Daily Bonus tháng: <strong>{Math.round(val || 0).toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="text-xs">
                  • Hạn mức Vòng xoay tối đa (1.5x):{' '}
                  <strong className="text-emerald-300">{capInfo.maxWheelBonusAllowed.toLocaleString('vi-VN')} đ</strong>
                </div>
                {isHardcapped && (
                  <div className="text-xs text-rose-300 font-bold mt-1">⛔ ĐÃ ĐẠT TRẦN THƯỞNG VÒNG XOAY 1.5X</div>
                )}
                {isWarning && (
                  <div className="text-xs text-amber-300 font-bold mt-1">
                    ⚠️ SẮP CHẠM TRẦN ({capInfo.wheelCapPercent}%)
                  </div>
                )}
              </div>
            }
          >
            <div className="w-full text-right cursor-help">
              <div className="flex items-center justify-end gap-1.5">
                <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  +{Math.round(val || 0).toLocaleString('vi-VN')} đ
                </span>
                {isHardcapped && (
                  <StatusTag status="error" label="⛔ 1.5X" className="text-[10px] font-bold py-0 px-1" />
                )}
                {isWarning && (
                  <StatusTag
                    status="warning"
                    label={`⚠️ ${capInfo.wheelCapPercent}%`}
                    className="text-[10px] font-bold py-0 px-1"
                  />
                )}
              </div>
              {!isPastPeriod && !isDayMode && ratio > 0 && ratio < 1 && (
                <div
                  className="tabular-nums text-[10px] text-emerald-400/80 font-medium mt-0.5"
                  title={`Dự kiến cả ${periodNoun}`}
                >
                  🔮 ~{Math.round((val || 0) / ratio).toLocaleString('vi-VN')} đ
                </div>
              )}
              <Progress
                percent={record.targetCompletionRate}
                size="small"
                strokeColor={isHardcapped ? token.colorError : isWarning ? token.colorWarning : token.colorSuccess}
                className="m-0 mt-0.5"
              />
            </div>
          </Tooltip>
        );
      },
    },
  ];

  const toggleConsultantSelection = (displayName: string) => {
    const newCc = selectedCcName === displayName ? null : displayName;
    setSelectedCcName(newCc);
    parentOnSelectConsultant?.(newCc || 'ALL');
  };

  return (
    <Card
      title={
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <AppIcon icon={Trophy} size="md" className="text-amber-500" aria-hidden />
            <span className="font-bold text-base text-slate-900 dark:text-slate-100">CC Leaderboard</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <AppIcon icon={Filter} size={12} className="text-amber-500" aria-hidden />
            <span>💡 Mẹo: Click vào tên CC trên bảng để tự động lọc dữ liệu chi tiết bên dưới</span>
          </div>
        </div>
      }
      variant="outlined"
      styles={{ body: { padding: 0 } }}
      className="full-bleed-card shadow-sm rounded-xl"
    >
      {isMobile ? (
        <div className="p-3">
          <MobileRecordList
            records={leaderboardData}
            loading={loading}
            getKey={(record) => String(record.consultantId)}
            emptyDescription="Chưa có dữ liệu xếp hạng CC Thưởng"
            getRecordClassName={(record) =>
              selectedCcName === record.displayName ? 'rounded-lg bg-amber-500/10 ring-1 ring-amber-400/60' : ''
            }
            renderRecord={(record) => {
              const isSelected = selectedCcName === record.displayName;
              return (
                <button
                  type="button"
                  className="w-full min-w-0 text-left"
                  aria-pressed={isSelected}
                  onClick={() => toggleConsultantSelection(record.displayName)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                      {record.rank === 1
                        ? '🥇'
                        : record.rank === 2
                          ? '🥈'
                          : record.rank === 3
                            ? '🥉'
                            : `#${record.rank}`}
                    </span>
                    <CcAvatar name={record.displayName} src={record.avatar} isSelected={isSelected} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {record.displayName}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400">
                        <span>{formatStoreCode(record.store)} ·</span>
                        <span className="inline-flex items-center gap-0.5 tabular-nums text-sky-400">
                          <AppIcon icon={UsersRound} size="sm" aria-hidden />
                          {formatVisitCount(record.totalVisits)} lượt
                        </span>
                        <span className="inline-flex items-center gap-0.5 tabular-nums text-emerald-400">
                          <AppIcon icon={CircleDot} size="sm" aria-hidden />
                          {formatVisitCount(record.greenVisits)} Vòng Xanh
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-amber-400">{isSelected ? 'Đang lọc' : 'Xem'}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Combo</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-sky-400">{record.comboSalesCount}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Doanh số</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-amber-400">
                        {formatCompactVND(record.totalSales || 0)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thưởng</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-emerald-400">
                        +{formatCompactVND(record.totalBonus || 0)}
                      </dd>
                    </div>
                  </dl>
                </button>
              );
            }}
          />
        </div>
      ) : (
        <DataTable<DailySalesBonusLeaderboardEntry>
          dataSource={leaderboardData}
          columns={leaderboardColumns}
          rowKey="consultantId"
          size="small"
          pagination={false}
          loading={loading}
          scroll={{ x: 'max-content' }}
          className="antd-custom-table"
          locale={{ emptyText: 'Chưa có dữ liệu xếp hạng CC Thưởng' }}
          onRow={(record) => ({
            onClick: () => toggleConsultantSelection(record.displayName),
            className:
              selectedCcName === record.displayName
                ? 'cursor-pointer bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/15 transition-colors'
                : 'cursor-pointer hover:bg-amber-500/5 transition-colors',
          })}
        />
      )}
    </Card>
  );
};
