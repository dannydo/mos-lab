'use client';

import React from 'react';
import { Badge, Button, Tooltip } from 'antd';
import { Crosshair, Eraser, Filter, Save } from 'lucide-react';
import type { CustomerServiceFilterCategory, CustomerServiceFilterOption } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import ActiveFilterTags from '../filters/ActiveFilterTags';
import SavedFilterDropdown from '../filters/SavedFilterDropdown';
import type { buildCustomerFilterParams } from './filterHelpers';

export interface CustomerFilterToolbarProps {
  savedFilters: SafeAny[];
  presetFilters: SafeAny[];
  handleDeleteFilter: (id: string, name: string) => Promise<void>;
  applyFilter: (filter: SafeAny) => void;
  hasActiveFilters: boolean;
  setFilterDrawerVisible: (visible: boolean) => void;
  onOpenRandomModal?: () => void;
  isManagerOrAdmin: boolean;
  clearFilters: () => void;
  setSaveFilterModalVisible: (visible: boolean) => void;
  filterParams: ReturnType<typeof buildCustomerFilterParams>;
  onClearFilter: (key: string) => void;
  staffList: SafeAny[];
  serviceFilterOptions: CustomerServiceFilterOption[];
  serviceFilterCategories: CustomerServiceFilterCategory[];
  campaignList: SafeAny[];
}

export const CustomerFilterToolbar: React.FC<CustomerFilterToolbarProps> = ({
  savedFilters,
  presetFilters,
  handleDeleteFilter,
  applyFilter,
  hasActiveFilters,
  setFilterDrawerVisible,
  onOpenRandomModal,
  isManagerOrAdmin,
  clearFilters,
  setSaveFilterModalVisible,
  filterParams,
  onClearFilter,
  staffList,
  serviceFilterOptions,
  serviceFilterCategories,
  campaignList,
}) => {
  return (
    <div className="customer-filter-workspace">
      <div className="customer-filter-controls" role="group" aria-label="Bộ lọc danh sách khách hàng">
        <div className="customer-filter-controls__group">
          <SavedFilterDropdown
            savedFilters={savedFilters}
            presetFilters={presetFilters}
            handleDeleteFilter={handleDeleteFilter}
            applyFilter={applyFilter}
          />

          <Tooltip title="Bộ lọc nâng cao">
            <Badge dot={hasActiveFilters} offset={[-2, 2]}>
              <Button
                data-ui="customer-filter-trigger"
                aria-label="Mở bộ lọc nâng cao"
                icon={<AppIcon icon={Filter} size={14} />}
                onClick={() => setFilterDrawerVisible(true)}
                className={
                  hasActiveFilters
                    ? 'rounded-md border-blue-500 text-blue-500 dark:border-blue-400 dark:text-blue-400'
                    : 'rounded-md'
                }
              />
            </Badge>
          </Tooltip>
        </div>

        {onOpenRandomModal && isManagerOrAdmin && (
          <div className="customer-filter-controls__group customer-filter-controls__group--selection">
            <Tooltip title="Chọn ngẫu nhiên khách hàng theo bộ lọc">
              <Button
                aria-label="Chọn ngẫu nhiên khách hàng theo bộ lọc"
                icon={<AppIcon icon={Crosshair} size={14} />}
                onClick={onOpenRandomModal}
                className="rounded-md border-[var(--mos-accent)] text-[var(--mos-accent)]"
              />
            </Tooltip>
          </div>
        )}

        {hasActiveFilters && (
          <div className="customer-filter-controls__group customer-filter-controls__group--active">
            <Tooltip title="Xóa tất cả bộ lọc">
              <Button icon={<AppIcon icon={Eraser} size={14} />} danger onClick={clearFilters} className="rounded-md" />
            </Tooltip>
            <Tooltip title="Lưu bộ lọc hiện tại">
              <Button
                aria-label="Lưu bộ lọc hiện tại"
                icon={<AppIcon icon={Save} size={14} />}
                onClick={() => setSaveFilterModalVisible(true)}
                className="rounded-md border-[var(--mos-accent)] text-[var(--mos-accent)]"
              />
            </Tooltip>
          </div>
        )}
      </div>

      <ActiveFilterTags
        inline
        filterParams={filterParams}
        onClearFilter={onClearFilter}
        hasActiveFilters={hasActiveFilters}
        staffList={staffList}
        serviceFilterOptions={serviceFilterOptions}
        serviceFilterCategories={serviceFilterCategories}
        campaignList={campaignList}
      />
    </div>
  );
};
