'use client';

import React from 'react';
import { Form, Select, Button, Space, Badge, Tooltip } from 'antd';
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
  PhoneOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {
  canManageCustomerAllocation,
  CustomerServiceFilterCategory,
  CustomerServiceFilterOption,
  vietnameseSearchFilter,
} from '@mos-lab/shared';

// Shared and custom sub-components
import FilterSectionHeader from '~/components/filters/FilterSectionHeader';
import RangeFilterField from '~/components/filters/RangeFilterField';
import ActiveFilterTags from './filters/ActiveFilterTags';
import SaveFilterModal from './filters/SaveFilterModal';
import SavedFilterDropdown from './filters/SavedFilterDropdown';
import { AdaptiveDrawer } from '../../../../components/ui';
import { getViewportSize, useResponsiveTier } from '../../../../hooks/useResponsiveTier';

interface CustomerFiltersProps {
  themeMode: string;
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
  serviceIds: number[];
  setServiceIds: (val: number[]) => void;
  serviceCategories: string[];
  setServiceCategories: (val: string[]) => void;
  serviceVisitCountMin: number | undefined;
  setServiceVisitCountMin: (val: number | undefined) => void;
  serviceVisitCountMax: number | undefined;
  setServiceVisitCountMax: (val: number | undefined) => void;
  serviceFilterOptions: CustomerServiceFilterOption[];
  serviceFilterCategories: CustomerServiceFilterCategory[];
  serviceFilterOptionsLoading: boolean;
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
  callStatuses?: string[];
  setCallStatuses?: (val: string[]) => void;
  lastCallDaysMin?: number | undefined;
  setLastCallDaysMin?: (val: number | undefined) => void;
  lastCallDaysMax?: number | undefined;
  setLastCallDaysMax?: (val: number | undefined) => void;
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
  isForeignFilter?: 'all' | 'foreign' | 'local';
  setIsForeignFilter?: (val: 'all' | 'foreign' | 'local') => void;
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
  callStatuses = [],
  setCallStatuses,
  lastCallDaysMin,
  setLastCallDaysMin,
  lastCallDaysMax,
  setLastCallDaysMax,
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
  isForeignFilter,
  setIsForeignFilter,
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
  const responsiveTier = useResponsiveTier();
  const isCompactTier = responsiveTier === 'mobile' || responsiveTier === 'tablet';
  const isManagerOrAdmin = canManageCustomerAllocation(currentUser?.role);

