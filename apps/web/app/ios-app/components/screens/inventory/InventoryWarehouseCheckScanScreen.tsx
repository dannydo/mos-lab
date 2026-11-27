'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getVisibleMobileCheckStates,
  type InventoryCheckScanResponse,
  type InventoryCheckSkuRowDto,
  type InventoryCheckTab,
  type InventoryPermissionAction,
  type InventoryRolePreviewKey,
  type InventoryWarehouseDto,
} from '@mos-lab/shared';
import { Check, ChevronLeft, Crosshair, QrCode, RotateCw, Search, X } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { formatInventoryDotNumber } from './inventory-audio';
import { InventoryWarehousePickerSheet } from './InventoryWarehousePickerSheet';

interface InventoryWarehouseCheckScanScreenProps {
  warehouses: InventoryWarehouseDto[];
  selectedWarehouseId: number;
  permissions: Record<InventoryPermissionAction, boolean>;
  isClientConsultant: boolean;
  previewRole?: InventoryRolePreviewKey | null;
  previewStoreId?: number | null;
  refreshTick: number;
  onSelectWarehouse: (warehouseId: number) => void;
  onOpenScanner: () => void;
  onBackToMenu: () => void;
  onSelectSku: (params: { checkId: number; inventoryItemId: number; itemName: string }) => void;
}

const CHECK_TAB_ITEMS: Array<{ key: InventoryCheckTab; label: string }> = [
  { key: 'Check', label: 'Kiểm Tra' },
  { key: 'Missing', label: 'Chưa Cập Nhật' },
  { key: 'Lost-Temporary', label: 'LOST-TEMPORARY' },
];

export function resolveCheckRowHighlightStyle(row: InventoryCheckSkuRowDto): React.CSSProperties | undefined {
  if (row.min_count == null || row.max_count == null) return undefined;
  const currentA = row.total_quantity;
  const minC = row.min_count;
  const maxC = row.max_count;
  if (currentA < maxC) {
    if (currentA === minC) {
      return { backgroundColor: 'rgba(250, 50, 50, 0.5)' };
    }
    if (currentA - minC === 1 || currentA - minC === 2) {
      return { backgroundColor: 'rgba(255, 204, 0, 0.5)' };
    }
  }
  return undefined;
}

