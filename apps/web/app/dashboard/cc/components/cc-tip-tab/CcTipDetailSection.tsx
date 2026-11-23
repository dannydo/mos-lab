'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Segmented, Tooltip } from 'antd';
import { Info, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import type { CcTipRecord, TipFilterType } from '@mos-lab/shared';
import { AppIcon, DataTable, IconButton, SearchField, SectionCard, StatusTag } from '~/components/ui';
import { buildCcTipDetailColumns } from './ccTipDetailColumns';

interface CcTipDetailSectionProps {
  records: CcTipRecord[];
  totalCount: number;
  totalTippedCount: number;
  totalSmallChangeCount: number;
  totalNoTipCount: number;
  selectedCcName: string | null;
  tipFilter: TipFilterType;
  onTipFilterChange: (nextFilter: TipFilterType) => void;
  searchText: string;
  onSearchTextChange: (nextSearch: string) => void;
  isCompact: boolean;
  onToggleCompact: () => void;
  onRefresh: () => void;
  loading: boolean;
  fetching: boolean;
}

export function CcTipDetailSection({
  records,
  totalCount,
  totalTippedCount,
  totalSmallChangeCount,
  totalNoTipCount,
  selectedCcName,
  tipFilter,
  onTipFilterChange,
  searchText,
  onSearchTextChange,
  isCompact,
  onToggleCompact,
  onRefresh,
  loading,
  fetching,
}: CcTipDetailSectionProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const columns = useMemo(() => buildCcTipDetailColumns(), []);

  useEffect(() => {
    setCurrentPage(1);
  }, [tipFilter, searchText, selectedCcName]);

  const maxPage = Math.max(1, Math.ceil(records.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, maxPage);

  return (
    <SectionCard
      bodyPadding={0}
      className="full-bleed-card shadow-sm rounded-xl"
      title={
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-base">Chi tiết khách Tip</span>
          <Tooltip title="Theo dõi tip khách hàng và thưởng CC Tip 20% theo từng ca phục vụ">
            <span className="inline-flex cursor-help">
              <AppIcon icon={Info} size={15} className="text-slate-400" />
            </span>
          </Tooltip>
          {selectedCcName ? (
            <StatusTag status="gold" label={selectedCcName} className="font-bold text-xs m-0 max-w-[180px] truncate" />
          ) : null}
        </div>
      }
      extra={<span className="tip-detail-count tabular-nums">{records.length} ca</span>}
    >
      <div className="tip-detail-toolbar">
        <Segmented
          options={[
            { label: `Tất cả (${totalCount})`, value: 'ALL' },
            { label: `Có Tip ≥ 20K (${totalTippedCount})`, value: 'TIPPED' },
            { label: `Tiền lẻ < 20K (${totalSmallChangeCount})`, value: 'SMALL_CHANGE' },
            { label: `Không Tip (${totalNoTipCount})`, value: 'NO_TIP' },
          ]}
          value={tipFilter}
          onChange={(val) => onTipFilterChange(val as TipFilterType)}
          className="tip-detail-filter font-semibold text-xs"
        />

        <div className="tip-detail-toolbar-actions">
          <SearchField
            behavior="filter"
            aria-label="Tìm khách hàng, dịch vụ"
            placeholder="Tìm khách hàng, dịch vụ..."
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            className="tip-detail-search"
            allowClear
          />

          <IconButton
            label={isCompact ? 'Chuyển chế độ xem chuẩn' : 'Chuyển chế độ xem gọn'}
            icon={isCompact ? Maximize2 : Minimize2}
            onClick={onToggleCompact}
            className={`tip-detail-toolbar-icon ${isCompact ? 'text-amber-500 border-amber-500/50' : ''}`}
          />

          <IconButton
            label="Làm mới dữ liệu"
            icon={RefreshCw}
            onClick={onRefresh}
            loading={fetching}
            className="tip-detail-toolbar-icon"
          />
        </div>
      </div>

      <DataTable<CcTipRecord>
        columns={columns}
        dataSource={records}
        rowKey="serviceId"
        loading={loading}
        pagination={{
          current: safeCurrentPage,
          pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['20', '50', '100', '200'],
          showTotal: (total) => `Tổng cộng ${total} ca phục vụ`,
          onChange: (nextPage, nextPageSize) => {
            setCurrentPage(nextPage);
            setPageSize(nextPageSize);
          },
        }}
        size="small"
        scroll={{ x: 890 }}
        className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
      />
    </SectionCard>
  );
}
