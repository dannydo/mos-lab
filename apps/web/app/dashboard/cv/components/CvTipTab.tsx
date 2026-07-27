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
import { CvTipLeaderboardEntry, CvTipRecord } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import CcAvatar from '../../cc/components/CcAvatar';

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
}

export default function CvTipTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  onSelectConsultant,
}: CvTipTabProps) {
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<CvTipLeaderboardEntry[]>([]);
  const [records, setRecords] = useState<CvTipRecord[]>([]);

  const [selectedCvName, setSelectedCvName] = useState<string | null>(null);
  const [tipFilter, setTipFilter] = useState<'ALL' | 'TIPPED' | 'NO_TIP'>('ALL');
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  const [summary, setSummary] = useState({
    totalCvTipBonus: 0,
    totalCustomerTip: 0,
    avgTipRatePercent: 0,
    totalTippedVisits: 0,
    totalVisits: 0,
  });

  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_tip_page_size');
      if (saved) {
        setPageSize(parseInt(saved, 10));
      }
    }
  }, []);

  useEffect(() => {
    if (parentSelectedConsultant && parentSelectedConsultant !== 'ALL') {
      setSelectedCvName(parentSelectedConsultant);
    }
  }, [parentSelectedConsultant]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const [lbRes, recRes] = await Promise.all([
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
        }),
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
      }

      if (recRes) {
        setRecords(recRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching CV Tip data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedStore, selectedCvName, parentSelectedConsultant, tipFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredRecords = React.useMemo(() => {
    if (!searchText) return records;
    const lower = searchText.toLowerCase();
    return records.filter(
      (r) =>
        r.techName.toLowerCase().includes(lower) ||
        r.clientName.toLowerCase().includes(lower) ||
        r.serviceName.toLowerCase().includes(lower)
    );
  }, [records, searchText]);

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
              setSelectedCvName(newName);
              if (onSelectConsultant) {
                onSelectConsultant(newName || 'ALL');
              }
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
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
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
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
  ];

  const recordColumns = [
    {
      title: 'Thời Gian Check-in',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      width: 140,
      render: (val: string) => <span className="tabular-nums text-xs text-slate-400 font-medium">{val}</span>,
    },
    {
      title: 'Chuyên Viên (CV)',
      dataIndex: 'techName',
      key: 'techName',
      width: 160,
      render: (text: string, record: CvTipRecord) => (
        <Space size={6} className="whitespace-nowrap">
          <CcAvatar name={text} src={record.avatar} size={24} />
          <span className="font-semibold text-xs text-amber-400 whitespace-nowrap">{text}</span>
        </Space>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      width: 130,
      render: (val: string) => <span className="font-semibold text-xs text-sky-400">{val || 'Khách Vãng Lai'}</span>,
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store',
      key: 'store',
      width: 80,
      render: (val: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {formatStoreCode(val)}</span>
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
    {
      title: 'Tip Khách Cho (100%)',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right' as const,
      width: 120,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-purple-400 text-xs">
          {val > 0 ? `${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
    {
      title: 'Thưởng CV Tip',
      dataIndex: 'cvTipAmount',
      key: 'cvTipAmount',
      align: 'right' as const,
      width: 130,
      render: (val: number) => (
        <span className={`tabular-nums font-bold text-xs ${val > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
          {val > 0 ? `+${val.toLocaleString('vi-VN')} đ` : '0 đ'}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Top 4 KPI Metric Cards */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
            <Statistic
              title={
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Tổng Thưởng CV Tip
                </span>
              }
              value={summary.totalCvTipBonus}
              prefix={<GiftOutlined className="text-amber-500 mr-2" />}
              suffix="đ"
              formatter={(val) => (
                <span className="tabular-nums font-bold text-2xl text-amber-400">
                  {Number(val).toLocaleString('vi-VN')}
                </span>
              )}
            />
            <div className="text-[11px] text-gray-400 mt-2">Thực nhận 70% tiền tip từ khách cho</div>
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
                  Tỷ Lệ Khách Nhận Tip
                </span>
              }
              value={summary.avgTipRatePercent}
              prefix={<PercentageOutlined className="text-cyan-500 mr-2" />}
              suffix="%"
              formatter={(val) => <span className="tabular-nums font-bold text-2xl text-cyan-400">{val}%</span>}
            />
            <div className="text-[11px] text-gray-400 mt-2">Tỷ lệ chốt tip trên tổng lượt khách phục vụ</div>
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
                setSelectedCvName(null);
                if (onSelectConsultant) {
                  onSelectConsultant('ALL');
                }
              }}
              className="text-xs font-medium"
            >
              Bỏ lọc: {selectedCvName}
            </Button>
          )
        }
      >
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
              setSelectedCvName(newName);
              if (onSelectConsultant) {
                onSelectConsultant(newName || 'ALL');
              }
            },
          })}
          rowClassName={(record) =>
            selectedCvName === record.displayName
              ? 'bg-amber-500/10 dark:bg-amber-500/20 border-l-4 border-amber-500 font-bold cursor-pointer'
              : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }
        />
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
                onChange={(val) => setTipFilter(val as 'ALL' | 'TIPPED' | 'NO_TIP')}
              />
              <Input
                placeholder="Tìm CV, khách..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
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
          dataSource={filteredRecords}
          columns={recordColumns}
          rowKey="serviceId"
          loading={loading || parentLoading}
          pagination={{
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            onChange: (page, size) => {
              setPageSize(size);
              localStorage.setItem('cv_tip_page_size', size.toString());
            },
          }}
          size="small"
          scroll={{ x: 800 }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
        />
      </Card>
    </div>
  );
}
