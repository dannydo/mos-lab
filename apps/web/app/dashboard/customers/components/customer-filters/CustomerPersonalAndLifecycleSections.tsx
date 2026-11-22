'use client';

import React from 'react';
import { Button, Form, Select } from 'antd';
import { Calendar, DollarSign, Eye, Gift } from 'lucide-react';
import FilterSectionHeader from '~/components/filters/FilterSectionHeader';
import RangeFilterField from '~/components/filters/RangeFilterField';
import { AppIcon } from '~/components/ui';
import {
  AGE_PRESETS,
  BIRTHDAY_PRESETS,
  DOB_MONTH_OPTIONS,
  FOREIGN_FILTER_OPTIONS,
  PROMO_USED_OPTIONS,
  getFilterCardClass,
  getFilterFieldLabelClass,
} from './constants';
import { formatVndInput, parseVndInput } from './filterHelpers';
import type { CustomerFiltersProps } from './types';

export type CustomerPersonalAndLifecycleSectionsProps = Pick<
  CustomerFiltersProps,
  | 'themeMode'
  | 'dobMonth'
  | 'setDobMonth'
  | 'birthdayPreset'
  | 'setBirthdayPreset'
  | 'ageMin'
  | 'setAgeMin'
  | 'ageMax'
  | 'setAgeMax'
  | 'isForeignFilter'
  | 'setIsForeignFilter'
  | 'daysSinceLastVisitMin'
  | 'setDaysSinceLastVisitMin'
  | 'daysSinceLastVisitMax'
  | 'setDaysSinceLastVisitMax'
  | 'totalSpentMin'
  | 'setTotalSpentMin'
  | 'totalSpentMax'
  | 'setTotalSpentMax'
  | 'totalVisitsMin'
  | 'setTotalVisitsMin'
  | 'totalVisitsMax'
  | 'setTotalVisitsMax'
  | 'promoUsed'
  | 'setPromoUsed'
  | 'promoCountMin'
  | 'setPromoCountMin'
  | 'promoCountMax'
  | 'setPromoCountMax'
  | 'setActiveFilterId'
>;

