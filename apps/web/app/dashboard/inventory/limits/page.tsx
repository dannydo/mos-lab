'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Button, Input, InputNumber, Select, Tabs, message } from 'antd';
import { Save, Search, Trash2 } from 'lucide-react';
import { INVENTORY_ITEM_TYPES, type InventoryItemLimitRowDto, type InventoryItemType } from '@mos-lab/shared';
import { AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { InventoryAdminHeader } from '../_components/InventoryAdminHeader';
import { useInventoryAdminContext } from '../_components/useInventoryAdminContext';

const TYPE_TABS: Array<{ key: 'ALL' | InventoryItemType; label: string }> = [
  { key: 'ALL', label: 'Tất cả' },
  ...INVENTORY_ITEM_TYPES.map((t) => ({ key: t, label: t })),
];

interface DraftValues {
  min_count: number;
  max_count: number;
  limit_count_standard: number;
}

export default function InventoryLimitsPage() {
  const ctx = useInventoryAdminContext();
  const canEditLimits = ctx.hasPermission('edit-warehouse') || ctx.hasPermission('edit-order-global');

  const [itemState, setItemState] = useState<'New' | 'Using'>('New');
  const [itemTypeTab, setItemTypeTab] = useState<'ALL' | InventoryItemType>('ALL');
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');

  const [rows, setRows] = useState<InventoryItemLimitRowDto[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftValues>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const rowKeyStr = (r: InventoryItemLimitRowDto) =>
    `${r.inventory_warehouse_id || warehouseId || 0}-${r.inventory_item_id}-${r.item_state}`;

  const loadLimits = useCallback(
    async (targetPage: number, targetLimit: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.inventory.getLimits({
          warehouseId,
          itemState,
          inventoryItemType: itemTypeTab === 'ALL' ? undefined : itemTypeTab,
          keyword: appliedKeyword || undefined,
          page: targetPage,
          limit: targetLimit,
          previewRole: ctx.previewRole,
          previewStoreId: ctx.previewStoreId,
        });
        const list = res.data || [];
        setRows(list);
        setTotal(res.page?.total || 0);
        const nextDrafts: Record<string, DraftValues> = {};
        for (const r of list) {
          const k = `${r.inventory_warehouse_id || warehouseId || 0}-${r.inventory_item_id}-${r.item_state}`;
          nextDrafts[k] = {
            min_count: Number(r.min_count ?? 0),
            max_count: Number(r.max_count ?? 0),
            limit_count_standard: Number(r.limit_count_standard ?? 0),
          };
        }
        setDrafts(nextDrafts);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được định mức tồn kho');
      } finally {
        setLoading(false);
      }
    },
    [warehouseId, itemState, itemTypeTab, appliedKeyword, ctx.previewRole, ctx.previewStoreId]
  );

  useEffect(() => {
    setPage(1);
    void loadLimits(1, limit);
  }, [loadLimits, limit]);

  const updateDraft = (key: string, field: keyof DraftValues, val: number | null) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { min_count: 0, max_count: 0, limit_count_standard: 0 }),
        [field]: Number(val ?? 0),
      },
    }));
  };

  const handleSave = async (row: InventoryItemLimitRowDto, disable = false) => {
    const targetWhId = row.inventory_warehouse_id || warehouseId;
    if (!targetWhId) {
      message.warning('Vui lòng chọn kho cụ thể ở bộ lọc để cập nhật định mức');
      return;
    }
    const key = rowKeyStr(row);
    const val = drafts[key] || {
      min_count: Number(row.min_count ?? 0),
      max_count: Number(row.max_count ?? 0),
      limit_count_standard: Number(row.limit_count_standard ?? 0),
    };
    setSavingKey(key);
    try {
      await apiClient.inventory.saveLimit({
        inventory_warehouse_item_limit_id: row.inventory_warehouse_item_limit_id,
        inventory_warehouse_id: targetWhId,
        inventory_item_id: row.inventory_item_id,
        item_state: row.item_state,
        min_count: val.min_count,
        max_count: val.max_count,
        limit_count_standard: val.limit_count_standard,
        is_disabled: disable,
        previewRole: ctx.previewRole,
        previewStoreId: ctx.previewStoreId,
      });
      message.success(disable ? 'Đã gỡ định mức tồn kho' : 'Đã lưu định mức tồn kho');
      void loadLimits(page, limit);
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Lưu định mức thất bại');
    } finally {
      setSavingKey(null);
    }
  };

  const columns: ColumnsType<InventoryItemLimitRowDto> = [
    {
      title: 'Kho',
      key: 'warehouse',
      width: 170,
      render: (_, r) => (
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
          {r.warehouse?.inventory_warehouse_name || 'Kho mặc định'}
        </span>
      ),
    },
    {
      title: 'Vật Tư / SKU',
      key: 'item',
      width: 240,
      render: (_, r) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{r.item.inventory_item_name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {r.item.inventory_item_code} · {r.item.inventory_item_type}
          </div>
        </div>
      ),
    },
    {
      title: 'Loại Tồn',
      dataIndex: 'item_state',
      key: 'item_state',
      width: 95,
      render: (state: 'New' | 'Using') => (
        <StatusTag status={state === 'New' ? 'success' : 'processing'} label={state} />
      ),
    },
    {
      title: 'Tối Thiểu (Min)',
      key: 'min_count',
      width: 130,
      render: (_, r) => {
        const key = rowKeyStr(r);
        return (
          <InputNumber
            min={0}
            size="small"
            disabled={!canEditLimits}
            className="w-24 tabular-nums"
            value={drafts[key]?.min_count ?? r.min_count ?? 0}
            onChange={(val) => updateDraft(key, 'min_count', val)}
          />
        );
      },
    },
    {
      title: 'Tối Đa (Max)',
      key: 'max_count',
      width: 130,
      render: (_, r) => {
        const key = rowKeyStr(r);
        return (
          <InputNumber
            min={0}
            size="small"
            disabled={!canEditLimits}
            className="w-24 tabular-nums"
            value={drafts[key]?.max_count ?? r.max_count ?? 0}
            onChange={(val) => updateDraft(key, 'max_count', val)}
          />
        );
      },
    },
    {
      title: 'Định Mức Chuẩn',
      key: 'limit_count_standard',
      width: 140,
      render: (_, r) => {
        const key = rowKeyStr(r);
        return (
          <InputNumber
            min={0}
            size="small"
            disabled={!canEditLimits}
            className="w-24 tabular-nums"
            value={drafts[key]?.limit_count_standard ?? r.limit_count_standard ?? 0}
            onChange={(val) => updateDraft(key, 'limit_count_standard', val)}
          />
        );
      },
    },
    {
      title: 'Max Tháng Trước',
      dataIndex: 'last_max_count',
      key: 'last_max_count',
      width: 120,
      align: 'right',
      render: (val: number | null) => (
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {val != null ? val.toLocaleString('vi-VN') : '—'}
        </span>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, r) => {
        if (!canEditLimits) return <span className="text-xs text-slate-400">Chỉ xem</span>;
        const key = rowKeyStr(r);
        const isSaving = savingKey === key;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="small"
              type="primary"
              loading={isSaving}
              icon={<AppIcon icon={Save} size={14} />}
              onClick={() => void handleSave(r, false)}
            >
              Lưu
            </Button>
            {r.inventory_warehouse_item_limit_id && (
              <Button
                size="small"
                danger
                loading={isSaving}
                icon={<AppIcon icon={Trash2} size={14} />}
                onClick={() => void handleSave(r, true)}
              />
            )}
          </div>
        );
      },
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

      <SectionCard title="Thiết Lập Định Mức Tồn Kho (Min / Max / Chuẩn)">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              size="small"
              activeKey={itemState}
              onChange={(key) => {
                setItemState(key as 'New' | 'Using');
                setPage(1);
              }}
              items={[
                { key: 'New', label: 'Định Mức Hàng Mới (New)' },
                { key: 'Using', label: 'Định Mức Đang Dùng (Using)' },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Select
                allowClear
                placeholder="Chọn kho"
                className="w-56"
                value={warehouseId}
                options={ctx.warehouses.map((w) => ({
                  value: w.inventory_warehouse_id,
                  label: w.inventory_warehouse_name,
                }))}
                onChange={(val) => setWarehouseId(val ? Number(val) : undefined)}
              />
              <Input
                allowClear
                className="w-56"
                placeholder="Tìm tên SKU..."
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

          <Tabs
            size="small"
            activeKey={itemTypeTab}
            onChange={(key) => {
              setItemTypeTab(key as 'ALL' | InventoryItemType);
              setPage(1);
            }}
            items={TYPE_TABS.map((t) => ({ key: t.key, label: t.label }))}
          />

          {error ? (
            <StatePanel kind="error" title="Không tải được định mức" description={error} />
          ) : (
            <DataTable<InventoryItemLimitRowDto>
              rowKey={rowKeyStr}
              columns={columns}
              dataSource={rows}
              loading={loading}
              scroll={{ x: 1180 }}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                onChange: (nextPage, nextLimit) => {
                  setPage(nextPage);
                  setLimit(nextLimit);
                  void loadLimits(nextPage, nextLimit);
                },
              }}
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
}
