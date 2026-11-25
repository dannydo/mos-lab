'use client';

import React, { useMemo, useState } from 'react';
import { Button, Input, Typography } from 'antd';
import { GraduationCap, Search, Wallet, X } from 'lucide-react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import { CvFeather1Badge } from '~/app/ios-app/components/ui-kit/CvFeatherLabels';
import type { CcIncomeSummary } from '~/components/cc-thu-nhap/CcIncomeSummaryCards';
import { AppIcon, DataTable, SectionCard } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import { CcIncomeMobileList } from './CcIncomeMobileList';
import { buildCcIncomeColumns } from './ccIncomeColumns';
import type { ProjectedCcIncomeRecord } from './cc-thu-nhap-utils';

const { Text } = Typography;

interface CcIncomePaystubSectionProps {
  filteredData: CcPaystubRecord[];
  loading: boolean;
  isMobile: boolean;
  isAdminUser: boolean;
  searchText: string;
  onSearchTextChange: (nextValue: string) => void;
  onOpenTrainingConfig: () => void;
  summary: CcIncomeSummary;
  isDayMode: boolean;
  isPastPeriod: boolean;
  periodNoun: string;
  getProjectedRecord: (record: CcPaystubRecord) => ProjectedCcIncomeRecord;
  onOpenDetailModal: (record: CcPaystubRecord) => void;
  onSelectMobileCard?: (record: CcPaystubRecord) => void;
  onOpenWorkLogModal: (record: CcPaystubRecord) => void;
  onOpenCcXoayModal: (record: CcPaystubRecord) => void;
  onOpenComboModal: (record: CcPaystubRecord) => void;
  onOpenTipModal: (record: CcPaystubRecord) => void;
  onOpenDiamondModal: (record: CcPaystubRecord) => void;
}

export function CcIncomePaystubSection({
  filteredData,
  loading,
  isMobile,
  isAdminUser,
  searchText,
  onSearchTextChange,
  onOpenTrainingConfig,
  summary,
  isDayMode,
  isPastPeriod,
  periodNoun,
  getProjectedRecord,
  onOpenDetailModal,
  onSelectMobileCard,
  onOpenWorkLogModal,
  onOpenCcXoayModal,
  onOpenComboModal,
  onOpenTipModal,
  onOpenDiamondModal,
}: CcIncomePaystubSectionProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const columns = useMemo(
    () =>
      buildCcIncomeColumns({
        isDayMode,
        isPastPeriod,
        periodNoun,
        getProjectedRecord,
        onOpenDetailModal,
        onOpenWorkLogModal,
        onOpenCcXoayModal,
        onOpenComboModal,
        onOpenTipModal,
        onOpenDiamondModal,
      }),
    [
      isDayMode,
      isPastPeriod,
      periodNoun,
      getProjectedRecord,
      onOpenDetailModal,
      onOpenWorkLogModal,
      onOpenCcXoayModal,
      onOpenComboModal,
      onOpenTipModal,
      onOpenDiamondModal,
    ]
  );

  if (isMobile) {
    return (
      <section aria-label="Thu nhập CC" className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Phiếu thu nhập · {filteredData.length}
          </span>
          <div className="flex items-center gap-1.5">
            {isAdminUser && (
              <button
                type="button"
                onClick={onOpenTrainingConfig}
                className="h-7 px-2.5 rounded-full border border-slate-200/80 bg-white/90 text-slate-700 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 active:scale-95 cursor-pointer"
              >
                <AppIcon icon={GraduationCap} size={12} className="text-amber-500 shrink-0" />
                <span>Đào tạo</span>
                <CvFeather1Badge className="text-[10px] text-amber-500" />
              </button>
            )}
            <button
              type="button"
              aria-label={mobileSearchOpen ? 'Đóng tìm kiếm CC' : 'Tìm kiếm CC'}
              onClick={() => {
                if (mobileSearchOpen && searchText) onSearchTextChange('');
                setMobileSearchOpen((prev) => !prev);
              }}
              className="w-7 h-7 rounded-full border border-slate-200/80 bg-white/90 text-slate-600 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-slate-300 flex items-center justify-center active:scale-95 cursor-pointer"
            >
              <AppIcon icon={mobileSearchOpen ? X : Search} size={13} />
            </button>
          </div>
        </div>

        {mobileSearchOpen && (
          <Input
            placeholder="Tìm tên CC, chi nhánh..."
            prefix={<AppIcon icon={Search} size={14} className="text-slate-500 dark:text-slate-400" />}
            value={searchText}
            onChange={(e) => onSearchTextChange(e.target.value)}
            allowClear
            autoFocus
          />
        )}

        <CcIncomeMobileList
          records={filteredData}
          loading={loading}
          isDayMode={isDayMode}
          isPastPeriod={isPastPeriod}
          getProjectedRecord={getProjectedRecord}
          onSelectCard={onSelectMobileCard}
          onOpenDetailModal={onOpenDetailModal}
        />
      </section>
    );
  }

  return (
    <SectionCard
      title={
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <AppIcon icon={Wallet} size={18} className="text-amber-500 shrink-0" />
            <span className="font-bold text-base text-slate-900 dark:text-slate-100">Thu Nhập CC Live</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdminUser && (
              <Button size="small" onClick={onOpenTrainingConfig}>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <AppIcon icon={GraduationCap} size={14} className="text-amber-500 shrink-0" />
                  <span>Đào tạo</span>
                  <CvFeather1Badge className="text-[11px] text-amber-500" />
                </span>
              </Button>
            )}
            <Input
              placeholder="Tìm tên CC, chi nhánh..."
              prefix={<AppIcon icon={Search} size={14} className="text-slate-500 dark:text-slate-400" />}
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              className="w-[220px]"
              size="small"
              allowClear
            />
          </div>
        </div>
      }
      bodyPadding={0}
      className="full-bleed-card shadow-sm rounded-xl"
    >
      <DataTable<CcPaystubRecord>
        dataSource={filteredData}
        columns={columns}
        rowKey="consultantId"
        loading={loading}
        pagination={false}
        size="middle"
        bordered
        className="mb-0"
        locale={{ emptyText: 'Không tìm thấy dữ liệu thu nhập CC' }}
      />

      <div className="my-4 border-t border-slate-200 dark:border-slate-800" />

      <div className="flex justify-between items-center px-4 pb-4 flex-wrap gap-4">
        <div>
          <Text className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            ∑ THU NHẬP TẠM TÍNH (LIVE SALARY):
          </Text>
          <div className="text-xs text-slate-500 dark:text-slate-300">
            💡 Mẹo: Click vào cột Lương Giờ để xem Báo cáo Ca làm việc IN/OUT chi tiết theo từng ngày.
          </div>
        </div>
        <div className="tabular-nums whitespace-nowrap text-2xl font-extrabold text-amber-600 dark:text-amber-300">
          {formatVND(summary.grandTotalIncome)}
        </div>
      </div>
    </SectionCard>
  );
}
