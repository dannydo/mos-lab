'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Tag, theme, Row, Col, Statistic, Button, Space, Progress, Tooltip, Input, Segmented } from 'antd';
import {
  DollarOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  GiftOutlined,
  CompressOutlined,
  ExpandOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  CcTipLeaderboardEntry,
  CcTipLeaderboardResponse,
  CcTipRecord,
  removeVietnameseTones,
  calculateFractionToday,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { formatCompactVND, formatStoreCode } from '../../../../lib/format-utils';
import CcAvatar from './CcAvatar';
import CcPeriodComparison from './CcPeriodComparison';
import { DataTable, MobileRecordList } from '~/components/ui';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';

const compactVndStatistic = (value: string | number | undefined) => formatCompactVND(Number(value || 0));

interface CcTipTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  comparisonMode?: 'month' | 'week' | 'day';
  onSelectConsultant?: (consultantName: string) => void;
}

export default function CcTipTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  comparisonMode = 'month',
  onSelectConsultant: parentOnSelectConsultant,
}: CcTipTabProps) {
  const { token } = theme.useToken();
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<CcTipLeaderboardEntry[]>([]);
  const [records, setRecords] = useState<CcTipRecord[]>([]);

  // Selected CC for Leaderboard -> Detail table drill-down
  const [selectedCcName, setSelectedCcName] = useState<string | null>(null);

  // Tip filter status: 'ALL' | 'TIPPED' | 'NO_TIP'
  const [tipFilter, setTipFilter] = useState<'ALL' | 'TIPPED' | 'NO_TIP'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  // Summary Metrics
  const [summary, setSummary] = useState<CcTipLeaderboardResponse['summary']>({
    totalCcTipBonus: 0,
    totalCustomerTip: 0,
    avgTipRatePercent: 0,
    totalTippedVisits: 0,
    totalVisits: 0,
  });

  // Sync external consultant filter if passed
  useEffect(() => {
    if (parentSelectedConsultant && parentSelectedConsultant !== 'ALL') {
      setSelectedCcName(parentSelectedConsultant);
    }
  }, [parentSelectedConsultant]);

  // Realtime shift Run-rate Elapsed Ratio & Forecasts for Tip Tab
  const elapsedRatioPercent = useMemo(() => {
    const now = dayjs();
    const currentHour = now.hour();
    const fractionToday = calculateFractionToday(currentHour);

    const start = dateRange ? dateRange[0] : dayjs().startOf('month');
    const end = dateRange ? dateRange[1] : dayjs().endOf('month');

    if (now.isBefore(start, 'day')) return 0.1;
    if (now.isAfter(end, 'day')) return 100;

    const totalDays = end.diff(start, 'day') + 1;
    const daysPassed = now.diff(start, 'day');
    const elapsedDays = daysPassed + fractionToday;
    const ratio = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
    return Math.round(ratio * 1000) / 10;
  }, [dateRange]);

  const isPastPeriod = elapsedRatioPercent >= 100;

  const projectedTotalCcTipBonus = useMemo(() => {
    const ratio = (elapsedRatioPercent || 100) / 100;
    return Math.round((summary.totalCcTipBonus || 0) / (ratio || 1));
  }, [summary.totalCcTipBonus, elapsedRatioPercent]);

  const projectedTotalCustomerTip = useMemo(() => {
    const ratio = (elapsedRatioPercent || 100) / 100;
    return Math.round((summary.totalCustomerTip || 0) / (ratio || 1));
  }, [summary.totalCustomerTip, elapsedRatioPercent]);

  const fetchTipData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const [lbRes, recRes] = await Promise.all([
        apiClient.kpi.getCcTipLeaderboard({
          dateFrom,
          dateTo,
          storeId: selectedStore,
          comparisonMode,
        }),
        apiClient.kpi.getCcTipRecords({
          dateFrom,
          dateTo,
          storeId: selectedStore,
          consultantId: selectedCcName || 'ALL',
          tipFilter: 'ALL', // Fetch all records to do local fast filtering
          limit: 3000,
        }),
      ]);

      if (lbRes && lbRes.leaderboard) {
        setLeaderboard(lbRes.leaderboard);
        setSummary(lbRes.summary);
      }

      if (recRes && recRes.data) {
        setRecords(recRes.data);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu thưởng Tip CC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTipData();
  }, [comparisonMode, dateRange, selectedStore, selectedCcName]);

  // Local Filtered Records for Detail Table
  const filteredRecords = records.filter((r) => {
    if (tipFilter === 'TIPPED' && r.tipStatus !== 'Tipped') return false;
    if (tipFilter === 'NO_TIP' && r.tipStatus !== 'No Tip') return false;

    if (searchText) {
      const q = removeVietnameseTones(searchText);
      return (
        removeVietnameseTones(r.clientName).includes(q) ||
        removeVietnameseTones(r.serviceName).includes(q) ||
        removeVietnameseTones(r.ccInName).includes(q) ||
        removeVietnameseTones(r.ccOutName).includes(q) ||
        removeVietnameseTones(r.consultantName).includes(q) ||
        r.checkinTime.includes(searchText)
      );
    }
    return true;
  });

  // Calculate local filtered totals
  const totalTippedCount = records.filter((r) => r.tipStatus === 'Tipped').length;
  const totalNoTipCount = records.length - totalTippedCount;

  // Leaderboard Columns
  const leaderboardColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '18px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '18px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '18px' }}>🥉</span>;
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: 'Tư vấn viên (CC)',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: CcTipLeaderboardEntry) => {
        const isSelected = selectedCcName === name;
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            onClick={() => setSelectedCcName(isSelected ? null : name)}
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
                      : 'hover:text-amber-700 dark:hover:text-amber-400'
                  }`}
                  style={{ color: isSelected ? undefined : token.colorText }}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  · {formatStoreCode(record.store)}
                </span>
                {isSelected && (
                  <Tag
                    color="gold"
                    icon={<CheckCircleOutlined />}
                    className="font-semibold text-[10px] m-0 py-0 px-1 whitespace-nowrap"
                  >
                    Đang lọc
                  </Tag>
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
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-blue-700 dark:text-blue-400 text-xs">👥 {val} lượt</span>
      ),
    },
    {
      title: 'Lượt Khách Tip & Tỷ Lệ',
      dataIndex: 'tippedVisits',
      key: 'tippedVisits',
      align: 'right' as const,
      render: (val: number, record: CcTipLeaderboardEntry) => (
        <Tooltip title={`Đã nhận tip từ ${val} / ${record.totalVisits} lượt khách (${record.tipRatePercent}%)`}>
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-cyan-700 dark:text-cyan-400 text-xs">🟢 {val} lượt tip</div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="tabular-nums text-[11px] text-slate-400 font-medium">
                Tỷ lệ tip: <strong className="text-emerald-700 dark:text-emerald-400">{record.tipRatePercent}%</strong>
              </span>
              <div className="w-10">
                <Progress
                  percent={record.tipRatePercent}
                  size="small"
                  aria-label={`Tỷ lệ tip ${record.tipRatePercent}%`}
                  strokeColor={record.tipRatePercent >= 40 ? token.colorSuccess : token.colorInfo}
                  showInfo={false}
                  className="m-0"
                />
              </div>
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Tổng Tip Khách Cho (100%)',
      dataIndex: 'totalCustomerTipAmount',
      key: 'totalCustomerTipAmount',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-sky-700 dark:text-sky-400 text-xs">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thưởng CC Tip (20%)',
      dataIndex: 'totalCcTipBonus',
      key: 'totalCcTipBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-sm">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
  ];

  // Detail Table Columns
  const detailColumns = [
    {
      title: 'Check-in',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      width: 108,
      render: (val: string) => {
        const checkin = dayjs(val);

        if (!checkin.isValid()) {
          return <span className="tabular-nums text-xs text-slate-400 font-medium">{val || '-'}</span>;
        }

        return (
          <span className="flex flex-col tabular-nums text-xs font-medium leading-5 text-slate-400 whitespace-nowrap">
            <span>{checkin.format('DD/MM/YYYY')}</span>
            <span>{checkin.format('HH:mm')}</span>
          </span>
        );
      },
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (val: string, record: CcTipRecord) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-semibold text-xs text-sky-700 dark:text-sky-400">
            {val || 'Khách Vãng Lai'}
          </span>
          <span className="text-[11px] font-medium leading-4 text-slate-400">{formatStoreCode(record.store)}</span>
        </span>
      ),
    },
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (val: string) => <span className="font-medium text-slate-600 dark:text-slate-300 text-xs">{val}</span>,
    },
    {
      title: 'CC In/Out',
      key: 'ccInOut',
      width: 176,
      render: (_: unknown, record: CcTipRecord) => {
        const ccInName = record.ccInName?.trim();
        const ccOutName = record.ccOutName?.trim();
        const isSameConsultant = Boolean(ccInName && ccOutName && ccInName === ccOutName);
        const renderConsultant = (name: string, avatar: string | null | undefined, variant: 'in' | 'out') => (
          <div className={`cc-in-out-row cc-in-out-row-${variant}`}>
            <CcAvatar name={name} src={avatar} size={20} className={variant === 'out' ? 'cc-in-out-avatar-out' : ''} />
            <span className="truncate">{name}</span>
          </div>
        );

        if (isSameConsultant) {
          return (
            <div className="cc-in-out-cell" title="CC In và CC Out là cùng một người">
              {renderConsultant(ccInName!, record.ccInAvatar, 'in')}
            </div>
          );
        }

        if (!ccInName && !ccOutName) return <span className="text-slate-500 text-xs">-</span>;

        return (
          <div className="cc-in-out-cell">
            {ccInName && renderConsultant(ccInName, record.ccInAvatar, 'in')}
            {ccOutName && renderConsultant(ccOutName, record.ccOutAvatar, 'out')}
          </div>
        );
      },
    },
    {
      title: '∑ Tip',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-sky-700 dark:text-sky-400 text-xs">
          {val > 0 ? `${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
    {
      title: '% CC Nhận',
      dataIndex: 'ccTipPercentage',
      key: 'ccTipPercentage',
      align: 'center' as const,
      width: 90,
      render: (val: number) => (
        <Tag color={val > 0 ? 'cyan' : 'default'} className="font-bold tabular-nums text-xs m-0 py-0 px-1.5">
          {val}%
        </Tag>
      ),
    },
    {
      title: 'Thành Tiền',
      dataIndex: 'ccTipAmount',
      key: 'ccTipAmount',
      align: 'right' as const,
      render: (val: number) => (
        <span
          className={`tabular-nums font-bold text-xs ${val > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500'}`}
        >
          {val > 0 ? `+${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
  ];

  const renderForecastSubtext = (projectedVal: number) => {
    if (isPastPeriod) {
      return (
        <Tooltip title="Dữ liệu tháng đã chốt (100% thời gian)">
          <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70">
            <span>Thực tế chốt tháng:</span>
            <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">
              {formatCompactVND(projectedVal)}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian tháng (Ca 09:00 - 21:00 + 2h buffer checkout)`}
      >
        <div className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help">
          <span role="img" aria-label="Dự kiến cuối tháng" className="shrink-0 text-sm leading-none">
            🔮
          </span>
          <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
            ~{formatCompactVND(projectedVal)}
          </span>
        </div>
      </Tooltip>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Management-only money metrics. Mobile starts directly with the CC leaderboard. */}
      <Row gutter={[16, 16]} className="cc-tip-summary-row">
        <Col sm={12}>
          <Card className="shadow-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent flex flex-col justify-between">
            <div>
              <Statistic
                title={
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    ∑ Thưởng CC Tip (20%)
                  </span>
                }
                value={summary.totalCcTipBonus}
                prefix={<GiftOutlined className="text-amber-500 mr-2" />}
                formatter={compactVndStatistic}
                valueStyle={{
                  color: token.colorWarning,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              />
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                Thực nhận 20% tiền tip từ khách hàng
              </div>
              <CcPeriodComparison
                comparison={summary.comparison}
                currentValue={summary.totalCcTipBonus}
                previousValue={summary.comparison?.totalCcTipBonus || 0}
                formatter={formatCompactVND}
              />
            </div>
            {renderForecastSubtext(projectedTotalCcTipBonus)}
          </Card>
        </Col>

        <Col sm={12}>
          <Card className="shadow-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent flex flex-col justify-between">
            <div>
              <Statistic
                title={<span className="text-xs font-semibold text-sky-700 dark:text-sky-400">∑ Tip</span>}
                value={summary.totalCustomerTip}
                prefix={<DollarOutlined className="text-purple-500 mr-2" />}
                formatter={compactVndStatistic}
                valueStyle={{
                  color: token.colorInfo,
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                }}
              />
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                Tổng số tiền tip khách hàng để lại
              </div>
              <CcPeriodComparison
                comparison={summary.comparison}
                currentValue={summary.totalCustomerTip}
                previousValue={summary.comparison?.totalCustomerTip || 0}
                formatter={formatCompactVND}
              />
            </div>
            {renderForecastSubtext(projectedTotalCustomerTip)}
          </Card>
        </Col>
      </Row>

      {/* Tip Leaderboard Card */}
      <Card
        className="full-bleed-card shadow-sm rounded-xl"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-amber-500 text-lg" />
            <span className="font-bold text-base">Bảng Xếp Hạng Báo Cáo CC Thưởng Tip - Tip Leaderboard</span>
          </div>
        }
        extra={
          selectedCcName && (
            <Button type="dashed" size="small" onClick={() => setSelectedCcName(null)} className="text-xs font-medium">
              Bỏ lọc: {selectedCcName}
            </Button>
          )
        }
      >
        {isMobile ? (
          <div className="p-3">
            <MobileRecordList
              records={leaderboard}
              loading={loading || parentLoading}
              getKey={(record) => String(record.consultantId)}
              getRecordClassName={(record) =>
                selectedCcName === record.displayName ? 'rounded-lg bg-amber-500/10 ring-1 ring-amber-400/60' : ''
              }
              emptyDescription="Chưa có dữ liệu xếp hạng CC Tip"
              renderRecord={(record) => {
                const isSelected = selectedCcName === record.displayName;
                const toggleSelection = () => {
                  const newName = isSelected ? null : record.displayName;
                  setSelectedCcName(newName);
                  parentOnSelectConsultant?.(newName || 'ALL');
                };
                return (
                  <button
                    type="button"
                    className="w-full min-w-0 text-left"
                    aria-pressed={isSelected}
                    onClick={toggleSelection}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">
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
                        <div className="truncate text-sm font-semibold" style={{ color: token.colorText }}>
                          {record.displayName}
                        </div>
                        <div className="text-xs text-slate-400">{formatStoreCode(record.store)}</div>
                      </div>
                      <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
                        {isSelected ? 'Đang lọc' : 'Xem'}
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Phục vụ</dt>
                        <dd className="truncate text-sm font-bold tabular-nums text-sky-700 dark:text-sky-400">
                          {record.totalVisits}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Tip</dt>
                        <dd className="truncate text-sm font-bold tabular-nums text-cyan-700 dark:text-cyan-400">
                          {record.tippedVisits} · {record.tipRatePercent}%
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Thưởng</dt>
                        <dd className="truncate text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          +{formatCompactVND(record.totalCcTipBonus || 0)}
                        </dd>
                      </div>
                    </dl>
                  </button>
                );
              }}
            />
          </div>
        ) : (
          <DataTable
            columns={leaderboardColumns}
            dataSource={leaderboard}
            rowKey="consultantId"
            loading={loading || parentLoading}
            pagination={false}
            size="middle"
            scroll={{ x: 900 }}
            className="tabular-nums"
            onRow={(record) => ({
              onClick: () => {
                const name = record.displayName;
                const newName = selectedCcName === name ? null : name;
                setSelectedCcName(newName);
                if (parentOnSelectConsultant) {
                  parentOnSelectConsultant(newName || 'ALL');
                }
              },
            })}
            rowClassName={(record) =>
              selectedCcName === record.displayName
                ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-bold cursor-pointer'
                : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }
          />
        )}
      </Card>

      {/* Detail Customer Tipped & Non-Tipped Serviced Table */}
      <Card
        className="full-bleed-card shadow-sm rounded-xl"
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-base">Chi tiết khách Tip</span>
            <Tooltip title="Theo dõi tip khách hàng và thưởng CC Tip 20% theo từng ca phục vụ">
              <InfoCircleOutlined className="text-slate-400" />
            </Tooltip>
            {selectedCcName && (
              <Tag color="gold" className="font-bold text-xs m-0 max-w-[180px] truncate">
                {selectedCcName}
              </Tag>
            )}
          </div>
        }
        extra={<span className="tip-detail-count tabular-nums">{filteredRecords.length} ca</span>}
      >
        <div className="tip-detail-toolbar">
          <Segmented
            options={[
              { label: `Tất cả (${records.length})`, value: 'ALL' },
              { label: `Có Tip (${totalTippedCount})`, value: 'TIPPED' },
              { label: `Không Tip (${totalNoTipCount})`, value: 'NO_TIP' },
            ]}
            value={tipFilter}
            onChange={(val) => setTipFilter(val as 'ALL' | 'TIPPED' | 'NO_TIP')}
            className="tip-detail-filter font-semibold text-xs"
          />

          <div className="tip-detail-toolbar-actions">
            <Input
              placeholder="Tìm khách hàng, dịch vụ..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="tip-detail-search"
              allowClear
            />

            <Tooltip title={isCompact ? 'Chuyển chế độ xem chuẩn' : 'Chuyển chế độ xem gọn'}>
              <Button
                aria-label={isCompact ? 'Chuyển chế độ xem chuẩn' : 'Chuyển chế độ xem gọn'}
                icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                onClick={() => setIsCompact(!isCompact)}
                className={`tip-detail-toolbar-icon ${isCompact ? 'text-amber-500 border-amber-500/50' : ''}`}
              />
            </Tooltip>

            <Tooltip title="Làm mới dữ liệu">
              <Button
                aria-label="Làm mới dữ liệu Tip"
                icon={<ReloadOutlined />}
                onClick={fetchTipData}
                loading={loading}
                className="tip-detail-toolbar-icon"
              />
            </Tooltip>
          </div>
        </div>
        <DataTable
          columns={detailColumns}
          dataSource={filteredRecords}
          rowKey="serviceId"
          loading={loading || parentLoading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: (total) => `Tổng cộng ${total} ca phục vụ`,
          }}
          size="small"
          scroll={{ x: 890 }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>
    </div>
  );
}
