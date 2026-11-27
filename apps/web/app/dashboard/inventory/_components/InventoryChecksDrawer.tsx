'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Select, Tabs, message } from 'antd';
import { CheckCircle2, XCircle } from 'lucide-react';
import type {
  InventoryCheckRecordDto,
  InventoryCheckState,
  InventoryRolePreviewKey,
  InventoryWarehouseDto,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, DataTable, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { formatVnd } from './InventoryItemsDrilldownDrawer';

const CHECK_STATE_TABS: Array<{ key: InventoryCheckState; label: string }> = [
  { key: 'New', label: 'Chờ Kiểm (New)' },
  { key: 'Checked', label: 'Đã Quét Chờ Duyệt (Checked)' },
  { key: 'Completed', label: 'Hoàn Tất (Completed)' },
  { key: 'Cancelled', label: 'Đã Hủy (Cancelled)' },
];

function checkStateStatus(state: InventoryCheckState): 'warning' | 'processing' | 'success' | 'error' {
  switch (state) {
    case 'New':
      return 'warning';
    case 'Checked':
      return 'processing';
    case 'Completed':
      return 'success';
    case 'Cancelled':
      return 'error';
  }
}

export interface InventoryChecksDrawerProps {
  open: boolean;
  onClose: () => void;
  warehouses: InventoryWarehouseDto[];
  canApproveCheck: boolean;
  showPrice: boolean;
  previewRole: InventoryRolePreviewKey;
  previewStoreId: number | null;
}

export function InventoryChecksDrawer({
  open,
  onClose,
  warehouses,
  canApproveCheck,
  showPrice,
  previewRole,
  previewStoreId,
}: InventoryChecksDrawerProps) {
  const [checkState, setCheckState] = useState<InventoryCheckState>('Checked');
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [rows, setRows] = useState<InventoryCheckRecordDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const loadChecks = useCallback(
    async (targetPage: number, targetLimit: number) => {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getChecks({
          warehouseId,
          checkState,
          page: targetPage,
          limit: targetLimit,
          previewRole,
          previewStoreId,
        });
        setRows(res.data || []);
        setTotal(res.page?.total || 0);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được danh sách phiếu kiểm kho');
      } finally {
        setLoading(false);
      }
    },
    [open, warehouseId, checkState, previewRole, previewStoreId]
  );

  useEffect(() => {
    if (open) {
      setPage(1);
      void loadChecks(1, limit);
    }
  }, [open, loadChecks, limit]);

  const handleComplete = async (checkId: number) => {
    setActingId(checkId);
    try {
      await apiClient.inventory.completeCheck(checkId, { previewRole, previewStoreId });
      message.success(`Đã duyệt hoàn tất phiếu kiểm kho #${checkId}`);
      void loadChecks(page, limit);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Duyệt phiếu kiểm kho thất bại');
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (checkId: number) => {
    setActingId(checkId);
    try {
      await apiClient.inventory.cancelCheck(checkId, { previewRole, previewStoreId });
      message.success(`Đã hủy phiếu kiểm kho #${checkId}`);
      void loadChecks(page, limit);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Hủy phiếu kiểm kho thất bại');
    } finally {
      setActingId(null);
    }
  };

  const columns: ColumnsType<InventoryCheckRecordDto> = [
    {
      title: 'Phiếu',
      dataIndex: 'inventory_warehouse_check_id',
      key: 'id',
      width: 90,
      render: (id: number) => <span className="font-semibold tabular-nums">#{id}</span>,
    },
    {
      title: 'Kho & Loại Tồn',
      key: 'warehouse',
      width: 200,
      render: (_, r) => (
        <div className="space-y-1">
          <div className="font-medium text-slate-900 dark:text-slate-100">{r.warehouse.inventory_warehouse_name}</div>
          <div className="flex items-center gap-1.5">
            <StatusTag status={r.item_state === 'New' ? 'success' : 'processing'} label={r.item_state} />
            <StatusTag status={checkStateStatus(r.check_state)} label={r.check_state} />
          </div>
        </div>
      ),
    },
    {
      title: 'Tồn / Đã Quét',
      key: 'qty',
      width: 130,
      align: 'right',
      render: (_, r) => (
        <span className="tabular-nums font-medium">
          {r.total_quantity_checked} / {r.total_quantity}
        </span>
      ),
    },
    {
      title: 'Using / Lost',
      key: 'diff',
      width: 120,
      align: 'right',
      render: (_, r) => (
        <span className="tabular-nums text-xs">
          {r.total_quantity_using} / {r.total_quantity_lost}
        </span>
      ),
    },
    ...(showPrice
      ? [
          {
            title: 'Giá Trị Quét',
            key: 'price',
            width: 150,
            align: 'right' as const,
            render: (_: unknown, r: InventoryCheckRecordDto) => (
              <div className="tabular-nums text-xs">
                <div className="font-medium">{formatVnd(r.total_retail_price_checked)}</div>
                <div className="text-slate-400">/ {formatVnd(r.total_retail_price)}</div>
              </div>
            ),
          },
        ]
      : []),
    {
      title: 'Nhân Sự & Thời Gian',
      key: 'timeline',
      width: 220,
      render: (_, r) => (
        <div className="space-y-0.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums">
          <div>
            Tạo: {r.created_staff?.full_name || 'System'} · {r.date_created}
          </div>
          {r.checked_staff && (
            <div>
              Quét: {r.checked_staff.full_name} · {r.date_checked}
            </div>
          )}
          {r.completed_staff && (
            <div>
              Duyệt: {r.completed_staff.full_name} · {r.date_completed}
            </div>
          )}
          {r.cancelled_staff && (
            <div>
              Hủy: {r.cancelled_staff.full_name} · {r.date_cancelled}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Duyệt Phiếu',
      key: 'actions',
      width: 190,
      fixed: 'right',
      render: (_, r) => {
        const canAct = canApproveCheck && (r.check_state === 'New' || r.check_state === 'Checked');
        if (!canAct) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        const isBusy = actingId === r.inventory_warehouse_check_id;
        return (
          <div className="flex items-center gap-1.5">
            {r.check_state === 'Checked' && (
              <Button
                size="small"
                type="primary"
                loading={isBusy}
                icon={<AppIcon icon={CheckCircle2} size={14} />}
                onClick={() => void handleComplete(r.inventory_warehouse_check_id)}
              >
                Duyệt
              </Button>
            )}
            <Button
              size="small"
              danger
              loading={isBusy}
              icon={<AppIcon icon={XCircle} size={14} />}
              onClick={() => void handleCancel(r.inventory_warehouse_check_id)}
            >
              Hủy
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <AdaptiveDrawer open={open} onClose={onClose} title="Danh Sách Phiếu Kiểm Kho" intent="data">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs
            size="small"
            activeKey={checkState}
            onChange={(key) => {
              setCheckState(key as InventoryCheckState);
              setPage(1);
            }}
            items={CHECK_STATE_TABS.map((t) => ({ key: t.key, label: t.label }))}
          />
          <Select
            allowClear
            placeholder="Lọc theo kho"
            className="w-56"
            value={warehouseId}
            options={warehouses.map((w) => ({
              value: w.inventory_warehouse_id,
              label: w.inventory_warehouse_name,
            }))}
            onChange={(val) => {
              setWarehouseId(val ? Number(val) : undefined);
              setPage(1);
            }}
          />
        </div>

        {error ? (
          <StatePanel kind="error" title="Không tải được phiếu kiểm kho" description={error} />
        ) : (
          <DataTable<InventoryCheckRecordDto>
            rowKey="inventory_warehouse_check_id"
            columns={columns}
            dataSource={rows}
            loading={loading}
            scroll={{ x: showPrice ? 1100 : 950 }}
            pagination={{
              current: page,
              pageSize: limit,
              total,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50],
              onChange: (nextPage, nextLimit) => {
                setPage(nextPage);
                setLimit(nextLimit);
                void loadChecks(nextPage, nextLimit);
              },
            }}
          />
        )}
      </div>
    </AdaptiveDrawer>
  );
}
