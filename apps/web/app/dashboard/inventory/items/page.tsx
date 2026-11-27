'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import dayjs, { type Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { Button, DatePicker, Input, Select, Tabs, message } from 'antd';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  INVENTORY_ITEM_TYPES,
  isInventoryLifecycleEndValid,
  type InventoryItemType,
  type InventoryLifecycleCounters,
  type InventoryLifecycleMode,
  type InventoryLifecycleRowDto,
} from '@mos-lab/shared';
import {
  AdaptiveModal,
  AppIcon,
  DataTable,
  SectionCard,
  StatCard,
  StatePanel,
  StatusTag,
} from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { InventoryAdminHeader } from '../_components/InventoryAdminHeader';
import { InventoryChecksDrawer } from '../_components/InventoryChecksDrawer';
import { InventoryItemHistoryDrawer } from '../_components/InventoryItemHistoryDrawer';
import { formatVnd, InventoryItemsDrilldownDrawer } from '../_components/InventoryItemsDrilldownDrawer';
import { useInventoryAdminContext } from '../_components/useInventoryAdminContext';

const TYPE_TABS: Array<{ key: 'ALL' | InventoryItemType; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  ...INVENTORY_ITEM_TYPES.map((t) => ({ key: t, label: t })),
];

const FORECAST_MONTH_OPTIONS = [1, 2, 3, 4, 5, 6].map((m) => ({
  value: String(m),
  label: `Dự báo ${m} tháng`,
}));

interface DrilldownState {
  open: boolean;
  mode: InventoryLifecycleMode;
  itemId?: number;
  title?: string;
}

