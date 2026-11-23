'use client';

import React from 'react';
import { Form, Select } from 'antd';
import { LayoutGrid, Pin, Users } from 'lucide-react';
import { vietnameseSearchFilter } from '@mos-lab/shared';
import FilterSectionHeader from '~/components/filters/FilterSectionHeader';
import RangeFilterField from '~/components/filters/RangeFilterField';
import { AppIcon } from '~/components/ui';
import {
  ASSIGNED_STAFF_BASE_OPTIONS,
  BOOKER_STAFF_ROLES,
  REFERRAL_USED_OPTIONS,
  RETAINED_ONLY_OPTIONS,
  getFilterCardClass,
  getFilterFieldLabelClass,
} from './constants';
import type { CustomerFiltersProps } from './types';

export type CustomerServiceAndAllocationSectionsProps = Pick<
  CustomerFiltersProps,
  | 'themeMode'
  | 'serviceIds'
  | 'setServiceIds'
  | 'serviceCategories'
  | 'setServiceCategories'
  | 'serviceVisitCountMin'
  | 'setServiceVisitCountMin'
  | 'serviceVisitCountMax'
  | 'setServiceVisitCountMax'
  | 'serviceFilterOptions'
  | 'serviceFilterCategories'
  | 'serviceFilterOptionsLoading'
  | 'referralUsed'
  | 'setReferralUsed'
  | 'referralCountMin'
  | 'setReferralCountMin'
  | 'referralCountMax'
  | 'setReferralCountMax'
  | 'retainedOnly'
  | 'setRetainedOnly'
  | 'assignedStaffId'
  | 'setAssignedStaffId'
  | 'assignedDaysMin'
  | 'setAssignedDaysMin'
  | 'assignedDaysMax'
  | 'setAssignedDaysMax'
  | 'staffList'
  | 'setActiveFilterId'
> & {
  isManagerOrAdmin: boolean;
};

