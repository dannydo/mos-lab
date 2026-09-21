'use client';

import { MobileRecordList, TableIndexHeader } from '~/components/ui';

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Modal, Typography, Row, Col, Statistic, theme, Space, Button, Tooltip } from 'antd';
import {
  WalletOutlined,
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  TrophyOutlined,
  CompressOutlined,
  ExpandOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { BkPaystubRecord, BkWorkLogRecord, BkWorkLogResponse, type ReportComparisonMode } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import BkAvatar from './BkAvatar';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { usePreviousReportPeriod } from '../../../../hooks/usePreviousReportPeriod';
import PeriodComparison from '../../../../components/ui/PeriodComparison';

const { Text, Title } = Typography;

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'HQ';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('HQ') || s.includes('HEAD')) return 'HQ';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

interface BkThuNhapTabProps {
  dateRange: [any, any];
  selectedStore: string;
  selectedBooker: string;
  comparisonMode: ReportComparisonMode;
}

export default function BkThuNhapTab({ dateRange, selectedStore, selectedBooker, comparisonMode }: BkThuNhapTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [paystubs, setPaystubs] = useState<BkPaystubRecord[]>([]);
  const [summary, setSummary] = useState({
    totalBaseSalary: 0,
    totalDoneBonus: 0,
    totalTipBonus: 0,
    totalRevenueBonus: 0,
    totalHolidayBasePay: 0,
    totalHolidayPremiumPay: 0,
    totalHolidayPayrollAddition: 0,
    grandTotalIncome: 0,
  });
  const [previousSummary, setPreviousSummary] = useState<{
    totalBaseSalary: number;
    totalDoneBonus: number;
    totalTipBonus: number;
    totalRevenueBonus: number;
    totalHolidayBasePay: number;
    totalHolidayPremiumPay: number;
    totalHolidayPayrollAddition: number;
    grandTotalIncome: number;
  } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [activePaystub, setActivePaystub] = useState<BkPaystubRecord | null>(null);

  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [workLogRecord, setWorkLogRecord] = useState<BkPaystubRecord | null>(null);
  const [workLogData, setWorkLogData] = useState<BkWorkLogResponse | null>(null);

  const handleOpenWorkLogs = async (record: BkPaystubRecord) => {
    setWorkLogRecord(record);
    setWorkLogModalOpen(true);
    setWorkLogLoading(true);
    try {
      const res = await apiClient.bk.getWorkLogs({
        staffId: record.staffId,
        dateFrom: dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
        dateTo: dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
      });
      setWorkLogData(res);
    } catch (err) {
      console.error('Error fetching BK work logs:', err);
    } finally {
      setWorkLogLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const fetchPaystub = async () => {
    setLoading(true);
    try {
      const [res, previousRes] = await Promise.all([
        apiClient.bk.getPaystub({
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
          storeId: selectedStore,
        }),
        previousPeriod
          ? apiClient.bk.getPaystub({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);
      setPaystubs(res.data || []);
      setSummary(
        res.summary || {
          totalBaseSalary: 0,
          totalDoneBonus: 0,
          totalTipBonus: 0,
          totalRevenueBonus: 0,
          totalHolidayBasePay: 0,
          totalHolidayPremiumPay: 0,
          totalHolidayPayrollAddition: 0,
          grandTotalIncome: 0,
        }
      );
      setPreviousSummary(previousRes?.summary || null);
    } catch (err) {
      console.error('Error loading BK paystub', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaystub();
  }, [dateRange, previousPeriod, selectedStore]);

  const openBreakdownModal = (record: BkPaystubRecord) => {
    setActivePaystub(record);
    setModalOpen(true);
  };

  const columns = [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums font-semibold text-slate-500 text-xs">#{index + 1}</span>
      ),
    },
    {
      title: 'Booker',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name: string, record: BkPaystubRecord) => (
        <Space className="whitespace-nowrap" size={8}>
          <BkAvatar name={name} src={record.avatar} size={32} />
          <div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-semibold text-xs whitespace-nowrap" style={{ color: token.colorText }}>
                {name}
              </span>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                · {formatStoreCode(record.store)}
              </span>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số Ngày Công',
      dataIndex: 'actualWorkDays',
      key: 'actualWorkDays',
      align: 'center' as const,
      render: (val: number, r: BkPaystubRecord) => (
        <Tooltip title="Click để xem Báo Cáo Chi Tiết Ca Làm Việc (IN/OUT) từng ngày">
          <div
            className="flex flex-col items-center justify-center cursor-pointer hover:bg-blue-500/10 p-1 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
            role="button"
            tabIndex={0}
            onClick={() => handleOpenWorkLogs(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenWorkLogs(r);
              }
            }}
          >
            <span className="tabular-nums text-xs text-blue-400 font-semibold whitespace-nowrap hover:underline underline-offset-2">
              {val} / {r.standardWorkDays} ngày
            </span>
            {r.actualCheckInDays !== undefined && r.actualCheckInDays !== val && (
              <span className="text-[10px] text-emerald-500 tabular-nums">
                ({r.actualCheckInDays} máy{' '}
                {r.workDaysAdjustment && r.workDaysAdjustment > 0 ? `+${r.workDaysAdjustment}` : r.workDaysAdjustment}{' '}
                duyệt)
              </span>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Lương Cứng',
      dataIndex: 'calculatedBaseSalary',
      key: 'calculatedBaseSalary',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => (
        <Tooltip title="Click để xem chi tiết chấm công & ca làm việc (IN/OUT)">
          <div
            className="cursor-pointer hover:bg-blue-500/10 p-1 rounded-lg transition-colors border border-transparent hover:border-blue-500/30 inline-block text-right"
            role="button"
            tabIndex={0}
            onClick={() => handleOpenWorkLogs(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenWorkLogs(r);
              }
            }}
          >
            <span className="tabular-nums font-semibold text-xs text-blue-400 hover:underline underline-offset-2">
              {formatCurrency(val)}
            </span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng Done',
      dataIndex: 'doneBonus',
      key: 'doneBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-emerald-400">+{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Thưởng BK Tip',
      dataIndex: 'tipBonus',
      key: 'tipBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-pink-400">+{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Thưởng Doanh Thu',
      dataIndex: 'revenueBonus',
      key: 'revenueBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-purple-400">+{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Phụ cấp lễ x3',
      dataIndex: 'holidayPremiumPay',
      key: 'holidayPremiumPay',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-rose-400">+{formatCurrency(val || 0)}</span>
      ),
    },
    {
      title: 'Tổng Thu Nhập Tạm Tính',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-sm text-emerald-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: BkPaystubRecord) => (
        <Space size={6}>
          <Button
            type="default"
            size="small"
            icon={<ClockCircleOutlined className="text-blue-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-blue-400 hover:text-blue-400 px-2"
            onClick={() => handleOpenWorkLogs(record)}
          >
            Chấm công
          </Button>
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined className="text-amber-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
            onClick={() => openBreakdownModal(record)}
          >
            Phiếu lương
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Lương Cứng</span>}
              value={summary.totalBaseSalary}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#2563eb', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<WalletOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalBaseSalary}
              previousValue={previousSummary?.totalBaseSalary || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Done</span>}
              value={summary.totalDoneBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#10b981', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<CheckCircleOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalDoneBonus}
              previousValue={previousSummary?.totalDoneBonus || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Doanh Thu</span>}
              value={summary.totalRevenueBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#9333ea', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<TrophyOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalRevenueBonus}
              previousValue={previousSummary?.totalRevenueBonus || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Tip</span>}
              value={summary.totalTipBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#ec4899', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<GiftOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalTipBonus}
              previousValue={previousSummary?.totalTipBonus || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thu Nhập Tạm Tính</span>}
              value={summary.grandTotalIncome}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#059669', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<DollarOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.grandTotalIncome}
              previousValue={previousSummary?.grandTotalIncome || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
          </Card>
        </Col>
      </Row>

      {/* Paystub Table */}
      <Card
        className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-6"
        style={{ background: token.colorBgContainer, marginTop: '24px' }}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <WalletOutlined className="text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold m-0" style={{ color: token.colorText }}>
                Bảng Lương Live Paystub Booker
              </h3>
              <Text type="secondary" className="text-xs">
                Tổng hợp thu nhập tự động cho Booker trong tháng / chu kỳ lọc
              </Text>
            </div>
          </div>

          <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
            <Button
              icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
              size="small"
              onClick={() => setIsCompact(!isCompact)}
              className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
            />
          </Tooltip>
        </div>

        {isMobile ? (
          <div className="p-3">
            <MobileRecordList
              records={paystubs}
              loading={loading}
              getKey={(record) => String(record.staffId)}
              emptyDescription="Chưa có dữ liệu thu nhập Booker"
              renderRecord={(record, index) => (
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                      #{index + 1}
                    </span>
                    <BkAvatar name={record.staffName} src={record.avatar} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold" style={{ color: token.colorText }}>
                        {record.staffName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatStoreCode(record.store)} · {record.actualWorkDays}/{record.standardWorkDays} ngày
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Lương cứng</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-sky-400">
                        {formatCurrency(record.calculatedBaseSalary || 0)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thưởng</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-emerald-400">
                        +{formatCurrency((record.doneBonus || 0) + (record.tipBonus || 0) + (record.revenueBonus || 0))}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Phụ cấp lễ x3</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-rose-400">
                        +{formatCurrency(record.holidayPremiumPay || 0)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thu nhập</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-amber-400">
                        {formatCurrency(record.totalIncome || 0)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="small"
                      icon={<EyeOutlined className="text-amber-400" />}
                      onClick={() => openBreakdownModal(record)}
                    >
                      Chi tiết
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <Table
            dataSource={paystubs}
            columns={columns}
            rowKey="staffId"
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
          />
        )}
      </Card>

      {/* Breakdown Modal */}
      {activePaystub && (
        <Modal
          title={
            <div className="flex items-center gap-2">
              <WalletOutlined className="text-emerald-500 text-lg" />
              <span>
                Phiếu Lương Chi Tiết - Booker: <strong className="text-emerald-600">{activePaystub.staffName}</strong>
              </span>
            </div>
          }
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={650}
          destroyOnHidden
        >
          <div className="space-y-4 py-3 tabular-nums">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Lương Cứng Tính Theo Ngày Công</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {formatCurrency(activePaystub.monthlyBaseSalary)} / {activePaystub.standardWorkDays} ngày x{' '}
                  {activePaystub.actualWorkDays} ngày thực tế
                  {activePaystub.actualCheckInDays !== undefined &&
                    activePaystub.actualCheckInDays !== activePaystub.actualWorkDays && (
                      <span className="text-xs text-emerald-500 ml-1.5 font-normal">
                        ({activePaystub.actualCheckInDays} ngày máy{' '}
                        {activePaystub.workDaysAdjustment && activePaystub.workDaysAdjustment > 0
                          ? `+${activePaystub.workDaysAdjustment}`
                          : activePaystub.workDaysAdjustment}{' '}
                        ngày duyệt bù)
                      </span>
                    )}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <Button
                    type="link"
                    size="small"
                    icon={<ClockCircleOutlined />}
                    className="text-xs text-blue-500 p-0 h-auto font-medium"
                    onClick={() => {
                      setModalOpen(false);
                      handleOpenWorkLogs(activePaystub);
                    }}
                  >
                    Xem chi tiết chấm công IN/OUT từng ngày →
                  </Button>
                </div>
              </div>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(activePaystub.calculatedBaseSalary)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Thưởng Đơn Completed (Done)</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Gồm thưởng lượt Done, Promo & Mốc thưởng
                </div>
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(activePaystub.doneBonus)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Thưởng BK Tip (% Share)</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Phần % thưởng Tip khách cho trên các đơn book
                </div>
              </div>
              <div className="text-base font-bold text-pink-600 dark:text-pink-400">
                +{formatCurrency(activePaystub.tipBonus)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Thưởng Hoa Hồng Doanh Thu</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Tính trên Tổng doanh thu đơn Completed (Lẻ + Combo + SP)
                </div>
              </div>
              <div className="text-base font-bold text-purple-600 dark:text-purple-400">
                +{formatCurrency(activePaystub.revenueBonus)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex justify-between items-center">
              <div>
                <div className="text-xs text-rose-600 dark:text-rose-300 font-semibold uppercase">Lương ngày lễ 1x</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {activePaystub.holidayWorkedHours || 0} giờ làm + {activePaystub.holidayPaidLeaveHours || 0} giờ nghỉ
                  lễ; 1x đã nằm trong lương tháng
                </div>
              </div>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(activePaystub.holidayBasePay || 0)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex justify-between items-center">
              <div>
                <div className="text-xs text-rose-600 dark:text-rose-300 font-semibold uppercase">
                  Phụ cấp đi làm lễ x3
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {activePaystub.holidayWorkedDays || 0} ngày có roster và chấm công hợp lệ
                </div>
              </div>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                +{formatCurrency(activePaystub.holidayPremiumPay || 0)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center mt-6">
              <div className="font-bold text-base text-emerald-700 dark:text-emerald-300">∑ THU NHẬP TẠM TÍNH</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activePaystub.totalIncome)}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Báo Cáo Chấm Công IN/OUT Chi Tiết */}
      {workLogRecord && (
        <Modal
          title={
            <div className="flex items-center gap-2">
              <ClockCircleOutlined className="text-blue-500 text-lg" />
              <span>
                Báo Cáo Chi Tiết Chấm Công (IN/OUT) - Booker:{' '}
                <strong className="text-blue-600 dark:text-blue-400">{workLogRecord.staffName}</strong>
              </span>
              <Tag color={workLogRecord.store === 'PXL' ? 'blue' : 'purple'} className="ml-2 font-mono">
                {workLogRecord.store}
              </Tag>
            </div>
          }
          open={workLogModalOpen}
          onCancel={() => setWorkLogModalOpen(false)}
          footer={null}
          width={880}
          destroyOnHidden
        >
          {workLogLoading ? (
            <div className="py-12 flex flex-col justify-center items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Đang tải dữ liệu quẹt thẻ...</span>
            </div>
          ) : workLogData ? (
            <div className="space-y-4 py-2">
              {/* Summary Stats */}
              <Row gutter={[12, 12]}>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                  >
                    <Statistic
                      title={<span className="text-xs text-slate-500 uppercase font-semibold">∑ Ngày Đi Làm</span>}
                      value={`${workLogData.actualWorkDays} / ${workLogData.standardWorkDays}`}
                      suffix="ngày"
                      className="[&_.ant-statistic-content-value]:text-blue-600 dark:[&_.ant-statistic-content-value]:text-blue-400"
                      valueStyle={{ fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      prefix={<CalendarOutlined className="text-blue-600 dark:text-blue-400" />}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                  >
                    <Statistic
                      title={<span className="text-xs text-slate-500 uppercase font-semibold">∑ Quẹt Thẻ Máy</span>}
                      value={workLogData.actualCheckInDays}
                      suffix={
                        workLogData.workDaysAdjustment > 0 ? `(+${workLogData.workDaysAdjustment} duyệt)` : 'ngày'
                      }
                      className="[&_.ant-statistic-content-value]:text-emerald-600 dark:[&_.ant-statistic-content-value]:text-emerald-400"
                      valueStyle={{ fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      prefix={<CheckCircleOutlined className="text-emerald-600 dark:text-emerald-400" />}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                  >
                    <Statistic
                      title={<span className="text-xs text-slate-500 uppercase font-semibold">∑ Giờ Làm Việc</span>}
                      value={workLogData.summary.totalWorkingHours}
                      suffix="giờ"
                      className="[&_.ant-statistic-content-value]:text-purple-600 dark:[&_.ant-statistic-content-value]:text-purple-400"
                      valueStyle={{ fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      prefix={<ClockCircleOutlined className="text-purple-600 dark:text-purple-400" />}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                  >
                    <Statistic
                      title={<span className="text-xs text-slate-500 uppercase font-semibold">∑ Lương Cứng Nhận</span>}
                      value={workLogData.calculatedBaseSalary}
                      formatter={(val) => formatCurrency(Number(val))}
                      className="[&_.ant-statistic-content-value]:text-sky-600 dark:[&_.ant-statistic-content-value]:text-sky-400"
                      valueStyle={{ fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      prefix={<DollarOutlined className="text-sky-600 dark:text-sky-400" />}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Table of Daily IN/OUT */}
              <Table
                dataSource={workLogData.data}
                rowKey="workDate"
                size="small"
                pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '31', '50'] }}
                bordered
                columns={[
                  {
                    title: 'Ngày Làm Việc',
                    dataIndex: 'workDate',
                    key: 'workDate',
                    width: 140,
                    render: (val: string, r: BkWorkLogRecord) => (
                      <div className="flex flex-col">
                        <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200 text-xs">
                          {val}
                        </span>
                        <span className="text-[11px] text-slate-500">{r.dayOfWeek}</span>
                      </div>
                    ),
                  },
                  {
                    title: 'Giờ Vào (IN)',
                    dataIndex: 'firstIn',
                    key: 'firstIn',
                    align: 'center' as const,
                    width: 130,
                    render: (val: string | null) =>
                      val ? (
                        <Tag
                          color="green"
                          className="tabular-nums font-mono font-semibold m-0 text-xs py-0.5 px-2 inline-flex items-center"
                        >
                          <LoginOutlined className="mr-1" /> {val}
                        </Tag>
                      ) : (
                        <Tag className="tabular-nums text-slate-400 m-0 text-[11px]">Chưa quẹt IN</Tag>
                      ),
                  },
                  {
                    title: 'Giờ Ra (OUT)',
                    dataIndex: 'lastOut',
                    key: 'lastOut',
                    align: 'center' as const,
                    width: 130,
                    render: (val: string | null) =>
                      val ? (
                        <Tag
                          color="volcano"
                          className="tabular-nums font-mono font-semibold m-0 text-xs py-0.5 px-2 inline-flex items-center"
                        >
                          <LogoutOutlined className="mr-1" /> {val}
                        </Tag>
                      ) : (
                        <Tag className="tabular-nums text-slate-400 m-0 text-[11px]">Chưa quẹt OUT</Tag>
                      ),
                  },
                  {
                    title: 'Thời Gian Làm',
                    dataIndex: 'workingMinute',
                    key: 'workingMinute',
                    align: 'right' as const,
                    width: 130,
                    render: (val: number, r: BkWorkLogRecord) => (
                      <div className="text-right">
                        <span className="tabular-nums font-semibold text-xs text-slate-700 dark:text-slate-300">
                          {val > 0 ? `${val} phút` : '--'}
                        </span>
                        {val > 0 && <span className="block text-[10px] text-slate-400">({r.totalHours}h)</span>}
                      </div>
                    ),
                  },
                  {
                    title: 'Trạng Thái',
                    dataIndex: 'isCheckIn',
                    key: 'isCheckIn',
                    align: 'center' as const,
                    width: 130,
                    render: (isCheckIn: boolean, r: BkWorkLogRecord) => {
                      if (isCheckIn) {
                        return (
                          <Tag color="success" className="text-[11px] m-0">
                            Đủ công
                          </Tag>
                        );
                      }
                      if (r.dayOfWeek === 'Chủ Nhật') {
                        return (
                          <Tag color="default" className="text-[11px] m-0 text-slate-400">
                            Chủ Nhật (OFF)
                          </Tag>
                        );
                      }
                      return (
                        <Tag color="warning" className="text-[11px] m-0">
                          Nghỉ (OFF)
                        </Tag>
                      );
                    },
                  },
                  {
                    title: 'Lương Ngày',
                    dataIndex: 'dailySalary',
                    key: 'dailySalary',
                    align: 'right' as const,
                    width: 130,
                    render: (val: number) => (
                      <span
                        className={`tabular-nums font-semibold text-xs ${val > 0 ? 'text-blue-500' : 'text-slate-400'}`}
                      >
                        {val > 0 ? formatCurrency(val) : '0 ₫'}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  );
}
