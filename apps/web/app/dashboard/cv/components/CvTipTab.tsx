'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  theme,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Progress,
  Input,
  Segmented,
  Typography,
  Tooltip,
  Modal,
} from 'antd';
import {
  DollarOutlined,
  TrophyOutlined,
  SearchOutlined,
  ReloadOutlined,
  PercentageOutlined,
  GiftOutlined,
  CheckCircleOutlined,
  UserOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CvTipCustomerVisit, CvTipLeaderboardEntry, CvTipRecord, type ReportComparisonMode } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { formatCompactVND, formatVND } from '../../../../lib/format-utils';
import CcAvatar from '../../cc/components/CcAvatar';
import { MobileRecordList } from '~/components/ui';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { usePreviousReportPeriod } from '../../../../hooks/usePreviousReportPeriod';
import PeriodComparison from '../../../../components/ui/PeriodComparison';

const { Text } = Typography;

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'PXL';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

interface CvTipTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
  comparisonMode: ReportComparisonMode;
}

export default function CvTipTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  onSelectConsultant,
  comparisonMode,
}: CvTipTabProps) {
  const { token } = theme.useToken();
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<CvTipLeaderboardEntry[]>([]);
  const [records, setRecords] = useState<CvTipRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedCvName, setSelectedCvName] = useState<string | null>(null);
  const [tipFilter, setTipFilter] = useState<'ALL' | 'TIPPED' | 'NO_TIP'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [tipHistoryOpen, setTipHistoryOpen] = useState(false);
  const [tipHistoryLoading, setTipHistoryLoading] = useState(false);
  const [tipHistoryFilter, setTipHistoryFilter] = useState<'ALL' | 'TIPPED' | 'NO_TIP'>('ALL');
  const [tipHistoryRecords, setTipHistoryRecords] = useState<CvTipRecord[]>([]);
  const [customerHistoryOpen, setCustomerHistoryOpen] = useState(false);
  const [customerHistoryLoading, setCustomerHistoryLoading] = useState(false);
  const [customerHistoryName, setCustomerHistoryName] = useState('');
  const [customerHistoryRecords, setCustomerHistoryRecords] = useState<CvTipCustomerVisit[]>([]);
  const [customerHistoryFilter, setCustomerHistoryFilter] = useState<'ALL' | 'TIPPED' | 'NO_TIP'>('ALL');

  const [summary, setSummary] = useState({
    totalCvTipBonus: 0,
    totalCustomerTip: 0,
    avgTipRatePercent: 0,
    totalTippedVisits: 0,
    totalVisits: 0,
  });
  const [previousSummary, setPreviousSummary] = useState<{
    totalCvTipBonus: number;
    totalCustomerTip: number;
    avgTipRatePercent: number;
    totalTippedVisits: number;
    totalVisits: number;
  } | null>(null);

  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === 'undefined') return 20;
    const saved = Number(localStorage.getItem('cv_tip_page_size'));
    return [10, 20, 50, 100].includes(saved) ? saved : 20;
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    return Math.max(1, Number(localStorage.getItem('cv_tip_page')) || 1);
  });
  const deferredSearchText = React.useDeferredValue(searchText.trim());

  useEffect(() => {
    if (parentSelectedConsultant && parentSelectedConsultant !== 'ALL') {
      setSelectedCvName(parentSelectedConsultant);
      setCurrentPage(1);
    }
  }, [parentSelectedConsultant]);

  const handleSelectCv = React.useCallback(
    (nextCvName: string | null) => {
      setSelectedCvName(nextCvName);
      setCurrentPage(1);
      onSelectConsultant?.(nextCvName || 'ALL');
    },
    [onSelectConsultant]
  );

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const [lbRes, recRes, previousLbRes] = await Promise.all([
        apiClient.kpi.getCvTipLeaderboard({
          dateFrom,
          dateTo,
          storeId: selectedStore,
        }),
        apiClient.kpi.getCvTipRecords({
          dateFrom,
          dateTo,
          storeId: selectedStore,
          consultantId: selectedCvName || parentSelectedConsultant,
          tipFilter,
          page: currentPage,
          limit: pageSize,
          search: deferredSearchText || undefined,
          includeSummary: false,
        }),
        previousPeriod
          ? apiClient.kpi.getCvTipLeaderboard({
              ...previousPeriod.params,
              storeId: selectedStore,
            })
          : Promise.resolve(null),
      ]);

      if (lbRes) {
        setLeaderboard(lbRes.leaderboard || []);
        setSummary(
          lbRes.summary || {
            totalCvTipBonus: 0,
            totalCustomerTip: 0,
            avgTipRatePercent: 0,
            totalTippedVisits: 0,
            totalVisits: 0,
          }
        );
        setPreviousSummary(previousLbRes?.summary || null);
      }

      if (recRes) {
        setRecords(recRes.data || []);
        setTotalRecords(recRes.total || 0);
      }
    } catch (err) {
      console.error('Error fetching CV Tip data:', err);
    } finally {
      setLoading(false);
    }
  }, [
    dateRange,
    previousPeriod,
    selectedStore,
    selectedCvName,
    parentSelectedConsultant,
    tipFilter,
    currentPage,
    pageSize,
    deferredSearchText,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openTipHistory = React.useCallback(async () => {
    setTipHistoryOpen(true);
    setTipHistoryFilter('ALL');
    setTipHistoryLoading(true);

    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');
      const response = await apiClient.kpi.getCvTipRecords({
        dateFrom,
        dateTo,
        storeId: selectedStore,
        consultantId: selectedCvName || parentSelectedConsultant,
        tipFilter: 'ALL',
        page: 1,
        limit: 3000,
        includeSummary: false,
      });
      setTipHistoryRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching CV Tip history:', error);
      setTipHistoryRecords([]);
    } finally {
      setTipHistoryLoading(false);
    }
  }, [dateRange, parentSelectedConsultant, selectedCvName, selectedStore]);

  const openCustomerHistory = React.useCallback(async (record: CvTipRecord) => {
    if (!record.clientId) return;

    setCustomerHistoryName(record.clientName || 'Khách hàng');
    setCustomerHistoryOpen(true);
    setCustomerHistoryFilter('ALL');
    setCustomerHistoryLoading(true);

    try {
      const response = await apiClient.kpi.getCvTipCustomerHistory({ clientId: record.clientId });
      setCustomerHistoryRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching CV tip customer history:', error);
      setCustomerHistoryRecords([]);
    } finally {
      setCustomerHistoryLoading(false);
    }
  }, []);

  const visibleTipHistoryRecords = React.useMemo(() => {
    if (tipHistoryFilter === 'TIPPED') return tipHistoryRecords.filter((record) => record.tipStatus === 'Tipped');
    if (tipHistoryFilter === 'NO_TIP') return tipHistoryRecords.filter((record) => record.tipStatus === 'No Tip');
    return tipHistoryRecords;
  }, [tipHistoryFilter, tipHistoryRecords]);

  const visibleCustomerHistoryRecords = React.useMemo(() => {
    if (customerHistoryFilter === 'TIPPED')
      return customerHistoryRecords.filter((record) => record.tipStatus === 'Tipped');
    if (customerHistoryFilter === 'NO_TIP')
      return customerHistoryRecords.filter((record) => record.tipStatus === 'No Tip');
    return customerHistoryRecords;
  }, [customerHistoryFilter, customerHistoryRecords]);

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
      title: 'Chuyên Viên (CV)',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: CvTipLeaderboardEntry) => {
        const isSelected = selectedCvName === name;
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            size={8}
            onClick={() => {
              const newName = isSelected ? null : name;
              handleSelectCv(newName);
            }}
          >
            <CcAvatar name={name} src={record.avatar} size={32} isSelected={isSelected} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected ? 'text-amber-400 underline underline-offset-2' : 'hover:text-amber-400'
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
      render: (val: number) => <span className="tabular-nums font-semibold text-blue-400 text-xs">👥 {val} lượt</span>,
    },
    {
      title: 'Lượt Khách Tip & Tỷ Lệ',
      dataIndex: 'tippedVisits',
      key: 'tippedVisits',
      align: 'right' as const,
      render: (val: number, record: CvTipLeaderboardEntry) => (
        <Tooltip title={`Đã nhận tip từ ${val} / ${record.totalVisits} lượt khách (${record.tipRatePercent}%)`}>
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-cyan-400 text-xs">🟢 {val} lượt tip</div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="tabular-nums text-[11px] text-slate-400 font-medium">
                Tỷ lệ tip: <strong className="text-emerald-400">{record.tipRatePercent}%</strong>
              </span>
              <div className="w-10">
                <Progress
                  percent={record.tipRatePercent}
                  size="small"
                  strokeColor={record.tipRatePercent >= 40 ? '#52c41a' : '#1890ff'}
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
        <span className="tabular-nums font-semibold text-purple-400 text-xs">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thưởng CV Tip',
      dataIndex: 'totalCvTipBonus',
      key: 'totalCvTipBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-400 text-sm">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
  ];

  const recordColumns = [
    {
      title: 'Check-in',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      width: 112,
      render: (val: string) => {
        const checkin = dayjs(val);
        if (!checkin.isValid()) {
          return <span className="tabular-nums text-xs text-slate-400 font-medium">{val}</span>;
        }

        return (
          <div className="tabular-nums leading-4">
            <div className="text-xs font-medium text-slate-300">{checkin.format('DD/MM/YYYY')}</div>
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
          <span className="font-semibold text-xs text-amber-400 whitespace-nowrap">{text}</span>
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
            <span className="truncate font-semibold text-xs text-sky-400">{val || 'Khách Vãng Lai'}</span>
            <span className="shrink-0 text-xs font-medium text-slate-400">· {formatStoreCode(record.store)}</span>
          </div>
          {record.clientId > 0 && (
            <button
              type="button"
              onClick={() => openCustomerHistory(record)}
              className="tabular-nums text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
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
      width: 120,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-purple-400 text-xs">
          {val > 0 ? `${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
    {
      title: 'CV Share',
      dataIndex: 'cvTipAmount',
      key: 'cvTipAmount',
      align: 'right' as const,
      width: 130,
      render: (val: number) => (
        <span className={`tabular-nums font-bold text-xs ${val > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
          {val > 0 ? `+${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Top 4 KPI Metric Cards */}
      <Row gutter={[12, 12]} className="mb-4 cv-tip-stat-grid">
        <Col xs={12} sm={12} lg={6}>
          <Card className="shadow-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
            <Statistic
              title={
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">∑ Thưởng CV Tip</span>
              }
              value={summary.totalCvTipBonus}
              prefix={<GiftOutlined className="text-amber-500 mr-2" />}
              formatter={(val) => (
                <span className="tabular-nums font-bold text-2xl text-amber-400">
                  {isMobile ? formatCompactVND(Number(val)) : formatVND(Number(val))}
                </span>
              )}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalCvTipBonus}
              previousValue={previousSummary?.totalCvTipBonus || 0}
              formatter={formatVND}
            />
            <div className="text-[11px] text-gray-400 mt-2">Thực nhận 70% tiền tip từ khách</div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card className="shadow-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
            <Statistic
              title={<span className="text-xs font-semibold uppercase tracking-wider text-purple-400">∑ Tip</span>}
              value={summary.totalCustomerTip}
              prefix={<DollarOutlined className="text-purple-500 mr-2" />}
              formatter={(val) => (
                <span className="tabular-nums font-bold text-2xl text-purple-400">
                  {isMobile ? formatCompactVND(Number(val)) : formatVND(Number(val))}
                </span>
              )}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalCustomerTip}
              previousValue={previousSummary?.totalCustomerTip || 0}
              formatter={formatVND}
            />
            <div className="text-[11px] text-gray-400 mt-2">Tổng số tiền tip khách hàng để lại</div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card className="shadow-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent">
            <Statistic
              title={<span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">% Tip</span>}
              value={summary.avgTipRatePercent}
              prefix={<PercentageOutlined className="text-cyan-500 mr-2" />}
              formatter={(val) => <span className="tabular-nums font-bold text-2xl text-cyan-400">{val}%</span>}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.avgTipRatePercent}
              previousValue={previousSummary?.avgTipRatePercent || 0}
              formatter={(value) => `${value.toFixed(1)}%`}
            />
            <div className="text-[11px] text-gray-400 mt-2">Tỷ lệ chốt tip trên tổng lượt khách phục vụ</div>
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card className="shadow-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent">
            <Statistic
              title={
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Lượt Tip / Khách</span>
              }
              value={summary.totalTippedVisits}
              prefix={<UserOutlined className="text-blue-500 mr-2" />}
              suffix={`/ ${summary.totalVisits}`}
              formatter={(val) => (
                <button
                  type="button"
                  className="tabular-nums font-bold text-2xl text-blue-400 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
                  onClick={openTipHistory}
                  aria-label={`Xem ${val} lượt khách đã tip và các lượt không tip`}
                >
                  {val}
                </button>
              )}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalTippedVisits}
              previousValue={previousSummary?.totalTippedVisits || 0}
              formatter={(value) => `${value.toLocaleString('vi-VN')} lượt`}
            />
            <div className="text-[11px] text-gray-400 mt-2">Nhấn vào số để xem tất cả lượt tip và không tip</div>
          </Card>
        </Col>
      </Row>

      {/* Leaderboard Card (Stacked Full Width) */}
      <Card
        className="full-bleed-card shadow-sm mb-4 rounded-xl"
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary, marginBottom: '16px' }}
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-amber-500 text-lg" />
            <span className="font-bold" style={{ color: token.colorText }}>
              Bảng Xếp Hạng CV Tip
            </span>
          </div>
        }
        extra={
          selectedCvName && (
            <Button
              type="dashed"
              size="small"
              onClick={() => {
                handleSelectCv(null);
              }}
              className="text-xs font-medium"
            >
              Bỏ lọc: {selectedCvName}
            </Button>
          )
        }
      >
        {isMobile ? (
          <div className="p-3">
            <MobileRecordList
              records={leaderboard}
              loading={loading || parentLoading}
              getKey={(record) => String(record.technicianId)}
              getRecordClassName={(record) =>
                selectedCvName === record.displayName ? 'responsive-mobile-record-card-selected' : ''
              }
              emptyDescription="Chưa có dữ liệu xếp hạng CV Tip"
              renderRecord={(record) => {
                const isSelected = selectedCvName === record.displayName;
                const toggleSelection = () => {
                  const newName = isSelected ? null : record.displayName;
                  handleSelectCv(newName);
                };
                return (
                  <button
                    type="button"
                    className="w-full min-w-0 text-left"
                    aria-pressed={isSelected}
                    onClick={toggleSelection}
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
                      <CcAvatar name={record.displayName} src={record.avatar} size={32} isSelected={isSelected} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold" style={{ color: token.colorText }}>
                          {record.displayName}
                        </div>
                        <div className="text-xs text-slate-400">{formatStoreCode(record.store)}</div>
                      </div>
                      <span className="shrink-0 text-xs text-amber-400">{isSelected ? 'Đang lọc' : 'Xem'}</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Phục vụ</dt>
                        <dd className="truncate text-sm font-bold tabular-nums text-sky-400">{record.totalVisits}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Tip</dt>
                        <dd className="truncate text-sm font-bold tabular-nums text-cyan-400">
                          {record.tippedVisits} · {record.tipRatePercent}%
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] text-slate-500">Thưởng</dt>
                        <dd className="text-sm font-bold tabular-nums text-emerald-400">
                          +{formatCompactVND(record.totalCvTipBonus || 0)}
                        </dd>
                      </div>
                    </dl>
                  </button>
                );
              }}
            />
          </div>
        ) : (
          <Table
            dataSource={leaderboard}
            columns={leaderboardColumns}
            rowKey="technicianId"
            loading={loading || parentLoading}
            pagination={false}
            size="small"
            className="antd-custom-table"
            onRow={(record) => ({
              onClick: () => {
                const name = record.displayName;
                const newName = selectedCvName === name ? null : name;
                handleSelectCv(newName);
              },
            })}
            rowClassName={(record) =>
              selectedCvName === record.displayName
                ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-bold cursor-pointer'
                : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }
          />
        )}
      </Card>

      {/* Detail Customer Tipped & Non-Tipped Serviced Table Card (Stacked Full Width) */}
      <Card
        className="full-bleed-card shadow-sm rounded-xl"
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex flex-wrap justify-between items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: token.colorText }}>
                Chi Tiết Ca Làm Nhận Tip 70%
              </span>
              {selectedCvName && (
                <Tag color="gold" className="font-bold text-xs ml-2">
                  Chuyên viên: {selectedCvName}
                </Tag>
              )}
            </div>

            <Space wrap>
              <Segmented
                options={[
                  { label: 'Tất cả', value: 'ALL' },
                  { label: 'Có Tip', value: 'TIPPED' },
                  { label: 'Không Tip', value: 'NO_TIP' },
                ]}
                value={tipFilter}
                onChange={(val) => {
                  setCurrentPage(1);
                  setTipFilter(val as 'ALL' | 'TIPPED' | 'NO_TIP');
                }}
              />
              <Input
                id="cv-tip-search-input"
                name="cvTipSearch"
                placeholder="Tìm CV, khách, dịch vụ..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => {
                  setCurrentPage(1);
                  setSearchText(e.target.value);
                }}
                allowClear
                style={{ width: 180 }}
              />
              <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
                <Button
                  icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                  onClick={() => setIsCompact(!isCompact)}
                  className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
                />
              </Tooltip>
              <Tooltip title="Làm mới dữ liệu">
                <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} />
              </Tooltip>
            </Space>
          </div>
        }
      >
        <Table
          dataSource={records}
          columns={recordColumns}
          rowKey="serviceId"
          loading={loading || parentLoading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalRecords,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} lượt`,
            onChange: (nextPage, nextPageSize) => {
              const pageSizeChanged = nextPageSize !== pageSize;
              const resolvedPage = pageSizeChanged ? 1 : nextPage;
              setCurrentPage(resolvedPage);
              setPageSize(nextPageSize);
              localStorage.setItem('cv_tip_page', resolvedPage.toString());
              localStorage.setItem('cv_tip_page_size', nextPageSize.toString());
            },
          }}
          size="small"
          scroll={{ x: 680 }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>

      <Modal
        open={tipHistoryOpen}
        title="Lịch sử khách tip"
        onCancel={() => setTipHistoryOpen(false)}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 1040}
        styles={{ body: { paddingTop: 12 } }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Segmented
            options={[
              { label: `Tất cả (${tipHistoryRecords.length})`, value: 'ALL' },
              {
                label: `Có tip (${tipHistoryRecords.filter((record) => record.tipStatus === 'Tipped').length})`,
                value: 'TIPPED',
              },
              {
                label: `Không tip (${tipHistoryRecords.filter((record) => record.tipStatus === 'No Tip').length})`,
                value: 'NO_TIP',
              },
            ]}
            value={tipHistoryFilter}
            onChange={(value) => setTipHistoryFilter(value as 'ALL' | 'TIPPED' | 'NO_TIP')}
          />
          <Text type="secondary" className="tabular-nums text-xs">
            {visibleTipHistoryRecords.length} lần phục vụ
          </Text>
        </div>
        <Table
          dataSource={visibleTipHistoryRecords}
          columns={[
            ...recordColumns,
            {
              title: 'Trạng thái tip',
              dataIndex: 'tipStatus',
              key: 'tipStatus',
              width: 120,
              render: (status: CvTipRecord['tipStatus']) => (
                <Tag color={status === 'Tipped' ? 'green' : 'default'}>
                  {status === 'Tipped' ? 'Có tip' : 'Không tip'}
                </Tag>
              ),
            },
          ]}
          rowKey="serviceId"
          loading={tipHistoryLoading}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
          size="small"
          scroll={{ x: 940, y: isMobile ? 440 : 480 }}
          className="antd-custom-table"
        />
      </Modal>

      <Modal
        open={customerHistoryOpen}
        title={`Lịch sử ghé tiệm — ${customerHistoryName}`}
        onCancel={() => setCustomerHistoryOpen(false)}
        footer={null}
        width={isMobile ? 'calc(100vw - 24px)' : 1120}
        styles={{ body: { paddingTop: 12 } }}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Segmented
            options={[
              { label: `Tất cả (${customerHistoryRecords.length})`, value: 'ALL' },
              {
                label: `Có tip (${customerHistoryRecords.filter((record) => record.tipStatus === 'Tipped').length})`,
                value: 'TIPPED',
              },
              {
                label: `Không tip (${customerHistoryRecords.filter((record) => record.tipStatus === 'No Tip').length})`,
                value: 'NO_TIP',
              },
            ]}
            value={customerHistoryFilter}
            onChange={(value) => setCustomerHistoryFilter(value as 'ALL' | 'TIPPED' | 'NO_TIP')}
          />
          <Text type="secondary" className="tabular-nums text-xs">
            {visibleCustomerHistoryRecords.length} lượt ghé
          </Text>
        </div>
        <Table
          dataSource={visibleCustomerHistoryRecords}
          columns={[
            {
              title: 'Ngày ghé',
              dataIndex: 'checkinTime',
              key: 'checkinTime',
              width: 128,
              render: (value: string) => {
                const checkin = dayjs(value);
                return checkin.isValid() ? (
                  <div className="tabular-nums leading-4">
                    <div className="text-xs font-medium text-slate-200">{checkin.format('DD/MM/YYYY')}</div>
                    <div className="text-[11px] text-slate-500">{checkin.format('HH:mm')}</div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">{value || '-'}</span>
                );
              },
            },
            {
              title: 'Bộ mi',
              dataIndex: 'lashSets',
              key: 'lashSets',
              width: 200,
              render: (value: string) => <span className="text-xs text-amber-400">{value || '-'}</span>,
            },
            {
              title: 'CV',
              dataIndex: 'cvNames',
              key: 'cvNames',
              width: 150,
              render: (value: string) => <span className="text-xs font-medium text-slate-200">{value || '-'}</span>,
            },
            {
              title: 'CC',
              key: 'consultants',
              width: 180,
              render: (_: unknown, record: CvTipCustomerVisit) => {
                const names = [record.ccInName, record.ccOutName].filter(Boolean);
                return <span className="text-xs text-slate-300">{names.length ? names.join(' / ') : '-'}</span>;
              },
            },
            {
              title: 'BK',
              dataIndex: 'bookerName',
              key: 'bookerName',
              width: 150,
              render: (value: string) => <span className="text-xs text-slate-300">{value || '-'}</span>,
            },
            {
              title: '∑ Tip',
              dataIndex: 'totalCustomerTip',
              key: 'totalCustomerTip',
              align: 'right' as const,
              width: 116,
              render: (value: number) => (
                <span className="tabular-nums text-xs font-semibold text-purple-400">
                  {value > 0 ? `${value.toLocaleString('vi-VN')} đ` : '0 đ'}
                </span>
              ),
            },
            {
              title: 'Tip',
              dataIndex: 'tipStatus',
              key: 'tipStatus',
              width: 100,
              render: (status: CvTipCustomerVisit['tipStatus']) => (
                <Tag color={status === 'Tipped' ? 'green' : 'default'}>
                  {status === 'Tipped' ? 'Có tip' : 'Không tip'}
                </Tag>
              ),
            },
          ]}
          rowKey="orderId"
          loading={customerHistoryLoading}
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
          size="small"
          scroll={{ x: 980, y: isMobile ? 440 : 480 }}
          className="antd-custom-table"
        />
      </Modal>
    </div>
  );
}
