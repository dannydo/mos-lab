'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Input, Select, Tabs } from 'antd';
import { History, Search } from 'lucide-react';
import type { InventoryAssetStateFilter, InventoryItemState, InventoryWarehouseItemDetailDto } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { InventoryAdminHeader } from '../_components/InventoryAdminHeader';
import { InventoryItemHistoryDrawer } from '../_components/InventoryItemHistoryDrawer';
import { formatVnd, stateTagStatus } from '../_components/InventoryItemsDrilldownDrawer';
import { useInventoryAdminContext } from '../_components/useInventoryAdminContext';

const ASSET_STATE_TABS: Array<{ key: InventoryAssetStateFilter; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'New', label: 'New' },
  { key: 'Using', label: 'Using' },
  { key: 'Used', label: 'Used' },
  { key: 'Lost', label: 'Lost' },
  { key: 'Broken', label: 'Broken' },
];

export default function InventoryAssetsPage() {
  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');
  const canMutateState = ctx.hasPermission('item-state-global') || ctx.hasPermission('item-state');

  const [stateFilter, setStateFilter] = useState<InventoryAssetStateFilter>('ALL');
  const [warehouseIds, setWarehouseIds] = useState<number[]>([]);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const [rows, setRows] = useState<InventoryWarehouseItemDetailDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [historyItemId, setHistoryItemId] = useState<number | null>(null);

  const loadAssets = useCallback(
    async (targetPage: number, targetLimit: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getWarehouseItems({
          inventoryItemType: 'Assets',
          itemState: stateFilter === 'ALL' ? undefined : stateFilter,
          warehouseIds: warehouseIds.length > 0 ? warehouseIds : undefined,
          keyword: appliedKeyword || undefined,
          page: targetPage,
          limit: targetLimit,
          previewRole: ctx.previewRole,
          previewStoreId: ctx.previewStoreId,
        });
        setRows(res.data || []);
        setTotal(res.page?.total || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được danh sách tài sản');
      } finally {
        setLoading(false);
      }
    },
    [stateFilter, warehouseIds, appliedKeyword, ctx.previewRole, ctx.previewStoreId]
  );

  useEffect(() => {
    setPage(1);
    void loadAssets(1, limit);
  }, [loadAssets, limit]);

  const columns: ColumnsType<InventoryWarehouseItemDetailDto> = [
    {
      title: 'Mã Tài Sản',
      dataIndex: 'inventory_warehouse_item_id',
      key: 'id',
      width: 115,
      render: (id: number) => <span className="font-semibold tabular-nums">#{id}</span>,
    },
    {
      title: 'Tên Tài Sản / SKU',
      key: 'item',
      width: 240,
      render: (_, r) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{r.item.inventory_item_name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {r.item.inventory_item_code} · {r.item.inventory_item_brand || '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Kho Quản Lý',
      key: 'warehouse',
      width: 170,
      render: (_, r) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">{r.warehouse.inventory_warehouse_name}</span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'item_state',
      key: 'item_state',
      width: 125,
      render: (st: InventoryItemState) => <StatusTag status={stateTagStatus(st)} label={st} />,
    },
    {
      title: 'Người Phụ Trách',
      key: 'assigned_staff',
      width: 175,
      render: (_, r) =>
        r.assigned_staff ? (
          <span className="font-medium text-slate-800 dark:text-slate-200">{r.assigned_staff.full_name}</span>
        ) : (
          <span className="text-xs text-slate-400">Chưa gắn</span>
        ),
    },
    ...(showPrice
      ? [
          {
            title: 'Nguyên Giá',
            dataIndex: 'retail_price',
            key: 'retail_price',
            width: 120,
            align: 'right' as const,
            render: (val: number | undefined) => <span className="tabular-nums font-medium">{formatVnd(val)}</span>,
          },
        ]
      : []),
    {
      title: 'Cập Nhật',
      dataIndex: 'date_updated',
      key: 'date_updated',
      width: 155,
      render: (dt: string | null, r) => (
        <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400">{dt || r.date_created}</span>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, r) => (
        <Button
          size="small"
          icon={<AppIcon icon={History} size={14} />}
          onClick={() => setHistoryItemId(r.inventory_warehouse_item_id)}
        >
          Lịch sử
        </Button>
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
      />

      <SectionCard title="Theo Dõi Tài Sản Cố Định (Assets · Miễn Kiểm Kho EOM)">
        <div className="space-y-3">
          <Tabs
            size="small"
            activeKey={stateFilter}
            onChange={(key) => {
              setStateFilter(key as InventoryAssetStateFilter);
              setPage(1);
            }}
            items={ASSET_STATE_TABS.map((t) => ({ key: t.key, label: t.label }))}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              placeholder="Lọc theo kho"
              className="min-w-60 flex-1 sm:max-w-sm"
              value={warehouseIds}
              options={ctx.warehouses.map((w) => ({
                value: w.inventory_warehouse_id,
                label: w.inventory_warehouse_name,
              }))}
              onChange={(vals) => setWarehouseIds(vals.map(Number))}
            />
            <Input
              allowClear
              className="w-64"
              placeholder="Tìm tên tài sản / người giữ..."
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
            <StatePanel kind="error" title="Không tải được danh sách tài sản" description={error} />
          ) : (
            <DataTable<InventoryWarehouseItemDetailDto>
              rowKey="inventory_warehouse_item_id"
              columns={columns}
              dataSource={rows}
              loading={loading}
              scroll={{ x: showPrice ? 1200 : 1080 }}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (nextPage, nextLimit) => {
                  setPage(nextPage);
                  setLimit(nextLimit);
                  void loadAssets(nextPage, nextLimit);
                },
              }}
            />
          )}
        </div>
      </SectionCard>

      <InventoryItemHistoryDrawer
        open={historyItemId !== null}
        warehouseItemId={historyItemId}
        showPrice={showPrice}
        canMutateState={canMutateState}
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        onClose={() => setHistoryItemId(null)}
        onStateChanged={() => void loadAssets(page, limit)}
      />
    </div>
  );
}
