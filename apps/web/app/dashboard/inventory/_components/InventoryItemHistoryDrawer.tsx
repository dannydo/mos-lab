'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, message } from 'antd';
import { ArrowRight, ClipboardCheck, History, PackageCheck, RefreshCw, ShieldAlert, UserCheck } from 'lucide-react';
import type {
  InventoryItemHistoryEntryDto,
  InventoryItemHistoryResponse,
  InventoryRolePreviewKey,
  InventoryScanMode,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AppIcon, SectionCard, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { formatVnd, stateTagStatus } from './InventoryItemsDrilldownDrawer';

const STATE_ACTIONS: Array<{ mode: InventoryScanMode; label: string; danger?: boolean }> = [
  { mode: 'item-using', label: 'Chuyển Using' },
  { mode: 'item-used', label: 'Chuyển Used' },
  { mode: 'item-return', label: 'Return Về Mới' },
  { mode: 'item-lost', label: 'Báo Lost', danger: true },
  { mode: 'item-broken', label: 'Báo Broken', danger: true },
];

export interface InventoryItemHistoryDrawerProps {
  open: boolean;
  warehouseItemId: number | null;
  showPrice: boolean;
  canMutateState: boolean;
  previewRole: InventoryRolePreviewKey;
  previewStoreId: number | null;
  onClose: () => void;
  onStateChanged?: () => void;
}

export function InventoryItemHistoryDrawer({
  open,
  warehouseItemId,
  showPrice,
  canMutateState,
  previewRole,
  previewStoreId,
  onClose,
  onStateChanged,
}: InventoryItemHistoryDrawerProps) {
  const [data, setData] = useState<InventoryItemHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mutatingMode, setMutatingMode] = useState<InventoryScanMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!open || !warehouseItemId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.inventory.getItemHistory(warehouseItemId, {
        previewRole,
        previewStoreId,
      });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được lịch sử mã vật lý');
    } finally {
      setLoading(false);
    }
  }, [open, warehouseItemId, previewRole, previewStoreId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleStateAction = async (mode: InventoryScanMode) => {
    if (!data?.item?.scan_code) return;
    setMutatingMode(mode);
    try {
      const res = await apiClient.inventory.scanCode({
        scan_code: data.item.scan_code,
        type: mode,
        previewRole,
        previewStoreId,
      });
      if (res.inventory_item.is_valid === '1') {
        message.success(res.inventory_item.message || `Đã cập nhật trạng thái (${mode})`);
        await loadHistory();
        onStateChanged?.();
      } else {
        message.warning(res.inventory_item.message || 'Không thể chuyển trạng thái cho mã này');
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Chuyển trạng thái thất bại');
    } finally {
      setMutatingMode(null);
    }
  };

  const renderEntry = (entry: InventoryItemHistoryEntryDto, idx: number) => {
    switch (entry.kind) {
      case 'order':
        return (
          <div
            key={`ord-${entry.inventory_warehouse_order_item_id}-${idx}`}
            className="flex items-start gap-3 rounded-lg border border-slate-200/80 p-3 dark:border-slate-800"
          >
            <AppIcon icon={PackageCheck} size="sm" className="mt-0.5 text-sky-600 dark:text-sky-400" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusTag status="processing" label={`Đơn #${entry.inventory_warehouse_order_id}`} />
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {entry.from_warehouse?.inventory_warehouse_name || 'Nhà cung cấp'}
                </span>
                <AppIcon icon={ArrowRight} size={14} className="text-slate-400" />
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {entry.to_warehouse.inventory_warehouse_name}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {entry.date_imported} · Thực hiện: {entry.created_staff?.full_name || 'Hệ thống'}
              </div>
            </div>
          </div>
        );
      case 'state':
        return (
          <div
            key={`st-${entry.inventory_warehouse_item_state_id}-${idx}`}
            className="flex items-start gap-3 rounded-lg border border-slate-200/80 p-3 dark:border-slate-800"
          >
            <AppIcon icon={RefreshCw} size="sm" className="mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusTag status={stateTagStatus(entry.item_state)} label={entry.item_state} />
                <span className="text-slate-700 dark:text-slate-200">Cập nhật trạng thái vật lý</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {entry.date_created} · Bởi: {entry.created_staff?.full_name || 'Hệ thống'}
              </div>
            </div>
          </div>
        );
      case 'assign':
        return (
          <div
            key={`as-${entry.inventory_warehouse_item_assign_id}-${idx}`}
            className="flex items-start gap-3 rounded-lg border border-slate-200/80 p-3 dark:border-slate-800"
          >
            <AppIcon icon={UserCheck} size="sm" className="mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusTag status="success" label="Bàn giao" />
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {entry.assigned_staff?.full_name || 'Thu hồi / Không có NV'}
                </span>
                {entry.assign_note && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">({entry.assign_note})</span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {entry.date_created} · Bởi: {entry.created_staff?.full_name || 'Hệ thống'}
              </div>
            </div>
          </div>
        );
      case 'check':
        return (
          <div
            key={`ck-${entry.inventory_warehouse_check_item_id}-${idx}`}
            className="flex items-start gap-3 rounded-lg border border-slate-200/80 p-3 dark:border-slate-800"
          >
            <AppIcon icon={ClipboardCheck} size="sm" className="mt-0.5 text-violet-600 dark:text-violet-400" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusTag status="purple" label={`Kiểm kho #${entry.inventory_warehouse_check_id}`} />
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {entry.warehouse.inventory_warehouse_name}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {entry.is_checked ? 'Đã quét' : entry.is_lost ? 'Thiếu / Lost' : 'Chờ kiểm'}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {entry.date_created} · Bởi: {entry.created_staff?.full_name || 'Hệ thống'}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      title={warehouseItemId ? `Lịch Sử Mã Vật Lý #${warehouseItemId}` : 'Lịch Sử Mã Vật Lý'}
      intent="form"
    >
      {loading && !data ? (
        <StatePanel kind="loading" title="Đang tải vòng đời mã vật lý..." />
      ) : error ? (
        <StatePanel kind="error" title="Không tải được lịch sử" description={error} />
      ) : !data?.item ? (
        <StatePanel kind="empty" title="Không tìm thấy mã vật lý" />
      ) : (
        <div className="space-y-4">
          <SectionCard title={data.item.item.inventory_item_name}>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-slate-500 dark:text-slate-400">SKU: </span>
                <span className="font-medium">{data.item.item.inventory_item_code}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Kho hiện tại: </span>
                <span className="font-medium">{data.item.warehouse.inventory_warehouse_name}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Trạng thái: </span>
                <StatusTag status={stateTagStatus(data.item.item_state)} label={data.item.item_state} />
              </div>
              {showPrice && (
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Đơn giá: </span>
                  <span className="font-medium tabular-nums">{formatVnd(data.item.retail_price)}</span>
                </div>
              )}
              <div className="sm:col-span-2">
                <span className="text-slate-500 dark:text-slate-400">Mã QR: </span>
                <span className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                  {data.item.scan_code}
                </span>
              </div>
            </div>
          </SectionCard>

          {canMutateState && (
            <SectionCard
              title="Điều Chỉnh Trạng Thái Nhanh"
              extra={<AppIcon icon={ShieldAlert} size="sm" className="text-amber-500" />}
            >
              <div className="flex flex-wrap gap-2">
                {STATE_ACTIONS.map((act) => (
                  <Button
                    key={act.mode}
                    size="small"
                    danger={act.danger}
                    loading={mutatingMode === act.mode}
                    onClick={() => void handleStateAction(act.mode)}
                  >
                    {act.label}
                  </Button>
                ))}
              </div>
            </SectionCard>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <AppIcon icon={History} size="sm" />
              <span>Dòng Thời Gian (4 Nguồn Sự Kiện)</span>
            </div>
            {data.history.length === 0 ? (
              <StatePanel kind="empty" title="Chưa có biến động ghi nhận" />
            ) : (
              <div className="space-y-2">{data.history.map((e, i) => renderEntry(e, i))}</div>
            )}
          </div>
        </div>
      )}
    </AdaptiveDrawer>
  );
}
