'use client';

import React, { useEffect, useState } from 'react';
import { Checkbox, Input, Select, Switch } from 'antd';
import {
  INVENTORY_ITEM_TYPES,
  type InventoryBrandDto,
  type InventoryCatalogItemDto,
  type InventoryItemType,
  type InventorySaveBrandRequest,
  type InventorySaveItemRequest,
  type InventorySaveWarehouseRequest,
  type InventoryStoreOptionDto,
  type InventoryWarehouseDto,
  type InventoryWarehouseType,
} from '@mos-lab/shared';
import { AdaptiveModal } from '../../../../../components/ui';

const ITEM_TYPE_OPTIONS: Array<{ value: InventoryItemType; label: string }> = INVENTORY_ITEM_TYPES.map((t) => ({
  value: t,
  label: t,
}));

const WAREHOUSE_TYPE_OPTIONS: Array<{ value: InventoryWarehouseType; label: string }> = [
  { value: 'Main', label: 'Main (Kho Tổng)' },
  { value: 'Supplier', label: 'Supplier (NCC)' },
  { value: 'Other', label: 'Other (Chi Nhánh / Khác)' },
];

export interface CatalogItemModalProps {
  open: boolean;
  editing: InventoryCatalogItemDto | null;
  brands: InventoryBrandDto[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: Omit<InventorySaveItemRequest, 'previewRole' | 'previewStoreId'>) => Promise<void>;
}

export function CatalogItemModal({ open, editing, brands, submitting, onCancel, onSubmit }: CatalogItemModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [itemType, setItemType] = useState<InventoryItemType>('Material');
  const [unit, setUnit] = useState('Cái');
  const [brandId, setBrandId] = useState<number>(brands[0]?.inventory_item_brand_id || 1);
  const [attribute, setAttribute] = useState('');
  const [description, setDescription] = useState('');
  const [isUsedIgnored, setIsUsedIgnored] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.inventory_item_name);
      setCode(editing.inventory_item_code);
      setItemType(editing.inventory_item_type);
      setUnit(editing.inventory_item_unit);
      setBrandId(editing.inventory_item_brand_id);
      setAttribute(editing.inventory_item_attribute || '');
      setDescription(editing.inventory_item_description || '');
      setIsUsedIgnored(editing.is_used_ignored);
      setIsDisabled(editing.is_disabled);
    } else {
      setName('');
      setCode('');
      setItemType('Material');
      setUnit('Cái');
      setBrandId(brands[0]?.inventory_item_brand_id || 1);
      setAttribute('');
      setDescription('');
      setIsUsedIgnored(false);
      setIsDisabled(false);
    }
  }, [open, editing, brands]);

  return (
    <AdaptiveModal
      open={open}
      onCancel={onCancel}
      intent="form"
      zIndex={1050}
      confirmLoading={submitting}
      title={editing ? `Cập nhật SKU #${editing.inventory_item_id}` : 'Thêm SKU Vật Tư Mới'}
      okText="Lưu SKU"
      cancelText="Đóng"
      onOk={() => {
        if (!name.trim() || !unit.trim()) return;
        void onSubmit({
          inventory_item_id: editing?.inventory_item_id,
          inventory_item_name: name.trim(),
          inventory_item_code: code.trim() || undefined,
          inventory_item_type: itemType,
          inventory_item_unit: unit.trim(),
          inventory_item_brand_id: brandId,
          inventory_item_attribute: attribute.trim() || null,
          inventory_item_description: description.trim() || null,
          is_used_ignored: isUsedIgnored,
          is_disabled: isDisabled,
        });
      }}
    >
      <div className="space-y-3 pt-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Tên vật tư *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Keo Nối Mi Sky Glue" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
              Mã SKU (để trống tự sinh viết tắt)
            </label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="VD: KNM" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Đơn vị tính *</label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Cái / Chai / Hộp" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Loại vật tư *</label>
            <Select
              className="w-full"
              value={itemType}
              options={ITEM_TYPE_OPTIONS}
              getPopupContainer={(node) => node.parentElement || document.body}
              onChange={(val) => setItemType(val as InventoryItemType)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Thương hiệu *</label>
            <Select
              showSearch
              optionFilterProp="label"
              className="w-full"
              value={brandId}
              options={brands.map((b) => ({
                value: b.inventory_item_brand_id,
                label: b.inventory_item_brand,
              }))}
              getPopupContainer={(node) => node.parentElement || document.body}
              onChange={(val) => setBrandId(Number(val))}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Thuộc tính (size / màu / dung tích)
          </label>
          <Input value={attribute} onChange={(e) => setAttribute(e.target.value)} placeholder="VD: 5ml · Nắp Đỏ" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Mô tả</label>
          <Input.TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-1">
          <Checkbox checked={isUsedIgnored} onChange={(e) => setIsUsedIgnored(e.target.checked)}>
            Bỏ qua bước Used (is_used_ignored)
          </Checkbox>
          <Checkbox checked={isDisabled} onChange={(e) => setIsDisabled(e.target.checked)}>
            Tạm ngưng (is_disabled)
          </Checkbox>
        </div>
      </div>
    </AdaptiveModal>
  );
}

