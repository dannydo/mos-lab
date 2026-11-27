'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { InventoryCheckPhysicalItemDto, InventoryRolePreviewKey } from '@mos-lab/shared';
import { ArrowLeft, Check, Search, X } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

interface InventoryWarehouseCheckItemScreenProps {
  checkId: number;
  inventoryItemId: number;
  itemName: string;
  previewRole?: InventoryRolePreviewKey | null;
  previewStoreId?: number | null;
  onBack: () => void;
  onSelectWarehouseItem: (warehouseItemId: number) => void;
}

export function InventoryWarehouseCheckItemScreen({
  checkId,
  inventoryItemId,
  itemName,
  previewRole,
  previewStoreId,
  onBack,
  onSelectWarehouseItem,
}: InventoryWarehouseCheckItemScreenProps) {
  const [items, setItems] = useState<InventoryCheckPhysicalItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(
    async (searchKeyword: string) => {
      setIsLoading(true);
      try {
        const res = await apiClient.inventory.getCheckItems({
          checkId,
          inventoryItemId,
          keyword: searchKeyword.trim() || undefined,
          page: 1,
          limit: 100,
          previewRole: previewRole ?? undefined,
          previewStoreId: previewStoreId ?? undefined,
        });
        if (res.success) {
          setItems(res.inventory_check.data);
          setTotal(res.inventory_check.page.total);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [checkId, inventoryItemId, previewRole, previewStoreId]
  );

  useEffect(() => {
    void loadItems(keyword);
  }, [loadItems, keyword]);

  return (
    <div className="flex-1 flex flex-col bg-white text-black min-h-0">
      <div className="h-[52px] bg-black text-[#FFB400] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button type="button" onClick={onBack} className="p-1.5 cursor-pointer" aria-label="Quay lại">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold text-sm truncate">{itemName}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsSearchOpen((prev) => !prev);
            if (isSearchOpen) setKeyword('');
          }}
          className="p-1.5 cursor-pointer"
          aria-label="Tìm kiếm mã sản phẩm"
        >
          {isSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>
      </div>

      {isSearchOpen && (
        <div className="px-3 py-2 bg-neutral-100 border-b border-neutral-300">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm số thứ tự đơn nhập (#orderItemId) hoặc thuộc tính..."
            className="w-full px-3 py-1.5 rounded bg-white border border-neutral-300 text-xs text-black focus:outline-none"
          />
        </div>
      )}

      <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-200 text-[11px] text-neutral-500 flex items-center justify-between">
        <span>Danh sách sản phẩm vật lý</span>
        <span className="tabular-nums font-semibold text-neutral-700">{total} mã</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-neutral-500">Đang tải danh sách...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500">Không có sản phẩm nào.</div>
        ) : (
          items.map((row) => {
            const isChecked = row.total_quantity_checked > 0;
            return (
              <button
                key={row.inventory_warehouse_item_id}
                type="button"
                onClick={() => onSelectWarehouseItem(row.inventory_warehouse_item_id)}
                className="w-full text-left px-3.5 py-3 flex items-center justify-between hover:bg-neutral-50 cursor-pointer"
              >
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-medium text-neutral-900 tabular-nums">
                    {row.first_inventory_warehouse_order_item_id || row.inventory_warehouse_item_id}{' '}
                    <span className="text-neutral-500">-</span> <span className="font-semibold">{row.item_state}</span>
                  </div>
                  <div className="text-xs text-neutral-500 truncate mt-0.5">
                    {row.item.inventory_item_attribute || ''} {row.item.inventory_item_brand || ''}
                  </div>
                </div>
                {isChecked ? (
                  <Check className="w-5 h-5 text-[#00D000] shrink-0" strokeWidth={3} />
                ) : (
                  <span className="text-xs text-neutral-300 font-bold shrink-0">○</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
