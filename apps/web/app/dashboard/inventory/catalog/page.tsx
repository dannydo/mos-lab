'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Input, Select, Tabs, message } from 'antd';
import { Edit3, Plus, Search } from 'lucide-react';
import {
  INVENTORY_ITEM_TYPES,
  type InventoryBrandDto,
  type InventoryCatalogItemDto,
  type InventoryItemType,
  type InventorySaveBrandRequest,
  type InventorySaveItemRequest,
  type InventorySaveWarehouseRequest,
  type InventoryWarehouseDto,
} from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { InventoryAdminHeader } from '../_components/InventoryAdminHeader';
import { useInventoryAdminContext } from '../_components/useInventoryAdminContext';
import { CatalogBrandModal, CatalogItemModal, CatalogWarehouseModal } from './_components/CatalogModals';

type CatalogTabKey = 'items' | 'brands' | 'warehouses';

export default function InventoryCatalogPage() {
  const ctx = useInventoryAdminContext();
  const canAddItem = ctx.hasPermission('add-item');
  const canEditItem = ctx.hasPermission('edit-item');
  const canAddBrand = ctx.hasPermission('add-item-brand');
  const canEditBrand = ctx.hasPermission('edit-item-brand');
  const canAddWh = ctx.hasPermission('add-warehouse');
  const canEditWh = ctx.hasPermission('edit-warehouse');

  const [tab, setTab] = useState<CatalogTabKey>('items');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<InventoryItemType | undefined>(undefined);

  const [items, setItems] = useState<InventoryCatalogItemDto[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsPage, setItemsPage] = useState(1);
  const [itemsLimit, setItemsLimit] = useState(20);

  const [brands, setBrands] = useState<InventoryBrandDto[]>([]);
  const [brandsTotal, setBrandsTotal] = useState(0);
  const [brandsPage, setBrandsPage] = useState(1);
  const [brandsLimit, setBrandsLimit] = useState(50);

  const [warehousesList, setWarehousesList] = useState<InventoryWarehouseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryCatalogItemDto | null>(null);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<InventoryBrandDto | null>(null);
  const [whModalOpen, setWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<InventoryWarehouseDto | null>(null);

  const loadBrands = useCallback(
    async (page = brandsPage, limit = brandsLimit) => {
      const res = await apiClient.inventory.getCatalogBrands({
        keyword: tab === 'brands' ? appliedKeyword || undefined : undefined,
        page,
        limit,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      setBrands(res.data || []);
      setBrandsTotal(res.page?.total || 0);
    },
    [brandsPage, brandsLimit, tab, appliedKeyword, ctx.previewRole, ctx.previewStoreId]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, whRes] = await Promise.all([
        apiClient.inventory.getCatalogItems({
          inventoryItemType: itemTypeFilter,
          keyword: tab === 'items' ? appliedKeyword || undefined : undefined,
          includeDisabled: true,
          page: itemsPage,
          limit: itemsLimit,
          previewRole: ctx.previewRole,
          previewStoreId: ctx.previewStoreId,
        }),
        apiClient.inventory.getWarehouses({
          includeDisabled: true,
          keyword: tab === 'warehouses' ? appliedKeyword || undefined : undefined,
          previewRole: ctx.previewRole,
          previewStoreId: ctx.previewStoreId,
        }),
      ]);
      await loadBrands(brandsPage, brandsLimit);
      setItems(itemsRes.data || []);
      setItemsTotal(itemsRes.page?.total || 0);
      setWarehousesList(whRes.warehouses || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không tải được dữ liệu danh mục kho');
    } finally {
      setLoading(false);
    }
  }, [
    itemTypeFilter,
    tab,
    appliedKeyword,
    itemsPage,
    itemsLimit,
    brandsPage,
    brandsLimit,
    ctx.previewRole,
    ctx.previewStoreId,
    loadBrands,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSaveItem = async (payload: Omit<InventorySaveItemRequest, 'previewRole' | 'previewStoreId'>) => {
    setSubmitting(true);
    try {
      await apiClient.inventory.saveCatalogItem({
        ...payload,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(payload.inventory_item_id ? 'Đã cập nhật SKU' : 'Đã tạo SKU mới');
      setItemModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Lưu SKU thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBrand = async (payload: Omit<InventorySaveBrandRequest, 'previewRole' | 'previewStoreId'>) => {
    setSubmitting(true);
    try {
      await apiClient.inventory.saveCatalogBrand({
        ...payload,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(payload.inventory_item_brand_id ? 'Đã cập nhật thương hiệu' : 'Đã tạo thương hiệu');
      setBrandModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Lưu thương hiệu thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveWarehouse = async (
    payload: Omit<InventorySaveWarehouseRequest, 'previewRole' | 'previewStoreId'>
  ) => {
    setSubmitting(true);
    try {
      await apiClient.inventory.saveCatalogWarehouse({
        ...payload,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(payload.inventory_warehouse_id ? 'Đã cập nhật kho' : 'Đã tạo kho mới');
      setWhModalOpen(false);
      await loadData();
      await ctx.refreshContext();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Lưu kho thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const itemColumns: ColumnsType<InventoryCatalogItemDto> = [
    {
      title: 'Mã SKU',
      dataIndex: 'inventory_item_code',
      key: 'code',
      width: 110,
      render: (code: string) => <span className="font-mono font-semibold">{code}</span>,
    },
    {
      title: 'Tên Vật Tư',
      dataIndex: 'inventory_item_name',
      key: 'name',
      width: 240,
      render: (name: string, r) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{name}</div>
          {r.inventory_item_attribute && (
            <div className="text-xs text-slate-500 dark:text-slate-400">{r.inventory_item_attribute}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Loại & ĐVT',
      key: 'type',
      width: 150,
      render: (_, r) => (
        <span className="text-xs">
          {r.inventory_item_type} · {r.inventory_item_unit}
        </span>
      ),
    },
    {
      title: 'Thương Hiệu',
      dataIndex: 'inventory_item_brand',
      key: 'brand',
      width: 140,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'is_disabled',
      key: 'status',
      width: 120,
      render: (disabled: boolean) => (
        <StatusTag status={disabled ? 'error' : 'success'} label={disabled ? 'Ngưng' : 'Đang dùng'} />
      ),
    },
    {
      title: 'Sửa',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, r) =>
        canEditItem ? (
          <Button
            size="small"
            icon={<AppIcon icon={Edit3} size={14} />}
            onClick={() => {
              setEditingItem(r);
              setItemModalOpen(true);
            }}
          >
            Sửa
          </Button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  const brandColumns: ColumnsType<InventoryBrandDto> = [
    {
      title: 'ID',
      dataIndex: 'inventory_item_brand_id',
      key: 'id',
      width: 90,
      render: (id: number) => <span className="tabular-nums">#{id}</span>,
    },
    {
      title: 'Tên Thương Hiệu',
      dataIndex: 'inventory_item_brand',
      key: 'name',
      width: 260,
      render: (name: string) => <span className="font-semibold">{name}</span>,
    },
    {
      title: 'Phân Loại',
      dataIndex: 'is_temporary',
      key: 'temp',
      width: 130,
      render: (temp: boolean) => (
        <StatusTag status={temp ? 'warning' : 'success'} label={temp ? 'Tạm' : 'Chính thức'} />
      ),
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'date_created',
      key: 'date',
      width: 160,
      render: (dt: string) => <span className="tabular-nums text-xs">{dt}</span>,
    },
    {
      title: 'Sửa',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, r) =>
        canEditBrand ? (
          <Button
            size="small"
            icon={<AppIcon icon={Edit3} size={14} />}
            onClick={() => {
              setEditingBrand(r);
              setBrandModalOpen(true);
            }}
          >
            Sửa
          </Button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  const whColumns: ColumnsType<InventoryWarehouseDto> = [
    {
      title: 'ID',
      dataIndex: 'inventory_warehouse_id',
      key: 'id',
      width: 85,
      render: (id: number) => <span className="tabular-nums">#{id}</span>,
    },
    {
      title: 'Tên Kho',
      dataIndex: 'inventory_warehouse_name',
      key: 'name',
      width: 230,
      render: (name: string) => <span className="font-semibold">{name}</span>,
    },
    {
      title: 'Loại Kho',
      dataIndex: 'inventory_warehouse_type',
      key: 'type',
      width: 120,
      render: (t: string) => <StatusTag status={t === 'Main' ? 'gold' : 'default'} label={t} />,
    },
    {
      title: 'Kiểm Kho EOM',
      dataIndex: 'is_check_needed',
      key: 'check',
      width: 130,
      render: (v: boolean) => <StatusTag status={v ? 'processing' : 'default'} label={v ? 'Bắt buộc' : 'Không'} />,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'is_disabled',
      key: 'disabled',
      width: 120,
      render: (v: boolean) => <StatusTag status={v ? 'error' : 'success'} label={v ? 'Ngưng' : 'Hoạt động'} />,
    },
    {
      title: 'Sửa',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, r) =>
        canEditWh ? (
          <Button
            size="small"
            icon={<AppIcon icon={Edit3} size={14} />}
            onClick={() => {
              setEditingWh(r);
              setWhModalOpen(true);
            }}
          >
            Sửa
          </Button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <InventoryAdminHeader
        previewRole={ctx.previewRole}
        previewStoreId={ctx.previewStoreId}
        stores={ctx.stores}
        permissionCount={ctx.permissionCount}
        onPreviewRoleChange={ctx.setPreviewRole}
        onPreviewStoreChange={ctx.setPreviewStoreId}
      />

      <SectionCard
        title="Quản Lý Danh Mục Kho · Thương Hiệu · SKU Vật Tư"
        extra={
          <div className="flex items-center gap-2">
            {tab === 'items' && canAddItem && (
              <Button
                type="primary"
                icon={<AppIcon icon={Plus} size="sm" />}
                onClick={() => {
                  setEditingItem(null);
                  setItemModalOpen(true);
                }}
              >
                Thêm SKU
              </Button>
            )}
            {tab === 'brands' && canAddBrand && (
              <Button
                type="primary"
                icon={<AppIcon icon={Plus} size="sm" />}
                onClick={() => {
                  setEditingBrand(null);
                  setBrandModalOpen(true);
                }}
              >
                Thêm Thương Hiệu
              </Button>
            )}
            {tab === 'warehouses' && canAddWh && (
              <Button
                type="primary"
                icon={<AppIcon icon={Plus} size="sm" />}
                onClick={() => {
                  setEditingWh(null);
                  setWhModalOpen(true);
                }}
              >
                Thêm Kho
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              size="small"
              activeKey={tab}
              onChange={(key) => setTab(key as CatalogTabKey)}
              items={[
                { key: 'items', label: `Vật Tư SKU (${itemsTotal})` },
                { key: 'brands', label: `Thương Hiệu (${brandsTotal})` },
                { key: 'warehouses', label: `Danh Sách Kho (${warehousesList.length})` },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              {tab === 'items' && (
                <Select
                  allowClear
                  placeholder="Loại vật tư"
                  className="w-40"
                  value={itemTypeFilter}
                  options={INVENTORY_ITEM_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(val) => {
                    setItemTypeFilter(val as InventoryItemType | undefined);
                    setItemsPage(1);
                  }}
                />
              )}
              <Input
                allowClear
                className="w-60"
                placeholder="Tìm kiếm..."
                prefix={<AppIcon icon={Search} size={14} className="text-slate-400" />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={() => setAppliedKeyword(keyword.trim())}
              />
              <Button type="primary" onClick={() => setAppliedKeyword(keyword.trim())}>
                Tìm
              </Button>
            </div>
          </div>

          {error ? (
            <StatePanel kind="error" title="Không tải được danh mục" description={error} />
          ) : tab === 'items' ? (
            <DataTable<InventoryCatalogItemDto>
              rowKey="inventory_item_id"
              columns={itemColumns}
              dataSource={items}
              loading={loading}
              scroll={{ x: 950 }}
              pagination={{
                current: itemsPage,
                pageSize: itemsLimit,
                total: itemsTotal,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (nextPage, nextLimit) => {
                  setItemsPage(nextPage);
                  setItemsLimit(nextLimit);
                },
              }}
            />
          ) : tab === 'brands' ? (
            <DataTable<InventoryBrandDto>
              rowKey="inventory_item_brand_id"
              columns={brandColumns}
              dataSource={brands}
              loading={loading}
              scroll={{ x: 750 }}
              pagination={{
                current: brandsPage,
                pageSize: brandsLimit,
                total: brandsTotal,
                showSizeChanger: true,
                pageSizeOptions: [20, 50, 100],
                onChange: (nextPage, nextLimit) => {
                  setBrandsPage(nextPage);
                  setBrandsLimit(nextLimit);
                },
              }}
            />
          ) : (
            <DataTable<InventoryWarehouseDto>
              rowKey="inventory_warehouse_id"
              columns={whColumns}
              dataSource={warehousesList}
              loading={loading}
              scroll={{ x: 800 }}
              pagination={false}
            />
          )}
        </div>
      </SectionCard>

      <CatalogItemModal
        open={itemModalOpen}
        editing={editingItem}
        brands={brands}
        submitting={submitting}
        onCancel={() => setItemModalOpen(false)}
        onSubmit={handleSaveItem}
      />

      <CatalogBrandModal
        open={brandModalOpen}
        editing={editingBrand}
        submitting={submitting}
        onCancel={() => setBrandModalOpen(false)}
        onSubmit={handleSaveBrand}
      />

      <CatalogWarehouseModal
        open={whModalOpen}
        editing={editingWh}
        stores={ctx.stores}
        submitting={submitting}
        onCancel={() => setWhModalOpen(false)}
        onSubmit={handleSaveWarehouse}
      />
    </div>
  );
}
