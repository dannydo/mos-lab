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
  Tooltip,
  message,
  Pagination,
} from 'antd';
import {
  TrophyOutlined,
  UsergroupAddOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  CrownOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import { CcDiamondEntry, CcDiamondResponse, removeVietnameseTones } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import { useResponsiveTier } from '../../../../hooks/useResponsiveTier';
import { MobileRecordList } from '../../../../components/ui/MobileRecordList';
import { IconButton, SearchField } from '../../../../components/ui';
import CcAvatar from './CcAvatar';
import CcDiamondDetailModal from './CcDiamondDetailModal';
import CcPeriodComparison from './CcPeriodComparison';

const { Text } = Typography;
const MOBILE_DIAMOND_PAGE_SIZE = 15;

interface CcDiamondTabProps {
  loading?: boolean;
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  selectedConsultant?: string;
  comparisonMode?: 'month' | 'week' | 'day';
  onClearConsultant?: () => void;
}

export default function CcDiamondTab({
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant = 'ALL',
  comparisonMode = 'month',
  onClearConsultant,
}: CcDiamondTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const responsiveTier = useResponsiveTier();
  const isMobile = responsiveTier === 'mobile';

  const [loading, setLoading] = useState(false);
  const [diamondData, setDiamondData] = useState<CcDiamondResponse | null>(null);
  const [searchText, setSearchText] = useState('');
  const [mobilePage, setMobilePage] = useState(1);

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
        comparisonMode,
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
  }, [comparisonMode, dateRange]);

  const selectedPeriodKey = `${dateRange?.[0]?.valueOf() ?? ''}:${dateRange?.[1]?.valueOf() ?? ''}`;

  useEffect(() => {
    setMobilePage(1);
  }, [selectedPeriodKey, selectedConsultant, selectedStore]);

  const allDiamondRecords = diamondData?.data || [];
  const consultantScopedData = allDiamondRecords.filter((item) => {
    return (
      selectedConsultant === 'ALL' || removeVietnameseTones(item.tenCc) === removeVietnameseTones(selectedConsultant)
    );
  });

  // A text search narrows only the table/list. The global CC selector above also scopes the summary cards.
  const filteredData = consultantScopedData.filter((item) => {
    const q = removeVietnameseTones(searchText);
    const matchesSearch =
      !searchText || removeVietnameseTones(item.tenCc).includes(q) || String(item.ccId).includes(searchText);
    return matchesSearch;
  });

  const totalReferrals = consultantScopedData.reduce((sum, record) => sum + record.soKhachDiamond, 0);
  const totalBonus = consultantScopedData.reduce((sum, record) => sum + record.thuongDiamond, 0);
  const topCc = consultantScopedData[0] || null;
  const rewardRecipientCount = consultantScopedData.filter((record) => record.thuongDiamond > 0).length;
  const isConsultantFiltered = selectedConsultant !== 'ALL';
  const periodLabel = dateRange?.[0]?.format('MM/YYYY');
  const visibleDiamondRecordCount = filteredData.length;
  const totalDiamondRecordCount = allDiamondRecords.length;

  // Format currency
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const getReferralRatio = (record: CcDiamondEntry) =>
    record.tongKhach > 0 ? ((record.soKhachDiamond / record.tongKhach) * 100).toFixed(1) : '0.0';

  const isDiamondQualified = (record: CcDiamondEntry, ratio = getReferralRatio(record)) =>
    record.datDieuKien ?? Number(ratio) >= 3.0;

  const openDiamondDetail = (record: CcDiamondEntry) => {
    setSelectedCcRecord(record);
    setDetailModalOpen(true);
  };

  const mobilePageCount = Math.max(1, Math.ceil(filteredData.length / MOBILE_DIAMOND_PAGE_SIZE));
  const currentMobilePage = Math.min(mobilePage, mobilePageCount);
  const mobileDiamondRecords = filteredData.slice(
    (currentMobilePage - 1) * MOBILE_DIAMOND_PAGE_SIZE,
    currentMobilePage * MOBILE_DIAMOND_PAGE_SIZE
  );

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
          <div className="min-w-0">
            <Text className="font-semibold text-slate-800 dark:text-slate-200">{text}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1">
          <span>∑ Khách Đã Tiếp</span>
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
        const ratio = getReferralRatio(record);
        const isQualified = isDiamondQualified(record, ratio);
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
            openDiamondDetail(record);
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
      <Row gutter={[16, 16]} className="cc-diamond-summary-row">
        <Col xs={24} sm={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl"
            style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff' }}
          >
            <Statistic
              title={<span className="text-slate-500 dark:text-slate-400 font-medium">∑ Khách Giới Thiệu</span>}
              value={totalReferrals}
              prefix={<UsergroupAddOutlined className="text-cyan-500 mr-2" />}
              suffix="khách"
              valueStyle={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#38bdf8' : '#0284c7',
              }}
            />
            <CcPeriodComparison
              comparison={diamondData?.comparison}
              currentValue={totalReferrals}
              previousValue={diamondData?.comparison?.totalReferralGuests || 0}
              formatter={(value) => `${value.toLocaleString('vi-VN')} khách`}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl"
            style={{ background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff' }}
          >
            <Statistic
              title={<span className="text-slate-500 dark:text-slate-400 font-medium">∑ Thưởng Kim Cương</span>}
              value={totalBonus}
              formatter={(val) => formatCurrency(Number(val))}
              prefix={<DollarOutlined className="text-emerald-500 mr-2" />}
              valueStyle={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 'bold',
                color: themeMode === 'dark' ? '#34d399' : '#059669',
              }}
            />
            <CcPeriodComparison
              comparison={diamondData?.comparison}
              currentValue={totalBonus}
              previousValue={diamondData?.comparison?.totalDiamondBonus || 0}
              formatter={formatCurrency}
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
        <div className="diamond-program-panel diamond-program-panel-expanded">
          <div className="diamond-program-heading">
            <div className="flex min-w-0 items-center gap-3">
              <div className="diamond-program-icon" aria-hidden="true">
                <TrophyOutlined />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">Thưởng Kim Cương</span>
                  <Tooltip title="Số khách giới thiệu phải chiếm tối thiểu 3% tổng lượt khách phục vụ trong kỳ để được nhận thưởng.">
                    <Tag color="gold" className="m-0 diamond-program-threshold">
                      Tỷ lệ tối thiểu 3%
                    </Tag>
                  </Tooltip>
                </div>
                <p className="diamond-program-description">Thưởng theo số khách giới thiệu mới trong kỳ.</p>
              </div>
            </div>

            <div className="diamond-tier-grid" aria-label="Các mốc thưởng Kim Cương">
              {[
                { label: '1 khách', value: '5K đ' },
                { label: '2 khách', value: '10K đ' },
                { label: '3 khách', value: '20K đ' },
                { label: '4 khách', value: '30K đ' },
                { label: '5 khách', value: '40K đ' },
                { label: 'Từ 6 khách', value: '50K đ / khách', featured: true },
              ].map((tier) => (
                <div className={`diamond-tier ${tier.featured ? 'diamond-tier-featured' : ''}`} key={tier.label}>
                  <span>{tier.label}</span>
                  <strong className="tabular-nums">{tier.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="diamond-table-toolbar">
            <SearchField
              aria-label="Tìm kiếm tư vấn viên Kim Cương"
              placeholder="Tìm tư vấn viên..."
              behavior="filter"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setMobilePage(1);
              }}
              className="diamond-table-search"
              allowClear
            />
            <IconButton
              label="Làm mới dữ liệu Kim Cương"
              icon={RefreshCw}
              onClick={fetchDiamondData}
              loading={loading}
              iconClassName={loading ? 'animate-spin' : undefined}
            />
          </div>

          {isMobile && diamondData ? (
            <div
              className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300"
              role="status"
            >
              <FilterOutlined
                aria-hidden
                className={isConsultantFiltered ? 'shrink-0 text-amber-500' : 'shrink-0 text-slate-400'}
              />
              <div className="min-w-0 flex-1">
                <div className="font-semibold tabular-nums text-slate-700 dark:text-slate-100">
                  Hiển thị {visibleDiamondRecordCount}/{totalDiamondRecordCount} CC
                </div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {isConsultantFiltered
                    ? `Đang lọc: ${selectedConsultant}`
                    : rewardRecipientCount > 0
                      ? `${rewardRecipientCount} CC nhận thưởng trong kỳ`
                      : `Kỳ ${periodLabel || 'đang chọn'} chưa có CC đạt mốc thưởng`}
                </div>
              </div>
              {isConsultantFiltered ? (
                onClearConsultant ? (
                  <Button
                    type="link"
                    size="small"
                    className="!h-auto shrink-0 !px-1 text-xs font-semibold"
                    onClick={onClearConsultant}
                  >
                    Xem tất cả
                  </Button>
                ) : null
              ) : null}
            </div>
          ) : null}
        </div>

        {isMobile ? (
          <div className="px-3 pb-3">
            <MobileRecordList
              records={mobileDiamondRecords}
              getKey={(record) => record.ccId}
              loading={loading}
              emptyDescription="Chưa có dữ liệu Kim Cương"
              renderRecord={(record) => {
                const ratio = getReferralRatio(record);
                const isQualified = isDiamondQualified(record, ratio);
                const hasReferrals = record.soKhachDiamond > 0;
                const rankLabel = record.rank === 1 ? 'Top 1' : `#${record.rank}`;

                return (
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                          record.rank === 1
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                        aria-label={`Hạng ${rankLabel}`}
                      >
                        {record.rank === 1 ? <CrownOutlined /> : rankLabel}
                      </div>
                      <CcAvatar name={record.tenCc} src={record.avatar} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{record.tenCc}</div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Tư vấn viên</div>
                      </div>
                      <Tag
                        color={hasReferrals ? 'cyan' : 'default'}
                        className="m-0 shrink-0 whitespace-nowrap px-2 py-1 text-xs font-semibold"
                      >
                        💎 {record.soKhachDiamond} khách
                      </Tag>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Khách đã tiếp</div>
                        <div className="mt-1 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                          {record.tongKhach.toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Tỷ lệ giới thiệu</div>
                        <div className="mt-1">
                          {isQualified && hasReferrals ? (
                            <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                              ✓ {ratio}%
                            </span>
                          ) : hasReferrals ? (
                            <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                              {ratio}%
                            </span>
                          ) : (
                            <span className="font-semibold tabular-nums text-slate-500">{ratio}%</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500 dark:text-slate-400">Thưởng Kim Cương</div>
                        {record.thuongDiamond > 0 ? (
                          <div className="mt-0.5 whitespace-nowrap font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(record.thuongDiamond)}
                          </div>
                        ) : record.potentialThuong && record.potentialThuong > 0 ? (
                          <div className="mt-0.5 whitespace-nowrap font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                            0 đ <span className="text-xs font-medium text-rose-500 dark:text-rose-400">· cần ≥3%</span>
                          </div>
                        ) : (
                          <div className="mt-0.5 whitespace-nowrap font-semibold tabular-nums text-slate-500 dark:text-slate-300">
                            0 đ
                          </div>
                        )}
                      </div>
                      <Tooltip title="Xem chi tiết">
                        <Button
                          aria-label={`Xem chi tiết Kim Cương của ${record.tenCc}`}
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={() => openDiamondDetail(record)}
                          className="h-8 w-8 shrink-0 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/40"
                        />
                      </Tooltip>
                    </div>
                  </div>
                );
              }}
            />
            {filteredData.length > MOBILE_DIAMOND_PAGE_SIZE ? (
              <div className="responsive-mobile-pagination">
                <Pagination
                  current={currentMobilePage}
                  pageSize={MOBILE_DIAMOND_PAGE_SIZE}
                  total={filteredData.length}
                  showSizeChanger={false}
                  showLessItems
                  onChange={setMobilePage}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="ccId"
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            className="antd-custom-table"
            onRow={(record) => ({
              onClick: () => openDiamondDetail(record),
              className: 'cursor-pointer hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20 transition-colors',
            })}
          />
        )}
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