export const CustomerPersonalAndLifecycleSections: React.FC<CustomerPersonalAndLifecycleSectionsProps> = ({
  themeMode,
  dobMonth,
  setDobMonth,
  birthdayPreset,
  setBirthdayPreset,
  ageMin,
  setAgeMin,
  ageMax,
  setAgeMax,
  isForeignFilter,
  setIsForeignFilter,
  daysSinceLastVisitMin,
  setDaysSinceLastVisitMin,
  daysSinceLastVisitMax,
  setDaysSinceLastVisitMax,
  totalSpentMin,
  setTotalSpentMin,
  totalSpentMax,
  setTotalSpentMax,
  totalVisitsMin,
  setTotalVisitsMin,
  totalVisitsMax,
  setTotalVisitsMax,
  promoUsed,
  setPromoUsed,
  promoCountMin,
  setPromoCountMin,
  promoCountMax,
  setPromoCountMax,
  setActiveFilterId,
}) => {
  const cardClass = getFilterCardClass(themeMode);
  const labelClass = getFilterFieldLabelClass(themeMode);
  const subHeadingClass =
    themeMode === 'dark'
      ? 'mb-1.5 text-xs font-medium text-slate-400'
      : 'mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400';

  return (
    <>
      {/* CARD 1: THÔNG TIN CÁ NHÂN (SINH NHẬT & ĐỘ TUỔI) */}
      <div className={cardClass}>
        <FilterSectionHeader
          icon={<AppIcon icon={Gift} size={14} />}
          title="Thông tin cá nhân (Sinh nhật & Độ tuổi)"
          themeMode={themeMode}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className={subHeadingClass}>Tháng sinh nhật</div>
            <Select
              aria-label="Lọc theo tháng sinh nhật"
              allowClear
              placeholder="Chọn tháng"
              value={dobMonth ? String(dobMonth) : undefined}
              onChange={(val) => {
                setDobMonth?.(val ? parseInt(val, 10) : undefined);
                setBirthdayPreset?.(undefined);
                setActiveFilterId(null);
              }}
              className="mb-2 w-full"
              options={DOB_MONTH_OPTIONS}
            />

            <div className="flex flex-wrap gap-1.5">
              {BIRTHDAY_PRESETS.map((preset) => {
                const isSelected = birthdayPreset === preset.value;
                return (
                  <Button
                    key={preset.value}
                    size="small"
                    type={isSelected ? 'primary' : 'default'}
                    onClick={() => {
                      if (isSelected) {
                        setBirthdayPreset?.(undefined);
                      } else {
                        setBirthdayPreset?.(preset.value);
                        setDobMonth?.(undefined);
                      }
                      setActiveFilterId(null);
                    }}
                    className={
                      isSelected
                        ? 'h-6 rounded-2xl border-[var(--mos-accent)] bg-[var(--mos-accent)] px-2.5 text-[11px] leading-[22px] text-[var(--mos-accent-contrast)]'
                        : 'h-6 rounded-2xl px-2.5 text-[11px] leading-[22px]'
                    }
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <div className={subHeadingClass}>Khoảng độ tuổi</div>
            <RangeFilterField
              minLabel="Tuổi tối thiểu"
              maxLabel="Tuổi tối đa"
              minPlaceholder="Min (VD: 20)"
              maxPlaceholder="Max (VD: 35)"
              minValue={ageMin}
              maxValue={ageMax}
              onChangeMin={(val: number | undefined) => {
                setAgeMin?.(val);
                setActiveFilterId(null);
              }}
              onChangeMax={(val: number | undefined) => {
                setAgeMax?.(val);
                setActiveFilterId(null);
              }}
              themeMode={themeMode}
            />

            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {AGE_PRESETS.map((preset) => {
                const isSelected = ageMin === preset.min && ageMax === preset.max;
                return (
                  <Button
                    key={preset.label}
                    size="small"
                    type={isSelected ? 'primary' : 'default'}
                    onClick={() => {
                      if (isSelected) {
                        setAgeMin?.(undefined);
                        setAgeMax?.(undefined);
                      } else {
                        setAgeMin?.(preset.min);
                        setAgeMax?.(preset.max);
                      }
                      setActiveFilterId(null);
                    }}
                    className={
                      isSelected
                        ? 'h-6 rounded-2xl border-[var(--mos-accent)] bg-[var(--mos-accent)] px-2 text-[11px] leading-[22px] text-[var(--mos-accent-contrast)]'
                        : 'h-6 rounded-2xl px-2 text-[11px] leading-[22px]'
                    }
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={
            themeMode === 'dark'
              ? 'mt-3.5 border-t border-dashed border-slate-700 pt-3'
              : 'mt-3.5 border-t border-dashed border-slate-300 pt-3 dark:border-slate-700'
          }
        >
          <div className={subHeadingClass}>🌐 Phân loại Quốc tịch</div>
          <Select
            aria-label="Lọc theo quốc tịch khách hàng"
            value={isForeignFilter || 'all'}
            onChange={(val) => {
              setIsForeignFilter?.(val as 'all' | 'foreign' | 'local');
              setActiveFilterId(null);
            }}
            className="w-full"
            options={FOREIGN_FILTER_OPTIONS}
          />
        </div>
      </div>

      {/* CARD 2: VÒNG ĐỜI KHÁCH HÀNG & CHI TIÊU */}
      <div className={cardClass}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <FilterSectionHeader
              icon={<AppIcon icon={Calendar} size={14} />}
              title="Chưa tới tiệm (Ngày)"
              themeMode={themeMode}
            />
            <RangeFilterField
              minLabel="Số ngày ít nhất"
              maxLabel="Số ngày nhiều nhất"
              minPlaceholder="VD: 30 ngày"
              maxPlaceholder="VD: 90 ngày"
              minValue={daysSinceLastVisitMin}
              maxValue={daysSinceLastVisitMax}
              onChangeMin={(val: number | undefined) => {
                setDaysSinceLastVisitMin(val);
                setActiveFilterId(null);
              }}
              onChangeMax={(val: number | undefined) => {
                setDaysSinceLastVisitMax(val);
                setActiveFilterId(null);
              }}
              themeMode={themeMode}
            />
          </div>

          <div>
            <FilterSectionHeader
              icon={<AppIcon icon={DollarSign} size={14} />}
              title="Chi tiêu tích lũy (VND)"
              themeMode={themeMode}
            />
            <RangeFilterField
              minLabel="Tổng chi tối thiểu"
              maxLabel="Tổng chi tối đa"
              minPlaceholder="Từ đ"
              maxPlaceholder="Đến đ"
              minValue={totalSpentMin}
              maxValue={totalSpentMax}
              onChangeMin={(val: number | undefined) => {
                setTotalSpentMin(val);
                setActiveFilterId(null);
              }}
              onChangeMax={(val: number | undefined) => {
                setTotalSpentMax(val);
                setActiveFilterId(null);
              }}
              formatter={formatVndInput}
              parser={parseVndInput}
              themeMode={themeMode}
            />
          </div>
        </div>
      </div>

      {/* CARD 3: TẦN SUẤT GHÉ & KHUYẾN MÃI */}
      <div className={cardClass}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <FilterSectionHeader
              icon={<AppIcon icon={Eye} size={14} />}
              title="Số lần ghé tiệm"
              themeMode={themeMode}
            />
            <RangeFilterField
              minLabel="Lần ghé tối thiểu"
              maxLabel="Lần ghé tối đa"
              minPlaceholder="VD: 3 lần"
              maxPlaceholder="VD: 10 lần"
              minValue={totalVisitsMin}
              maxValue={totalVisitsMax}
              onChangeMin={(val: number | undefined) => {
                setTotalVisitsMin(val);
                setActiveFilterId(null);
              }}
              onChangeMax={(val: number | undefined) => {
                setTotalVisitsMax(val);
                setActiveFilterId(null);
              }}
              themeMode={themeMode}
            />
          </div>

          <div>
            <FilterSectionHeader
              icon={<AppIcon icon={Gift} size={14} />}
              title="Khuyến mãi & Ưu đãi"
              themeMode={themeMode}
            />
            <Form.Item label={<span className={labelClass}>Trạng thái dùng Khuyến mãi</span>} className="mb-2">
              <Select
                aria-label="Lọc trạng thái dùng khuyến mãi"
                value={promoUsed}
                className="w-full"
                onChange={(val) => {
                  setPromoUsed(val);
                  setActiveFilterId(null);
                  if (val !== 'yes') {
                    setPromoCountMin(undefined);
                    setPromoCountMax(undefined);
                  }
                }}
                options={PROMO_USED_OPTIONS}
              />
            </Form.Item>

            {promoUsed === 'yes' && (
              <RangeFilterField
                minLabel="Dùng tối thiểu"
                maxLabel="Dùng tối đa"
                minPlaceholder="VD: 1 lần"
                maxPlaceholder="VD: 5 lần"
                minValue={promoCountMin}
                maxValue={promoCountMax}
                onChangeMin={(val: number | undefined) => {
                  setPromoCountMin(val);
                  setActiveFilterId(null);
                }}
                onChangeMax={(val: number | undefined) => {
                  setPromoCountMax(val);
                  setActiveFilterId(null);
                }}
                min={1}
                themeMode={themeMode}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