export function InventoryWarehouseCheckScanScreen({
  warehouses,
  selectedWarehouseId,
  permissions,
  isClientConsultant,
  previewRole,
  previewStoreId,
  refreshTick,
  onSelectWarehouse,
  onOpenScanner,
  onBackToMenu,
  onSelectSku,
}: InventoryWarehouseCheckScanScreenProps) {
  const visibleStates = getVisibleMobileCheckStates(permissions, isClientConsultant);
  const [itemState, setItemState] = useState<'New' | 'Using'>(visibleStates[0] || 'New');
  const [activeTab, setActiveTab] = useState<InventoryCheckTab>('Check');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [checkData, setCheckData] = useState<InventoryCheckScanResponse['inventory_check'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<'finish' | 'reset' | null>(null);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!visibleStates.includes(itemState)) {
      setItemState(visibleStates[0] || 'Using');
    }
  }, [visibleStates, itemState]);

  const loadCheckData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.inventory.getCheckScan({
        warehouseId: selectedWarehouseId,
        itemState,
        tab: activeTab,
        keyword: keyword.trim() || undefined,
        previewRole: previewRole ?? undefined,
        previewStoreId: previewStoreId ?? undefined,
      });
      if (res.success) {
        setCheckData(res.inventory_check);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouseId, itemState, activeTab, keyword, previewRole, previewStoreId, refreshTick]);

  useEffect(() => {
    void loadCheckData();
  }, [loadCheckData]);

  const handleConfirmCheckAction = async () => {
    if (!confirmAction) return;
    const action = confirmAction;
    setConfirmAction(null);
    try {
      const payload = {
        checkId: checkData?.inventory_warehouse_check_id,
        warehouseId: selectedWarehouseId,
        itemState,
        previewRole: previewRole ?? undefined,
        previewStoreId: previewStoreId ?? undefined,
      };
      const res =
        action === 'finish'
          ? await apiClient.inventory.finishCheck(payload)
          : await apiClient.inventory.resetCheck(payload);
      setAlertModal({
        title: res.success ? 'Success' : 'Error',
        message: res.message || 'Done',
      });
      await loadCheckData();
    } catch (err: unknown) {
      setAlertModal({
        title: 'Error',
        message: err instanceof Error ? err.message : 'Error',
      });
    }
  };

  const selectedWarehouse =
    warehouses.find((w) => w.inventory_warehouse_id === selectedWarehouseId) || checkData?.inventory_warehouse;
  const summaryTotal = Number(checkData?.inventory_item_summary?.total_quantity ?? checkData?.total_quantity ?? 0);
  const summaryChecked = Number(
    checkData?.inventory_item_summary?.total_quantity_checked ?? checkData?.total_quantity_checked ?? 0
  );
  const isSummaryAllChecked = summaryTotal > 0 && summaryChecked === summaryTotal;

  return (
    <div className="flex-1 flex flex-col bg-white text-black min-h-0 relative">
      {/* Legacy Header Bar (#000000 with #FFB400 text & icons) */}
      <div className="h-[52px] bg-black text-[#FFB400] px-2.5 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBackToMenu}
          className="p-1.5 text-[#FFB400] cursor-pointer shrink-0"
          aria-label="Quay lại menu kho"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="flex-1 text-center font-semibold text-base text-[#FFB400] truncate px-2 cursor-pointer"
        >
          {selectedWarehouse?.inventory_warehouse_name || 'Chọn kho'}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen((prev) => !prev);
              if (isSearchOpen) setKeyword('');
            }}
            className="p-1.5 text-[#FFB400] cursor-pointer"
            aria-label="Tìm kiếm SKU"
          >
            {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction('reset')}
            className="p-1.5 text-[#FFB400] cursor-pointer"
            aria-label="Reset kiểm kho"
            title="Reset"
          >
            <RotateCw className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmAction('finish')}
            className="px-1.5 py-1 text-sm font-semibold text-[#FFB400] cursor-pointer"
          >
            Finish
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="px-3 py-2 bg-neutral-100 border-b border-neutral-300 shrink-0">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm tên SKU, thuộc tính hoặc #ID..."
            className="w-full px-3 py-1.5 rounded bg-white border border-neutral-300 text-xs text-black focus:outline-none"
          />
        </div>
      )}

      {/* Tier-1 MenuBar (#181818): NEW | USING (CC sees ONLY USING) */}
      <div
        className="h-[46px] bg-[#181818] grid shrink-0"
        style={{ gridTemplateColumns: `repeat(${visibleStates.length}, minmax(0, 1fr))` }}
      >
        {visibleStates.map((st) => {
          const isActive = itemState === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setItemState(st)}
              className={`relative flex items-center justify-center text-xs font-bold tracking-wider uppercase cursor-pointer transition-colors ${
                isActive ? 'text-[#FFB400]' : 'text-[#808080]'
              }`}
            >
              <span>{st.toUpperCase()}</span>
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#FFB400]" />}
            </button>
          );
        })}
      </div>

      {/* Tier-2 TabBar (#FFB400): Kiểm Tra | Chưa Cập Nhật | LOST-TEMPORARY */}
      <div className="h-[46px] bg-[#FFB400] grid grid-cols-3 shrink-0">
        {CHECK_TAB_ITEMS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center justify-center px-1 text-[13px] font-semibold cursor-pointer transition-colors ${
                isActive ? 'text-white bg-transparent' : 'text-[#7A5B00] bg-black/10'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-black" />}
            </button>
          );
        })}
      </div>

      {/* White Summary Row matching screenshot: right-aligned bullseye + total & check + checked */}
      <div className="h-[42px] bg-white border-b border-[#808080] px-3 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onOpenScanner}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-xs font-semibold text-neutral-800 cursor-pointer"
          title="Mở camera quét kiểm kho"
        >
          <QrCode className="w-3.5 h-3.5 text-black" />
          <span>Quét</span>
        </button>

        <div className="flex items-center gap-5 text-[15px] font-semibold tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-black">
            <Crosshair className="w-4 h-4 text-black" />
            <span>{formatInventoryDotNumber(summaryTotal)}</span>
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            style={{ color: isSummaryAllChecked ? '#00D000' : '#000000' }}
          >
            <Check className="w-4 h-4" strokeWidth={3} />
            <span>{formatInventoryDotNumber(summaryChecked)}</span>
          </span>
        </div>
      </div>

      {/* Scrollable SKU Table matching InventoryWarehouseCheckScanCell */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Đang tải dữ liệu kiểm kho...</div>
        ) : !checkData || checkData.inventory_item.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">Không có vật tư nào trong mục này.</div>
        ) : (
          checkData.inventory_item.map((row, idx) => {
            const rowStyle = resolveCheckRowHighlightStyle(row);
            const rowAllChecked = row.total_quantity > 0 && row.total_quantity_checked === row.total_quantity;

            return (
              <button
                key={`${row.inventory_item_id}-${idx}`}
                type="button"
                onClick={() =>
                  onSelectSku({
                    checkId: checkData.inventory_warehouse_check_id,
                    inventoryItemId: row.inventory_item_id,
                    itemName: row.item.inventory_item_name,
                  })
                }
                style={rowStyle}
                className="w-full text-left px-2.5 py-2.5 min-h-[50px] flex items-center gap-2 hover:brightness-95 cursor-pointer transition-colors"
              >
                <span className="w-7 text-center text-[13px] text-neutral-400 tabular-nums shrink-0">{idx + 1}</span>

                <div className="flex-1 min-w-0 pr-1">
                  <div className="text-[14px] font-normal text-neutral-900 truncate leading-snug">
                    {row.item.inventory_item_name}
                  </div>
                  <div className="text-[12px] text-neutral-500 truncate leading-tight">
                    {row.item.inventory_item_attribute || ''} {row.item.inventory_item_brand || ''}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 tabular-nums">
                  <div className="flex items-baseline gap-1 min-w-[74px]">
                    <Crosshair className="w-3.5 h-3.5 text-black self-center shrink-0" />
                    <span className="text-[15px] font-medium text-black">
                      {formatInventoryDotNumber(row.total_quantity)}
                    </span>
                    {row.max_count != null && row.max_count > 0 && (
                      <span className="text-[11px] text-neutral-500">/ {row.max_count}</span>
                    )}
                  </div>

                  <div
                    className="flex items-center gap-1 min-w-[44px] justify-end"
                    style={{ color: rowAllChecked ? '#00D000' : '#000000' }}
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />
                    <span className="text-[15px] font-medium">
                      {formatInventoryDotNumber(row.total_quantity_checked)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <InventoryWarehousePickerSheet
        open={isPickerOpen}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onSelect={(w) => onSelectWarehouse(w.inventory_warehouse_id)}
        onClose={() => setIsPickerOpen(false)}
      />

      {confirmAction && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="w-full max-w-[300px] bg-white rounded-xl p-4 text-center shadow-2xl">
            <div className="font-bold text-base text-black">Warning</div>
            <div className="text-sm text-neutral-700 mt-1">
              Are you sure? ({confirmAction === 'finish' ? 'Finish' : 'Reset'})
            </div>
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
                onClick={handleConfirmCheckAction}
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
