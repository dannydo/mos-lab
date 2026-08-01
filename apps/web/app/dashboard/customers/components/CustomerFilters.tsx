'use client';

import React from 'react';
import { Drawer, Form, Select, Button, Space, Badge, Tooltip } from 'antd';
import {
  FilterOutlined,
  CalendarOutlined,
  DollarOutlined,
  EyeOutlined,
  GiftOutlined,
  TeamOutlined,
  ClearOutlined,
  SaveOutlined,
  PushpinFilled,
  AimOutlined,
} from '@ant-design/icons';
import { vietnameseSearchFilter } from '@mos-lab/shared';

// Shared and custom sub-components
import FilterSectionHeader from '~/components/filters/FilterSectionHeader';
import RangeFilterField from '~/components/filters/RangeFilterField';
import ActiveFilterTags from './filters/ActiveFilterTags';
import SaveFilterModal from './filters/SaveFilterModal';
import SavedFilterDropdown from './filters/SavedFilterDropdown';

interface CustomerFiltersProps {
  themeMode: string;
  token: SafeAny;
  currentUser: SafeAny;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  applyFilter: (filter: SafeAny) => void;
  savedFilters: SafeAny[];
  handleDeleteFilter: (id: string, name: string) => Promise<void>;
  filterDrawerVisible: boolean;
  setFilterDrawerVisible: (visible: boolean) => void;
  daysSinceLastVisitMin: number | undefined;
  setDaysSinceLastVisitMin: (val: number | undefined) => void;
  daysSinceLastVisitMax: number | undefined;
  setDaysSinceLastVisitMax: (val: number | undefined) => void;
  totalSpentMin: number | undefined;
  setTotalSpentMin: (val: number | undefined) => void;
  totalSpentMax: number | undefined;
  setTotalSpentMax: (val: number | undefined) => void;
  totalVisitsMin: number | undefined;
  setTotalVisitsMin: (val: number | undefined) => void;
  totalVisitsMax: number | undefined;
  setTotalVisitsMax: (val: number | undefined) => void;
  promoUsed: 'yes' | 'no' | 'all';
  setPromoUsed: (val: 'yes' | 'no' | 'all') => void;
  promoCountMin: number | undefined;
  setPromoCountMin: (val: number | undefined) => void;
  promoCountMax: number | undefined;
  setPromoCountMax: (val: number | undefined) => void;
  referralUsed: 'yes' | 'no' | 'all';
  setReferralUsed: (val: 'yes' | 'no' | 'all') => void;
  referralCountMin: number | undefined;
  setReferralCountMin: (val: number | undefined) => void;
  referralCountMax: number | undefined;
  setReferralCountMax: (val: number | undefined) => void;
  assignedStaffId: string;
  setAssignedStaffId: (val: string) => void;
  assignedDaysMin?: number | undefined;
  setAssignedDaysMin?: (val: number | undefined) => void;
  assignedDaysMax?: number | undefined;
  setAssignedDaysMax?: (val: number | undefined) => void;
  retainedOnly?: boolean;
  setRetainedOnly?: (val: boolean) => void;
  dobMonth?: number | string | undefined;
  setDobMonth?: (val: number | string | undefined) => void;
  birthdayPreset?: 'today' | 'this_month' | 'next_month' | undefined;
  setBirthdayPreset?: (val: 'today' | 'this_month' | 'next_month' | undefined) => void;
  ageMin?: number | undefined;
  setAgeMin?: (val: number | undefined) => void;
  ageMax?: number | undefined;
  setAgeMax?: (val: number | undefined) => void;
  setActiveFilterId: (id: string | null) => void;
  staffList: SafeAny[];
  saveFilterModalVisible: boolean;
  setSaveFilterModalVisible: (visible: boolean) => void;
  newFilterName: string;
  setNewFilterName: (val: string) => void;
  handleSaveFilter: () => Promise<void>;
  PRESET_FILTERS: SafeAny[];
  onOpenRandomModal?: () => void;
}

