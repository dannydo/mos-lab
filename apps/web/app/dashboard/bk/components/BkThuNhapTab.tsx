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
} from '@ant-design/icons';
import { BkPaystubRecord } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import BkAvatar from './BkAvatar';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';

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
}

export default function BkThuNhapTab({ dateRange, selectedStore, selectedBooker }: BkThuNhapTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  const [loading, setLoading] = useState(false);
  const [paystubs, setPaystubs] = useState<BkPaystubRecord[]>([]);
  const [summary, setSummary] = useState({
    totalBaseSalary: 0,
    totalDoneBonus: 0,
    totalTipBonus: 0,
    totalRevenueBonus: 0,
    grandTotalIncome: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [activePaystub, setActivePaystub] = useState<BkPaystubRecord | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const fetchPaystub = async () => {
    setLoading(true);
    try {
      const res = await apiClient.bk.getPaystub({
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore,
      });
      setPaystubs(res.data || []);
      setSummary(
        res.summary || {
          totalBaseSalary: 0,
          totalDoneBonus: 0,
          totalTipBonus: 0,
          totalRevenueBonus: 0,
          grandTotalIncome: 0,
        }
      );
    } catch (err) {
      console.error('Error loading BK paystub', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaystub();
  }, [dateRange, selectedStore]);

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
        <span className="tabular-nums text-xs text-slate-400 font-medium whitespace-nowrap">
          {val} / {r.standardWorkDays} ngày
        </span>
      ),
    },
    {
      title: 'Lương Cứng',
      dataIndex: 'calculatedBaseSalary',
      key: 'calculatedBaseSalary',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-blue-400">{formatCurrency(val)}</span>
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
      title: 'Tổng Thu Nhập Tạm Tính',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-sm text-emerald-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Chi tiết',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: BkPaystubRecord) => (
        <Button
          type="default"
          size="small"
          icon={<EyeOutlined className="text-amber-400" />}
          className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
          onClick={() => openBreakdownModal(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
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
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
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
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Tip & Doanh Thu</span>}
              value={summary.totalTipBonus + summary.totalRevenueBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#9333ea', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<TrophyOutlined className="mr-2" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
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

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center mt-6">
              <div className="font-bold text-base text-emerald-700 dark:text-emerald-300">∑ THU NHẬP TẠM TÍNH</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activePaystub.totalIncome)}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
