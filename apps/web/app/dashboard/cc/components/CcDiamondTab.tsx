'use client';

import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, theme, Row, Col, Statistic, Button, Space, Tooltip, Input, message } from 'antd';
import {
  TrophyOutlined,
  UsergroupAddOutlined,
  DollarOutlined,
  SearchOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  CrownOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { CcDiamondEntry, CcDiamondResponse, removeVietnameseTones } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import CcAvatar from './CcAvatar';
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
    const q = removeVietnameseTones(searchText);
    const matchesSearch =
      !searchText || removeVietnameseTones(item.tenCc).includes(q) || String(item.ccId).includes(searchText);
    const matchesConsultant =
      selectedConsultant === 'ALL' || removeVietnameseTones(item.tenCc) === removeVietnameseTones(selectedConsultant);
    return matchesSearch && matchesConsultant;
  });

  const totalReferrals = diamondData?.totalReferralGuests || 0;
  const totalBonus = diamondData?.totalDiamondBonus || 0;
  const topCc = diamondData?.data && diamondData.data.length > 0 ? diamondData.data[0] : null;

  // Format currency
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

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
        <Space size={8}>
          <CcAvatar name={text} src={record.avatar} size={32} />
          <div className="flex items-center gap-2">
            <Text className="font-semibold text-slate-800 dark:text-slate-200">{text}</Text>
            {record.rank === 1 && (
              <Tag color="gold" className="m-0 rounded-full px-2 py-0.5 text-xs">
                Top 1 💎
              </Tag>
            )}
          </div>
        </Space>
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
    <div className="flex flex-col gap-4">
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

      {/* Main Integrated Table Card */}
      <Card
        className="full-bleed-card shadow-sm rounded-xl overflow-hidden"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
      >
        {/* INTEGRATED HEADER: RULES BANNER & TOOLBAR */}
        <div className="p-4 bg-cyan-950/10 dark:bg-cyan-950/20 border-b border-slate-200 dark:border-slate-800">
          {/* ROW 1: RULES BANNER & STEP PROGRESSION */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800/80">
            {/* LEFT: TITLE & CONDITION */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-base">💎</span>
                <span className="font-semibold text-sm tracking-wide text-cyan-800 dark:text-cyan-300">
                  Biểu Phí Thưởng Khách Giới Thiệu (Kim Cương)
                </span>
              </div>
              <span className="hidden sm:inline text-slate-400 opacity-30">•</span>
              <div className="flex items-center gap-1.5 text-xs text-amber-500/90 dark:text-amber-400/90 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0 w-fit">
                <span>⚠️ Tỷ lệ (💎/Tổng khách) ≥ 3.0%</span>
              </div>
            </div>

            {/* RIGHT: STEP PROGRESSION LINE */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs tabular-nums">
              {[
                { k: '1', v: '5k' },
                { k: '2', v: '10k' },
                { k: '3', v: '20k' },
                { k: '4', v: '30k' },
                { k: '5', v: '40k' },
                { k: '6+', v: '50k/khách', max: true },
              ].map((tier, idx, arr) => (
                <React.Fragment key={tier.k}>
                  <div
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md transition-all duration-200 whitespace-nowrap ${
                      tier.max
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'bg-slate-800/40 dark:bg-slate-800/60 text-slate-300 border border-slate-700/40 hover:border-cyan-500/30'
                    }`}
                  >
                    <span className="opacity-60 font-mono text-[11px]">K{tier.k}:</span>
                    <span className={tier.max ? 'text-cyan-300' : 'text-cyan-400 font-semibold'}>{tier.v}</span>
                  </div>
                  {idx < arr.length - 1 && (
                    <span className="text-slate-600 dark:text-slate-600 font-mono text-[10px] shrink-0">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ROW 2: SEARCH INPUT & REFRESH BUTTON */}
          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Tìm kiếm tư vấn viên..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full sm:w-80 rounded-lg text-xs"
              allowClear
            />
            <Tooltip title="Làm mới dữ liệu">
              <Button
                icon={<ReloadOutlined className={loading ? 'animate-spin' : ''} />}
                onClick={fetchDiamondData}
                loading={loading}
                className="rounded-lg shrink-0"
              />
            </Tooltip>
          </div>
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
