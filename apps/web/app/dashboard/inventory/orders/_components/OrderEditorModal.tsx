'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Input, InputNumber, Select, Switch, message } from 'antd';
import { CheckCircle2, Plus, QrCode, Save, Trash2, XCircle } from 'lucide-react';
import type {
  InventoryCatalogItemDto,
  InventoryOrderDto,
  InventoryRolePreviewKey,
  InventorySaveOrderLineInput,
  InventoryWarehouseDto,
} from '@mos-lab/shared';
import { AdaptiveDrawer, AdaptiveModal, AppIcon, SectionCard, StatusTag } from '../../../../../components/ui';
import { apiClient } from '../../../../../lib/api-client';
import { useInventorySse } from '../../_components/useInventorySse';
import { formatVnd } from '../../_components/InventoryItemsDrilldownDrawer';

export type OrderEditorMode = 'create' | 'edit' | 'review' | 'merge' | 'forward' | 'missing';

interface DraftLine extends InventorySaveOrderLineInput {
  key: string;
  item_name: string;
  item_code: string;
  unit: string;
}

export interface OrderEditorModalProps {
  open: boolean;
  mode: OrderEditorMode;
  selectedOrder: InventoryOrderDto | null;
  mergeOrderIds?: number[];
  warehouses: InventoryWarehouseDto[];
  showPrice: boolean;
  previewRole: InventoryRolePreviewKey;
  previewStoreId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export function OrderEditorModal({
  open,
  mode,
  selectedOrder,
  mergeOrderIds,
  warehouses,
  showPrice,
  previewRole,
  previewStoreId,
  onClose,
  onSaved,
}: OrderEditorModalProps) {
  const isReview = mode === 'review';
  const isForward = mode === 'forward';
  const isMissing = mode === 'missing';
  const readOnlyLines = isReview || isForward || isMissing;

  const [catalogItems, setCatalogItems] = useState<InventoryCatalogItemDto[]>([]);
  const [fromWhId, setFromWhId] = useState<number | null>(null);
  const [toWhId, setToWhId] = useState<number | undefined>(undefined);
  const [isInternal, setIsInternal] = useState(false);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [stocks, setStocks] = useState<Record<number, number>>({});
  const [scanInput, setScanInput] = useState('');
  const [addItemId, setAddItemId] = useState<number | undefined>(undefined);
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!open) return;
    void apiClient.inventory
      .getCatalogItems({ limit: 100, includeDisabled: false, previewRole, previewStoreId })
      .then((res) => setCatalogItems(res.data || []))
      .catch(() => undefined);
  }, [open, previewRole, previewStoreId]);

  const hydrateFromOrder = useCallback(
    async (orderId: number, fetchMode: 'edit' | 'forward' | 'missing') => {
      const res = await apiClient.inventory.getOrderDetail(orderId, {
        mode: fetchMode,
        previewRole,
        previewStoreId,
      });
      const o = res.order;
      if (!o) return;
      if (isForward) {
        setFromWhId(o.to_inventory_warehouse_id);
        setToWhId(undefined);
        setIsInternal(true);
        setDescription(`Chuyển tiếp từ phiếu #${o.inventory_warehouse_order_id}`);
      } else if (isMissing) {
        setFromWhId(o.from_inventory_warehouse_id);
        setToWhId(o.to_inventory_warehouse_id);
        setIsInternal(true);
        setDescription(`Đặt bổ sung hàng thiếu từ phiếu #${o.inventory_warehouse_order_id}`);
      } else {
        setFromWhId(o.from_inventory_warehouse_id);
        setToWhId(o.to_inventory_warehouse_id);
        setIsInternal(o.is_internal);
        setDescription(o.description);
      }
      setLines(
        (o.inventory_item || []).map((li, idx) => ({
          key: `l-${idx}-${li.inventory_item_id}-${li.from_inventory_warehouse_item_id || 0}`,
          from_inventory_warehouse_item_id: li.from_inventory_warehouse_item_id,
          from_inventory_warehouse_id: li.from_inventory_warehouse_id,
          inventory_item_id: li.inventory_item_id,
          quantity: Number(li.total_quantity || 1),
          retail_price: Number(li.retail_price || 0),
          retail_price_estimated: Number(li.retail_price_estimated || 0),
          item_name: li.item.inventory_item_name,
          item_code: li.item.inventory_item_code,
          unit: li.item.inventory_item_unit,
        }))
      );
    },
    [isForward, isMissing, previewRole, previewStoreId]
  );

  useEffect(() => {
    if (!open) return;
    if (mode === 'create') {
      setFromWhId(null);
      setToWhId(warehouses[0]?.inventory_warehouse_id);
      setIsInternal(false);
      setDescription('');
      setLines([]);
      return;
    }
    if (mode === 'merge' && mergeOrderIds && mergeOrderIds.length > 0) {
      void apiClient.inventory.getMergeOrdersPreview(mergeOrderIds, { previewRole, previewStoreId }).then((res) => {
        const o = res.order;
        if (!o) return;
        setFromWhId(o.from_inventory_warehouse_id);
        setToWhId(o.to_inventory_warehouse_id);
        setIsInternal(o.is_internal);
        setDescription(`Gộp phiếu: ${mergeOrderIds.map((id) => `#${id}`).join(', ')}`);
        setLines(
          (o.inventory_item || []).map((li, idx) => ({
            key: `m-${idx}-${li.inventory_item_id}`,
            from_inventory_warehouse_item_id: li.from_inventory_warehouse_item_id,
            from_inventory_warehouse_id: li.from_inventory_warehouse_id,
            inventory_item_id: li.inventory_item_id,
            quantity: Number(li.total_quantity || 1),
            retail_price: Number(li.retail_price || 0),
            item_name: li.item.inventory_item_name,
            item_code: li.item.inventory_item_code,
            unit: li.item.inventory_item_unit,
          }))
        );
      });
      return;
    }
    if (selectedOrder) {
      const fetchMode = isForward ? 'forward' : isMissing ? 'missing' : 'edit';
      void hydrateFromOrder(selectedOrder.inventory_warehouse_order_id, fetchMode);
    }
  }, [
    open,
    mode,
    selectedOrder,
    mergeOrderIds,
    warehouses,
    previewRole,
    previewStoreId,
    hydrateFromOrder,
    isForward,
    isMissing,
  ]);

  useEffect(() => {
    if (!open || !toWhId || lines.length === 0) {
      setStocks({});
      return;
    }
    const itemIds = [...new Set(lines.map((l) => l.inventory_item_id))];
    void apiClient.inventory
      .getWarehouseItemStocks({
        inventory_warehouse_id: toWhId,
        inventory_item_ids: itemIds,
        item_state: 'New',
        previewRole,
        previewStoreId,
      })
      .then((res) => setStocks(res.stocks || {}))
      .catch(() => undefined);
  }, [open, toWhId, lines, previewRole, previewStoreId]);

  const addPhysicalScanCode = useCallback(
    async (rawCode: string) => {
      const kw = rawCode.trim();
      if (!kw) return;
      try {
        const res = await apiClient.inventory.getWarehouseItems({
          itemState: 'New',
          keyword: kw,
          page: 1,
          limit: 1,
          previewRole,
          previewStoreId,
        });
        const whItem = res.data?.[0];
        if (!whItem) {
          message.warning(`Không tìm thấy vật tư trạng thái New với mã "${kw}"`);
          return;
        }
        setLines((prev) => {
          if (prev.some((l) => l.from_inventory_warehouse_item_id === whItem.inventory_warehouse_item_id)) {
            return prev;
          }
          return [
            ...prev,
            {
              key: `wh-${whItem.inventory_warehouse_item_id}`,
              from_inventory_warehouse_item_id: whItem.inventory_warehouse_item_id,
              from_inventory_warehouse_id: whItem.inventory_warehouse_id,
              inventory_item_id: whItem.inventory_item_id,
              quantity: 1,
              retail_price: Number(whItem.retail_price || 0),
              item_name: whItem.item.inventory_item_name,
              item_code: whItem.item.inventory_item_code,
              unit: whItem.item.inventory_item_unit,
            },
          ];
        });
        setScanInput('');
      } catch (err: unknown) {
        message.error(err instanceof Error ? err.message : 'Lỗi quét thêm vật tư');
      }
    },
    [previewRole, previewStoreId]
  );

  useInventorySse({
    enabled: open && (mode === 'create' || mode === 'edit'),
    previewRole,
    previewStoreId,
    onEvent: (evt) => {
      if (evt.type === 'order-add') {
        const item = evt.payload?.item as { scan_code?: string } | undefined;
        if (item?.scan_code) void addPhysicalScanCode(item.scan_code);
      }
    },
  });

  const handleAddSkuLine = () => {
    const sku = catalogItems.find((c) => c.inventory_item_id === addItemId);
    if (!sku) return;
    setLines((prev) => [
      ...prev,
      {
        key: `sku-${Date.now()}-${sku.inventory_item_id}`,
        from_inventory_warehouse_item_id: null,
        from_inventory_warehouse_id: fromWhId,
        inventory_item_id: sku.inventory_item_id,
        quantity: Math.max(1, addQty),
        retail_price: isInternal ? 0 : Math.max(0, addPrice),
        item_name: sku.inventory_item_name,
        item_code: sku.inventory_item_code,
        unit: sku.inventory_item_unit,
      },
    ]);
    setAddItemId(undefined);
    setAddQty(1);
    setAddPrice(0);
  };

  const handleSave = async () => {
    if (!toWhId || !description.trim() || lines.length === 0) {
      message.warning('Vui lòng nhập kho nhận, lý do và ít nhất 1 dòng vật tư');
      return;
    }
    if (isInternal && !fromWhId) {
      message.warning('Phiếu nội bộ phải chọn kho xuất');
      return;
    }
    setSaving(true);
    try {
      await apiClient.inventory.saveOrder({
        inventory_warehouse_order_id:
          selectedOrder && mode !== 'merge' ? selectedOrder.inventory_warehouse_order_id : undefined,
        from_inventory_warehouse_id: isInternal ? fromWhId : null,
        to_inventory_warehouse_id: toWhId,
        description: description.trim(),
        is_internal: isInternal,
        is_forward_mode: isForward,
        is_missing_item_mode: isMissing,
        inventory_item: lines.map((l) => ({
          from_inventory_warehouse_item_id: l.from_inventory_warehouse_item_id,
          from_inventory_warehouse_id: isInternal ? fromWhId : l.from_inventory_warehouse_id,
          inventory_item_id: l.inventory_item_id,
          quantity: l.quantity,
          retail_price: l.retail_price,
        })),
        previewRole,
        previewStoreId,
      });
      message.success('Đã lưu phiếu kho thành công');
      onSaved();
      onClose();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Lưu phiếu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await apiClient.inventory.approveOrder(selectedOrder.inventory_warehouse_order_id, {
        previewRole,
        previewStoreId,
      });
      message.success(`Đã duyệt phiếu #${selectedOrder.inventory_warehouse_order_id}`);
      onSaved();
      onClose();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Duyệt phiếu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedOrder || !rejectReason.trim()) return;
    setSaving(true);
    try {
      await apiClient.inventory.rejectOrder(selectedOrder.inventory_warehouse_order_id, {
        reject_reason: rejectReason.trim(),
        previewRole,
        previewStoreId,
      });
      message.success(`Đã từ chối phiếu #${selectedOrder.inventory_warehouse_order_id}`);
      setRejectOpen(false);
      onSaved();
      onClose();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Từ chối phiếu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const totalQty = lines.reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const totalAmount = lines.reduce((acc, l) => acc + Number(l.quantity || 0) * Number(l.retail_price || 0), 0);
  const titleMap: Record<OrderEditorMode, string> = {
    create: 'Tạo Phiếu Xuất / Nhập Kho',
    edit: `Chỉnh Sửa Phiếu #${selectedOrder?.inventory_warehouse_order_id || ''}`,
    review: `Duyệt / Từ Chối Phiếu #${selectedOrder?.inventory_warehouse_order_id || ''}`,
    merge: 'Gộp Nhiều Phiếu Thành Phiếu Mới',
    forward: `Chuyển Tiếp Từ Phiếu #${selectedOrder?.inventory_warehouse_order_id || ''}`,
    missing: `Đặt Bổ Sung Hàng Thiếu #${selectedOrder?.inventory_warehouse_order_id || ''}`,
  };

  return (
    <AdaptiveDrawer open={open} onClose={onClose} intent="data" title={titleMap[mode]}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Kho nhận *</label>
            <Select
              className="w-full"
              disabled={isReview || isMissing}
              value={toWhId}
              options={warehouses.map((w) => ({ value: w.inventory_warehouse_id, label: w.inventory_warehouse_name }))}
              getPopupContainer={(n) => n.parentElement || document.body}
              onChange={(v) => setToWhId(Number(v))}
            />
          </div>
          <div className="flex flex-col justify-between gap-2">
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={isInternal}
                disabled={isReview || isForward || isMissing}
                onChange={(checked) => {
                  setIsInternal(checked);
                  if (!checked) setFromWhId(null);
                }}
              />
              <span className="text-sm font-medium">Luân chuyển nội bộ (Internal)</span>
            </div>
            {isInternal && (
              <Select
                className="w-full"
                disabled={isReview || isForward || isMissing}
                placeholder="Chọn kho xuất *"
                value={fromWhId ?? undefined}
                options={warehouses
                  .filter((w) => w.inventory_warehouse_id !== toWhId)
                  .map((w) => ({ value: w.inventory_warehouse_id, label: w.inventory_warehouse_name }))}
                getPopupContainer={(n) => n.parentElement || document.body}
                onChange={(v) => setFromWhId(Number(v))}
              />
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Lý do / Ghi chú phiếu *
          </label>
          <Input
            disabled={isReview}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Nhập lý do xuất/nhập kho..."
          />
        </div>

        {!readOnlyLines && (
          <SectionCard title="Thêm Dòng Vật Tư / Quét Mã QR">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
              <Select
                showSearch
                optionFilterProp="label"
                className="md:col-span-5"
                placeholder="Chọn SKU vật tư"
                value={addItemId}
                options={catalogItems.map((c) => ({
                  value: c.inventory_item_id,
                  label: `${c.inventory_item_name} (${c.inventory_item_code})`,
                }))}
                getPopupContainer={(n) => n.parentElement || document.body}
                onChange={(v) => setAddItemId(Number(v))}
              />
              <InputNumber
                min={1}
                className="md:col-span-2"
                value={addQty}
                onChange={(v) => setAddQty(Number(v || 1))}
                placeholder="SL"
              />
              {showPrice && !isInternal && (
                <InputNumber
                  min={0}
                  className="md:col-span-3"
                  value={addPrice}
                  onChange={(v) => setAddPrice(Number(v || 0))}
                  placeholder="Đơn giá VNĐ"
                />
              )}
              <Button
                type="primary"
                className="md:col-span-2"
                icon={<AppIcon icon={Plus} size={14} />}
                onClick={handleAddSkuLine}
              >
                Thêm SKU
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onPressEnter={() => void addPhysicalScanCode(scanInput)}
                placeholder="Hoặc quét/nhập #Lot ID / QR vật tư cụ thể..."
                prefix={<AppIcon icon={QrCode} size={14} />}
              />
              <Button onClick={() => void addPhysicalScanCode(scanInput)}>Quét Thêm</Button>
            </div>
          </SectionCard>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between text-sm font-semibold">
            <span>
              Danh sách ({lines.length} dòng · Tổng SL: <span className="tabular-nums">{totalQty}</span>)
            </span>
            {showPrice && <span className="tabular-nums">Tổng tiền: {formatVnd(totalAmount)}</span>}
          </div>
          {lines.map((line, idx) => (
            <div
              key={line.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-800"
            >
              <div className="min-w-48 flex-1">
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {idx + 1}. {line.item_name} ({line.item_code})
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>ĐVT: {line.unit}</span>
                  <span>·</span>
                  <span>
                    Tồn kho nhận: <b className="tabular-nums">{stocks[line.inventory_item_id] ?? 0}</b>
                  </span>
                  {line.from_inventory_warehouse_item_id && (
                    <StatusTag status="cyan" label={`Mã #${line.from_inventory_warehouse_item_id}`} />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <InputNumber
                  min={1}
                  size="small"
                  disabled={readOnlyLines || Boolean(line.from_inventory_warehouse_item_id)}
                  value={line.quantity}
                  onChange={(v) =>
                    setLines((prev) =>
                      prev.map((p) => (p.key === line.key ? { ...p, quantity: Math.max(1, Number(v || 1)) } : p))
                    )
                  }
                />
                {showPrice && (
                  <InputNumber
                    min={0}
                    size="small"
                    disabled={readOnlyLines || isInternal || Boolean(line.from_inventory_warehouse_item_id)}
                    value={line.retail_price}
                    onChange={(v) =>
                      setLines((prev) =>
                        prev.map((p) => (p.key === line.key ? { ...p, retail_price: Math.max(0, Number(v || 0)) } : p))
                      )
                    }
                  />
                )}
                {!readOnlyLines && (
                  <Button
                    size="small"
                    danger
                    icon={<AppIcon icon={Trash2} size={14} />}
                    onClick={() => setLines((prev) => prev.filter((p) => p.key !== line.key))}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          {isReview ? (
            <>
              {selectedOrder?.actions.canReject && (
                <Button danger icon={<AppIcon icon={XCircle} size={14} />} onClick={() => setRejectOpen(true)}>
                  Từ Chối
                </Button>
              )}
              {selectedOrder?.actions.canApprove && (
                <Button
                  type="primary"
                  loading={saving}
                  icon={<AppIcon icon={CheckCircle2} size={14} />}
                  onClick={() => void handleApprove()}
                >
                  Duyệt Phiếu
                </Button>
              )}
            </>
          ) : (
            <Button
              type="primary"
              loading={saving}
              icon={<AppIcon icon={Save} size={14} />}
              onClick={() => void handleSave()}
            >
              Lưu Phiếu Kho
            </Button>
          )}
        </div>
      </div>

      <AdaptiveModal
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        intent="confirm"
        zIndex={1060}
        confirmLoading={saving}
        title="Nhập Lý Do Từ Chối Phiếu"
        okText="Xác Nhận Từ Chối"
        cancelText="Đóng"
        onOk={() => void handleRejectConfirm()}
      >
        <Input.TextArea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Nhập lý do từ chối phiếu kho..."
        />
      </AdaptiveModal>
    </AdaptiveDrawer>
  );
}
