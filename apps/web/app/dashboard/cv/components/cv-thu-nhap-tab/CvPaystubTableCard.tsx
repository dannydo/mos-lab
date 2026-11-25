'use client';

import { useMemo, useState } from 'react';
import { Button, Input, Popover, Tooltip } from 'antd';
import { Clock, DollarSign, Maximize2, Minimize2, RefreshCw, Search, Settings } from 'lucide-react';
import type { CvPaystubRecord } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard } from '~/components/ui';
import { CvSelfManagedSubRow } from './CvSelfManagedSubRow';
import { CvSeniorityConfigPopover } from './CvSeniorityConfigPopover';
import { CvThuNhapMobileList } from './CvThuNhapMobileList';
import { buildCvThuNhapColumns } from './cvThuNhapColumns';
import type { CvIncomeForecastMeta, CvProjectedRecord, CvSeniorityRule } from './cvThuNhapUtils';

interface CvPaystubTableCardProps {
  filteredData: CvPaystubRecord[];
  loading: boolean;
  isMobile: boolean;
  isCompact: boolean;
  onToggleCompact: () => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onRefresh: () => void;
  forecastMeta: CvIncomeForecastMeta;
  getProjectedRecord: (record: CvPaystubRecord) => CvProjectedRecord;
  onSelectMobileCard?: (record: CvPaystubRecord) => void;
  onOpenWorkLogs: (record: CvPaystubRecord) => void;
  onOpenPaystubModal: (record: CvPaystubRecord) => void;
  onNavigateCareerPath: (staffId: number) => void;
  // Seniority config props
  seniorityRules: CvSeniorityRule[];
  configLoading: boolean;
  configSaving: boolean;
  canManagePaystub: boolean;
  popoverRefCallback: (node: HTMLDivElement | null) => void;
  onAddSeniorityRule: () => void;
  onUpdateSeniorityRule: (idx: number, field: keyof CvSeniorityRule, value: number) => void;
  onRemoveSeniorityRule: (idx: number) => void;
  onSaveSeniorityConfig: () => Promise<void>;
}