  const filterParams = {
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    serviceIds: serviceIds.length > 0 ? serviceIds.join(',') : undefined,
    serviceCategories: serviceCategories.length > 0 ? serviceCategories.join(',') : undefined,
    serviceVisitCountMin,
    serviceVisitCountMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    callStatuses: callStatuses.length > 0 ? callStatuses.join(',') : undefined,
    lastCallDaysMin,
    lastCallDaysMax,
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
      case 'serviceIds':
        setServiceIds([]);
        if (serviceCategories.length === 0) {
          setServiceVisitCountMin(undefined);
          setServiceVisitCountMax(undefined);
        }
        break;
      case 'serviceCategories':
        setServiceCategories([]);
        if (serviceIds.length === 0) {
          setServiceVisitCountMin(undefined);
          setServiceVisitCountMax(undefined);
        }
        break;
      case 'serviceUsage':
        setServiceVisitCountMin(undefined);
        setServiceVisitCountMax(undefined);
        break;
      case 'serviceVisitCountMin':
        setServiceVisitCountMin(undefined);
        break;
      case 'serviceVisitCountMax':
        setServiceVisitCountMax(undefined);
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
      case 'callStatuses':
        if (setCallStatuses) setCallStatuses([]);
        break;
      case 'lastCallDaysMin':
        if (setLastCallDaysMin) setLastCallDaysMin(undefined);
        break;
      case 'lastCallDaysMax':
        if (setLastCallDaysMax) setLastCallDaysMax(undefined);
        break;
    }
    setActiveFilterId(null);
  };

  const [drawerWidth, setDrawerWidth] = React.useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_filter_drawer_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 400 && parsed <= 1200) return parsed;
      }
    }
    return 580;
  });

  const [isResizing, setIsResizing] = React.useState(false);
  const isResizingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startWidthRef = React.useRef(580);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = true;
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = drawerWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const deltaX = startXRef.current - moveEvent.clientX;
        const maxAllowed = Math.min(1150, getViewportSize().width - 60);
        const newWidth = Math.max(400, Math.min(maxAllowed, startWidthRef.current + deltaX));
        setDrawerWidth(newWidth);
      };

      const handleMouseUp = () => {
        if (isResizingRef.current) {
          isResizingRef.current = false;
          setIsResizing(false);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          setDrawerWidth((currentW) => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('mos_filter_drawer_width', String(currentW));
            }
            return currentW;
          });
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [drawerWidth]
  );

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (daysSinceLastVisitMin !== undefined || daysSinceLastVisitMax !== undefined) count++;
    if (totalSpentMin !== undefined || totalSpentMax !== undefined) count++;
    if (totalVisitsMin !== undefined || totalVisitsMax !== undefined) count++;
    if (
      serviceIds.length > 0 ||
      serviceCategories.length > 0 ||
      serviceVisitCountMin !== undefined ||
      serviceVisitCountMax !== undefined
    )
      count++;
    if (promoUsed !== 'all' || promoCountMin !== undefined || promoCountMax !== undefined) count++;
    if (referralUsed !== 'all' || referralCountMin !== undefined || referralCountMax !== undefined) count++;
    if (assignedStaffId && assignedStaffId !== (currentUser?.role === 'telesales' ? 'me' : 'all')) count++;
    if (assignedDaysMin !== undefined || assignedDaysMax !== undefined) count++;
    if (retainedOnly) count++;
    if (dobMonth !== undefined || birthdayPreset !== undefined) count++;
    if (ageMin !== undefined || ageMax !== undefined) count++;
    return count;
  }, [
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    serviceIds,
    serviceCategories,
    serviceVisitCountMin,
    serviceVisitCountMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    currentUser?.role,
    assignedDaysMin,
    assignedDaysMax,
    retainedOnly,
    dobMonth,
    birthdayPreset,
    ageMin,
    ageMax,
  ]);

  return (
    <>
      <Space wrap size="small" className="customer-filter-controls">
        <SavedFilterDropdown
          savedFilters={savedFilters}
          presetFilters={PRESET_FILTERS}
          handleDeleteFilter={handleDeleteFilter}
          applyFilter={applyFilter}
        />

        <Tooltip title="Bộ lọc nâng cao">
          <Badge dot={hasActiveFilters} offset={[-2, 2]}>
            <Button
              data-ui="customer-filter-trigger"
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
        serviceFilterOptions={serviceFilterOptions}
        serviceFilterCategories={serviceFilterCategories}
      />

      {/* FILTER DRAWER */}
      <AdaptiveDrawer
        intent="data"
        className="customer-filter-overlay"
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(212, 168, 75, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D4A84B',
                  fontSize: '16px',
                }}
              >
                <FilterOutlined />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '15px',
                    color: themeMode === 'dark' ? '#f3f4f6' : '#111827',
                    letterSpacing: '0.3px',
                  }}
                >
                  BỘ LỌC NÂNG CAO
                </div>
                <div style={{ fontSize: '12px', color: themeMode === 'dark' ? '#9ca3af' : '#6b7280', fontWeight: 400 }}>
                  Tùy chỉnh thông số lọc khách hàng
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <Badge
                count={`${activeFilterCount} tiêu chí đang bật`}
                style={{
                  backgroundColor: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.2)' : '#fffbe6',
                  color: '#D4A84B',
                  borderColor: '#D4A84B',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '0 8px',
                  height: '22px',
                  lineHeight: '20px',
                }}
              />
            )}
          </div>
        }
        placement="right"
        width={isCompactTier ? undefined : drawerWidth}
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
        styles={{
          header: {
            borderBottom: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e5e7eb'}`,
            padding: '16px 24px',
            background: themeMode === 'dark' ? '#0f172a' : '#ffffff',
          },
          body: {
            background: themeMode === 'dark' ? '#0b0f19' : '#f8fafc',
            padding: '20px 24px',
            position: 'relative',
          },
          footer: {
            borderTop: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e5e7eb'}`,
            padding: '14px 24px',
            background: themeMode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
          },
        }}
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <Button
              icon={<ClearOutlined />}
              danger
              disabled={!hasActiveFilters}
              onClick={() => {
                clearFilters();
              }}
              style={{ borderRadius: '8px', height: '38px', padding: '0 16px', fontWeight: 500 }}
            >
              Xóa bộ lọc
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                icon={<SaveOutlined />}
                disabled={!hasActiveFilters}
                onClick={() => setSaveFilterModalVisible(true)}
                style={{
                  borderColor: '#D4A84B',
                  color: '#D4A84B',
                  borderRadius: '8px',
                  height: '38px',
                  padding: '0 16px',
                  fontWeight: 500,
                }}
              >
                Lưu bộ lọc
              </Button>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={() => setFilterDrawerVisible(false)}
                style={{
                  backgroundColor: '#D4A84B',
                  borderColor: '#D4A84B',
                  color: '#0f172a',
                  borderRadius: '8px',
                  height: '38px',
                  padding: '0 20px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(212, 168, 75, 0.25)',
                }}
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
            onMouseDown={handleMouseDown}
            title="Kéo sang trái/phải để thay đổi kích thước side slide"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '12px',
              cursor: 'col-resize',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isResizing ? 'rgba(212, 168, 75, 0.25)' : 'transparent',
              transition: 'background 0.15s ease',
            }}
          >
            <div
              style={{
                width: '4px',
                height: '48px',
                borderRadius: '2px',
                backgroundColor: isResizing ? '#D4A84B' : themeMode === 'dark' ? '#475569' : '#cbd5e1',
                boxShadow: isResizing ? '0 0 10px rgba(212, 168, 75, 0.9)' : undefined,
                transition: 'all 0.15s ease',
              }}
            />
          </div>
        )}
        <Form layout="vertical" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* CARD 1: THÔNG TIN CÁ NHÂN (SINH NHẬT & ĐỘ TUỔI) */}
          <div
            style={{
              background: themeMode === 'dark' ? '#141c2e' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '18px',
              boxShadow: themeMode === 'dark' ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <FilterSectionHeader
              icon={<GiftOutlined style={{ fontSize: '14px' }} />}
              title="Thông tin cá nhân (Sinh nhật & Độ tuổi)"
              themeMode={themeMode}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Birthday Month & Presets */}
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    marginBottom: '6px',
                    color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                  }}
                >
                  Tháng sinh nhật
                </div>
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
                      style={{
                        fontSize: '11px',
                        borderRadius: '16px',
                        padding: '0 10px',
                        height: '24px',
                        lineHeight: '22px',
                        backgroundColor: birthdayPreset === preset.value ? '#D4A84B' : undefined,
                        borderColor: birthdayPreset === preset.value ? '#D4A84B' : undefined,
                      }}
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
                    color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                  }}
                >
                  Khoảng độ tuổi
                </div>
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

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
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
                        style={{
                          fontSize: '11px',
                          borderRadius: '16px',
                          padding: '0 8px',
                          height: '24px',
                          lineHeight: '22px',
                          backgroundColor: isSelected ? '#D4A84B' : undefined,
                          borderColor: isSelected ? '#D4A84B' : undefined,
                        }}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Foreign Customer Filter */}
            <div
              style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: `1px dashed ${themeMode === 'dark' ? '#334155' : '#cbd5e1'}`,
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  marginBottom: '6px',
                  color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                }}
              >
                🌐 Phân loại Quốc tịch
              </div>
              <Select
                aria-label="Lọc theo quốc tịch khách hàng"
                value={isForeignFilter || 'all'}
                onChange={(val) => {
                  setIsForeignFilter?.(val as any);
                  setActiveFilterId(null);
                }}
                style={{ width: '100%' }}
                options={[
                  { label: 'Tất cả (Việt Nam & Nước ngoài)', value: 'all' },
                  { label: '🌐 Chỉ Khách nước ngoài', value: 'foreign' },
                  { label: '🇻🇳 Chỉ Khách Việt Nam', value: 'local' },
                ]}
              />
            </div>
          </div>

          {/* CARD 2: VÒNG ĐỜI KHÁCH HÀNG & CHI TIÊU */}
          <div
            style={{
              background: themeMode === 'dark' ? '#141c2e' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '18px',
              boxShadow: themeMode === 'dark' ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <FilterSectionHeader
                  icon={<CalendarOutlined style={{ fontSize: '14px' }} />}
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
                  icon={<DollarOutlined style={{ fontSize: '14px' }} />}
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
                  formatter={(value: SafeAny) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value: SafeAny) => (value ? parseFloat(value.replace(/\$\s?|(,*)/g, '')) : 0)}
                  themeMode={themeMode}
                />
              </div>
            </div>
          </div>

          {/* CARD 3: TẦN SUẤT GHÉ & KHUYẾN MÃI */}
          <div
            style={{
              background: themeMode === 'dark' ? '#141c2e' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '18px',
              boxShadow: themeMode === 'dark' ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <FilterSectionHeader
                  icon={<EyeOutlined style={{ fontSize: '14px' }} />}
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
                  icon={<GiftOutlined style={{ fontSize: '14px' }} />}
                  title="Khuyến mãi & Ưu đãi"
                  themeMode={themeMode}
                />
                <Form.Item
                  label={
                    <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                      Trạng thái dùng Khuyến mãi
                    </span>
                  }
                  style={{ marginBottom: '8px' }}
                >
                  <Select
                    aria-label="Lọc trạng thái dùng khuyến mãi"
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
                      { value: 'yes', label: 'Đã dùng KM' },
                      { value: 'no', label: 'Chưa dùng KM' },
                    ]}
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

          {/* CARD 4: DỊCH VỤ ĐÃ HOÀN TẤT */}
          <div
            style={{
              background: themeMode === 'dark' ? '#141c2e' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '18px',
              boxShadow: themeMode === 'dark' ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <FilterSectionHeader
              icon={<AppstoreOutlined style={{ fontSize: '14px' }} />}
              title="Dịch vụ & Sản phẩm đã sử dụng"
              themeMode={themeMode}
            />
            <Form.Item
              label={
                <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                  Chọn thể loại hoặc dịch vụ (có thể chọn nhiều)
                </span>
              }
              style={{ marginBottom: '10px' }}
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
                style={{ width: '100%' }}
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
              style={{
                fontSize: '12px',
                color: themeMode === 'dark' ? '#94a3b8' : '#64748b',
                marginBottom: '12px',
              }}
            >
              Mỗi thể loại sẽ khớp mọi biến thể cùng tên, ví dụ <strong>UltraLight (tất cả biến thể)</strong>. Chỉ tính
              hóa đơn <strong>Completed</strong>; chọn nhiều mục sẽ tìm khách đã dùng ít nhất một mục.
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
          <div
            style={{
              background: themeMode === 'dark' ? '#141c2e' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '18px',
              boxShadow: themeMode === 'dark' ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <FilterSectionHeader
                  icon={<TeamOutlined style={{ fontSize: '14px' }} />}
                  title="Giới thiệu bạn (Referrals)"
                  themeMode={themeMode}
                />
                <Form.Item
                  label={
                    <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                      Trạng thái giới thiệu
                    </span>
                  }
                  style={{ marginBottom: '8px' }}
                >
                  <Select
                    aria-label="Lọc trạng thái giới thiệu"
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
                  icon={<PushpinFilled style={{ fontSize: '14px', color: '#faad14' }} />}
                  title="Trạng thái Giữ Data"
                  themeMode={themeMode}
                />
                <Form.Item
                  label={
                    <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                      Lọc Khách hàng đã chọn giữ
                    </span>
                  }
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    aria-label="Lọc khách hàng đã giữ data"
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
            </div>

            {isManagerOrAdmin && (
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: `1px dashed ${themeMode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
                }}
              >
                <FilterSectionHeader
                  icon={<TeamOutlined style={{ fontSize: '14px' }} />}
                  title="Phân bổ Booker"
                  themeMode={themeMode}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Form.Item
                    label={
                      <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                        Trạng thái phụ trách
                      </span>
                    }
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      aria-label="Lọc Booker phụ trách"
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
                    minLabel="Số ngày phân bổ ít nhất"
                    maxLabel="Số ngày phân bổ nhiều nhất"
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
              </div>
            )}
          </div>

          {/* CARD 5: LỊCH SỬ & TRẠNG THÁI CUỘC GỌI */}
          <div
            style={{
              background: themeMode === 'dark' ? '#141c2e' : '#ffffff',
              border: `1px solid ${themeMode === 'dark' ? '#1e293b' : '#e2e8f0'}`,
              borderRadius: '12px',
              padding: '18px',
              boxShadow: themeMode === 'dark' ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <FilterSectionHeader
              icon={<PhoneOutlined style={{ fontSize: '14px', color: '#3b82f6' }} />}
              title="Lịch sử & Trạng thái Cuộc gọi"
              themeMode={themeMode}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <Form.Item
                  label={
                    <span style={{ fontSize: '12px', color: themeMode === 'dark' ? '#94a3b8' : '#64748b' }}>
                      Trạng thái Cuộc gọi gần nhất (Chọn nhiều)
                    </span>
                  }
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    aria-label="Lọc trạng thái cuộc gọi gần nhất"
                    mode="multiple"
                    allowClear
                    placeholder="Chọn các trạng thái cuộc gọi..."
                    value={callStatuses}
                    style={{ width: '100%' }}
                    onChange={(val) => {
                      if (setCallStatuses) setCallStatuses(val || []);
                      setActiveFilterId(null);
                    }}
                    maxTagCount="responsive"
                    options={[
                      { value: 'BOOKED', label: '📅 BOOKED (Đã đặt hẹn)' },
                      { value: 'AGREED', label: '✅ AGREED (Đã đồng ý)' },
                      { value: 'BUSY', label: '📵 BUSY (Bận máy)' },
                      { value: 'NO_ANSWER', label: '🔇 NO_ANSWER (Không nghe máy)' },
                      { value: 'CALLBACK', label: '⏰ CALLBACK (Hẹn gọi lại)' },
                      { value: 'WRONG_NUMBER', label: '⚠️ WRONG_NUMBER (Sai số / Tắt máy)' },
                      { value: 'REJECTED', label: '❌ REJECTED (Từ chối / Khách hủy)' },
                      { value: 'CONSIDERING', label: '🤔 CONSIDERING (Cần suy nghĩ)' },
                      { value: 'NOT_CALLED', label: '⚪ NOT_CALLED (Chưa từng gọi)' },
                    ]}
                  />
                </Form.Item>
              </div>

              <div>
                <RangeFilterField
                  minLabel="Ngày gọi gần nhất (ít nhất)"
                  maxLabel="Ngày gọi gần nhất (nhiều nhất)"
                  minPlaceholder="VD: 1 ngày"
                  maxPlaceholder="VD: 30 ngày"
                  minValue={lastCallDaysMin}
                  maxValue={lastCallDaysMax}
                  onChangeMin={(val: number | undefined) => {
                    if (setLastCallDaysMin) setLastCallDaysMin(val);
                    setActiveFilterId(null);
                  }}
                  onChangeMax={(val: number | undefined) => {
                    if (setLastCallDaysMax) setLastCallDaysMax(val);
                    setActiveFilterId(null);
                  }}
                  themeMode={themeMode}
                />
              </div>
            </div>
          </div>
        </Form>
      </AdaptiveDrawer>

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
