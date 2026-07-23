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
  message,
} from 'antd';
import {
  GiftOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  TrophyOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  SettingOutlined,
  CompressOutlined,
  ExpandOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { DailySalesBonusConsultantRecord, DailySalesBonusLeaderboardEntry } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import CcThuongConfigModal from './CcThuongConfigModal';
import CcThuongTransactionsModal from './CcThuongTransactionsModal';
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

interface CcThuongTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
}

export default function CcThuongTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  onSelectConsultant: parentOnSelectConsultant,
}: CcThuongTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DailySalesBonusConsultantRecord[]>([]);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isCompact, setIsCompact] = useState(false);

  // Selected CC for Level 1 -> Level 2 Drill-down
  const [selectedCcName, setSelectedCcName] = useState<string | null>(null);

  // Level 3 Drill-down modal state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedTxDate, setSelectedTxDate] = useState<string | undefined>(undefined);
  const [selectedTxConsultantId, setSelectedTxConsultantId] = useState<number | undefined>(undefined);
  const [selectedTxConsultantName, setSelectedTxConsultantName] = useState<string | undefined>(undefined);

  const [summary, setSummary] = useState<{
    totalComboSales: number;
    totalProductSales: number;
    totalCcBonus: number;
  } | null>(null);
  const [activeStaff, setActiveStaff] = useState<{ userId: number; displayName: string; avatar?: string | null }[]>([]);

  // Sync external consultant filter if passed
  useEffect(() => {
    if (parentSelectedConsultant && parentSelectedConsultant !== 'ALL') {
      setSelectedCcName(parentSelectedConsultant);
    }
  }, [parentSelectedConsultant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const res = await apiClient.gamification.getDailySalesBonusConsultants({
        dateFrom,
        dateTo,
        storeId: selectedStore,
        consultantId: 'ALL',
      });

      if (res && res.data) {
        setData(res.data);
        if (res.summary) {
          setSummary(res.summary);
        }
        if (res.activeStaff) {
          setActiveStaff(res.activeStaff);
        }
      } else {
        setData([]);
        setSummary(null);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu thưởng CC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedStore]);

  // Aggregate Top KPI Cards (Prioritize Fastify backend summary calculation)
  const totalComboSales = useMemo(() => {
    return summary?.totalComboSales ?? data.reduce((acc, curr) => acc + (curr.combo_sales || 0), 0);
  }, [summary, data]);

  const totalProductSales = useMemo(() => {
    return (
      summary?.totalProductSales ??
      data.reduce((acc, curr) => acc + (curr.product_sales || 0) + (curr.single_sales || 0), 0)
    );
  }, [summary, data]);

  const totalCcBonus = useMemo(() => {
    return summary?.totalCcBonus ?? data.reduce((acc, curr) => acc + (curr.daily_bonus || 0), 0);
  }, [summary, data]);

  // Level 1: Aggregated Leaderboard
  const leaderboardData = useMemo<DailySalesBonusLeaderboardEntry[]>(() => {
    const map = new Map<
      number,
      {
        consultantId: number;
        displayName: string;
        avatar?: string | null;
        store: string;
        comboCount: number;
        comboSales: number;
        productCount: number;
        singleSales: number;
        totalVisits: number;
        greenVisits: number;
        totalSales: number;
        totalBonus: number;
      }
    >();

    activeStaff.forEach((s) => {
      map.set(s.userId, {
        consultantId: s.userId,
        displayName: s.displayName,
        avatar: s.avatar,
        store: formatStoreCode(s.displayName),
        comboCount: 0,
        comboSales: 0,
        productCount: 0,
        singleSales: 0,
        totalVisits: 0,
        greenVisits: 0,
        totalSales: 0,
        totalBonus: 0,
      });
    });

    data.forEach((r) => {
      if (!map.has(r.user_id)) {
        map.set(r.user_id, {
          consultantId: r.user_id,
          displayName: r.consultant_name,
          avatar: r.avatar,
          store: formatStoreCode(r.store_code),
          comboCount: 0,
          comboSales: 0,
          productCount: 0,
          singleSales: 0,
          totalVisits: 0,
          greenVisits: 0,
          totalSales: 0,
          totalBonus: 0,
        });
      }
      const item = map.get(r.user_id)!;
      item.comboCount += r.combo_count || 0;
      item.comboSales += r.combo_sales || 0;
      item.productCount += r.product_count || 0;
      item.singleSales += r.single_sales || 0;
      item.totalVisits += r.total_visits || 0;
      item.greenVisits += r.green_visits || 0;
      item.totalSales += r.total_sales || 0;
      item.totalBonus += r.daily_bonus || 0;
      if (r.store_code) item.store = formatStoreCode(r.store_code);
      if (r.avatar && !item.avatar) item.avatar = r.avatar;
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.totalBonus - a.totalBonus);
    const maxBonus = sorted.length > 0 ? sorted[0].totalBonus : 1;

    return sorted.map((item, idx) => {
      const greenConversionRate =
        item.greenVisits > 0 ? Math.min(100, Math.round((item.comboCount / item.greenVisits) * 100)) : 0;
      return {
        rank: idx + 1,
        consultantId: item.consultantId,
        displayName: item.displayName,
        avatar: item.avatar,
        store: item.store,
        comboSalesCount: item.comboCount,
        comboSales: item.comboSales,
        productSalesCount: item.productCount,
        singleSales: item.singleSales,
        totalVisits: item.totalVisits,
        greenVisits: item.greenVisits,
        greenComboConversionRate: greenConversionRate,
        totalSales: item.totalSales,
        totalBonus: item.totalBonus,
        targetCompletionRate: Math.min(100, Math.round((item.totalBonus / (maxBonus || 1)) * 100)),
      };
    });
  }, [data, activeStaff]);

  // Level 2: Filtered Daily Records Table
  const filteredDailyData = useMemo(() => {
    let result = data;

    if (selectedCcName) {
      result = result.filter((r) => r.consultant_name === selectedCcName);
    }

    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (r) =>
          r.consultant_name.toLowerCase().includes(lower) ||
          r.date.includes(lower) ||
          (r.store_code && r.store_code.toLowerCase().includes(lower))
      );
    }

    return result;
  }, [data, selectedCcName, searchText]);

  // Level 1 Columns: Leaderboard
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
      render: (name: string, record: DailySalesBonusLeaderboardEntry) => {
        const isSelected = selectedCcName === name;
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={8}>
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
      title: 'Lượt Khách (Tổng / Vòng Xanh)',
      dataIndex: 'totalVisits',
      key: 'totalVisits',
      width: 170,
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Tổng số lượt khách đã tiếp: ${val} lượt | Lượt khách Vòng Xanh (đi lẻ / còn 1 combo): ${record.greenVisits} lượt`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-blue-400 text-xs">👥 {val} lượt</div>
            <div className="tabular-nums text-[11px] text-cyan-400 font-medium mt-0.5">
              🟢 {record.greenVisits} Vòng Xanh
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Combo Bán & Tỷ Lệ (Vòng Xanh)',
      dataIndex: 'comboSalesCount',
      key: 'comboSalesCount',
      width: 180,
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Đã bán ${val} Combo. Doanh số combo: ${Math.round(record.comboSales || 0).toLocaleString('vi-VN')} đ | Tỷ lệ chốt thành công: ${record.greenComboConversionRate}%`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-blue-400 text-xs">{val} combo</div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="tabular-nums text-[11px] text-slate-400 font-medium">
                Tỷ lệ VX: <strong className="text-emerald-400">{record.greenComboConversionRate}%</strong>
              </span>
              <div className="w-10">
                <Progress
                  percent={record.greenComboConversionRate}
                  size="small"
                  strokeColor={record.greenComboConversionRate >= 15 ? '#52c41a' : '#1890ff'}
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
      title: 'Doanh Thu Combo',
      dataIndex: 'comboSales',
      key: 'comboSales',
      width: 160,
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-sky-400 text-xs">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'SP & DV Lẻ (Tham Khảo)',
      dataIndex: 'productSalesCount',
      key: 'productSalesCount',
      width: 170,
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <Tooltip
          title={`Đã bán ${val} Sản phẩm. Doanh số dịch vụ lẻ tham khảo: ${Math.round(record.singleSales || 0).toLocaleString('vi-VN')} đ`}
        >
          <div className="w-full text-right">
            <div className="tabular-nums font-semibold text-purple-400 text-xs">{val} SP</div>
            <div className="tabular-nums text-[11px] text-slate-400 mt-0.5">
              DV lẻ: {Math.round(record.singleSales || 0).toLocaleString('vi-VN')} đ
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Tổng Doanh Số Tính Thưởng',
      dataIndex: 'totalSales',
      key: 'totalSales',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-amber-400 text-xs">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Thưởng CC Bonus & Tiến Độ',
      dataIndex: 'totalBonus',
      key: 'totalBonus',
      width: 200,
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusLeaderboardEntry) => (
        <div className="w-full text-right">
          <div className="tabular-nums font-bold text-emerald-400 text-sm">
            +{Math.round(val || 0).toLocaleString('vi-VN')} đ
          </div>
          <Progress
            percent={record.targetCompletionRate}
            size="small"
            strokeColor={record.targetCompletionRate >= 80 ? '#52c41a' : '#faad14'}
            className="m-0"
          />
        </div>
      ),
    },
  ];

  // Level 2 Columns: Daily Bonus Table
  const dailyColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (val: string) => (
        <div className="flex items-center gap-1">
          <CalendarOutlined className="text-amber-500 text-xs" />
          <span className="tabular-nums font-medium text-xs text-slate-400">{val}</span>
        </div>
      ),
    },
    {
      title: 'Tư Vấn Viên (CC)',
      dataIndex: 'consultant_name',
      key: 'consultant_name',
      width: 170,
      render: (val: string, record: DailySalesBonusConsultantRecord) => (
        <Space size={6} className="whitespace-nowrap">
          <CcAvatar name={val} src={record.avatar} size={24} />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="font-medium text-xs whitespace-nowrap">{val}</span>
            {record.store_code && (
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                · {formatStoreCode(record.store_code)}
              </span>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Doanh Số Combo',
      dataIndex: 'combo_sales',
      key: 'combo_sales',
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusConsultantRecord) => (
        <div>
          <span className="tabular-nums font-semibold text-xs text-blue-400">
            {Math.round(val || 0).toLocaleString('vi-VN')} đ
          </span>
          {record.combo_count ? (
            <div className="text-[11px] text-slate-400 tabular-nums">({record.combo_count} combo)</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Doanh Số SP',
      dataIndex: 'product_sales',
      key: 'product_sales',
      align: 'right' as const,
      render: (val: number, record: DailySalesBonusConsultantRecord) => (
        <div>
          <span className="tabular-nums font-semibold text-xs text-purple-400">
            {Math.round(val || 0).toLocaleString('vi-VN')} đ
          </span>
          {record.product_count ? (
            <div className="text-[11px] text-slate-400 tabular-nums">({record.product_count} SP)</div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Doanh Số DV Lẻ (Ref)',
      dataIndex: 'single_sales',
      key: 'single_sales',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-slate-500">{Math.round(val || 0).toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      title: 'Thu Nợ',
      dataIndex: 'debt_collected',
      key: 'debt_collected',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-slate-400">{Math.round(val || 0).toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      title: '-VAT',
      dataIndex: 'vat',
      key: 'vat',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-rose-400/80">-{Math.round(val || 0).toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      title: '-Debt',
      dataIndex: 'debt',
      key: 'debt',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs text-orange-400/80">
          -{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Tổng Doanh Số Tính Thưởng',
      dataIndex: 'total_sales',
      key: 'total_sales',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-amber-400">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Tỷ Lệ Thưởng %',
      dataIndex: 'commission_rate_percent',
      key: 'commission_rate_percent',
      align: 'right' as const,
      width: 110,
      render: (val: number) => (
        <Tag
          color={val >= 2 ? 'green' : val >= 1 ? 'gold' : 'blue'}
          className="tabular-nums font-bold text-xs py-0 px-1.5 m-0"
        >
          {val.toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: 'Thưởng Ngày (Daily Bonus)',
      dataIndex: 'daily_bonus',
      key: 'daily_bonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-emerald-400">
          +{Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 3 TOP KPI SUMMARY CARDS */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Doanh Thu Combo"
              value={totalComboSales}
              suffix="đ"
              precision={0}
              valueStyle={{ color: '#1890ff', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="Doanh Thu SP & DV Lẻ"
              value={totalProductSales}
              suffix="đ"
              precision={0}
              valueStyle={{ color: '#722ed1', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: '#d4a84b' }}
            className="shadow-sm rounded-xl relative"
          >
            <div className="flex justify-between items-start">
              <Statistic
                title="Tổng Thưởng CC Bonus"
                value={totalCcBonus}
                suffix="đ"
                precision={0}
                valueStyle={{ color: '#d4a84b', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
                prefix={<DollarOutlined />}
              />
              <Tooltip title="Cấu hình CC">
                <Button
                  type="primary"
                  icon={<SettingOutlined />}
                  size="small"
                  onClick={() => setConfigModalOpen(true)}
                  style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: '600' }}
                />
              </Tooltip>
            </div>
          </Card>
        </Col>
      </Row>

      {/* LEVEL 1: CC LEADERBOARD */}
      <Card
        title={
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <TrophyOutlined className="text-amber-500 text-lg" />
              <span style={{ color: token.colorText }} className="font-bold text-base">
                🏆 Bảng Xếp Hạng Báo Cáo CC Thưởng - CC Leaderboard
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <FilterOutlined className="text-amber-500" />
              <span>💡 Mẹo: Click vào tên CC trên bảng để tự động lọc dữ liệu chi tiết bên dưới</span>
            </div>
          </div>
        }
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        className="full-bleed-card shadow-sm rounded-xl"
      >
        <Table
          dataSource={leaderboardData}
          columns={leaderboardColumns}
          rowKey="consultantId"
          size="small"
          pagination={false}
          loading={loading || parentLoading}
          scroll={{ x: 'max-content' }}
          className="antd-custom-table"
          locale={{ emptyText: 'Chưa có dữ liệu xếp hạng CC Thưởng' }}
          onRow={(record) => ({
            onClick: () => {
              const newCc = selectedCcName === record.displayName ? null : record.displayName;
              setSelectedCcName(newCc);
              if (parentOnSelectConsultant) {
                parentOnSelectConsultant(newCc || 'ALL');
              }
            },
            className: 'cursor-pointer hover:bg-amber-500/5 transition-colors',
            style: {
              background:
                selectedCcName === record.displayName
                  ? themeMode === 'dark'
                    ? 'rgba(212, 168, 75, 0.15)'
                    : 'rgba(212, 168, 75, 0.08)'
                  : undefined,
            },
          })}
        />
      </Card>

      {/* LEVEL 2: DAILY BONUS REPORT TABLE */}
      <Card
        title={
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base" style={{ color: token.colorText }}>
                Bảng Dữ Liệu Báo Cáo CC Thưởng (Chi Tiết Thưởng Theo Ngày)
              </span>
              {selectedCcName && (
                <Tag color="gold" closable onClose={() => setSelectedCcName(null)}>
                  Đang xem: {selectedCcName}
                </Tag>
              )}
              <Tooltip title="Click vào một dòng ngày cụ thể để xem danh sách giao dịch chi tiết trong ngày (Drill-down Cấp 3)">
                <InfoCircleOutlined className="text-gray-400" />
              </Tooltip>
            </div>

            <Space wrap>
              <Input
                prefix={<SearchOutlined />}
                placeholder="Tìm ngày, CC..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 220 }}
                allowClear
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
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        className="full-bleed-card shadow-sm rounded-xl"
      >
        <Table
          dataSource={filteredDailyData}
          columns={dailyColumns}
          rowKey={(r) => `${r.date}-${r.user_id}`}
          loading={loading || parentLoading}
          size="small"
          bordered
          scroll={{ x: 1300 }}
          pagination={{
            defaultPageSize: 20,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showTotal: (totalCount) => `Tổng cộng ${totalCount} bản ghi thưởng ngày`,
          }}
          className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
          locale={{ emptyText: 'Không có dữ liệu thưởng CC trong khoảng thời gian này' }}
          onRow={(record) => ({
            onClick: () => {
              // Open Level 3 drill-down modal for that specific date & CC
              setSelectedTxDate(record.date);
              setSelectedTxConsultantId(record.user_id);
              setSelectedTxConsultantName(record.consultant_name);
              setTxModalOpen(true);
            },
            className: 'cursor-pointer hover:bg-amber-500/10 transition-colors',
          })}
        />
      </Card>

      {/* CONFIG MODAL */}
      <CcThuongConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onSaveSuccess={() => {
          fetchData();
        }}
      />

      {/* LEVEL 3 TRANSACTIONS DRILL-DOWN MODAL */}
      <CcThuongTransactionsModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        date={selectedTxDate}
        consultantId={selectedTxConsultantId}
        consultantName={selectedTxConsultantName}
      />
    </div>
  );
}
