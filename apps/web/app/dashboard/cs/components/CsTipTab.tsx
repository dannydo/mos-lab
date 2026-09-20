'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, Segmented, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Store, Heart, User, Users, Zap, Search, RotateCw, Receipt, Coins, CircleSlash, XCircle } from 'lucide-react';
import { CsTipQueryParams, CsTipRecord, CsTipResponse, CsTipStoreBreakdown } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { AppIcon, CollapsibleSearchField, CopyPhoneButton, DataTable } from '~/components/ui';
import CsTipSummaryCards from './CsTipSummaryCards';

interface CsTipTabProps {
  dateFrom?: string;
  dateTo?: string;
  selectedStore?: string;
}

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export default function CsTipTab({ dateFrom, dateTo, selectedStore = 'ALL' }: CsTipTabProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CsTipResponse | null>(null);

  // Filters for order records
  const [customerType, setCustomerType] = useState<'ALL' | 'LOCA' | 'SINGLE'>('ALL');
  const [tipFilter, setTipFilter] = useState<'ALL' | 'TIPPED' | 'NO_TIP'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const fetchData = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const params: CsTipQueryParams = {
        dateFrom,
        dateTo,
        storeId: selectedStore,
        customerType,
        tipFilter,
        search: search || undefined,
        page,
        limit,
      };
      const res = await apiClient.cs.getTip(params);
      setData(res);
    } catch (err) {
      console.error('Error fetching CS tip data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedStore, customerType, tipFilter, search, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCustomerTypeChange = (val: 'ALL' | 'LOCA' | 'SINGLE') => {
    setCustomerType(val);
    setPage(1);
  };

  const handleTipFilterChange = (val: 'ALL' | 'TIPPED' | 'NO_TIP') => {
    setTipFilter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setCustomerType('ALL');
    setTipFilter('ALL');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = customerType !== 'ALL' || tipFilter !== 'ALL' || Boolean(search);

  // 1. Columns for Store Breakdown Table
  const storeColumns: ColumnsType<CsTipStoreBreakdown> = [
    {
      title: 'Cơ Sở / Chi Nhánh',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (name: string, record) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {record.storeKey}
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{name}</span>
        </div>
      ),
    },
    {
      title: 'Lượt Ghé',
      dataIndex: 'totalVisits',
      key: 'totalVisits',
      align: 'right',
      render: (val: number, record) => (
        <span className="tabular-nums text-slate-700 dark:text-slate-300">
          <span className="font-semibold">{record.totalTippedVisits}</span> / {val} có tip
        </span>
      ),
    },
    {
      title: 'Tip LoCa (Combo Live)',
      dataIndex: 'locaCustomerTip',
      key: 'locaCustomerTip',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Thưởng CS LoCa (3%)',
      dataIndex: 'locaCsTipBonus',
      key: 'locaCsTipBonus',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Tip Khách Lẻ',
      dataIndex: 'singleCustomerTip',
      key: 'singleCustomerTip',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Thưởng CS Lẻ (3%)',
      dataIndex: 'singleCsTipBonus',
      key: 'singleCsTipBonus',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-bold text-amber-700 dark:text-amber-300">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Tổng Quỹ Tip',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-extrabold text-indigo-600 dark:text-indigo-400">{formatCurrency(val)}</span>
      ),
    },
    {
      title: 'Tổng Thưởng CS (3%)',
      dataIndex: 'totalCsTipBonus',
      key: 'totalCsTipBonus',
      align: 'right',
      render: (val: number) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold tabular-nums bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
          {formatCurrency(val)}
        </span>
      ),
    },
  ];

  // 2. Columns for Orders Detail Ledger Table
  const orderColumns: ColumnsType<CsTipRecord> = [
    {
      title: 'Mã Đơn',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 85,
      render: (id: number) => (
        <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums">#{id}</span>
      ),
    },
    {
      title: 'Check-in',
      dataIndex: 'checkinTime',
      key: 'checkinTime',
      width: 120,
      render: (time: string) => {
        if (!time) return <span className="text-slate-400">—</span>;
        const d = dayjs(time);
        if (!d.isValid()) return <span className="tabular-nums text-xs text-slate-400">{time}</span>;
        return (
          <div className="tabular-nums text-xs leading-tight">
            <div className="font-semibold text-slate-700 dark:text-slate-300">{d.format('HH:mm:ss')}</div>
            <div className="text-[11px] text-slate-400">{d.format('DD/MM/YYYY')}</div>
          </div>
        );
      },
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (name: string, record) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white text-sm">{name}</div>
          {record.customerPhone && (
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums flex items-center gap-1 mt-0.5">
              <span>{record.customerPhone}</span>
              <CopyPhoneButton phone={record.customerPhone} size="xs" />
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cơ Sở',
      dataIndex: 'store',
      key: 'store',
      width: 120,
      render: (store: string) => (
        <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
          {store}
        </span>
      ),
    },
    {
      title: 'Phân Loại Khách',
      dataIndex: 'isLoCa',
      key: 'isLoCa',
      width: 135,
      render: (isLoCa: boolean) =>
        isLoCa ? (
          <span className="whitespace-nowrap inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <AppIcon icon={Heart} size={11} className="fill-emerald-500/20 text-emerald-600" /> LoCa (Combo)
          </span>
        ) : (
          <span className="whitespace-nowrap inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <AppIcon icon={User} size={11} className="text-amber-600" /> Khách Lẻ
          </span>
        ),
    },
    {
      title: 'KTV / CC Phục Vụ',
      key: 'staff',
      render: (_, record) => (
        <div className="text-xs space-y-0.5">
          {record.technicianName && (
            <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span className="text-slate-400 text-[11px]">KTV:</span>
              <span className="font-medium text-slate-900 dark:text-white">{record.technicianName}</span>
            </div>
          )}
          {record.ccName && (
            <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className="text-slate-400 text-[11px]">CC:</span>
              <span>{record.ccName}</span>
            </div>
          )}
          {!record.technicianName && !record.ccName && <span className="text-slate-400">—</span>}
        </div>
      ),
    },
    {
      title: 'Tip Khách Cho',
      dataIndex: 'totalCustomerTip',
      key: 'totalCustomerTip',
      align: 'right',
      width: 130,
      render: (tip: number, record) =>
        record.hasTip ? (
          <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap">
            {formatCurrency(tip)}
          </span>
        ) : (
          <span className="text-xs text-slate-400 tabular-nums">0 ₫</span>
        ),
    },
    {
      title: 'Thưởng CS (3%)',
      dataIndex: 'csTipBonus',
      key: 'csTipBonus',
      align: 'right',
      width: 140,
      render: (bonus: number, record) =>
        record.hasTip ? (
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-extrabold tabular-nums bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap">
            <AppIcon icon={Zap} size={11} className="text-blue-600 dark:text-blue-400" />
            {formatCurrency(bonus)}
          </span>
        ) : (
          <span className="text-xs text-slate-400 tabular-nums">0 ₫</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1. THREE MAIN KPI CARDS */}
      <CsTipSummaryCards summary={data?.summary} loading={loading && !data} />

      {/* 2. STORE BREAKDOWN SECTION */}
      <Card
        variant="outlined"
        styles={{ body: { padding: '12px 16px' } }}
        className="rounded-xl shadow-2xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <AppIcon icon={Store} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 whitespace-nowrap">
                Quỹ Tip Theo Cơ Sở
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                {data?.storeBreakdown?.length || 0} chi nhánh
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
            Thưởng CS 3%
          </span>
        </div>

        <DataTable
          columns={storeColumns}
          dataSource={data?.storeBreakdown || []}
          rowKey="storeKey"
          pagination={false}
          loading={loading && !data}
          size="small"
          scroll={{ x: 750 }}
          className="rounded-lg overflow-hidden"
        />
      </Card>

      {/* 3. DETAILED ORDER LEDGER SECTION - MINIMALIST ICON+TOOLTIP HEADER */}
      <Card
        variant="outlined"
        styles={{ body: { padding: '12px 16px' } }}
        className="rounded-xl shadow-2xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        {/* Single Compact Header + Controls Bar */}
        <div className="flex items-center justify-between gap-3 mb-3.5 h-[var(--mos-control-height)]">
          {/* Left: Minimal Title & Count */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <AppIcon icon={Receipt} size="sm" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white m-0 whitespace-nowrap">
                Đối Soát Đơn Hàng
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                {data?.pagination.total || 0} đơn
              </span>
            </div>
          </div>

          {/* Right: Inline Minimal Controls (Pure Icon + Tooltip) */}
          <div className="flex items-center gap-2 shrink-0 h-full">
            {/* Collapsible Expandable Search */}
            <CollapsibleSearchField
              placeholder="Tìm đơn, tên, SĐT..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!e.target.value) {
                  setPage(1);
                }
              }}
              onPressEnter={() => {
                setPage(1);
                fetchData();
              }}
              allowClear
              behavior="filter"
              expandedWidth={200}
              expandButtonLabel="Mở tìm kiếm"
            />

            {/* Customer Type: Icon + Tooltip Segmented */}
            <Segmented
              size="small"
              value={customerType}
              onChange={(val) => handleCustomerTypeChange(val as 'ALL' | 'LOCA' | 'SINGLE')}
              options={[
                {
                  value: 'ALL',
                  label: (
                    <Tooltip title="Tất cả khách hàng">
                      <span className="flex items-center justify-center p-0.5">
                        <AppIcon icon={Users} size="sm" />
                      </span>
                    </Tooltip>
                  ),
                },
                {
                  value: 'LOCA',
                  label: (
                    <Tooltip title="Khách LoCa (Combo Live)">
                      <span className="flex items-center justify-center p-0.5 text-emerald-600 dark:text-emerald-400">
                        <AppIcon icon={Heart} size="sm" className="fill-emerald-500/20" />
                      </span>
                    </Tooltip>
                  ),
                },
                {
                  value: 'SINGLE',
                  label: (
                    <Tooltip title="Khách lẻ (Single)">
                      <span className="flex items-center justify-center p-0.5 text-amber-600 dark:text-amber-400">
                        <AppIcon icon={User} size="sm" />
                      </span>
                    </Tooltip>
                  ),
                },
              ]}
            />

            {/* Tip Filter: Icon + Tooltip Segmented */}
            <Segmented
              size="small"
              value={tipFilter}
              onChange={(val) => handleTipFilterChange(val as 'ALL' | 'TIPPED' | 'NO_TIP')}
              options={[
                {
                  value: 'ALL',
                  label: (
                    <Tooltip title="Tất cả đơn (Có Tip & Không Tip)">
                      <span className="flex items-center justify-center p-0.5">
                        <AppIcon icon={Receipt} size="sm" />
                      </span>
                    </Tooltip>
                  ),
                },
                {
                  value: 'TIPPED',
                  label: (
                    <Tooltip title="Chỉ đơn có tiền tip">
                      <span className="flex items-center justify-center p-0.5 text-emerald-600 dark:text-emerald-400">
                        <AppIcon icon={Coins} size="sm" />
                      </span>
                    </Tooltip>
                  ),
                },
                {
                  value: 'NO_TIP',
                  label: (
                    <Tooltip title="Chỉ đơn không tip">
                      <span className="flex items-center justify-center p-0.5 text-slate-400">
                        <AppIcon icon={CircleSlash} size="sm" />
                      </span>
                    </Tooltip>
                  ),
                },
              ]}
            />

            {/* Clear Filter Icon Button */}
            {hasActiveFilters && (
              <Tooltip title="Xoá bộ lọc">
                <Button
                  size="small"
                  type="text"
                  icon={<AppIcon icon={XCircle} size="sm" className="text-rose-500 hover:text-rose-600" />}
                  onClick={handleResetFilters}
                  className="flex items-center justify-center p-1 text-rose-500 shrink-0"
                />
              </Tooltip>
            )}

            {/* Reload button */}
            <Tooltip title="Tải lại">
              <Button
                size="small"
                icon={<AppIcon icon={RotateCw} size="sm" className={loading ? 'animate-spin' : ''} />}
                onClick={fetchData}
                loading={loading}
                className="flex items-center justify-center shrink-0"
              />
            </Tooltip>
          </div>
        </div>

        <DataTable
          columns={orderColumns}
          dataSource={data?.records || []}
          rowKey="orderId"
          loading={loading}
          size="middle"
          scroll={{ x: 950 }}
          className="rounded-xl overflow-hidden"
          pagination={{
            current: data?.pagination.page || page,
            pageSize: data?.pagination.limit || limit,
            total: data?.pagination.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total: number) => `Tổng ${total} đơn hàng`,
            onChange: (p: number, l: number) => {
              setPage(p);
              setLimit(l);
            },
          }}
        />
      </Card>
    </div>
  );
}