const CustomerFilters = React.memo(function CustomerFilters({
  themeMode,
  currentUser,
  hasActiveFilters,
  clearFilters,
  applyFilter,
  savedFilters,
  handleDeleteFilter,
  filterDrawerVisible,
  setFilterDrawerVisible,
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
  referralUsed,
  setReferralUsed,
  referralCountMin,
  setReferralCountMin,
  referralCountMax,
  setReferralCountMax,
  assignedStaffId,
  setAssignedStaffId,
  assignedDaysMin,
  setAssignedDaysMin,
  assignedDaysMax,
  setAssignedDaysMax,
  retainedOnly,
  setRetainedOnly,
  dobMonth,
  setDobMonth,
  birthdayPreset,
  setBirthdayPreset,
  ageMin,
  setAgeMin,
  ageMax,
  setAgeMax,
  setActiveFilterId,
  staffList,
  saveFilterModalVisible,
  setSaveFilterModalVisible,
  newFilterName,
  setNewFilterName,
  handleSaveFilter,
  PRESET_FILTERS,
  onOpenRandomModal,
}: CustomerFiltersProps) {
  const userRole = currentUser?.role ? String(currentUser.role).toLowerCase() : '';
  const isManagerOrAdmin = userRole === 'admin' || userRole === 'manager';

  const filterParams = {
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    assignedDaysMin,
    assignedDaysMax,
    retainedOnly: retainedOnly ? 'true' : undefined,
    dobMonth,
    birthdayPreset,
    ageMin,
    ageMax,
  };

  const onClearFilter = (key: string) => {
    switch (key) {
      case 'daysSinceLastVisitMin':
        setDaysSinceLastVisitMin(undefined);
        break;
      case 'daysSinceLastVisitMax':
        setDaysSinceLastVisitMax(undefined);
        break;
      case 'totalSpentMin':
        setTotalSpentMin(undefined);
        break;
      case 'totalSpentMax':
        setTotalSpentMax(undefined);
        break;
      case 'totalVisitsMin':
        setTotalVisitsMin(undefined);
        break;
      case 'totalVisitsMax':
        setTotalVisitsMax(undefined);
        break;
      case 'promoUsed':
        setPromoUsed('all');
        break;
      case 'promoCountMin':
        setPromoCountMin(undefined);
        break;
      case 'promoCountMax':
        setPromoCountMax(undefined);
        break;
      case 'referralUsed':
        setReferralUsed('all');
        break;
      case 'referralCountMin':
        setReferralCountMin(undefined);
        break;
      case 'referralCountMax':
        setReferralCountMax(undefined);
        break;
      case 'assignedStaffId':
        setAssignedStaffId(currentUser?.role === 'telesales' ? 'me' : 'all');
        break;
      case 'assignedDaysMin':
        if (setAssignedDaysMin) setAssignedDaysMin(undefined);
        break;
      case 'assignedDaysMax':
        if (setAssignedDaysMax) setAssignedDaysMax(undefined);
        break;
      case 'retainedOnly':
        if (setRetainedOnly) setRetainedOnly(false);
        break;
      case 'dobMonth':
        if (setDobMonth) setDobMonth(undefined);
        break;
      case 'birthdayPreset':
        if (setBirthdayPreset) setBirthdayPreset(undefined);
        break;
      case 'ageMin':
        if (setAgeMin) setAgeMin(undefined);
        break;
      case 'ageMax':
        if (setAgeMax) setAgeMax(undefined);
        break;
    }
    setActiveFilterId(null);
  };

  return (
    <>
      <Space wrap size="small">
        <SavedFilterDropdown
          savedFilters={savedFilters}
          presetFilters={PRESET_FILTERS}
          handleDeleteFilter={handleDeleteFilter}
          applyFilter={applyFilter}
        />

        <Tooltip title="Bộ lọc nâng cao">
          <Badge dot={hasActiveFilters} offset={[-2, 2]}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFilterDrawerVisible(true)}
              style={{
                borderColor: hasActiveFilters ? '#1677ff' : undefined,
                color: hasActiveFilters ? '#1677ff' : undefined,
                borderRadius: '6px',
              }}
            />
          </Badge>
        </Tooltip>

        {onOpenRandomModal && isManagerOrAdmin && (
          <Tooltip title="Chọn ngẫu nhiên khách hàng theo bộ lọc">
            <Button
              icon={<AimOutlined />}
              onClick={onOpenRandomModal}
              style={{
                borderColor: themeMode === 'dark' ? '#D4A84B' : '#d97706',
                color: themeMode === 'dark' ? '#D4A84B' : '#d97706',
                borderRadius: '6px',
              }}
            />
          </Tooltip>
        )}

        {hasActiveFilters && (
          <>
            <Tooltip title="Xóa tất cả bộ lọc">
              <Button icon={<ClearOutlined />} danger onClick={clearFilters} style={{ borderRadius: '6px' }} />
            </Tooltip>
            <Tooltip title="Lưu bộ lọc hiện tại">
              <Button
                icon={<SaveOutlined />}
                onClick={() => setSaveFilterModalVisible(true)}
                style={{ borderColor: '#D4A84B', color: '#D4A84B', borderRadius: '6px' }}
              />
            </Tooltip>
          </>
        )}
      </Space>

      <ActiveFilterTags
        filterParams={filterParams}
        onClearFilter={onClearFilter}
        hasActiveFilters={hasActiveFilters}
        staffList={staffList}
      />

      {/* FILTER DRAWER */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D4A84B' }}>
            <FilterOutlined style={{ fontSize: '18px' }} />
            <span style={{ fontWeight: 'bold' }}>BỘ LỌC NÂNG CAO</span>
          </div>
        }
        placement="right"
        width={400}
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        styles={{
          body: {
            background: themeMode === 'dark' ? '#141414' : '#fafafa',
            padding: '20px',
          },
        }}
      >
        <Form layout="vertical">
          {/* SECTION 0: THÔNG TIN CÁ NHÂN (SINH NHẬT & ĐỘ TUỔI) */}
          <div style={{ marginBottom: '24px' }}>
            <FilterSectionHeader
              icon={<GiftOutlined style={{ fontSize: '14px' }} />}
              title="Thông tin cá nhân (Sinh nhật & Độ tuổi)"
              themeMode={themeMode}
            />

            {/* Birthday Month & Presets */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '6px',
                  color: themeMode === 'dark' ? '#aaa' : '#666',
                }}
              >
                Sinh nhật khách hàng
              </div>
              <Select
                allowClear
                placeholder="Chọn Tháng sinh nhật"
                value={dobMonth ? String(dobMonth) : undefined}
                onChange={(val) => {
                  setDobMonth?.(val ? parseInt(val, 10) : undefined);
                  setBirthdayPreset?.(undefined);
                  setActiveFilterId(null);
                }}
                style={{ width: '100%', marginBottom: '8px' }}
                options={[
                  { label: 'Tháng 1', value: '1' },
                  { label: 'Tháng 2', value: '2' },
                  { label: 'Tháng 3', value: '3' },
                  { label: 'Tháng 4', value: '4' },
                  { label: 'Tháng 5', value: '5' },
                  { label: 'Tháng 6', value: '6' },
                  { label: 'Tháng 7', value: '7' },
                  { label: 'Tháng 8', value: '8' },
                  { label: 'Tháng 9', value: '9' },
                  { label: 'Tháng 10', value: '10' },
                  { label: 'Tháng 11', value: '11' },
                  { label: 'Tháng 12', value: '12' },
                ]}
              />

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Hôm nay 🎂', value: 'today' },
                  { label: 'Tháng này 🎉', value: 'this_month' },
                  { label: 'Tháng sau 🎁', value: 'next_month' },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    size="small"
                    type={birthdayPreset === preset.value ? 'primary' : 'default'}
                    onClick={() => {
                      if (birthdayPreset === preset.value) {
                        setBirthdayPreset?.(undefined);
                      } else {
                        setBirthdayPreset?.(preset.value as any);
                        setDobMonth?.(undefined);
                      }
                      setActiveFilterId(null);
                    }}
                    style={{ fontSize: '11px', borderRadius: '12px' }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Age Range & Presets */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '6px',
                  color: themeMode === 'dark' ? '#aaa' : '#666',
                }}
              >
                Độ tuổi khách hàng
              </div>
              <RangeFilterField
                minLabel="Tuổi tối thiểu"
                maxLabel="Tuổi tối đa"
                minPlaceholder="VD: 18"
                maxPlaceholder="VD: 35"
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

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {[
                  { label: '< 25 tuổi', min: undefined, max: 24 },
                  { label: '25 - 35 tuổi', min: 25, max: 35 },
                  { label: '36 - 50 tuổi', min: 36, max: 50 },
                  { label: '> 50 tuổi', min: 51, max: undefined },
                ].map((preset, idx) => {
                  const isSelected = ageMin === preset.min && ageMax === preset.max;
                  return (
                    <Button
                      key={idx}
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
                      style={{ fontSize: '11px', borderRadius: '12px' }}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div
              style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '16px' }}
            />
          </div>

          {/* SECTION 1: VÒNG ĐỜI & GHÉ TIỆM */}
          <div style={{ marginBottom: '24px' }}>
            <FilterSectionHeader
              icon={<CalendarOutlined style={{ fontSize: '14px' }} />}
              title="Vòng đời & Ghé tiệm"
              themeMode={themeMode}
            />

            <RangeFilterField
              minLabel="Chưa tới tối thiểu"
              maxLabel="Chưa tới tối đa"
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
            <div
              style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '8px' }}
            />
          </div>

          {/* SECTION 2: CHI TIÊU & GIAO DỊCH */}
          <div style={{ marginBottom: '24px' }}>
            <FilterSectionHeader
              icon={<DollarOutlined style={{ fontSize: '14px' }} />}
              title="Chi tiêu (VND)"
              themeMode={themeMode}
            />

            <RangeFilterField
              minLabel="Từ mức"
              maxLabel="Đến mức"
              minPlaceholder="Tối thiểu"
              maxPlaceholder="Tối đa"
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
              formatter={(value: SafeAny) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value: SafeAny) => (value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0)}
              themeMode={themeMode}
            />
            <div
              style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '8px' }}
            />
          </div>

          {/* SECTION 3: SỐ LẦN GHÉ TIỆM */}
          <div style={{ marginBottom: '24px' }}>
            <FilterSectionHeader
              icon={<EyeOutlined style={{ fontSize: '14px' }} />}
              title="Số lần ghé tiệm"
              themeMode={themeMode}
            />

            <RangeFilterField
              minLabel="Ghé tối thiểu"
              maxLabel="Ghé tối đa"
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
            <div
              style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '8px' }}
            />
          </div>

          {/* SECTION 4: KHUYẾN MÃI (PROMOTION) */}
          <div style={{ marginBottom: '24px' }}>
            <FilterSectionHeader
              icon={<GiftOutlined style={{ fontSize: '14px' }} />}
              title="Khuyến mãi (Promotion)"
              themeMode={themeMode}
            />

            <Form.Item
              label={
                <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>
                  Trạng thái sử dụng
                </span>
              }
            >
              <Select
                value={promoUsed}
                style={{ width: '100%' }}
                onChange={(val) => {
                  setPromoUsed(val);
                  setActiveFilterId(null);
                  if (val !== 'yes') {
                    setPromoCountMin(undefined);
                    setPromoCountMax(undefined);
                  }
                }}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'yes', label: 'Đã sử dụng' },
                  { value: 'no', label: 'Chưa sử dụng' },
                ]}
              />
            </Form.Item>

            {promoUsed === 'yes' && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: themeMode === 'dark' ? '#1c1c1c' : '#fafafa',
                  borderRadius: '8px',
                  border: `1px solid ${themeMode === 'dark' ? '#2d2d2d' : '#e8e8e8'}`,
                }}
              >
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
              </div>
            )}
            <div
              style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '16px' }}
            />
          </div>

          {/* SECTION 5: GIỚI THIỆU BẠN (REFERRALS) */}
          <div style={{ marginBottom: '16px' }}>
            <FilterSectionHeader
              icon={<TeamOutlined style={{ fontSize: '14px' }} />}
              title="Giới thiệu bạn (Referrals)"
              themeMode={themeMode}
            />

            <Form.Item
              label={
                <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>
                  Trạng thái giới thiệu
                </span>
              }
            >
              <Select
                value={referralUsed}
                style={{ width: '100%' }}
                onChange={(val) => {
                  setReferralUsed(val);
                  setActiveFilterId(null);
                  if (val !== 'yes') {
                    setReferralCountMin(undefined);
                    setReferralCountMax(undefined);
                  }
                }}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'yes', label: 'Đã giới thiệu bạn' },
                  { value: 'no', label: 'Chưa giới thiệu ai' },
                ]}
              />
            </Form.Item>

            {referralUsed === 'yes' && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: themeMode === 'dark' ? '#1c1c1c' : '#fafafa',
                  borderRadius: '8px',
                  border: `1px solid ${themeMode === 'dark' ? '#2d2d2d' : '#e8e8e8'}`,
                }}
              >
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
              </div>
            )}
            <div
              style={{ height: '1px', background: themeMode === 'dark' ? '#2a2a2a' : '#f0f0f0', marginTop: '16px' }}
            />
          </div>

          {/* SECTION 6: PHÂN BỔ BOOKER */}
          {isManagerOrAdmin && (
            <div style={{ marginBottom: '16px' }}>
              <FilterSectionHeader
                icon={<TeamOutlined style={{ fontSize: '14px' }} />}
                title="Phân bổ Booker"
                themeMode={themeMode}
              />

              <Form.Item
                label={
                  <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>
                    Trạng thái phụ trách
                  </span>
                }
              >
                <Select
                  showSearch
                  filterOption={vietnameseSearchFilter}
                  value={assignedStaffId}
                  style={{ width: '100%' }}
                  onChange={(val) => {
                    setAssignedStaffId(val);
                    setActiveFilterId(null);
                  }}
                  options={[
                    { value: 'all', label: 'Tất cả' },
                    { value: 'unassigned', label: 'Chưa phân bổ' },
                    { value: 'me', label: 'Khách hàng của tôi' },
                    ...staffList
                      .filter((s) =>
                        ['telesales', 'executive', 'manager', 'admin'].includes(s.role?.toLowerCase() || '')
                      )
                      .map((s) => ({
                        value: s.id.toString(),
                        label: `Booker: ${s.displayName}`,
                      })),
                  ]}
                />
              </Form.Item>

              <RangeFilterField
                minLabel="Đã phân bổ tối thiểu"
                maxLabel="Đã phân bổ tối đa"
                minPlaceholder="VD: 5 ngày"
                maxPlaceholder="VD: 30 ngày"
                minValue={assignedDaysMin}
                maxValue={assignedDaysMax}
                onChangeMin={(val: number | undefined) => {
                  if (setAssignedDaysMin) setAssignedDaysMin(val);
                  setActiveFilterId(null);
                }}
                onChangeMax={(val: number | undefined) => {
                  if (setAssignedDaysMax) setAssignedDaysMax(val);
                  setActiveFilterId(null);
                }}
                themeMode={themeMode}
              />
            </div>
          )}

          {/* SECTION 7: TRẠNG THÁI GIỮ DATA */}
          <div style={{ marginBottom: '16px' }}>
            <FilterSectionHeader
              icon={<PushpinFilled style={{ fontSize: '14px', color: '#faad14' }} />}
              title="Trạng thái Giữ Data"
              themeMode={themeMode}
            />
            <Form.Item
              label={
                <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#aaa' : '#555' }}>
                  Lọc Khách hàng đã chọn giữ
                </span>
              }
            >
              <Select
                value={retainedOnly ? 'yes' : 'all'}
                style={{ width: '100%' }}
                onChange={(val) => {
                  if (setRetainedOnly) setRetainedOnly(val === 'yes');
                  setActiveFilterId(null);
                }}
                options={[
                  { value: 'all', label: 'Tất cả (Không lọc giữ data)' },
                  { value: 'yes', label: '📌 Chỉ hiển thị Data đã giữ lại' },
                ]}
              />
            </Form.Item>
          </div>
        </Form>
      </Drawer>

      <SaveFilterModal
        visible={saveFilterModalVisible}
        onOk={handleSaveFilter}
        onCancel={() => setSaveFilterModalVisible(false)}
        newFilterName={newFilterName}
        setNewFilterName={setNewFilterName}
      />
    </>
  );
});

export default CustomerFilters;
