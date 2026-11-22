'use client';

import React from 'react';
import { Button, Input, Select, Space, Tabs, Tooltip } from 'antd';
import { Search, Settings } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { TAB_KEYS, type Touchpoint } from '../hooks/useNycData';
import { NYC_SORT_OPTIONS } from './nycPageTypes';

export interface NycToolbarSectionProps {
  themeMode: 'light' | 'dark';
  activeTab: string;
  activeTouchpointKey: string;
  tabCounts: Record<string, number>;
  touchpointCounts: Record<string, number>;
  activeTouchpointsList: Touchpoint[];
  searchQuery: string;
  sortField: string;
  onTabChange: (key: string) => void;
  onTouchpointChange: (key: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onOpenTableConfig: () => void;
}

export function NycToolbarSection({
  themeMode,
  activeTab,
  activeTouchpointKey,
  tabCounts,
  touchpointCounts,
  activeTouchpointsList,
  searchQuery,
  sortField,
  onTabChange,
  onTouchpointChange,
  onSearchChange,
  onSortChange,
  onOpenTableConfig,
}: NycToolbarSectionProps) {
  const isDark = themeMode === 'dark';

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={onTabChange}
        type="card"
        className="mb-3"
        items={TAB_KEYS.map((tab) => {
          const tabCount = tabCounts[tab.id] || 0;
          const isActive = activeTab === tab.id;
          return {
            key: tab.id,
            label: (
              <Space>
                <span>{tab.name}</span>
                {tabCount > 0 && (
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold leading-none tabular-nums ${
                      isActive
                        ? 'bg-[var(--mos-accent)] text-[var(--mos-accent-contrast)]'
                        : isDark
                          ? 'bg-neutral-700 text-white'
                          : 'bg-neutral-300 text-neutral-700'
                    }`}
                  >
                    {tabCount > 9999 ? '9999+' : tabCount}
                  </span>
                )}
              </Space>
            ),
          };
        })}
      />

      <div
        className={`mb-4 rounded-xl border p-3 transition-all duration-300 ${
          isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'
        }`}
      >
        <div className="flex flex-col items-stretch justify-between gap-3 xl:flex-row xl:items-center">
          <div className="custom-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => onTouchpointChange('ALL')}
              className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 select-none ${
                activeTouchpointKey === 'ALL'
                  ? 'border-amber-500/40 bg-amber-500/15 font-bold text-amber-500 shadow-sm'
                  : isDark
                    ? 'border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                    : 'border-slate-200/60 bg-slate-100/70 text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span>Tất cả chạm</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  activeTouchpointKey === 'ALL'
                    ? 'bg-amber-500 text-black'
                    : isDark
                      ? 'bg-white/10 text-slate-300'
                      : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tabCounts[activeTab] || 0}
              </span>
            </button>

            {activeTouchpointsList.map((tp) => {
              const isSelected = activeTouchpointKey === tp.key;
              const count = touchpointCounts[tp.key] || 0;
              const isRed = tp.color === 'red';
              const isOrange = tp.color === 'orange';
              const isGreen = tp.color === 'green';

              return (
                <button
                  key={tp.key}
                  type="button"
                  onClick={() => onTouchpointChange(tp.key)}
                  className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-200 select-none ${
                    isSelected
                      ? 'border-amber-500/40 bg-amber-500/15 font-bold text-amber-500 shadow-sm'
                      : isDark
                        ? 'border-white/5 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]'
                        : 'border-slate-200/60 bg-slate-100/70 text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isRed ? 'bg-rose-500' : isOrange ? 'bg-amber-500' : isGreen ? 'bg-emerald-500' : 'bg-sky-500'
                    }`}
                  />
                  <span>{tp.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      isSelected
                        ? 'bg-amber-500 text-black'
                        : isRed
                          ? 'bg-rose-500/20 text-rose-400'
                          : isOrange
                            ? 'bg-amber-500/20 text-amber-400'
                            : isGreen
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isDark
                                ? 'bg-sky-500/20 text-sky-400'
                                : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Input
              placeholder="Tìm khách hàng (Tên, SĐT, ID)..."
              prefix={<AppIcon icon={Search} size={14} className="text-[var(--mos-text-muted)]" />}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              allowClear
              size="middle"
              className="w-[220px]"
            />
            <Select
              value={sortField}
              onChange={onSortChange}
              size="middle"
              className="w-[170px]"
              options={[...NYC_SORT_OPTIONS]}
            />
            <Tooltip title="Cấu hình cột bảng">
              <Button
                icon={<AppIcon icon={Settings} size={15} />}
                size="middle"
                onClick={onOpenTableConfig}
                aria-label="Cấu hình cột bảng"
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
}
