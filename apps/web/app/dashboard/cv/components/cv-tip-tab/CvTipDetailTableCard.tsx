'use client';

import { useMemo } from 'react';
import { Segmented, Space } from 'antd';
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import type { CvTipRecord, TipFilterType } from '@mos-lab/shared';
import { DataTable, IconButton, SearchField, SectionCard, StatusTag } from '~/components/ui';
import { buildCvTipRecordColumns } from './cvTipColumns';
import { CV_TIP_FILTER_OPTIONS } from './cvTipUtils';

export interface CvTipDetailTableCardProps {
  records: CvTipRecord[];
  totalRecords: number;
  loading: boolean;
  refreshLoading: boolean;
  selectedCvName: string | null;
  tipFilter: TipFilterType;
  searchText: string;
  isCompact: boolean;
  currentPage: number;
  pageSize: number;
  onTipFilterChange: (nextFilter: TipFilterType) => void;
  onSearchChange: (nextSearch: string) => void;
  onToggleCompact: () => void;
  onRefresh: () => void;
  onPageChange: (nextPage: number, nextPageSize: number) => void;
  onOpenCustomerHistory: (record: CvTipRecord) => void;
}

export function CvTipDetailTableCard({
  records,
  totalRecords,
  loading,
  refreshLoading,
  selectedCvName,
  tipFilter,
  searchText,
  isCompact,
  currentPage,
  pageSize,
  onTipFilterChange,
  onSearchChange,
  onToggleCompact,
  onRefresh,
  onPageChange,
  onOpenCustomerHistory,
}: CvTipDetailTableCardProps) {
  const columns = useMemo(() => buildCvTipRecordColumns({ onOpenCustomerHistory }), [onOpenCustomerHistory]);

  return (
    <SectionCard
      bodyPadding={0}
      className="full-bleed-card shadow-sm rounded-xl"
      title={
        <div className="flex flex-wrap justify-between items-center gap-2 py-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">Chi Tiết Ca Làm Nhận Tip 70%</span>
            {selectedCvName ? (
              <StatusTag status="gold" label={`Chuyên viên: ${selectedCvName}`} className="font-bold text-xs ml-2" />
            ) : null}
          </div>

          <Space wrap>
            <Segmented
              options={CV_TIP_FILTER_OPTIONS}
              value={tipFilter}
              onChange={(val) => onTipFilterChange(val as TipFilterType)}
            />
            <SearchField
              id="cv-tip-search-input"
              name="cvTipSearch"
              behavior="filter"
              aria-label="Tìm CV, khách, dịch vụ"
              placeholder="Tìm CV, khách, dịch vụ..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              allowClear
              className="w-full sm:w-[180px]"
            />
            <IconButton
              label={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}
              icon={isCompact ? Maximize2 : Minimize2}
              onClick={onToggleCompact}
              className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
            />
            <IconButton label="Làm mới dữ liệu" icon={RefreshCw} onClick={onRefresh} loading={refreshLoading} />
          </Space>
        </div>
      }
    >
      <DataTable<CvTipRecord>
        dataSource={records}
        columns={columns}
        rowKey="serviceId"
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize,
          total: totalRecords,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} lượt`,
          onChange: onPageChange,
        }}
        size="small"
        scroll={{ x: 680 }}
        className={isCompact ? 'compact-table' : ''}
      />
    </SectionCard>
  );
}