/** Main paystub breakdown table card with toolbar controls, seniority popover, and mobile list fallback. */
export function CvPaystubTableCard({
  filteredData,
  loading,
  isMobile,
  isCompact,
  onToggleCompact,
  searchText,
  onSearchTextChange,
  pageSize,
  onPageSizeChange,
  onRefresh,
  forecastMeta,
  getProjectedRecord,
  onSelectMobileCard,
  onOpenWorkLogs,
  onOpenPaystubModal,
  onNavigateCareerPath,
  seniorityRules,
  configLoading,
  configSaving,
  canManagePaystub,
  popoverRefCallback,
  onAddSeniorityRule,
  onUpdateSeniorityRule,
  onRemoveSeniorityRule,
  onSaveSeniorityConfig,
}: CvPaystubTableCardProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const columns = useMemo(
    () =>
      buildCvThuNhapColumns({
        forecastMeta,
        getProjectedRecord,
        onOpenWorkLogs,
        onOpenPaystubModal,
        onNavigateCareerPath,
      }),
    [forecastMeta, getProjectedRecord, onOpenWorkLogs, onOpenPaystubModal, onNavigateCareerPath]
  );

  const expandedRowKeys = useMemo(
    () => (filteredData || []).filter((r) => r.isCvPlus && r.cvPlusBreakdown).map((r) => r.staffId),
    [filteredData]
  );

  if (isMobile) {
    return (
      <section aria-label="Phiếu thu nhập CV" className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Phiếu thu nhập · {filteredData.length}
          </span>
          <div className="flex items-center gap-1.5">
            {canManagePaystub && (
              <Popover
                content={
                  <CvSeniorityConfigPopover
                    seniorityRules={seniorityRules}
                    configLoading={configLoading}
                    configSaving={configSaving}
                    canManagePaystub={canManagePaystub}
                    popoverRefCallback={popoverRefCallback}
                    onAddRule={onAddSeniorityRule}
                    onUpdateRule={onUpdateSeniorityRule}
                    onRemoveRule={onRemoveSeniorityRule}
                    onSaveConfig={onSaveSeniorityConfig}
                  />
                }
                trigger="click"
                placement="bottomRight"
              >
                <button
                  type="button"
                  aria-label="Cấu hình tỷ lệ thưởng thâm niên"
                  className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-100 text-slate-600 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
                >
                  <AppIcon icon={Settings} size={12} aria-hidden />
                </button>
              </Popover>
            )}
            <button
              type="button"
              aria-label="Tìm chuyên viên"
              onClick={() => {
                if (mobileSearchOpen && searchText) onSearchTextChange('');
                setMobileSearchOpen((prev) => !prev);
              }}
              className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                mobileSearchOpen || searchText
                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-amber-400 dark:border-amber-400 dark:text-slate-950'
                  : 'bg-slate-100 border-slate-200/80 text-slate-600 dark:bg-white/[0.06] dark:border-white/[0.1] dark:text-slate-300'
              }`}
            >
              <AppIcon icon={Search} size={12} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Làm mới thu nhập"
              onClick={onRefresh}
              className="w-7 h-7 rounded-full border border-slate-200/80 bg-slate-100 text-slate-600 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
            >
              <AppIcon icon={RefreshCw} size={12} className={loading ? 'animate-spin' : ''} aria-hidden />
            </button>
          </div>
        </div>

        {mobileSearchOpen && (
          <Input
            id="cv-thunhap-mobile-search"
            name="cvThuNhapMobileSearch"
            placeholder="Tìm tên CV hoặc gõ CVL..."
            prefix={<AppIcon icon={Search} size={13} className="text-slate-400" />}
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            allowClear
            size="middle"
            className="rounded-xl"
          />
        )}

        <CvThuNhapMobileList
          records={filteredData}
          loading={loading}
          forecastMeta={forecastMeta}
          getProjectedRecord={getProjectedRecord}
          onSelectCard={onSelectMobileCard}
          onOpenWorkLogs={onOpenWorkLogs}
          onOpenPaystubModal={onOpenPaystubModal}
          onNavigateCareerPath={onNavigateCareerPath}
        />
      </section>
    );
  }

  return (
    <SectionCard
      className="full-bleed-card shadow-sm rounded-xl"
      bodyPadding={0}
      title={
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-1 w-full">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <DollarSign className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-emerald-500 shrink-0" />
            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
              Bảng Bóc Tách CV Thu Nhập
            </span>

            <Popover
              content={
                <CvSeniorityConfigPopover
                  seniorityRules={seniorityRules}
                  configLoading={configLoading}
                  configSaving={configSaving}
                  canManagePaystub={canManagePaystub}
                  popoverRefCallback={popoverRefCallback}
                  onAddRule={onAddSeniorityRule}
                  onUpdateRule={onUpdateSeniorityRule}
                  onRemoveRule={onRemoveSeniorityRule}
                  onSaveConfig={onSaveSeniorityConfig}
                />
              }
              trigger="click"
              placement="bottomLeft"
            >
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={<Settings className="w-3.5 h-3.5 text-slate-400 hover:text-orange-500 transition-colors" />}
                title="Cấu hình tỷ lệ thưởng thâm niên"
              />
            </Popover>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <Input
              id="cv-thunhap-search-input"
              name="cvThuNhapSearch"
              placeholder="Tìm tên CV..."
              prefix={<Search className="w-3 h-3 text-slate-400" />}
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              allowClear
              className="flex-1 sm:w-[200px] text-xs"
            />
            <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
              <Button
                icon={isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                onClick={onToggleCompact}
                className={`shrink-0 ${isCompact ? 'text-amber-500 border-amber-500/50' : ''}`}
              />
            </Tooltip>
            <Tooltip title="Làm mới dữ liệu">
              <Button
                className="shrink-0"
                icon={<Clock className="w-3.5 h-3.5" />}
                onClick={onRefresh}
                loading={loading}
              />
            </Tooltip>
          </div>
        </div>
      }
    >
      {isMobile ? (
        <CvThuNhapMobileList
          records={filteredData}
          loading={loading}
          forecastMeta={forecastMeta}
          getProjectedRecord={getProjectedRecord}
          onOpenWorkLogs={onOpenWorkLogs}
          onOpenPaystubModal={onOpenPaystubModal}
          onNavigateCareerPath={onNavigateCareerPath}
        />
      ) : (
        <DataTable<CvPaystubRecord>
          dataSource={filteredData}
          columns={columns}
          rowKey="staffId"
          loading={loading}
          expandable={{
            expandedRowRender: (record: CvPaystubRecord) => (
              <CvSelfManagedSubRow record={record} onOpenPaystubModal={onOpenPaystubModal} />
            ),
            rowExpandable: (record: CvPaystubRecord) => Boolean(record.isCvPlus && record.cvPlusBreakdown),
            expandedRowKeys,
            showExpandColumn: false,
          }}
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (_page, size) => onPageSizeChange(size),
          }}
          scroll={{ x: 'max-content' }}
          size="small"
          className={isCompact ? 'compact-table' : ''}
        />
      )}
    </SectionCard>
  );
}
