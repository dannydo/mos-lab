'use client';

import React, { useMemo, useState } from 'react';
import { removeVietnameseTones, type InventoryWarehouseDto } from '@mos-lab/shared';
import { Check, Search, X } from 'lucide-react';

interface InventoryWarehousePickerSheetProps {
  open: boolean;
  warehouses: InventoryWarehouseDto[];
  selectedWarehouseId: number;
  onSelect: (warehouse: InventoryWarehouseDto) => void;
  onClose: () => void;
}

export function InventoryWarehousePickerSheet({
  open,
  warehouses,
  selectedWarehouseId,
  onSelect,
  onClose,
}: InventoryWarehousePickerSheetProps) {
  const [keyword, setKeyword] = useState('');

  const filtered = useMemo(() => {
    const q = removeVietnameseTones(keyword).trim();
    if (!q) return warehouses;
    return warehouses.filter((w) =>
      removeVietnameseTones(`${w.inventory_warehouse_name} ${w.inventory_warehouse_address || ''}`).includes(q)
    );
  }, [warehouses, keyword]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/70 flex flex-col justify-end">
      <div className="bg-white text-black rounded-t-2xl max-h-[75dvh] flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-black text-[#FFB400] px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-sm">Chọn Kho Kiểm Tra</span>
          <button type="button" onClick={onClose} className="p-1 cursor-pointer" aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kho (vd: De Tham, Estella, Main)..."
              className="w-full text-sm text-black bg-transparent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
          {filtered.map((w) => {
            const isSelected = w.inventory_warehouse_id === selectedWarehouseId;
            return (
              <button
                key={w.inventory_warehouse_id}
                type="button"
                onClick={() => {
                  onSelect(w);
                  onClose();
                }}
                className={`w-full text-left px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? 'bg-[#FFB400]/20' : 'hover:bg-neutral-50'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="text-sm font-semibold text-neutral-900 truncate">{w.inventory_warehouse_name}</div>
                  <div className="text-xs text-neutral-500">
                    #{w.inventory_warehouse_id} · {w.inventory_warehouse_type}
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-[#FFB400] shrink-0" />}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-500">Không tìm thấy kho phù hợp.</div>
          )}
        </div>
      </div>
    </div>
  );
}
