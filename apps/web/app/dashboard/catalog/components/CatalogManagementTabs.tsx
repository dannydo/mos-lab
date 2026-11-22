'use client';

import React from 'react';
import { Input, Select, Space, Switch, Typography } from 'antd';
import { Search } from 'lucide-react';
import type { CatalogProduct, CatalogService, CatalogServicePrice } from '@mos-lab/shared';
import { AppIcon, DataTable, FeatureToolbar, SearchField, ToolbarToggle } from '../../../../components/ui';

const { Text } = Typography;

const SERVICE_GROUP_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả nhóm' },
  { value: 'Lashes', label: 'Lashes (Tất cả Mi)' },
  { value: 'LashesTop', label: 'LashesTop (Mi trên)' },
  { value: 'LashesUnder', label: 'LashesUnder (Mi dưới)' },
  { value: 'Product', label: 'Product (Giỏ hàng)' },
];

const SERVICE_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả loại dịch vụ' },
  { value: 'Normal', label: 'Normal (Nối mới)' },
  { value: 'Retain', label: 'Retain (Dặm mi)' },
  { value: 'Removal', label: 'Removal (Tháo mi)' },
  { value: 'Product', label: 'Product (Giỏ hàng)' },
];

interface CatalogServicesTabPaneProps {
  tabPaneClassName: string;
  services: CatalogService[];
  loadingServices: boolean;
  showDisabled: boolean;
  serviceSearch: string;
  serviceGroupFilter: string;
  serviceTypeFilter: string;
  servicePage: number;
  servicePageSize: number;
  columns: ReturnType<typeof import('./catalogTableColumns').buildServiceColumns>;
  onSearchChange: (val: string) => void;
  onGroupFilterChange: (val: string) => void;
  onTypeFilterChange: (val: string) => void;
  onShowDisabledChange: (checked: boolean) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

export function CatalogServicesTabPane({
  tabPaneClassName,
  services,
  loadingServices,
  showDisabled,
  serviceSearch,
  serviceGroupFilter,
  serviceTypeFilter,
  servicePage,
  servicePageSize,
  columns,
  onSearchChange,
  onGroupFilterChange,
  onTypeFilterChange,
  onShowDisabledChange,
  onPageChange,
}: CatalogServicesTabPaneProps) {
  return (
    <div className={`${tabPaneClassName} space-y-4`}>
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Space wrap align="center">
          <Input
            aria-label="Tìm dịch vụ"
            placeholder="Tìm dịch vụ..."
            prefix={<AppIcon icon={Search} size="sm" />}
            value={serviceSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-[220px]"
            allowClear
          />
          <Select
            aria-label="Lọc nhóm dịch vụ"
            value={serviceGroupFilter}
            onChange={onGroupFilterChange}
            className="w-[210px]"
            options={SERVICE_GROUP_FILTER_OPTIONS}
          />
          <Select
            aria-label="Lọc loại dịch vụ"
            value={serviceTypeFilter}
            onChange={onTypeFilterChange}
            className="w-[210px]"
            options={SERVICE_TYPE_FILTER_OPTIONS}
          />
          <Space className="ml-2">
            <Text type="secondary" className="text-[13px]">
              Chỉ hiện mục đã ẩn:
            </Text>
            <Switch
              aria-label="Chỉ hiện dịch vụ đã ẩn"
              checked={showDisabled}
              onChange={onShowDisabledChange}
              size="small"
            />
          </Space>
        </Space>
      </div>

      <DataTable
        rowKey="id"
        columns={columns}
        dataSource={services
          .filter((s) => (showDisabled ? s.isDisabled : !s.isDisabled))
          .filter((s) => (serviceTypeFilter === 'all' ? true : s.serviceType === serviceTypeFilter))}
        loading={loadingServices}
        pagination={{
          current: servicePage,
          pageSize: servicePageSize,
          onChange: onPageChange,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} dịch vụ`,
        }}
        scroll={{ x: 800 }}
      />
    </div>
  );
}

interface CatalogCombosTabPaneProps {
  tabPaneClassName: string;
  combos: CatalogServicePrice[];
  loadingCombos: boolean;
  showDisabled: boolean;
  comboPage: number;
  comboPageSize: number;
  columns: ReturnType<typeof import('./catalogTableColumns').buildComboColumns>;
  onShowDisabledChange: (checked: boolean) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

export function CatalogCombosTabPane({
  tabPaneClassName,
  combos,
  loadingCombos,
  showDisabled,
  comboPage,
  comboPageSize,
  columns,
  onShowDisabledChange,
  onPageChange,
}: CatalogCombosTabPaneProps) {
  return (
    <div className={`${tabPaneClassName} space-y-4`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Space wrap align="center">
          <Text type="secondary">Danh sách tất cả các gói dịch vụ combo mua trước nhiều lượt</Text>
          <Space className="ml-3">
            <Text type="secondary" className="text-[13px]">
              Chỉ hiện mục đã ẩn:
            </Text>
            <Switch checked={showDisabled} onChange={onShowDisabledChange} size="small" />
          </Space>
        </Space>
      </div>

      <DataTable
        rowKey="id"
        columns={columns}
        dataSource={combos.filter((c) => (showDisabled ? c.isDisabled : !c.isDisabled))}
        loading={loadingCombos}
        pagination={{
          current: comboPage,
          pageSize: comboPageSize,
          onChange: onPageChange,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} gói combo`,
        }}
        scroll={{ x: 900 }}
      />
    </div>
  );
}

interface CatalogProductsTabPaneProps {
  tabPaneClassName: string;
  tabContentClassName: string;
  listSearchClassName: string;
  products: CatalogProduct[];
  loadingProducts: boolean;
  showDisabled: boolean;
  productSearch: string;
  productPage: number;
  productPageSize: number;
  columns: ReturnType<typeof import('./catalogTableColumns').buildProductColumns>;
  onSearchChange: (val: string) => void;
  onShowDisabledChange: (checked: boolean) => void;
  onPageChange: (page: number, pageSize: number) => void;
}

export function CatalogProductsTabPane({
  tabPaneClassName,
  tabContentClassName,
  listSearchClassName,
  products,
  loadingProducts,
  showDisabled,
  productSearch,
  productPage,
  productPageSize,
  columns,
  onSearchChange,
  onShowDisabledChange,
  onPageChange,
}: CatalogProductsTabPaneProps) {
  return (
    <div className={`${tabPaneClassName} ${tabContentClassName}`}>
      <FeatureToolbar
        primary={
          <SearchField
            behavior="filter"
            aria-label="Tìm sản phẩm"
            className={listSearchClassName}
            placeholder="Tìm SKU hoặc tên sản phẩm..."
            value={productSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            allowClear
          />
        }
        filters={
          <ToolbarToggle
            label="Chỉ hiện mục đã ẩn"
            aria-label="Chỉ hiện sản phẩm đã ẩn"
            checked={showDisabled}
            onChange={onShowDisabledChange}
          />
        }
        filterTitle="Lọc sản phẩm"
        filterTriggerLabel="Mở bộ lọc sản phẩm"
        activeFilterCount={showDisabled ? 1 : 0}
      />

      <DataTable
        rowKey="id"
        columns={columns}
        dataSource={products.filter((p) => (showDisabled ? p.isDisabled : !p.isDisabled))}
        loading={loadingProducts}
        pagination={{
          current: productPage,
          pageSize: productPageSize,
          onChange: onPageChange,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} sản phẩm`,
        }}
        scroll={{ x: 700 }}
      />
    </div>
  );
}
