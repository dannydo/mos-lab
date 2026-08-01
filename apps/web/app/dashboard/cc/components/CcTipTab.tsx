'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  theme,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Progress,
  Tooltip,
  Input,
  Segmented,
} from 'antd';
import {
  DollarOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  PercentageOutlined,
  GiftOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CcTipLeaderboardEntry, CcTipRecord, removeVietnameseTones, calculateFractionToday } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import CcAvatar from './CcAvatar';

const { Text } = Typography;

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'PXL';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

interface CcTipTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
}

export default function CcTipTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  onSelectConsultant: parentOnSelectConsultant,
}: CcTipTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

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
  const [summary, setSummary] = useState({
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
  }, [dateRange, selectedStore, selectedCcName]);

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
          >
            <CcAvatar name={name} src={record.avatar} isSelected={isSelected} size={32} />
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
      render: (val: number, record: CcTipLeaderboardEntry) => (
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
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thưởng CC Tip (20%)',
      dataIndex: 'totalCcTipBonus',
      key: 'totalCcTipBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-400 text-sm">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
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
      width: 140,
      render: (val: string) => <span className="tabular-nums text-xs text-slate-400 font-medium">{val}</span>,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (val: string) => <span className="font-semibold text-xs text-sky-400">{val || 'Khách Vãng Lai'}</span>,
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store',
      key: 'store',
      width: 90,
      render: (val: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {formatStoreCode(val)}</span>
      ),
    },
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (val: string) => <span className="font-medium text-slate-600 dark:text-slate-300 text-xs">{val}</span>,
    },
    {
      title: 'CC In',
      dataIndex: 'ccInName',
      key: 'ccInName',
      width: 140,
      render: (val: string, r: CcTipRecord) => {
        if (!val) return <span className="text-slate-500 text-xs">-</span>;
        const isSame = !r.ccOutName || r.ccInName === r.ccOutName;
        if (isSame) {
          return (
            <Space size={4} className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <CcAvatar name={val} size={20} />
              <span>{val}</span>
              <span className="text-emerald-400 font-bold text-[10px]" title="CC In/Out đồng nhất">
                ✓
              </span>
            </Space>
          );
        }
        return (
          <Tag color="orange" className="m-0 text-[11px] font-medium border-orange-500/30 whitespace-nowrap">
            In: {val}
          </Tag>
        );
      },
    },
    {
      title: 'CC Out',
      dataIndex: 'ccOutName',
      key: 'ccOutName',
      width: 140,
      render: (val: string, r: CcTipRecord) => {
        if (!val) return <span className="text-slate-500 text-xs">-</span>;
        const isSame = !r.ccInName || r.ccInName === r.ccOutName;
        if (isSame) {
          return <span className="text-slate-500 text-xs italic whitespace-nowrap">Đồng nhất</span>;
        }
        return (
          <Tag color="purple" className="m-0 text-[11px] font-medium border-purple-500/30 whitespace-nowrap">
            Out: {val}
          </Tag>
        );
      },
    },
    {
      title: 'Tip Khách Cho (100%)',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-purple-400 text-xs">
          {val > 0 ? `${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
    {
      title: 'Tỷ Lệ Share',
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
      title: 'Thưởng CC Tip (20%)',
      dataIndex: 'ccTipAmount',
      key: 'ccTipAmount',
      align: 'right' as const,
      render: (val: number) => (
        <span className={`tabular-nums font-bold text-xs ${val > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
          {val > 0 ? `+${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'tipStatus',
      key: 'tipStatus',
      align: 'center' as const,
      width: 110,
      render: (status: 'Tipped' | 'No Tip') => (
        <Tag
          color={status === 'Tipped' ? 'success' : 'default'}
          className="font-semibold text-xs py-0 px-2 rounded-full m-0"
        >
          {status === 'Tipped' ? '🟢 Có Tip' : '⚪ Không Tip'}
        </Tag>
      ),
    },
  ];

  const renderForecastSubtext = (projectedVal: number) => {
    if (isPastPeriod) {
      return (
        <Tooltip title="Dữ liệu tháng đã chốt (100% thời gian)">
          <div className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70">
            <span>Thực tế chốt tháng:</span>
            <span className="tabular-nums font-medium text-slate-400">
              {Math.round(projectedVal).toLocaleString('vi-VN')} đ
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
          <span>Dự kiến cuối tháng:</span>
          <span className="tabular-nums font-semibold text-emerald-400">
            ~{Math.round(projectedVal).toLocaleString('vi-VN')} đ
          </span>
        </div>
      </Tooltip>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top 4 KPI Metric Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent flex flex-col justify-between">
            <div>
              <Statistic
                title={
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                    Tổng Thưởng CC Tip (20%)
                  </span>
                }
                value={summary.totalCcTipBonus}
                prefix={<GiftOutlined className="text-amber-500 mr-2" />}
                suffix="đ"
                formatter={(val) => (
                  <span className="tabular-nums font-bold text-2xl text-amber-400">
                    {Number(val).toLocaleString('vi-VN')}
                  </span>
                )}
              />
              <div className="text-[11px] text-gray-400 mt-2">Thực nhận 20% tiền tip từ khách cho</div>
            </div>
            {renderForecastSubtext(projectedTotalCcTipBonus)}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent flex flex-col justify-between">
            <div>
              <Statistic
                title={
                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                    Tổng Tiền Tip Khách Cho (100%)
                  </span>
                }
                value={summary.totalCustomerTip}
                prefix={<DollarOutlined className="text-purple-500 mr-2" />}
                suffix="đ"
                formatter={(val) => (
                  <span className="tabular-nums font-bold text-2xl text-purple-400">
                    {Number(val).toLocaleString('vi-VN')}
                  </span>
                )}
              />
              <div className="text-[11px] text-gray-400 mt-2">Tổng số tiền tip khách hàng để lại</div>
            </div>
            {renderForecastSubtext(projectedTotalCustomerTip)}
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent">
            <Statistic
              title={
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Tỷ Lệ Khách Cho Tip
                </span>
              }
              value={summary.avgTipRatePercent}
              prefix={<PercentageOutlined className="text-cyan-500 mr-2" />}
              suffix="%"
              formatter={(val) => <span className="tabular-nums font-bold text-2xl text-cyan-400">{val}%</span>}
            />
            <div className="text-[11px] text-gray-400 mt-2">Tỷ lệ chốt tip trên lượt khách tiếp</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent">
            <Statistic
              title={
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Lượt Khách Có Tip vs Không Tip
                </span>
              }
              value={summary.totalTippedVisits}
              prefix={<UserOutlined className="text-blue-500 mr-2" />}
              suffix={`/ ${summary.totalVisits} lượt`}
              formatter={(val) => (
                <span className="tabular-nums font-bold text-2xl text-blue-400">
                  {val} <span className="text-sm font-medium text-gray-400">lượt tip</span>
                </span>
              )}
            />
            <div className="text-[11px] text-gray-400 mt-2">Số lượt khách nhận tip / Tổng lượt khách phục vụ</div>
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
        <Table
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
                parentOnSelectConsultant(name);
              }
            },
          })}
          rowClassName={(record) =>
            selectedCcName === record.displayName
              ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-bold cursor-pointer'
              : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }
        />
      </Card>

      {/* Detail Customer Tipped & Non-Tipped Serviced Table */}
      <Card
        className="full-bleed-card shadow-sm rounded-xl"
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-bold text-base flex items-center gap-2">
                <span>Bảng Dữ Liệu Chi Tiết Khách Hàng Tip</span>
                {selectedCcName && (
                  <Tag color="gold" className="font-bold text-xs">
                    Tư vấn viên: {selectedCcName}
                  </Tag>
                )}
              </div>
              <Text type="secondary" className="text-xs">
                Theo dõi chi tiết số tiền tip khách cho và khoản tiền thưởng 20% thực nhận của từng ca phục vụ
              </Text>
            </div>

            <div className="flex items-center gap-3">
              {/* Segmented Filter Tabs: ALL | TIPPED | NO_TIP */}
              <Segmented
                options={[
                  { label: `Tất Cả (${records.length})`, value: 'ALL' },
                  { label: `🟢 Có Tip (${totalTippedCount})`, value: 'TIPPED' },
                  { label: `⚪ Không Tip (${totalNoTipCount})`, value: 'NO_TIP' },
                ]}
                value={tipFilter}
                onChange={(val) => setTipFilter(val as 'ALL' | 'TIPPED' | 'NO_TIP')}
                className="font-semibold text-xs"
              />

              <Input
                placeholder="Tìm khách hàng, dịch vụ..."
                prefix={<SearchOutlined className="text-gray-400" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 200 }}
                allowClear
                size="small"
              />

              <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
                <Button
                  icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                  size="small"
                  onClick={() => setIsCompact(!isCompact)}
                  className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
                />
              </Tooltip>

              <Tooltip title="Làm mới dữ liệu">
                <Button icon={<ReloadOutlined />} size="small" onClick={fetchTipData} loading={loading} />
              </Tooltip>
            </div>
          </div>
        }
      >
        <Table
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
          scroll={{ x: 1000 }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>
    </div>
  );
}
