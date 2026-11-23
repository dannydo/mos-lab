'use client';

import React from 'react';
import { Button, Form } from 'antd';
import { Eraser, Filter, Save } from 'lucide-react';
import { AdaptiveDrawer, AppIcon } from '~/components/ui';
import { CustomerCallAndCampaignSections } from './CustomerCallAndCampaignSections';
import { CustomerPersonalAndLifecycleSections } from './CustomerPersonalAndLifecycleSections';
import { CustomerServiceAndAllocationSections } from './CustomerServiceAndAllocationSections';
import type { CustomerFiltersProps } from './types';

export interface CustomerFilterDrawerProps extends CustomerFiltersProps {
  isCompactTier: boolean;
  isManagerOrAdmin: boolean;
  drawerWidth: number;
  isResizing: boolean;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  activeFilterCount: number;
}

export const CustomerFilterDrawer: React.FC<CustomerFilterDrawerProps> = (props) => {
  const {
    themeMode,
    hasActiveFilters,
    clearFilters,
    filterDrawerVisible,
    setFilterDrawerVisible,
    setSaveFilterModalVisible,
    isCompactTier,
    isManagerOrAdmin,
    drawerWidth,
    isResizing,
    onResizeMouseDown,
    activeFilterCount,
  } = props;

  const isDark = themeMode === 'dark';

  return (
    <AdaptiveDrawer
      intent="data"
      className="customer-filter-overlay"
      title={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--mos-accent-soft)] text-[var(--mos-accent)]">
              <AppIcon icon={Filter} size={16} />
            </div>
            <div>
              <div
                className={
                  isDark
                    ? 'text-[15px] font-bold tracking-[0.3px] text-gray-100'
                    : 'text-[15px] font-bold tracking-[0.3px] text-gray-900 dark:text-gray-100'
                }
              >
                BỘ LỌC NÂNG CAO
              </div>
              <div
                className={
                  isDark ? 'text-xs font-normal text-gray-400' : 'text-xs font-normal text-gray-500 dark:text-gray-400'
                }
              >
                Tùy chỉnh thông số lọc khách hàng
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <span className="inline-flex h-[22px] shrink-0 items-center justify-center rounded-full border border-[var(--mos-accent)] bg-amber-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-[var(--mos-accent)] tabular-nums dark:bg-[var(--mos-accent-soft)]">
              {activeFilterCount} tiêu chí đang bật
            </span>
          )}
        </div>
      }
      placement="right"
      width={isCompactTier ? undefined : drawerWidth}
      onClose={() => setFilterDrawerVisible(false)}
      open={filterDrawerVisible}
      classNames={{
        header: isDark
          ? 'border-b border-slate-800 bg-slate-900 px-6 py-4'
          : 'border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900',
        body: isDark ? 'relative bg-slate-950 px-6 py-5' : 'relative bg-slate-50 px-6 py-5 dark:bg-slate-950',
        footer: isDark
          ? 'border-t border-slate-800 bg-slate-900/85 px-6 py-3.5 backdrop-blur-md'
          : 'border-t border-slate-200 bg-white/85 px-6 py-3.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85',
      }}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button
            icon={<AppIcon icon={Eraser} size={14} />}
            danger
            disabled={!hasActiveFilters}
            onClick={() => {
              clearFilters();
            }}
            className="h-[38px] rounded-lg px-4 font-medium"
          >
            Xóa bộ lọc
          </Button>
          <div className="flex gap-2">
            <Button
              icon={<AppIcon icon={Save} size={14} />}
              disabled={!hasActiveFilters}
              onClick={() => setSaveFilterModalVisible(true)}
              className="h-[38px] rounded-lg border-[var(--mos-accent)] px-4 font-medium text-[var(--mos-accent)]"
            >
              Lưu bộ lọc
            </Button>
            <Button
              type="primary"
              icon={<AppIcon icon={Filter} size={14} />}
              onClick={() => setFilterDrawerVisible(false)}
              className="h-[38px] rounded-lg border-[var(--mos-accent)] bg-[var(--mos-accent)] px-5 font-semibold text-[var(--mos-accent-contrast)] shadow-[0_2px_8px_var(--mos-accent-border)]"
            >
              Áp dụng bộ lọc
            </Button>
          </div>
        </div>
      }
    >
      {/* DRAGGABLE RESIZE HANDLE ON LEFT EDGE */}
      {!isCompactTier && (
        <div
          onMouseDown={onResizeMouseDown}
          title="Kéo sang trái/phải để thay đổi kích thước side slide"
          className={`absolute inset-y-0 left-0 z-[100] flex w-3 cursor-col-resize items-center justify-center transition-colors duration-150 ${
            isResizing ? 'bg-[var(--mos-accent-soft)]' : 'bg-transparent'
          }`}
        >
          <div
            className={`h-12 w-1 rounded-[2px] transition-all duration-150 ${
              isResizing
                ? 'bg-[var(--mos-accent)] shadow-[0_0_10px_var(--mos-accent)]'
                : isDark
                  ? 'bg-slate-600'
                  : 'bg-slate-300 dark:bg-slate-600'
            }`}
          />
        </div>
      )}

      <Form layout="vertical" className="flex flex-col gap-[18px]">
        <CustomerPersonalAndLifecycleSections
          themeMode={props.themeMode}
          dobMonth={props.dobMonth}
          setDobMonth={props.setDobMonth}
          birthdayPreset={props.birthdayPreset}
          setBirthdayPreset={props.setBirthdayPreset}
          ageMin={props.ageMin}
          setAgeMin={props.setAgeMin}
          ageMax={props.ageMax}
          setAgeMax={props.setAgeMax}
          isForeignFilter={props.isForeignFilter}
          setIsForeignFilter={props.setIsForeignFilter}
          daysSinceLastVisitMin={props.daysSinceLastVisitMin}
          setDaysSinceLastVisitMin={props.setDaysSinceLastVisitMin}
          daysSinceLastVisitMax={props.daysSinceLastVisitMax}
          setDaysSinceLastVisitMax={props.setDaysSinceLastVisitMax}
          totalSpentMin={props.totalSpentMin}
          setTotalSpentMin={props.setTotalSpentMin}
          totalSpentMax={props.totalSpentMax}
          setTotalSpentMax={props.setTotalSpentMax}
          totalVisitsMin={props.totalVisitsMin}
          setTotalVisitsMin={props.setTotalVisitsMin}
          totalVisitsMax={props.totalVisitsMax}
          setTotalVisitsMax={props.setTotalVisitsMax}
          promoUsed={props.promoUsed}
          setPromoUsed={props.setPromoUsed}
          promoCountMin={props.promoCountMin}
          setPromoCountMin={props.setPromoCountMin}
          promoCountMax={props.promoCountMax}
          setPromoCountMax={props.setPromoCountMax}
          setActiveFilterId={props.setActiveFilterId}
        />

        <CustomerServiceAndAllocationSections
          themeMode={props.themeMode}
          isManagerOrAdmin={isManagerOrAdmin}
          serviceIds={props.serviceIds}
          setServiceIds={props.setServiceIds}
          serviceCategories={props.serviceCategories}
          setServiceCategories={props.setServiceCategories}
          serviceVisitCountMin={props.serviceVisitCountMin}
          setServiceVisitCountMin={props.setServiceVisitCountMin}
          serviceVisitCountMax={props.serviceVisitCountMax}
          setServiceVisitCountMax={props.setServiceVisitCountMax}
          serviceFilterOptions={props.serviceFilterOptions}
          serviceFilterCategories={props.serviceFilterCategories}
          serviceFilterOptionsLoading={props.serviceFilterOptionsLoading}
          referralUsed={props.referralUsed}
          setReferralUsed={props.setReferralUsed}
          referralCountMin={props.referralCountMin}
          setReferralCountMin={props.setReferralCountMin}
          referralCountMax={props.referralCountMax}
          setReferralCountMax={props.setReferralCountMax}
          retainedOnly={props.retainedOnly}
          setRetainedOnly={props.setRetainedOnly}
          assignedStaffId={props.assignedStaffId}
          setAssignedStaffId={props.setAssignedStaffId}
          assignedDaysMin={props.assignedDaysMin}
          setAssignedDaysMin={props.setAssignedDaysMin}
          assignedDaysMax={props.assignedDaysMax}
          setAssignedDaysMax={props.setAssignedDaysMax}
          staffList={props.staffList}
          setActiveFilterId={props.setActiveFilterId}
        />

        <CustomerCallAndCampaignSections
          themeMode={props.themeMode}
          callStatuses={props.callStatuses}
          setCallStatuses={props.setCallStatuses}
          lastCallDaysMin={props.lastCallDaysMin}
          setLastCallDaysMin={props.setLastCallDaysMin}
          lastCallDaysMax={props.lastCallDaysMax}
          setLastCallDaysMax={props.setLastCallDaysMax}
          campaignId={props.campaignId}
          setCampaignId={props.setCampaignId}
          campaignFilterMode={props.campaignFilterMode}
          setCampaignFilterMode={props.setCampaignFilterMode}
          campaignList={props.campaignList}
          setActiveFilterId={props.setActiveFilterId}
        />
      </Form>
    </AdaptiveDrawer>
  );
};
