'use client';

import { Button, Card, Input, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BkBookingDetailsFilter } from '@mos-lab/shared';
import { Maximize2, Minimize2, RotateCw, Search, X } from 'lucide-react';
import { DataTable } from '~/components/ui';
import type { BkBookingDetailRow } from './bkBookingUtils';

const { Text } = Typography;

export interface BkBookingDetailsCardProps {
  records: BkBookingDetailRow[];
  columns: ColumnsType<BkBookingDetailRow>;
  loading: boolean;
  selectedBookerName: string | null;
  selectedDetailStatus: BkBookingDetailsFilter;
  searchText: string;
  isCompact: boolean;
  onSearchChange: (value: string) => void;
  onToggleCompact: () => void;
  onRefresh: () => void;
  onClearBookerFilter: () => void;
  onClearStatusFilter: () => void;
}

export function BkBookingDetailsCard({
  records,
  columns,
  loading,
  selectedBookerName,
  selectedDetailStatus,
  searchText,
  isCompact,
  onSearchChange,
  onToggleCompact,
  onRefresh,
  onClearBookerFilter,
  onClearStatusFilter,
}: BkBookingDetailsCardProps) {
  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold m-0 text-slate-900 dark:text-slate-100">
              Chi Tiết Khách Hàng Đặt Lịch & Trạng Thái
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
            {selectedDetailStatus === 'MISSED' && (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                <span>Chỉ Missed / Đã hủy</span>
                <button
                  type="button"
                  aria-label="Bỏ lọc trạng thái Missed / Đã hủy"
                  onClick={onClearStatusFilter}
                  className="inline-flex items-center justify-center rounded p-0.5 text-rose-600 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <Text type="secondary" className="text-xs">
            {selectedBookerName
              ? `Hiển thị ${selectedDetailStatus === 'MISSED' ? 'booking Missed / đã hủy của' : 'danh sách booking được tạo bởi'} Booker ${selectedBookerName}`
              : 'Hiển thị tất cả danh sách booking của nhóm Telesales'}
          </Text>
        </div>

        <Space>
          <Input
            prefix={<Search className="w-3.5 h-3.5 text-slate-400" />}
            placeholder="Tìm tên khách, SĐT, mã đơn..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            className="w-56"
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

      <DataTable<BkBookingDetailRow>
        dataSource={records}
        columns={columns}
        rowKey="rowKeyId"
        loading={loading}
        pagination={{
          defaultPageSize: 50,
          pageSizeOptions: ['20', '50', '100', '200'],
          showSizeChanger: true,
          showTotal: (total) => `Tổng cộng ${total}\u00a0đơn booking`,
        }}
        size="small"
        scroll={{ x: 'max-content' }}
        className={isCompact ? 'compact-table' : ''}
      />
    </Card>
  );
}
