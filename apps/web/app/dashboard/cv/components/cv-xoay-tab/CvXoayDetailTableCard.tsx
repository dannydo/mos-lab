'use client';

import { Space } from 'antd';
import type { TableColumnType } from 'antd';
import { Maximize2, Minimize2, RefreshCw, Settings, ShieldCheck } from 'lucide-react';
import type { ColumnConfig, CvXoayRecord } from '@mos-lab/shared';
import { AppIcon, DataTable, IconButton, SearchField, SectionCard, StatusTag } from '~/components/ui';
import { TableConfigDrawer } from '~/components/TableConfigDrawer';

export interface CvXoayDetailTableCardProps {
  records: CvXoayRecord[];
  columns: TableColumnType<CvXoayRecord>[];
  loading: boolean;
  refreshLoading: boolean;
  selectedCvName: string | null;
  searchText: string;
  isCompact: boolean;
  pageSize: number;
  configVisible: boolean;
  rawConfig: ColumnConfig[];
  onSearchChange: (value: string) => void;
  onToggleCompact: () => void;
  onRefresh: () => void;
  onOpenConfig: () => void;
  onCloseConfig: () => void;
  onSaveConfig: (columns: ColumnConfig[], saveAsDefault?: boolean) => Promise<void>;
  onResetConfig: () => Promise<void>;
  onPageSizeChange: (size: number) => void;
}

export function CvXoayDetailTableCard({
  records,
  columns,
  loading,
  refreshLoading,
  selectedCvName,
  searchText,
  isCompact,
  pageSize,
  configVisible,
  rawConfig,
  onSearchChange,
  onToggleCompact,
  onRefresh,
  onOpenConfig,
  onCloseConfig,
  onSaveConfig,
  onResetConfig,
  onPageSizeChange,
}: CvXoayDetailTableCardProps) {
  return (
    <>
      <SectionCard
        bodyPadding={0}
        className="full-bleed-card shadow-sm rounded-xl"
        title={
          <div className="flex flex-wrap justify-between items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <AppIcon icon={ShieldCheck} size={18} className="text-blue-500 shrink-0" />
              <span className="font-bold text-base text-slate-900 dark:text-slate-100">
                Bảng Báo Cáo Chi Tiết Ca Làm Chuyên Viên (CV Xoay)
              </span>
              {selectedCvName ? (
                <StatusTag status="gold" label={`Chuyên viên: ${selectedCvName}`} className="font-bold text-xs ml-2" />
              ) : null}
            </div>

            <Space wrap>
              <SearchField
                id="cv-xoay-search-input"
                name="cvXoaySearch"
                behavior="filter"
                aria-label="Tìm tên CV"
                placeholder="Tìm tên CV..."
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
                allowClear
                className="w-full sm:w-[250px]"
              />
              <IconButton
                label={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}
                icon={isCompact ? Maximize2 : Minimize2}
                onClick={onToggleCompact}
                className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
              />
              <IconButton label="Làm mới dữ liệu" icon={RefreshCw} onClick={onRefresh} loading={refreshLoading} />
              <IconButton label="Cấu hình cột" icon={Settings} onClick={onOpenConfig} />
            </Space>
          </div>
        }
      >
        <DataTable<CvXoayRecord>
          dataSource={records}
          columns={columns}
          rowKey="orderServiceId"
          loading={loading}
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: (total) => `∑ ${total} Bộ Mi`,
            onChange: (_, size) => onPageSizeChange(size),
          }}
          scroll={{ x: 1300 }}
          size="small"
          bordered
          className={isCompact ? 'compact-table' : ''}
        />
      </SectionCard>

      <TableConfigDrawer
        visible={configVisible}
        onClose={onCloseConfig}
        title="Cấu hình cột Báo Cáo CV Xoay"
        columns={rawConfig}
        onSave={onSaveConfig}
        onReset={onResetConfig}
      />
    </>
  );
}
