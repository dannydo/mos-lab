'use client';

import React, { useEffect, useState } from 'react';
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CcTipLeaderboardEntry, CcTipRecord } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import CcAvatar from './CcAvatar';

const { Text } = Typography;

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
      const lower = searchText.toLowerCase();
      return (
        r.clientName.toLowerCase().includes(lower) ||
        r.serviceName.toLowerCase().includes(lower) ||
        r.ccInName.toLowerCase().includes(lower) ||
        r.ccOutName.toLowerCase().includes(lower) ||
        r.consultantName.toLowerCase().includes(lower) ||
        r.checkinTime.includes(lower)
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
      width: 70,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '20px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '20px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '20px' }}>🥉</span>;
        return <span className="tabular-nums font-semibold text-gray-500">#{rank}</span>;
      },
    },
    {
      title: 'Tư vấn viên (CC)',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: CcTipLeaderboardEntry) => {
        const isSelected = selectedCcName === name;
        return (
          <Space className="cursor-pointer group" onClick={() => setSelectedCcName(isSelected ? null : name)}>
            <CcAvatar name={name} src={record.avatar} isSelected={isSelected} size={36} />
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold text-sm transition-colors ${
                    isSelected ? 'text-amber-500 underline underline-offset-4' : 'hover:text-amber-500'
                  }`}
                  style={{ color: isSelected ? undefined : token.colorText }}
                >
                  {name}
                </span>
                {isSelected && (
                  <Tag color="gold" icon={<CheckCircleOutlined />} className="font-semibold text-[10px]">
                    Đang lọc
                  </Tag>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Tag color={record.store === 'PXL' ? 'blue' : 'purple'} className="text-[10px] m-0">
                  CN: {record.store}
                </Tag>
                <Text type="secondary" className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                  (Click để lọc)
                </Text>
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
      render: (val: number) => <span className="tabular-nums font-bold text-blue-500 text-sm">👥 {val} lượt</span>,
    },
    {
      title: 'Lượt Khách Tip & Tỷ Lệ',
      dataIndex: 'tippedVisits',
      key: 'tippedVisits',
      align: 'right' as const,
      render: (val: number, record: CcTipLeaderboardEntry) => (
        <Tooltip title={`Đã nhận tip từ ${val} / ${record.totalVisits} lượt khách (${record.tipRatePercent}%)`}>
          <div className="w-full text-right">
            <div className="tabular-nums font-bold text-cyan-500 text-sm">🟢 {val} lượt tip</div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="tabular-nums text-[11px] text-gray-400 font-medium">
                Tỷ lệ tip: <strong className="text-emerald-500">{record.tipRatePercent}%</strong>
              </span>
              <div className="w-12">
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
        <span className="tabular-nums font-semibold text-purple-400 text-sm">
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
        <span className="tabular-nums font-bold text-amber-500 text-base">
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
      width: 160,
      render: (val: string) => <span className="tabular-nums text-xs text-gray-400 font-medium">{val}</span>,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (val: string) => <span className="font-bold text-sm text-sky-400">{val || 'Khách Vãng Lai'}</span>,
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store',
      key: 'store',
      width: 100,
      render: (val: string) => (
        <Tag color={val === 'PXL' ? 'blue' : 'purple'} className="font-semibold text-xs m-0">
          {val}
        </Tag>
      ),
    },
    {
      title: 'Tên Dịch Vụ',
      dataIndex: 'serviceName',
      key: 'serviceName',
      render: (val: string) => <span className="font-semibold text-gray-200 text-sm">{val}</span>,
    },
    {
      title: 'CC In',
      dataIndex: 'ccInName',
      key: 'ccInName',
      render: (val: string) =>
        val ? (
          <Space size={6}>
            <CcAvatar name={val} size={24} />
            <span className="font-medium text-amber-400 text-xs">{val}</span>
          </Space>
        ) : (
          <span className="text-gray-500 text-xs">---</span>
        ),
    },
    {
      title: 'CC Out',
      dataIndex: 'ccOutName',
      key: 'ccOutName',
      render: (val: string) =>
        val ? (
          <Space size={6}>
            <CcAvatar name={val} size={24} />
            <span className="font-medium text-purple-400 text-xs">{val}</span>
          </Space>
        ) : (
          <span className="text-gray-500 text-xs">---</span>
        ),
    },
    {
      title: 'Tip Khách Cho (100%)',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-purple-400">
          {val > 0 ? `${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
    {
      title: 'Tỷ Lệ Share',
      dataIndex: 'ccTipPercentage',
      key: 'ccTipPercentage',
      align: 'center' as const,
      width: 100,
      render: (val: number) => (
        <Tag color={val > 0 ? 'cyan' : 'default'} className="font-bold tabular-nums text-xs m-0">
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
        <span className={`tabular-nums font-bold text-sm ${val > 0 ? 'text-amber-500' : 'text-gray-500'}`}>
          {val > 0 ? `+${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'tipStatus',
      key: 'tipStatus',
      align: 'center' as const,
      width: 120,
      render: (status: 'Tipped' | 'No Tip') => (
        <Tag
          color={status === 'Tipped' ? 'success' : 'default'}
          className="font-bold text-xs px-2.5 py-0.5 rounded-full"
        >
          {status === 'Tipped' ? '🟢 Có Tip' : '⚪ Không Tip'}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top 4 KPI Metric Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
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
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
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
        className="shadow-xl border border-slate-200 dark:border-slate-800"
        style={{ marginBottom: '24px' }}
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
        className="shadow-xl border border-slate-200 dark:border-slate-800"
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

              <Button icon={<ReloadOutlined />} size="small" onClick={fetchTipData} loading={loading}>
                Làm mới
              </Button>
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
          size="middle"
          scroll={{ x: 1000 }}
          className="tabular-nums"
        />
      </Card>
    </div>
  );
}
