'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  InventoryItemHistoryEntryDto,
  InventoryPermissionAction,
  InventoryRolePreviewKey,
  InventoryWarehouseItemDetailDto,
} from '@mos-lab/shared';
import { ArrowLeft, Check, FlaskConical, Play, Skull, Star } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

interface InventoryWarehouseItemHistoryScreenProps {
  warehouseItemId: number;
  permissions: Record<InventoryPermissionAction, boolean>;
  previewRole?: InventoryRolePreviewKey | null;
  previewStoreId?: number | null;
  onBack: () => void;
}

type PendingStateAction = {
  type: 'item-using' | 'item-testing' | 'item-used' | 'item-lost';
  label: string;
};

export function InventoryWarehouseItemHistoryScreen({
  warehouseItemId,
  permissions,
  previewRole,
  previewStoreId,
  onBack,
}: InventoryWarehouseItemHistoryScreenProps) {
  const [item, setItem] = useState<InventoryWarehouseItemDetailDto | null>(null);
  const [history, setHistory] = useState<InventoryItemHistoryEntryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<PendingStateAction | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.inventory.getItemHistory(warehouseItemId, {
        previewRole: previewRole ?? undefined,
        previewStoreId: previewStoreId ?? undefined,
      });
      if (res.success) {
        setItem(res.item);
        setHistory(res.history);
      }
    } finally {
      setIsLoading(false);
    }
  }, [warehouseItemId, previewRole, previewStoreId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleConfirmStateChange = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    try {
      const res = await apiClient.inventory.scanCode({
        scan_code: String(warehouseItemId),
        type: action.type,
        previewRole: previewRole ?? undefined,
        previewStoreId: previewStoreId ?? undefined,
      });
      const isOk = res.inventory_item?.is_valid === '1';
      setAlertModal({
        title: isOk ? 'Success' : 'Error',
        message: res.inventory_item?.message || (isOk ? 'Updated' : 'Error'),
      });
      await loadHistory();
    } catch (err: unknown) {
      setAlertModal({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Error',
      });
    }
  };

  const canGlobalState = permissions['item-state-global'];
  const headerCode = item?.first_inventory_warehouse_order_item_id
    ? `#${item.first_inventory_warehouse_order_item_id}`
    : `#${warehouseItemId}`;

  return (
    <div className="flex-1 flex flex-col bg-white text-black min-h-0 relative">
      {/* Header matching InventoryWarehouseItemHistoryVC */}
      <div className="h-[52px] bg-black text-[#FFB400] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={onBack} className="p-1.5 cursor-pointer" aria-label="Quay lại">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-base truncate tabular-nums">{headerCode}</span>
        </div>

        {canGlobalState && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setConfirmAction({ type: 'item-using', label: 'Using' })}
              className="p-1.5 hover:bg-white/10 rounded cursor-pointer"
              title="Chuyển Using"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction({ type: 'item-testing', label: 'Testing' })}
              className="p-1.5 hover:bg-white/10 rounded cursor-pointer"
              title="Chuyển Testing"
            >
              <FlaskConical className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction({ type: 'item-used', label: 'Used' })}
              className="p-1.5 hover:bg-white/10 rounded cursor-pointer"
              title="Chuyển Used"
            >
              <Star className="w-4 h-4 fill-current" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction({ type: 'item-lost', label: 'Lost' })}
              className="p-1.5 hover:bg-white/10 rounded cursor-pointer"
              title="Chuyển Lost"
            >
              <Skull className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {item && (
        <div className="px-3 py-2.5 bg-neutral-100 border-b border-neutral-300 text-xs">
          <div className="font-bold text-sm text-neutral-900">{item.item.inventory_item_name}</div>
          <div className="text-neutral-600 mt-0.5">
            {item.item.inventory_item_attribute} {item.item.inventory_item_brand} · Kho:{' '}
            <strong>{item.warehouse.inventory_warehouse_name}</strong> · Trạng thái:{' '}
            <strong className="text-amber-700">{item.item_state}</strong>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Đang tải lịch sử...</div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">Chưa có lịch sử ghi nhận.</div>
        ) : (
          history.map((entry, idx) => {
            if (entry.kind === 'order') {
              return (
                <div key={`order-${entry.inventory_warehouse_order_item_id}-${idx}`} className="px-3.5 py-3">
                  <div className="text-sm font-medium text-neutral-900">
                    {entry.from_warehouse ? `${entry.from_warehouse.inventory_warehouse_name} → ` : ''}
                    {entry.to_warehouse.inventory_warehouse_name}
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500 mt-1">
                    <span>{entry.created_staff?.full_name || 'System'}</span>
                    <span className="tabular-nums">{entry.date_imported}</span>
                  </div>
                </div>
              );
            }

            if (entry.kind === 'state') {
              return (
                <div key={`state-${entry.inventory_warehouse_item_state_id}-${idx}`} className="px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-xs">
                      {entry.item_state}
                    </span>
                    <span className="text-xs text-neutral-500 tabular-nums">{entry.date_created}</span>
                  </div>
                  <div className="text-xs text-neutral-600 mt-1">{entry.created_staff?.full_name || 'System'}</div>
                </div>
              );
            }

            if (entry.kind === 'assign') {
              return (
                <div key={`assign-${entry.inventory_warehouse_item_assign_id}-${idx}`} className="px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-900">
                      Bàn giao: {entry.assigned_staff?.full_name || 'Bỏ gán'}
                    </span>
                    <span className="text-xs text-neutral-500 tabular-nums">{entry.date_created}</span>
                  </div>
                  {entry.assign_note && <div className="text-xs text-neutral-700 mt-0.5">{entry.assign_note}</div>}
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Bởi: {entry.created_staff?.full_name || 'Staff'}
                  </div>
                </div>
              );
            }

            return (
              <div key={`check-${entry.inventory_warehouse_check_item_id}-${idx}`} className="px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">
                      Kiểm kho: {entry.warehouse.inventory_warehouse_name}
                    </span>
                    {entry.is_lost === 0 ? (
                      <Check className="w-4 h-4 text-[#00D000]" strokeWidth={3} />
                    ) : (
                      <Skull className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <span className="text-xs text-neutral-500 tabular-nums">{entry.date_created}</span>
                </div>
                <div className="text-xs text-neutral-500 mt-1">{entry.created_staff?.full_name || 'System'}</div>
              </div>
            );
          })
        )}
      </div>

      {confirmAction && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-[300px] bg-white rounded-xl p-4 text-center shadow-2xl">
            <div className="font-bold text-base text-black">Warning</div>
            <div className="text-sm text-neutral-700 mt-1">Are you sure? ({confirmAction.label})</div>
            <div className="flex justify-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-4 py-1.5 rounded border border-neutral-300 text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmStateChange}
                className="px-4 py-1.5 rounded bg-black text-[#FFB400] text-xs font-semibold cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {alertModal && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-[300px] bg-white rounded-xl p-4 text-center shadow-2xl">
            <div className="font-bold text-base text-black">{alertModal.title}</div>
            <pre className="text-xs text-neutral-800 whitespace-pre-wrap font-sans mt-2">{alertModal.message}</pre>
            <button
              type="button"
              onClick={() => setAlertModal(null)}
              className="mt-4 w-full py-2 rounded bg-[#FFB400] text-black font-bold text-xs cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
