'use client';

import React from 'react';
import { Drawer, Form, Select, Button, Space, Badge, theme } from 'antd';
import {
  FilterOutlined,
  CalendarOutlined,
  DollarOutlined,
  EyeOutlined,
  GiftOutlined,
  TeamOutlined,
  ClearOutlined,
  SaveOutlined,
} from '@ant-design/icons';

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
  setActiveFilterId: (id: string | null) => void;
  staffList: SafeAny[];
  saveFilterModalVisible: boolean;
  setSaveFilterModalVisible: (visible: boolean) => void;
  newFilterName: string;
  setNewFilterName: (val: string) => void;
  handleSaveFilter: () => Promise<void>;
  activeFilterId: string | null;
  PRESET_FILTERS: SafeAny[];
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
  setActiveFilterId,
  staffList,
  saveFilterModalVisible,
  setSaveFilterModalVisible,
  newFilterName,
  setNewFilterName,
  handleSaveFilter,
  activeFilterId,
  PRESET_FILTERS,
}: CustomerFiltersProps) {
  const { token } = theme.useToken();

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

        <Badge dot={hasActiveFilters}>
          <Button icon={<FilterOutlined />} onClick={() => setFilterDrawerVisible(true)}>
            Bộ lọc nâng cao
          </Button>
        </Badge>

        {hasActiveFilters && (
          <>
            <Button icon={<ClearOutlined />} danger onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
            <Button
              icon={<SaveOutlined />}
              onClick={() => setSaveFilterModalVisible(true)}
              style={{ borderColor: '#D4A84B', color: '#D4A84B' }}
            >
              Lưu bộ lọc
            </Button>
          </>
        )}
      </Space>

      <ActiveFilterTags filterParams={filterParams} onClearFilter={onClearFilter} hasActiveFilters={hasActiveFilters} />

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
          {currentUser?.role === 'admin' && (
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
                    ...staffList.map((s) => ({
                      value: s.id.toString(),
                      label: `Booker: ${s.displayName}`,
                    })),
                  ]}
                />
              </Form.Item>
            </div>
          )}
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