export const CustomerServiceAndAllocationSections: React.FC<CustomerServiceAndAllocationSectionsProps> = ({
  themeMode,
  isManagerOrAdmin,
  serviceIds,
  setServiceIds,
  serviceCategories,
  setServiceCategories,
  serviceVisitCountMin,
  setServiceVisitCountMin,
  serviceVisitCountMax,
  setServiceVisitCountMax,
  serviceFilterOptions,
  serviceFilterCategories,
  serviceFilterOptionsLoading,
  referralUsed,
  setReferralUsed,
  referralCountMin,
  setReferralCountMin,
  referralCountMax,
  setReferralCountMax,
  retainedOnly,
  setRetainedOnly,
  assignedStaffId,
  setAssignedStaffId,
  assignedDaysMin,
  setAssignedDaysMin,
  assignedDaysMax,
  setAssignedDaysMax,
  staffList,
  setActiveFilterId,
}) => {
  const cardClass = getFilterCardClass(themeMode);
  const labelClass = getFilterFieldLabelClass(themeMode);

  return (
    <>
      {/* CARD 4: DỊCH VỤ ĐÃ HOÀN TẤT */}
      <div className={cardClass}>
        <FilterSectionHeader
          icon={<AppIcon icon={LayoutGrid} size={14} />}
          title="Dịch vụ & Sản phẩm đã sử dụng"
          themeMode={themeMode}
        />
        <Form.Item
          label={<span className={labelClass}>Chọn thể loại hoặc dịch vụ (có thể chọn nhiều)</span>}
          className="mb-2.5"
        >
          <Select
            aria-label="Lọc theo dịch vụ hoặc sản phẩm đã sử dụng"
            mode="multiple"
            allowClear
            showSearch
            loading={serviceFilterOptionsLoading}
            placeholder="Ví dụ: Classic (tất cả biến thể), UltraLight..."
            value={[...serviceCategories.map((category) => `category:${category}`), ...serviceIds.map(String)]}
            filterOption={vietnameseSearchFilter}
            optionFilterProp="label"
            maxTagCount={2}
            className="w-full"
            onChange={(values: string[]) => {
              const nextCategories = values
                .filter((value) => value.startsWith('category:'))
                .map((value) => value.slice('category:'.length));
              const nextIds = values
                .filter((value) => !value.startsWith('category:'))
                .map(Number)
                .filter((id) => Number.isInteger(id) && id > 0);
              setServiceIds(nextIds);
              setServiceCategories(nextCategories);
              if (nextIds.length === 0 && nextCategories.length === 0) {
                setServiceVisitCountMin(undefined);
                setServiceVisitCountMax(undefined);
              }
              setActiveFilterId(null);
            }}
            options={[
              {
                label: 'Thể loại dịch vụ',
                options: serviceFilterCategories.map((category) => ({
                  value: `category:${category.key}`,
                  label: category.label,
                  title: `Đã đối chiếu ${category.serviceIds.length} dịch vụ đang hoạt động trong catalog`,
                })),
              },
              {
                label: 'Dịch vụ cụ thể',
                options: serviceFilterOptions.map((service) => ({
                  value: String(service.id),
                  label: service.name,
                  title: [service.serviceType, service.serviceGroup].filter(Boolean).join(' · '),
                })),
              },
            ]}
            notFoundContent={serviceFilterOptionsLoading ? 'Đang tải dịch vụ...' : 'Không có dịch vụ'}
          />
        </Form.Item>
        <div
          className={
            themeMode === 'dark' ? 'mb-3 text-xs text-slate-400' : 'mb-3 text-xs text-slate-500 dark:text-slate-400'
          }
        >
          Mỗi thể loại sẽ khớp mọi biến thể cùng tên, ví dụ <strong>UltraLight (tất cả biến thể)</strong>. Chỉ tính hóa
          đơn <strong>Completed</strong>; chọn nhiều mục sẽ tìm khách đã dùng ít nhất một mục.
        </div>
        <RangeFilterField
          minLabel="Số lần dùng tối thiểu"
          maxLabel="Số lần dùng tối đa"
          minPlaceholder="VD: 2 lần"
          maxPlaceholder="VD: 6 lần"
          minValue={serviceVisitCountMin}
          maxValue={serviceVisitCountMax}
          onChangeMin={(val: number | undefined) => {
            setServiceVisitCountMin(val);
            setActiveFilterId(null);
          }}
          onChangeMax={(val: number | undefined) => {
            setServiceVisitCountMax(val);
            setActiveFilterId(null);
          }}
          min={1}
          disabled={serviceIds.length === 0 && serviceCategories.length === 0}
          themeMode={themeMode}
        />
      </div>

      {/* CARD 5: PHÂN BỔ BOOKER & PHÂN LOẠI */}
      <div className={cardClass}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <FilterSectionHeader
              icon={<AppIcon icon={Users} size={14} />}
              title="Giới thiệu bạn (Referrals)"
              themeMode={themeMode}
            />
            <Form.Item label={<span className={labelClass}>Trạng thái giới thiệu</span>} className="mb-2">
              <Select
                aria-label="Lọc trạng thái giới thiệu"
                value={referralUsed}
                className="w-full"
                onChange={(val) => {
                  setReferralUsed(val);
                  setActiveFilterId(null);
                  if (val !== 'yes') {
                    setReferralCountMin(undefined);
                    setReferralCountMax(undefined);
                  }
                }}
                options={REFERRAL_USED_OPTIONS}
              />
            </Form.Item>

            {referralUsed === 'yes' && (
              <RangeFilterField
                minLabel="GT tối thiểu"
                maxLabel="GT tối đa"
                minPlaceholder="VD: 1 người"
                maxPlaceholder="VD: 5 người"
                minValue={referralCountMin}
                maxValue={referralCountMax}
                onChangeMin={(val: number | undefined) => {
                  setReferralCountMin(val);
                  setActiveFilterId(null);
                }}
                onChangeMax={(val: number | undefined) => {
                  setReferralCountMax(val);
                  setActiveFilterId(null);
                }}
                min={1}
                themeMode={themeMode}
              />
            )}
          </div>

          <div>
            <FilterSectionHeader
              icon={<AppIcon icon={Pin} size={14} className="text-amber-500" />}
              title="Trạng thái Giữ Data"
              themeMode={themeMode}
            />
            <Form.Item label={<span className={labelClass}>Lọc Khách hàng đã chọn giữ</span>} className="mb-0">
              <Select
                aria-label="Lọc khách hàng đã giữ data"
                value={retainedOnly ? 'yes' : 'all'}
                className="w-full"
                onChange={(val) => {
                  setRetainedOnly?.(val === 'yes');
                  setActiveFilterId(null);
                }}
                options={RETAINED_ONLY_OPTIONS}
              />
            </Form.Item>
          </div>
        </div>

        {isManagerOrAdmin && (
          <div
            className={
              themeMode === 'dark'
                ? 'mt-4 border-t border-dashed border-slate-800 pt-3.5'
                : 'mt-4 border-t border-dashed border-slate-200 pt-3.5 dark:border-slate-800'
            }
          >
            <FilterSectionHeader
              icon={<AppIcon icon={Users} size={14} />}
              title="Phân bổ Booker"
              themeMode={themeMode}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Form.Item label={<span className={labelClass}>Trạng thái phụ trách</span>} className="mb-0">
                <Select
                  aria-label="Lọc Booker phụ trách"
                  showSearch
                  filterOption={vietnameseSearchFilter}
                  value={assignedStaffId}
                  className="w-full"
                  onChange={(val) => {
                    setAssignedStaffId(val);
                    setActiveFilterId(null);
                  }}
                  options={[
                    ...ASSIGNED_STAFF_BASE_OPTIONS,
                    ...staffList
                      .filter((s) => BOOKER_STAFF_ROLES.has(s.role?.toLowerCase() || ''))
                      .map((s) => ({
                        value: s.id.toString(),
                        label: `Booker: ${s.displayName}`,
                      })),
                  ]}
                />
              </Form.Item>

              <RangeFilterField
                minLabel="Số ngày phân bổ ít nhất"
                maxLabel="Số ngày phân bổ nhiều nhất"
                minPlaceholder="VD: 5 ngày"
                maxPlaceholder="VD: 30 ngày"
                minValue={assignedDaysMin}
                maxValue={assignedDaysMax}
                onChangeMin={(val: number | undefined) => {
                  setAssignedDaysMin?.(val);
                  setActiveFilterId(null);
                }}
                onChangeMax={(val: number | undefined) => {
                  setAssignedDaysMax?.(val);
                  setActiveFilterId(null);
                }}
                themeMode={themeMode}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
