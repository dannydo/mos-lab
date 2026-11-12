'use client';

import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { Package, Search, AlertCircle, ChevronRight } from 'lucide-react';

interface ScreenInventoryStockProps {
  onOpenSettings?: () => void;
}

export function ScreenInventoryStock({ onOpenSettings }: ScreenInventoryStockProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [filterCategory, setFilterCategory] = useState<'ALL' | 'LASH' | 'GLUE' | 'CARE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [restockRequested, setRestockRequested] = useState(false);

  const inventoryItems = [
    {
      id: 'SKU-01',
      name: 'Khay Mi Flawless Silk C 0.07 (8-14mm)',
      category: 'LASH',
      stock: 48,
      minStock: 20,
      unit: 'Khay',
      status: 'IN_STOCK',
    },
    {
      id: 'SKU-02',
      name: 'Khay Mi Classic Royal D 0.12 (9-13mm)',
      category: 'LASH',
      stock: 12,
      minStock: 15,
      unit: 'Khay',
      status: 'LOW_STOCK',
    },
    {
      id: 'SKU-03',
      name: 'Keo Nối Mi Wings Ultra Bond (1s khô)',
      category: 'GLUE',
      stock: 8,
      minStock: 10,
      unit: 'Chai',
      status: 'LOW_STOCK',
    },
    {
      id: 'SKU-04',
      name: 'Gel Tháo Mi Không Cay Thảo Dược',
      category: 'GLUE',
      stock: 24,
      minStock: 10,
      unit: 'Hũ',
      status: 'IN_STOCK',
    },
    {
      id: 'SKU-05',
      name: 'Serum Dưỡng Mi Tế Bào Gốc Wings Pro',
      category: 'CARE',
      stock: 65,
      minStock: 25,
      unit: 'Cây',
      status: 'IN_STOCK',
    },
    {
      id: 'SKU-06',
      name: 'Bọt Vệ Sinh Mi Kháng Khuẩn Tea Tree',
      category: 'CARE',
      stock: 30,
      minStock: 15,
      unit: 'Chai',
      status: 'IN_STOCK',
    },
    {
      id: 'SKU-07',
      name: 'Băng Keo Lụa Chống Dị Ứng Da Mắt',
      category: 'CARE',
      stock: 110,
      minStock: 40,
      unit: 'Cuộn',
      status: 'IN_STOCK',
    },
  ];

  const filteredItems = inventoryItems.filter((item) => {
    if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-black text-white' : 'bg-[#F2F2F7] text-[#1C1C1E]'}`}>
      <IosNavigationBar
        title="Quản Lý Kho (Inventory)"
        rightAction={{
          label: 'Cài đặt',
          onClick: onOpenSettings || (() => {}),
        }}
      />

      {/* Search Bar */}
      <div className={`px-4 py-2 ${isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-[#E5E5EA]'} border-b`}>
        <div
          className={`flex items-center ${
            isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-[#F2F2F7] text-[#8E8E93]'
          } rounded-xl px-3 py-1.5 text-xs`}
        >
          <Search className="w-4 h-4 mr-2 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Tìm mã vật tư, khay mi, keo..."
            className={`w-full bg-transparent ${isDark ? 'text-white' : 'text-[#1C1C1E]'} focus:outline-none text-xs`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 mt-2 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'LASH', label: 'Khay mi' },
            { id: 'GLUE', label: 'Keo & Gel tháo' },
            { id: 'CARE', label: 'Dưỡng & Tiêu hao' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id as 'ALL' | 'LASH' | 'GLUE' | 'CARE')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filterCategory === cat.id
                  ? 'bg-[#FFB400] text-black font-bold'
                  : isDark
                    ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                    : 'bg-[#F2F2F7] text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Summary Banner */}
      <div className="px-4 py-3">
        <div
          className={`${
            isDark
              ? 'bg-amber-950/30 border-amber-700/60 text-amber-200'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          } border rounded-xl p-3 flex items-center justify-between text-xs`}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'} flex-shrink-0`} />
            <span>
              Có <strong>2 vật tư</strong> sắp chạm ngưỡng tối thiểu cần đề xuất nhập kho.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setRestockRequested(true)}
            className="text-[#FF9500] font-bold text-xs whitespace-nowrap ml-2 cursor-pointer"
          >
            {restockRequested ? '✓ Đã gửi' : 'Đề xuất'}
          </button>
        </div>
      </div>

      {/* Inventory List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div
          className={`${
            isDark ? 'bg-[#1C1C1E] border-neutral-800 divide-neutral-800' : 'bg-white border-[#E5E5EA] divide-[#E5E5EA]'
          } rounded-xl border divide-y overflow-hidden shadow-xs`}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 flex items-center justify-between ${
                isDark ? 'hover:bg-neutral-800/50' : 'hover:bg-[#F9F9FB]'
              } transition-colors`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                    item.status === 'LOW_STOCK'
                      ? isDark
                        ? 'bg-red-950/50 text-red-400 border border-red-800'
                        : 'bg-red-50 text-red-600 border border-red-200'
                      : isDark
                        ? 'bg-emerald-950/50 text-emerald-400'
                        : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <Package className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#1C1C1E]'}`}>{item.name}</div>
                  <div className="text-[11px] text-[#8E8E93] mt-0.5 tabular-nums">
                    Mã: {item.id} · Tối thiểu: {item.minStock} {item.unit}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div
                    className={`text-sm font-bold tabular-nums ${
                      item.status === 'LOW_STOCK' ? 'text-red-500' : isDark ? 'text-white' : 'text-[#1C1C1E]'
                    }`}
                  >
                    {item.stock} {item.unit}
                  </div>
                  <div className="text-[10px] text-[#8E8E93]">
                    {item.status === 'LOW_STOCK' ? 'Sắp hết' : 'Đủ định mức'}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
