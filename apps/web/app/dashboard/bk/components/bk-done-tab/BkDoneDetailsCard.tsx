'use client';

import { Button, Card, Input, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BkDoneDetailsFilter } from '@mos-lab/shared';
import {
  CircleCheck,
  DollarSign,
  ListFilter,
  Maximize2,
  Minimize2,
  Package,
  RotateCw,
  Search,
  Sparkles,
  UserCheck,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AppIcon, DataTable } from '~/components/ui';
import { getBkDoneFilterDescription, type BkDoneDetailRow } from './bkDoneUtils';

const { Text } = Typography;

interface FilterOption {
  value: BkDoneDetailsFilter;
  label: string;
  icon: LucideIcon;
  activeClass: string;
}

const BK_DONE_FILTER_OPTIONS: readonly FilterOption[] = [
  {
    value: 'ALL',
    label: 'Tất cả',
    icon: ListFilter,
    activeClass: 'bg-amber-500 text-white shadow-xs font-semibold',
  },
  {
    value: 'SINGLE',
    label: 'Khách Lẻ',
    icon: CircleCheck,
    activeClass: 'bg-emerald-600 text-white shadow-xs font-semibold',
  },
  {
    value: 'COMBO_LIVE',
    label: 'Combo Live',
    icon: Package,
    activeClass: 'bg-cyan-600 text-white shadow-xs font-semibold',
  },
  {
    value: 'COMBO_SOLD',
    label: 'Bán Combo',
    icon: Sparkles,
    activeClass: 'bg-violet-600 text-white shadow-xs font-semibold',
  },
  {
    value: 'NEW_CUSTOMER',
    label: 'Khách Mới',
    icon: UserCheck,
    activeClass: 'bg-rose-600 text-white shadow-xs font-semibold',
  },
  {
    value: 'TIP',
    label: 'Tip',
    icon: DollarSign,
    activeClass: 'bg-amber-600 text-white shadow-xs font-semibold',
  },
];

export interface BkDoneDetailsCardProps {
  records: BkDoneDetailRow[];
  columns: ColumnsType<BkDoneDetailRow>;
  loading: boolean;
  selectedBookerName: string | null;
  filterStatus: BkDoneDetailsFilter;
  searchText: string;
  isCompact: boolean;
  currentPage: number;
  pageSize: number;
  onFilterStatusChange: (status: BkDoneDetailsFilter) => void;
  onSearchChange: (value: string) => void;
  onToggleCompact: () => void;
  onRefresh: () => void;
  onClearBookerFilter: () => void;
  onPaginationChange: (page: number, size: number) => void;
}

/** Renders the embedded BK Done customer detail table card with status pills, search, density toggle, and pagination. */
export function BkDoneDetailsCard({
  records,
  columns,
  loading,
  selectedBookerName,
  filterStatus,
  searchText,
  isCompact,
  currentPage,
  pageSize,
  onFilterStatusChange,
  onSearchChange,
  onToggleCompact,
  onRefresh,
  onClearBookerFilter,
  onPaginationChange,
}: BkDoneDetailsCardProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold m-0 text-slate-900 dark:text-slate-100">
              Chi Tiết Khách Hàng Đặt Lịch &amp; Bonus Done
            </h3>
            {selectedBookerName && (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <span>Đang lọc: {selectedBookerName}</span>
                <button
                  type="button"
                  aria-label={`Bỏ lọc booker ${selectedBookerName}`}
                  onClick={onClearBookerFilter}
                  className="inline-flex items-center justify-center rounded p-0.5 text-amber-600 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <Text type="secondary" className="text-xs">
            {getBkDoneFilterDescription(filterStatus)}
          </Text>
        </div>

        <Space wrap>
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            {BK_DONE_FILTER_OPTIONS.map((option) => {
              const isActive = filterStatus === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                    isActive
                      ? option.activeClass
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  onClick={() => onFilterStatusChange(option.value)}
                >
                  <AppIcon icon={option.icon} size={14} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <Input
            prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
            placeholder="Tìm tên khách, SĐT, dịch vụ..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            className="w-48"
            size="small"
          />
          <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
            <Button
              icon={isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              size="small"
              onClick={onToggleCompact}
              className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
              aria-label={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn'}
            />
          </Tooltip>
          <Tooltip title="Làm mới dữ liệu">
            <Button
              icon={<RotateCw className="w-3.5 h-3.5" />}
              size="small"
              onClick={onRefresh}
              loading={loading}
              aria-label="Tải lại dữ liệu"
              title="Tải lại dữ liệu"
            />
          </Tooltip>
        </Space>
      </div>

      <DataTable<BkDoneDetailRow>
        dataSource={records}
        columns={columns}
        rowKey="rowKeyId"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize,
          pageSizeOptions: ['20', '50', '100', '200'],
          showSizeChanger: true,
          onChange: onPaginationChange,
          showTotal: (total) => `Tổng cộng ${total}\u00a0đơn hàng`,
        }}
        size="small"
        scroll={{ x: 'max-content' }}
        className={isCompact ? 'compact-table' : ''}
      />
    </Card>
  );
}