export interface CatalogBrandModalProps {
  open: boolean;
  editing: InventoryBrandDto | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: Omit<InventorySaveBrandRequest, 'previewRole' | 'previewStoreId'>) => Promise<void>;
}

export function CatalogBrandModal({ open, editing, submitting, onCancel, onSubmit }: CatalogBrandModalProps) {
  const [name, setName] = useState('');
  const [isTemporary, setIsTemporary] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.inventory_item_brand || '');
    setIsTemporary(Boolean(editing?.is_temporary));
  }, [open, editing]);

  return (
    <AdaptiveModal
      open={open}
      onCancel={onCancel}
      intent="confirm"
      zIndex={1050}
      confirmLoading={submitting}
      title={editing ? `Sửa Thương Hiệu #${editing.inventory_item_brand_id}` : 'Thêm Thương Hiệu Mới'}
      okText="Lưu Thương Hiệu"
      cancelText="Đóng"
      onOk={() => {
        if (!name.trim()) return;
        void onSubmit({
          inventory_item_brand_id: editing?.inventory_item_brand_id,
          inventory_item_brand: name.trim(),
          is_temporary: isTemporary,
        });
      }}
    >
      <div className="space-y-3 pt-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Tên thương hiệu *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Wings / Flash Lashes" />
        </div>
        <Checkbox checked={isTemporary} onChange={(e) => setIsTemporary(e.target.checked)}>
          Thương hiệu tạm (is_temporary)
        </Checkbox>
      </div>
    </AdaptiveModal>
  );
}

export interface CatalogWarehouseModalProps {
  open: boolean;
  editing: InventoryWarehouseDto | null;
  stores: InventoryStoreOptionDto[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: Omit<InventorySaveWarehouseRequest, 'previewRole' | 'previewStoreId'>) => Promise<void>;
}

export function CatalogWarehouseModal({
  open,
  editing,
  stores,
  submitting,
  onCancel,
  onSubmit,
}: CatalogWarehouseModalProps) {
  const [name, setName] = useState('');
  const [whType, setWhType] = useState<InventoryWarehouseType>('Other');
  const [storeId, setStoreId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isCheckNeeded, setIsCheckNeeded] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.inventory_warehouse_name);
      setWhType(editing.inventory_warehouse_type);
      setStoreId(editing.client_store_id);
      setPhone(editing.inventory_warehouse_phone_number || '');
      setAddress(editing.inventory_warehouse_address || '');
      setIsCheckNeeded(editing.is_check_needed);
      setIsDisabled(editing.is_disabled);
    } else {
      setName('');
      setWhType('Other');
      setStoreId(null);
      setPhone('');
      setAddress('');
      setIsCheckNeeded(true);
      setIsDisabled(false);
    }
  }, [open, editing]);

  return (
    <AdaptiveModal
      open={open}
      onCancel={onCancel}
      intent="form"
      zIndex={1050}
      confirmLoading={submitting}
      title={editing ? `Cập nhật Kho #${editing.inventory_warehouse_id}` : 'Thêm Kho Mới'}
      okText="Lưu Kho"
      cancelText="Đóng"
      onOk={() => {
        if (!name.trim()) return;
        void onSubmit({
          inventory_warehouse_id: editing?.inventory_warehouse_id,
          inventory_warehouse_name: name.trim(),
          inventory_warehouse_type: whType,
          client_store_id: storeId,
          inventory_warehouse_phone_number: phone.trim() || null,
          inventory_warehouse_address: address.trim() || null,
          is_check_needed: isCheckNeeded,
          is_disabled: isDisabled,
        });
      }}
    >
      <div className="space-y-3 pt-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Tên kho *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Kho Quận 1 - Đề Thám" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Loại kho *</label>
            <Select
              className="w-full"
              value={whType}
              options={WAREHOUSE_TYPE_OPTIONS}
              getPopupContainer={(node) => node.parentElement || document.body}
              onChange={(val) => setWhType(val as InventoryWarehouseType)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Thuộc chi nhánh</label>
            <Select
              allowClear
              className="w-full"
              placeholder="Không gắn chi nhánh"
              value={storeId ?? undefined}
              options={stores.map((s) => ({ value: s.client_store_id, label: s.store_name }))}
              getPopupContainer={(node) => node.parentElement || document.body}
              onChange={(val) => setStoreId(val ? Number(val) : null)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Số điện thoại</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Địa chỉ</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-6 pt-1">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={isCheckNeeded} onChange={setIsCheckNeeded} />
            <span>Bắt buộc kiểm kho EOM (is_check_needed)</span>
          </div>
          <Checkbox checked={isDisabled} onChange={(e) => setIsDisabled(e.target.checked)}>
            Tạm ngưng kho
          </Checkbox>
        </div>
      </div>
    </AdaptiveModal>
  );
}
