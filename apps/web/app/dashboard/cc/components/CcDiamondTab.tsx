'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, theme, Row, Col, Statistic, Button, Space, Tooltip, Input, message } from 'antd';
import {
  TrophyOutlined,
  UsergroupAddOutlined,
  DollarOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  CrownOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CcDiamondEntry, CcDiamondResponse } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import CcDiamondDetailModal from './CcDiamondDetailModal';

const { Text, Title } = Typography;

interface CcDiamondTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
}

export default function CcDiamondTab({
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant = 'ALL',
}: CcDiamondTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [diamondData, setDiamondData] = useState<CcDiamondResponse | null>(null);
  const [searchText, setSearchText] = useState('');

  // Drill-down Modal State
  const [selectedCcRecord, setSelectedCcRecord] = useState<CcDiamondEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchDiamondData = async () => {
    setLoading(true);
    try {
      const month = dateRange ? dateRange[0].format('YYYY-MM') : dayjs().format('YYYY-MM');
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;

      const res = await apiClient.kpi.getCcDiamondData({
        month,
        date_from: dateFrom,
        date_to: dateTo,
      });

      setDiamondData(res);
    } catch (err) {
      console.error('Error fetching diamond referral data:', err);
      message.error('Không thể tải dữ liệu Chương trình Kim Cương.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiamondData();
  }, [dateRange]);

  // Filtered rows
  const filteredData = (diamondData?.data || []).filter((item) => {
    const matchesSearch =
      item.tenCc.toLowerCase().includes(searchText.toLowerCase()) || String(item.ccId).includes(searchText);
    const matchesConsultant =
      selectedConsultant === 'ALL' || item.tenCc.toLowerCase() === selectedConsultant.toLowerCase();
    return matchesSearch && matchesConsultant;
  });

  const totalReferrals = diamondData?.totalReferralGuests || 0;
  const totalBonus = diamondData?.totalDiamondBonus || 0;
  const topCc = diamondData?.data && diamondData.data.length > 0 ? diamondData.data[0] : null;

  // Format currency
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  // Export CSV
  const handleExportCsv = () => {
    const month = dateRange ? dateRange[0].format('YYYY-MM') : dayjs().format('YYYY-MM');
    const url = `http://localhost:4001/api/kpi/export-diamond?key=FDC0D0A177694777A&month=${month}&format=csv`;
    window.open(url, '_blank');
  };

  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <CrownOutlined style={{ color: '#f59e0b', fontSize: 20 }} />;
        if (rank === 2) return <Tag color="gold">#2</Tag>;
        if (rank === 3) return <Tag color="blue">#3</Tag>;
        return <Text className="tabular-nums font-semibold text-slate-500">{rank}</Text>;
      },
    },
    {
      title: 'Tư Vấn Viên (CC)',
      dataIndex: 'tenCc',
      key: 'tenCc',
      render: (text: string, record: CcDiamondEntry) => (
        <div className="flex items-center gap-2">
          <Text className="font-semibold text-slate-800 dark:text-slate-200">{text}</Text>
          {record.rank === 1 && (
            <Tag color="gold" className="m-0 rounded-full px-2 py-0.5 text-xs">
              Top 1 💎
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1">
          <span>Tổng Khách Đã Tiếp</span>
          <Tooltip title="Tổng số lượt khách tư vấn viên tiếp đón trong tháng = (Check-in + Check-out) / 2">
            <InfoCircleOutlined className="text-slate-400" />
          </Tooltip>
        </div>
      ),
      dataIndex: 'tongKhach',
      key: 'tongKhach',
      align: 'right' as const,
      sorter: (a: CcDiamondEntry, b: CcDiamondEntry) => a.tongKhach - b.tongKhach,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
          {val.toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1">
          <span>Số Khách Giới Thiệu (💎)</span>
          <Tooltip title="Số khách hàng mới đăng ký giới thiệu qua tư vấn viên này">
            <InfoCircleOutlined className="text-slate-400" />
          </Tooltip>
        </div>
      ),
      dataIndex: 'soKhachDiamond',
      key: 'soKhachDiamond',
      align: 'right' as const,
      sorter: (a: CcDiamondEntry, b: CcDiamondEntry) => a.soKhachDiamond - b.soKhachDiamond,
      render: (val: number) => (
        <Tag color={val > 0 ? 'cyan' : 'default'} className="m-0 tabular-nums px-3 py-1 font-bold text-sm rounded-lg">
          💎 {val} khách
        </Tag>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1">
          <span>Tỷ Lệ Giới Thiệu</span>
          <Tooltip title="Tỷ lệ = (Số Khách Giới Thiệu / Tổng Khách Đã Tiếp) × 100%. Yêu cầu đạt từ ≥ 3.0% trở lên để nhận thưởng.">
            <InfoCircleOutlined className="text-slate-400" />
          </Tooltip>
        </div>
      ),
      dataIndex: 'tyLeGioiThieu',
      key: 'tyLeGioiThieu',
      align: 'right' as const,
      sorter: (a: CcDiamondEntry, b: CcDiamondEntry) => (a.tyLeGioiThieu || 0) - (b.tyLeGioiThieu || 0),
      render: (val: number, record: CcDiamondEntry) => {
        const ratio = record.tongKhach > 0 ? ((record.soKhachDiamond / record.tongKhach) * 100).toFixed(1) : '0.0';
        const isQualified = record.datDieuKien ?? Number(ratio) >= 3.0;
        const hasReferrals = record.soKhachDiamond > 0;

        if (isQualified && hasReferrals) {
          return (
            <Tag
              color="success"
              className="m-0 tabular-nums px-2.5 py-0.5 font-bold text-xs rounded-md border-emerald-300"
            >
              ✓ {ratio}% (Đạt)
            </Tag>
          );
        }

        if (!isQualified && hasReferrals) {
          return (
            <Tooltip title={`Chưa đạt điều kiện tối thiểu ≥ 3.0% (hiện tại: ${ratio}%)`}>
              <Tag
                color="error"
                className="m-0 tabular-nums px-2.5 py-0.5 font-bold text-xs rounded-md border-rose-300"
              >
                ⚠️ {ratio}% (&lt;3%)
              </Tag>
            </Tooltip>
          );
        }

        return (
          <Tag color="default" className="m-0 tabular-nums px-2.5 py-0.5 font-normal text-xs rounded-md">
            {ratio}%
          </Tag>
        );
      },
    },
    {
      title: 'Thưởng Kim Cương (VND)',
      dataIndex: 'thuongDiamond',
      key: 'thuongDiamond',
      align: 'right' as const,
      sorter: (a: CcDiamondEntry, b: CcDiamondEntry) => a.thuongDiamond - b.thuongDiamond,
      render: (val: number, record: CcDiamondEntry) => {
        if (val > 0) {
          return (
            <span className="tabular-nums font-bold text-base text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(val)}
            </span>
          );
        }

        if (record.potentialThuong && record.potentialThuong > 0) {
          return (
            <div className="text-right">
              <span className="tabular-nums font-bold text-slate-400 text-sm">0 đ</span>
              <div className="text-[11px] text-rose-500 dark:text-rose-400 font-medium tabular-nums">
                (Cần ≥3% để nhận {formatCurrency(record.potentialThuong)})
              </div>
            </div>
          );
        }

        return <span className="tabular-nums font-semibold text-slate-400">0 đ</span>;
      },
    },
    {
      title: 'Chi Tiết',
      key: 'action',
      align: 'center' as const,
      width: 110,
      render: (_: unknown, record: CcDiamondEntry) => (
        <Button
          size="small"
          type="text"
          icon={<EyeOutlined className="text-cyan-600 dark:text-cyan-400" />}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCcRecord(record);
            setDetailModalOpen(true);
          }}
          className="text-cyan-600 dark:text-cyan-400 font-medium hover:bg-cyan-50 dark:hover:bg-cyan-950/40 rounded-lg"
        >
          Xem cặp
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl"
            style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff' }}
          >
            <Statistic
              title={<span className="text-slate-500 dark:text-slate-400 font-medium">Tổng Khách Giới Thiệu</span>}
              value={totalReferrals}
              prefix={<UsergroupAddOutlined className="text-cyan-500 mr-2" />}
              suffix="khách"
              valueStyle={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#38bdf8' : '#0284c7',
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl"
            style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff' }}
          >
            <Statistic
              title={<span className="text-slate-500 dark:text-slate-400 font-medium">Tổng Thưởng Kim Cương</span>}
              value={totalBonus}
              formatter={(val) => formatCurrency(Number(val))}
              prefix={<DollarOutlined className="text-emerald-500 mr-2" />}
              valueStyle={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#34d399' : '#059669',
              }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl"
            style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff' }}
          >
            <Statistic
              title={<span className="text-slate-500 dark:text-slate-400 font-medium">Quán Quân Giới Thiệu</span>}
              value={topCc ? topCc.tenCc : 'Chưa có'}
              prefix={<CrownOutlined className="text-amber-500 mr-2" />}
              suffix={topCc && topCc.soKhachDiamond > 0 ? `(💎 ${topCc.soKhachDiamond} khách)` : ''}
              valueStyle={{
                fontSize: '1.25rem',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#fbbf24' : '#d97706',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Program Bonus Rules Banner */}
      <Card className="shadow-sm border border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Title level={5} className="m-0 text-cyan-800 dark:text-cyan-300 flex items-center gap-2">
              💎 Biểu Phí Thưởng Khách Giới Thiệu (CT Kim Cương)
            </Title>
            <div className="flex items-center gap-2 mt-1">
              <Text className="text-xs text-slate-600 dark:text-slate-400">
                Thưởng lũy tiến theo mốc khách giới thiệu đạt được.
              </Text>
              <Tag color="volcano" className="rounded-md font-bold text-xs m-0">
                ⚠️ Điều kiện: Tỷ lệ (💎/Tổng khách) phải đạt ≥ 3.0%
              </Tag>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Tag color="blue" className="rounded-md tabular-nums font-semibold px-2 py-1">
              Khách 1: 5k
            </Tag>
            <Tag color="blue" className="rounded-md tabular-nums font-semibold px-2 py-1">
              Khách 2: 10k
            </Tag>
            <Tag color="blue" className="rounded-md tabular-nums font-semibold px-2 py-1">
              Khách 3: 20k
            </Tag>
            <Tag color="blue" className="rounded-md tabular-nums font-semibold px-2 py-1">
              Khách 4: 30k
            </Tag>
            <Tag color="blue" className="rounded-md tabular-nums font-semibold px-2 py-1">
              Khách 5: 40k
            </Tag>
            <Tag color="cyan" className="rounded-md tabular-nums font-bold px-2 py-1">
              Khách 6+: 50k / khách
            </Tag>
          </div>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card
        className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl"
        style={{ background: themeMode === 'dark' ? '#141414' : '#ffffff' }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <Input
            placeholder="Tìm kiếm tư vấn viên..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-72 rounded-lg"
            allowClear
          />

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchDiamondData} loading={loading} className="rounded-lg">
              Làm mới
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportCsv}
              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 border-none"
            >
              Xuất CSV (Google Sheets)
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="ccId"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          className="antd-custom-table"
          onRow={(record) => ({
            onClick: () => {
              setSelectedCcRecord(record);
              setDetailModalOpen(true);
            },
            className: 'cursor-pointer hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20 transition-colors',
          })}
        />
      </Card>

      <CcDiamondDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        ccRecord={selectedCcRecord}
        dateRange={dateRange}
      />
    </div>
  );
}
