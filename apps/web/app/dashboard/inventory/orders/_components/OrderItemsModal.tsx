'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Input, Button } from 'antd';
import { Search } from 'lucide-react';
import type { InventoryOrderItemDto, InventoryRolePreviewKey } from '@mos-lab/shared';
import { AdaptiveModal, AppIcon, DataTable, StatePanel, StatusTag } from '../../../../../components/ui';
import { apiClient } from '../../../../../lib/api-client';
import { formatVnd } from '../../_components/InventoryItemsDrilldownDrawer';

export interface OrderItemsModalProps {
  open: boolean;
  orderId: number | null;
  inventoryItemId?: number;
  title?: string;
  showPrice: boolean;
  previewRole: InventoryRolePreviewKey;
  previewStoreId: number | null;
  onClose: () => void;
}

export function OrderItemsModal({
  open,
  orderId,
  inventoryItemId,
  title,
  showPrice,
  previewRole,
  previewStoreId,
  onClose,
}: OrderItemsModalProps) {
  const [rows, setRows] = useState<InventoryOrderItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const loadRows = useCallback(
    async (targetPage: number, targetLimit: number) => {
      if (!open || !orderId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getOrderPhysicalItems(orderId, {
          inventoryItemId,
          keyword: appliedKeyword || undefined,
          page: targetPage,
          limit: targetLimit,
          previewRole,
          previewStoreId,
        });
        setRows(res.data || []);
        setTotal(res.page?.total || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được chi tiết vật lý của phiếu');
      } finally {
        setLoading(false);
      }
    },
    [open, orderId, inventoryItemId, appliedKeyword, previewRole, previewStoreId]
  );

  useEffect(() => {
    if (open) {
      setPage(1);
      void loadRows(1, limit);
    }
  }, [open, loadRows, limit]);

  const columns: ColumnsType<InventoryOrderItemDto> = [
    {
      title: 'Order Item ID',
      dataIndex: 'inventory_warehouse_order_item_id',
      key: 'id',
      width: 120,
      render: (id: number) => <span className="font-mono font-semibold tabular-nums">#{id}</span>,
    },
    {
      title: 'Vật Tư / SKU',
      key: 'item',
      width: 220,
      render: (_, r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.item.inventory_item_name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {r.item.inventory_item_code} · {r.item.inventory_item_attribute || '—'}
          </div>
        </div>
      ),
    },
    {
      title: 'Mã Xuất / Nhập Vật Lý',
      key: 'wh_item_links',
      width: 170,
      render: (_, r) => (
        <div className="space-y-0.5 text-xs tabular-nums">
          <div>Từ mã: {r.from_inventory_warehouse_item_id ? `#${r.from_inventory_warehouse_item_id}` : '—'}</div>
          <div>Tới mã: {r.to_inventory_warehouse_item_id ? `#${r.to_inventory_warehouse_item_id}` : '—'}</div>
        </div>
      ),
    },
    {
      title: 'Trạng Thái Quét / Nhập',
      key: 'status',
      width: 185,
      render: (_, r) => (
        <div className="flex flex-wrap gap-1">
          <StatusTag
            status={r.date_assigned ? 'processing' : 'default'}
            label={r.date_assigned ? 'Đã xuất' : 'Chưa xuất'}
          />
          <StatusTag status={r.date_checked ? 'warning' : 'default'} label={r.date_checked ? 'Đã kiểm' : 'Chờ kiểm'} />
          <StatusTag
            status={r.date_imported ? 'success' : 'default'}
            label={r.date_imported ? 'Đã nhập' : 'Chưa nhập'}
          />
        </div>
      ),
    },
    ...(showPrice
      ? [
          {
            title: 'Đơn Giá',
            dataIndex: 'retail_price',
            key: 'retail_price',
            width: 115,
            align: 'right' as const,
            render: (val: number | undefined) => <span className="tabular-nums">{formatVnd(val)}</span>,
          },
        ]
      : []),
    {
      title: 'Scan Code',
      dataIndex: 'scan_code',
      key: 'scan_code',
      width: 155,
      render: (code: string | null | undefined) => (
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{code || '—'}</span>
      ),
    },
  ];

  return (
    <AdaptiveModal
      open={open}
      onCancel={onClose}
      footer={null}
      intent="data"
      zIndex={1050}
      title={title || (orderId ? `Chi Tiết Dòng Vật Lý · Phiếu #${orderId}` : 'Chi Tiết Phiếu')}
    >
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Input
            allowClear
            className="max-w-xs"
            placeholder="Tìm SKU hoặc mã vật lý..."
            prefix={<AppIcon icon={Search} size={14} className="text-slate-400" />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => setAppliedKeyword(keyword.trim())}
          />
          <Button type="primary" onClick={() => setAppliedKeyword(keyword.trim())}>
            Tìm
          </Button>
        </div>

        {error ? (
          <StatePanel kind="error" title="Lỗi tải chi tiết phiếu" description={error} />
        ) : (
          <DataTable<InventoryOrderItemDto>
            rowKey="inventory_warehouse_order_item_id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            scroll={{ x: showPrice ? 965 : 850 }}
            pagination={{
              current: page,
              pageSize: limit,
              total,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (nextPage, nextLimit) => {
                setPage(nextPage);
                setLimit(nextLimit);
                void loadRows(nextPage, nextLimit);
              },
            }}
          />
        )}
      </div>
    </AdaptiveModal>
  );
}
