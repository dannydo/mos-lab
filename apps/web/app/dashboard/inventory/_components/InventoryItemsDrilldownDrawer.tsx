'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button } from 'antd';
import { History } from 'lucide-react';
import type {
  InventoryItemState,
  InventoryItemType,
  InventoryLifecycleMode,
  InventoryRolePreviewKey,
  InventoryWarehouseItemDetailDto,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, DataTable, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';

const MODE_LABELS: Record<InventoryLifecycleMode, string> = {
  start: 'Tồn Đầu Kỳ',
  input: 'Nhập Trong Kỳ',
  new: 'New (Mới)',
  using: 'Using (Đang dùng)',
  used: 'Used (Đã hết)',
  lost: 'Lost (Thất lạc)',
  broken: 'Broken (Hư hỏng)',
  output: 'Xuất Trong Kỳ',
  end: 'Tồn Cuối Kỳ',
};

export function stateTagStatus(
  state: InventoryItemState
): 'success' | 'processing' | 'error' | 'warning' | 'default' | 'cyan' {
  switch (state) {
    case 'New':
      return 'success';
    case 'Using':
    case 'Testing':
      return 'processing';
    case 'Used':
      return 'default';
    case 'Lost-Temporary':
      return 'warning';
    case 'Lost':
    case 'Broken':
      return 'error';
    default:
      return 'cyan';
  }
}

export function formatVnd(amount?: number | null): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

export interface InventoryItemsDrilldownDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  itemMode?: InventoryLifecycleMode;
  inventoryItemId?: number;
  inventoryItemType?: InventoryItemType;
  warehouseIds?: number[];
  dateFrom?: string;
  dateTo?: string;
  showPrice: boolean;
  previewRole: InventoryRolePreviewKey;
  previewStoreId: number | null;
  onSelectHistoryItem: (warehouseItemId: number) => void;
}

export function InventoryItemsDrilldownDrawer({
  open,
  onClose,
  title,
  itemMode,
  inventoryItemId,
  inventoryItemType,
  warehouseIds,
  dateFrom,
  dateTo,
  showPrice,
  previewRole,
  previewStoreId,
  onSelectHistoryItem,
}: InventoryItemsDrilldownDrawerProps) {
  const [rows, setRows] = useState<InventoryWarehouseItemDetailDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const loadItems = useCallback(
    async (targetPage: number, targetLimit: number) => {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getWarehouseItems({
          itemMode,
          inventoryItemId,
          inventoryItemType,
          warehouseIds,
          dateFrom,
          dateTo,
          page: targetPage,
          limit: targetLimit,
          previewRole,
          previewStoreId,
        });
        setRows(res.data || []);
        setTotal(res.page?.total || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được danh sách mã vật lý');
      } finally {
        setLoading(false);
      }
    },
    [open, itemMode, inventoryItemId, inventoryItemType, warehouseIds, dateFrom, dateTo, previewRole, previewStoreId]
  );

  useEffect(() => {
    if (open) {
      setPage(1);
      void loadItems(1, limit);
    }
  }, [open, loadItems, limit]);

  const columns: ColumnsType<InventoryWarehouseItemDetailDto> = [
    {
      title: 'ID / Mã Đơn Nhập',
      dataIndex: 'inventory_warehouse_item_id',
      key: 'id',
      width: 150,
      render: (_, r) => (
        <div className="space-y-0.5 tabular-nums">
          <div className="font-semibold text-slate-900 dark:text-slate-100">#{r.inventory_warehouse_item_id}</div>
          {r.first_inventory_warehouse_order_item_id != null && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Lot #{r.first_inventory_warehouse_order_item_id}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Vật Tư / SKU',
      key: 'item',
      width: 240,
      render: (_, r) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.item.inventory_item_name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {r.item.inventory_item_code} · {r.item.inventory_item_brand || '—'}
            {r.item.inventory_item_attribute ? ` · ${r.item.inventory_item_attribute}` : ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Kho Hiện Tại',
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
      width: 130,
      render: (state: InventoryItemState) => <StatusTag status={stateTagStatus(state)} label={state} />,
    },
    {
      title: 'Giao Nhân Viên',
      key: 'assigned_staff',
      width: 170,
      render: (_, r) =>
        r.assigned_staff ? (
          <div className="text-sm">
            <div className="font-medium text-slate-900 dark:text-slate-100">{r.assigned_staff.full_name}</div>
            {r.assign_note && <div className="text-xs text-slate-500 dark:text-slate-400">{r.assign_note}</div>}
          </div>
        ) : (
          <span className="text-xs text-slate-400">Chưa giao</span>
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
            render: (price: number | undefined) => <span className="tabular-nums font-medium">{formatVnd(price)}</span>,
          },
        ]
      : []),
    {
      title: 'Cập Nhật',
      dataIndex: 'date_updated',
      key: 'date_updated',
      width: 150,
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
          onClick={() => onSelectHistoryItem(r.inventory_warehouse_item_id)}
        >
          Lịch sử
        </Button>
      ),
    },
  ];

  const resolvedTitle = title || (itemMode ? `Chi tiết vật lý · ${MODE_LABELS[itemMode]}` : 'Chi tiết vật lý');

  return (
    <AdaptiveDrawer open={open} onClose={onClose} title={resolvedTitle} intent="data" destroyOnClose={false}>
      {error ? (
        <StatePanel kind="error" title="Không tải được danh sách" description={error} />
      ) : (
        <DataTable<InventoryWarehouseItemDetailDto>
          rowKey="inventory_warehouse_item_id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: showPrice ? 1230 : 1110 }}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            onChange: (nextPage, nextLimit) => {
              setPage(nextPage);
              setLimit(nextLimit);
              void loadItems(nextPage, nextLimit);
            },
          }}
        />
      )}
    </AdaptiveDrawer>
  );
}
