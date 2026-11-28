'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Input, Select, message } from 'antd';
import { History, Search, UserMinus } from 'lucide-react';
import type { InventoryItemState, InventoryWarehouseItemDetailDto } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { InventoryAdminHeader } from '../_components/InventoryAdminHeader';
import { InventoryItemHistoryDrawer } from '../_components/InventoryItemHistoryDrawer';
import { formatVnd, stateTagStatus } from '../_components/InventoryItemsDrilldownDrawer';
import { useInventoryAdminContext } from '../_components/useInventoryAdminContext';

export default function InventoryAssignPage() {
  const ctx = useInventoryAdminContext();
  const showPrice = ctx.hasPermission('view-price');
  const canAssign = ctx.hasPermission('item-state-assign') || ctx.hasPermission('edit-order-global');
  const canMutateState = ctx.hasPermission('item-state-global') || ctx.hasPermission('item-state');

  const [warehouseIds, setWarehouseIds] = useState<number[]>([]);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const [rows, setRows] = useState<InventoryWarehouseItemDetailDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [unassigningId, setUnassigningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [historyItemId, setHistoryItemId] = useState<number | null>(null);

  const loadAssigned = useCallback(
    async (targetPage: number, targetLimit: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getWarehouseItems({
          isAssignedStaff: true,
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
        setError(err instanceof Error ? err.message : 'Không tải được danh sách vật tư đang giao');
      } finally {
        setLoading(false);
      }
    },
    [warehouseIds, appliedKeyword, ctx.previewRole, ctx.previewStoreId]
  );

  useEffect(() => {
    setPage(1);
    void loadAssigned(1, limit);
  }, [loadAssigned, limit]);

  const handleUnassign = async (row: InventoryWarehouseItemDetailDto) => {
    setUnassigningId(row.inventory_warehouse_item_id);
    try {
      await apiClient.inventory.assignItem({
        inventory_warehouse_item_id: row.inventory_warehouse_item_id,
        assigned_staff_id: null,
        assign_note: 'Thu hồi bàn giao từ Web Admin',
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(`Đã thu hồi vật tư #${row.inventory_warehouse_item_id}`);
      void loadAssigned(page, limit);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Thu hồi bàn giao thất bại');
    } finally {
      setUnassigningId(null);
    }
  };

  const columns: ColumnsType<InventoryWarehouseItemDetailDto> = [
    {
      title: 'ID Mã Vật Lý',
      dataIndex: 'inventory_warehouse_item_id',
      key: 'id',
      width: 120,
      render: (id: number) => <span className="font-semibold tabular-nums">#{id}</span>,
    },
    {
      title: 'Vật Tư / SKU',
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
      title: 'Kho',
      key: 'warehouse',
      width: 160,
      render: (_, r) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">{r.warehouse.inventory_warehouse_name}</span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'item_state',
      key: 'item_state',
      width: 120,
      render: (st: InventoryItemState) => <StatusTag status={stateTagStatus(st)} label={st} />,
    },
    {
      title: 'Nhân Viên Đang Giữ',
      key: 'assigned_staff',
      width: 200,
      render: (_, r) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.assigned_staff?.full_name || '—'}</div>
          {r.assign_note && <div className="text-xs text-slate-500 dark:text-slate-400">{r.assign_note}</div>}
        </div>
      ),
    },
    ...(showPrice
      ? [
          {
            title: 'Đơn Giá',
            dataIndex: 'retail_price',
            key: 'retail_price',
            width: 120,
            align: 'right' as const,
            render: (val: number | undefined) => <span className="tabular-nums font-medium">{formatVnd(val)}</span>,
          },
        ]
      : []),
    {
      title: 'Ngày Bàn Giao',
      dataIndex: 'date_assigned',
      key: 'date_assigned',
      width: 155,
      render: (dt: string | null) => (
        <span className="tabular-nums text-xs text-slate-500 dark:text-slate-400">{dt || '—'}</span>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 185,
      fixed: 'right',
      render: (_, r) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="small"
            icon={<AppIcon icon={History} size={14} />}
            onClick={() => setHistoryItemId(r.inventory_warehouse_item_id)}
          >
            Lịch sử
          </Button>
          {canAssign && (
            <Button
              size="small"
              danger
              loading={unassigningId === r.inventory_warehouse_item_id}
              icon={<AppIcon icon={UserMinus} size={14} />}
              onClick={() => void handleUnassign(r)}
            >
              Thu hồi
            </Button>
          )}
        </div>
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

      <SectionCard title="Danh Sách Vật Tư Đang Bàn Giao Nhân Viên">
        <div className="space-y-3">
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
              placeholder="Tìm tên nhân viên / tên SKU..."
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
            <StatePanel kind="error" title="Không tải được danh sách bàn giao" description={error} />
          ) : (
            <DataTable<InventoryWarehouseItemDetailDto>
              rowKey="inventory_warehouse_item_id"
              columns={columns}
              dataSource={rows}
              loading={loading}
              scroll={{ x: showPrice ? 1300 : 1180 }}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (nextPage, nextLimit) => {
                  setPage(nextPage);
                  setLimit(nextLimit);
                  void loadAssigned(nextPage, nextLimit);
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
        onStateChanged={() => void loadAssigned(page, limit)}
      />
    </div>
  );
}