export default function InventoryItemsPage() {
  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');
  const canApproveChecks = ctx.hasPermission('warehouse-check-approve');
  const canMutateState = ctx.hasPermission('item-state-global') || ctx.hasPermission('item-state');
  const canRegenerate = ctx.hasPermission('edit-order-global');

  const [itemTypeTab, setItemTypeTab] = useState<'ALL' | InventoryItemType>('ALL');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<number[]>([]);
  const [forecastMonth, setForecastMonth] = useState<string>('1');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const [rows, setRows] = useState<InventoryLifecycleRowDto[]>([]);
  const [summary, setSummary] = useState<InventoryLifecycleCounters | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [drilldown, setDrilldown] = useState<DrilldownState>({ open: false, mode: 'end' });
  const [historyItemId, setHistoryItemId] = useState<number | null>(null);
  const [checksOpen, setChecksOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenPreview, setRegenPreview] = useState<string | null>(null);

  const dateFrom = dateRange[0].format('YYYY-MM-DD');
  const dateTo = dateRange[1].format('YYYY-MM-DD');

  const loadLifecycle = useCallback(
    async (targetPage: number, targetLimit: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getLifecycle({
          inventoryItemType: itemTypeTab === 'ALL' ? undefined : itemTypeTab,
          warehouseIds: selectedWarehouseIds.length > 0 ? selectedWarehouseIds : undefined,
          dateFrom,
          dateTo,
          forecastMonth,
          keyword: appliedKeyword || undefined,
          page: targetPage,
          limit: targetLimit,
          previewRole: ctx.previewRole,
          previewStoreId: ctx.previewStoreId,
        });
        setRows(res.data || []);
        setSummary(res.summary || null);
        setTotal(res.page?.total || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được báo cáo vòng đời kho');
      } finally {
        setLoading(false);
      }
    },
    [
      itemTypeTab,
      selectedWarehouseIds,
      dateFrom,
      dateTo,
      forecastMonth,
      appliedKeyword,
      ctx.previewRole,
      ctx.previewStoreId,
    ]
  );

  useEffect(() => {
    setPage(1);
    void loadLifecycle(1, limit);
  }, [loadLifecycle, limit]);

  const openDrilldown = (mode: InventoryLifecycleMode, row: InventoryLifecycleRowDto) => {
    setDrilldown({
      open: true,
      mode,
      itemId: row.inventory_item_id,
      title: `${row.item.inventory_item_name} (${row.item.inventory_item_code}) · ${mode.toUpperCase()}`,
    });
  };

  const renderMetricCell = (
    qty: number,
    price: number | undefined,
    mode: InventoryLifecycleMode,
    row: InventoryLifecycleRowDto,
    invalidEnd?: boolean
  ) => (
    <button
      type="button"
      onClick={() => openDrilldown(mode, row)}
      className={`group flex w-full flex-col items-end rounded px-1 py-0.5 text-right transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
        invalidEnd ? 'text-rose-600 dark:text-rose-400 font-bold' : ''
      }`}
    >
      <span className="tabular-nums font-semibold underline decoration-slate-300 underline-offset-2 group-hover:decoration-sky-500">
        {qty.toLocaleString('vi-VN')}
      </span>
      {showPrice && price != null && (
        <span className="tabular-nums text-[11px] text-slate-500 dark:text-slate-400">{formatVnd(price)}</span>
      )}
    </button>
  );

  const columns: ColumnsType<InventoryLifecycleRowDto> = [
    {
      title: 'Vật Tư / SKU',
      key: 'item',
      width: 260,
      fixed: 'left',
      render: (_, r) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{r.item.inventory_item_name}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono">{r.item.inventory_item_code}</span>
            <span>·</span>
            <span>{r.item.inventory_item_brand || '—'}</span>
            {r.item.inventory_item_attribute && (
              <>
                <span>·</span>
                <span>{r.item.inventory_item_attribute}</span>
              </>
            )}
          </div>
          <div className="pt-0.5">
            <StatusTag status="default" label={`${r.item.inventory_item_type} · ${r.item.inventory_item_unit}`} />
          </div>
        </div>
      ),
    },
    ...(showPrice
      ? [
          {
            title: 'Đơn Giá Cuối',
            dataIndex: 'last_retail_price',
            key: 'last_retail_price',
            width: 120,
            align: 'right' as const,
            render: (val: number | undefined) => <span className="tabular-nums font-medium">{formatVnd(val)}</span>,
          },
        ]
      : []),
    {
      title: 'Tồn Đầu',
      key: 'start',
      width: 105,
      align: 'right',
      render: (_, r) => renderMetricCell(r.total_quantity_start, r.total_retail_price_start, 'start', r),
    },
    {
      title: 'Nhập Kỳ',
      key: 'input',
      width: 105,
      align: 'right',
      render: (_, r) => renderMetricCell(r.total_quantity_input, r.total_retail_price_input, 'input', r),
    },
    {
      title: 'New',
      key: 'new',
      width: 95,
      align: 'right',
      render: (_, r) => renderMetricCell(r.total_quantity_new, r.total_retail_price_new, 'new', r),
    },
    {
      title: 'Using',
      key: 'using',
      width: 95,
      align: 'right',
      render: (_, r) => renderMetricCell(r.total_quantity_using, r.total_retail_price_using, 'using', r),
    },
    {
      title: 'Used',
      key: 'used',
      width: 95,
      align: 'right',
      render: (_, r) => renderMetricCell(r.total_quantity_used, r.total_retail_price_used, 'used', r),
    },
    {
      title: 'Lost',
      key: 'lost',
      width: 95,
      align: 'right',
      render: (_, r) => renderMetricCell(r.total_quantity_lost, r.total_retail_price_lost, 'lost', r),
    },
    {
      title: 'Broken',
      key: 'broken',
      width: 95,
      align: 'right',
      render: (_, r) => renderMetricCell(r.total_quantity_broken, r.total_retail_price_broken, 'broken', r),
    },
    {
      title: 'Xuất Kỳ',
      key: 'output',
      width: 105,
      align: 'right',
      render: (_, r) => renderMetricCell(r.total_quantity_output, r.total_retail_price_output, 'output', r),
    },
    {
      title: 'Tồn Cuối',
      key: 'end',
      width: 115,
      align: 'right',
      render: (_, r) => {
        const balanced = isInventoryLifecycleEndValid(r);
        return (
          <div className="space-y-0.5">
            {renderMetricCell(r.total_quantity_end, r.total_retail_price_end, 'end', r, !balanced)}
            {!balanced && (
              <div className="flex items-center justify-end gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                <AppIcon icon={AlertTriangle} size={14} />
                <span>Lệch cân đối</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Dự Báo',
      dataIndex: 'forecast_month',
      key: 'forecast_month',
      width: 95,
      align: 'right',
      render: (val: number) => (
        <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
          {Number(val || 0).toLocaleString('vi-VN')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <InventoryAdminHeader
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        stores={ctx.stores}
        permissionCount={ctx.permissionCount}
        onPreviewRoleChange={ctx.setPreviewRole}
        onPreviewStoreChange={ctx.setPreviewStoreId}
        canViewChecks
        onOpenChecks={() => setChecksOpen(true)}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Tồn Đầu Kỳ"
          value={summary?.total_quantity_start ?? 0}
          icon={<AppIcon icon={Boxes} size="sm" />}
          subValue={showPrice ? formatVnd(summary?.total_retail_price_start) : 'Ẩn giá theo quyền'}
          loading={loading && !summary}
        />
        <StatCard
          title="Nhập Trong Kỳ"
          value={summary?.total_quantity_input ?? 0}
          icon={<AppIcon icon={ArrowDownToLine} size="sm" />}
          subValue={showPrice ? formatVnd(summary?.total_retail_price_input) : 'Ẩn giá theo quyền'}
          loading={loading && !summary}
        />
        <StatCard
          title="Xuất Trong Kỳ"
          value={summary?.total_quantity_output ?? 0}
          icon={<AppIcon icon={ArrowUpFromLine} size="sm" />}
          subValue={showPrice ? formatVnd(summary?.total_retail_price_output) : 'Ẩn giá theo quyền'}
          loading={loading && !summary}
        />
        <StatCard
          title="Tồn Cuối Kỳ"
          value={summary?.total_quantity_end ?? 0}
          icon={<AppIcon icon={Package} size="sm" />}
          subValue={showPrice ? formatVnd(summary?.total_retail_price_end) : 'Ẩn giá theo quyền'}
          loading={loading && !summary}
        />
      </div>

      <SectionCard
        title="Báo Cáo Tồn & Luân Chuyển Vòng Đời Vật Tư"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            {canRegenerate && (
              <Button
                icon={<AppIcon icon={RotateCcw} size="sm" />}
                onClick={() => {
                  setRegenPreview(null);
                  setRegenOpen(true);
                }}
              >
                Tái Tạo Báo Cáo
              </Button>
            )}
            <Link
              href={`/dashboard/inventory/print/warehouse-report?dateFrom=${dateFrom}&dateTo=${dateTo}${
                selectedWarehouseIds[0] ? `&warehouseId=${selectedWarehouseIds[0]}` : ''
              }${itemTypeTab !== 'ALL' ? `&inventoryItemType=${itemTypeTab}` : ''}`}
              target="_blank"
            >
              <Button icon={<AppIcon icon={Printer} size="sm" />}>In Báo Cáo</Button>
            </Link>
            <Button icon={<AppIcon icon={RefreshCw} size="sm" />} onClick={() => void loadLifecycle(page, limit)}>
              Làm mới
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Tabs
            size="small"
            activeKey={itemTypeTab}
            onChange={(key) => {
              setItemTypeTab(key as 'ALL' | InventoryItemType);
              setPage(1);
            }}
            items={TYPE_TABS.map((t) => ({ key: t.key, label: t.label }))}
          />

          <div className="flex flex-wrap items-center gap-2">
            <DatePicker.RangePicker
              value={dateRange}
              allowClear={false}
              format="DD/MM/YYYY"
              onChange={(vals) => {
                if (vals && vals[0] && vals[1]) {
                  setDateRange([vals[0], vals[1]]);
                }
              }}
            />
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Tất cả kho được phép xem"
              className="min-w-60 flex-1 sm:max-w-sm"
              value={selectedWarehouseIds}
              options={ctx.warehouses.map((w) => ({
                value: w.inventory_warehouse_id,
                label: w.inventory_warehouse_name,
              }))}
              onChange={(vals) => setSelectedWarehouseIds(vals.map(Number))}
            />
            <Select
              className="w-40"
              value={forecastMonth}
              options={FORECAST_MONTH_OPTIONS}
              onChange={setForecastMonth}
            />
            <Input
              allowClear
              className="w-60"
              placeholder="Tìm tên SKU / mã lot..."
              prefix={<AppIcon icon={Search} size={14} className="text-slate-400" />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={() => setAppliedKeyword(keyword.trim())}
            />
            <Button type="primary" onClick={() => setAppliedKeyword(keyword.trim())}>
              Lọc
            </Button>
          </div>

          {error ? (
            <StatePanel kind="error" title="Lỗi tải báo cáo kho" description={error} />
          ) : (
            <DataTable<InventoryLifecycleRowDto>
              rowKey={(r) => `${r.inventory_warehouse_id}-${r.inventory_item_id}`}
              columns={columns}
              dataSource={rows}
              loading={loading}
              stickyPrimaryColumn
              scroll={{ x: showPrice ? 1380 : 1260 }}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (nextPage, nextLimit) => {
                  setPage(nextPage);
                  setLimit(nextLimit);
                  void loadLifecycle(nextPage, nextLimit);
                },
              }}
            />
          )}
        </div>
      </SectionCard>

      <InventoryItemsDrilldownDrawer
        open={drilldown.open}
        onClose={() => setDrilldown((prev) => ({ ...prev, open: false }))}
        title={drilldown.title}
        itemMode={drilldown.mode}
        inventoryItemId={drilldown.itemId}
        inventoryItemType={itemTypeTab === 'ALL' ? undefined : itemTypeTab}
        warehouseIds={selectedWarehouseIds.length > 0 ? selectedWarehouseIds : undefined}
        dateFrom={dateFrom}
        dateTo={dateTo}
        showPrice={showPrice}
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        onSelectHistoryItem={(whItemId) => setHistoryItemId(whItemId)}
      />

      <InventoryItemHistoryDrawer
        open={historyItemId !== null}
        warehouseItemId={historyItemId}
        showPrice={showPrice}
        canMutateState={canMutateState}
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        onClose={() => setHistoryItemId(null)}
        onStateChanged={() => void loadLifecycle(page, limit)}
      />

      <InventoryChecksDrawer
        open={checksOpen}
        onClose={() => setChecksOpen(false)}
        warehouses={ctx.warehouses}
        canApproveCheck={canApproveChecks}
        showPrice={showPrice}
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
      />

      <AdaptiveModal
        open={regenOpen}
        onCancel={() => setRegenOpen(false)}
        intent="confirm"
        zIndex={1050}
        title="Tái Tạo Chuỗi Báo Cáo Vòng Đời Kho"
        footer={[
          <Button key="close" onClick={() => setRegenOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="dry"
            loading={regenBusy}
            onClick={async () => {
              setRegenBusy(true);
              try {
                const res = await apiClient.inventory.regenerateStateReport({
                  date_to: dateTo,
                  warehouseId: selectedWarehouseIds[0],
                  dryRun: true,
                  previewRole: ctx.previewRole,
                  previewStoreId: ctx.previewStoreId,
                });
                const chainedSummary = (res.result.chainedResults || []).map((c) => c.summary).join(' | ');
                setRegenPreview([res.result.summary, chainedSummary].filter(Boolean).join(' -> '));
              } catch (err: unknown) {
                message.error(err instanceof Error ? err.message : 'Chạy thử tái tạo thất bại');
              } finally {
                setRegenBusy(false);
              }
            }}
          >
            Chạy Thử (Dry-Run)
          </Button>,
          <Button
            key="exec"
            type="primary"
            loading={regenBusy}
            onClick={async () => {
              setRegenBusy(true);
              try {
                const res = await apiClient.inventory.regenerateStateReport({
                  date_to: dateTo,
                  warehouseId: selectedWarehouseIds[0],
                  dryRun: false,
                  previewRole: ctx.previewRole,
                  previewStoreId: ctx.previewStoreId,
                });
                message.success(res.result.summary);
                setRegenOpen(false);
                void loadLifecycle(page, limit);
              } catch (err: unknown) {
                message.error(err instanceof Error ? err.message : 'Tái tạo báo cáo thất bại');
              } finally {
                setRegenBusy(false);
              }
            }}
          >
            Tái Tạo Thực
          </Button>,
        ]}
      >
        <div className="space-y-3 py-2 text-xs text-slate-600 dark:text-slate-300">
          <div>
            Chạy chuỗi liên hoàn <span className="font-mono font-semibold">State → Item → Warehouse</span> cho tháng
            chứa ngày <span className="font-mono font-semibold">{dateTo}</span>
            {selectedWarehouseIds[0] ? ` (Kho #${selectedWarehouseIds[0]})` : ' (Toàn bộ kho)'}.
          </div>
          {regenPreview && (
            <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-2.5 text-slate-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-slate-200">
              {regenPreview}
            </div>
          )}
        </div>
      </AdaptiveModal>
    </div>
  );
}
